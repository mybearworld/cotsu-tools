import { element } from "../lib/element";
import { KATAKANA_TO_HIRAGANA } from "../lib/katakanaToHiragana";
import { pitchAccentElement, meaningElement } from "../lib/wadokuInformation";

export const addWadokuInformationInKanjiTab = async (
  records: MutationRecord[],
) => {
  const items = [];
  for (const record of records) {
    const firstAddedNode = record.addedNodes[0];
    if (
      record.target instanceof HTMLElement &&
      record.target.classList.contains("jss26") &&
      firstAddedNode instanceof HTMLElement
    ) {
      const text = element(
        firstAddedNode.querySelector(
          ".MuiListItemText-root .MuiTypography-root",
        ),
      );
      const match = text.textContent.match(/^(.+?)（(.+?)） (.+)?$/);
      if (!match) throw new Error("Unexpected text format");
      const [, kanji, kana, german] = match;
      const reading = [...kana]
        .map((kana) =>
          kana in KATAKANA_TO_HIRAGANA ?
            KATAKANA_TO_HIRAGANA[kana as keyof typeof KATAKANA_TO_HIRAGANA]
          : kana,
        )
        .join("");
      items.push({ kanji, reading, german, element: text });
    }
  }
  if (items.length === 0) return;
  const bulk = items.map(({ kanji }) => kanji);
  items.forEach(({ element, kanji, reading, german }) => {
    element.innerHTML = "";
    element.append(
      kanji,
      "（",
      pitchAccentElement(kanji, reading, bulk),
      "） ",
      german || meaningElement(kanji, reading, bulk),
    );
  });
};
