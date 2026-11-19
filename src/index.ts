window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  console.error(e.reason);
  if (e.reason instanceof Error) {
    alert(
      "[Cotsu-Tools] Etwas ist schiefgelaufen:\n\n" +
        e.reason.message +
        "\n" +
        e.reason.stack,
    );
  } else {
    alert(
      "[Cotsu-Tools] Etwas ist schiefgelaufen (kein Error):\n\n" + e.reason,
    );
  }
});
window.addEventListener("error", (e) => {
  e.preventDefault();
  console.error(e.error);
  if (e.error instanceof Error) {
    alert(
      "[Cotsu-Tools] Etwas ist schiefgelaufen:\n\n" +
        e.error.message +
        "\n" +
        e.error.stack,
    );
  } else {
    alert("[Cotsu-Tools] Etwas ist schiefgelaufen (kein Error):\n\n" + e.error);
  }
});

import { addStyles } from "./actions/addStyles";
import { handleSettings } from "./actions/handleSettings";
import { handleExerciseWords } from "./actions/handleExerciseWords";
import { showMoreStats } from "./actions/showMoreStats";
import { handleKanjiTab } from "./actions/handleKanjiTab";
import { startInterceptingFetch } from "./lib/interceptedFetch";
import "./lib/settings";

startInterceptingFetch();
new MutationObserver(async (records) => {
  addStyles(records);
  handleSettings(records);
  handleExerciseWords(records);
  showMoreStats(records);
  handleKanjiTab(records);
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});
