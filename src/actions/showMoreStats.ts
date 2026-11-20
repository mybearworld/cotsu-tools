import { element, text } from "../lib/element";
import { stats } from "../lib/interceptedFetch";
import { isSceneChange } from "../lib/isSceneChange";
import { type Level, LEVELS, LOWERCASE_LEVELS } from "../lib/levels";

const percent = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;

export const showMoreStats = async (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        record.target instanceof HTMLElement &&
        record.addedNodes[0] instanceof HTMLElement &&
        record.addedNodes[0].querySelector("[class^=_maturity-tallies_]"),
    )
  )
    return;
  const progressBars = document.querySelector(
    "[class^=_maturity-tallies_] ~ [class^=_centered_]",
  );
  if (!progressBars) return;
  for (const child of progressBars.children) {
    const levelNameElement = element(child.firstElementChild);
    const levelStats = (await stats).progress[
      LOWERCASE_LEVELS[levelNameElement.textContent as Level]
    ];
    const progressElement = element(child.lastElementChild?.firstElementChild);
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
      matureProgress.classList.add("cotsu-tools-detail-green");
      matureProgress.style.color = "";
      matureProgress.textContent = `${percent(
        levelStats.mature,
        levelStats.total,
      )} (${levelStats.mature})`;
      element(progressContainer.parentElement).append(matureProgressContainer);
    }
  }
};
