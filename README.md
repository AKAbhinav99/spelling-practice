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

- **Start Session** begins a timed round: the word list (390 words) is
  shuffled and a live timer starts ticking. Every word is asked exactly once
  per round — no repeats until you start a new session.
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
  shows a results screen with your accuracy, words correct, words wrong, and
  total time. From there, **Start New Session** shuffles a fresh round.

## Customizing the word list

Edit `js/words.js` — it's a plain JS array:

```js
const WORDS = ["Scratch", "Stream", "Strong", /* ... */];
```

Add, remove, or replace words and reload the page. If you add a word, also
add a matching lowercase entry to `js/sentences.js` and `js/definitions.js`
so "Use in a Sentence" and "Hear the Definition" have something to say for
it — otherwise they fall back to a generic line.

## Browser support note

Text-to-speech requires the [Web Speech
API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API),
which is well-supported in Chrome, Edge, and Safari but not in all
browsers. If it's unavailable, the page shows a warning, but typing/checking
still works.
