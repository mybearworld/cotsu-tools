import { stats } from "./interceptedFetch";

const STORAGE_KEY = "cotsu-tools-writing-override";

const storedItem = localStorage.getItem(STORAGE_KEY);
const writingOverrideByAccount = storedItem ? JSON.parse(storedItem) : {};

const updateStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(writingOverrideByAccount));
};
updateStorage();

export const writingOverride = () => {
  if (!stats) throw new Error("Trying to get writing override without stats");
  if (writingOverrideByAccount[stats.userid])
    return writingOverrideByAccount[stats.userid];
  return false;
};

export const toggleWritingOverride = () => {
  if (!stats) throw new Error("Trying to set writing override without stats");
  writingOverrideByAccount[stats.userid] = !writingOverride();
  updateStorage();
};
