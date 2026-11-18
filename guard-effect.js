(() => {
  'use strict';

  const cell = 112;
  const columns = 3;
  const impactDuration = .22;

  function create(requestDraw) {
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/guard/sheet.png';

    function drawFrame(ctx, column, row, x, y, size, opacity, mirror = false) {
      const side = Math.max(2, Math.round(size));
      const offset = -Math.round(side / 2);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= opacity;
      ctx.translate(Math.round(x), Math.round(y));
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(sheet, column * cell, row * cell, cell, cell, offset, offset, side, side);
      ctx.restore();
    }

    return {
      get ready() {
        return sheet.complete && sheet.naturalWidth === columns * cell && sheet.naturalHeight === 2 * cell;
      },
      drawShield(ctx, elapsed, x, y, unit, remaining, still = false) {
        if (!this.ready || remaining <= 0) return;
        const frame = still ? 2 : elapsed < .07 ? 0 : elapsed < .15 ? 1 : 2;
        const pulse = still ? .64 : elapsed < .27 ? .95 : .62 + .07 * Math.sin(elapsed * 6);
        drawFrame(ctx, frame, 0, x, y, 76 * unit, pulse * Math.min(1, remaining / .30));
      },
      drawImpact(ctx, elapsed, x, y, unit, mirror) {
        if (!this.ready || elapsed < 0 || elapsed >= impactDuration) return;
        const frame = elapsed < .035 ? 0 : elapsed < .115 ? 1 : 2;
        const opacity = Math.min(1, (impactDuration - elapsed) / .075);
        drawFrame(ctx, frame, 1, x, y, 52 * unit, opacity, mirror);
      },
    };
  }

  window.AyothayaGuardEffect = { create, impactDuration };
})();
