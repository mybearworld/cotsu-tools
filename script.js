// ==UserScript==
// @name        Cotsu-Tools
// @namespace   mybearworld
// @match       *://cotsu.de/*
// @grant       GM.xmlHttpRequest
// @version     1.5.1
// @license     MIT
// @author      mybearworld
// @description Userscript für https://cotsu.de.
// @updateURL   https://openuserjs.org/meta/mybearworld/Cotsu-Tools.meta.js
// @downloadURL https://openuserjs.org/install/mybearworld/Cotsu-Tools.user.js
// ==/UserScript==

const LEVELS = /** @type {const} */ (["N5", "N4", "N3", "N2", "N1"]);
const LOWERCASE_LEVELS = /** @type {const} */ ({
  N5: "n5",
  N4: "n4",
  N3: "n3",
  N2: "n2",
  N1: "n1",
});
// prettier-ignore
const KATAKANA_TO_HIRAGANA = {"ァ":"ぁ","ア":"あ","ィ":"ぃ","イ":"い","ゥ":"ぅ","ウ":"う","ェ":"ぇ","エ":"え","ォ":"ぉ","オ":"お","カ":"か","ガ":"が","キ":"き","ギ":"ぎ","ク":"く","グ":"ぐ","ケ":"け","ゲ":"げ","コ":"こ","ゴ":"ご","サ":"さ","ザ":"ざ","シ":"し","ジ":"じ","ス":"す","ズ":"ず","セ":"せ","ゼ":"ぜ","ソ":"そ","ゾ":"ぞ","タ":"た","ダ":"だ","チ":"ち","ヂ":"ぢ","ッ":"っ","ツ":"つ","ヅ":"づ","テ":"て","デ":"で","ト":"と","ド":"ど","ナ":"な","ニ":"に","ヌ":"ぬ","ネ":"ね","ノ":"の","ハ":"は","バ":"ば","パ":"ぱ","ヒ":"ひ","ビ":"び","ピ":"ぴ","フ":"ふ","ブ":"ぶ","プ":"ぷ","ヘ":"へ","ベ":"べ","ペ":"ぺ","ホ":"ほ","ボ":"ぼ","ポ":"ぽ","マ":"ま","ミ":"み","ム":"む","メ":"め","モ":"も","ャ":"ゃ","ヤ":"や","ュ":"ゅ","ユ":"ゆ","ョ":"ょ","ヨ":"よ","ラ":"ら","リ":"り","ル":"る","レ":"れ","ロ":"ろ","ヮ":"ゎ","ワ":"わ","ヰ":"ゐ","ヱ":"ゑ","ヲ":"を","ン":"ん","ヴ":"ゔ","ヵ":"ゕ","ヶ":"ゖ"};

/** @type {(a: any) => HTMLElement} */
const element = (a) => {
  if (!(a instanceof HTMLElement)) throw new Error("Not an element");
  return a;
};
/** @type {(a: any) => Text} */
const text = (a) => {
  if (!(a instanceof Text)) throw new Error("Not an element");
  return a;
};
/** @param {MutationRecord[]} records */
const isSceneChange = (records) =>
  records.some(
    (record) =>
      (record.target instanceof HTMLElement &&
        record.target.id === "gatsby-focus-wrapper") ||
      (record.addedNodes.length > 0 &&
        record.addedNodes[0] instanceof HTMLElement &&
        record.addedNodes[0].id === "gatsby-focus-wrapper"),
  );

/**
 * @param {number} a
 * @param {number} b
 */
const percent = (a, b) => `${Math.floor((a / b) * 100)}%`;
/**
 * @param {string} url
 * @returns {Promise<string>}
 */
const gmfetch = (url) => {
  return new Promise((resolve, reject) => {
    // @ts-expect-error - Global provided by userscript managers
    GM.xmlHttpRequest({
      url,
      /** @param {{ response: string }} response */
      onload: (response) => {
        console.log(response.response.length);
        resolve(response.response);
      },
      onerror: () => reject(),
    });
  });
};

/** @type {{progress: Record<(typeof LOWERCASE_LEVELS)[keyof typeof LOWERCASE_LEVELS], { learning: number, mature: number, total: number }>, readyForEarlyReview: string}} */
let stats;
/** @type {{ questions: { writing: string, reading: string, german: string }[] }} */
let readingExercise;
/** @type {typeof fetch} */
const _fetch = unsafeWindow.fetch;
/** @type {typeof fetch} */
unsafeWindow.fetch = async (url, options) => {
  const response = await _fetch(url, options);
  const body = await response.text();
  if (typeof url === "string") {
    if (url === "https://api.cotsu.de/user.php?r=stats") {
      stats = JSON.parse(body);
    } else if (
      url.startsWith("https://api.cotsu.de/user.php?r=review-reading") ||
      url.startsWith("https://api.cotsu.de/user.php?r=learn-reading")
    ) {
      readingExercise = JSON.parse(body);
    }
  }
  return new Response(body, response);
};

const parser = new DOMParser();
/** @type {Map<string, WadokuInformation | Promise<WadokuInformation>>} */
const wadokuInformationCache = new Map();
/**
 * @typedef {{ pitchAccent: string | null, meaning: string } | null} WadokuInformation
 */
/**
 * @param {string} kanji
 * @param {string} reading
 * @returns {Promise<WadokuInformation>}
 */
const getWadokuInformation = async (kanji, reading) => {
  kanji = kanji.replace(/～/g, "");
  reading = reading.replace(/～/g, "");
  if (reading.includes("・")) {
    const results = await Promise.all(
      reading
        .split("・")
        .map((individualReading) =>
          getWadokuInformation(kanji, individualReading),
        ),
    );
    const nonNullResult = results.find((result) => result !== null);
    if (nonNullResult === undefined) return null;
    return {
      pitchAccent: results
        .filter((information) => information !== null)
        .map((information) => information.pitchAccent)
        .join("・"),
      meaning: nonNullResult.meaning,
    };
  }
  const cacheKey = `${kanji}/${reading}`;
  const cachedInformation = wadokuInformationCache.get(cacheKey);
  if (cachedInformation) {
    if (cachedInformation instanceof Promise) {
      return await cachedInformation;
    }
    return cachedInformation;
  }
  /** @type {(information: WadokuInformation) => void} */
  let done;
  wadokuInformationCache.set(
    cacheKey,
    new Promise((resolve) => {
      done = resolve;
    }),
  );
  /** @param {WadokuInformation} information */
  const doReturn = (information) => {
    wadokuInformationCache.set(cacheKey, information);
    done(information);
    return information;
  };
  /** @type {WadokuInformation | null} */
  let accentlessResult = null;
  try {
    const searchResponse = await gmfetch(`https://wadoku.de/search/${kanji}`);
    const searchResponseDocument = parser.parseFromString(
      searchResponse,
      "text/html",
    );
    for (const resultLine of searchResponseDocument.querySelectorAll(
      ".resultline",
    )) {
      const readingRow =
        resultLine.querySelector(".accent") ??
        resultLine.querySelector(".reading");
      if (
        !readingRow ||
        readingRow.textContent.trim().replace(/\uffe8|･|~|…/g, "") !== reading
      ) {
        continue;
      }
      /** @type {WadokuInformation} */
      const information = {
        meaning: "",
        pitchAccent: readingRow.classList.contains("accent")
          ? readingRow.innerHTML
          : null,
      };
      let sense = element(resultLine.querySelector(".sense:not(.master)"));
      sense = sense.querySelector(".prior1") ?? sense;
      for (const childNode of sense.childNodes) {
        if (childNode instanceof HTMLElement) {
          if (childNode.classList.contains("rel")) {
            break;
          } else if (childNode.classList.contains("token")) {
            information.meaning += childNode.firstChild?.textContent;
          }
        } else if (childNode.nodeType === Node.TEXT_NODE) {
          information.meaning += childNode.textContent;
        }
      }
      information.meaning = information.meaning.trim().replace(/\.$/, "");
      if (information.pitchAccent === null) {
        accentlessResult = information;
      } else {
        return doReturn(information);
      }
    }
  } catch (e) {
    console.error(e);
    return doReturn(null);
  }
  return doReturn(accentlessResult);
};
/**
 *
 * @param {string} kanji
 * @param {string} reading
 */
const pitchAccentElement = (kanji, reading) => {
  const pitchAccentElement = document.createElement("span");
  pitchAccentElement.classList.add("pitch-accent", "loading");
  pitchAccentElement.textContent = reading;
  getWadokuInformation(kanji, reading).then((information) => {
    pitchAccentElement.classList.remove("loading");
    if (information?.pitchAccent) {
      pitchAccentElement.innerHTML = information.pitchAccent;
    } else {
      pitchAccentElement.append(" (kein Pitch-Accent verfügbar)");
    }
  });
  return pitchAccentElement;
};
/**
 * @param {string} kanji
 * @param {string} reading
 */
const meaningElement = (kanji, reading) => {
  const meaningElement = document.createElement("span");
  meaningElement.classList.add("meaning");
  meaningElement.textContent = "lädt...";
  getWadokuInformation(kanji, reading).then((information) => {
    if (information?.meaning) {
      meaningElement.innerHTML = `${information.meaning} (Wadoku)`;
    } else {
      meaningElement.textContent = "(keine Bedeutung verfügbar)";
    }
  });
  return meaningElement;
};

/** @type {{ name: string; id: string, effect: (newSetting: boolean) => void; }[]} */
const SETTINGS = [
  {
    name: "Katakana statt Hiragana bei Übungen nutzen",
    id: "katakana-mode",
    effect: (newSetting) => {
      document.body.classList.toggle("katakana-mode", newSetting);
    },
  },
];
const STORAGE_KEY = "cotsu-tools";
const createSettingsDialog = () => {
  const loadedSettingsString = localStorage.getItem(STORAGE_KEY);
  let settings;
  if (loadedSettingsString) {
    settings = JSON.parse(loadedSettingsString);
  } else {
    settings = Object.fromEntries(SETTINGS.map(({ id }) => [id, false]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
  const dialog = document.createElement("dialog");
  dialog.classList.add("cotsu-tools-settings");
  const settingsHeader = document.createElement("header");
  const leftHeader = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = "Cotsu-Tools";
  leftHeader.append(h2);
  const version = document.createElement("span");
  // @ts-expect-error - Global provided by userscript managers
  version.textContent = `v${GM.info.script.version}`;
  leftHeader.append(version);
  settingsHeader.append(leftHeader);
  const rightHeader = document.createElement("div");
  const link = document.createElement("a");
  link.classList.add("cotsu-tools-settings-link");
  link.textContent = "↗";
  link.href = "https://openuserjs.org/scripts/mybearworld/Cotsu-Tools";
  link.target = "_blank";
  rightHeader.append(link);
  settingsHeader.append(rightHeader);
  dialog.append(settingsHeader);
  SETTINGS.forEach((setting) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settings[setting.id];
    setting.effect(settings[setting.id]);
    checkbox.addEventListener("input", () => {
      setting.effect(checkbox.checked);
      settings[setting.id] = checkbox.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    });
    label.append(checkbox);
    const name = document.createElement("span");
    name.textContent = setting.name;
    label.append(name);
    dialog.append(label);
  });
  const closeButton = document.createElement("button");
  closeButton.textContent = "Schließen";
  closeButton.addEventListener("click", () => {
    dialog.close();
  });
  dialog.append(closeButton);
  document.body.append(dialog);
  return dialog;
};
/** @param {MutationRecord[]} records */
const handleSettings = async (records) => {
  if (!isSceneChange(records) || document.querySelector("cotsu-tools-button"))
    return;
  const header = document.querySelector(
    "[class^=MainLayout-module--header--] .MuiGrid-root",
  );
  if (!header) return;
  let dialog =
    document.querySelector(".cotsu-tools-settings") || createSettingsDialog();
  if (!(dialog instanceof HTMLDialogElement))
    throw new Error("Settings aren't a dialog");
  const settingsButton = document.createElement("button");
  settingsButton.classList.add("cotsu-tools-button");
  settingsButton.textContent = "Cotsu-Tools";
  settingsButton.addEventListener("click", () => {
    dialog.showModal();
  });
  element(header.lastChild).insertAdjacentElement("afterbegin", settingsButton);
};

/** @param {MutationRecord[]} records */
const handleExerciseWords = async (records) => {
  for (const record of records) {
    const firstAddedNode = record.addedNodes[0];
    if (
      (record.type === "childList" &&
        firstAddedNode instanceof HTMLElement &&
        firstAddedNode.className?.startsWith("StudyContainer")) ||
      (record.type === "characterData" &&
        record.target.parentElement?.classList?.contains("card-word"))
    ) {
      const cardWord =
        record.type === "childList"
          ? element(firstAddedNode).querySelector(".card-word")
          : record.target.parentElement;
      if (!cardWord) continue;
      cardWord.nextSibling?.remove();
      const cardWordClone = element(cardWord.cloneNode(true));
      cardWordClone.classList.add("card-word-clone");
      const hiraganaElement = text(
        [...cardWordClone.childNodes].find(
          (_node, i) => cardWordClone.childNodes[i - 1]?.textContent === " → ",
        ),
      );
      const match = cardWord.textContent.match(/([^ ]+) → ([^ ]+)/);
      if (!match) throw new Error("No XYZ → ABC in card");
      const [, kanji, reading] = match;
      hiraganaElement.textContent = "";
      const cardGerman = element(cardWordClone.querySelector(".card-german"));
      if (cardGerman.textContent === "") {
        cardGerman.append(meaningElement(kanji, reading));
      }
      hiraganaElement.after(pitchAccentElement(kanji, reading));
      cardWord.insertAdjacentElement("afterend", cardWordClone);
      break;
    } else if (
      firstAddedNode instanceof HTMLElement &&
      firstAddedNode.className?.startsWith(
        "ReadingQuestionCard-module--wrong-answer--",
      )
    ) {
      const reading = firstAddedNode.textContent.replace(
        "Die Antwort ist ",
        "",
      );
      const kanji = element(
        document.querySelector(
          "[class^=ReadingQuestionCard-module--cardExampleSentence--] [class^=JapaneseText-module--red--]",
        ),
      ).textContent;
      firstAddedNode.innerHTML = "";
      firstAddedNode.append(
        "Die Antwort ist ",
        pitchAccentElement(kanji, reading),
      );
    } else if (
      firstAddedNode instanceof HTMLElement &&
      firstAddedNode.className.startsWith("SummaryCard-module--summary-card--")
    ) {
      if (readingExercise.questions.length === 0) return;
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
      readingExercise.questions.forEach(({ writing: kanji, reading }) => {
        const row = document.createElement("div");
        row.append(
          kanji,
          " → ",
          pitchAccentElement(kanji, reading),
          " ",
          readingExercise.questions.find(
            (question) =>
              question.writing === kanji && question.reading === reading,
          )?.german ?? meaningElement(kanji, reading),
        );
        (wrongKanji.has(`${kanji}/${reading}`)
          ? incorrectKanji
          : correctKanji
        ).append(row);
      });
      if (originalSummaryElement) {
        element(document.querySelector("h3")).textContent =
          "Hier nochmal alle Wörter";
        originalSummaryElement.replaceWith(wordSummary);
      } else {
        const actions = element(
          document.querySelector(
            "[class^=SummaryCard-module--summary-actions--]",
          ),
        );
        const h3 = document.createElement("h3");
        h3.textContent = "Hier nochmal alle Wörter";
        actions.append(h3);
        actions.append(wordSummary);
      }
      break;
    }
  }
};

/** @param {MutationRecord[]} records */
const showMoreStats = async (records) => {
  if (
    !records.some(
      (record) =>
        record.target instanceof HTMLElement &&
        record.target.className?.includes("MaturityTallies"),
    )
  )
    return;
  const practiceCard = document.querySelector(
    "div[class*=index-module--kanji-read-actions--] .MuiGrid-item:first-of-type  [class*=index-module--action-card-normal--]",
  );
  if (practiceCard && stats.readyForEarlyReview !== "0") {
    text(
      practiceCard.querySelector("[class^=index-module--action-card-text--]")
        ?.lastChild,
    ).textContent =
      `Du kannst aber trotzdem noch ${Math.ceil(Number(stats.readyForEarlyReview) / 20)} mal üben.`;
  }
  LEVELS.forEach((level) => {
    const levelStats = stats.progress[LOWERCASE_LEVELS[level]];
    const progressBarElement = element(
      document.querySelector(`.MuiLinearProgress-root[label=${level}]`)
        ?.parentElement,
    );
    const levelNameElement = element(
      progressBarElement.previousSibling?.firstChild,
    );
    const progressElement = element(progressBarElement.nextSibling?.firstChild);
    levelNameElement.textContent += ` (${levelStats.total})`;
    progressElement.textContent = `${percent(
      levelStats.learning,
      levelStats.total,
    )} (${levelStats.learning})`;
    if (levelStats.mature !== 0) {
      const progressContainer = element(progressElement.parentElement);
      const matureProgressContainer = element(
        progressContainer.cloneNode(true),
      );
      const matureProgress = element(matureProgressContainer.firstChild);
      matureProgress.classList.add("detail-green");
      matureProgress.textContent = `${percent(
        levelStats.mature,
        levelStats.total,
      )} (${levelStats.mature})`;
      element(progressContainer.parentElement).append(matureProgressContainer);
    }
  });
};

/** @param {MutationRecord[]} records */
const showExercisesLeftInKanjiLearningTab = async (records) => {
  if (!stats || !isSceneChange(records)) return;
  document.querySelectorAll(".MuiSlider-markLabel").forEach((label) => {
    const level = /** @type {typeof LEVELS[number]} */ (
      label.textContent.split(" ")[0]
    );
    if (!LEVELS.includes(level)) return;
    const levelStats = stats.progress[LOWERCASE_LEVELS[level]];
    const br = document.createElement("br");
    if (levelStats.total !== levelStats.learning) {
      label.append(
        br,
        `noch ${Math.ceil((levelStats.total - levelStats.learning) / 20)}`,
      );
    }
  });
};

/** @param {MutationRecord[]} records */
const fixFontInNewKanjiTab = async (records) => {
  if (!isSceneChange(records)) return;
  const search = document.querySelector("[class^=suche-module--search-field--");
  if (!search) return;
  search.setAttribute("lang", "ja");
};

/** @param {MutationRecord[]} records */
const addWadokuInformationInKanjiTab = async (records) => {
  const firstAddedNode = records[0].addedNodes[0];
  if (
    firstAddedNode instanceof HTMLElement &&
    firstAddedNode.classList.contains("MuiTouchRipple-ripple")
  ) {
    const itemContainer = firstAddedNode.closest(
      "[class^=suche-module--container--] .MuiListItem-root",
    );
    if (!itemContainer) return;
    const text = element(
      itemContainer.querySelector(".MuiListItemText-root .MuiTypography-root"),
    );
    if (text.dataset.wadokuified) return;
    const match = text.textContent.match(/^(.+?)（(.+?)） (.+)?$/);
    if (!match) throw new Error("Unexpected text format");
    const [, kanji, kana, german] = match;
    const reading = [...kana]
      .map((kana) =>
        kana in KATAKANA_TO_HIRAGANA
          ? KATAKANA_TO_HIRAGANA[
              /** @type {keyof typeof KATAKANA_TO_HIRAGANA} */ (kana)
            ]
          : kana,
      )
      .join("");
    text.innerHTML = "";
    text.append(
      kanji,
      "（",
      pitchAccentElement(kanji, reading),
      "） ",
      german || meaningElement(kanji, reading),
    );
    text.dataset.wadokuified = "true";
  } else if (isSceneChange(records)) {
    const lastParagraph = document.querySelector(
      "[class^=suche-module--container--] p:last-of-type",
    );
    if (!lastParagraph) return;
    const info = document.createElement("p");
    info.textContent =
      "Hinweis: Um Wadoku nicht mit Anforderungen für alle Wörter auf einmal zu überfluten, musst du zuerst auf ein Suchergebnis klicken, bevor du dessen Pitch-Accent und Übersetzung erhältst.";
    lastParagraph.insertAdjacentElement("afterend", info);
  }
};

new MutationObserver(async (records) => {
  handleSettings(records);
  handleExerciseWords(records);
  showMoreStats(records);
  showExercisesLeftInKanjiLearningTab(records);
  fixFontInNewKanjiTab(records);
  addWadokuInformationInKanjiTab(records);
}).observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

const style = document.createElement("style");
const css = String.raw; // for prettier
style.innerHTML = css`
  /* General */
  input {
    font-weight: 400 !important;
  }

  /* Settings */
  [class^="MainLayout-module--header--"] .MuiGrid-container .MuiGrid-item {
    flex-basis: initial;
    max-width: initial;
  }
  [class^="MainLayout-module--header--"]
    .MuiGrid-container
    .MuiGrid-item:last-child {
    flex-grow: 1;
  }
  .cotsu-tools-button {
    font: inherit;
    border: none;
    background: none;
    color: #fff;
    padding: 0;
    margin-right: 20px;
  }
  .cotsu-tools-button:hover {
    cursor: pointer;
    color: #ffdc79;
  }
  body:has(.cotsu-tools-settings:open) {
    overflow: hidden;
  }
  .cotsu-tools-settings:open {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid #f6f6f6;
    border-radius: 20px;
    width: min(calc(100% - 2rem), 30rem);
    max-width: none;
    max-height: none;
    box-sizing: border-box;
  }
  .cotsu-tools-settings header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cotsu-tools-settings header > div {
    display: flex;
    align-items: end;
    gap: 0.5rem;
  }
  .cotsu-tools-settings h2 {
    margin: 0;
    font-family: inherit;
  }
  .cotsu-tools-settings header span {
    font-size: 1rem;
    font-weight: 700;
  }
  .cotsu-tools-settings-link {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .cotsu-tools-settings label {
    display: flex;
    gap: 0.2rem;
  }
  .cotsu-tools-settings button {
    align-self: end;
  }

  /* Pitch accent */
  .pitch-accent {
    display: inline-table;
    border-collapse: collapse;
  }
  .pitch-accent,
  .pitch-accent span {
    font-weight: 400;
  }
  .pitch-accent span {
    border: 0px solid currentcolor;
    --border-width: 1px;
    display: table-cell;
    padding: 0 3px;
  }
  .pitch-accent.loading {
    letter-spacing: 3px;
    opacity: 0.5;
    margin-top: var(--border-width);
  }
  .card-header .pitch-accent,
  .card-header .pitch-accent span {
    --border-width: 2px;
    font-weight: 700;
  }
  .pitch-accent span:empty {
    display: none;
  }
  .pitch-accent .divider {
    display: none;
  }
  .pitch-accent .b {
    border-bottom-width: var(--border-width);
  }
  .pitch-accent .t {
    border-top-width: var(--border-width);
  }
  .pitch-accent .l {
    border-left-width: var(--border-width);
  }
  .pitch-accent .r {
    border-right-width: var(--border-width);
  }
  div.card-word {
    height: auto;
    min-height: 29px;
    display: none;
  }
  div.card-word.card-word-clone {
    display: block;
  }

  /* Meaning */
  .meaning {
    font-family: inherit;
  }

  /* Word summary */
  .word-summary div,
  .word-summary span {
    font-weight: 400;
  }
  .word-summary div {
    margin-bottom: 4px;
  }

  /* Stats */
  div[class^="index-module--action-card-text--"] {
    height: auto;
    min-height: 74px;
  }
  [class^="MaturityTallies-module--maturity-tallies--"] + h4 + p + div {
    display: table;
    border-spacing: 10px 0;
  }
  [class^="MaturityTallies-module--maturity-tallies--"] + h4 + p + div > div {
    display: table-row;
  }
  [class^="MaturityTallies-module--maturity-tallies--"]
    + h4
    + p
    + div
    > div
    > div {
    display: table-cell;
    min-width: 0px !important;
    white-space: nowrap;
  }
  .detail-green {
    color: #40d5ac;
    font-weight: bold;
  }

  /* Katakana mode */
  @font-face {
    font-family: "Noto Sans JP All Katakana";
    src: url("https://mybearworld.github.io/noto-sans-jp-all-katakana/NotoSansJPAllKatakana.ttf");
  }
  .katakana-mode [class^="ReadingQuestionCard-module--input-field--"],
  .katakana-mode .pitch-accent,
  .katakana-mode .pitch-accent span,
  .katakana-mode .commonReading,
  .katakana-mode .commonReading b {
    font-family:
      "Noto Sans JP All Katakana",
      Noto Sans Japanese,
      sans-serif;
  }
`;
document.head.append(style);
