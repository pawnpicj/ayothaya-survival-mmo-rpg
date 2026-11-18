(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));

  function drawWarning(ctx, project, slam, elapsed) {
    const [x, y] = project(0, 0);
    const [east] = project(slam.radius, 0);
    const [, south] = project(0, slam.radius);
    const rx = Math.abs(east - x), ry = Math.abs(south - y);
    const warning = elapsed < slam.windup;
    const progress = warning ? elapsed / slam.windup : (elapsed - slam.windup) / slam.recovery;
    const start = -Math.PI / 2;
    const end = start + TAU;
    const marker = warning ? start + progress * TAU : start;
    const opacity = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = opacity * (warning ? .17 : .14 * (1 - progress));
    ctx.strokeStyle = '#eab96f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, marker, end);
    ctx.stroke();
    if (warning) {
      ctx.globalAlpha = opacity * .25;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, start, marker);
      ctx.stroke();
    }
    ctx.restore();
  }

  function create(requestDraw) {
    const sheet = new Image();
    sheet.decoding = 'async';
    if (requestDraw) sheet.addEventListener('load', requestDraw, { once: true });
    sheet.src = 'assets/effects/chalawan-tail-sweep/sheet.png';

    function drawSweepFrame(ctx, project, slam, elapsed, still, foreground) {
      const { naturalWidth: sheetWidth, naturalHeight: sheetHeight } = sheet;
      const untilImpact = slam.windup - elapsed;
      if (!sheetWidth || untilImpact > .18 || (still && untilImpact > 0)) return;
      const recovery = clamp(-untilImpact / slam.recovery);
      const frame = still ? 3 : untilImpact > .08 ? 0 : untilImpact > 0 ? 1 : Math.min(7, 2 + Math.floor(recovery * 6));
      const column = frame % 4;
      const sourceX = Math.floor(column * sheetWidth / 4);
      const frameWidth = Math.floor((column + 1) * sheetWidth / 4) - sourceX;
      const rowStart = frame < 4 ? 0 : Math.floor(sheetHeight / 2);
      // The lower foam passes over the boss's feet, while the crest stays behind it.
      const pivot = 318;
      const top = foreground ? pivot : 140;
      const sourceHeight = (foreground ? 365 : pivot) - top;
      const [x, y] = project(0, 0);
      const [edgeX, edgeY] = project(slam.radius, 0);
      const scale = 2 * Math.hypot(edgeX - x, edgeY - y) / (frameWidth * .94);
      ctx.save();
      ctx.globalAlpha = untilImpact > 0 ? .74 : clamp((1 - recovery) / (still ? 1 : .38));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, sourceX, rowStart + top, frameWidth, sourceHeight,
        x - frameWidth * scale / 2, y + (top - pivot) * scale, frameWidth * scale, sourceHeight * scale);
      ctx.restore();
    }

    return {
      ground(ctx, project, slam, elapsed, still) {
        if (elapsed >= slam.windup + slam.recovery) return;
        drawWarning(ctx, project, slam, elapsed);
        drawSweepFrame(ctx, project, slam, elapsed, still, false);
      },
      foreground(ctx, project, slam, elapsed, still) {
        if (elapsed < slam.windup + slam.recovery) drawSweepFrame(ctx, project, slam, elapsed, still, true);
      },
    };
  }

  function splash(ctx, x, y, age, unit, color) {
    if (age <= 0 || age >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2 * unit;
    ctx.beginPath();
    ctx.ellipse(x, y, (13 + 49 * age) * unit, (4 + 15 * age) * unit, 0, 0, TAU);
    ctx.stroke();
    for (let index = 0; index < 12; index++) {
      const angle = index * TAU / 12;
      const dx = Math.cos(angle) * (12 + 44 * age) * unit;
      const dy = (Math.sin(angle) * (4 + 15 * age) - Math.sin(age * Math.PI) * (12 + index % 4 * 5)) * unit;
      ctx.fillRect(Math.round(x + dx), Math.round(y + dy), Math.max(2, 3 * unit), Math.max(2, 2 * unit));
    }
    ctx.restore();
  }

  function entrance(ctx, source, landing, elapsed, duration, unit, still, drawSprite) {
    const [sourceX, sourceY] = source;
    const [landX, landY] = landing;
    const launch = .22, touchdown = duration - .38;
    splash(ctx, sourceX, sourceY, elapsed / .82, unit, '#b8ede2');
    if (elapsed < launch) return;

    const flight = clamp((elapsed - launch) / (touchdown - launch));
    const x = sourceX + (landX - sourceX) * flight;
    const y = sourceY + (landY - sourceY) * flight;
    const height = still ? 0 : Math.sin(flight * Math.PI) * 91 * unit;
    ctx.fillStyle = flight < 1 ? 'rgba(23,38,28,.17)' : 'rgba(32,24,17,.33)';
    ctx.beginPath();
    ctx.ellipse(x, y, 42 * unit, 8 * unit, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y - height);
    if (!still) ctx.rotate(Math.sin(flight * TAU) * .20);
    drawSprite(129 * unit, x > landX);
    ctx.restore();
    splash(ctx, landX, landY, (elapsed - touchdown) / .38, unit, '#edcd93');
  }

  function collapsePose(progress, headLeft = false) {
    const drop = clamp(progress / .60);
    const settle = drop * drop * (3 - 2 * drop);
    const recoil = Math.sin(Math.PI * clamp(progress / .22)) * .035;
    return { tilt: (.09 * settle - recoil) * (headLeft ? -1 : 1),
      stretchX: 1 + .045 * settle, stretchY: 1 - .39 * settle };
  }

  window.AyothayaChalawanEffect = { create, entrance, collapsePose };
})();
