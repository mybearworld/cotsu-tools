import { gmfetch } from "./gmfetch";

export interface CharacterData {
  strokes: string[];
  medians: number[][][];
}
interface Writer {
  quiz(options: {
    showHintAfterMisses: number;
    leniency: number;
    onMistake: () => void;
    onCorrectStroke: (data: { strokeNum: number; strokesRemaining: number }) => void;
    onComplete: () => void;
  }): void;
  highlightStroke(strokeNum: number): Promise<void>;
  cancelQuiz(): void;
}
declare const HanziWriter: {
  create(target: HTMLElement, character: string, options: Record<string, unknown>): Writer;
};
export const createWriter = (target: HTMLElement, character: string, data: CharacterData) => {
  const size = Math.min(200, Math.max(128, Math.floor((document.documentElement.clientWidth - 112) / 2)));
  return HanziWriter.create(target, character, {
    width: size, height: size, padding: 10,
    showCharacter: false, showOutline: false, showHintAfterMisses: 3,
    highlightOnComplete: false,
    charDataLoader: (_character: string, complete: (data: CharacterData) => void) => complete(data),
  });
};

const cache = new Map<string, Promise<CharacterData>>();
export const loadKanji = (character: string): Promise<CharacterData> => {
  const cached = cache.get(character);
  if (cached) return cached;
  const pending = (async () => {
    const code = character.codePointAt(0)!.toString(16).padStart(5, "0");
    const source = await gmfetch({
      url: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`,
      method: "GET",
    });
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    const paths = [...doc.querySelectorAll('path[id*="-s"]')];
    if (!paths.length || doc.querySelector("parsererror")) throw new Error("Keine KanjiVG-Strichdaten");
    const medians = paths.map(path => {
      const geometry = document.createElementNS("http://www.w3.org/2000/svg", "path");
      geometry.setAttribute("d", path.getAttribute("d")!);
      const length = geometry.getTotalLength();
      if (!length) throw new Error("Ungültige KanjiVG-Strichdaten");
      const count = Math.max(2, Math.ceil(length / 3));
      return Array.from({ length: count + 1 }, (_, i) => {
        const point = geometry.getPointAtLength(length * i / count);
        // KanjiVG: 109 units, y down. HanziWriter: 1024 units, y up,
        // with the top at y=900 and bottom at y=-124.
        return [point.x * 1024 / 109, 900 - point.y * 1024 / 109];
      });
    });
    // KanjiVG supplies centerlines. Build closed ribbons for HanziWriter's
    // stroke renderer while retaining the original centerlines for grading.
    const strokes = medians.map(points => {
      const side = (sign: number) => points.map(([x, y], i) => {
        const before = points[Math.max(0, i - 1)];
        const after = points[Math.min(points.length - 1, i + 1)];
        const dx = after[0] - before[0], dy = after[1] - before[1];
        const length = Math.hypot(dx, dy) || 1;
        return `${x - sign * dy / length * 14},${y + sign * dx / length * 14}`;
      });
      return `M${side(1).join(" L")} L${side(-1).reverse().join(" L")} Z`;
    });
    return { medians, strokes };
  })();
  cache.set(character, pending);
  pending.catch(() => cache.delete(character));
  return pending;
};
