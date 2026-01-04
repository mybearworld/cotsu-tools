import { element, text } from "../lib/element";
import {
  DUMMY_QUESTION_ID,
  readingExercise,
  didntKnowQids,
} from "../lib/interceptedFetch";
import { kanjiSearch, KanjiSearchWord } from "../lib/kanjiSearch";
import { katakanaToHiragana } from "../lib/katakanaToHiragana";
import {
  getWadokuInformation,
  pitchAccentElement,
  meaningElement,
  definitionElement,
} from "../lib/wadokuInformation";

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
    element(
      document.querySelector(
        "[class*=ReadingQuestionCard-module--action-check--]",
      ),
    ).textContent = "Zum Ende";
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
  cardWord.parentElement?.classList.remove(
    "cotsu-tools-didnt-know-word-strike",
  );
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
  const wasAnsweredCorrectly = !cardWordClone.querySelector(
    "[class*=MaturityTallies-module--tally-icon_0--]",
  );
  if (wasAnsweredCorrectly) {
    const didntKnowWord = document.createElement("label");
    didntKnowWord.classList.add("cotsu-tools-didnt-know-word");
    didntKnowWord.append("Doch nicht gewusst?");
    const didntKnowWordCheckBox = document.createElement("input");
    didntKnowWordCheckBox.type = "checkbox";
    didntKnowWordCheckBox.addEventListener("input", () => {
      const qid = readingExercise.questions[currentQuestionId()].qid;
      if (didntKnowWordCheckBox.checked) {
        didntKnowQids.add(qid);
      } else {
        didntKnowQids.delete(qid);
      }
      cardWordClone.parentElement?.classList.toggle(
        "cotsu-tools-didnt-know-word-strike",
        didntKnowWordCheckBox.checked,
      );
    });
    didntKnowWord.append(didntKnowWordCheckBox);
    cardWordClone.insertAdjacentElement("afterbegin", didntKnowWord);
  }
  cardWord.insertAdjacentElement("afterend", cardWordClone);
  const studyCardContainer =
    cardWord.parentElement?.parentElement?.parentElement;
  if (!studyCardContainer) return;
  studyCardContainer
    .querySelectorAll("[class^=KanjiCard-module--row--]")
    .forEach((row) => {
      const previousOtherKanjiElement = row.querySelector(
        ".cotsu-tools-other-kanji",
      );
      if (previousOtherKanjiElement) {
        previousOtherKanjiElement.remove();
      }
      const kanji = element(
        row.querySelector("[class^=KanjiCard-module--kanjiBig--]"),
      ).textContent;
      const otherKanjiElement = document.createElement("div");
      otherKanjiElement.className = element(row.lastChild).className;
      otherKanjiElement.classList.add("cotsu-tools-other-kanji");
      const button = document.createElement("button");
      button.classList.add("cotsu-tools-other-kanji-init-button");
      button.textContent = `andere Wörter mit ${kanji}`;
      button.addEventListener("click", async () => {
        button.textContent = "lädt...";
        const result = await kanjiSearch(kanji);
        const relevantBulk: string[] = [];
        const relevantWords: KanjiSearchWord[] = [];
        result.forEach((word) => {
          if (!word.maturity) return;
          if (word.word === exercise.writing) return;
          relevantBulk.push(word.word);
          relevantWords.push(word);
        });
        button.remove();
        otherKanjiElement.classList.add("cotsu-tools-other-kanji-loaded");
        const heading = document.createElement("div");
        otherKanjiElement.append(heading);
        if (relevantWords.length === 0) {
          heading.textContent =
            "Du kennst das Kanji noch in keinen anderen Wörtern.";
          return;
        }
        heading.textContent = "Du kennst das Kanji noch in diesen Wörtern:";
        const ul = document.createElement("ul");
        otherKanjiElement.append(ul);
        relevantWords.forEach((word) => {
          const li = document.createElement("li");
          const reading = katakanaToHiragana(word.reading);
          const kanji = document.createElement("span");
          kanji.classList.add("cotsu-tools-other-kanji-kanji");
          kanji.append(word.word);
          li.append(kanji);
          const moreButton = document.createElement("button");
          moreButton.classList.add("cotsu-tools-other-kanji-more");
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
          li.append(" ", moreButton);
          ul.append(li);
        });
      });
      otherKanjiElement.append(button);
      row.append(otherKanjiElement);
    });
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
  const currentQuestion = readingExercise.questions[currentQuestionId()];
  firstAddedNode.innerHTML = "";
  firstAddedNode.append(
    "Die Antwort ist ",
    pitchAccentElement(currentQuestion.writing, currentQuestion.reading),
  );
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
    const isIncorrect =
      wrongKanji.has(`${kanji}/${reading}`) || didntKnowQids.has(qid);
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
    const spoilerWrap = (toWrap: Node | string) => {
      const spoilerElement = document.createElement("button");
      spoilerElement.classList.add("cotsu-tools-spoiler");
      spoilerElement.ariaLabel = "Lösung anzeigen";
      const accessibilityWrapper = document.createElement("span");
      accessibilityWrapper.ariaHidden = "true";
      accessibilityWrapper.append(toWrap);
      spoilerElement.append(accessibilityWrapper);
      spoilerElement.addEventListener("click", () => {
        spoilerElement.classList.add("cotsu-tools-spoiler-shown");
        spoilerElement.ariaLabel = null;
        accessibilityWrapper.ariaHidden = "false";
      });
      return spoilerElement;
    };
    row.append(kanji, " → ", isIncorrect ? spoilerWrap(solution) : solution);
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
  const summaryText = element(
    document.querySelector("[class^=SummaryCard-module--summary-text--] p"),
  );
  const summaryTextMatch = summaryText.textContent.match(/^(\d+)(.*)$/);
  if (!summaryTextMatch) throw new Error("No summaryTextMatch");
  summaryText.textContent =
    (Number(summaryTextMatch[1]) - didntKnowQids.size).toString() +
    summaryTextMatch[2];
};
