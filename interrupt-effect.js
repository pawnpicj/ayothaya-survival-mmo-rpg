(() => {
  'use strict';

  const cell = 96;
  const columns = 3;
  const frameEnds = [.045, .126, .202, .255, .316, .38];
  const impactDuration = frameEnds.at(-1);

  function create(requestDraw) {
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/interrupt/sheet.png';

    return {
      get ready() {
        return sheet.complete && sheet.naturalWidth === columns * cell && sheet.naturalHeight === 2 * cell;
      },
      drawImpact(ctx, elapsed, x, y, unit) {
        if (!this.ready || elapsed < 0 || elapsed >= impactDuration) return;
        const frame = frameEnds.findIndex(end => elapsed < end);
        const size = Math.max(2, Math.round(88 * unit));
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= Math.min(1, (impactDuration - elapsed) / .085);
        ctx.drawImage(sheet, (frame % columns) * cell, Math.floor(frame / columns) * cell, cell, cell,
          Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        ctx.restore();
      },
    };
  }

  window.AyothayaInterruptEffect = { create, impactDuration };
})();
