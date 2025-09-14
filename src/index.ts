import { insertCSS } from "./actions/addCSS";
import { handleSettings } from "./actions/handleSettings";
import { handleExerciseWords } from "./actions/handleExerciseWords";
import { startInterceptingFetch } from "./lib/interceptedFetch";
import { showMoreStats } from "./actions/showMoreStats";
import { showExercisesLeftInKanjiLearningTab } from "./actions/showExercisesLeftInKanjiLearningTab";
import { fixFontInNewKanjiTab } from "./actions/fixFontInNewKanjiTab";
import { addWadokuInformationInKanjiTab } from "./actions/addWadokuInformationInKanjiTab";

insertCSS();
startInterceptingFetch();
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
