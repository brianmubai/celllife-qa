const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = 'admin123';

async function verifyPhase6() {
  console.log('=== Step 1: Ensure active session with speakers exists ===');
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
      title: 'Grand Hall Keynote: Autonomous AI Systems',
      date: '2026-11-10',
      speakerIds: [speaker.id],
      branding: {
        primaryColor: '#0E49B5',
        accentColor: '#38EF7D',
        emoji: '🌊',
        tagline: 'Live Hall Projector Feed',
      },
    }),
  });
  const session = await sessionRes.json();
  console.log(`Live Session created: "${session.title}" (ID: ${session.id})`);

  console.log('\n=== Step 2: Submit a question with email for Live Screen testing ===');
  const qRes = await fetch(`${API_BASE}/sessions/${session.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: speaker.id,
      body: 'How do you guarantee latency budgets when streaming multi-turn reasoning traces?',
      askerName: 'Samantha Green',
      email: 'samantha.green@example.com',
      archive: true,
    }),
  });
  const question = await qRes.json();
  console.log(`Question submitted: ID ${question.id}, status: ${question.status}`);

  console.log('\n=== Step 3: Poll Live Screen data before answer ===');
  // Check live screen data (GET /api/sessions/:id/questions)
  const poll1Res = await fetch(`${API_BASE}/sessions/${session.id}/questions`);
  const liveQuestions1 = await poll1Res.json();
  
  const openBoard1 = liveQuestions1.filter((q) => q.status === 'open');
  const answeredStrip1 = liveQuestions1.filter((q) => q.status === 'answered');

  console.log(`Open Board count: ${openBoard1.length}`);
  console.log(`Answered Strip count: ${answeredStrip1.length}`);
  
  const targetInOpen1 = openBoard1.find((q) => q.id === question.id);
  const targetInAnswered1 = answeredStrip1.find((q) => q.id === question.id);

  console.log(`Target question on Open Board? ${!!targetInOpen1}`);
  console.log(`Target question on Answered Strip? ${!!targetInAnswered1}`);
  if (!targetInOpen1 || targetInAnswered1) {
    throw new Error('Expected question to be on open board and NOT on answered strip');
  }

  // Check no email addresses appear
  const hasAnyEmail1 = JSON.stringify(liveQuestions1).includes('samantha.green@example.com') ||
                       JSON.stringify(liveQuestions1).includes('sarah.chen@example.com');
  console.log(`Are any emails exposed in Live Screen data? ${hasAnyEmail1}`);
  if (hasAnyEmail1) {
    throw new Error('SECURITY VIOLATION: Email address leaked to Live Screen data!');
  }

  console.log('\n=== Step 4: Answer the question from Speaker Queue ===');
  const answerBody = 'We employ streaming speculative decoding alongside edge KV-cache caching to stay strictly under 150ms.';
  const replyRes = await fetch(`${API_BASE}/sessions/${session.id}/questions/${question.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speakerId: speaker.id,
      body: answerBody,
    }),
  });
  const replyData = await replyRes.json();
  console.log('Speaker reply submitted:', {
    replyId: replyData.reply?.id,
    questionStatus: replyData.question?.status,
    deliveredVia: replyData.reply?.deliveredVia,
  });

  console.log('\n=== Step 5: Simulate Live Screen 5-second polling interval ===');
  console.log('Waiting 1000ms for poll update...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const poll2Res = await fetch(`${API_BASE}/sessions/${session.id}/questions`);
  const liveQuestions2 = await poll2Res.json();

  const openBoard2 = liveQuestions2.filter((q) => q.status === 'open');
  const answeredStrip2 = liveQuestions2.filter((q) => q.status === 'answered');

  console.log(`Open Board count after reply: ${openBoard2.length}`);
  console.log(`Answered Strip count after reply: ${answeredStrip2.length}`);

  const targetInOpen2 = openBoard2.find((q) => q.id === question.id);
  const targetInAnswered2 = answeredStrip2.find((q) => q.id === question.id);

  console.log(`Target question on Open Board now? ${!!targetInOpen2}`);
  console.log(`Target question on Answered Strip now? ${!!targetInAnswered2}`);

  if (targetInOpen2) {
    throw new Error('FAIL: Answered question is still on Open Board!');
  }
  if (!targetInAnswered2) {
    throw new Error('FAIL: Answered question did not move to Answered Strip!');
  }

  console.log('Verified Answer Text on Answered Strip:', targetInAnswered2.replies?.[0]?.body);
  console.log('Verified Speaker on Answered Strip:', targetInAnswered2.replies?.[0]?.speaker?.name);

  // Re-verify no email addresses appear on the Live Screen
  const hasAnyEmail2 = JSON.stringify(liveQuestions2).includes('samantha.green@example.com') ||
                       JSON.stringify(liveQuestions2).includes('sarah.chen@example.com');
  console.log(`Are any emails exposed on screen after answer? ${hasAnyEmail2}`);
  if (hasAnyEmail2) {
    throw new Error('SECURITY VIOLATION: Email exposed on live screen!');
  }
  console.log('CONFIRMED: ZERO email addresses appear on Live Screen.');

  console.log('\n=== Step 6: Verify Frontend Route /session/:id/live serves successfully ===');
  const frontendUrl = `http://localhost:5174/session/${session.id}/live`;
  const feRes = await fetch(frontendUrl);
  console.log(`Frontend route ${frontendUrl} HTTP status: ${feRes.status}`);
  const feHtml = await feRes.text();
  console.log(`HTML served: includes root div? ${feHtml.includes('<div id="root">')}`);
  if (!feHtml.includes('<div id="root">')) {
    throw new Error('Frontend route did not return Vite application HTML');
  }

  console.log('\n>>> ALL PHASE 6 VERIFICATIONS PASSED SUCCESSFULLY! <<<');
}

verifyPhase6().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
