import { readingExercise, exerciseMode, DUMMY_QUESTION_ID, writingWrongQids } from "../lib/interceptedFetch";
import { getWadokuInformation } from "../lib/wadokuInformation";
import { watchWritingSurface } from "../lib/writingSurface";
import { createWriter, loadKanji } from "../lib/kanjiWriter";

export const handleWritingMode = () => {
  if (exerciseMode !== "writing" || !readingExercise) return;
  const card = document.querySelector<HTMLElement>('[class^="ReadingQuestionCard-module--questionCard--"]');
  const progress = document.querySelector('[class^="StudyProgress-module--study-progress--"] p');
  const index = Number(progress?.childNodes.item(1)?.textContent) - 1;
  const question = readingExercise.questions[index];
  if (!card || !question || question.qid === DUMMY_QUESTION_ID) return;
  if (card.dataset.writingQuestion === `${index}/${question.qid}`) return;
  card.dataset.writingQuestion = `${index}/${question.qid}`;
  card.classList.add("cotsu-tools-writing-question");
  card.querySelector(".cotsu-tools-writing")?.remove();
  const form = card.querySelector("form");
  const input = form?.querySelector("input");
  if (!form || !input) return;
  const panel = document.createElement("div");
  panel.className = "cotsu-tools-writing";
  const definition = document.createElement("div");
  definition.className = "cotsu-tools-writing-definition";
  definition.textContent = "Lädt …";
  const boxes = document.createElement("div");
  boxes.className = "cotsu-tools-writing-boxes";
  const status = document.createElement("p");
  status.className = "cotsu-tools-writing-status";
  status.role = "status";
  status.textContent = "Strichdaten laden …";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Erneut laden";
  retry.hidden = true;
  const attribution = document.createElement("a");
  attribution.href = "https://kanjivg.tagaini.net/";
  attribution.target = "_blank";
  attribution.rel = "noopener noreferrer";
  attribution.className = "cotsu-tools-writing-credit";
  attribution.textContent = "KanjiVG · CC BY-SA 3.0";
  attribution.title = "Strichdaten von KanjiVG, für HanziWriter umgewandelt";
  const add = document.createElement("button");
  add.type = "button";
  add.className = "cotsu-tools-writing-add";
  add.textContent = "+ Zeichen";
  add.disabled = true;
  panel.append(definition, boxes, add, status, retry, attribution);
  form.before(panel);
  input.setAttribute("aria-label", "Lesung");
  let ready = false, submitted = false;
  let hasInk = false;
  const entered: {
    complete: boolean;
    nextStroke: number;
    writer?: ReturnType<typeof createWriter>;
  }[] = [];
  const surfaces: (() => void)[] = [];
  let appendCharacter: () => void = () => {};
  const writers: ReturnType<typeof createWriter>[] = [];
  const active = () => panel.isConnected && card.dataset.writingQuestion === `${index}/${question.qid}`;
  const load = async () => {
    ready = false;
    add.disabled = true;
    surfaces.splice(0).forEach(cleanup => cleanup());
    entered.length = 0;
    hasInk = false;
    writers.splice(0).forEach(writer => writer.cancelQuiz());
    retry.hidden = true;
    status.textContent = "Definition und Strichdaten laden …";
    try {
      const characters = [...question.writing];
      const [information, data] = await Promise.all([
        getWadokuInformation(question.writing, question.reading),
        Promise.all(characters.map(character => loadKanji(character))),
      ]);
      if (!active()) return;
      if (!information) throw new Error("Keine Wadoku-Definition verfügbar.");
      definition.replaceChildren(information.definition.cloneNode(true));
      const heading = document.createElement("strong");
      heading.textContent = "Definition von Wadoku";
      definition.prepend(heading);
      boxes.replaceChildren();
      appendCharacter = () => {
        if (submitted) return;
        const i = entered.length;
        const state: (typeof entered)[number] = { complete: false, nextStroke: 0 };
        entered.push(state);
        const box = document.createElement("div");
        boxes.append(box);
        box.setAttribute("aria-label", `Zeichen ${i + 1}`);
        const size = Math.min(200, Math.max(128, Math.floor((document.documentElement.clientWidth - 112) / 2)));
        box.style.width = `${size}px`;
        box.style.height = `${size}px`;
        if (data[i]) {
          const writer = createWriter(box, characters[i], data[i]);
          state.writer = writer;
          writers.push(writer);
          const markComplete = () => {
            if (!active() || submitted || state.complete) return;
            hasInk = true;
            state.complete = true;
            box.classList.add("cotsu-tools-writing-complete");
            box.setAttribute("aria-label", `Zeichen ${i + 1}: fertig`);
            const completion = document.createElement("span");
            completion.className = "cotsu-tools-writing-finished";
            completion.textContent = "✓";
            completion.setAttribute("aria-hidden", "true");
            box.append(completion);
          };
          writer.quiz({
            showHintAfterMisses: 3,
            leniency: 1.7,
            onMistake: () => {
              if (!active() || submitted) return;
              hasInk = true;
              writingWrongQids.add(question.qid);
              box.classList.add("cotsu-tools-writing-error");
            },
            onCorrectStroke: ({ strokeNum, strokesRemaining }) => {
              if (!active() || submitted) return;
              state.nextStroke = strokeNum + 1;
              // Complete synchronously with the final accepted stroke. Extra
              // ink during HanziWriter's finishing animation cannot undo it.
              if (strokesRemaining === 0) markComplete();
            },
            onComplete: markComplete,
          });
        }
        // Extra character slots behave identically and never reveal the
        // answer length. They accept ink, but cannot pass word grading.
        surfaces.push(watchWritingSurface(box,
          () => state.complete || !data[i],
          () => active() && !submitted,
          extra => {
            hasInk = true;
            status.textContent = "";
            if (extra) {
              writingWrongQids.add(question.qid);
              // Do not expose an extra slot's lack of a target before grading.
              if (state.complete) box.classList.add("cotsu-tools-writing-error");
            }
          },
        ));
      };
      appendCharacter();
      ready = true;
      add.disabled = false;
      status.textContent = "";
    } catch (error) {
      if (!active()) return;
      status.textContent = `Schreibübung konnte nicht geladen werden. ${error instanceof Error ? error.message : "Bitte erneut versuchen."}`;
      retry.hidden = false;
    }
  };
  add.addEventListener("click", () => appendCharacter());
  retry.addEventListener("click", () => void load());
  // Replace the previous question's listener when React reuses its form.
  const previous = form as HTMLFormElement & { writingCleanup?: () => void };
  previous.writingCleanup?.();
  const submit = (event: SubmitEvent) => {
    if (submitted) return;
    const block = () => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    if (!ready || !hasInk) {
      block();
      if (ready) status.textContent = "Bitte zuerst schreiben.";
      return;
    }
    const requiredCount = [...question.writing].length;
    if (entered.length !== requiredCount) writingWrongQids.add(question.qid);
    // Never create slots or report the expected length, even after a mistake.
    // Highlight only the next stroke in already-entered unfinished characters.
    const incomplete = entered.slice(0, requiredCount).filter(character => !character.complete);
    if (entered.length < requiredCount || incomplete.length > 0) {
      writingWrongQids.add(question.qid);
      incomplete.forEach(character => {
        void character.writer?.highlightStroke(character.nextStroke);
      });
      status.textContent = "Schreibweise noch unvollständig.";
      block();
      return;
    }
    submitted = true;
    add.disabled = true;
    writers.forEach(writer => writer.cancelQuiz());
    // Let the original submit event reach Cotsu once, with the untouched
    // reading. Handwriting failures are applied to results and saved progress.
  };
  form.addEventListener("submit", submit, true);
  previous.writingCleanup = () => {
    form.removeEventListener("submit", submit, true);
    surfaces.forEach(cleanup => cleanup());
    writers.forEach(writer => writer.cancelQuiz());
  };
  void load();
};
