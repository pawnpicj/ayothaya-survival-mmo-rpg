(() => {
  'use strict';

  const width = 160;
  const height = 80;
  const columns = 3;
  const duration = .28;
  const impactDuration = .23;
  const art = {
    dash: { trailThickness: 56, impactSize: 65 },
    thrust: { trailThickness: 42, impactSize: 60 },
  };

  function create(skill, requestDraw) {
    const { trailThickness, impactSize } = art[skill];
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = `assets/effects/${skill}/sheet.png`;

    return {
      get ready() {
        return sheet.complete && sheet.naturalWidth === columns * width && sheet.naturalHeight === 2 * height;
      },
      drawTrail(ctx, elapsed, from, to, unit, still = false) {
        if (!this.ready || elapsed < 0 || elapsed >= duration) return;
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const length = Math.hypot(dx, dy);
        if (length <= 4 * unit) return;
        const frame = still ? 1 : elapsed < .05 ? 0 : elapsed < .15 ? 1 : 2;
        const size = length * width / 130;
        const thickness = trailThickness * unit;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= Math.min(1, (duration - elapsed) / .1) * (still ? .66 : 1);
        ctx.translate(...from);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.drawImage(sheet, frame * width, 0, width, height, (length - size) / 2,
          -thickness / 2, size, thickness);
        ctx.restore();
      },
      drawImpact(ctx, elapsed, point, bearing, unit, still = false) {
        if (!this.ready || elapsed < 0 || elapsed >= impactDuration) return;
        const frame = still ? 1 : elapsed < .04 ? 0 : elapsed < .115 ? 1 : 2;
        const size = Math.round(impactSize * unit);
        const offset = -Math.round(size / 2);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= Math.min(1, (impactDuration - elapsed) / .075) * (still ? .7 : 1);
        ctx.translate(Math.round(point[0]), Math.round(point[1]));
        ctx.rotate(bearing);
        ctx.drawImage(sheet, frame * width + 40, height, height, height, offset, offset, size, size);
        ctx.restore();
      },
    };
  }

  window.AyothayaPiercingEffect = { create, duration };
})();
