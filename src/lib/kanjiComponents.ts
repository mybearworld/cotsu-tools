import { gmfetch } from "./gmfetch";

const SVG = "http://www.w3.org/2000/svg";
const KVG = "http://kanjivg.tagaini.net";
const attr = (node: Element, name: string) => node.getAttributeNS(KVG, name) || node.getAttributeNS("https://kanjivg.tagaini.net/", name) || node.getAttribute(`kvg:${name}`);
export type Component = {
  label: string;
  original: string;
  partial: boolean;
  paths: string[];
  children: Component[];
};

// Stroke order can split one component across sibling groups. Only join groups
// explicitly marked as parts; number distinguishes multiple split occurrences.
const joinParts = (node: Element) => {
  const occurrences = new Map<string, { group: Element; parts: Set<string> }>();
  for (const child of [...node.children]) {
    const label = attr(child, "element");
    const part = attr(child, "part");
    if (!label || !part) continue;
    const key = `${label}/${attr(child, "number") || ""}`;
    const previous = occurrences.get(key);
    if (!previous || part === "1" || previous.parts.has(part)) {
      occurrences.set(key, { group: child, parts: new Set([part]) });
      continue;
    }
    previous.parts.add(part);
    previous.group.append(...child.childNodes);
    // A merged component is no longer just a stroke-order fragment.
    [...previous.group.attributes].filter((a) => a.localName === "part")
      .forEach((a) => previous.group.removeAttributeNode(a));
    if (attr(child, "partial") === "true") previous.group.setAttributeNS(KVG, "kvg:partial", "true");
    child.remove();
  }
  // Some split components cross a sibling's hierarchy (拒: 匚 part 2 is
  // inside 二 part 2). Preserve that enclosing sibling as a subcomponent,
  // rather than pulling out its strokes and leaving an incomplete 二.
  for (const first of [...node.children]) {
    const label = attr(first, "element");
    if (!label || attr(first, "part") !== "1") continue;
    const number = attr(first, "number");
    const continuations: Element[] = [];
    const groups = [...node.querySelectorAll("g")];
    for (const group of groups.slice(groups.indexOf(first as SVGGElement) + 1)) {
      if (first.contains(group) || attr(group, "element") !== label || attr(group, "number") !== number) continue;
      if (attr(group, "part") === "1") break; // A new occurrence, not this enclosure.
      if (attr(group, "part")) continuations.push(group);
    }
    for (const continuation of continuations) {
      let branch: Element = continuation;
      while (branch.parentElement && branch.parentElement !== node) branch = branch.parentElement;
      if (branch.parentElement !== node || branch === first) continue;
      // Remove the continuation wrapper, but retain the hierarchy containing it.
      [...first.attributes].filter((a) => a.localName === "part")
        .forEach((a) => first.removeAttributeNode(a));
      if (attr(continuation, "partial") === "true") first.setAttributeNS(KVG, "kvg:partial", "true");
      if (branch === continuation) {
        first.append(...continuation.childNodes);
        continuation.remove();
      } else {
        continuation.replaceWith(...continuation.childNodes);
        first.append(branch);
      }
    }
  }
  [...node.children].forEach(joinParts);
};

// Keep only geometry and component metadata, never insert remote SVG markup.
export const parseComponents = (source: string): Component => {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = [...doc.querySelectorAll("g")].find((g) => attr(g, "element"));
  if (doc.querySelector("parsererror") || !root) throw new Error("Invalid KanjiVG SVG");
  joinParts(root);
  const parse = (node: Element): Component => {
    const paths = node.localName === "path" ? [node] : [...node.querySelectorAll("path")];
    // Letter suffixes describe stroke junctions, not separate components.
    const strokeType = attr(node, "type")?.replace(/[a-z]/gi, "");
    const label = attr(node, "element") || strokeType || "Strich";
    let children = [...node.children].flatMap((child): Component[] => {
      if (child.localName === "path") return [parse(child)];
      if (child.localName !== "g") return [];
      const group = parse(child);
      return attr(child, "element") ? [group] : group.children;
    });
    // A horizontal stroke is only treated as 一 when splitting 二 or 三.
    if (label === "二" || label === "三") {
      children = children.map((child) => child.label === "㇐" ? { ...child, label: "一", original: "一" } : child);
    }
    // A sole child covering the same strokes adds a name, not a decomposition
    // (e.g. 色 → 巴 → 己/巳). Keep the outer name and skip that extra step.
    if (attr(node, "element")) {
      const geometry = paths.map((p) => p.getAttribute("d") || "").filter(Boolean);
      while (children.length === 1 && children[0].paths.length === geometry.length &&
        children[0].paths.every((path, i) => path === geometry[i])) {
        children = children[0].children;
      }
    }
    return {
      label,
      original: attr(node, "original") || label,
      partial: !!attr(node, "part") || attr(node, "partial") === "true",
      paths: paths.map((p) => p.getAttribute("d") || "").filter(Boolean),
      children,
    };
  };
  return parse(root);
};

const drawings = new Map<string, Promise<Component>>();
const meanings = new Map<string, Promise<string>>();
// German shape descriptions for individual and compound strokes.
// Shapes follow https://kanjivg.tagaini.net/stroke-types.html.
const strokeNames: Record<string, string> = {
  "㇐": "Waagerechter Strich",
  "㇑": "Senkrechter Strich",
  "㇒": "Abstrich nach links",
  "㇏": "Abstrich nach rechts",
  "㇔": "Punkt",
  "㇀": "Aufstrich nach rechts",
  "㇁": "Gebogener Strich mit Haken",
  "㇂": "Schräger Strich mit Haken",
  "㇃": "Flach gebogener Strich mit Haken",
  "㇄": "Senkrechtstrich mit Bogen nach rechts",
  "㇅": "Waagerechtstrich mit zwei Knicken",
  "㇆": "Waagerechtstrich mit Knick und Haken",
  "㇇": "Waagerechtstrich mit Abstrich nach links",
  "㇈": "Waagerechtstrich mit Knick, Bogen und Haken",
  "㇉": "Senkrechtstrich mit Knick, Bogen und Haken",
  "㇋": "Waagerechtstrich mit zwei Knicken und Abstrich",
  "㇓": "Senkrechtstrich mit Abstrich nach links",
  "㇕": "Waagerechter Strich mit Knick",
  "㇖": "Waagerechtstrich mit Haken",
  "㇗": "Senkrechtstrich mit Knick nach rechts",
  "㇙": "Senkrechtstrich mit Aufstrich",
  "㇚": "Senkrechter Strich mit Haken",
  "㇛": "Abstrich nach links, dann Punkt nach rechts",
  "㇜": "Abstrich nach links, dann Knick nach rechts",
  "㇞": "Senkrechtstrich mit zwei Knicken",
  "㇟": "Senkrechtstrich mit Bogen und Haken",
  "㇡": "Waagerechtstrich mit drei Knicken und Haken",
};
const strokeAliases: Record<string, string> = { "丿": "㇒", "丨": "㇑", "丶": "㇔", "乀": "㇏" };
const componentNames: Record<string, string> = {
  "つ": "Dreipunkt-Krone · Form von ツ",
  "⺍": "Dreipunkt-Krone · Form von ツ",
  "マ": "Form des Katakana-Zeichens マ",
  "ト": "Form des Katakana-Zeichens ト",
  "ヒ": "Form des Katakana-Zeichens ヒ",
  "コ": "Form des Katakana-Zeichens コ",
  "⿱日隹": "日 über 隹",
  "⿵𠔼コ": "𠔼 umschließt コ",
  "⿱穴㒸": "穴 über 㒸",
};
const meaning = (character: string) => {
  if (componentNames[character]) return Promise.resolve(componentNames[character]);
  const strokes = character.split("/").map((c) => strokeNames[strokeAliases[c] || c]);
  if (strokes.every(Boolean)) return Promise.resolve(strokes.join(" / "));

  if (/^\p{Script=Hiragana}$/u.test(character)) return Promise.resolve(`Form des Hiragana-Zeichens ${character}`);
  if (/^\p{Script=Katakana}$/u.test(character)) return Promise.resolve(`Form des Katakana-Zeichens ${character}`);
  if (!/^\p{Script=Han}$/u.test(character)) {
    return Promise.resolve(/^[\u31c0-\u31ef/]+$/u.test(character)
      ? "Strichform ohne hinterlegte Bezeichnung"
      : "Formbestandteil ohne hinterlegte Bedeutung");
  }
  if (!meanings.has(character)) {
    const request = gmfetch({ url: `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(character)}`, method: "GET" })
      .then((body) => {
        const data = JSON.parse(body);
        return Array.isArray(data.meanings) && data.meanings.length ? data.meanings.slice(0, 4).join(", ") : "Keine Bedeutung verfügbar";
      }).catch(() => {
        meanings.delete(character);
        return "Bedeutung nicht verfügbar";
      });
    meanings.set(character, request);
  }
  return meanings.get(character)!;
};

let nextPanelId = 0;

export const kanjiComponents = (kanji: string, triggerHost?: HTMLElement) => {
  const panel = document.createElement("details");
  panel.className = "cotsu-tools-components";
  const summary = document.createElement("summary");
  summary.textContent = `Bestandteile von ${kanji} erkunden`;
  const content = document.createElement("div");
  panel.append(summary, content);
  if (triggerHost) {
    panel.id = `cotsu-tools-components-${++nextPanelId}`;
    panel.classList.add("cotsu-tools-components-external-trigger");
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cotsu-tools-component-trigger";
    trigger.textContent = kanji;
    trigger.title = "Bestandteile erkunden";
    trigger.setAttribute("aria-label", `Bestandteile von ${kanji} erkunden`);
    trigger.setAttribute("aria-controls", panel.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      panel.open = !panel.open;
      trigger.setAttribute("aria-expanded", String(panel.open));
    });
    panel.addEventListener("toggle", () => trigger.setAttribute("aria-expanded", String(panel.open)));
    triggerHost.replaceChildren(trigger);
  }
  let loaded = false;
  panel.addEventListener("toggle", async () => {
    if (!panel.open || loaded) return;
    loaded = true;
    content.textContent = "KanjiVG wird geladen …";
    try {
      if (!drawings.has(kanji)) {
        const code = kanji.codePointAt(0)!.toString(16).padStart(5, "0");
        drawings.set(kanji, gmfetch({ url: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`, method: "GET" }).then(parseComponents).catch((error) => {
          drawings.delete(kanji);
          throw error;
        }));
      }
      const root = await drawings.get(kanji)!;
      content.replaceChildren();
      const back = document.createElement("button");
      back.type = "button";
      back.textContent = "← Zurück";
      const canvas = document.createElementNS(SVG, "svg");
      canvas.setAttribute("viewBox", "0 0 109 109");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Bestandteile von ${kanji}; Auswahl über die folgenden Tasten`);
      const choices = document.createElement("div");
      choices.className = "cotsu-tools-component-choices";
      const info = document.createElement("p");
      info.setAttribute("aria-live", "polite");
      info.className = "cotsu-tools-component-info";
      const split = document.createElement("button");
      split.type = "button";
      split.className = "cotsu-tools-component-split";
      split.textContent = "Zerlegen";
      const credits = document.createElement("small");
      credits.title = "Formbestandteile, keine Wortherkunft. Ungefähre englische Bedeutungen; Zeichnung farblich hervorgehoben.";
      const link = (label: string, href: string) => {
        const a = document.createElement("a");
        a.textContent = label;
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        return a;
      };
      credits.append(link("KanjiVG", "https://kanjivg.tagaini.net/"), " · ", link("CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"), " · ", link("KANJIDIC / kanjiapi.dev", "https://kanjiapi.dev/"));
      const workspace = document.createElement("div");
      workspace.className = "cotsu-tools-component-workspace";
      const controls = document.createElement("div");
      controls.className = "cotsu-tools-component-controls";
      controls.append(choices, split, back);
      const preview = document.createElement("div");
      preview.className = "cotsu-tools-component-preview";
      preview.append(canvas, info);
      const previewSlot = document.createElement("div");
      previewSlot.className = "cotsu-tools-component-preview-slot";
      previewSlot.append(preview);
      workspace.append(previewSlot, controls);
      content.append(workspace, credits);
      const history: Component[] = [root];
      let selected: Component | undefined;
      let lastTapped: Component | undefined;
      let generation = 0;
      let hitTargets: { component: Component; index: number; points: DOMPoint[] }[] = [];
      const select = (component: Component, index: number) => {
        if (selected === component) return;
        selected = component;
        lastTapped = undefined;
        const token = ++generation;
        canvas.querySelectorAll("g").forEach((g, i) => g.classList.toggle("is-selected", i === index));
        choices.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
        const name = `${component.label}${component.original !== component.label ? ` (${component.original})` : ""}${component.partial ? " · Teilform" : ""}`;
        info.textContent = `${name} — lädt …`;
        split.disabled = component === history[history.length - 1] && !component.children.length;
        void meaning(component.original).then((value) => {
          if (token === generation) info.textContent = `${name} — ${value}`;
        });
      };
      const descend = () => {
        if (!selected || (selected === history[history.length - 1] && !selected.children.length)) return;
        history.push(selected);
        render();
      };
      const activate = (component: Component, index: number, direct: boolean) => {
        select(component, index);
        if (direct || lastTapped === component) {
          lastTapped = undefined;
          descend();
        } else {
          lastTapped = component;
        }
      };
      // Use the same nearest-stroke selection for hover and click, including
      // holes and gaps. Sample geometry once per level rather than per event.
      const pick = (event: PointerEvent | MouseEvent) => {
        const matrix = canvas.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        let nearest: typeof hitTargets[number] | undefined;
        let distance = Infinity;
        for (const target of hitTargets) {
          for (const sample of target.points) {
            const squared = (sample.x - point.x) ** 2 + (sample.y - point.y) ** 2;
            if (squared < distance) {
              distance = squared;
              nearest = target;
            }
          }
        }
        if (nearest) select(nearest.component, nearest.index);
        return nearest;
      };
      canvas.addEventListener("pointermove", (event) => {
        if (event.pointerType === "mouse") pick(event);
      });
      canvas.addEventListener("click", (event) => {
        const target = pick(event);
        if (target) activate(target.component, target.index,
          event instanceof PointerEvent && event.pointerType === "mouse");
      });
      const render = () => {
        generation++;
        selected = undefined;
        lastTapped = undefined;
        info.textContent = "";
        split.disabled = true;
        const current = history[history.length - 1];
        const components = current.children.length ? current.children : [current];
        canvas.setAttribute("aria-label", `Bestandteile: ${history.map((c) => c.label).join(" › ")}; Auswahl über die danebenstehenden Tasten`);
        back.disabled = history.length === 1;
        canvas.style.cursor = current.children.length ? "pointer" : "default";
        hitTargets = [];
        canvas.replaceChildren();
        choices.replaceChildren();
        components.forEach((component, i) => {
          const group = document.createElementNS(SVG, "g");
          group.style.setProperty("--component-color", ["#006b77", "#9c3800", "#6941a5", "#18652e", "#a51e55"][i % 5]);
          component.paths.forEach((d) => {
            const path = document.createElementNS(SVG, "path");
            path.setAttribute("d", d);
            group.append(path);
          });
          canvas.append(group);
          const points: DOMPoint[] = [];
          group.querySelectorAll("path").forEach((path) => {
            const length = path.getTotalLength();
            const steps = Math.max(1, Math.ceil(length / 2));
            for (let step = 0; step <= steps; step++) {
              points.push(path.getPointAtLength(length * step / steps));
            }
          });
          hitTargets.push({ component, index: i, points });
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `${i + 1}. ${component.label}`;
          button.setAttribute("aria-pressed", "false");
          button.disabled = component === current && !component.children.length;
          button.addEventListener("focus", () => select(component, i));
          button.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") select(component, i); });
          button.addEventListener("click", () => {
            activate(component, i, window.matchMedia("(hover: hover)").matches);
          });
          choices.append(button);
        });
      };
      back.addEventListener("click", () => { history.pop(); render(); });
      split.addEventListener("click", descend);
      render();
    } catch {
      loaded = false;
      content.textContent = "Bestandteile konnten nicht geladen werden. Zum erneuten Versuchen schließen und öffnen.";
    }
  });
  return panel;
};
