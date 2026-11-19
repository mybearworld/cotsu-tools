import { element } from "../lib/element";
import { isSceneChange } from "../lib/isSceneChange";
import { katakanaToHiragana } from "../lib/katakanaToHiragana";
import { pitchAccentElement, meaningElement } from "../lib/wadokuInformation";

export const handleKanjiTab = async (records: MutationRecord[]) => {
  if (isSceneChange(records)) {
    const details = document.querySelector("[class^=_help_]");
    const xIcon = document.querySelector("[class*=_tally_icon_0_]");
    if (details && xIcon) {
      const info = document.createElement("p");
      info.append(
        "Cotsu-Tools: Wenn du ein Wort hinzufügst, das du bereits lernst, kommt das Wort ebenfalls zurück in die Stufe ",
        xIcon.cloneNode(),
        ".",
      );
      details.append(info);
    }
  }
  const items = [];
  for (const record of records) {
    const firstAddedNode = record.addedNodes[0];
    if (
      record.target instanceof HTMLElement &&
      record.target.matches(
        "[class^=_search-form_] + .MuiList-root > .MuiListItem-root",
      )
    ) {
      const text = element(
        record.target.querySelector(
          ".MuiListItemText-root .MuiTypography-root",
        ),
      );
      if (text.dataset.cotsuToolsAddedWadokuInformation === "true") {
        continue;
      }
      const match = text.textContent.match(/^(.+?)（(.+?)） (.+)?$/);
      if (!match) throw new Error("Unexpected text format");
      const [, kanji, kana, german] = match;
      const reading = katakanaToHiragana(kana);
      items.push({ kanji, reading, german, element: text });
    }
  }
  if (items.length === 0) return;
  const bulk = items.map(({ kanji }) => kanji);
  items.forEach(({ element, kanji, reading, german }) => {
    element.innerHTML = "";
    element.dataset.cotsuToolsAddedWadokuInformation = "true";
    element.append(
      kanji,
      "（",
      pitchAccentElement(kanji, reading, bulk),
      "） ",
      german || meaningElement(kanji, reading, bulk),
    );
  });
};
