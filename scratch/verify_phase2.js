const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = 'admin123';

async function verify() {
  console.log('=== TEST 1: requireAdmin middleware protection ===');
  const resAuth = await fetch(`${API_BASE}/admin/speakers`, {
    headers: { 'x-admin-token': 'invalid-token' },
  });
  console.log('GET /api/admin/speakers with invalid token status:', resAuth.status);
  const authErr = await resAuth.json();
  console.log('Body:', authErr);
  if (resAuth.status !== 401) throw new Error('Expected 401 status for invalid token');

  console.log('\n=== TEST 2: Add a speaker in admin page (POST /api/admin/speakers) ===');
  const resAdd = await fetch(`${API_BASE}/admin/speakers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify({
      name: 'Dr. Sarah Chen',
      title: 'Principal AI Architect',
      topic: 'Scalable LLM Orchestration',
      bio: 'Leading distributed AI engineering and multi-agent systems at scale.',
      email: 'sarah.chen@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    }),
  });
  console.log('POST status:', resAdd.status);
  const addedSpeaker = await resAdd.json();
  console.log('Added Speaker (Admin View with email):', addedSpeaker);
  if (resAdd.status !== 201) throw new Error('Expected 201 for speaker creation');

  console.log('\n=== TEST 3: Edit speaker in admin page (PUT /api/admin/speakers/:id) ===');
  const resEdit = await fetch(`${API_BASE}/admin/speakers/${addedSpeaker.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify({
      name: 'Dr. Sarah Chen, Ph.D.',
      title: 'Distinguished Fellow & AI Lead',
      topic: 'Production Agentic Workflows & Safety',
      bio: 'Pioneering safe agentic systems and production multi-agent architectures.',
      email: 'sarah.chen.updated@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    }),
  });
  console.log('PUT status:', resEdit.status);
  const editedSpeaker = await resEdit.json();
  console.log('Edited Speaker:', editedSpeaker);
  if (resEdit.status !== 200) throw new Error('Expected 200 for speaker edit');

  console.log('\n=== TEST 4: Public GET /api/speakers (VERIFY NO EMAIL) ===');
  const resPublic = await fetch(`${API_BASE}/speakers`);
  console.log('GET /api/speakers status:', resPublic.status);
  const publicList = await resPublic.json();
  console.log('Public speakers count:', publicList.length);
  const targetPublic = publicList.find((s) => s.id === addedSpeaker.id);
  console.log('Public speaker object:', targetPublic);
  console.log('Has email field?', Object.prototype.hasOwnProperty.call(targetPublic, 'email'));
  if (Object.prototype.hasOwnProperty.call(targetPublic, 'email') || targetPublic.email !== undefined) {
    throw new Error('SECURITY VIOLATION: Email found in public GET /api/speakers response!');
  }
  console.log('CONFIRMED: Email is NOT returned by public GET /api/speakers.');

  console.log('\n=== TEST 5: Assign speaker to session and test DELETE 409 conflict ===');
  const resAssign = await fetch(`${API_BASE}/admin/test-session/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ speakerId: addedSpeaker.id }),
  });
  console.log('Assign to session status:', resAssign.status);

  // Now attempt DELETE
  const resDeleteConflict = await fetch(`${API_BASE}/admin/speakers/${addedSpeaker.id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  console.log('DELETE status when assigned to session (EXPECT 409):', resDeleteConflict.status);
  const conflictBody = await resDeleteConflict.json();
  console.log('409 Conflict Body:', conflictBody);
  if (resDeleteConflict.status !== 409) {
    throw new Error(`Expected 409 status on assigned speaker delete, got ${resDeleteConflict.status}`);
  }
  console.log('CONFIRMED: Server correctly rejected deletion with 409 Conflict.');

  console.log('\n=== TEST 6: Unassign speaker and confirm successful DELETE ===');
  const resClear = await fetch(`${API_BASE}/admin/test-session/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ speakerId: addedSpeaker.id }),
  });
  console.log('Clear session assignment status:', resClear.status);

  const resDeleteOk = await fetch(`${API_BASE}/admin/speakers/${addedSpeaker.id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  console.log('DELETE status when unassigned (EXPECT 200):', resDeleteOk.status);
  const okBody = await resDeleteOk.json();
  console.log('Delete body:', okBody);
  if (resDeleteOk.status !== 200) {
    throw new Error(`Expected 200 status on unassigned speaker delete, got ${resDeleteOk.status}`);
  }

  console.log('\n=== Setup demo speakers for public and admin UI ===');
  const demoSpeakers = [
    {
      name: 'Dr. Sarah Chen',
      title: 'Principal AI Architect',
      topic: 'Scalable LLM Orchestration',
      bio: 'Leading distributed AI engineering and multi-agent systems at scale.',
      email: 'sarah.chen@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    },
    {
      name: 'Marcus Vance',
      title: 'VP of Platform Engineering',
      topic: 'High-Throughput Microservices & Event Streams',
      bio: 'Expert in real-time streaming architectures and resilient cloud backends.',
      email: 'marcus.vance@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    },
    {
      name: 'Elena Rostova',
      title: 'Head of Developer Experience',
      topic: 'Modern Frontend Architecture & Web Performance',
      bio: 'Focusing on reactive UI patterns, accessibility, and high performance web apps.',
      email: 'elena.rostova@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    },
  ];

  for (const spk of demoSpeakers) {
    const r = await fetch(`${API_BASE}/admin/speakers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN,
      },
      body: JSON.stringify(spk),
    });
    const created = await r.json();
    console.log(`Demo speaker added: ${created.name} (ID: ${created.id})`);
  }

  console.log('\n>>> ALL PHASE 2 VERIFICATIONS PASSED SUCCESSFULLY! <<<');
}

verify().catch((e) => {
  console.error('VERIFICATION FAILED:', e);
  process.exit(1);
});
