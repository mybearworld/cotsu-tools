export type Point = { x: number; y: number };

export type Path = SVGPathElement | string;
export const toSVGPathElement = (path: Path) => {
  if (path instanceof SVGPathElement) return path;
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  element.setAttribute("d", path);
  return element;
};

export const pointDistance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const rotatePoints = (points: Point[], angle: number) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  points.forEach((point) => {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  });
  const origin = {
    x: (maxX - minX) / 2 + minX,
    y: (maxY - minY) / 2 + minY,
  };
  return points.map((point) => {
    const radius = pointDistance(origin, point);
    if (radius === 0) {
      return point;
    }
    const isAboveOrigin = point.y < origin.y;
    const oldAngleFromCosine = Math.acos((point.x - origin.x) / radius);
    const oldAngle =
      isAboveOrigin ? oldAngleFromCosine : Math.PI * 2 - oldAngleFromCosine;
    const newAngle = oldAngle - angle;
    return {
      x: origin.x + Math.cos(newAngle) * radius,
      y: origin.y - Math.sin(newAngle) * radius,
    };
  });
};

const DEFAULT_DENSITY = 0.08;
const samplePointsCache = new Map<string, Point[]>();
export const samplePoints = (
  path: Path,
  {
    amount,
    density,
    scale,
    ratio,
  }: { scale: number; ratio?: number } & (
    | { amount: number; density?: never }
    | { amount?: never; density: number }
    | { amount?: never; density?: never }
  ),
) => {
  const doReturn = (points: Point[]) => {
    if (!cached || points.length > cached.length) {
      samplePointsCache.set(cacheIndex, points);
    }
    return points.slice(0, points.length * (ratio ?? 1));
  };
  const svgPathElement = toSVGPathElement(path);
  const totalLength = svgPathElement.getTotalLength();
  const sampleAmount =
    amount ?
      amount - 1
    : Math.round(totalLength / ((density ?? DEFAULT_DENSITY) * scale));
  const sampleDensity = totalLength / sampleAmount;
  if (!Number.isFinite(sampleDensity)) {
    return doReturn([]);
  }
  const cacheIndex = `${svgPathElement.getAttribute("d")}/${sampleDensity}`;
  const cached = samplePointsCache.get(cacheIndex);
  const points: Point[] = cached ?? [];
  for (let i = 0; i <= sampleAmount; i++) {
    if (points[i]) continue;
    const { x, y } = svgPathElement.getPointAtLength(i * sampleDensity);
    points.push({ x: x / scale, y: y / scale });
  }
  return doReturn(points);
};

export const toPath = (points: Point[]) =>
  points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
