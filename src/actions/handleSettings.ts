import { isSceneChange } from "../lib/isSceneChange";
import { element } from "../lib/element";
import {
  definitionElement,
  meaningElement,
  pitchAccentElement,
} from "../lib/wadokuInformation";
import {
  acknowledgeSettings,
  doAcknowledgeableSettingsExist,
  getSetting,
  isAcknowledged,
  setSetting,
  SETTING_IDS,
  settingName,
  addSettingsToDOM,
} from "../lib/settings";

const createDialog = () => {
  const dialog = document.createElement("dialog");
  dialog.classList.add("cotsu-tools-dialog");
  const closeDialog = () => {
    dialog.close();
    dialog.querySelectorAll(".cotsu-tools-new-badge").forEach((badge) => {
      badge.remove();
    });
  };
  const dialogWrapper = document.createElement("div");
  dialogWrapper.classList.add("cotsu-tools-dialog-wrapper");
  dialog.addEventListener("mousedown", (e) => {
    if (!element(e.target).closest(".cotsu-tools-dialog-wrapper")) {
      closeDialog();
    }
  });
  dialog.append(dialogWrapper);
  const verisonHeader = document.createElement("header");
  const leftHeader = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = "Cotsu-Tools";
  leftHeader.append(h2);
  const version = document.createElement("span");
  version.textContent = `v${GM.info.script.version}`;
  leftHeader.append(version);
  verisonHeader.append(leftHeader);
  const rightHeader = document.createElement("div");
  const link = document.createElement("a");
  link.classList.add("cotsu-tools-dialog-link");
  link.textContent = "↗";
  link.href = "https://openuserjs.org/scripts/mybearworld/Cotsu-Tools";
  link.target = "_blank";
  rightHeader.append(link);
  verisonHeader.append(rightHeader);
  dialogWrapper.append(verisonHeader);
  const settingsHeader = document.createElement("h3");
  settingsHeader.textContent = "Einstellungen";
  dialogWrapper.append(settingsHeader);
  SETTING_IDS.forEach((id) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = getSetting(id);
    checkbox.addEventListener("input", () => {
      setSetting(id, checkbox.checked);
    });
    label.append(checkbox);
    const description = document.createElement("span");
    description.textContent = settingName(id);
    if (!isAcknowledged(id)) {
      const newBadge = document.createElement("span");
      newBadge.textContent = "Neu";
      newBadge.classList.add(
        "cotsu-tools-new-badge",
        "cotsu-tools-new-badge-dialog",
      );
      description.append(newBadge);
    }
    label.append(description);
    dialogWrapper.append(label);
  });
  const debuggingDetails = document.createElement("details");
  const debuggingSummary = document.createElement("summary");
  const debuggingHeader = document.createElement("h3");
  debuggingHeader.textContent = "Debugging";
  debuggingSummary.append(debuggingHeader);
  debuggingDetails.append(debuggingSummary);
  const debuggingWadokuKanjiInput = document.createElement("input");
  debuggingWadokuKanjiInput.placeholder = "Kanji";
  const debuggingWadokuReadingInput = document.createElement("input");
  debuggingWadokuReadingInput.placeholder = "Lesung";
  const debuggingWadokuButton = document.createElement("button");
  debuggingWadokuButton.textContent = "Wadoku-Informationen erhalten";
  const debuggingWadoku = document.createElement("div");
  debuggingWadokuButton.addEventListener("click", () => {
    debuggingWadoku.innerHTML = "";
    const kanji = debuggingWadokuKanjiInput.value;
    const reading = debuggingWadokuReadingInput.value;
    debuggingWadoku.append(pitchAccentElement(kanji, reading));
    debuggingWadoku.append(meaningElement(kanji, reading));
    debuggingWadoku.append(definitionElement(kanji, reading));
  });
  debuggingDetails.append(
    debuggingWadokuKanjiInput,
    debuggingWadokuReadingInput,
    debuggingWadokuButton,
    debuggingWadoku,
  );
  dialogWrapper.append(debuggingDetails);
  const closeButton = document.createElement("button");
  closeButton.textContent = "Schließen";
  closeButton.addEventListener("click", () => {
    closeDialog();
  });
  dialogWrapper.append(closeButton);
  document.body.append(dialog);
  return dialog;
};

const addSettingsDialog = (records: MutationRecord[]) => {
  if (!isSceneChange(records) || document.querySelector(".cotsu-tools-button"))
    return;
  const headerActions = document.querySelector(".header-actions");
  if (!headerActions) return;
  let dialog = document.querySelector(".cotsu-tools-dialog") || createDialog();
  if (!(dialog instanceof HTMLDialogElement))
    throw new Error("Settings aren't a dialog");
  const settingsButton = document.createElement("button");
  settingsButton.classList.add("theme-toggle");
  settingsButton.ariaLabel = "Cotsu-Tools";
  settingsButton.title = "Cotsu-Tools";
  settingsButton.innerHTML = WRENCH_ICON;
  let newBadge = null;
  if (doAcknowledgeableSettingsExist()) {
    newBadge = document.createElement("span");
    newBadge.textContent = "Neu";
    newBadge.classList.add(
      "cotsu-tools-new-badge",
      "cotsu-tools-new-badge-nav-bar",
    );
    settingsButton.append(newBadge);
  }
  settingsButton.addEventListener("click", () => {
    dialog.showModal();
    acknowledgeSettings();
    newBadge?.remove();
  });
  element(headerActions).insertAdjacentElement("afterbegin", settingsButton);
};

const useAddSettingsToDOM = (records: MutationRecord[]) => {
  if (!isSceneChange(records)) {
    return;
  }
  addSettingsToDOM();
};

export const handleSettings = (records: MutationRecord[]) => {
  addSettingsDialog(records);
  useAddSettingsToDOM(records);
};

const WRENCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden><!-- ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. --><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>`;
