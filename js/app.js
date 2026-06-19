(() => {
  const progressChip = document.getElementById("progressChip");
  const scoreChip = document.getElementById("scoreChip");
  const timerChip = document.getElementById("timerChip");
  const flashcard = document.getElementById("flashcard");
  const playBtn = document.getElementById("playBtn");
  const sentenceBtn = document.getElementById("sentenceBtn");
  const definitionBtn = document.getElementById("definitionBtn");
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
  const resultsHeading = document.getElementById("resultsHeading");
  const resultAccuracy = document.getElementById("resultAccuracy");
  const resultCorrect = document.getElementById("resultCorrect");
  const resultWrong = document.getElementById("resultWrong");
  const resultTime = document.getElementById("resultTime");
  const drillMessage = document.getElementById("drillMessage");
  const wrongWordsList = document.getElementById("wrongWordsList");
  const correctWordsList = document.getElementById("correctWordsList");
  const wrongWordsCount = document.getElementById("wrongWordsCount");
  const correctWordsCount = document.getElementById("correctWordsCount");
  const practiceMissedBtn = document.getElementById("practiceMissedBtn");
  const continueDrillBtn = document.getElementById("continueDrillBtn");
  const exitBtn = document.getElementById("exitBtn");
  const newSessionBtn = document.getElementById("newSessionBtn");
  const noSpeechWarning = document.getElementById("noSpeechWarning");

  let mode = "full"; // "full" (the whole word list) or "drill" (practicing missed words)
  let deck = [];
  let currentWord = "";
  let roundTotal = 0;
  let asked = 0;
  let correct = 0;
  let roundCorrectWords = [];
  let roundWrongWords = [];
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

  // Chrome (and others) populate the voice list asynchronously, so the
  // first speak() call right after page load can silently produce no
  // audio if we ask for a voice before the list has arrived.
  let cachedVoices = [];
  function refreshVoices() {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  if ("speechSynthesis" in window) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function speakText(text, btnEl, rate) {
    if (!("speechSynthesis" in window)) {
      noSpeechWarning.hidden = false;
      return;
    }
    noSpeechWarning.hidden = true;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    // Prefer an explicit English voice when one is available, but don't
    // force utterance.lang to "en-US" — on systems without that exact
    // voice installed, some browsers drop the utterance with no error
    // at all instead of falling back to a default.
    const englishVoice = cachedVoices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;

    let started = false;
    utterance.onstart = () => {
      started = true;
      btnEl.classList.add("is-speaking");
    };
    utterance.onend = () => btnEl.classList.remove("is-speaking");
    utterance.onerror = () => {
      btnEl.classList.remove("is-speaking");
      noSpeechWarning.hidden = false;
    };

    window.speechSynthesis.speak(utterance);

    // Some browsers swallow the utterance with no start/error event at
    // all (stale voice cache, the tab/site got muted, OS sleep/wake).
    // Surface the warning instead of staying silently broken.
    setTimeout(() => {
      if (!started && !window.speechSynthesis.speaking) {
        noSpeechWarning.hidden = false;
      }
    }, 800);
  }

  function speakWord(word) {
    speakText(word, playBtn, 0.85);
  }

  function speakSentence(word) {
    const sentence = SENTENCES[word.toLowerCase()] || `Here's the word again: ${word}.`;
    speakText(sentence, sentenceBtn, 0.95);
  }

  function speakDefinition(word) {
    const definition = DEFINITIONS[word.toLowerCase()] || `No definition is available for this word yet.`;
    speakText(definition, definitionBtn, 0.95);
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
    progressChip.textContent = `Word ${Math.min(asked + 1, roundTotal)} of ${roundTotal}`;
    scoreChip.textContent = `Score: ${correct} / ${asked}`;
  }

  function beginRound(words, roundMode) {
    mode = roundMode;
    deck = shuffle(words);
    roundTotal = deck.length;
    asked = 0;
    correct = 0;
    roundCorrectWords = [];
    roundWrongWords = [];
    sessionStartTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerChip, 1000);
    updateTimerChip();

    startScreen.hidden = true;
    resultsScreen.hidden = true;
    practiceScreen.hidden = false;
    showNextCard();
  }

  function startSession() {
    beginRound(WORDS, "full");
  }

  function startDrill(words) {
    beginRound(words, "drill");
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

  function renderWordList(listEl, words) {
    if (words.length === 0) {
      listEl.innerHTML = `<li class="word-list-empty">None!</li>`;
      return;
    }
    const sorted = words.slice().sort((a, b) => a.localeCompare(b));
    listEl.innerHTML = sorted.map((word) => `<li>${escapeHtml(word)}</li>`).join("");
  }

  function showFullResults() {
    resultsHeading.textContent = "Session Complete";
    drillMessage.hidden = true;
    practiceMissedBtn.hidden = roundWrongWords.length === 0;
    continueDrillBtn.hidden = true;
    exitBtn.hidden = true;
    newSessionBtn.hidden = false;
    (practiceMissedBtn.hidden ? newSessionBtn : practiceMissedBtn).focus();
  }

  function showDrillResults() {
    resultsHeading.textContent = "Review Round Complete";
    practiceMissedBtn.hidden = true;
    newSessionBtn.hidden = true;
    drillMessage.hidden = false;

    if (roundWrongWords.length > 0) {
      const count = roundWrongWords.length;
      drillMessage.textContent = `You've gone through every word you missed — ${count} ${count === 1 ? "is" : "are"} still tricky. Want to keep practicing ${count === 1 ? "it" : "them"}?`;
      continueDrillBtn.hidden = false;
      exitBtn.hidden = false;
      continueDrillBtn.focus();
    } else {
      drillMessage.textContent = "Great work! You've gotten every missed word right.";
      continueDrillBtn.hidden = true;
      exitBtn.hidden = false;
      exitBtn.focus();
    }
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

    renderWordList(correctWordsList, roundCorrectWords);
    renderWordList(wrongWordsList, roundWrongWords);
    correctWordsCount.textContent = String(roundCorrectWords.length);
    wrongWordsCount.textContent = String(roundWrongWords.length);

    if (mode === "drill") {
      showDrillResults();
    } else {
      showFullResults();
    }
  }

  function exitToStartScreen() {
    clearInterval(timerInterval);
    timerInterval = null;
    resultsScreen.hidden = true;
    practiceScreen.hidden = true;
    startScreen.hidden = false;
    startBtn.focus();
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
    if (isCorrect) {
      correct++;
      roundCorrectWords.push(currentWord);
    } else {
      roundWrongWords.push(currentWord);
    }

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

  definitionBtn.addEventListener("click", () => speakDefinition(currentWord));

  nextBtn.addEventListener("click", showNextCard);

  startBtn.addEventListener("click", startSession);

  endSessionBtn.addEventListener("click", endSession);

  newSessionBtn.addEventListener("click", startSession);

  practiceMissedBtn.addEventListener("click", () => startDrill(roundWrongWords));

  continueDrillBtn.addEventListener("click", () => startDrill(roundWrongWords));

  exitBtn.addEventListener("click", exitToStartScreen);
})();
