(() => {
  'use strict';

  const cell = 128;
  const columns = 3;
  const footY = 104;
  const frameEnds = [.09, .20, .36, .51, .65, .78];
  const duration = frameEnds.at(-1);

  function create(requestDraw) {
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/heal/sheet.png';

    return {
      get ready() {
        return sheet.complete && sheet.naturalWidth === columns * cell && sheet.naturalHeight === 2 * cell;
      },
      draw(ctx, elapsed, x, y, unit, still = false) {
        if (!this.ready || elapsed < 0 || elapsed >= duration) return;
        const frame = still ? 2 : frameEnds.findIndex(end => elapsed < end);
        const size = Math.max(2, Math.round(106 * unit));
        const opacity = Math.min(1, (duration - elapsed) / .15) * (still ? .63 : 1);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= opacity;
        ctx.drawImage(sheet, (frame % columns) * cell, Math.floor(frame / columns) * cell, cell, cell,
          Math.round(x - size / 2), Math.round(y - size * footY / cell), size, size);
        ctx.restore();
      },
    };
  }

  window.AyothayaHealEffect = { create, duration };
})();
