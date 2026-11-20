import style from "../lib/style.css";

export const addStyles = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        (record.target instanceof HTMLElement &&
          record.target.id === "app" &&
          record.removedNodes[1] instanceof HTMLElement &&
          record.removedNodes[1].tagName === "NOSCRIPT") ||
        (record.target instanceof HTMLHeadElement &&
          [...record.addedNodes].some(
            (node) => node instanceof HTMLStyleElement && node.dataset.meta,
          )),
    )
  ) {
    return;
  }
  if (document.querySelector("#cotsu-tools-style")) return;
  const styleElement = document.createElement("style");
  styleElement.id = "cotsu-tools-style";
  styleElement.innerHTML = style;
  document.head.append(styleElement);
};
