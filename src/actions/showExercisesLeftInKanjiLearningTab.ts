import { stats } from "../lib/interceptedFetch";
import { isSceneChange } from "../lib/isSceneChange";
import { Level, LEVELS, LOWERCASE_LEVELS } from "../lib/levels";

export const showExercisesLeftInKanjiLearningTab = async (
  records: MutationRecord[],
) => {
  if (!stats || !isSceneChange(records)) return;
  document.querySelectorAll(".MuiSlider-markLabel").forEach((label) => {
    const level = label.textContent.split(" ")[0] as Level;
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
