import { element, text } from "../lib/element";
import { DUMMY_QUESTION_ID, readingExercise } from "../lib/interceptedFetch";
import { CanvasReturn, requestCanvas } from "../lib/kanjiCanvas";
import {
  getWadokuInformation,
  pitchAccentElement,
  meaningElement,
  definitionElement,
} from "../lib/wadokuInformation";
import { writingOverride } from "../lib/writingOverride";

let previousReadingExercise: typeof readingExercise | null = null;

export const handleExerciseWords = async (records: MutationRecord[]) => {
  for (const record of records) {
    handleUpdatedWord(record);
    handleUpdatedCardWord(record);
    handleWrongAnswer(record);
    handleSummary(record);
  }
};

const currentQuestionId = () => {
  const studyProgressTextElement = element(
    document.querySelector("[class^=StudyProgress-module--study-progress--] p"),
  );
  return Number(studyProgressTextElement.childNodes.item(1)?.textContent) - 1;
};

// prettier-ignore
const KNOWN_INVALID_CHARACTERS = new Set(["０", "１", "２", "３", "４", "５", "６", "７", "８", "９", "〜"]);
const handleUpdatedWord = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    (record.type !== "characterData" ||
      record.target.parentElement?.tagName !== "P" ||
      !record.target.parentElement?.parentElement?.className.startsWith(
        "StudyProgress-module--study-progress--",
      )) &&
    (record.type !== "childList" ||
      !(firstAddedNode instanceof HTMLElement) ||
      !firstAddedNode.className.startsWith(
        "StudyProgress-module--study-progress--",
      ))
  )
    return;
  const id = currentQuestionId();
  if (previousReadingExercise !== readingExercise) {
    previousReadingExercise = readingExercise;
  }
  const currentQuestion = readingExercise.questions[id];
  element(
    document.querySelector(
      "[class^=StudyProgress-module--study-progress--] .MuiLinearProgress-bar",
    ),
  ).style.transform =
    `translateX(${-100 * (1 - (id + 1) / readingExercise.questionCount)}%)`;
  if (currentQuestion.qid === DUMMY_QUESTION_ID) {
    const questionContainer = element(
      document.querySelector(
        "[class^=QuestionContainer-module--question-container--]",
      ),
    );
    questionContainer.classList.add("cotsu-tools-dummy-question");
    questionContainer.classList.remove("cotsu-tools-writing-override");
    element(
      document.querySelector(
        "[class*=ReadingQuestionCard-module--action-check--]",
      ),
    ).textContent = "Zum Ende";
  } else if (writingOverride()) {
    const input = element(document.querySelector("input")) as HTMLInputElement;
    let checkButton = element(
      document.querySelector(
        "[class*=ReadingQuestionCard-module--action-check--]",
      ),
    );
    element(
      document.querySelector(
        "[class^=QuestionContainer-module--question-container--]",
      ),
    ).classList.add("cotsu-tools-writing-override");
    const exampleSentence = element(
      document.querySelector(
        "[class^=ReadingQuestionCard-module--cardExampleSentence--]",
      ),
    );
    const wordInformation = document.createElement("div");
    wordInformation.append(
      pitchAccentElement(currentQuestion.writing, currentQuestion.reading),
    );
    if (currentQuestion.german) {
      wordInformation.append(" → ", currentQuestion.german);
    }
    wordInformation.append(
      definitionElement(currentQuestion.writing, currentQuestion.reading, {
        collapsed: true,
      }),
    );
    exampleSentence.insertAdjacentElement("afterend", wordInformation);
    const characterWrapper = document.createElement("div");
    characterWrapper.classList.add(
      "cotsu-tools-writing-override-character-wrapper",
    );
    element(
      document.querySelector(
        "[class^=ReadingQuestionCard-module--input-field--]",
      ),
    ).insertAdjacentElement("afterend", characterWrapper);
    let currentCharacter = -1;
    let madeMistake = false;
    let hintButton: HTMLButtonElement | null = null;
    const addHintButton = () => {
      hintButton = checkButton.cloneNode(true) as HTMLButtonElement;
      hintButton.classList.add(
        "cotsu-tools-writing-override-hint-button",
        "cotsu-tools-writing-override-button",
      );
      hintButton.textContent = "Nächsten Stroke anzeigen";
      hintButton.addEventListener("click", () => {
        currentCanvas.hint();
      });
      checkButton.insertAdjacentElement("afterend", hintButton);
    };
    let currentCanvas: CanvasReturn;
    const canvasFinishListener = (madeMistakeForThisCharacter: boolean) => {
      madeMistake ||= madeMistakeForThisCharacter;
      if (currentCharacter === currentQuestion.writing.length - 1) {
        characterWrapper.remove();
        wordInformation.remove();
        hintButton?.remove();
        hintButton = null;
        if (madeMistake) {
          input.value = "";
          checkButton.click();
          input[
            Object.keys(input).find((key) =>
              key.startsWith("__reactEventHandlers$"),
            ) as keyof typeof input
            // @ts-expect-error
          ]?.onChange();
          input.value = currentQuestion.reading;
          checkButton = element(
            document.querySelector(
              "[class*=ReadingQuestionCard-module--action-check--]",
            ),
          );
          checkButton.click();
        } else {
          input.value = currentQuestion.reading;
          checkButton.click();
        }
        return;
      }
      currentCharacter++;
      if (
        KNOWN_INVALID_CHARACTERS.has(currentQuestion.writing[currentCharacter])
      ) {
        canvasFinishListener(false);
        return;
      }
      hintButton?.remove();
      hintButton = null;
      characterWrapper.innerHTML = "";
      [...currentQuestion.writing].forEach((character, i) => {
        if (i === currentCharacter) {
          currentCanvas = requestCanvas(
            currentQuestion.writing[currentCharacter],
            {
              onFinish: canvasFinishListener,
              onLoad: addHintButton,
            },
          );
          characterWrapper.append(currentCanvas.element);
        } else {
          const finishedCharacter = document.createElement("span");
          finishedCharacter.classList.add(
            "cotsu-tools-writing-override-finished-character",
          );
          finishedCharacter.append(
            i < currentCharacter || KNOWN_INVALID_CHARACTERS.has(character) ?
              character
            : "？",
          );
          characterWrapper.append(finishedCharacter);
        }
      });
    };
    canvasFinishListener(false);
  } else {
    void getWadokuInformation(currentQuestion.writing, currentQuestion.reading);
  }
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
  const exercise = readingExercise.questions[currentQuestionId() - 1];
  hiraganaElement.textContent = "";
  cardWordClone.append(definitionElement(exercise.writing, exercise.reading));
  hiraganaElement.after(pitchAccentElement(exercise.writing, exercise.reading));
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
  if (writingOverride()) return;
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
  element(
    document.querySelector(
      "[class^=QuestionContainer-module--question-container--]",
    ),
  ).classList.remove("cotsu-tools-dummy-question");
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
