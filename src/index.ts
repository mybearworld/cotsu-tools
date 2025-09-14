import "./actions/addCSS";
import { handleSettings } from "./actions/handleSettings";

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
