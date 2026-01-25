import { isSceneChange } from "../lib/isSceneChange";
import { element } from "../lib/element";
import {
  definitionElement,
  pitchAccentElement,
} from "../lib/wadokuInformation";

const SETTINGS: {
  name: string;
  id: string;
  effect: (newSetting: boolean) => void;
}[] = [
  {
    name: "Katakana statt Hiragana bei Übungen nutzen",
    id: "cotsu-tools-katakana-mode",
    effect: (newSetting) => {
      document.body.classList.toggle("cotsu-tools-katakana-mode", newSetting);
    },
  },
  {
    name: "Am Ende einer Übung die Vokabelübersicht mischen",
    id: "cotsu-tools-shuffle-summary",
    effect: (newSetting) => {
      document.body.classList.toggle("cotsu-tools-shuffle-summary", newSetting);
    },
  },
];
const STORAGE_KEY = "cotsu-tools";

const createDialog = () => {
  const loadedSettingsString = localStorage.getItem(STORAGE_KEY);
  let settings;
  if (loadedSettingsString) {
    settings = JSON.parse(loadedSettingsString);
  } else {
    settings = Object.fromEntries(SETTINGS.map(({ id }) => [id, false]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
  const dialog = document.createElement("dialog");
  dialog.classList.add("cotsu-tools-dialog");
  const dialogWrapper = document.createElement("div");
  dialogWrapper.classList.add("cotsu-tools-dialog-wrapper");
  dialog.addEventListener("mousedown", (e) => {
    if (!element(e.target).closest(".cotsu-tools-dialog-wrapper")) {
      dialog.close();
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
  SETTINGS.forEach((setting) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settings[setting.id];
    setting.effect(settings[setting.id]);
    checkbox.addEventListener("input", () => {
      setting.effect(checkbox.checked);
      settings[setting.id] = checkbox.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    });
    label.append(checkbox);
    const name = document.createElement("span");
    name.textContent = setting.name;
    label.append(name);
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
    dialog.close();
  });
  dialogWrapper.append(closeButton);
  document.body.append(dialog);
  return dialog;
};

export const handleSettings = async (records: MutationRecord[]) => {
  if (!isSceneChange(records) || document.querySelector("cotsu-tools-button"))
    return;
  const header = document.querySelector(
    "[class^=MainLayout-module--header--] .MuiGrid-root",
  );
  if (!header) return;
  let dialog = document.querySelector(".cotsu-tools-dialog") || createDialog();
  if (!(dialog instanceof HTMLDialogElement))
    throw new Error("Settings aren't a dialog");
  const settingsButton = document.createElement("button");
  settingsButton.classList.add("cotsu-tools-button");
  settingsButton.textContent = "Cotsu-Tools";
  settingsButton.addEventListener("click", () => {
    dialog.showModal();
  });
  element(header.lastChild).insertAdjacentElement("afterbegin", settingsButton);
};
