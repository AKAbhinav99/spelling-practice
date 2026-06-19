# Spelling Practice

A simple flashcard-style spelling quiz. It reads each word aloud with the
browser's built-in text-to-speech, you type what you hear, and it tells you
whether you got it right — highlighting exactly which letters were wrong if
not.

No build step, no server, no dependencies. It's plain HTML/CSS/JS.

## Running it

Just open `index.html` in a browser (Chrome, Edge, or Safari recommended —
they have solid `speechSynthesis` support). Double-clicking the file works
fine on macOS/Windows/Linux.

If you'd rather serve it locally (some browsers are stricter about
`file://` URLs):

```bash
cd spelling-practice
python3 -m http.server 8000
# then open http://localhost:8000
```

## How it works

- **390 words**, shuffled at the start of each round. Every word is asked
  exactly once per round — no repeats until you click "Practice Again."
- **Play Word** speaks the current word using the Web Speech API
  (`speechSynthesis`). It also plays automatically when a new card appears.
- Type your answer and hit **Enter** (or click **Check**).
  - **Correct** → green flash, move on.
  - **Wrong** → shows the correct spelling with the specific letters you
    missed underlined in red (using a longest-common-subsequence alignment,
    so a single missing or swapped letter doesn't make the rest of the word
    look wrong too), plus what you typed for reference.
- After the last word, you get a score summary and a button to start a new
  shuffled round.

## Customizing the word list

Edit `js/words.js` — it's a plain JS array:

```js
const WORDS = ["Scratch", "Stream", "Strong", /* ... */];
```

Add, remove, or replace words and reload the page.

## Browser support note

Text-to-speech requires the [Web Speech
API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API),
which is well-supported in Chrome, Edge, and Safari but not in all
browsers. If it's unavailable, the page shows a warning, but typing/checking
still works.
