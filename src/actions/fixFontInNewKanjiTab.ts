import { isSceneChange } from "../lib/isSceneChange";

export const fixFontInNewKanjiTab = async (records: MutationRecord[]) => {
  if (!isSceneChange(records)) return;
  const search = document.querySelector("[class^=suche-module--search-field--");
  if (!search) return;
  search.setAttribute("lang", "ja");
};
