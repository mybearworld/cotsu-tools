import { gmfetch } from "./gmfetch";
import {
  type Path,
  pointDistance,
  rotatePoints,
  samplePoints,
  toPath,
  toSVGPathElement,
} from "./point";

const SCORE_THRESHHOLD = 0.18;
const ZERO_INDEX_THRESHHOLD = 7;
const IMAGE_SIZE = 109;
const CANVAS_SIZE = 300;
const LINE_WIDTH = 3;
const INCORRECT_ANIMATION_SECONDS = 1;
const HINT_ANIMATIONS_SECONDS = 1;
const UPDATE_RATE_PER_SECOND = 30;

const checkStroke = (userStroke: Path, correctStroke: Path) => {
  const correctStrokeLength =
    toSVGPathElement(correctStroke).getTotalLength() / IMAGE_SIZE;
  const userStrokeLength =
    toSVGPathElement(userStroke).getTotalLength() / CANVAS_SIZE;
  if (userStrokeLength < correctStrokeLength / 2) return false;
  const correctStrokePoints = samplePoints(correctStroke, {
    scale: IMAGE_SIZE,
  });
  const userStrokePoints = samplePoints(userStroke, {
    amount: correctStrokePoints.length,
    scale: CANVAS_SIZE,
  });
  if (userStrokePoints.length === 0) return undefined;
  const scores = [];
  for (let degrees = 0; degrees < 180; degrees += 10) {
    const rotatedUserStrokePoints = rotatePoints(
      userStrokePoints,
      (degrees * Math.PI) / 180,
    );
    if (degrees > 90) rotatedUserStrokePoints.reverse();
    const distances = correctStrokePoints.map((correctStrokePoint, i) => {
      const userStrokePoint = rotatedUserStrokePoints[i];
      return pointDistance(userStrokePoint, correctStrokePoint);
    });
    const score = Math.max(...distances);
    scores.push({ degrees, score });
  }
  scores.sort((a, b) =>
    a.score > b.score ? 1
    : a.score < b.score ? -1
    : 0,
  );
  const zeroIndex = scores.findIndex((score) => score.degrees === 0);
  return (
    zeroIndex <= ZERO_INDEX_THRESHHOLD &&
    correctStrokePoints.every((correctStrokePoint, i) => {
      const userStrokePoint = userStrokePoints[i];
      return (
        pointDistance(userStrokePoint, correctStrokePoint) < SCORE_THRESHHOLD
      );
    })
  );
};

const domParser = new DOMParser();
export type RequestCanvasOptions = CanvasOptions & {
  onLoad?: () => void;
};
export const requestCanvas = (
  character: string,
  options?: RequestCanvasOptions,
) => {
  const codePoint = character.codePointAt(0);
  if (!codePoint) throw new Error("Invalid Kanji");
  const container = document.createElement("div");
  container.classList.add("cotsu-tools-writing-override-canvas-wrapper");
  container.textContent = "lädt...";
  container.style.width = `${CANVAS_SIZE}px`;
  container.style.height = `${CANVAS_SIZE}px`;
  gmfetch({
    url:
      "https://raw.githubusercontent.com/KanjiVG/kanjivg/refs/heads/master/kanji/" +
      encodeURIComponent(codePoint.toString(16).padStart(5, "0")) +
      ".svg",
    headers: {},
    method: "GET",
  })
    .then((text) => {
      const parsedDocument = domParser.parseFromString(text, "image/svg+xml");
      const svg = parsedDocument.querySelector("svg");
      if (!svg) throw new Error("No SVG");
      container.innerHTML = "";
      const result = createCanvas(svg, options);
      container.append(result.element);
      returnObject.hint = result.hint;
      options?.onLoad?.();
      options?.onNewStroke?.();
    })
    .catch(() => {
      container.textContent = `Von dem Zeichen 「${character}」 scheint KanjiVG keine Stroke-Order zu kennen. Das ist wahrscheinlich ein Bug von Cotsu-Tools.`;
      const continueButton = document.createElement("button");
      continueButton.textContent = "Zum nächsten Zeichen";
      continueButton.addEventListener("click", () => {
        options?.onFinish?.(false);
      });
      container.append(document.createElement("br"), continueButton);
    });
  const returnObject: CanvasReturn = {
    element: container,
    hint: () => {},
  };
  return returnObject;
};

export type CanvasOptions = {
  beforeFinish?: () => void;
  onFinish?: (madeMistake: boolean) => void;
  onNewStroke?: () => void;
};
export type CanvasReturn = {
  element: HTMLElement;
  hint: () => void;
};
export const createCanvas = (
  kanji: SVGElement,
  options?: CanvasOptions,
): CanvasReturn => {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  canvas.style.width = `${CANVAS_SIZE}px`;
  canvas.style.height = `${CANVAS_SIZE}px`;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No context");

  const positionOnCanvas = (e: MouseEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x:
        (e instanceof MouseEvent ?
          e.clientX
        : (e.touches.item(0)?.clientX ?? 0)) - rect.left,
      y:
        (e instanceof MouseEvent ?
          e.clientY
        : (e.touches.item(0)?.clientY ?? 0)) - rect.top,
    };
  };

  const canvasState: {
    currentStroke: string | null;
    correctStrokes: string[];
    incorrectStrokes: { line: string; opacity: number }[];
    hintStroke: { line: string; ratio: number } | null;
  } = {
    currentStroke: null,
    correctStrokes: [],
    incorrectStrokes: [],
    hintStroke: null,
  };
  let currentStrokeNumber = 0;
  let incorrectStrokesInARow = 0;
  let canDraw = true;
  let madeMistake = false;

  const strokePaths = kanji.querySelectorAll("path");
  const currentStroke = () => {
    const pathElement = strokePaths.item(currentStrokeNumber);
    if (!pathElement) return null;
    const stroke = pathElement.getAttribute("d");
    if (!stroke) throw new Error("No stroke information");
    return stroke;
  };

  const showHint = () => {
    const correctStroke = currentStroke();
    if (!correctStroke) {
      alert("Du hast das Zeichen schon fertig gezeichnet!");
      return;
    }
    const hint = { line: correctStroke, ratio: 0 };
    const interval = setInterval(() => {
      hint.ratio += 1 / (UPDATE_RATE_PER_SECOND * HINT_ANIMATIONS_SECONDS);
      if (hint.ratio === 1) {
        clearInterval(interval);
      }
    }, 1 / UPDATE_RATE_PER_SECOND);
    canvasState.hintStroke = hint;
  };

  const checkCurrentStroke = () => {
    if (canvasState.currentStroke === null) return;
    const correctStroke = currentStroke();
    const result =
      correctStroke ?
        checkStroke(canvasState.currentStroke, correctStroke)
      : false;
    if (result === true) {
      canvasState.hintStroke = null;
      canvasState.correctStrokes.push(correctStroke!);
      incorrectStrokesInARow = 0;
      currentStrokeNumber++;
      const wasLastStroke = currentStrokeNumber >= strokePaths.length;
      if (wasLastStroke) {
        options?.beforeFinish?.();
        canDraw = false;
        let blur = 0;
        const callback = () => {
          blur += 0.1;
          canvas.style.filter = `blur(${blur > 2 ? 2 - (blur - 2) : blur}px`;
          if (blur >= 4) {
            canvas.style.filter = "blur(0px)";
            options?.onFinish?.(madeMistake);
          } else {
            requestAnimationFrame(callback);
          }
        };
        requestAnimationFrame(callback);
      } else {
        options?.onNewStroke?.();
      }
    } else if (result === false) {
      madeMistake = true;
      const line = {
        line: canvasState.currentStroke,
        opacity: 100,
      };
      canvasState.incorrectStrokes.push(line);
      const interval = setInterval(() => {
        line.opacity -=
          100 / (UPDATE_RATE_PER_SECOND * INCORRECT_ANIMATION_SECONDS);
        if (line.opacity === 0) {
          clearInterval(interval);
        }
      }, 1 / UPDATE_RATE_PER_SECOND);
      incorrectStrokesInARow++;
      if (incorrectStrokesInARow === 4 && correctStroke) {
        showHint();
      }
    }
    canvasState.currentStroke = null;
  };

  const mouseDownListener = (e: MouseEvent | TouchEvent) => {
    if (!canDraw) return;
    const pos = positionOnCanvas(e);
    canvasState.currentStroke = `M ${pos.x} ${pos.y}`;
  };
  canvas.addEventListener("mousedown", mouseDownListener);
  canvas.addEventListener("touchstart", mouseDownListener);
  const bodyMouseMoveListener = (e: MouseEvent | TouchEvent) => {
    if (
      canvasState.currentStroke !== null &&
      e instanceof MouseEvent &&
      !(e.buttons & 1)
    ) {
      checkCurrentStroke();
    }
  };
  document.body.addEventListener("mousemove", bodyMouseMoveListener);
  document.body.addEventListener("touchmove", bodyMouseMoveListener);
  const mouseMoveListener = (e: MouseEvent | TouchEvent) => {
    if (canvasState.currentStroke === null) return;
    const pos = positionOnCanvas(e);
    canvasState.currentStroke += ` L ${pos.x} ${pos.y}`;
  };
  canvas.addEventListener("mousemove", mouseMoveListener);
  canvas.addEventListener("touchmove", mouseMoveListener);
  const mouseUpListener = () => {
    checkCurrentStroke();
  };
  document.body.addEventListener("mouseup", mouseUpListener);
  document.body.addEventListener("touchend", mouseUpListener);
  document.body.addEventListener("touchcancel", () => {
    canvasState.currentStroke = null;
  });

  const tick = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = LINE_WIDTH;
    canvasState.incorrectStrokes.forEach((line) => {
      if (line.opacity === 0) return;
      context.beginPath();
      context.strokeStyle = `rgb(255, 0, 0, ${line.opacity}%)`;
      context.stroke(new Path2D(line.line));
    });
    context.strokeStyle = "rgb(0, 0, 255, 50%)";
    context.save();
    context.scale(CANVAS_SIZE / IMAGE_SIZE, CANVAS_SIZE / IMAGE_SIZE);
    context.lineWidth = (LINE_WIDTH * IMAGE_SIZE) / CANVAS_SIZE;
    context.beginPath();
    if (canvasState.hintStroke) {
      context.beginPath();
      context.stroke(
        new Path2D(
          toPath(
            samplePoints(canvasState.hintStroke.line, {
              ratio: canvasState.hintStroke.ratio,
              scale: 1,
            }),
          ),
        ),
      );
    }
    context.strokeStyle = "black";
    canvasState.correctStrokes.forEach((line) => {
      context.beginPath();
      context.stroke(new Path2D(line));
    });
    context.restore();
    context.lineWidth = LINE_WIDTH;
    if (canvasState.currentStroke) {
      context.strokeStyle = "blue";
      context.beginPath();
      context.stroke(new Path2D(canvasState.currentStroke));
    }
    requestAnimationFrame(tick);
  };
  tick();

  options?.onNewStroke?.();
  return {
    element: canvas,
    hint: () => {
      madeMistake = true;
      showHint();
    },
  };
};
