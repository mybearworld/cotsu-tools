import { element, text } from "../lib/element";
import {
  readingExercise,
  didntKnowQids,
  DUMMY_QUESTION_ID,
  DUMMY_QUESTION_INCORRECT_READING,
  DUMMY_QUESTION_READING,
  DUMMY_QUESTION_WRITING,
} from "../lib/interceptedFetch";
import { kanjiSearch, KanjiSearchWord } from "../lib/kanjiSearch";
import { katakanaToHiragana } from "../lib/katakanaToHiragana";
import { getSetting } from "../lib/settings";
import {
  getWadokuInformation,
  pitchAccentElement,
  meaningElement,
  definitionElement,
} from "../lib/wadokuInformation";

export const handleExerciseWords = async (records: MutationRecord[]) => {
  handleUpdatedWord(records);
  handleUpdatedCardWord(records);
  handleWrongAnswer(records);
  handleInitialSummary(records);
  handleSummary(records);
};

const currentQuestionId = () => {
  const studyProgressTextElement = document.querySelector(
    "[class^=_study-progress_] p",
  );
  if (!studyProgressTextElement) {
    return null;
  }
  // Frage X von Y
  return Number(studyProgressTextElement.textContent.split(" ")[1]) - 1;
};

const handleUpdatedWord = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        (record.type === "characterData" &&
          record.target.parentElement?.parentElement?.className.startsWith(
            "_study-progress_",
          )) ||
        (record.type === "childList" &&
          record.target instanceof HTMLElement &&
          record.target.className.startsWith("_question-container_") &&
          record.addedNodes[0] &&
          record.addedNodes[0].firstChild instanceof Element &&
          record.addedNodes[0].firstChild.classList.contains(
            "practice-navigation",
          )),
    )
  )
    return;
  const id = currentQuestionId();
  if (id === null) return;
  const currentQuestion = readingExercise.questions[id];
  const isDummy = currentQuestion.qid === DUMMY_QUESTION_ID;
  const total = readingExercise.questions.length - 1; // dummy question
  const now = isDummy ? total : id + 1;
  const fraction = isDummy ? 1 : (now - 1) / total;
  const text = `Frage ${now} von ${total}`;
  const studyProgressElement = element(
    document.querySelector("[class^=_study-progress_]"),
  );
  const progressBarElement = element(
    studyProgressElement.querySelector(".MuiLinearProgress-root"),
  );
  progressBarElement.ariaValueNow = now.toString();
  progressBarElement.ariaValueMax = total.toString();
  progressBarElement.ariaValueText = text;
  const progressBarInside = element(progressBarElement.firstElementChild);
  progressBarInside.style.transform = `translateX(${(fraction - 1) * 100}%)`;
  const progressTextElement = element(studyProgressElement.querySelector("p"));
  progressTextElement.textContent = text;
  if (isDummy) {
    element(document.querySelector("[class^=_study-container_]")).classList.add(
      "cotsu-tools-dummy-question",
    );
    const button = element(
      document.querySelector(".practice-primary-action button"),
    );
    button.textContent = "Zum Ende";
    const input = element(
      document.querySelector(".reading-controls [class^=_input-field_]"),
    );
    if (!(input instanceof HTMLInputElement)) return;
    input.value = DUMMY_QUESTION_INCORRECT_READING;
    requestAnimationFrame(() => {
      button.click();
      input.value = DUMMY_QUESTION_READING;
    });
  } else {
    void getWadokuInformation(currentQuestion.writing, currentQuestion.reading);
  }
};

const handleUpdatedCardWord = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        (record.type === "childList" &&
          record.target instanceof HTMLElement &&
          record.target.className.startsWith("_question-container_") &&
          record.addedNodes[0] instanceof HTMLDetailsElement &&
          record.addedNodes[0].classList.contains("practice-details")) ||
        (record.addedNodes[0] instanceof HTMLElement &&
          record.addedNodes[0].parentElement?.parentElement instanceof
            HTMLDetailsElement &&
          record.addedNodes[0].parentElement.parentElement.classList.contains(
            "practice-details",
          )),
    )
  )
    return;
  const detailsElement = element(document.querySelector(".practice-details"));
  const feedbackRegion = element(detailsElement.parentElement);
  feedbackRegion.insertAdjacentElement("beforeend", detailsElement);
  const cardReadingElement = element(document.querySelector(".card-reading"));
  const previousSolutionElement = element(
    document.querySelector(".previous-solution"),
  );
  const previousAnswerWordElement = element(
    document.querySelector(".previous-answer-word"),
  );
  const cardWriting = previousAnswerWordElement.childNodes[0].textContent;
  if (!cardWriting) return;
  cardReadingElement.replaceChildren(
    pitchAccentElement(cardWriting, cardReadingElement.textContent),
  );
  const cardDefinitionElement = document.createElement("div");
  cardDefinitionElement.classList.add("cotsu-tools-card-definition");
  cardDefinitionElement.append(
    definitionElement(cardWriting, cardReadingElement.textContent),
  );
  previousAnswerWordElement.insertAdjacentElement(
    "afterend",
    cardDefinitionElement,
  );
  document.querySelectorAll("[class^=_kanjiRow_]").forEach((row) => {
    const kanji = element(row.querySelector("[class^=_kanjiBig_")).textContent;
    const otherKanjiElement = document.createElement("details");
    otherKanjiElement.classList.add("cotsu-tools-other-with-kanji");
    const otherKanjiSummaryElement = document.createElement("summary");
    otherKanjiSummaryElement.textContent = `Andere Wörter mit ${kanji}`;
    otherKanjiElement.append(otherKanjiSummaryElement);
    let hasOpened = false;
    otherKanjiElement.addEventListener("toggle", async () => {
      if (hasOpened) return;
      hasOpened = true;
      const textElement = document.createTextNode("lädt...");
      otherKanjiElement.append(textElement);
      const result = await kanjiSearch(kanji);
      const relevantBulk: string[] = [];
      const relevantWords: KanjiSearchWord[] = [];
      result.forEach((word) => {
        if (!word.maturity) return;
        if (word.word === cardWriting) return;
        relevantBulk.push(word.word);
        relevantWords.push(word);
      });
      if (relevantWords.length === 0) {
        textElement.textContent =
          "Du kennst das Kanji noch in keinen anderen Wörtern.";
        return;
      }
      textElement.remove();
      const ul = document.createElement("ul");
      otherKanjiElement.append(ul);
      relevantWords.forEach((word) => {
        const li = document.createElement("li");
        const reading = katakanaToHiragana(word.reading);
        const kanji = document.createElement("span");
        kanji.classList.add("cotsu-tools-other-with-kanji-kanji");
        kanji.append(word.word);
        li.append(kanji);
        const moreButton = document.createElement("button");
        moreButton.classList.add("cotsu-tools-other-with-kanji-more");
        moreButton.textContent = "?";
        moreButton.addEventListener("click", () => {
          moreButton.remove();
          li.append(
            " (",
            pitchAccentElement(word.word, reading),
            ") ",
            word.word_de ?? meaningElement(word.word, reading),
          );
        });
        li.append(moreButton);
        ul.append(li);
      });
    });
    row.append(otherKanjiElement);
  });
};

const handleWrongAnswer = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        record.type === "childList" &&
        record.addedNodes[0] instanceof HTMLElement &&
        record.addedNodes[0].className.startsWith("_wrong-answer_"),
    )
  )
    return;
  const readingElement = element(
    document.querySelector("[class^=_wrong-answer_] > [lang=ja]"),
  );
  const id = currentQuestionId();
  if (id === null) return;
  readingElement.replaceWith(
    pitchAccentElement(
      readingExercise.questions[id].writing,
      readingElement.textContent,
    ),
  );
};

const handleInitialSummary = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        record.type === "childList" &&
        record.addedNodes[0] instanceof HTMLDivElement &&
        record.addedNodes[0].classList.contains("practice-frame"),
    )
  )
    return;
  const practiceRoundComplete = document.querySelector(
    ".practice-round-complete > span",
  );
  if (!(practiceRoundComplete instanceof HTMLElement)) return;
  const questionAmount = readingExercise.questionCount - 1; // dummy question
  const practiceRoundCompleteText = practiceRoundComplete.childNodes.item(1);
  if (practiceRoundCompleteText) {
    practiceRoundCompleteText.textContent = questionAmount.toString();
  }
};

const handleSummary = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        record.type === "childList" &&
        record.addedNodes[0] instanceof HTMLElement &&
        record.addedNodes[0].firstElementChild instanceof HTMLElement &&
        record.addedNodes[0].firstElementChild.className.startsWith(
          "_summary-card_",
        ),
    )
  )
    return;
  const summaryTextElement = element(
    document.querySelector("[class^=_summary-text_] p"),
  );
  if (
    summaryTextElement.textContent ===
    "In dieser Stufe gibt es nichts mehr zu Lernen."
  ) {
    return;
  }
  const questionAmount = readingExercise.questionCount - 1; // dummy question
  summaryTextElement.textContent =
    summaryTextElement.textContent.split(" ")[0] +
    ` von ${questionAmount} richtig`;
  const readingRecapElement = element(document.querySelector(".reading-recap"));
  const incorrectAnswersElement = document.createElement("ol");
  const correctAnswersElement = document.createElement("ol");
  readingRecapElement.querySelectorAll("li").forEach((li) => {
    const writing = element(li.querySelector("strong")).textContent;
    if (writing === DUMMY_QUESTION_WRITING) {
      return;
    }
    const readingRecapAnswerElement = element(
      li.querySelector(".reading-recap-answer"),
    );
    const readingElement = element(
      readingRecapAnswerElement.querySelector("[lang=ja]"),
    );
    const reading = readingElement.textContent;
    readingElement.replaceChildren(pitchAccentElement(writing, reading));
    const maybeMeaningElement = element(
      readingRecapAnswerElement.lastElementChild,
    );
    if (maybeMeaningElement === readingElement) {
      const realMeaningElement = document.createElement("span");
      realMeaningElement.append(meaningElement(writing, reading));
      readingRecapAnswerElement.append(realMeaningElement);
    }
    (li.dataset.outcome === "0" ?
      incorrectAnswersElement
    : correctAnswersElement
    ).append(li);
  });
  const incorrectHeading = document.createElement("h3");
  incorrectHeading.textContent = "Falsch waren:";
  const correctHeading = document.createElement("h3");
  correctHeading.textContent = "Richtig waren:";
  readingRecapElement.replaceChildren();
  if (incorrectAnswersElement.childElementCount > 0) {
    readingRecapElement.append(incorrectHeading, incorrectAnswersElement);
  }
  if (correctAnswersElement.childElementCount > 0) {
    readingRecapElement.append(correctHeading, correctAnswersElement);
  }
  if (getSetting("cotsu-tools-shuffle-summary")) {
    const shuffle = (container: HTMLElement) => {
      const children = [...container.children];
      let remaining = children.length;
      while (remaining) {
        const i = Math.floor(Math.random() * remaining);
        remaining--;
        [children[remaining], children[i]] = [children[i], children[remaining]];
      }
      container.innerHTML = "";
      children.forEach((child) => {
        container.append(child);
      });
    };
    shuffle(incorrectAnswersElement);
    shuffle(correctAnswersElement);
  }
};
