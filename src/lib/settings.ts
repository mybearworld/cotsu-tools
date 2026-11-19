export type Setting = {
  name: string;
  acknowledgeable: boolean;
  className: string;
};
const SETTINGS = {
  "cotsu-tools-katakana-mode": {
    name: "Katakana statt Hiragana bei Übungen nutzen",
    acknowledgeable: false,
    className: "cotsu-tools-katakana-mode",
  },
  "cotsu-tools-shuffle-summary": {
    name: "Am Ende einer Übung die Vokabelübersicht mischen",
    acknowledgeable: false,
    className: "cotsu-tools-shuffle-summary",
  },
  "cotsu-tools-hide-question-maturity": {
    name: "Indikator des Fortschritts einer Vokabel während einer Übung verstecken",
    acknowledgeable: false,
    className: "cotsu-tools-hide-question-maturity",
  },
  "cotsu-tools-cursive-font": {
    name: "Handschriftliche Schriftart für japanischen Text verwenden (Yuji Syuku)",
    acknowledgeable: true,
    className: "cotsu-tools-cursive-font",
  },
} satisfies Record<string, Setting>;
export type SettingID = keyof typeof SETTINGS;
export const SETTING_IDS = Object.keys(SETTINGS) as SettingID[];

const STORAGE_KEY = "cotsu-tools";
const ACKNOWLEDGED_STORAGE_KEY = "cotsu-tools-acknowledged";

const loadedSettingsString = localStorage.getItem(STORAGE_KEY);
const loadedAcknowledgedString = localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY);

let settings: Record<SettingID, boolean>;
if (loadedSettingsString) {
  settings = JSON.parse(loadedSettingsString);
} else {
  settings = Object.fromEntries(SETTING_IDS.map((id) => [id, false])) as Record<
    SettingID,
    boolean
  >;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

let acknowledged: SettingID[];
if (loadedAcknowledgedString) {
  acknowledged = JSON.parse(loadedAcknowledgedString);
} else {
  if (loadedSettingsString) {
    // Not installed for the first time.
    acknowledged = SETTING_IDS.filter((id) => !SETTINGS[id].acknowledgeable);
  } else {
    // Installed for the first time.
    acknowledged = SETTING_IDS;
  }
  localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(acknowledged));
}

export const getSetting = (id: SettingID) => settings[id];
export const settingName = (id: SettingID) => SETTINGS[id].name;

export const setSetting = (id: SettingID, value: boolean) => {
  settings[id] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const doAcknowledgeableSettingsExist = () =>
  SETTING_IDS.some(
    (id) => SETTINGS[id].acknowledgeable && !acknowledged.includes(id),
  );
export const isAcknowledged = (id: SettingID) => acknowledged.includes(id);
export const acknowledgeSettings = () => {
  acknowledged = SETTING_IDS;
  localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(acknowledged));
};

export const addSettingsToDOM = () => {
  (Object.entries(settings) as [SettingID, boolean][]).forEach(
    ([name, value]) => {
      document.body.classList.toggle(SETTINGS[name].className, value);
    },
  );
};
