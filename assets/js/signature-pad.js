"use strict";

(function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function pointDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    if (dx === 0 && dy === 0) return pointDistance(point, lineStart);
    const t = clamp(
      ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
        (dx * dx + dy * dy),
      0,
      1
    );
    return Math.hypot(
      point[0] - (lineStart[0] + t * dx),
      point[1] - (lineStart[1] + t * dy)
    );
  }

  function simplifyStroke(points, epsilon = 1.8) {
    if (points.length <= 2) return points.slice();
    let maxDistance = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const distance = perpendicularDistance(points[i], points[0], points[end]);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }

    if (maxDistance <= epsilon) return [points[0], points[end]];
    const left = simplifyStroke(points.slice(0, index + 1), epsilon);
    const right = simplifyStroke(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  class KBKBSignaturePad {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError("Een geldig canvas-element is vereist.");
      }
      this.canvas = canvas;
      this.context = canvas.getContext("2d", { alpha: true });
      this.strokes = [];
      this.currentStroke = null;
      this.activePointerId = null;
      this.penWidth = Number(options.penWidth || canvas.dataset.penWidth || 2.2);
      this.minimumStep = Number(options.minimumStep || 2.5);
      this.minimumPathLength = Number(options.minimumPathLength || 18);
      this.maximumPoints = Number(options.maximumPoints || 3200);
      this.disabled = false;

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.resize = this.resize.bind(this);

      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", this.onPointerDown);
      canvas.addEventListener("pointermove", this.onPointerMove);
      canvas.addEventListener("pointerup", this.onPointerUp);
      canvas.addEventListener("pointercancel", this.onPointerUp);
      canvas.addEventListener("lostpointercapture", this.onPointerUp);

      if ("ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(canvas);
      } else {
        this.resizeObserver = null;
        window.addEventListener("resize", this.resize);
      }
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.redraw();
    }

    normalizedPoint(event) {
      const rect = this.canvas.getBoundingClientRect();
      return [
        Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 1000),
        Math.round(clamp((event.clientY - rect.top) / rect.height, 0, 1) * 1000)
      ];
    }

    totalPointCount() {
      return this.strokes.reduce((sum, stroke) => sum + stroke.length, 0) +
        (this.currentStroke ? this.currentStroke.length : 0);
    }

    onPointerDown(event) {
      if (this.disabled || event.button > 0 || this.activePointerId !== null) return;
      event.preventDefault();
      this.activePointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      const point = this.normalizedPoint(event);
      this.currentStroke = [point];
      this.drawDot(point);
      this.canvas.dispatchEvent(new CustomEvent("kbkbpadchange", { bubbles: true }));
    }

    onPointerMove(event) {
      if (this.disabled || event.pointerId !== this.activePointerId || !this.currentStroke) return;
      event.preventDefault();
      if (this.totalPointCount() >= this.maximumPoints) return;
      const point = this.normalizedPoint(event);
      const previous = this.currentStroke[this.currentStroke.length - 1];
      if (pointDistance(point, previous) < this.minimumStep) return;
      this.currentStroke.push(point);
      this.drawSegment(previous, point);
    }

    onPointerUp(event) {
      if (event.pointerId !== this.activePointerId) return;
      event.preventDefault();
      if (this.currentStroke && this.currentStroke.length) {
        const simplified = simplifyStroke(this.currentStroke, 1.8);
        this.strokes.push(simplified);
      }
      this.currentStroke = null;
      this.activePointerId = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      this.redraw();
      this.canvas.dispatchEvent(new CustomEvent("kbkbpadchange", { bubbles: true }));
    }

    canvasPoint(point) {
      return [
        (point[0] / 1000) * this.canvas.width,
        (point[1] / 1000) * this.canvas.height
      ];
    }

    prepareContext() {
      const context = this.context;
      const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      context.strokeStyle = "#111111";
      context.fillStyle = "#111111";
      context.lineWidth = this.penWidth * ratio;
      context.lineCap = "round";
      context.lineJoin = "round";
      return context;
    }

    drawDot(point) {
      const context = this.prepareContext();
      const [x, y] = this.canvasPoint(point);
      context.beginPath();
      context.arc(x, y, Math.max(1.1, context.lineWidth / 2), 0, Math.PI * 2);
      context.fill();
    }

    drawSegment(from, to) {
      const context = this.prepareContext();
      const [x1, y1] = this.canvasPoint(from);
      const [x2, y2] = this.canvasPoint(to);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }

    redraw() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (const stroke of this.strokes) {
        if (!stroke.length) continue;
        if (stroke.length === 1) {
          this.drawDot(stroke[0]);
          continue;
        }
        const context = this.prepareContext();
        const first = this.canvasPoint(stroke[0]);
        context.beginPath();
        context.moveTo(first[0], first[1]);
        for (let i = 1; i < stroke.length; i++) {
          const point = this.canvasPoint(stroke[i]);
          context.lineTo(point[0], point[1]);
        }
        context.stroke();
      }
    }

    pathLength() {
      let total = 0;
      for (const stroke of this.strokes) {
        for (let i = 1; i < stroke.length; i++) total += pointDistance(stroke[i - 1], stroke[i]);
      }
      return total;
    }

    hasInk() {
      return this.strokes.length > 0 && this.pathLength() >= this.minimumPathLength;
    }

    exportStrokes() {
      return this.strokes.map(stroke => stroke.map(point => [point[0], point[1]]));
    }

    importStrokes(strokes) {
      this.strokes = Array.isArray(strokes)
        ? strokes
            .filter(Array.isArray)
            .map(stroke => stroke
              .filter(point => Array.isArray(point) && point.length >= 2)
              .map(point => [
                Math.round(clamp(Number(point[0]) || 0, 0, 1000)),
                Math.round(clamp(Number(point[1]) || 0, 0, 1000))
              ]))
            .filter(stroke => stroke.length)
        : [];
      this.redraw();
      this.canvas.dispatchEvent(new CustomEvent("kbkbpadchange", { bubbles: true }));
    }

    clear() {
      this.strokes = [];
      this.currentStroke = null;
      this.redraw();
      this.canvas.dispatchEvent(new CustomEvent("kbkbpadchange", { bubbles: true }));
    }

    setDisabled(disabled) {
      this.disabled = Boolean(disabled);
      this.canvas.setAttribute("aria-disabled", String(this.disabled));
      this.canvas.classList.toggle("is-disabled", this.disabled);
    }

    destroy() {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      else window.removeEventListener("resize", this.resize);
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointercancel", this.onPointerUp);
      this.canvas.removeEventListener("lostpointercapture", this.onPointerUp);
    }
  }

  window.KBKBSignaturePad = KBKBSignaturePad;
})();
