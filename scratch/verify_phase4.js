const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = 'admin123';

async function verifyPhase4() {
  console.log('=== Step 1: Ensure active session and speakers exist ===');
  let speakersRes = await fetch(`${API_BASE}/speakers`);
  let speakers = await speakersRes.json();

  if (speakers.length === 0) {
    const spk = await (
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
    speakers = [spk];
  }

  const targetSpeaker = speakers[0];

  // Create an active session for testing Phase 4
  const sessionRes = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Interactive Multi-Speaker Q&A Session',
      date: '2026-10-30',
      speakerIds: [targetSpeaker.id],
      branding: {
        primaryColor: '#1F6F5C',
        accentColor: '#F4B942',
        emoji: '🏃',
        tagline: 'Live participant Q&A with leading experts',
      },
    }),
  });
  const session = await sessionRes.json();
  console.log(`Created test session: "${session.title}" (ID: ${session.id}, status: ${session.status})`);

  console.log('\n=== Step 2: Submit question for a specific speaker ===');
  const qSpecificRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: targetSpeaker.id,
      body: 'How do you handle state synchronization across distributed agent clusters?',
      askerName: 'Alex Jordan',
      email: 'alex.jordan@example.com',
      archive: true,
    }),
  });
  console.log('POST question (specific speaker) status:', qSpecificRes.status);
  const qSpecific = await qSpecificRes.json();
  console.log('Specific Speaker Question:', qSpecific);
  if (qSpecificRes.status !== 201) throw new Error('Expected 201 for specific speaker question');
  if (qSpecific.speakerId !== targetSpeaker.id) throw new Error('speakerId mismatch');
  if (qSpecific.contact?.email !== undefined || qSpecific.email !== undefined) {
    throw new Error('SECURITY VIOLATION: email was returned in public question response!');
  }

  console.log('\n=== Step 3: Submit question for "Any speaker" (speakerId: null) ===');
  const qAnyRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: null,
      body: 'What are the biggest architectural bottlenecks when deploying in multi-cloud environments?',
      askerName: 'Taylor Morgan',
      email: 'taylor@example.com',
      archive: true,
    }),
  });
  console.log('POST question (any speaker) status:', qAnyRes.status);
  const qAny = await qAnyRes.json();
  console.log('Any Speaker Question:', qAny);
  if (qAnyRes.status !== 201) throw new Error('Expected 201 for any speaker question');
  if (qAny.speakerId !== null) throw new Error('Expected speakerId to be null for Any Speaker');

  console.log('\n=== Step 4: Try an invalid speaker ID through API (EXPECT 400) ===');
  const qInvalidRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: 'invalid-speaker-id-999',
      body: 'This question targets a speaker not assigned to this session.',
    }),
  });
  console.log('POST with invalid speakerId status (EXPECT 400):', qInvalidRes.status);
  const invalidBody = await qInvalidRes.json();
  console.log('400 Error Body:', invalidBody);
  if (qInvalidRes.status !== 400) {
    throw new Error(`Expected 400 for invalid speakerId, got ${qInvalidRes.status}`);
  }

  console.log('\n=== Step 5: Upvote a question ===');
  console.log(`Initial upvotes for Question ${qSpecific.id}: ${qSpecific.upvotes}`);
  const upvoteRes = await fetch(`${API_BASE}/sessions/${session.id}/questions/${qSpecific.id}/upvote`, {
    method: 'POST',
  });
  console.log('POST upvote status:', upvoteRes.status);
  const upvoteData = await upvoteRes.json();
  console.log('Upvoted response:', upvoteData);
  if (upvoteRes.status !== 200 || upvoteData.upvotes !== 1) {
    throw new Error('Expected upvotes to increment to 1');
  }

  console.log('\n=== Step 6: Advance session to archived ===');
  // upcoming -> live
  await fetch(`${API_BASE}/sessions/${session.id}/advance`, { method: 'POST' });
  // live -> archived
  const archiveRes = await fetch(`${API_BASE}/sessions/${session.id}/advance`, { method: 'POST' });
  const archivedSession = await archiveRes.json();
  console.log(`Session advanced to: ${archivedSession.status}`);
  if (archivedSession.status !== 'archived') throw new Error('Expected status to be archived');

  console.log('\n=== Step 7: Confirm new question submission is rejected (EXPECT 409) ===');
  const qRejectRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: null,
      body: 'Attempting to ask a question in an archived session.',
    }),
  });
  console.log('POST question on archived session status (EXPECT 409):', qRejectRes.status);
  const rejectBody = await qRejectRes.json();
  console.log('409 Rejection Body:', rejectBody);
  if (qRejectRes.status !== 409) {
    throw new Error(`Expected 409 for archived session question submission, got ${qRejectRes.status}`);
  }

  console.log('\n=== Step 8: Confirm upvoting on archived session is rejected (EXPECT 409) ===');
  const upvoteRejectRes = await fetch(`${API_BASE}/sessions/${session.id}/questions/${qSpecific.id}/upvote`, {
    method: 'POST',
  });
  console.log('POST upvote on archived session status (EXPECT 409):', upvoteRejectRes.status);
  const upvoteRejectBody = await upvoteRejectRes.json();
  console.log('409 Upvote Rejection Body:', upvoteRejectBody);
  if (upvoteRejectRes.status !== 409) {
    throw new Error(`Expected 409 for upvoting archived session, got ${upvoteRejectRes.status}`);
  }

  console.log('\n=== Step 9: Verify GET /sessions/:id/questions strips email ===');
  const listQuestionsRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`);
  console.log('GET questions status:', listQuestionsRes.status);
  const questionsList = await listQuestionsRes.json();
  console.log(`Total questions retrieved: ${questionsList.length}`);
  const hasAnyEmail = questionsList.some((q) => q.email !== undefined || q.contact?.email !== undefined);
  console.log('Do any retrieved questions have contact email property?', hasAnyEmail);
  if (hasAnyEmail) {
    throw new Error('SECURITY VIOLATION: email exposed in GET questions list');
  }

  console.log('\n>>> ALL PHASE 4 VERIFICATIONS PASSED SUCCESSFULLY! <<<');
}

verifyPhase4().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
