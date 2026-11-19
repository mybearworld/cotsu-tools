import { element, text } from "../lib/element";
import { readingExercise, didntKnowQids } from "../lib/interceptedFetch";
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
  handleUpdatedWord(records);
  handleUpdatedCardWord(records);
  handleWrongAnswer(records);
  for (const record of records) {
    handleSummary(record);
  }
};

const currentQuestionId = () => {
  const studyProgressTextElement = element(
    document.querySelector("[class^=_study-progress_] p"),
  );
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
  if (previousReadingExercise !== readingExercise) {
    previousReadingExercise = readingExercise;
  }
  const currentQuestion = readingExercise.questions[id];
  void getWadokuInformation(currentQuestion.writing, currentQuestion.reading);
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
  const cardReadingElement = element(document.querySelector(".card-reading"));
  const previousSolutionElement = element(
    document.querySelector(".previous-solution"),
  );
  const cardWriting = element(document.querySelector(".previous-answer-word"))
    .childNodes[0].textContent;
  if (!cardWriting) return;
  cardReadingElement.replaceChildren(
    pitchAccentElement(cardWriting, cardReadingElement.textContent),
  );
  const newCardGerman = document.createElement("div");
  newCardGerman.classList.add("card-german");
  newCardGerman.append(
    definitionElement(cardWriting, cardReadingElement.textContent),
  );
  previousSolutionElement.append(newCardGerman);
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
  readingElement.replaceWith(
    pitchAccentElement(
      readingExercise.questions[id].writing,
      readingElement.textContent,
    ),
  );
};

const handleSummary = (record: MutationRecord) => {
  const firstAddedNode = record.addedNodes[0];
  if (
    !(firstAddedNode instanceof HTMLElement) ||
    !firstAddedNode.className.startsWith("SummaryCard-module--summary-card--")
  )
    return;
  if (readingExercise && readingExercise.questions.length === 0) return;
  const summaryCorrectText = element(
    document.querySelector("[class^=SummaryCard-module--summary-text--] p"),
  );
  if (summaryCorrectText.textContent === "") return; // Writing question
  element(
    document.querySelector(
      "[class^=QuestionContainer-module--question-container--]",
    ),
  ).classList.remove("cotsu-tools-dummy-question");
  if (
    summaryCorrectText.textContent ===
    "In dieser Stufe gibt es nichts mehr zu Lernen."
  ) {
    return;
  }
  console.log(summaryCorrectText.textContent);
  const summaryCorrectTextMatch = summaryCorrectText.textContent.match(
    /^(\d+) von (\d+) richtig$/,
  );
  if (!summaryCorrectTextMatch) throw new Error("No X von Y richtig");
  const [, correctExercises, totalExercises] = summaryCorrectTextMatch;
  summaryCorrectText.textContent = `${Number(correctExercises) - 1} von ${Number(totalExercises) - 1} richtig`;
  const wordSummary = document.createElement("div");
  const incorrectKanjiHeading = document.createElement("h4");
  incorrectKanjiHeading.textContent = "Falsch waren:";
  const incorrectKanjiUnshuffled = document.createElement("div");
  incorrectKanjiUnshuffled.classList.add("cotsu-tools-summary-unshuffled");
  const incorrectKanjiShuffled = document.createElement("div");
  incorrectKanjiShuffled.classList.add("cotsu-tools-summary-shuffled");
  const correctKanjiHeading = document.createElement("h4");
  correctKanjiHeading.textContent = "Richtig waren:";
  const correctKanjiUnshuffled = document.createElement("div");
  correctKanjiUnshuffled.classList.add("cotsu-tools-summary-unshuffled");
  const correctKanjiShuffled = document.createElement("div");
  correctKanjiShuffled.classList.add("cotsu-tools-summary-shuffled");
  wordSummary.append(
    incorrectKanjiHeading,
    incorrectKanjiUnshuffled,
    incorrectKanjiShuffled,
    correctKanjiHeading,
    correctKanjiUnshuffled,
    correctKanjiShuffled,
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
    // if (qid === DUMMY_QUESTION_ID) return;
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
        spoilerElement.role = "none";
        spoilerElement.disabled = true;
        accessibilityWrapper.ariaHidden = "false";
      });
      return spoilerElement;
    };
    const isIncorrect =
      wrongKanji.has(`${kanji}/${reading}`) || didntKnowQids.has(qid);
    const makeRow = () => {
      const row = document.createElement("div");
      const word = document.createElement("span");
      word.lang = "ja";
      word.textContent = kanji;
      const solution = document.createElement("span");
      solution.append(
        pitchAccentElement(kanji, reading),
        " ",
        readingExercise.questions.find(
          (question) =>
            question.writing === kanji && question.reading === reading,
        )?.german ?? meaningElement(kanji, reading),
      );
      row.append(word, " → ", isIncorrect ? spoilerWrap(solution) : solution);
      return row;
    };
    if (isIncorrect) {
      incorrectKanjiUnshuffled.append(makeRow());
      incorrectKanjiShuffled.append(makeRow());
    } else {
      correctKanjiUnshuffled.append(makeRow());
      correctKanjiShuffled.append(makeRow());
    }
  });
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
  shuffle(correctKanjiShuffled);
  shuffle(incorrectKanjiShuffled);
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
