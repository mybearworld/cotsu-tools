import style from "./style.css";

export const insertCSS = () => {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = style;
  document.head.append(styleElement);
};
