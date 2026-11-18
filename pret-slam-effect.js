(() => {
  "use strict";

  const source = "assets/effects/pret-slam/sheet.png";
  const rowHeight = 431;
  const columns = [0, 405, 810];
  // Source crop and the ground contact point within each original cell.
  const frames = [
    { crop: [137, 276, 277, 373], pivot: [205, 345], end: .07 },
    { crop: [73, 242, 319, 380], pivot: [202, 351], end: .15 },
    { crop: [24, 190, 368, 383], pivot: [206, 351], end: .24 },
    { crop: [12, 79, 399, 358], pivot: [210, 306], end: .38 },
    { crop: [4, 105, 393, 361], pivot: [201, 304], end: .53 },
    { crop: [6, 150, 388, 346], pivot: [197, 303], end: .66 },
    { crop: [27, 147, 389, 342], pivot: [206, 305], end: .78 },
    { crop: [33, 169, 369, 338], pivot: [201, 299], end: .89 },
    { crop: [41, 196, 343, 324], pivot: [200, 290], end: 1 },
  ];
  const clamp = value => Math.max(0, Math.min(1, value));

  function drawWarning(ctx, project, unit, slam, elapsed, still) {
    const charge = clamp(elapsed / slam.windup);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 56; i++) {
      const theta = Math.PI * 2 * i / 56;
      const [x, y] = project(Math.cos(theta) * slam.radius, Math.sin(theta) * slam.radius);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.setLineDash([5 * unit, 4 * unit]);
    ctx.strokeStyle = 'rgba(49,30,26,.66)';
    ctx.lineWidth = Math.max(1.7, unit * 1.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,194,123,' + (still ? .68 : .46 + .38 * charge) + ')';
    ctx.lineWidth = Math.max(.8, unit * .92);
    ctx.stroke();
    ctx.restore();
  }

  function pose(slam, elapsed) {
    if (elapsed < slam.windup) {
      const charge = clamp(elapsed / slam.windup);
      return { stretchX: 1 - .07 * charge, stretchY: 1 + .18 * charge };
    }
    const shock = (1 - clamp((elapsed - slam.windup) / slam.recovery)) ** 2;
    return { stretchX: 1 + .24 * shock, stretchY: 1 - .28 * shock };
  }

  function create(requestDraw) {
    const sheet = new Image();
    sheet.decoding = "async";
    if (requestDraw) sheet.addEventListener("load", requestDraw, { once: true });
    sheet.src = source;

    function drawImpact(ctx, project, slam, elapsed, still, foreground) {
      const progress = (elapsed - slam.windup) / slam.recovery;
      if (progress < 0 || progress >= 1 || !sheet.complete ||
          sheet.naturalWidth !== 1216 || sheet.naturalHeight !== 1293) return;
      const index = still ? 3 : frames.findIndex(frame => progress < frame.end);
      const { crop: [left, top, right, bottom], pivot: [anchorX, anchorY] } = frames[index];
      const sourceX = columns[index % 3] + left;
      const sourceY = Math.floor(index / 3) * rowHeight + (foreground ? anchorY : top);
      const sourceHeight = foreground ? bottom - anchorY : anchorY - top;
      const width = right - left;
      const [x, y] = project(0, 0);
      const [edgeX] = project(slam.radius, 0);
      const [edgeY] = project(0, slam.radius);
      const scale = Math.max(.05, 2 * Math.hypot(edgeX - x, edgeY - x) / 382);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const opacity = still ? .74 * (1 - progress) : clamp((1 - progress) / .28);
      ctx.globalAlpha *= opacity;
      ctx.drawImage(sheet, sourceX, sourceY, width, sourceHeight,
        x + (left - anchorX) * scale, y + (foreground ? 0 : (top - anchorY) * scale),
        width * scale, sourceHeight * scale);
      ctx.restore();
    }

    return {
      pose,
      ground(ctx, project, unit, slam, elapsed, still) {
        if (elapsed < slam.windup) drawWarning(ctx, project, unit, slam, elapsed, still);
        else drawImpact(ctx, project, slam, elapsed, still, false);
      },
      foreground(ctx, project, _unit, slam, elapsed, still) {
        drawImpact(ctx, project, slam, elapsed, still, true);
      },
    };
  }

  window.AyothayaPretSlamEffect = { create };
})();
