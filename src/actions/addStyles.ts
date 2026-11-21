import { element } from "../lib/element";
import style from "../lib/style.css";

export const addStyles = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        (record.type === "childList" &&
          record.target instanceof HTMLHtmlElement &&
          record.removedNodes[0] instanceof HTMLDivElement &&
          record.removedNodes[0].childNodes.length === 0) ||
        (record.type === "childList" &&
          record.target instanceof HTMLHeadElement &&
          record.removedNodes[0]),
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
