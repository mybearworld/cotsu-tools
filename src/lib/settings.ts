export type Setting = {
  name: string;
  effect: (newSetting: boolean) => void;
};
const SETTINGS = {
  "cotsu-tools-katakana-mode": {
    name: "Katakana statt Hiragana bei Übungen nutzen",
    effect: (newSetting) => {
      document.body.classList.toggle("cotsu-tools-katakana-mode", newSetting);
    },
  },
  "cotsu-tools-shuffle-summary": {
    name: "Am Ende einer Übung die Vokabelübersicht mischen",
    effect: (newSetting) => {
      document.body.classList.toggle("cotsu-tools-shuffle-summary", newSetting);
    },
  },
} satisfies Record<string, Setting>;
export type SettingID = keyof typeof SETTINGS;
export const SETTING_IDS = Object.keys(SETTINGS) as SettingID[];

const STORAGE_KEY = "cotsu-tools";

const loadedSettingsString = localStorage.getItem(STORAGE_KEY);
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
SETTING_IDS.forEach((id) => {
  if (id in settings) {
    SETTINGS[id].effect(settings[id]);
  } else {
    settings[id] = false;
    SETTINGS[id].effect(false);
  }
});

export const getSetting = (id: SettingID) => settings[id];
export const settingName = (id: SettingID) => SETTINGS[id].name;

export const setSetting = (id: SettingID, value: boolean) => {
  settings[id] = value;
  SETTINGS[id].effect(value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
