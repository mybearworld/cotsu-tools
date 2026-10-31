/** Keep accepting ink when HanziWriter's quiz has finished (or no target exists). */
export const watchWritingSurface = (
  box: HTMLElement,
  freehand: () => boolean,
  enabled: () => boolean,
  onStroke: (extra: boolean) => void,
) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("cotsu-tools-writing-ink");
  svg.setAttribute("aria-hidden", "true");
  box.append(svg);
  let stroke: { id: number; x: number; y: number; moved: boolean; extra: boolean; path: SVGPathElement | null; d: string } | null = null;
  box.addEventListener("pointerdown", event => {
    if (!enabled() || stroke || event.button !== 0) return;
    const rect = box.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const extra = freehand();
    let path: SVGPathElement | null = null;
    if (extra) {
      event.preventDefault();
      event.stopImmediatePropagation();
      path = document.createElementNS(svg.namespaceURI, "path") as SVGPathElement;
      path.setAttribute("d", `M${x},${y}`);
      svg.append(path);
    }
    if (extra) box.setPointerCapture(event.pointerId);
    stroke = { id: event.pointerId, x, y, extra, path, moved: false, d: `M${x},${y}` };
  }, { capture: true, signal });
  window.addEventListener("pointermove", event => {
    if (!stroke || event.pointerId !== stroke.id) return;
    const rect = box.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (Math.hypot(x - stroke.x, y - stroke.y) > 3) stroke.moved = true;
    stroke.d += ` L${x},${y}`;
    stroke.path?.setAttribute("d", stroke.d);
  }, { signal });
  window.addEventListener("pointerup", event => {
    if (!stroke || event.pointerId !== stroke.id) return;
    if (stroke.moved && enabled()) onStroke(stroke.extra);
    else stroke.path?.remove();
    stroke = null;
  }, { signal });
  window.addEventListener("pointercancel", () => {
    stroke?.path?.remove();
    stroke = null;
  }, { signal });
  return () => controller.abort();
};
