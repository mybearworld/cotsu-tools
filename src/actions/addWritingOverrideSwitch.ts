import { stats } from "../lib/interceptedFetch";
import { requestCanvas } from "../lib/kanjiCanvas";
import { toggleWritingOverride, writingOverride } from "../lib/writingOverride";

const actionName = (writingOverride: boolean) =>
  writingOverride ? "schreiben" : "lesen";

export const addWritingOverrideSwitch = (records: MutationRecord[]) => {
  for (const record of records) {
    if (
      !(record.target instanceof HTMLElement) ||
      !record.target.className.includes("MaturityTallies")
    )
      continue;
    const h3s = document.querySelectorAll("h3");
    const readingH3 = h3s.item(0);
    const writingH3 = h3s.item(1);
    if (readingH3?.textContent !== "Modus: Kanji lesen") return;
    if (writingH3?.textContent !== "Modus: Kanji schreiben") return;
    writingH3.textContent =
      "Modus: Kanji schreiben (Cotsus standardmäßiger Modus)";
    readingH3.innerHTML = "";
    const currentAction = document.createTextNode("");
    readingH3.append("Modus: Kanji ", currentAction);
    const switchButton = document.createElement("a");
    switchButton.classList.add("cotsu-tools-writing-override-switch-button");
    switchButton.role = "button";
    const updateLabels = () => {
      switchButton.textContent = `(stattdessen ${actionName(!writingOverride())}?)`;
      currentAction.textContent = actionName(writingOverride());
    };
    switchButton.addEventListener("click", () => {
      if (!stats) return;
      if (
        stats.progress.n5.learning ||
        stats.progress.n4.learning ||
        stats.progress.n3.learning ||
        stats.progress.n2.learning ||
        stats.progress.n1.learning
      ) {
        alert(
          `Du hast auf diesem Konto schon Fortschritt. Erstelle ein neues Konto, um auf diesem zu ${actionName(!writingOverride())}.`,
        );
        return;
      }
      toggleWritingOverride();
      updateLabels();
    });
    updateLabels();
    readingH3.append(" ", switchButton);
  }
};
