<script>
  import { showToast } from '../lib/ui-store.svelte.js';

  // ── Scenario definitions ──────────────────────────────────────
  const scenarios = [
    {
      id: 'business-ethics',
      title: 'Business Ethics Crisis',
      description: 'An employee discovers their manager is committing financial fraud. Navigate this ethical dilemma as a business professional.',
      difficulty: 'Medium',
      timeLimit: '15 min',
      icon: '🤝',
      color: '#f43f5e',
      systemPrompt: `You are an FBLA judge evaluating a student in a Business Ethics roleplay scenario. 

SCENARIO: You play the role of a Senior HR Director at a mid-sized corporation. The student plays an employee who has discovered that their direct manager is manipulating expense reports and committing financial fraud.

YOUR ROLE: 
- Start by asking the student to describe what they discovered and how they plan to handle it
- Ask probing questions about ethical frameworks, whistleblower procedures, company policy
- Challenge their reasoning with realistic complications (e.g., "What if reporting could cost you your job?")
- Evaluate their professional communication, ethical reasoning, and knowledge of business ethics

EVALUATION CRITERIA (FBLA standards):
- Ethical decision-making framework
- Professional communication skills  
- Knowledge of corporate compliance and whistleblower protections
- Ability to handle workplace conflicts professionally
- Proposed solutions and their feasibility

When the student asks for evaluation, provide a detailed score (1-100) and specific feedback on each criterion. Keep responses concise but impactful. Begin by introducing yourself and the situation.`
    },
    {
      id: 'entrepreneurship',
      title: 'Startup Pitch',
      description: 'Pitch your innovative business idea to a panel of FBLA judges evaluating feasibility, creativity, and market potential.',
      difficulty: 'Hard',
      timeLimit: '10 min',
      icon: '🚀',
      color: '#8b5cf6',
      systemPrompt: `You are an FBLA judge evaluating a student's startup pitch. You play the role of a skeptical but fair venture capitalist and FBLA judge.

YOUR ROLE:
- Ask the student to present their business idea (product/service, target market, revenue model)
- Challenge assumptions with tough but fair questions: market size, competition, scalability, financials
- Ask about the founding team, MVP, and go-to-market strategy
- Probe for creative thinking and FBLA business knowledge

EVALUATION CRITERIA:
- Business concept creativity and viability
- Market analysis and competitive awareness
- Financial projections and revenue model
- Presentation confidence and clarity
- Ability to handle tough investor questions

Be realistic and somewhat challenging — this mirrors actual FBLA competition pressure. Ask follow-up questions based on their responses. When asked for evaluation, score them 1-100 with specific FBLA feedback. Start by introducing yourself and asking them to begin their pitch.`
    },
    {
      id: 'customer-service',
      title: 'Customer Service Challenge',
      description: 'Handle an upset customer who received a defective product and demands an immediate refund and compensation.',
      difficulty: 'Easy',
      timeLimit: '10 min',
      icon: '🎯',
      color: '#06b6d4',
      systemPrompt: `You are an FBLA judge evaluating a student's customer service skills. You play the role of an upset customer.

CHARACTER: You are an angry customer who ordered an expensive laptop for your child's college studies. It arrived defective — the screen flickers and the keyboard has dead keys. You've been waiting 3 weeks. You demand a full refund AND compensation for the inconvenience. Start frustrated.

PROGRESSION:
- Begin upset and demanding
- Gradually become more reasonable if the student handles you professionally
- Remain difficult if they are dismissive or robotic
- If they handle it very well, express satisfaction

EVALUATION CRITERIA (reveal at the end when asked):
- De-escalation techniques
- Active listening and empathy
- Problem-solving and solution offering
- Professional communication under pressure
- Following proper customer service procedures

Score 1-100 with specific feedback. Start the scenario immediately as the upset customer calling customer service.`
    },
    {
      id: 'leadership',
      title: 'Team Leadership Conflict',
      description: 'Mediate a conflict between two team members with opposing approaches to an important project deadline.',
      difficulty: 'Medium',
      timeLimit: '12 min',
      icon: '👥',
      color: '#10b981',
      systemPrompt: `You are an FBLA judge evaluating a student's leadership and conflict resolution skills.

SCENARIO: You alternate between playing two conflicting team members on a marketing project. The student is the team leader.

TEAM MEMBER A (Alex): Wants to rush and deliver a basic project by tomorrow's deadline. Says quality doesn't matter as long as it's submitted.

TEAM MEMBER B (Jordan): Wants to request a deadline extension to deliver something truly excellent. Believes submitting mediocre work reflects poorly on the whole team.

Both are dug in and have stopped communicating. The student must mediate this conflict as the team leader.

YOUR APPROACH:
- Play each character realistically with their perspective
- Don't cave immediately — make the student work for resolution
- Test their ability to hear all sides and find creative compromises

EVALUATION CRITERIA:
- Active listening to all parties
- Creative problem-solving
- Keeping the team motivated
- Decisiveness and leadership presence
- Professional communication

Start by presenting the conflict as if both team members just came to the student's desk arguing.`
    },
    {
      id: 'job-interview',
      title: 'Business Analyst Interview',
      description: 'Interview for a business analyst position at a Fortune 500 company. Showcase your skills and handle tough behavioral questions.',
      difficulty: 'Hard',
      timeLimit: '15 min',
      icon: '💼',
      color: '#f59e0b',
      systemPrompt: `You are an FBLA judge playing the role of a tough but fair senior interviewer at a Fortune 500 company for a Business Analyst position.

YOUR APPROACH:
- Ask a mix of behavioral (STAR format), technical, and situational questions
- Behavioral: "Tell me about a time you had to analyze complex data..."
- Technical: "How would you approach a market sizing problem for our new product line?"
- Situational: "A stakeholder disagrees with your data findings. What do you do?"
- Ask follow-up questions to test depth

EVALUATION CRITERIA:
- Use of STAR method for behavioral questions
- Business acumen and analytical thinking
- Professional communication and confidence
- Relevant knowledge of business analysis concepts
- Ability to think on their feet

Maintain a professional, somewhat challenging interview atmosphere. Take notes throughout (you can reference earlier answers). When asked for evaluation, score 1-100 with specific feedback and hiring recommendation. Begin by introducing yourself and starting the interview.`
    },
    {
      id: 'public-speaking',
      title: 'Business Plan Presentation',
      description: 'Present a comprehensive business plan to stakeholders. Defend your financials, market analysis, and growth strategy.',
      difficulty: 'Medium',
      timeLimit: '12 min',
      icon: '📊',
      color: '#3b82f6',
      systemPrompt: `You are an FBLA judge playing a skeptical board of stakeholders evaluating a student's business plan presentation.

YOUR ROLE: You represent a panel of stakeholders (investors, board members) reviewing a business plan. The student is presenting.

APPROACH:
- Let the student present (ask them to begin)
- Interrupt with pointed questions: "Your revenue projections seem optimistic — what are your assumptions?"
- Challenge financials: "How did you calculate this market size?"
- Ask about risk: "What's your contingency if your main supplier fails?"
- Press on growth strategy: "How are you different from [competitor]?"

EVALUATION CRITERIA:
- Business plan comprehensiveness
- Financial literacy and justification
- Market and competitive analysis
- Ability to think on their feet under pressure
- Presentation clarity and confidence
- Professional responses to tough questions

Start by briefly introducing the panel and asking the student to begin their presentation.`
    }
  ];

  // ── State ─────────────────────────────────────────────────────
  let selectedScenario = $state(null);
  let messages = $state([]);
  let inputText = $state('');
  let isLoading = $state(false);
  let ttsEnabled = $state(false);
  let recording = $state(false);
  let mediaRecorder = $state(null);
  let audioChunks = $state([]);

  const AI_API = 'https://ai.hackclub.com/proxy/v1/chat/completions';
  const WHISPER_API = 'https://ai.hackclub.com/proxy/v1/audio/transcriptions';
  const AI_MODEL = 'meta-llama/llama-4-maverick';
  const WHISPER_MODEL = 'openai/whisper-large-v3-turbo';

  // Scroll to bottom on new messages
  let chatEl = $state(null);
  $effect(() => {
    if (messages.length && chatEl) {
      setTimeout(() => chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' }), 50);
    }
  });

  // ── AI Functions ──────────────────────────────────────────────
  async function sendMessage(userMsg) {
    if (!userMsg.trim() || isLoading || !selectedScenario) return;
    const trimmed = userMsg.trim();
    messages = [...messages, { role: 'user', content: trimmed }];
    inputText = '';
    isLoading = true;

    try {
      const response = await fetch(AI_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: selectedScenario.systemPrompt },
            ...messages
          ]
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '(No response)';
      messages = [...messages, { role: 'assistant', content: reply }];

      if (ttsEnabled) speak(reply);
    } catch (e) {
      showToast('AI error: ' + e.message, 'error');
      messages = [...messages, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }];
    } finally {
      isLoading = false;
    }
  }

  async function requestEvaluation() {
    await sendMessage('Please provide a comprehensive evaluation of my performance in this roleplay scenario. Give me a score from 1-100, specific strengths, areas for improvement, and FBLA competition tips.');
  }

  // ── TTS ───────────────────────────────────────────────────────
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 500));
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') || voices[0];
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.speak(utter);
  }

  function toggleTts() {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) window.speechSynthesis?.cancel();
    showToast(ttsEnabled ? '🔊 TTS enabled' : '🔇 TTS disabled', 'info', 2000);
  }

  // ── STT ───────────────────────────────────────────────────────
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Microphone not supported in this browser', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks = [...audioChunks, e.data]; };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio();
      };
      mr.start();
      mediaRecorder = mr;
      recording = true;
      showToast('🎙️ Recording... click again to stop', 'info', 3000);
    } catch (e) {
      showToast('Microphone access denied: ' + e.message, 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      recording = false;
    }
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  async function transcribeAudio() {
    if (!audioChunks.length) return;
    isLoading = true;
    try {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('model', WHISPER_MODEL);

      const res = await fetch(WHISPER_API, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Whisper error ${res.status}`);
      const data = await res.json();
      const transcript = data.text?.trim();
      if (transcript) {
        await sendMessage(transcript);
      } else {
        showToast('Could not transcribe audio. Try again.', 'warning');
        isLoading = false;
      }
    } catch (e) {
      showToast('Transcription failed: ' + e.message, 'error');
      isLoading = false;
    }
    audioChunks = [];
  }

  // ── Scenario selection ────────────────────────────────────────
  function selectScenario(scenario) {
    selectedScenario = scenario;
    messages = [];
    inputText = '';
    window.speechSynthesis?.cancel();
    // Kick off the conversation
    initScenario();
  }

  async function initScenario() {
    await sendMessage('Hello, I am ready to begin the roleplay scenario. Please start.');
  }

  function exitScenario() {
    window.speechSynthesis?.cancel();
    if (recording) stopRecording();
    selectedScenario = null;
    messages = [];
    inputText = '';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  function difficultyColor(d) {
    if (d === 'Easy') return 'var(--color-success)';
    if (d === 'Medium') return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  function formatMsg(content) {
    return content.replace(/\n/g, '<br>');
  }
</script>

<div class="page-content">
  {#if !selectedScenario}
    <!-- ── Scenario List ── -->
    <div class="roleplay-header">
      <h1>🎭 FBLA Roleplay Practice</h1>
      <p class="text-muted">Practice with AI-powered FBLA judges. Get realistic feedback on your performance.</p>
    </div>

    <div class="scenario-grid">
      {#each scenarios as scenario}
        <div
          class="scenario-card card card-hover"
          style="--sc-color: {scenario.color}; border-top: 3px solid {scenario.color};"
        >
          <div class="sc-header">
            <div class="sc-icon" style="background: {scenario.color}18;">{scenario.icon}</div>
            <div class="sc-badges">
              <span
                class="sc-difficulty"
                style="color:{difficultyColor(scenario.difficulty)}; background:{difficultyColor(scenario.difficulty)}18;"
              >
                {scenario.difficulty}
              </span>
              <span class="sc-time badge badge-muted">⏱ {scenario.timeLimit}</span>
            </div>
          </div>
          <h3 class="sc-title">{scenario.title}</h3>
          <p class="sc-desc">{scenario.description}</p>
          <button
            class="btn btn-primary sc-btn"
            onclick={() => selectScenario(scenario)}
          >
            Start Scenario →
          </button>
        </div>
      {/each}
    </div>

    <div class="roleplay-tip card">
      <span class="tip-icon">💡</span>
      <div>
        <strong>How it works:</strong> Choose a scenario and chat with an AI FBLA judge. Respond naturally as you would in a real competition. Ask for an evaluation when you're ready for feedback.
        You can also enable <strong>text-to-speech</strong> and use your <strong>microphone</strong> for a more immersive experience.
      </div>
    </div>

  {:else}
    <!-- ── Chat Interface ── -->
    <div class="chat-layout">
      <!-- Chat header -->
      <div class="chat-header card">
        <div class="chat-header-left">
          <button class="btn btn-ghost btn-sm" onclick={exitScenario}>← Back</button>
          <div class="chat-scenario-info">
            <span class="scenario-icon-sm">{selectedScenario.icon}</span>
            <div>
              <h2 class="chat-title">{selectedScenario.title}</h2>
              <p class="chat-desc text-muted text-sm">{selectedScenario.description}</p>
            </div>
          </div>
        </div>
        <div class="chat-controls">
          <button
            class="btn btn-sm"
            class:btn-secondary={ttsEnabled}
            class:btn-ghost={!ttsEnabled}
            onclick={toggleTts}
            title="Toggle text-to-speech"
          >
            {ttsEnabled ? '🔊 TTS On' : '🔇 TTS Off'}
          </button>
          <button
            class="btn btn-danger btn-sm"
            onclick={requestEvaluation}
            disabled={isLoading || messages.length < 4}
            title="Get AI evaluation of your performance"
          >
            📋 Get Evaluated
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="chat-messages" bind:this={chatEl}>
        {#if messages.length === 0}
          <div class="chat-empty">
            <div class="chat-loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Starting scenario...</p>
          </div>
        {:else}
          {#each messages as msg}
            <div class="message-wrap" class:user-wrap={msg.role === 'user'}>
              {#if msg.role === 'assistant'}
                <div class="msg-avatar ai-avatar">{selectedScenario.icon}</div>
              {/if}
              <div class="message" class:user-msg={msg.role === 'user'} class:ai-msg={msg.role === 'assistant'}>
                {@html formatMsg(msg.content)}
              </div>
              {#if msg.role === 'user'}
                <div class="msg-avatar user-avatar">You</div>
              {/if}
            </div>
          {/each}

          {#if isLoading}
            <div class="message-wrap">
              <div class="msg-avatar ai-avatar">{selectedScenario.icon}</div>
              <div class="message ai-msg typing-msg">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Input area -->
      <div class="chat-input-area card">
        <div class="input-row">
          <textarea
            class="input chat-textarea"
            placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
            bind:value={inputText}
            onkeydown={handleKeydown}
            disabled={isLoading}
            rows="2"
          ></textarea>
          <div class="input-actions">
            <button
              class="btn mic-btn"
              class:recording={recording}
              onclick={toggleRecording}
              disabled={isLoading}
              title={recording ? 'Stop recording' : 'Start voice input'}
              aria-label={recording ? 'Stop recording' : 'Start voice input'}
            >
              {recording ? '⏹️' : '🎙️'}
            </button>
            <button
              class="btn btn-primary send-btn"
              onclick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? '...' : '➤'}
            </button>
          </div>
        </div>
        <div class="input-hint">
          <span class="text-xs text-muted">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</span>
          <span class="text-xs text-muted">{messages.filter(m => m.role === 'user').length} responses sent</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Scenario List ── */
  .roleplay-header { margin-bottom: 1.75rem; }
  .roleplay-header h1 { margin-bottom: 0.35rem; }

  .scenario-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .scenario-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.4rem;
  }

  .sc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .sc-icon {
    font-size: 1.8rem;
    width: 52px;
    height: 52px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sc-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }

  .sc-difficulty {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.18rem 0.5rem;
    border-radius: var(--radius-full);
    letter-spacing: 0.04em;
  }

  .sc-time { font-size: 0.72rem; }

  .sc-title { font-size: 1rem; font-weight: 700; margin: 0; }

  .sc-desc {
    font-size: 0.83rem;
    color: var(--color-text-muted);
    line-height: 1.55;
    flex: 1;
  }

  .sc-btn { width: 100%; }

  .roleplay-tip {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: var(--color-primary-light);
    border-color: rgba(0, 102, 204, 0.15);
    font-size: 0.875rem;
    color: var(--color-text);
    line-height: 1.6;
  }

  .tip-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 0.1rem; }

  /* ── Chat ── */
  .chat-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: calc(100vh - var(--nav-height) - 2rem);
    max-height: 900px;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    flex-wrap: wrap;
  }

  .chat-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex: 1;
    min-width: 0;
  }

  .chat-scenario-info {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    min-width: 0;
  }

  .scenario-icon-sm { font-size: 1.3rem; flex-shrink: 0; }

  .chat-title { font-size: 1rem; font-weight: 700; margin: 0; }
  .chat-desc { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; }

  .chat-controls { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  /* Messages */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    background: var(--color-bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    scroll-behavior: smooth;
  }

  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--color-text-muted);
  }

  .chat-loading-dots {
    display: flex;
    gap: 0.3rem;
  }

  .chat-loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: bounce 1.2s infinite;
  }
  .chat-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .chat-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  .message-wrap {
    display: flex;
    align-items: flex-end;
    gap: 0.65rem;
    animation: slideInLeft 0.3s ease;
  }

  .user-wrap {
    flex-direction: row-reverse;
    animation: slideInRight 0.3s ease;
  }

  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    flex-shrink: 0;
    align-self: flex-end;
  }

  .ai-avatar {
    background: var(--color-primary-light);
    font-size: 1rem;
    border: 1.5px solid var(--color-border);
  }

  .user-avatar {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    font-size: 0.65rem;
  }

  .message {
    max-width: 72%;
    padding: 0.85rem 1.1rem;
    border-radius: 16px;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .ai-msg {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-bottom-left-radius: 4px;
    color: var(--color-text);
  }

  .user-msg {
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .typing-msg {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.85rem 1.25rem;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-text-muted);
    animation: bounce 1.2s infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  /* Input area */
  .chat-input-area {
    padding: 0.85rem 1.1rem;
    flex-shrink: 0;
  }

  .input-row {
    display: flex;
    gap: 0.65rem;
    align-items: flex-end;
  }

  .chat-textarea {
    flex: 1;
    resize: none;
    min-height: 52px;
    max-height: 120px;
    font-size: 0.9rem;
    line-height: 1.5;
    padding: 0.65rem 0.9rem;
  }

  .input-actions {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mic-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    font-size: 1rem;
    padding: 0;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    cursor: pointer;
    transition: all 0.2s;
  }
  .mic-btn:hover { border-color: var(--color-primary); }
  .mic-btn.recording {
    background: var(--color-danger-light);
    border-color: var(--color-danger);
    animation: pulse 1s infinite;
  }

  .send-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    font-size: 1rem;
  }

  .input-hint {
    display: flex;
    justify-content: space-between;
    margin-top: 0.4rem;
  }

  kbd {
    display: inline-block;
    padding: 0.05rem 0.35rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.7rem;
    font-family: monospace;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @media (max-width: 1024px) {
    .scenario-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px) {
    .scenario-grid { grid-template-columns: 1fr; }
    .chat-layout { height: calc(100vh - var(--nav-height) - 1rem); }
    .message { max-width: 85%; }
    .chat-title { font-size: 0.875rem; }
    .chat-desc { display: none; }
    .chat-controls .btn:first-child { display: none; }
  }
</style>
