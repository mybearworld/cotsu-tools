export const element = (a: unknown): HTMLElement => {
  if (!(a instanceof HTMLElement)) throw new Error("Not an element");
  return a;
};
export const text = (a: unknown): Text => {
  if (!(a instanceof Text)) throw new Error("Not an element");
  return a;
};
