import { element } from "./element";
import { gmfetch } from "./gmfetch.ts";

export type WadokuInformation = {
  pitchAccent: string | null;
  meaning: string;
  definition: HTMLDivElement;
} | null;

const parser = new DOMParser();
const wadokuInformationCache = new Map<
  string,
  WadokuInformation | Promise<WadokuInformation>
>();

export const getWadokuInformation = async (
  kanji: string,
  reading: string,
): Promise<WadokuInformation> => {
  kanji = kanji.replace(/～/g, "");
  reading = reading.replace(/～/g, "");
  if (reading.includes("・")) {
    const results = await Promise.all(
      reading
        .split("・")
        .map((individualReading) =>
          getWadokuInformation(kanji, individualReading),
        ),
    );
    const nonNullResult = results.find((result) => result !== null);
    if (nonNullResult === undefined) return null;
    return {
      pitchAccent: results
        .filter((information) => information !== null)
        .map((information) => information.pitchAccent)
        .join("・"),
      meaning: nonNullResult.meaning,
      definition: nonNullResult.definition,
    };
  }
  const cacheKey = `${kanji}/${reading}`;
  const cachedInformation = wadokuInformationCache.get(cacheKey);
  if (cachedInformation) {
    if (cachedInformation instanceof Promise) {
      return await cachedInformation;
    }
    return cachedInformation;
  }
  let done: (information: WadokuInformation) => void;
  wadokuInformationCache.set(
    cacheKey,
    new Promise((resolve) => {
      done = resolve;
    }),
  );
  const doReturn = (information: WadokuInformation) => {
    wadokuInformationCache.set(cacheKey, information);
    done(information);
    return information;
  };
  let suboptimalResult: WadokuInformation | null = null;
  try {
    const searchResponse = await gmfetch({
      url: `https://wadoku.de/search/${kanji}`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "searchType=JAPANESE&matchType=EXACT",
    });
    const searchResponseDocument = parser.parseFromString(
      searchResponse,
      "text/html",
    );
    for (const resultLine of searchResponseDocument.querySelectorAll(
      ".resultline",
    )) {
      const readingRow =
        resultLine.querySelector(".accent") ??
        resultLine.querySelector(".reading");
      if (
        !readingRow ||
        readingRow.textContent.trim().replace(/\uffe8|･|~|…/g, "") !== reading
      ) {
        continue;
      }
      const senses = element(
        resultLine.querySelector(".senses")?.cloneNode(true),
      );
      const fillElement = (elementToFill: Element, currentNode: Node) => {
        if (currentNode instanceof Text) {
          elementToFill.append(currentNode.textContent);
          return;
        }
        if (!(currentNode instanceof Element))
          throw new Error("currentElement is not an element");
        if (
          currentNode.classList.contains("genus") ||
          currentNode.matches(".transcr:has(+ .jap)") ||
          (currentNode.classList.contains("klammer") &&
            currentNode.classList.contains("global"))
        ) {
          return;
        }
        let nextElementToFillClass: string | null = null;
        let wrap: [string, string] | null = null;
        if (currentNode.classList.contains("indexnr")) {
          nextElementToFillClass = "cotsu-tools-definition-index-number";
          wrap = ["[", "]"];
        } else if (
          currentNode.classList.contains("reg") ||
          currentNode.classList.contains("dom")
        ) {
          nextElementToFillClass = "cotsu-tools-definition-context";
        } else if (
          currentNode.classList.contains("klammer") ||
          currentNode.classList.contains("etym")
        ) {
          nextElementToFillClass = "cotsu-tools-definition-paren";
        } else if (currentNode.classList.contains("descr")) {
          nextElementToFillClass = "cotsu-tools-definition-paren";
          wrap = ["(", ")"];
        } else if (
          currentNode.classList.contains("reflink") &&
          !currentNode.classList.contains("other")
        ) {
          if (
            elementToFill.lastChild instanceof Text &&
            elementToFill.lastChild.textContent === "; "
          ) {
            elementToFill.lastChild.remove();
          }
          return;
        }
        let nextElementToFill = elementToFill;
        if (nextElementToFillClass) {
          nextElementToFill = document.createElement("span");
          nextElementToFill.classList.add(nextElementToFillClass);
          elementToFill.append(nextElementToFill);
        }
        if (wrap) nextElementToFill.append(wrap[0]);
        for (const child of currentNode.childNodes) {
          fillElement(nextElementToFill, child);
        }
        if (wrap) nextElementToFill.append(wrap[1]);
      };
      const definition = document.createElement("div");
      fillElement(definition, senses);
      const information: WadokuInformation = {
        meaning: "",
        definition,
        pitchAccent:
          readingRow.classList.contains("accent") ? readingRow.innerHTML : null,
      };
      let sense = element(resultLine.querySelector(".sense:not(.master)"));
      sense = sense.querySelector(".prior1") ?? sense;
      for (const childNode of sense.childNodes) {
        if (childNode instanceof HTMLElement) {
          if (childNode.classList.contains("rel")) {
            break;
          } else if (childNode.classList.contains("token")) {
            information.meaning += childNode.firstChild?.textContent;
          }
        } else if (childNode.nodeType === Node.TEXT_NODE) {
          information.meaning += childNode.textContent;
        }
      }
      information.meaning = information.meaning.trim().replace(/\.$/, "");
      if (information.pitchAccent?.includes("･")) {
        suboptimalResult = information;
      } else if (
        suboptimalResult === null &&
        information.pitchAccent === null
      ) {
        suboptimalResult = information;
      } else {
        return doReturn(information);
      }
    }
  } catch (e) {
    console.error(e);
    return doReturn(null);
  }
  return doReturn(suboptimalResult);
};

export const pitchAccentElement = (kanji: string, reading: string) => {
  const pitchAccentElement = document.createElement("span");
  pitchAccentElement.classList.add(
    "cotsu-tools-pitch-accent",
    "cotsu-tools-pitch-accent-loading",
  );
  pitchAccentElement.textContent = reading;
  getWadokuInformation(kanji, reading).then((information) => {
    pitchAccentElement.classList.remove("cotsu-tools-pitch-accent-loading");
    if (information?.pitchAccent) {
      pitchAccentElement.innerHTML = information.pitchAccent.replace(
        /class/g,
        "data-cotsu-tools-pitch-accent-segment",
      );
    } else {
      pitchAccentElement.append(" (kein Pitch-Accent verfügbar)");
    }
  });
  return pitchAccentElement;
};

export const meaningElement = (kanji: string, reading: string) => {
  const meaningElement = document.createElement("span");
  meaningElement.classList.add("cotsu-tools-meaning");
  meaningElement.textContent = "lädt...";
  getWadokuInformation(kanji, reading).then((information) => {
    if (information?.meaning) {
      meaningElement.innerHTML = `${information.meaning} (Wadoku)`;
    } else {
      meaningElement.textContent = "(keine Bedeutung verfügbar)";
    }
  });
  return meaningElement;
};

export const definitionElement = (kanji: string, reading: string) => {
  const wrapperElement = document.createElement("div");
  wrapperElement.classList.add("cotsu-tools-definition");
  const headerElement = document.createElement("div");
  headerElement.classList.add("cotsu-tools-definition-header");
  headerElement.textContent = "Definition von Wadoku";
  wrapperElement.append(headerElement);
  const definitionElement = document.createElement("div");
  definitionElement.textContent = "lädt...";
  wrapperElement.append(definitionElement);
  getWadokuInformation(kanji, reading).then((information) => {
    definitionElement.replaceChildren(
      information?.definition ?? "keine Definition verfügbar",
    );
  });
  return wrapperElement;
};
