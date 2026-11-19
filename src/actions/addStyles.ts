import style from "../lib/style.css";

export const addStyles = (records: MutationRecord[]) => {
  if (
    !records.some(
      (record) =>
        record.target instanceof HTMLHeadElement &&
        [...record.addedNodes].some(
          (node) =>
            node instanceof HTMLStyleElement &&
            node.dataset.meta === "makeStyles",
        ),
    )
  ) {
    return;
  }
  const styleElement = document.createElement("style");
  styleElement.innerHTML = style;
  document.head.append(styleElement);
};
