export const quizState = $state({
  questions: [],
  currentIndex: 0,
  answers: {},
  flagged: {},
  started: false,
  finished: false,
  timeExpired: false,
  subject: null,
  timeLeft: 0,
  timeLimitSeconds: 0,
  startTime: null
});

let timerInterval = null;

function clearTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

export function startQuiz(subject, questions, timeLimitSeconds) {
  clearTimer();
  quizState.questions = questions;
  quizState.currentIndex = 0;
  quizState.answers = {};
  quizState.flagged = {};
  quizState.started = true;
  quizState.finished = false;
  quizState.timeExpired = false;
  quizState.subject = subject;
  quizState.timeLimitSeconds = timeLimitSeconds;
  quizState.timeLeft = timeLimitSeconds;
  quizState.startTime = Date.now();

  timerInterval = setInterval(() => {
    if (quizState.timeLeft > 0) {
      quizState.timeLeft--;
    } else {
      clearTimer();
      quizState.timeExpired = true;
    }
  }, 1000);
}

export function answerQuestion(index, optionIndex) {
  quizState.answers = { ...quizState.answers, [index]: optionIndex };
}

export function flagQuestion(index) {
  const updated = { ...quizState.flagged };
  if (updated[index]) {
    delete updated[index];
  } else {
    updated[index] = true;
  }
  quizState.flagged = updated;
}

export function nextQuestion() {
  if (quizState.currentIndex < quizState.questions.length - 1) {
    quizState.currentIndex++;
  }
}

export function prevQuestion() {
  if (quizState.currentIndex > 0) {
    quizState.currentIndex--;
  }
}

export function goToQuestion(index) {
  if (index >= 0 && index < quizState.questions.length) {
    quizState.currentIndex = index;
  }
}

export function submitQuiz() {
  clearTimer();
  const timeSpent = quizState.startTime
    ? Math.floor((Date.now() - quizState.startTime) / 1000)
    : 0;

  let score = 0;
  const questions = quizState.questions;
  const answers = { ...quizState.answers };

  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correct) {
      score++;
    }
  }

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  quizState.finished = true;

  return {
    score,
    total,
    percentage,
    answers,
    questions: [...questions],
    subject: quizState.subject,
    timeSpent,
    timeLimitSeconds: quizState.timeLimitSeconds,
    savedAt: Date.now()
  };
}

export function resetQuiz() {
  clearTimer();
  quizState.questions = [];
  quizState.currentIndex = 0;
  quizState.answers = {};
  quizState.flagged = {};
  quizState.started = false;
  quizState.finished = false;
  quizState.timeExpired = false;
  quizState.subject = null;
  quizState.timeLeft = 0;
  quizState.timeLimitSeconds = 0;
  quizState.startTime = null;
}
