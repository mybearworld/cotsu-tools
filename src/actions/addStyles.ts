import { element } from "../lib/element";
import style from "../lib/style.css";

export const addStyles = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        (record.type === "childList" &&
          record.target instanceof HTMLElement &&
          record.target.id === "app" &&
          record.removedNodes[1] instanceof HTMLElement &&
          record.removedNodes[1].tagName === "NOSCRIPT") ||
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
  const metaElement = element(document.querySelector("meta[name=viewport]"));
  if (!(metaElement instanceof HTMLMetaElement)) return;
  metaElement.content += ", interactive-widget=overlays-content";
};
