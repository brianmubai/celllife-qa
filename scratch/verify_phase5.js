const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = 'admin123';

async function verifyPhase5() {
  console.log('=== Step 1: Ensure active speaker and session exist ===');
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
  const speaker = speakers[0];

  const sessionRes = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Real-Time Multi-Agent Live Session',
      date: '2026-11-05',
      speakerIds: [speaker.id],
      branding: {
        primaryColor: '#1F6F5C',
        accentColor: '#F4B942',
        emoji: '🎙️',
        tagline: 'Live Q&A Queue Demonstration',
      },
    }),
  });
  const session = await sessionRes.json();
  console.log(`Created session "${session.title}" (ID: ${session.id}) with speaker ${speaker.name} (${speaker.id})`);

  console.log('\n=== Step 2: Submit two questions with participant emails ===');
  // Question A (for successful send)
  const qARes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: speaker.id,
      body: 'Question A: What are best practices for agent message routing?',
      askerName: 'Alice Dev',
      email: 'alice@example.com',
      archive: true,
    }),
  });
  const qA = await qARes.json();
  console.log(`Submitted Question A: ID ${qA.id}, status: ${qA.status}`);

  // Question B (for simulated failed send)
  const qBRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: null, // Any speaker
      body: 'Question B: How to mitigate cascading failures in tool calls?',
      askerName: 'Bob Engineer',
      email: 'bob@example.com',
      archive: true,
    }),
  });
  const qB = await qBRes.json();
  console.log(`Submitted Question B: ID ${qB.id}, status: ${qB.status}`);

  console.log('\n=== Step 3: Check speaker queue (GET /api/sessions/:id/queue?speakerId=X) ===');
  const queueRes = await fetch(`${API_BASE}/sessions/${session.id}/queue?speakerId=${speaker.id}`);
  console.log('Queue GET status:', queueRes.status);
  const queueItems = await queueRes.json();
  console.log(`Queue items count: ${queueItems.length}`);
  const hasQA = queueItems.some((item) => item.id === qA.id);
  const hasQB = queueItems.some((item) => item.id === qB.id);
  console.log(`Question A in queue? ${hasQA} | Question B in queue? ${hasQB}`);
  if (!hasQA || !hasQB) {
    throw new Error('Expected both open questions in speaker queue');
  }

  console.log('\n=== Step 4: Answer Question A with successful send (Dev/Mock SMTP) ===');
  const replyARes = await fetch(`${API_BASE}/sessions/${session.id}/questions/${qA.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: speaker.id,
      body: 'Use pub/sub topics partitioned by agent conversation ID with exponential backoff retries.',
    }),
  });
  console.log('Reply A POST status:', replyARes.status);
  const replyAData = await replyARes.json();
  console.log('Reply A Response:', {
    ok: replyAData.ok,
    deliveredVia: replyAData.reply?.deliveredVia,
    questionStatus: replyAData.question?.status,
    warning: replyAData.warning,
  });
  if (replyARes.status !== 201) throw new Error('Expected 201 for reply A');
  if (replyAData.question.status !== 'answered') throw new Error('Expected question A status to be answered');
  if (!replyAData.reply.deliveredVia.includes('email')) {
    throw new Error('Expected deliveredVia to include email on successful send');
  }

  console.log('\n=== Step 5: Simulate failed send with wrong SMTP credentials on Question B ===');
  const replyBRes = await fetch(`${API_BASE}/sessions/${session.id}/questions/${qB.id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-smtp-fail': 'true', // Triggers simulated wrong credentials
    },
    body: JSON.stringify({
      speakerId: speaker.id,
      body: 'Implement circuit breakers with fallback mock responses to prevent cascading timeouts.',
    }),
  });
  console.log('Reply B POST status (expect 201 despite SMTP failure):', replyBRes.status);
  const replyBData = await replyBRes.json();
  console.log('Reply B Response:', {
    ok: replyBData.ok,
    replyId: replyBData.reply?.id,
    deliveredVia: replyBData.reply?.deliveredVia,
    questionStatus: replyBData.question?.status,
    warning: replyBData.warning,
  });

  if (replyBRes.status !== 201) throw new Error('Expected 201 for reply B even if email failed');
  if (!replyBData.reply || !replyBData.reply.id) throw new Error('Expected reply B to be stored');
  if (replyBData.question.status !== 'answered') throw new Error('Expected question B status to remain answered');
  if (replyBData.reply.deliveredVia.includes('email')) {
    throw new Error('deliveredVia should NOT contain email when sending failed');
  }
  if (!replyBData.warning) {
    throw new Error('Expected a warning returned describing email delivery failure');
  }
  console.log('CONFIRMED: Reply was saved, question was marked answered, and warning was returned.');

  console.log('\n=== Step 6: Verify queue is now empty (both questions answered) ===');
  const queueAfterRes = await fetch(`${API_BASE}/sessions/${session.id}/queue?speakerId=${speaker.id}`);
  const queueAfter = await queueAfterRes.json();
  console.log(`Open queue count now: ${queueAfter.length}`);
  if (queueAfter.length !== 0) {
    throw new Error(`Expected queue to be 0 after both questions answered, got ${queueAfter.length}`);
  }

  console.log('\n=== Step 7: Verify GET /sessions/:id/questions shows both questions answered with replies ===');
  const sessionQuestionsRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`);
  const sessionQuestions = await sessionQuestionsRes.json();
  console.log('Questions count:', sessionQuestions.length);
  for (const q of sessionQuestions) {
    console.log(`Question: "${q.body.slice(0, 30)}..." | status: ${q.status} | replies: ${q.replies?.length}`);
    if (q.status !== 'answered') throw new Error('Expected all questions to be answered');
    if (!q.replies || q.replies.length === 0) throw new Error('Expected question to have attached reply');
  }

  console.log('\n>>> ALL PHASE 5 VERIFICATIONS PASSED SUCCESSFULLY! <<<');
}

verifyPhase5().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
