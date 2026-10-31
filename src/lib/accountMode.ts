export type AccountMode = "reading" | "writing";
const KEY = "cotsu-tools-account-modes";
let account: string | null = null;

export const setAccount = (id: unknown) => {
  account = typeof id === "string" || typeof id === "number" ? String(id) : null;
};
export const getAccount = () => account;
export const getAccountMode = (): AccountMode => {
  if (!account) return "reading";
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}")[account] === "writing"
      ? "writing" : "reading";
  } catch { return "reading"; }
};
export const setAccountMode = (mode: AccountMode) => {
  if (!account) return;
  let modes: Record<string, AccountMode>;
  try { modes = JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
  catch { modes = {}; }
  if (!modes || typeof modes !== "object" || Array.isArray(modes)) modes = {};
  localStorage.setItem(KEY, JSON.stringify({ ...modes, [account]: mode }));
};
