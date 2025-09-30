import { element, text } from "../lib/element";
import { stats } from "../lib/interceptedFetch";
import { LEVELS, LOWERCASE_LEVELS } from "../lib/levels";

const percent = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;

export const showMoreStats = async (records: MutationRecord[]) => {
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
  if (
    practiceCard &&
    stats.readyForEarlyReview !== "0" &&
    stats.totalLearned !== 0
  ) {
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
      matureProgress.classList.add("cotsu-tools-detail-green");
      matureProgress.textContent = `${percent(
        levelStats.mature,
        levelStats.total,
      )} (${levelStats.mature})`;
      element(progressContainer.parentElement).append(matureProgressContainer);
    }
  });
};
