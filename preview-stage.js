(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const BASE_POSE = [0, 0, 0, 1, 1, 1];
  const DARK = { wall: '#12211d', light: '#424232', floor: '#162720', grid: '#e4d4a6', shadow: '#050d05', ink: '#f0ddb0' };
  const LIGHT = { wall: '#b6aa87', light: '#eae2c9', floor: '#ccc29e', grid: '#55452c', shadow: '#413220', ink: '#342c1f' };
  const gold = '#f0d586';
  const copper = '#d19459';
  const jade = '#a5ebc8';

  const tracks = {
    attack: [
      [0, BASE_POSE],
      [.27, [-.102, .012, -.16, .96, 1.03, 1]],
      [.43, [.184, -.027, .19, 1.07, .96, 1]],
      [.56, [.158, .008, .125, 1.04, .96, 1]],
      [.78, [.017, -.009, -.033, 1, 1.02, 1]],
      [1, BASE_POSE],
    ],
    slam: [
      [0, BASE_POSE],
      [.25, [-.02, -.11, -.11, .95, 1.07, 1]],
      [.39, [.035, -.125, .055, .97, 1.07, 1]],
      [.51, [.09, .018, .125, 1.13, .90, 1]],
      [.68, [.051, .025, .065, 1.055, .94, 1]],
      [1, BASE_POSE],
    ],
    cast: [
      [0, BASE_POSE],
      [.24, [-.014, -.014, -.055, .98, 1.025, 1]],
      [.5, [0, -.072, .001, .96, 1.06, 1]],
      [.7, [.038, -.01, .035, 1.025, 1.025, 1]],
      [1, BASE_POSE],
    ],
    hurt: [
      [0, BASE_POSE],
      [.17, [-.099, -.075, -.19, 1.08, .95, 1]],
      [.38, [-.063, .008, -.095, 1.06, .94, 1]],
      [.65, [.012, 0, .045, .98, 1.01, 1]],
      [1, BASE_POSE],
    ],
    fall: [
      [0, BASE_POSE],
      [.18, [-.045, -.022, -.23, 1.01, 1, 1]],
      [.43, [-.13, -.027, -.65, 1.015, 1, 1]],
      [.72, [-.128, .019, -1.29, 1.04, .88, .86]],
      [1, [-.123, .025, -1.41, 1.03, .79, .77]],
    ],
    gesture: [
      [0, BASE_POSE],
      [.27, [-.025, .004, -.059, 1.03, .985, 1]],
      [.47, [.035, .016, .103, 1.03, .96, 1]],
      [.7, [.025, .011, .04, 1.005, .985, 1]],
      [1, BASE_POSE],
    ],
    guard: [
      [0, BASE_POSE],
      [.19, [-.06, .017, -.064, 1.04, .93, 1]],
      [.43, [-.05, .019, -.069, 1.05, .922, 1]],
      [.72, [-.059, .012, -.055, 1.035, .94, 1]],
      [1, BASE_POSE],
    ],
    hop: [
      [0, BASE_POSE],
      [.2, [-.027, .017, -.058, 1.125, .86, 1]],
      [.42, [.002, -.19, .04, .90, 1.115, 1]],
      [.62, [.029, -.105, .1, .96, 1.035, 1]],
      [.77, [.049, .018, .042, 1.12, .88, 1]],
      [1, BASE_POSE],
    ],
    roar: [
      [0, BASE_POSE],
      [.2, [-.024, .019, -.095, 1.05, .92, 1]],
      [.41, [.035, -.041, .068, .98, 1.095, 1]],
      [.62, [.033, -.037, .045, 1.02, 1.058, 1]],
      [.81, [-.004, .008, -.009, 1.02, .99, 1]],
      [1, BASE_POSE],
    ],
  };

  const aliases = {
    run: 'walk', hit: 'hurt', death: 'fall', defeat: 'fall', nod: 'gesture',
    flinch: 'hurt', float: 'idle', bow: 'gesture', dash: 'attack', slash: 'attack',
    strike: 'attack', magic: 'cast', interact: 'talk', skill: 'cast', blink: 'idle',
    breathe: 'idle', alert: 'guard', stomp: 'slam', jump: 'hop', howl: 'roar', 'chalawan-bite': 'attack',
  };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
  }

  function smooth(weight) {
    return weight * weight * (3 - 2 * weight);
  }

  function blendTrack(track, phase) {
    for (let index = 1; index < track.length; index += 1) {
      const [endTime, endPose] = track[index];
      if (phase > endTime) continue;
      const [startTime, startPose] = track[index - 1];
      const weight = smooth((phase - startTime) / (endTime - startTime));
      return startPose.map((value, channel) => value + (endPose[channel] - value) * weight);
    }
    return track.at(-1)[1];
  }

  function actorTraits(actor) {
    const text = (actor.id + ' ' + (actor.style ?? '')).toLowerCase();
    return {
      spirit: /spirit|ghost|wisp|forest|phi/.test(text) && !/tamarind|pod/.test(text),
      rock: /rock|stone|guardian|arak|sila/.test(text),
      pod: /fruit|tamarind|makham|pod/.test(text),
      monkey: /monkey|macaque|ling/.test(text),
      spear: actor.style === 'guard',
      strikeSide: /khram|kram|watchman/.test(text) || actor.style === 'guard' ? -1 : 1,
    };
  }

  function identifyMotion(motion, traits) {
    const id = motion?.id ?? 'idle';
    if (traits.rock && id === 'attack') return 'slam';
    return aliases[id] ?? id;
  }

  function poseFor(type, phase, traits) {
    const angle = phase * TAU;
    if (type === 'walk') {
      const shift = Math.sin(angle);
      const lift = Math.abs(Math.sin(angle));
      return [.049 * shift, -.03 * lift + (traits.spirit ? -.042 : 0), .059 * shift,
        1 - .025 * lift, 1 + .024 * lift, 1];
    }
    if (type === 'idle') {
      const breath = (1 - Math.cos(angle)) / 2;
      const float = traits.spirit ? -.04 - .037 * breath : -.009 * breath;
      return [.008 * Math.sin(angle), float, (traits.rock ? .009 : .024) * Math.sin(angle),
        1 - (traits.pod ? .067 : .025) * breath, 1 + (traits.pod ? .055 : .024) * breath, 1];
    }
    if (type === 'talk') {
      const pulse = Math.sin(angle * 3);
      return [.012 * pulse, -.012 * Math.abs(pulse), .038 * pulse,
        1.01 + .014 * pulse, 1 - .015 * pulse, 1];
    }
    const pose = blendTrack(tracks[type] ?? tracks.gesture, phase);
    if (type === 'attack' && traits.monkey) {
      const [x, y, turn, stretchX, stretchY, alpha] = pose;
      return [x * 1.25, y - .08 * Math.max(0, Math.sin(phase * Math.PI)), turn * .75, stretchX, stretchY, alpha];
    }
    if (type === 'attack' && traits.strikeSide === -1) {
      const [x, y, turn, ...remainder] = pose;
      return [-x, y, -turn, ...remainder];
    }
    return pose;
  }

  function ellipse(ctx, x, y, radiusX, radiusY) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.1, radiusX), Math.max(.1, radiusY), 0, 0, TAU);
  }

  function paintBackdrop(ctx, width, height, palette, groundY) {
    const wall = ctx.createRadialGradient(width * .5, height * .52, height * .04, width * .5, height * .51, width * .68);
    wall.addColorStop(0, palette.light);
    wall.addColorStop(1, palette.wall);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, width, height);

    const horizon = height * .53;
    const ground = ctx.createLinearGradient(0, horizon, 0, height);
    ground.addColorStop(0, palette.floor + '00');
    ground.addColorStop(1, palette.floor);
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, width, height - horizon);

    ctx.save();
    ctx.strokeStyle = palette.grid;
    ctx.globalAlpha = .12;
    ctx.lineWidth = 1;
    const floorTop = horizon + 12;
    ctx.beginPath();
    for (const fraction of [.055, .115, .208, .337, .523, .768, 1]) {
      const y = Math.round(floorTop + (height - floorTop) * fraction) + .5;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    for (let line = -9; line <= 9; line += 1) {
      ctx.moveTo(width * .5 + line * width * .033, floorTop);
      ctx.lineTo(width * .5 + line * width * .13, height);
    }
    ctx.stroke();
    ctx.globalAlpha = .18;
    ellipse(ctx, width / 2, groundY, Math.min(width * .28, height * .27), height * .057);
    ctx.stroke();
    ctx.globalAlpha = .22;
    ctx.setLineDash([3, 5]);
    ellipse(ctx, width / 2, groundY, Math.min(width * .247, height * .235), height * .049);
    ctx.stroke();
    ctx.restore();
  }

  function paintShadow(ctx, x, y, imageWidth, imageHeight, unitLift, palette, type, phase) {
    const falling = type === 'fall' ? phase : 0;
    const radiusX = imageWidth * (.33 + .37 * falling) * (1 + unitLift * .85);
    const radiusY = imageHeight * (.027 + falling * .012);
    const shadow = ctx.createRadialGradient(x, y + 2, 0, x, y + 2, Math.max(1, radiusX));
    shadow.addColorStop(0, palette.shadow + 'b9');
    shadow.addColorStop(.56, palette.shadow + '65');
    shadow.addColorStop(1, palette.shadow + '00');
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, radiusY / Math.max(1, radiusX));
    ctx.translate(-x, -y - 2);
    ctx.globalAlpha = clamp(.95 + unitLift * 2.7, .27, .88);
    ctx.fillStyle = shadow;
    ellipse(ctx, x, y + 2, radiusX, radiusX);
    ctx.fill();
    ctx.restore();
  }

  function pulseFloor(ctx, x, y, height, phase, color) {
    if (phase < 0 || phase > 1) return;
    const radius = height * (.13 + phase * .43);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, height / 170);
    ctx.globalAlpha = (1 - phase) * .78;
    ellipse(ctx, x, y, radius, radius * .27);
    ctx.stroke();
    ctx.restore();
  }

  function drawSpecks(ctx, x, y, height, phase, color, spread, amount) {
    if (phase < 0 || phase > 1) return;
    const opacity = Math.sin(Math.PI * Math.max(.04, phase)) * (1 - phase * .37);
    ctx.save();
    ctx.fillStyle = color;
    for (let index = 0; index < amount; index += 1) {
      const angle = index * 2.399963;
      const reach = height * spread * (.25 + ((index * 7) % 13) / 15) * (.4 + phase * .72);
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach * .58 - height * phase * .062;
      const size = Math.max(1, Math.round(height / 122 * (1 + index % 3 * .52)));
      ctx.globalAlpha = opacity * (.47 + index % 3 * .23);
      ctx.fillRect(Math.round(x + dx), Math.round(y + dy), size, size);
    }
    ctx.restore();
  }

  function drawSlash(ctx, x, y, height, progress, color) {
    if (progress < 0 || progress > 1) return;
    const alpha = Math.sin(progress * Math.PI) * .88;
    const travel = progress * height * .13;
    ctx.save();
    ctx.translate(x + travel, y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * .35;
    ctx.lineWidth = height * .05;
    ctx.beginPath();
    ctx.moveTo(-height * .029, -height * .66);
    ctx.quadraticCurveTo(height * .65, -height * .54, height * .27, -height * .25);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff4c9';
    ctx.lineWidth = Math.max(1, height * .012);
    ctx.beginPath();
    ctx.moveTo(height * .15, -height * .619);
    ctx.quadraticCurveTo(height * .616, -height * .49, height * .29, -height * .255);
    ctx.stroke();
    ctx.restore();
    drawSpecks(ctx, x + height * .34, y - height * .39, height, progress, color, .23, 9);
  }

  function drawThrust(ctx, height, progress) {
    if (progress < 0 || progress > 1) return;
    const reach = height * (.21 + progress * .22);
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, height * .009);
    for (let line = 0; line < 3; line += 1) {
      ctx.globalAlpha = Math.sin(progress * Math.PI) * (.8 - line * .19);
      ctx.beginPath();
      ctx.moveTo(reach - line * height * .07, -height * (.71 - line * .04));
      ctx.lineTo(reach + height * (.23 - line * .051), -height * (.53 - line * .032));
      ctx.stroke();
    }
    ctx.restore();
    drawSpecks(ctx, reach + height * .23, -height * .53, height, progress, gold, .17, 6);
  }

  function drawGlints(ctx, x, y, height, phase, color) {
    ctx.save();
    ctx.fillStyle = color;
    for (let index = 0; index < 3; index += 1) {
      const shine = (1 - Math.cos((phase - index / 6) * TAU)) / 2;
      const size = height * (.012 + .01 * shine);
      ctx.globalAlpha = .28 + .65 * shine;
      ctx.translate(x + index * height * .05, y - index * height * .041);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-x - index * height * .05, -y + index * height * .041);
    }
    ctx.restore();
  }

  function drawFloorEffects(ctx, type, phase, x, y, height, traits) {
    if (type === 'cast') {
      pulseFloor(ctx, x, y, height, (phase - .16) / .76, jade);
      pulseFloor(ctx, x, y, height, (phase - .47) / .53, gold);
    }
    if (type === 'slam') pulseFloor(ctx, x, y, height, (phase - .50) / .47, gold);
    if (type === 'roar') pulseFloor(ctx, x, y, height, (phase - .34) / .58, traits.rock ? gold : copper);
    if (type === 'hop' || type === 'walk' || type === 'fall') {
      const progress = type === 'hop' ? (phase - .72) / .28 : type === 'fall' ? (phase - .59) / .35 : ((phase + .24) % .5) * 3.3;
      if (!traits.spirit) drawSpecks(ctx, x, y, height, progress, copper, .23, 6);
    }
  }

  function drawAirEffects(ctx, type, phase, x, y, height, actor, traits, stageWidth) {
    if (type === 'attack' && (actor.group === 'player' || actor.group === 'npc')) {
      const progress = (phase - .31) / .38;
      const available = traits.strikeSide > 0 ? stageWidth - x : x;
      const widthScale = Math.min(1, Math.max(.2, (available - 8) / (height * .76)));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(traits.strikeSide * widthScale, 1);
      if (traits.spear) drawThrust(ctx, height, progress);
      else drawSlash(ctx, 0, 0, height, progress, gold);
      ctx.restore();
    }
    if (type === 'attack' && actor.group === 'monster') {
      drawSpecks(ctx, x + height * .26, y - height * .36, height, (phase - .32) / .32, traits.spirit ? jade : copper, .28, 11);
    }
    if (type === 'cast') {
      drawSpecks(ctx, x, y - height * .43, height, (phase - .18) / .79, jade, .44, 19);
    }
    if (type === 'hurt') {
      drawSpecks(ctx, x + height * .12, y - height * .68, height, phase * 1.6, '#ffd6a6', .34, 13);
    }
    if (type === 'slam' || type === 'roar') {
      const start = type === 'slam' ? .50 : .34;
      drawSpecks(ctx, x, y - height * .12, height, (phase - start) / .48, copper, .58, 16);
    }
    if (type === 'talk' || type === 'gesture') {
      drawGlints(ctx, x + height * .225, y - height * .88, height, phase, gold);
    }
    if (type === 'guard' && phase > .15 && phase < .83) {
      const progress = (phase - .15) / .68;
      ctx.save();
      ctx.strokeStyle = jade;
      ctx.lineWidth = Math.max(1, height / 105);
      ctx.globalAlpha = Math.sin(progress * Math.PI) * .56;
      ctx.beginPath();
      ctx.ellipse(x + height * .15, y - height * .42, height * .24, height * .33, -.16, -1.03, 1.08);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawImageWarp(ctx, image, rect, left, top, width, height, phase, stride, spirit) {
    const [sourceX, sourceY, sourceWidth, sourceHeight] = rect;
    const stripCount = spirit ? 24 : 16;
    const walkShift = Math.sin(phase * TAU);
    for (let index = 0; index < stripCount; index += 1) {
      const start = index / stripCount;
      const end = (index + 1) / stripCount;
      const y = top + height * start;
      const stripHeight = height * (end - start) + (index < stripCount - 1 ? .6 : 0);
      const offset = spirit ? Math.sin(phase * TAU + start * 5) * width * .055 * start * start
        : walkShift * width * .018 * (1 - start);
      const pos = left + offset;
      const sourceStripY = sourceY + sourceHeight * start;
      const sourceStripHeight = sourceHeight * (end - start);
      if (stride && start >= .75) {
        const near = ((start - .75) * 4) ** 2;
        const far = ((end - .75) * 4) ** 2;
        const legTravel = walkShift * width * .09 * near;
        const leftLift = Math.max(0, walkShift) * height * .075;
        const rightLift = Math.max(0, -walkShift) * height * .075;
        ctx.drawImage(image, sourceX, sourceStripY, sourceWidth / 2, sourceStripHeight,
          pos - legTravel, y - leftLift * near, width / 2, stripHeight - leftLift * (far - near));
        ctx.drawImage(image, sourceX + sourceWidth / 2, sourceStripY, sourceWidth / 2, sourceStripHeight,
          pos + width / 2 + legTravel, y - rightLift * near, width / 2, stripHeight - rightLift * (far - near));
      } else {
        ctx.drawImage(image, sourceX, sourceStripY, sourceWidth, sourceStripHeight, pos, y, width, stripHeight);
      }
    }
  }

  function paintActor(ctx, image, actor, frame) {
    const { x, y, width, height, pose, type, phase, traits } = frame;
    const [, , tilt, stretchX, stretchY, opacity] = pose;
    const [anchorX, anchorY] = actor.anchor ?? [.5, .98];
    const left = -width * anchorX;
    const top = -height * anchorY;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(tilt);
    ctx.scale(stretchX, stretchY);
    ctx.imageSmoothingEnabled = false;
    if (actor.clip?.length > 2) {
      ctx.beginPath();
      actor.clip.forEach(([clipX, clipY], index) => {
        const x = left + width * clipX;
        const y = top + height * clipY;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
    }
    if (type === 'hurt' && phase > .055 && phase < .27) ctx.filter = 'saturate(.64) brightness(1.24)';
    const stride = type === 'walk' && actor.group === 'player';
    if (stride || traits.spirit) {
      drawImageWarp(ctx, image, actor.rect, left, top, width, height, phase, stride, traits.spirit);
    } else {
      ctx.drawImage(image, ...actor.rect, Math.round(left), Math.round(top), Math.round(width), Math.round(height));
    }
    ctx.restore();
  }

  function fitActor(actor, pose, ratio, type, stageWidth, stageHeight, groundY, zoom) {
    const [localX, localY, tilt, stretchX, stretchY] = pose;
    const [anchorX, anchorY] = actor.anchor ?? [.5, .98];
    const width = ratio * stretchX;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const corners = [
      [-width * anchorX, -stretchY * anchorY],
      [width * (1 - anchorX), -stretchY * anchorY],
      [width * (1 - anchorX), stretchY * (1 - anchorY)],
      [-width * anchorX, stretchY * (1 - anchorY)],
    ].map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
    const minX = Math.min(...corners.map(([x]) => x));
    const maxX = Math.max(...corners.map(([x]) => x));
    const minY = Math.min(...corners.map(([, y]) => y));
    const maxY = Math.max(...corners.map(([, y]) => y));
    const margin = clamp(stageWidth * .034, 10, 18);
    const topMargin = Math.min(49, stageHeight * .15);
    const fallSpan = type === 'fall' ? Math.hypot(ratio, 1) : ratio;
    const naturalHeight = Math.min(stageHeight * .63 * (actor.height || 1), stageWidth * .63 / fallSpan);
    const height = Math.min(naturalHeight * zoom, stageHeight * .765,
      (stageWidth - 2 * margin) / (maxX - minX), (stageHeight - topMargin - margin) / (maxY - minY));
    return {
      width: height * ratio,
      height,
      x: clamp(stageWidth / 2 + height * localX, margin - height * minX, stageWidth - margin - height * maxX),
      y: clamp(groundY + height * localY, topMargin - height * minY, stageHeight - margin - height * maxY),
    };
  }

  function create(canvas, requestDraw = () => {}) {
    const ctx = canvas.getContext('2d');
    const images = new Map();
    const heavy = window.AyothayaHeavyEffect;
    const heavyEffect = heavy?.create(requestDraw);
    const sweepEffect = window.AyothayaSweepEffect?.create(requestDraw);
    const guardEffect = window.AyothayaGuardEffect?.create(requestDraw);
    const healEffect = window.AyothayaHealEffect?.create(requestDraw);
    const interruptEffect = window.AyothayaInterruptEffect?.create(requestDraw);
    const pretSlamEffect = window.AyothayaPretSlamEffect?.create(requestDraw);
    const chalawanEffect = window.AyothayaChalawanEffect;
    const chalawanSweepEffect = chalawanEffect?.create(requestDraw);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const piercing = window.AyothayaPiercingEffect;
    const piercingEffects = { dash: piercing?.create('dash', requestDraw), thrust: piercing?.create('thrust', requestDraw) };

    function load(src) {
      if (images.has(src)) return images.get(src);
      const image = new Image();
      const record = { image, state: 'loading' };
      image.decoding = 'async';
      image.addEventListener('load', () => {
        record.state = 'ready';
        requestDraw();
      }, { once: true });
      image.addEventListener('error', () => {
        record.state = 'error';
        requestDraw();
      }, { once: true });
      images.set(src, record);
      image.src = src;
      return record;
    }

    function drawPracticeTarget(record, x, y, sinceHit, unit, palette, direction = 1) {
      const recoil = sinceHit >= 0 && sinceHit < .13 ? Math.sin(sinceHit / .13 * Math.PI) : 0;
      const targetSize = Math.round(58 * unit);
      paintShadow(ctx, x, y, 30 * unit, 32 * unit, 0, palette, 'idle', 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (recoil) ctx.filter = 'brightness(1.28)';
      ctx.drawImage(record.image, 192, 96, 96, 96, Math.round(x - targetSize / 2 + direction * 4 * unit * recoil),
        Math.round(y - targetSize * 86 / 96), targetSize, targetSize);
      ctx.restore();
    }

    function drawContactPreview(record, actor, skill, elapsed, width, height, groundY, zoom, palette) {
      const interrupt = skill === 'interrupt';
      const unit = Math.min(height / 160, width / 240) * zoom;
      const playerX = width / 2 - 22 * unit;
      const swingDuration = interrupt ? .36 : (heavy?.previewSwingDuration ?? .46);
      const impactTime = swingDuration * window.AyothayaGame.strikePhase;
      const approach = interrupt ? 9 * (1 - clamp(elapsed / impactTime, 0, 1)) : 0;
      const targetX = width / 2 + (19 + approach) * unit;
      const progress = elapsed < swingDuration ? elapsed / swingDuration : null;
      const [lean, lift] = progress === null ? BASE_POSE : poseFor('attack', progress, actorTraits(actor));
      const sinceHit = elapsed - impactTime;
      const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);

      paintShadow(ctx, playerX, groundY, 30 * unit, 48 * unit, 0, palette, 'idle', 0);
      drawPracticeTarget(record, targetX, groundY, sinceHit, unit, palette);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(playerX + lean * 48 * unit), Math.round(groundY + lift * 48 * unit));
      drawPlayer(ctx, { ...actor, attackStyle: skill }, {
        dir: 'e', bearing: 0, walking: false, phase: 0, progress, size: 64 * unit, heavyEffect,
      });
      ctx.restore();
      const sprite = interrupt ? interruptEffect : heavyEffect;
      sprite?.drawImpact(ctx, sinceHit, targetX, groundY - 23 * unit, unit);
    }

    function drawSweepPreview(record, actor, elapsed, width, height, groundY, zoom, palette) {
      const unit = Math.min(Math.min(height / 170, width / 220) * zoom, height / 125, width / 170);
      const x = width / 2;
      const y = groundY - 15 * unit;
      const centerY = y - 23 * unit;
      const swingDuration = .43;
      const progress = elapsed < swingDuration ? elapsed / swingDuration : null;
      const sinceHit = elapsed - swingDuration * window.AyothayaGame.strikePhase;
      const targets = [
        { x: x + 38 * unit, y: y - 34 * unit, direction: 1 },
        { x: x - 54 * unit, y: y + 4 * unit, direction: -1 },
        { x: x + 55 * unit, y: y + 9 * unit, direction: 1 },
      ];
      const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);

      paintShadow(ctx, x, y, 30 * unit, 48 * unit, 0, palette, 'idle', 0);
      sweepEffect?.draw(ctx, sinceHit, x, centerY, 68 * unit, 29 * unit, true);
      const rear = targets[0];
      drawPracticeTarget(record, rear.x, rear.y, sinceHit, unit, palette, rear.direction);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      drawPlayer(ctx, { ...actor, attackStyle: 'sweep' }, {
        dir: 'se', bearing: Math.PI / 4, walking: false, phase: 0, progress, size: 64 * unit,
      });
      ctx.restore();
      for (const target of targets.slice(1)) drawPracticeTarget(record, target.x, target.y, sinceHit, unit, palette, target.direction);
      sweepEffect?.draw(ctx, sinceHit, x, centerY, 68 * unit, 29 * unit, false);
      for (const target of targets) heavyEffect?.drawImpact(ctx, sinceHit, target.x, target.y - 23 * unit, unit * .78);
    }

    function drawGuardPreview(record, actor, elapsed, width, height, groundY, zoom, palette) {
      const unit = Math.min(height / 160, width / 220) * zoom;
      const x = width / 2 - 23 * unit;
      const sinceHit = elapsed - .56;
      const rush = Math.max(0, 1 - Math.abs(sinceHit) / .19);
      const recoil = sinceHit >= 0 && sinceHit < .16 ? Math.sin(Math.PI * sinceHit / .16) : 0;
      const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);

      paintShadow(ctx, x, groundY, 30 * unit, 48 * unit, 0, palette, 'idle', 0);
      guardEffect?.drawShield(ctx, elapsed, x, groundY - 27 * unit, unit, 1.05 - elapsed);
      drawPracticeTarget(record, width / 2 + (37 - 14 * rush) * unit, groundY, -1, unit, palette);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x - 3 * recoil * unit), Math.round(groundY));
      drawPlayer(ctx, actor, { dir: 'e', bearing: 0, walking: false, phase: 0, progress: null, size: 64 * unit });
      ctx.restore();
      guardEffect?.drawImpact(ctx, sinceHit, x + 26 * unit, groundY - 27 * unit, unit, false);
    }

    function drawHealPreview(record, actor, elapsed, width, height, groundY, zoom, palette) {
      const unit = Math.min(height / 160, width / 220) * zoom;
      const x = width / 2;
      const lift = elapsed < .38 ? 2 * Math.sin(elapsed / .38 * Math.PI) * unit : 0;
      const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);

      paintShadow(ctx, x, groundY, 30 * unit, 48 * unit, 0, palette, 'idle', 0);
      healEffect?.draw(ctx, elapsed, x, groundY, unit);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(groundY - lift));
      drawPlayer(ctx, actor, { dir: 's', bearing: Math.PI / 2, walking: false, phase: 0, progress: null, size: 64 * unit });
      ctx.restore();
    }

    function drawPiercingPreview(record, actor, skill, elapsed, width, height, groundY, zoom, palette) {
      const dash = skill === 'dash';
      const sprite = piercingEffects[skill];
      const unit = Math.min(Math.min(height / 166, width / 225) * zoom, height / 124, width / 200);
      const startX = width / 2 - (dash ? 66 : 29) * unit;
      const targetX = width / 2 + 28 * unit;
      const arrivalX = dash ? targetX + window.AyothayaGame.dashOvershoot * unit : startX;
      const duration = dash ? .42 : .36;
      const sinceHit = elapsed - duration * window.AyothayaGame.strikePhase;
      const progress = elapsed < duration ? elapsed / duration : null;
      const playerX = sinceHit >= 0 ? arrivalX : startX;
      const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);
      const trailY = groundY - (dash ? 23 : 15) * unit;

      paintShadow(ctx, playerX, groundY, 30 * unit, 48 * unit, 0, palette, 'idle', 0);
      sprite?.drawTrail(ctx, sinceHit, [startX, trailY], [dash ? arrivalX : targetX, trailY], unit);
      drawPracticeTarget(record, targetX, groundY, sinceHit, unit, palette);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(playerX), Math.round(groundY));
      drawPlayer(ctx, { ...actor, attackStyle: skill }, {
        dir: 'e', bearing: 0, walking: false, phase: 0, progress, size: 64 * unit, piercingEffect: sprite,
      });
      ctx.restore();
      sprite?.drawImpact(ctx, sinceHit, [targetX, dash ? groundY - 19 * unit : trailY], 0, unit);
    }

    function drawPretSlamPreview(record, actor, elapsed, width, height, groundY, zoom, palette) {
      const slam = window.AyothayaGame.pretSlam;
      const unit = Math.min(width / 340, height / 240) * Math.min(zoom, 1.18);
      const x = width / 2;
      const y = groundY - 36 * unit;
      const artHeight = 119 * unit;
      const artWidth = artHeight * actor.rect[2] / actor.rect[3];
      const project = (dx, dy, height = 0) => [x + dx * .80 * unit, y + (dy * .41 - height) * unit];
      const { stretchX, stretchY } = pretSlamEffect.pose(slam, elapsed);
      pretSlamEffect.ground(ctx, project, unit, slam, elapsed, reducedMotion.matches);
      paintShadow(ctx, x, y, artWidth, artHeight, 0, palette, 'idle', 0);
      paintActor(ctx, record.image, actor, { x, y, width: artWidth, height: artHeight,
        pose: [0, 0, 0, stretchX, stretchY, 1], type: 'idle', phase: 0, traits: actorTraits(actor) });

      const player = load('assets/sprites.png');
      if (player.state === 'ready') {
        const [px, py] = project(86, 39);
        const hitAge = elapsed - slam.windup;
        const drawPlayer = player.drawPlayer ??= window.AyothayaPlayerSprite.create(player.image);
        paintShadow(ctx, px, py, 32 * unit, 48 * unit, 0, palette, 'idle', 0);
        ctx.save();
        ctx.translate(Math.round(px), Math.round(py));
        if (hitAge >= 0 && hitAge < slam.stunTime) ctx.rotate(.19);
        drawPlayer(ctx, { weapon: 'rusty_sword' }, { dir: 'w', bearing: Math.PI,
          size: 54 * unit, progress: null, walking: false, phase: 0 });
        ctx.restore();
        if (hitAge >= 0 && hitAge < .38) {
          ctx.save();
          ctx.fillStyle = '#f5c6ff';
          ctx.strokeStyle = '#442733';
          ctx.lineWidth = 3;
          ctx.font = '700 ' + Math.round(11 * unit) + 'px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeText('สตัน', px, py - 48 * unit);
          ctx.fillText('สตัน', px, py - 48 * unit);
          ctx.restore();
        }
      }
      pretSlamEffect.foreground(ctx, project, unit, slam, elapsed, reducedMotion.matches);
    }

    function drawChalawanPreview(record, actor, motion, elapsed, width, height, groundY, zoom, palette) {
      const { slam, entranceDuration } = window.AyothayaGame.chalawan;
      const entrance = motion.id === 'chalawan-entrance';
      const unit = Math.min(width / 320, height / (entrance ? 300 : 210)) * Math.min(zoom, 1.16);
      const x = width / 2;
      const y = groundY - 15 * unit;
      if (entrance) {
        const source = [x + 94 * unit, y - 67 * unit];
        const landing = [x - 42 * unit, y];
        ellipse(ctx, ...source, 47 * unit, 15 * unit);
        ctx.fillStyle = 'rgba(75,153,145,.31)';
        ctx.fill();
        chalawanEffect.entrance(ctx, source, landing, elapsed, entranceDuration, unit, reducedMotion.matches, (size, headLeft) => {
          const artHeight = size * actor.rect[3] / actor.rect[2];
          if (headLeft) ctx.scale(-1, 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(record.image, ...actor.rect, -size / 2, -artHeight, size, artHeight);
        });
        return;
      }

      const project = (dx, dy) => [x + dx * .7 * unit, y + dy * .39 * unit];
      const artWidth = 129 * unit;
      const artHeight = artWidth * actor.rect[3] / actor.rect[2];
      const progress = clamp(elapsed / (slam.windup + slam.recovery), 0, 1);
      const tilt = reducedMotion.matches ? 0 : Math.sin(progress * TAU) * .19;
      chalawanSweepEffect.ground(ctx, project, slam, elapsed, reducedMotion.matches);
      paintShadow(ctx, x, y, artWidth, artHeight, 0, palette, 'idle', 0);
      paintActor(ctx, record.image, actor, { x, y, width: artWidth, height: artHeight,
        pose: [0, 0, tilt, 1, 1, 1], type: 'idle', phase: 0, traits: actorTraits(actor) });
      chalawanSweepEffect.foreground(ctx, project, slam, elapsed, reducedMotion.matches);
    }

    function draw(actor, motion, elapsed, { zoom = 1, ground = 'dark' } = {}) {
      if (!ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
      const palette = ground === 'light' ? LIGHT : DARK;
      const groundY = height * .84;
      paintBackdrop(ctx, width, height, palette, groundY);
      if (!actor) return;

      const record = load(actor.src);
      if (record.state !== 'ready') {
        ctx.fillStyle = palette.ink;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(record.state === 'error' ? 'โหลดภาพตัวละครไม่สำเร็จ' : 'กำลังโหลดภาพตัวละคร…', width / 2, height / 2);
        return;
      }

      if (actor.weapon && (motion?.id === 'heavy' || motion?.id === 'interrupt')) {
        drawContactPreview(record, actor, motion.id, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (motion?.id === 'sweep' && actor.weapon) {
        drawSweepPreview(record, actor, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (motion?.id === 'guard-skill' && actor.weapon) {
        drawGuardPreview(record, actor, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (motion?.id === 'heal' && actor.weapon) {
        drawHealPreview(record, actor, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (actor.weapon && (motion?.id === 'dash' || motion?.id === 'thrust')) {
        drawPiercingPreview(record, actor, motion.id, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (motion?.id === 'pret-slam' && pretSlamEffect) {
        drawPretSlamPreview(record, actor, elapsed, width, height, groundY, zoom, palette);
        return;
      }
      if (chalawanEffect && (motion?.id === 'chalawan-entrance' || motion?.id === 'tail-sweep')) {
        drawChalawanPreview(record, actor, motion, elapsed, width, height, groundY, zoom, palette);
        return;
      }

      const traits = actorTraits(actor);
      const phase = clamp((elapsed || 0) / (motion?.duration || 1), 0, 1);
      const collapse = motion?.id === 'chalawan-fall' ? chalawanEffect?.collapsePose(phase) : null;
      const type = collapse ? 'idle' : identifyMotion(motion, traits);
      const pose = collapse ? [0, 0, collapse.tilt, collapse.stretchX, collapse.stretchY, 1] : poseFor(type, phase, traits);
      const [, , artWidth, artHeight] = actor.rect;
      const frame = fitActor(actor, pose, artWidth / artHeight, type, width, height, groundY, zoom);
      const { x, y, width: imageWidth, height: imageHeight } = frame;
      drawFloorEffects(ctx, type, phase, x, groundY, imageHeight, traits);
      paintShadow(ctx, x, groundY, imageWidth, imageHeight, (y - groundY) / imageHeight, palette, type, phase);
      if (actor.weapon) {
        const drawPlayer = record.drawPlayer ??= window.AyothayaPlayerSprite.create(record.image);
        ctx.save();
        ctx.translate(x, y);
        ctx.imageSmoothingEnabled = false;
        drawPlayer(ctx, actor, { dir: type === 'idle' ? 's' : 'se', bearing: Math.PI / 4,
          walking: type === 'walk', phase: phase * TAU * 2,
          progress: type === 'attack' ? phase : null, size: imageHeight * 96 / artHeight });
        ctx.restore();
        return;
      }
      paintActor(ctx, record.image, actor, { ...frame, pose, type, phase, traits });
      drawAirEffects(ctx, type, phase, x, y, imageHeight, actor, traits, width);
    }

    return { draw };
  }

  window.AyothayaPreviewStage = { create };
})();
