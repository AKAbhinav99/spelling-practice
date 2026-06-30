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
  const inputError = document.getElementById("inputError");
  const nextBtn = document.getElementById("nextBtn");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const chooseGradeBtn = document.getElementById("chooseGradeBtn");
  const historyBtn = document.getElementById("historyBtn");
  const historyScreen = document.getElementById("historyScreen");
  const historyEmptyMessage = document.getElementById("historyEmptyMessage");
  const progressChart = document.getElementById("progressChart");
  const progressTrend = document.getElementById("progressTrend");
  const progressLevelSelect = document.getElementById("progressLevelSelect");
  const progressChartLegend = document.getElementById("progressChartLegend");
  const progressChartSvgWrap = document.getElementById("progressChartSvgWrap");
  const progressPointInfo = document.getElementById("progressPointInfo");
  const practiceAllMissedBtn = document.getElementById("practiceAllMissedBtn");
  const historyList = document.getElementById("historyList");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const historyBackBtn = document.getElementById("historyBackBtn");
  const gradeScreen = document.getElementById("gradeScreen");
  const gradeGrid = document.getElementById("gradeGrid");
  const gradeBackBtn = document.getElementById("gradeBackBtn");
  const difficultyScreen = document.getElementById("difficultyScreen");
  const difficultyHeading = document.getElementById("difficultyHeading");
  const difficultySubheading = document.getElementById("difficultySubheading");
  const difficultyGrid = document.getElementById("difficultyGrid");
  const difficultyBackBtn = document.getElementById("difficultyBackBtn");
  const modeChip = document.getElementById("modeChip");
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
  let drillLabel = "Missed Words Review";
  let answered = false;
  let sessionStartTime = null;
  let timerInterval = null;

  // The word pool behind the *current* full round, and the label/color
  // shown in the mode chip while practicing it. Classic "All Words" leaves
  // both label/color empty so the chip stays hidden.
  let activeWords = WORDS;
  let activeModeLabel = "";
  let activeModeColor = "";
  let selectedGradeId = null;

  // Structured level/difficulty metadata for the *current* full round —
  // saved alongside each history entry so the progress chart can group and
  // filter sessions instead of plotting incomparable pools on one line.
  let activeLevelKey = "classic";
  let activeLevelLabel = "All Words (Classic)";
  let activeDifficultyLabel = null;

  // Which level the History screen's progress chart is currently showing.
  let selectedProgressLevelKey = null;

  const HISTORY_STORAGE_KEY = "spellingPracticeHistory";
  const MAX_HISTORY_ENTRIES = 50;
  const PROGRESS_POINT_INFO_DEFAULT = "Hover or tap a point to see that session's accuracy.";

  const GRADE_COLOR_VARS = {
    1: "--grade-1",
    2: "--grade-2",
    3: "--grade-3",
    4: "--grade-4",
    5: "--grade-5",
    middle: "--grade-middle",
  };
  const GRADE_BADGES = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", middle: "MS" };
  const DIFFICULTY_COLOR_VARS = {
    easy: "--color-correct",
    medium: "--color-accent",
    hard: "--color-play-dark",
    extraHard: "--color-wrong",
  };

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

  function showNoSpeechWarning() {
    // A browser with zero installed voices (common on Windows Chrome
    // installs with no speech voices configured, or with network voices
    // blocked) can't speak at all, no matter what we do here — point the
    // user at the OS-level fix instead of repeating the generic checks.
    if (cachedVoices.length === 0) {
      noSpeechWarning.textContent =
        "No audio played, and this browser reports zero text-to-speech voices installed. " +
        "On Windows, check Settings → Time & Language → Speech (or chrome://settings/accessibility) " +
        "and install a voice, then reload this page. Safari and Edge usually have voices built in.";
    } else {
      noSpeechWarning.textContent =
        "No audio played. Check that this tab/site isn't muted (right-click the browser tab), " +
        "that your system volume is up, and try Chrome, Edge, or Safari, which have the most " +
        "reliable support for text-to-speech.";
    }
    noSpeechWarning.hidden = false;
  }

  function speakText(text, btnEl, rate) {
    if (!("speechSynthesis" in window)) {
      showNoSpeechWarning();
      return;
    }
    noSpeechWarning.hidden = true;

    function attemptSpeak(isRetry) {
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
      let keepAlive = null;

      const stopKeepAlive = () => {
        if (keepAlive) {
          clearInterval(keepAlive);
          keepAlive = null;
        }
      };

      utterance.onstart = () => {
        started = true;
        btnEl.classList.add("is-speaking");
        // Chrome has a long-standing bug where speechSynthesis silently
        // pauses partway through longer utterances (roughly every 15s)
        // unless nudged with resume(). Safari doesn't need this.
        keepAlive = setInterval(() => {
          if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
        }, 5000);
      };
      utterance.onend = () => {
        stopKeepAlive();
        btnEl.classList.remove("is-speaking");
      };
      utterance.onerror = () => {
        stopKeepAlive();
        btnEl.classList.remove("is-speaking");
        showNoSpeechWarning();
      };

      window.speechSynthesis.speak(utterance);

      // Some Chrome builds silently drop an utterance queued immediately
      // after cancel() — no start/error event ever fires. Retry once
      // before giving up, since a second attempt after the engine has
      // settled usually goes through.
      setTimeout(() => {
        if (!started && !window.speechSynthesis.speaking) {
          if (!isRetry) {
            attemptSpeak(true);
          } else {
            showNoSpeechWarning();
          }
        }
      }, 900);
    }

    // A short delay between cancel() and speak() avoids a known Chrome
    // race condition where the new utterance gets dropped if queued in
    // the same tick as the cancellation.
    setTimeout(() => attemptSpeak(false), 50);
  }

  // Some words trip up the browser's speechSynthesis voice (irregular
  // stress, foreign-derived spelling). When a phonetic respelling exists in
  // PRONUNCIATIONS, swap it in wherever the bare word appears in the text
  // we're about to speak — including inside sentences/definitions that use
  // the word — without ever touching currentWord, which still grades
  // against the real spelling.
  function applyPronunciationOverride(text, word) {
    const override = PRONUNCIATIONS[word.toLowerCase()];
    if (!override) return text;
    return text.replace(new RegExp(`\\b${word}\\b`, "gi"), override);
  }

  function speakWord(word) {
    speakText(applyPronunciationOverride(word, word), playBtn, 0.85);
  }

  function speakSentence(word) {
    const sentence = SENTENCES[word.toLowerCase()] || `Here's the word again: ${word}.`;
    speakText(applyPronunciationOverride(sentence, word), sentenceBtn, 0.95);
  }

  function speakDefinition(word) {
    const definition = DEFINITIONS[word.toLowerCase()] || `No definition is available for this word yet.`;
    speakText(applyPronunciationOverride(definition, word), definitionBtn, 0.95);
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

  function getWordsForGrade(gradeId, difficultyId) {
    return WORDS.filter((word) => {
      const level = WORD_LEVELS[word.toLowerCase()];
      if (!level || level.grade !== gradeId) return false;
      return difficultyId === "mixed" || level.difficulty === difficultyId;
    });
  }

  function startFullRound(words, modeLabel, modeColorVar, levelKey, levelLabel, difficultyLabel) {
    activeWords = words;
    activeModeLabel = modeLabel;
    activeModeColor = modeColorVar;
    activeLevelKey = levelKey;
    activeLevelLabel = levelLabel;
    activeDifficultyLabel = difficultyLabel || null;
    if (modeLabel) {
      modeChip.textContent = modeLabel;
      modeChip.style.setProperty("--mode-color", `var(${modeColorVar})`);
      modeChip.hidden = false;
    } else {
      modeChip.hidden = true;
    }
    beginRound(words, "full");
  }

  function renderGradeGrid() {
    gradeGrid.innerHTML = GRADE_LEVELS.map(
      (g) => `
        <button type="button" class="grade-btn" data-grade="${g.id}" style="--grade-color: var(${GRADE_COLOR_VARS[g.id]})">
          <span class="grade-btn-badge">${GRADE_BADGES[g.id]}</span>
          <span class="grade-btn-label">${escapeHtml(g.label)}</span>
        </button>
      `
    ).join("");

    gradeGrid.querySelectorAll(".grade-btn").forEach((btn) => {
      btn.addEventListener("click", () => showDifficultyScreen(btn.dataset.grade));
    });
  }

  function renderDifficultyGrid(gradeId) {
    const difficultyButtons = DIFFICULTIES.map(
      (d) => `
        <button type="button" class="difficulty-btn" data-difficulty="${d.id}" style="--diff-color: var(${DIFFICULTY_COLOR_VARS[d.id]})">
          ${escapeHtml(d.label)}
        </button>
      `
    ).join("");

    const mixedButton = `
      <button type="button" class="difficulty-btn difficulty-btn-mixed" data-difficulty="mixed" style="--diff-color: var(${GRADE_COLOR_VARS[gradeId]})">
        Mixed (All Difficulties)
      </button>
    `;

    difficultyGrid.innerHTML = difficultyButtons + mixedButton;

    difficultyGrid.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.addEventListener("click", () => startGradeSession(gradeId, btn.dataset.difficulty));
    });
  }

  function showGradeScreen() {
    startScreen.hidden = true;
    gradeScreen.hidden = false;
    renderGradeGrid();
  }

  function showDifficultyScreen(gradeId) {
    selectedGradeId = gradeId;
    const gradeLabel = GRADE_LEVELS.find((g) => g.id === gradeId).label;
    difficultyHeading.textContent = `${gradeLabel}: Choose a Difficulty`;
    difficultySubheading.textContent = `Pick how challenging the words should be for ${gradeLabel}.`;
    renderDifficultyGrid(gradeId);
    gradeScreen.hidden = true;
    difficultyScreen.hidden = false;
  }

  function backToStartScreen() {
    gradeScreen.hidden = true;
    difficultyScreen.hidden = true;
    startScreen.hidden = false;
  }

  function backToGradeScreen() {
    difficultyScreen.hidden = true;
    showGradeScreen();
  }

  function startGradeSession(gradeId, difficultyId) {
    const words = getWordsForGrade(gradeId, difficultyId);
    const gradeLabel = GRADE_LEVELS.find((g) => g.id === gradeId).label;
    const difficultyLabel =
      difficultyId === "mixed" ? "Mixed" : DIFFICULTIES.find((d) => d.id === difficultyId).label;
    startFullRound(
      words,
      `${gradeLabel} · ${difficultyLabel}`,
      GRADE_COLOR_VARS[gradeId],
      `grade-${gradeId}`,
      gradeLabel,
      difficultyLabel
    );
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
    historyScreen.hidden = true;
    gradeScreen.hidden = true;
    difficultyScreen.hidden = true;
    resultsScreen.hidden = true;
    practiceScreen.hidden = false;
    showNextCard();
  }

  function startSession() {
    startFullRound(WORDS, "", "", "classic", "All Words (Classic)", null);
  }

  function startNewRoundSamePool() {
    startFullRound(activeWords, activeModeLabel, activeModeColor, activeLevelKey, activeLevelLabel, activeDifficultyLabel);
  }

  function startDrill(words, label) {
    drillLabel = label || "Missed Words Review";
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
    inputError.hidden = true;
    flashcard.classList.remove("is-correct", "is-wrong");
    updateChips();
    answerInput.focus();
    speakWord(currentWord);
  }

  function wordListItemsHtml(words) {
    if (words.length === 0) {
      return `<li class="word-list-empty">None!</li>`;
    }
    const sorted = words.slice().sort((a, b) => a.localeCompare(b));
    return sorted.map((word) => `<li>${escapeHtml(word)}</li>`).join("");
  }

  function renderWordList(listEl, words) {
    listEl.innerHTML = wordListItemsHtml(words);
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistoryEntry(entry) {
    const history = loadHistory();
    history.unshift(entry);
    history.length = Math.min(history.length, MAX_HISTORY_ENTRIES);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable; the entry just won't persist.
    }
  }

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore; nothing to clean up if storage is unavailable.
    }
  }

  function formatHistoryTimestamp(timestamp) {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  }

  // Every word missed in any completed session, deduped — lets a learner
  // drill everything that's tripped them up in past practice (today's
  // earlier sessions included; only the round still in progress is excluded,
  // since it isn't saved to history until it ends).
  function getAllMissedWordsFromHistory() {
    const history = loadHistory();
    const wordSet = new Set();
    history.forEach((entry) => {
      (entry.wrongWords || []).forEach((word) => wordSet.add(word));
    });
    return Array.from(wordSet);
  }

  function average(numbers) {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  // Compares the average accuracy of the earlier half of sessions against
  // the more recent half, so a single great-or-terrible round doesn't swing
  // the headline trend by itself.
  function computeAccuracyTrend(historyChronological) {
    const n = historyChronological.length;
    const half = Math.max(1, Math.floor(n / 2));
    const earlyAvg = average(historyChronological.slice(0, half).map((entry) => entry.accuracy));
    const recentAvg = average(historyChronological.slice(n - half).map((entry) => entry.accuracy));
    const diff = Math.round(recentAvg - earlyAvg);

    let text;
    if (diff > 2) text = `Trending up — accuracy is ${diff}% higher than your earlier sessions.`;
    else if (diff < -2) text = `Trending down — accuracy is ${Math.abs(diff)}% lower than your earlier sessions.`;
    else text = "Holding steady compared to your earlier sessions.";

    return { text, diff };
  }

  // Reads a session's grouping info, falling back to parsing the older
  // free-text modeLabel for entries saved before levelKey/levelLabel
  // existed, so history collected before this update still charts fine.
  function getEntryLevel(entry) {
    if (entry.levelKey) {
      return {
        levelKey: entry.levelKey,
        levelLabel: entry.levelLabel || entry.modeLabel || "Practice",
        difficultyLabel: entry.difficultyLabel || null,
      };
    }
    const label = entry.modeLabel || "";
    if (/missed words/i.test(label)) {
      return { levelKey: "drill", levelLabel: "Missed Words Review", difficultyLabel: null };
    }
    if (label.includes("·")) {
      const [gradePart, difficultyPart] = label.split("·").map((part) => part.trim());
      const slug = gradePart
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return { levelKey: `grade-${slug}`, levelLabel: gradePart, difficultyLabel: difficultyPart || null };
    }
    return { levelKey: "classic", levelLabel: label || "All Words (Classic)", difficultyLabel: null };
  }

  function getDifficultyColorVar(difficultyLabel) {
    const key = (difficultyLabel || "").toLowerCase();
    if (key.startsWith("extra")) return "--color-wrong";
    if (key.startsWith("hard")) return "--color-play-dark";
    if (key.startsWith("medium")) return "--color-accent";
    if (key.startsWith("easy")) return "--color-correct";
    if (key.startsWith("mixed")) return "--color-ink";
    return "--color-accent";
  }

  // One entry per distinct level (Classic, each grade, Missed Words Review)
  // found in history, newest-practiced first — used to populate the chart's
  // level dropdown and to pick its default selection.
  function getAvailableProgressLevels(history) {
    const byKey = new Map();
    history.forEach((entry) => {
      const { levelKey, levelLabel } = getEntryLevel(entry);
      const existing = byKey.get(levelKey);
      if (!existing || entry.timestamp > existing.latestTimestamp) {
        byKey.set(levelKey, { levelKey, levelLabel, latestTimestamp: entry.timestamp });
      }
    });
    return Array.from(byKey.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function buildProgressChartSvg(levelEntries, difficulties) {
    const width = 320;
    const height = 140;
    const paddingX = 26;
    const paddingY = 16;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;
    const n = levelEntries.length;
    const xStep = n > 1 ? plotWidth / (n - 1) : 0;

    const coords = levelEntries.map((entry, i) => ({
      x: paddingX + i * xStep,
      y: height - paddingY - (entry.accuracy / 100) * plotHeight,
      accuracy: entry.accuracy,
      timestamp: entry.timestamp,
      difficultyLabel: getEntryLevel(entry).difficultyLabel,
    }));

    const gridLines = [0, 25, 50, 75, 100]
      .map((pct) => {
        const y = height - paddingY - (pct / 100) * plotHeight;
        return `
          <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" class="progress-gridline" />
          <text x="${paddingX - 6}" y="${y + 3}" class="progress-axis-label" text-anchor="end">${pct}</text>
        `;
      })
      .join("");

    // With two or more difficulties present, split into one line per
    // difficulty (each its own color) instead of one misleading average
    // line mixing Easy and Extra Hard sessions together.
    const useMultiLine = difficulties.length >= 2;
    const groups = useMultiLine ? difficulties : [null];

    const linesAndDots = groups
      .map((difficultyLabel) => {
        const groupCoords = useMultiLine ? coords.filter((c) => c.difficultyLabel === difficultyLabel) : coords;
        if (groupCoords.length === 0) return "";
        const colorVar = useMultiLine ? getDifficultyColorVar(difficultyLabel) : "--color-accent";

        const linePath = groupCoords
          .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
          .join(" ");
        const line =
          groupCoords.length > 1
            ? `<path d="${linePath}" class="progress-line" style="--line-color: var(${colorVar})" fill="none" />`
            : "";

        const dots = groupCoords
          .map((c) => {
            const { date } = formatHistoryTimestamp(c.timestamp);
            const label = escapeHtml(
              `${date}${c.difficultyLabel ? ` (${c.difficultyLabel})` : ""}: ${c.accuracy}% accuracy`
            );
            return `
              <g class="progress-point" tabindex="0" aria-label="${label}" data-point-label="${label}">
                <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="8" class="progress-dot-hit" />
                <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.2" class="progress-dot" style="--dot-color: var(${colorVar})" />
              </g>
            `;
          })
          .join("");

        return line + dots;
      })
      .join("");

    const firstLabel = formatHistoryTimestamp(coords[0].timestamp).date;
    const lastLabel = formatHistoryTimestamp(coords[coords.length - 1].timestamp).date;

    return `
      <svg viewBox="0 0 ${width} ${height}" class="progress-chart-svg" role="img" aria-label="Accuracy across your last ${n} sessions, from ${firstLabel} to ${lastLabel}">
        ${gridLines}
        ${linesAndDots}
        <text x="${paddingX}" y="${height - 2}" class="progress-axis-label">${firstLabel}</text>
        <text x="${width - paddingX}" y="${height - 2}" class="progress-axis-label" text-anchor="end">${lastLabel}</text>
      </svg>
    `;
  }

  function renderProgressLegend(difficulties) {
    if (difficulties.length < 2) {
      progressChartLegend.hidden = true;
      progressChartLegend.innerHTML = "";
      return;
    }
    progressChartLegend.hidden = false;
    progressChartLegend.innerHTML = difficulties
      .map(
        (label) => `
          <span class="progress-legend-item">
            <span class="progress-legend-swatch" style="--swatch-color: var(${getDifficultyColorVar(label)})"></span>
            ${escapeHtml(label)}
          </span>
        `
      )
      .join("");
  }

  function renderChartForSelectedLevel(history) {
    const levelEntries = history
      .filter((entry) => getEntryLevel(entry).levelKey === selectedProgressLevelKey)
      .slice()
      .reverse();

    if (levelEntries.length < 2) {
      progressTrend.textContent = "";
      progressTrend.classList.remove("is-up", "is-down");
      progressChartLegend.hidden = true;
      progressChartLegend.innerHTML = "";
      progressPointInfo.hidden = true;
      progressChartSvgWrap.innerHTML = `<p class="progress-chart-empty">Complete one more session at this level to see a trend.</p>`;
      return;
    }

    const { text, diff } = computeAccuracyTrend(levelEntries);
    progressTrend.textContent = text;
    progressTrend.classList.toggle("is-up", diff > 2);
    progressTrend.classList.toggle("is-down", diff < -2);

    const difficulties = Array.from(
      new Set(levelEntries.map((entry) => getEntryLevel(entry).difficultyLabel).filter(Boolean))
    );

    progressChartSvgWrap.innerHTML = buildProgressChartSvg(levelEntries, difficulties);
    renderProgressLegend(difficulties);
    progressPointInfo.hidden = false;
    progressPointInfo.textContent = PROGRESS_POINT_INFO_DEFAULT;
    progressPointInfo.classList.remove("is-active");
  }

  function renderProgressSection(history) {
    const levels = getAvailableProgressLevels(history);
    if (levels.length === 0) {
      progressChart.hidden = true;
      return;
    }
    progressChart.hidden = false;

    if (!selectedProgressLevelKey || !levels.some((level) => level.levelKey === selectedProgressLevelKey)) {
      selectedProgressLevelKey = levels[0].levelKey;
    }

    progressLevelSelect.innerHTML = levels
      .map((level) => `<option value="${escapeHtml(level.levelKey)}">${escapeHtml(level.levelLabel)}</option>`)
      .join("");
    progressLevelSelect.value = selectedProgressLevelKey;

    renderChartForSelectedLevel(history);
  }

  function renderHistoryScreen() {
    const history = loadHistory();

    if (history.length === 0) {
      historyEmptyMessage.hidden = false;
      progressChart.hidden = true;
      practiceAllMissedBtn.hidden = true;
      historyList.innerHTML = "";
      clearHistoryBtn.hidden = true;
      return;
    }

    historyEmptyMessage.hidden = true;
    clearHistoryBtn.hidden = false;
    renderProgressSection(history);

    const allMissed = getAllMissedWordsFromHistory();
    if (allMissed.length > 0) {
      practiceAllMissedBtn.hidden = false;
      practiceAllMissedBtn.textContent = `Practice All Missed Words (${allMissed.length})`;
    } else {
      practiceAllMissedBtn.hidden = true;
    }

    historyList.innerHTML = history
      .map((entry, index) => {
        const { date, time } = formatHistoryTimestamp(entry.timestamp);
        const practiceEntryBtn =
          entry.wrongWords.length > 0
            ? `<button type="button" class="secondary-btn history-practice-entry-btn" data-history-index="${index}">Practice This Day's Missed Words</button>`
            : "";
        return `
          <details class="history-entry">
            <summary class="history-summary">
              <span class="history-summary-main">
                <span class="history-date">${date}</span>
                <span class="history-time">${time}</span>
                <span class="history-mode">${escapeHtml(entry.modeLabel)}</span>
              </span>
              <span class="history-summary-stats">
                <span class="history-score">${entry.correct} / ${entry.asked}</span>
                <span class="history-accuracy">${entry.accuracy}%</span>
              </span>
            </summary>
            <div class="history-detail">
              <p class="history-detail-meta">Time taken: ${formatTime(entry.timeSeconds)}</p>
              <div class="word-review">
                <div class="word-list-block word-list-block-wrong">
                  <h3>Missed <span class="word-list-count">${entry.wrongWords.length}</span></h3>
                  <ul class="word-list">${wordListItemsHtml(entry.wrongWords)}</ul>
                </div>
                <div class="word-list-block word-list-block-correct">
                  <h3>Correct <span class="word-list-count">${entry.correctWords.length}</span></h3>
                  <ul class="word-list">${wordListItemsHtml(entry.correctWords)}</ul>
                </div>
              </div>
              ${practiceEntryBtn}
            </div>
          </details>
        `;
      })
      .join("");
  }

  function showHistoryScreen() {
    renderHistoryScreen();
    startScreen.hidden = true;
    historyScreen.hidden = false;
  }

  function backToStartScreenFromHistory() {
    historyScreen.hidden = true;
    startScreen.hidden = false;
  }

  function showFullResults() {
    resultsHeading.textContent = "Session Complete";
    drillMessage.hidden = true;
    practiceMissedBtn.hidden = roundWrongWords.length === 0;
    continueDrillBtn.hidden = true;
    exitBtn.hidden = false;
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
    const timeSeconds = elapsedSeconds();

    practiceScreen.hidden = true;
    resultsScreen.hidden = false;
    resultAccuracy.textContent = `${accuracy}%`;
    resultCorrect.textContent = String(correct);
    resultWrong.textContent = String(wrong);
    resultTime.textContent = formatTime(timeSeconds);

    renderWordList(correctWordsList, roundCorrectWords);
    renderWordList(wrongWordsList, roundWrongWords);
    correctWordsCount.textContent = String(roundCorrectWords.length);
    wrongWordsCount.textContent = String(roundWrongWords.length);

    if (asked > 0) {
      const isDrill = mode === "drill";
      saveHistoryEntry({
        timestamp: Date.now(),
        modeLabel: isDrill ? drillLabel : activeModeLabel || "All Words (Classic)",
        levelKey: isDrill ? "drill" : activeLevelKey,
        levelLabel: isDrill ? "Missed Words Review" : activeLevelLabel,
        difficultyLabel: isDrill ? null : activeDifficultyLabel,
        asked,
        correct,
        wrong,
        accuracy,
        timeSeconds,
        correctWords: roundCorrectWords.slice(),
        wrongWords: roundWrongWords.slice(),
      });
    }

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

  const LETTERS_ONLY_PATTERN = /^[A-Za-z]+$/;

  function checkAnswer() {
    if (answered) return;
    const typed = answerInput.value.trim();
    if (!typed) {
      answerInput.focus();
      return;
    }

    if (!LETTERS_ONLY_PATTERN.test(typed)) {
      inputError.textContent = "Letters only, please — remove any numbers or symbols before checking.";
      inputError.hidden = false;
      answerInput.focus();
      return;
    }
    inputError.hidden = true;

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

  answerInput.addEventListener("input", () => {
    if (!inputError.hidden) inputError.hidden = true;
  });

  playBtn.addEventListener("click", () => speakWord(currentWord));

  sentenceBtn.addEventListener("click", () => speakSentence(currentWord));

  definitionBtn.addEventListener("click", () => speakDefinition(currentWord));

  nextBtn.addEventListener("click", showNextCard);

  startBtn.addEventListener("click", startSession);

  chooseGradeBtn.addEventListener("click", showGradeScreen);

  historyBtn.addEventListener("click", showHistoryScreen);

  historyBackBtn.addEventListener("click", backToStartScreenFromHistory);

  clearHistoryBtn.addEventListener("click", () => {
    if (window.confirm("Clear all practice history? This can't be undone.")) {
      clearHistory();
      renderHistoryScreen();
    }
  });

  practiceAllMissedBtn.addEventListener("click", () => {
    const words = getAllMissedWordsFromHistory();
    if (words.length > 0) startDrill(words, "All Missed Words");
  });

  progressLevelSelect.addEventListener("change", () => {
    selectedProgressLevelKey = progressLevelSelect.value;
    renderChartForSelectedLevel(loadHistory());
  });

  historyList.addEventListener("click", (event) => {
    const btn = event.target.closest(".history-practice-entry-btn");
    if (!btn) return;
    const entry = loadHistory()[Number(btn.dataset.historyIndex)];
    if (!entry || !entry.wrongWords || entry.wrongWords.length === 0) return;
    const { date } = formatHistoryTimestamp(entry.timestamp);
    startDrill(entry.wrongWords.slice(), `${date} Missed Words`);
  });

  function showProgressPoint(event) {
    const point = event.target.closest(".progress-point");
    if (!point) return;
    progressPointInfo.textContent = point.dataset.pointLabel;
    progressPointInfo.classList.add("is-active");
  }

  function resetProgressPoint(event) {
    if (!event.target.closest(".progress-point")) return;
    progressPointInfo.textContent = PROGRESS_POINT_INFO_DEFAULT;
    progressPointInfo.classList.remove("is-active");
  }

  // Listeners live on the wrapper (not the dots), since progressChartSvgWrap's
  // innerHTML — and every dot inside it — is replaced on each render.
  progressChartSvgWrap.addEventListener("mouseover", showProgressPoint);
  progressChartSvgWrap.addEventListener("mouseout", resetProgressPoint);
  progressChartSvgWrap.addEventListener("focusin", showProgressPoint);
  progressChartSvgWrap.addEventListener("focusout", resetProgressPoint);
  progressChartSvgWrap.addEventListener("click", showProgressPoint);

  gradeBackBtn.addEventListener("click", backToStartScreen);

  difficultyBackBtn.addEventListener("click", backToGradeScreen);

  endSessionBtn.addEventListener("click", endSession);

  newSessionBtn.addEventListener("click", startNewRoundSamePool);

  practiceMissedBtn.addEventListener("click", () => startDrill(roundWrongWords));

  continueDrillBtn.addEventListener("click", () => startDrill(roundWrongWords));

  exitBtn.addEventListener("click", exitToStartScreen);
})();
