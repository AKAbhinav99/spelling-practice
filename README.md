# Spelling Practice

A simple flashcard-style spelling quiz. It reads each word aloud with the
browser's built-in text-to-speech, you type what you hear, and it tells you
whether you got it right — highlighting exactly which letters were wrong if
not.

No build step, no server, no dependencies. It's plain HTML/CSS/JS.

## Running it

**If you downloaded the ZIP from GitHub** ("Code" → "Download ZIP"): unzip
it, open the extracted folder, and double-click `index.html`. It'll open in
your default browser and just works — no terminal needed.

**If you cloned with `git clone`**, same thing: open `index.html` from
inside the `spelling-practice` folder.

Chrome, Edge, or Safari are recommended — they have solid `speechSynthesis`
support for the "Play Word" button.

### Serving it locally instead (optional)

Some browsers are stricter about `file://` URLs, so you can serve it over
HTTP instead. On macOS, the easiest way to avoid folder-name mix-ups: in
Finder, right-click the project folder and choose **New Terminal at
Folder**, then run:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

If you `cd` manually instead, note that a ZIP download extracts to a folder
named `spelling-practice-main` (repo name + branch), not `spelling-practice`
— that name only applies if you cloned with `git`.

## How it works

- **All Words (Classic)** begins a timed round: the whole word list (1,828
  words) is shuffled and a live timer starts ticking. Every word is asked
  exactly once per round — no repeats until you start a new session.
- **Practice by Grade Level** walks through a two-step picker: choose a
  grade (1st–5th, or Middle School & Above) and then a difficulty
  (Easy/Medium/Hard/Extra Hard, or Mixed for all four), and the round only
  draws from that grade+difficulty's word pool (280+ words each). A colored
  chip during practice shows which grade/difficulty is active, and **Start
  New Session** afterward reshuffles the same pool rather than switching
  back to the full list.
- **Play Word** speaks the current word using the Web Speech API
  (`speechSynthesis`). It also plays automatically when a new card appears.
- **Use in a Sentence** speaks a short example sentence instead of the bare
  word, which helps tell homophones apart (e.g. "knight" vs. "night") since
  the sentence makes the meaning unambiguous.
- **Hear the Definition** speaks the word's dictionary definition aloud,
  for an extra context clue without showing the word's spelling on screen.
- Type your answer and hit **Enter** (or click **Check**).
  - **Correct** → green flash, move on.
  - **Wrong** → shows the correct spelling with the specific letters you
    missed underlined in red (using a longest-common-subsequence alignment,
    so a single missing or swapped letter doesn't make the rest of the word
    look wrong too), plus what you typed for reference.
- **End Session** (or finishing the whole word list) stops the timer and
  shows a results screen with your accuracy, words correct, words wrong,
  total time, and a list of exactly which words you got right and which you
  missed.
  - If you missed any words, **Practice Missed Words** starts a new round
    containing only those words.
  - Finishing a practice round shows a "Review Round Complete" screen. If
    any words are still tricky, **Continue Practicing** drills just those
    again — repeat as many times as needed. Once you get every missed word
    right, it congratulates you and **Exit** is the only option, which
    returns you to the start screen.
  - From the main results screen, **Start New Session** shuffles a fresh
    round of all the words instead.

## Customizing the word list

Edit `js/words.js` — it's a plain JS array:

```js
const WORDS = ["Scratch", "Stream", "Strong", /* ... */];
```

Add, remove, or replace words and reload the page. If you add a word, also
add a matching lowercase entry to `js/sentences.js` and `js/definitions.js`
so "Use in a Sentence" and "Hear the Definition" have something to say for
it — otherwise they fall back to a generic line.

To make a word selectable from the grade-level picker, also add it to
`js/gradeLevels.js`:

```js
const WORD_LEVELS = {
  yourword: { grade: "3", difficulty: "medium" },
  // grade: "1".."5" or "middle" | difficulty: "easy" | "medium" | "hard" | "extraHard"
};
```

Words left out of `gradeLevels.js` still work fine in "All Words (Classic)"
mode; they just won't show up in any grade/difficulty pool.

## Browser support note

Text-to-speech requires the [Web Speech
API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API),
which is well-supported in Chrome, Edge, and Safari but not in all
browsers. If it's unavailable, the page shows a warning, but typing/checking
still works.
