import { element } from "../lib/element";
import { isSceneChange } from "../lib/isSceneChange";
import { KATAKANA_TO_HIRAGANA } from "../lib/katakanaToHiragana";
import { pitchAccentElement, meaningElement } from "../lib/wadokuInformation";

export const addWadokuInformationInKanjiTab = async (
  records: MutationRecord[],
) => {
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
          ? KATAKANA_TO_HIRAGANA[kana as keyof typeof KATAKANA_TO_HIRAGANA]
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
