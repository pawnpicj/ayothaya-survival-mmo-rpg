(() => {
  'use strict';

  const { strikePhase } = window.AyothayaGame;
  const cell = 96;
  const columns = 3;
  const slashFrames = 5;
  const impactFrames = 4;
  const impactDuration = .18;
  const previewSwingDuration = .46;

  function create(requestDraw) {
    const sheet = new Image();
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/heavy/sheet.png?v=2';

    function drawFrame(ctx, frame, x, y, pivotX, pivotY, scale, bearing = 0, mirror = false) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(bearing);
      ctx.scale(scale, mirror ? -scale : scale);
      ctx.drawImage(sheet, frame % columns * cell, Math.floor(frame / columns) * cell, cell, cell,
        -pivotX, -pivotY, cell, cell);
      ctx.restore();
    }

    return {
      get ready() { return sheet.complete && sheet.naturalWidth === cell * columns && sheet.naturalHeight === cell * 3; },
      drawSlash(ctx, progress, handX, handY, unit, bearing, mirrored) {
        if (!this.ready || progress < strikePhase || progress >= 1) return;
        // Match the reference GIF's follow-through, using only its last five trail cells.
        const follow = (progress - strikePhase) / (1 - strikePhase);
        const frame = Math.min(slashFrames - 1, Math.floor(follow * slashFrames));
        drawFrame(ctx, frame, handX, handY, 24, 44, unit * .88, bearing, mirrored);
      },
      drawImpact(ctx, elapsed, x, y, unit) {
        if (!this.ready || elapsed < 0 || elapsed >= impactDuration) return;
        const frame = slashFrames + Math.floor(elapsed / impactDuration * impactFrames);
        drawFrame(ctx, frame, x, y, 48, 48, unit * .68);
      },
    };
  }

  window.AyothayaHeavyEffect = { create, impactDuration, previewSwingDuration };
})();
