import { element, text } from "../lib/element";
import { DUMMY_QUESTION_ID, readingExercise } from "../lib/interceptedFetch";
import {
  getWadokuInformation,
  pitchAccentElement,
  meaningElement,
  definitionElement,
} from "../lib/wadokuInformation";

let previousReadingExercise: typeof readingExercise | null = null;
let id = 0;

export const handleExerciseWords = async (records: MutationRecord[]) => {
  for (const record of records) {
    handleUpdatedWord(record);
    handleUpdatedCardWord(record);
    handleWrongAnswer(record);
    handleSummary(record);
  }
};

const handleUpdatedWord = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    (record.type !== "childList" ||
      !(firstAddedNode instanceof HTMLElement) ||
      (!firstAddedNode.className.startsWith(
        "StudyProgress-module--study-progress--",
      ) &&
        !firstAddedNode.className.startsWith("JapaneseText-module--red--"))) &&
    (record.type !== "childList" ||
      !(record.target instanceof HTMLElement) ||
      !record.target.className.startsWith("JapaneseText-module--red--") ||
      !(firstAddedNode instanceof Text)) &&
    (record.type !== "characterData" ||
      !record.target.parentElement?.className.startsWith(
        "JapaneseText-module--red--",
      ) ||
      !record.target.parentElement?.parentElement?.className.startsWith(
        "ReadingQuestionCard-module--cardExampleSentence--",
      ))
  )
    return;
  if (previousReadingExercise !== readingExercise) {
    previousReadingExercise = readingExercise;
    id = 0;
    const studyProgressTextElement = element(
      document.querySelector(
        "[class^=StudyProgress-module--study-progress--] p",
      ),
    );
    const exerciseAmount = studyProgressTextElement.childNodes.item(3);
    exerciseAmount.textContent = (
      Number(exerciseAmount.textContent) - 1
    ).toString();
  }
  const questionAmountWithoutDummy = readingExercise.questions.length - 1;
  element(
    document.querySelector(
      "[class^=StudyProgress-module--study-progress--] .MuiLinearProgress-bar",
    ),
  ).style.transform =
    `translateX(${-100 * (1 - (id + 1) / questionAmountWithoutDummy)}%)`;
  if (readingExercise.questions[id].qid === DUMMY_QUESTION_ID) {
    element(
      document.querySelector(
        "[class^=QuestionContainer-module--question-container--]",
      ),
    ).classList.add("cotsu-tools-dummy-question");
    element(
      document.querySelector(
        "[class*=ReadingQuestionCard-module--action-check--]",
      ),
    ).textContent = "Zum Ende";
  } else {
    void getWadokuInformation(
      readingExercise.questions[id].writing,
      readingExercise.questions[id].reading,
    );
  }
  id++;
};

const handleUpdatedCardWord = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    (record.type !== "childList" ||
      !(firstAddedNode instanceof HTMLElement) ||
      !firstAddedNode.className?.startsWith("StudyContainer")) &&
    (record.type !== "characterData" ||
      !record.target.parentElement?.classList?.contains("card-word"))
  )
    return;
  const cardWord =
    record.type === "childList" ?
      element(firstAddedNode).querySelector(".card-word")
    : record.target.parentElement;
  if (!cardWord) return;
  cardWord.nextSibling?.remove();
  const cardWordClone = element(cardWord.cloneNode(true));
  cardWordClone.classList.add("cotsu-tools-card-word-clone");
  const hiraganaElement = text(
    [...cardWordClone.childNodes].find(
      (_node, i) => cardWordClone.childNodes[i - 1]?.textContent === " → ",
    ),
  );
  const match = cardWord.textContent.match(/([^ ]+) → ([^ ]+)/);
  if (!match) throw new Error("No XYZ → ABC in card");
  const [, kanji, reading] = match;
  hiraganaElement.textContent = "";
  cardWordClone.append(definitionElement(kanji, reading));
  hiraganaElement.after(pitchAccentElement(kanji, reading));
  cardWord.insertAdjacentElement("afterend", cardWordClone);
};

const handleWrongAnswer = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    !(firstAddedNode instanceof HTMLElement) ||
    !firstAddedNode.className?.startsWith(
      "ReadingQuestionCard-module--wrong-answer--",
    )
  )
    return;
  const reading = firstAddedNode.textContent.replace("Die Antwort ist ", "");
  const kanji = element(
    document.querySelector(
      "[class^=ReadingQuestionCard-module--cardExampleSentence--] [class^=JapaneseText-module--red--]",
    ),
  ).textContent;
  firstAddedNode.innerHTML = "";
  firstAddedNode.append("Die Antwort ist ", pitchAccentElement(kanji, reading));
};

const handleSummary = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    !(firstAddedNode instanceof HTMLElement) ||
    !firstAddedNode.className.startsWith("SummaryCard-module--summary-card--")
  )
    return;
  if (readingExercise.questions.length === 0) return;
  const summaryCorrectText = element(
    document.querySelector("[class^=SummaryCard-module--summary-text--] p"),
  );
  const summaryCorrectTextMatch = summaryCorrectText.textContent.match(
    /^(\d+) von (\d+) richtig$/,
  );
  if (!summaryCorrectTextMatch) throw new Error("No X von Y richtig");
  const [, correctExercises, totalExercises] = summaryCorrectTextMatch;
  summaryCorrectText.textContent = `${Number(correctExercises) - 1} von ${Number(totalExercises) - 1} richtig`;
  const wordSummary = document.createElement("div");
  const incorrectKanjiHeading = document.createElement("h4");
  incorrectKanjiHeading.textContent = "Falsch waren:";
  const incorrectKanji = document.createElement("div");
  const correctKanjiHeading = document.createElement("h4");
  correctKanjiHeading.textContent = "Richtig waren:";
  const correctKanji = document.createElement("div");
  wordSummary.append(
    incorrectKanjiHeading,
    incorrectKanji,
    correctKanjiHeading,
    correctKanji,
  );
  wordSummary.classList.add("word-summary");
  const wrongKanji = new Set();
  const originalSummaryElement =
    firstAddedNode.querySelector("div:not([class])");
  originalSummaryElement?.childNodes?.forEach((word) => {
    const match = word.textContent?.match(/([^ ]+) → ([^ ]+)/);
    if (!match) throw new Error("No XYZ → ABC in summary element");
    const [, kanji, reading] = match;
    wrongKanji.add(`${kanji}/${reading}`);
  });
  readingExercise.questions.forEach(({ writing: kanji, reading, qid }) => {
    if (qid === DUMMY_QUESTION_ID) return;
    const isIncorrect = wrongKanji.has(`${kanji}/${reading}`);
    const row = document.createElement("div");
    const solution = document.createElement("span");
    solution.append(
      pitchAccentElement(kanji, reading),
      " ",
      readingExercise.questions.find(
        (question) =>
          question.writing === kanji && question.reading === reading,
      )?.german ?? meaningElement(kanji, reading),
    );
    let shownSolution;
    if (isIncorrect) {
      const spoilerElement = document.createElement("button");
      spoilerElement.classList.add("cotsu-tools-spoiler");
      spoilerElement.ariaLabel = "Lösung anzeigen";
      const accessibilityWrapper = document.createElement("span");
      accessibilityWrapper.ariaHidden = "true";
      accessibilityWrapper.append(solution);
      spoilerElement.append(accessibilityWrapper);
      spoilerElement.addEventListener("click", () => {
        spoilerElement.classList.add("cotsu-tools-spoiler-shown");
        spoilerElement.ariaLabel = null;
        accessibilityWrapper.ariaHidden = "false";
      });
      shownSolution = spoilerElement;
    } else {
      shownSolution = solution;
    }
    row.append(kanji, " → ", shownSolution);
    (isIncorrect ? incorrectKanji : correctKanji).append(row);
  });
  if (originalSummaryElement) {
    element(document.querySelector("h3")).textContent =
      "Hier nochmal alle Wörter";
    originalSummaryElement.replaceWith(wordSummary);
  } else {
    const actions = element(
      document.querySelector("[class^=SummaryCard-module--summary-actions--]"),
    );
    const h3 = document.createElement("h3");
    h3.textContent = "Hier nochmal alle Wörter";
    actions.append(h3);
    actions.append(wordSummary);
  }
};
