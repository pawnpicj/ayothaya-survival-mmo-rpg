(() => {
  'use strict';

  const width = 160;
  const height = 80;
  const columns = 3;
  const frameEnds = [.035, .080, .135, .180, .230, .285];
  const duration = frameEnds.at(-1);

  function create(requestDraw) {
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/sweep/sheet.png';

    return {
      get ready() {
        return sheet.complete && sheet.naturalWidth === columns * width && sheet.naturalHeight === 2 * height;
      },
      draw(ctx, elapsed, x, y, radiusX, radiusY, behind) {
        if (!this.ready || elapsed < 0 || elapsed >= duration) return;
        const frame = frameEnds.findIndex(end => elapsed < end);
        const halfWidth = Math.max(1, Math.round(radiusX * 80 / 70));
        const halfHeight = Math.max(1, Math.round(radiusY * 40 / 31));
        const offset = behind ? 0 : height / 2;
        const left = Math.round(x) - halfWidth;
        const top = Math.round(y) - (behind ? halfHeight : 0);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, (frame % columns) * width, Math.floor(frame / columns) * height + offset,
          width, height / 2, left, top, halfWidth * 2, halfHeight);
        ctx.restore();
      },
    };
  }

  window.AyothayaSweepEffect = { create, duration };
})();
