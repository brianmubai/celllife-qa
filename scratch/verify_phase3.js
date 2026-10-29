const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = 'admin123';

async function verifyPhase3() {
  console.log('=== Step 1: Fetch existing speakers or create demo speakers ===');
  let speakersRes = await fetch(`${API_BASE}/speakers`);
  let speakers = await speakersRes.json();

  if (speakers.length < 2) {
    console.log('Registering speakers for test...');
    const spk1 = await (
      await fetch(`${API_BASE}/admin/speakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_TOKEN,
        },
        body: JSON.stringify({
          name: 'Dr. Sarah Chen',
          title: 'Principal AI Architect',
          topic: 'Scalable LLM Orchestration',
          bio: 'Leading distributed AI engineering.',
          email: 'sarah.chen@example.com',
          photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        }),
      })
    ).json();

    const spk2 = await (
      await fetch(`${API_BASE}/admin/speakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_TOKEN,
        },
        body: JSON.stringify({
          name: 'Marcus Vance',
          title: 'VP of Platform Engineering',
          topic: 'High-Throughput Microservices',
          bio: 'Expert in real-time streaming architectures.',
          email: 'marcus.vance@example.com',
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        }),
      })
    ).json();

    speakersRes = await fetch(`${API_BASE}/speakers`);
    speakers = await speakersRes.json();
  }

  const testSpeakerIds = [speakers[0].id, speakers[1].id];
  console.log(`Using speakers: ${speakers[0].name} (${speakers[0].id}), ${speakers[1].name} (${speakers[1].id})`);

  console.log('\n=== Step 2: Create Session 1 with speakers ===');
  const session1Res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Advanced Agentic Architectures',
      date: '2026-10-20',
      speakerIds: testSpeakerIds,
      branding: {
        primaryColor: '#1F6F5C',
        accentColor: '#F4B942',
        emoji: '🌲',
        tagline: 'Mastering distributed agentic workflows',
      },
    }),
  });
  console.log('Session 1 POST status:', session1Res.status);
  const session1 = await session1Res.json();
  console.log('Session 1 created:', { id: session1.id, title: session1.title, status: session1.status });

  console.log('\n=== Step 3: Create Session 2 with the SAME speakers ===');
  const session2Res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Enterprise LLM Systems in Production',
      date: '2026-10-25',
      speakerIds: testSpeakerIds,
      branding: {
        primaryColor: '#0E49B5',
        accentColor: '#38EF7D',
        emoji: '🌊',
        tagline: 'High throughput streaming and inference',
      },
    }),
  });
  console.log('Session 2 POST status:', session2Res.status);
  const session2 = await session2Res.json();
  console.log('Session 2 created:', { id: session2.id, title: session2.title, status: session2.status });

  console.log('\n=== Step 4: Advance Session 1 (upcoming -> live) ===');
  const advance1LiveRes = await fetch(`${API_BASE}/sessions/${session1.id}/advance`, {
    method: 'POST',
  });
  console.log('Advance 1 status:', advance1LiveRes.status);
  const advanced1Live = await advance1LiveRes.json();
  console.log('Session 1 status now:', advanced1Live.status);
  if (advanced1Live.status !== 'live') throw new Error('Expected status to be live');

  console.log('\n=== Step 5: Advance Session 1 again (live -> archived) ===');
  const advance1ArchivedRes = await fetch(`${API_BASE}/sessions/${session1.id}/advance`, {
    method: 'POST',
  });
  console.log('Advance 2 status:', advance1ArchivedRes.status);
  const advanced1Archived = await advance1ArchivedRes.json();
  console.log('Session 1 status now:', advanced1Archived.status);
  if (advanced1Archived.status !== 'archived') throw new Error('Expected status to be archived');

  console.log('\n=== Step 6: Verify 409 conflict when advancing already archived session ===');
  const advanceConflictRes = await fetch(`${API_BASE}/sessions/${session1.id}/advance`, {
    method: 'POST',
  });
  console.log('Advance on archived status (EXPECT 409):', advanceConflictRes.status);
  const conflictData = await advanceConflictRes.json();
  console.log('Conflict response:', conflictData);
  if (advanceConflictRes.status !== 409) throw new Error('Expected 409 Conflict');

  console.log('\n=== Step 7: Confirm GET /sessions has Session 1 under past, Session 2 under active ===');
  const listRes = await fetch(`${API_BASE}/sessions`);
  console.log('GET /sessions status:', listRes.status);
  const { active, past } = await listRes.json();

  console.log(`Active sessions count: ${active.length}`);
  console.log(`Past sessions count: ${past.length}`);

  const session1InPast = past.find((s) => s.id === session1.id);
  const session2InActive = active.find((s) => s.id === session2.id);

  console.log('Session 1 found in past sessions?', !!session1InPast, session1InPast ? `(status: ${session1InPast.status})` : '');
  console.log('Session 2 found in active sessions?', !!session2InActive, session2InActive ? `(status: ${session2InActive.status})` : '');

  if (!session1InPast) {
    throw new Error('FAIL: Session 1 (archived) was not found in past sessions!');
  }
  if (!session2InActive) {
    throw new Error('FAIL: Session 2 (upcoming) was not found in active sessions!');
  }

  console.log('\n=== Step 8: Confirm GET /sessions/:id returns public speakers only (no email) ===');
  const detailRes = await fetch(`${API_BASE}/sessions/${session1.id}`);
  const detail = await detailRes.json();
  console.log('Session detail title:', detail.title);
  console.log('Session speakers returned count:', detail.speakers.length);
  const hasEmail = detail.speakers.some((s) => s.email !== undefined);
  console.log('Do returned speakers contain any email property?', hasEmail);
  if (hasEmail) throw new Error('SECURITY VIOLATION: Speaker email returned in public session detail');

  console.log('\n>>> ALL PHASE 3 VERIFICATIONS PASSED SUCCESSFULLY! <<<');
}

verifyPhase3().catch((e) => {
  console.error('VERIFICATION ERROR:', e);
  process.exit(1);
});
