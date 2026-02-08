import { element } from "./element";
import { gmfetch } from "./gmfetch.ts";

export type WadokuInformation = {
  pitchAccent: string | null;
  meaning: string;
  definition: HTMLDivElement;
} | null;

const parser = new DOMParser();
const wadokuSearchResultCache = new Map<string, Document | Promise<Document>>();
const wadokuInformationCache = new Map<
  string,
  WadokuInformation | Promise<WadokuInformation>
>();

// These are two different tilde characters that are both used interchangibly
// by the site.
const TILDE = /[～〜]/g;

export const getWadokuInformation = async (
  kanji: string,
  reading: string,
  bulk: string[] = [kanji],
): Promise<WadokuInformation> => {
  kanji = kanji.replace(TILDE, "…");
  reading = reading.replace(TILDE, "…");
  bulk = bulk.map((s) => s.replace(TILDE, "…"));
  if (reading.includes("・")) {
    const results = await Promise.all(
      reading
        .split("・")
        .map((individualReading) =>
          getWadokuInformation(kanji, individualReading, bulk),
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
  let suboptimalResult: {
    segmentedPitchAccent: WadokuInformation | null;
    noPitchAccent: WadokuInformation | null;
    hasAlternateSpellings: WadokuInformation | null;
    alternateSpelling: WadokuInformation | null;
    undesirableDefinition: WadokuInformation | null;
  } = {
    segmentedPitchAccent: null,
    noPitchAccent: null,
    hasAlternateSpellings: null,
    alternateSpelling: null,
    undesirableDefinition: null,
  };
  try {
    const cachedSearchResponseDocument = wadokuSearchResultCache.get(kanji);
    let searchResponseDocument: Document;
    if (cachedSearchResponseDocument) {
      searchResponseDocument = await cachedSearchResponseDocument;
    } else {
      const res: ((value: Document) => void)[] = [];
      bulk.forEach((kanji) => {
        wadokuSearchResultCache.set(
          kanji,
          new Promise((resolve) => res.push(resolve)),
        );
      });
      const searchResponse = await gmfetch({
        // ¡ is a separator character that's not used in an entry and probably
        // won't be at any point.
        url: `https://wadoku.de/search/${bulk.join("¡")}`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "searchType=JAPANESE&matchType=EXACT",
      });
      searchResponseDocument = parser.parseFromString(
        searchResponse,
        "text/html",
      );
      res.forEach((resolve) => resolve(searchResponseDocument));
    }
    for (const resultLine of searchResponseDocument.querySelectorAll(
      ".resultline",
    )) {
      const readingRow =
        resultLine.querySelector(".accent") ??
        resultLine.querySelector(".reading");
      if (
        !readingRow ||
        readingRow.textContent.trim().replace(/\uffe8|･|~/g, "") !== reading
      ) {
        continue;
      }
      const senses = element(
        resultLine.querySelector(".senses")?.cloneNode(true),
      );
      let isUndesirableDefinition = false;
      const fillElement = (elementToFill: Element, currentNode: Node) => {
        if (currentNode instanceof Text) {
          if (
            currentNode.textContent === " " &&
            (elementToFill.lastChild?.textContent === " " ||
              elementToFill.lastChild?.textContent === "\xa0")
          ) {
            return;
          }
          elementToFill.append(currentNode.textContent);
          return;
        }
        if (!(currentNode instanceof Element))
          throw new Error("currentElement is not an element");
        if (
          currentNode.classList.contains("genus") ||
          currentNode.classList.contains("season") ||
          currentNode.matches(".transcr:has(+ .jap)") ||
          (currentNode.classList.contains("klammer") &&
            currentNode.classList.contains("global")) ||
          currentNode.classList.contains("badge")
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
          currentNode.classList.contains("usage")
        ) {
          nextElementToFillClass = "cotsu-tools-definition-context";
        } else if (currentNode.classList.contains("dom")) {
          if (
            currentNode.textContent === "Buchtitel" ||
            currentNode.textContent === "weibl. Name" ||
            currentNode.textContent === "männl. Name" ||
            currentNode.textContent === "Familienn." ||
            currentNode.textContent === "Bengō"
          ) {
            isUndesirableDefinition = true;
          }
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
          } else if (childNode.classList.contains("def")) {
            information.meaning += childNode.textContent;
          }
        } else if (childNode.nodeType === Node.TEXT_NODE) {
          information.meaning += childNode.textContent;
        }
      }
      information.meaning = information.meaning.trim().replace(/\.$/, "");
      const orth = element(resultLine.querySelector(".orth")).textContent.split(
        "；",
      );
      if (isUndesirableDefinition) {
        suboptimalResult.undesirableDefinition = information;
      } else if (orth[0] !== kanji) {
        suboptimalResult.alternateSpelling ??= information;
      } else if (information.pitchAccent?.includes("･")) {
        suboptimalResult.segmentedPitchAccent ??= information;
      } else if (information.pitchAccent === null) {
        suboptimalResult.noPitchAccent ??= information;
      } else if (orth.length !== 1) {
        suboptimalResult.hasAlternateSpellings ??= information;
      } else {
        return doReturn(information);
      }
    }
  } catch (e) {
    console.error(e);
    return doReturn(null);
  }
  return doReturn(
    suboptimalResult.hasAlternateSpellings ??
      suboptimalResult.alternateSpelling ??
      suboptimalResult.segmentedPitchAccent ??
      suboptimalResult.undesirableDefinition ??
      suboptimalResult.noPitchAccent,
  );
};

export const pitchAccentElement = (
  kanji: string,
  reading: string,
  bulk?: string[],
) => {
  const pitchAccentElement = document.createElement("span");
  pitchAccentElement.classList.add(
    "cotsu-tools-pitch-accent",
    "cotsu-tools-pitch-accent-loading",
  );
  pitchAccentElement.textContent = reading;
  getWadokuInformation(kanji, reading, bulk).then((information) => {
    pitchAccentElement.classList.remove("cotsu-tools-pitch-accent-loading");
    if (information?.pitchAccent) {
      pitchAccentElement.innerHTML = information.pitchAccent
        .replace(/class/g, "data-cotsu-tools-pitch-accent-segment")
        .replace(/…/g, "〜");
    } else {
      pitchAccentElement.append(" (kein Pitch-Accent verfügbar)");
    }
  });
  return pitchAccentElement;
};

export const meaningElement = (
  kanji: string,
  reading: string,
  bulk?: string[],
) => {
  const meaningElement = document.createElement("span");
  meaningElement.classList.add("cotsu-tools-meaning");
  meaningElement.textContent = "lädt...";
  getWadokuInformation(kanji, reading, bulk).then((information) => {
    if (information?.meaning) {
      meaningElement.innerHTML = `${information.meaning} (Wadoku)`;
    } else {
      meaningElement.textContent = "(keine Bedeutung verfügbar)";
    }
  });
  return meaningElement;
};

export type DefinitionElementOptions = {
  collapsed?: boolean;
  bulk?: string[];
};
export const definitionElement = (
  kanji: string,
  reading: string,
  options?: DefinitionElementOptions,
) => {
  const wrapperElement = document.createElement("div");
  wrapperElement.classList.add("cotsu-tools-definition");
  const headerElement = document.createElement("div");
  headerElement.classList.add("cotsu-tools-definition-header");
  headerElement.textContent = "Definition von Wadoku";
  wrapperElement.append(headerElement);
  const definitionElement = document.createElement("div");
  if (options?.collapsed) {
    definitionElement.classList.add("cotsu-tools-definition-collapsed");
  }
  definitionElement.textContent = "lädt...";
  wrapperElement.append(definitionElement);
  getWadokuInformation(kanji, reading, options?.bulk).then((information) => {
    definitionElement.replaceChildren(
      information?.definition ?? "keine Definition verfügbar",
    );
    if (options?.collapsed) {
      let currentButton: HTMLButtonElement | null = null;
      let hasClickedButton = false;
      const resizeListener = () => {
        if (definitionElement.scrollHeight === definitionElement.clientHeight) {
          if (!currentButton) return;
          currentButton.remove();
          currentButton = null;
        } else {
          if (currentButton || hasClickedButton) return;
          currentButton = document.createElement("button");
          currentButton.textContent = "volle Definition anzeigen";
          currentButton.addEventListener("click", () => {
            definitionElement.classList.remove(
              "cotsu-tools-definition-collapsed",
            );
            if (currentButton) currentButton.remove();
            currentButton = null;
            hasClickedButton = true;
          });
          headerElement.append(currentButton);
        }
      };
      window.addEventListener("resize", resizeListener);
      resizeListener();
    }
  });
  return wrapperElement;
};
