(() => {
  const progressChip = document.getElementById("progressChip");
  const scoreChip = document.getElementById("scoreChip");
  const timerChip = document.getElementById("timerChip");
  const flashcard = document.getElementById("flashcard");
  const playBtn = document.getElementById("playBtn");
  const sentenceBtn = document.getElementById("sentenceBtn");
  const answerForm = document.getElementById("answerForm");
  const answerInput = document.getElementById("answerInput");
  const checkBtn = document.getElementById("checkBtn");
  const feedback = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const practiceScreen = document.getElementById("practiceScreen");
  const endSessionBtn = document.getElementById("endSessionBtn");
  const resultsScreen = document.getElementById("resultsScreen");
  const resultAccuracy = document.getElementById("resultAccuracy");
  const resultCorrect = document.getElementById("resultCorrect");
  const resultWrong = document.getElementById("resultWrong");
  const resultTime = document.getElementById("resultTime");
  const newSessionBtn = document.getElementById("newSessionBtn");
  const noSpeechWarning = document.getElementById("noSpeechWarning");

  const TOTAL_WORDS = WORDS.length;

  let deck = [];
  let currentWord = "";
  let asked = 0;
  let correct = 0;
  let answered = false;
  let sessionStartTime = null;
  let timerInterval = null;

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function speakText(text, btnEl, rate) {
    if (!("speechSynthesis" in window)) {
      noSpeechWarning.hidden = false;
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = "en-US";
    utterance.onstart = () => btnEl.classList.add("is-speaking");
    utterance.onend = () => btnEl.classList.remove("is-speaking");
    utterance.onerror = () => btnEl.classList.remove("is-speaking");
    window.speechSynthesis.speak(utterance);
  }

  function speakWord(word) {
    speakText(word, playBtn, 0.85);
  }

  function speakSentence(word) {
    const sentence = SENTENCES[word.toLowerCase()] || `Here's the word again: ${word}.`;
    speakText(sentence, sentenceBtn, 0.95);
  }

  // Longest-common-subsequence alignment between the typed attempt and the
  // correct word, so a single missing/extra letter doesn't make every
  // following letter look wrong.
  function alignedMatch(typed, correctWord) {
    const a = typed.toLowerCase();
    const b = correctWord.toLowerCase();
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const matchedInCorrect = new Array(m).fill(false);
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        matchedInCorrect[j - 1] = true;
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return matchedInCorrect;
  }

  function renderSpellingDiff(typed, correctWord) {
    const matched = alignedMatch(typed, correctWord);
    return correctWord
      .split("")
      .map((ch, idx) => {
        const cls = matched[idx] ? "ok" : "miss";
        return `<span class="${cls}">${ch}</span>`;
      })
      .join("");
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function elapsedSeconds() {
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }

  function updateTimerChip() {
    timerChip.textContent = `Time: ${formatTime(elapsedSeconds())}`;
  }

  function updateChips() {
    progressChip.textContent = `Word ${Math.min(asked + 1, TOTAL_WORDS)} of ${TOTAL_WORDS}`;
    scoreChip.textContent = `Score: ${correct} / ${asked}`;
  }

  function startSession() {
    deck = shuffle(WORDS);
    asked = 0;
    correct = 0;
    sessionStartTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerChip, 1000);
    updateTimerChip();

    startScreen.hidden = true;
    resultsScreen.hidden = true;
    practiceScreen.hidden = false;
    showNextCard();
  }

  function showNextCard() {
    if (deck.length === 0) {
      endSession();
      return;
    }
    currentWord = deck.pop();
    answered = false;
    answerInput.value = "";
    answerInput.disabled = false;
    checkBtn.disabled = false;
    nextBtn.hidden = true;
    feedback.innerHTML = "";
    flashcard.classList.remove("is-correct", "is-wrong");
    updateChips();
    answerInput.focus();
    speakWord(currentWord);
  }

  function endSession() {
    clearInterval(timerInterval);
    timerInterval = null;

    const wrong = asked - correct;
    const accuracy = asked > 0 ? Math.round((correct / asked) * 100) : 0;

    practiceScreen.hidden = true;
    resultsScreen.hidden = false;
    resultAccuracy.textContent = `${accuracy}%`;
    resultCorrect.textContent = String(correct);
    resultWrong.textContent = String(wrong);
    resultTime.textContent = formatTime(elapsedSeconds());
    newSessionBtn.focus();
  }

  function checkAnswer() {
    if (answered) return;
    const typed = answerInput.value.trim();
    if (!typed) {
      answerInput.focus();
      return;
    }

    answered = true;
    asked++;
    answerInput.disabled = true;
    checkBtn.disabled = true;
    nextBtn.hidden = false;

    const isCorrect = typed.toLowerCase() === currentWord.toLowerCase();
    if (isCorrect) correct++;

    updateChips();
    flashcard.classList.add(isCorrect ? "is-correct" : "is-wrong");

    if (isCorrect) {
      feedback.innerHTML = `
        <div class="feedback-result correct">&#10003; Correct!</div>
      `;
    } else {
      feedback.innerHTML = `
        <div class="feedback-result wrong">&#10007; Wrong</div>
        <div class="feedback-detail">
          Correct spelling:
          <span class="spelling-render">${renderSpellingDiff(typed, currentWord)}</span>
        </div>
        <div class="you-wrote">You typed: <strong>${escapeHtml(typed)}</strong></div>
      `;
    }

    nextBtn.focus();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    checkAnswer();
  });

  playBtn.addEventListener("click", () => speakWord(currentWord));

  sentenceBtn.addEventListener("click", () => speakSentence(currentWord));

  nextBtn.addEventListener("click", showNextCard);

  startBtn.addEventListener("click", startSession);

  endSessionBtn.addEventListener("click", endSession);

  newSessionBtn.addEventListener("click", startSession);
})();
