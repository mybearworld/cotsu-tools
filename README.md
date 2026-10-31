# Cotsu-Tools

Ein Userscript mit einigen Tools für die Kanjileselernseite https://cotsu.de. Siehe https://openuserjs.org/scripts/mybearworld/Cotsu-Tools für mehr Informationen.

A userscript that adds a few tools to the German Kanji learning site https://cotsu.de. See https://openuserjs.org/scripts/mybearworld/Cotsu-Tools for more information (in German).

### Writing accounts

In Cotsu-Tools settings, choose **Lesen** or **Schreiben** for the current
account. The choice is stored per Cotsu user ID in this browser's local storage
and takes effect at the next exercise. New accounts default to reading mode.
Both modes use that account's existing Cotsu vocabulary and progress.

Writing exercises show the Wadoku definition instead of the Japanese prompt.
Enter the reading in the usual input and draw every character (including
kana), in stroke order. Start with one blank box and use **+ Zeichen** to add
characters; the expected word length is hidden. Submitting without any ink
is blocked. Too many/few characters, unfinished characters, rejected strokes,
or extra strokes after completion make the word incorrect. Failed attempts must
still finish all required characters before submitting the reading. The expected number of boxes stays hidden even after an incorrect attempt;
add them yourself with **+ Zeichen**. Submitting an unfinished attempt highlights
the next stroke only in existing unfinished boxes. Completed characters show a
checkmark, including characters completed with mistakes. Extra strokes and boxes
never block completion. The reading stays untouched, and handwriting failures override the
saved result and the exercise summary independently. After three misses
on a stroke, HanziWriter highlights it. Matching uses a general leniency of 1.7.
Loading failures block grading and offer a retry.

[HanziWriter](https://hanziwriter.org/) is loaded through the userscript's
`@require`. Japanese stroke centerlines come from
[KanjiVG](https://kanjivg.tagaini.net/) (Ulrich Apel and contributors,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)). The script
converts them into HanziWriter coordinates and stroke ribbons at runtime;
these converted stroke data remain under CC BY-SA 3.0.
