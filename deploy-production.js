import { Client } from 'ssh2';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

// VPS Deployment Configuration (Defaults to live CellLife production server)
const DEPLOY_CONFIG = {
  host: process.env.DEPLOY_HOST || '212.90.121.97',
  port: parseInt(process.env.DEPLOY_PORT || '22', 10),
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASS || 'Somepass2026',
  remotePath: process.env.DEPLOY_REMOTE_PATH || '/var/www/cellife',
  pm2ProcessName: process.env.DEPLOY_PM2_NAME || 'cellife-qa',
  liveUrl: process.env.DEPLOY_LIVE_URL || 'https://cellife.co.zw',
  readyTimeout: 30000,
};

async function stepBuild() {
  console.log('\n=============================================');
  console.log('🚀 STEP 1: Building Frontend for Production');
  console.log('=============================================');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

  const distDir = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('Build failed: dist/index.html was not generated.');
  }

  console.log('📦 Packaging frontend bundle (dist.tar.gz)...');
  const distTar = path.join(projectRoot, 'dist.tar.gz');
  if (fs.existsSync(distTar)) fs.unlinkSync(distTar);
  execSync('tar -czf dist.tar.gz -C dist .', { cwd: projectRoot, stdio: 'inherit' });
  console.log(`✅ dist.tar.gz created (${(fs.statSync(distTar).size / 1024).toFixed(1)} KB)`);

  console.log('📦 Packaging server bundle (server.tar.gz)...');
  const serverTar = path.join(projectRoot, 'server.tar.gz');
  if (fs.existsSync(serverTar)) fs.unlinkSync(serverTar);
  execSync('tar -czf server.tar.gz --exclude="node_modules" --exclude="data/store.json" -C server .', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log(`✅ server.tar.gz created (${(fs.statSync(serverTar).size / 1024).toFixed(1)} KB)`);
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function remoteExec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      stream.on('data', (d) => {
        stdout += d.toString();
        process.stdout.write(d.toString());
      });

      stream.stderr.on('data', (d) => {
        stderr += d.toString();
        process.stderr.write(d.toString());
      });
    });
  });
}

async function stepDeploy() {
  await stepBuild();

  console.log('\n=============================================');
  console.log(`🔌 STEP 2: Connecting to VPS (${DEPLOY_CONFIG.host})`);
  console.log('=============================================');

  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({
      host: DEPLOY_CONFIG.host,
      port: DEPLOY_CONFIG.port,
      username: DEPLOY_CONFIG.username,
      password: DEPLOY_CONFIG.password,
      readyTimeout: DEPLOY_CONFIG.readyTimeout,
    });
  });

  console.log('✅ SSH connection established.');

  try {
    console.log('\n=============================================');
    console.log('📤 STEP 3: Transferring Bundles to Remote Server');
    console.log('=============================================');

    // Create target directories first
    await remoteExec(
      conn,
      `mkdir -p "${DEPLOY_CONFIG.remotePath}/dist" "${DEPLOY_CONFIG.remotePath}/server/data"`
    );

    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, sftpClient) => {
        if (err) return reject(err);
        resolve(sftpClient);
      });
    });

    const localDistTar = path.join(projectRoot, 'dist.tar.gz');
    const localServerTar = path.join(projectRoot, 'server.tar.gz');
    const remoteDistTar = '/tmp/cellife-dist.tar.gz';
    const remoteServerTar = '/tmp/cellife-server.tar.gz';

    console.log(`Uploading frontend archive -> ${remoteDistTar}...`);
    await uploadFile(sftp, localDistTar, remoteDistTar);

    console.log(`Uploading server archive -> ${remoteServerTar}...`);
    await uploadFile(sftp, localServerTar, remoteServerTar);

    console.log('Uploading package.json & package-lock.json...');
    await uploadFile(sftp, path.join(projectRoot, 'package.json'), `${DEPLOY_CONFIG.remotePath}/package.json`);
    if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
      await uploadFile(sftp, path.join(projectRoot, 'package-lock.json'), `${DEPLOY_CONFIG.remotePath}/package-lock.json`);
    }

    sftp.end();
    console.log('✅ All bundles transferred successfully.');

    console.log('\n=============================================');
    console.log('⚙️  STEP 4: Unpacking Bundles & Reloading PM2');
    console.log('=============================================');

    const remoteDeployScript = `
      set -e
      echo "--- Unpacking frontend distribution ---"
      rm -rf ${DEPLOY_CONFIG.remotePath}/dist/*
      tar -xzf ${remoteDistTar} -C ${DEPLOY_CONFIG.remotePath}/dist
      rm -f ${remoteDistTar}

      echo "--- Unpacking server code ---"
      tar -xzf ${remoteServerTar} -C ${DEPLOY_CONFIG.remotePath}/server
      rm -f ${remoteServerTar}

      echo "--- Installing production dependencies ---"
      cd ${DEPLOY_CONFIG.remotePath}
      npm install --omit=dev --no-audit --no-fund

      echo "--- Reloading PM2 process '${DEPLOY_CONFIG.pm2ProcessName}' ---"
      if pm2 describe ${DEPLOY_CONFIG.pm2ProcessName} > /dev/null 2>&1; then
        pm2 restart ${DEPLOY_CONFIG.pm2ProcessName} --update-env
      else
        pm2 start server/index.js --name ${DEPLOY_CONFIG.pm2ProcessName}
      fi

      echo "--- PM2 Status ---"
      pm2 status ${DEPLOY_CONFIG.pm2ProcessName}
    `;

    await remoteExec(conn, remoteDeployScript);

    console.log('\n=============================================');
    console.log(`🌐 STEP 5: Verifying Live Website (${DEPLOY_CONFIG.liveUrl})`);
    console.log('=============================================');

    await new Promise((r) => setTimeout(r, 2000));

    try {
      const healthRes = await fetch(`${DEPLOY_CONFIG.liveUrl}/api/health`);
      const healthData = await healthRes.json().catch(() => ({}));
      console.log(`Health check [${DEPLOY_CONFIG.liveUrl}/api/health]: HTTP ${healthRes.status}`, healthData);

      const htmlRes = await fetch(DEPLOY_CONFIG.liveUrl);
      const htmlText = await htmlRes.text();
      console.log(`Home page [${DEPLOY_CONFIG.liveUrl}]: HTTP ${htmlRes.status} (${htmlText.length} bytes)`);

      const jsAssets = [...htmlText.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
      console.log('Active JS bundles in index.html:', jsAssets);

      if (healthRes.ok && htmlRes.ok) {
        console.log('\n🎉 =============================================');
        console.log('🎉 LIVE DEPLOYMENT COMPLETED SUCCESSFULLY!');
        console.log(`🎉 Accessible at: ${DEPLOY_CONFIG.liveUrl}`);
        console.log('🎉 =============================================\n');
      } else {
        console.warn('⚠️ Verification returned unexpected status codes.');
      }
    } catch (verErr) {
      console.warn('⚠️ Verification warning:', verErr.message);
    }
  } finally {
    conn.end();
    // Clean up local archives
    const localDistTar = path.join(projectRoot, 'dist.tar.gz');
    if (fs.existsSync(localDistTar)) fs.unlinkSync(localDistTar);
    const localServerTar = path.join(projectRoot, 'server.tar.gz');
    if (fs.existsSync(localServerTar)) fs.unlinkSync(localServerTar);
  }
}

stepDeploy().catch((err) => {
  console.error('\n❌ Deployment failed with error:', err.message);
  process.exit(1);
});
