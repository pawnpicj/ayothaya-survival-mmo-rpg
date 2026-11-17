/* The player atlas supplies the body and right arm. Equipment is drawn at the grip. */
(function () {
  'use strict';

  const { strikePhase } = window.AyothayaGame;
  const CELL = 96;
  const MARGIN = 24;
  const SIZE = CELL + MARGIN * 2;
  const BODY = {
    s: { column: 0, shoulder: [37,45], grip: [33,62], idleArm: .08,
      arm: [[34,43],[39,44],[40,49],[37,55],[36,59],[37,63],[34,65],[28,65],[27,59],[29,52]],
      oldBlade: [[55,61],[60,61],[63,65],[66,75],[62,77],[59,72],[57,66]], mirror: true },
    w: { column: 1, shoulder: [40,48], armSource: 'e', idleArm: .47,
      oldBlade: [[43,61],[47,61],[49,64],[51,69],[55,74],[52,77],[48,73],[45,67]] },
    e: { column: 2, shoulder: [44,46], grip: [44,65], idleArm: -.22,
      arm: [[41,44],[48,45],[50,48],[49,53],[47,57],[47,61],[50,63],[49,67],[45,69],[40,68],[38,61],[38,53]],
      underArm: [[38,48],[44,46],[48,52],[46,58],[45,63],[47,68],[42,70],[39,68],[38,63],[39,57],[37,53]],
      oldBlade: [[49,60],[53,62],[52,67],[50,71],[47,76],[44,76],[45,71],[47,66]] },
    n: { column: 3, shoulder: [61,45], grip: [66,62], idleArm: -.08,
      arm: [[60,43],[64,44],[68,49],[69,54],[71,58],[71,64],[67,66],[63,64],[63,59],[61,53],[60,50]],
      oldBlade: [[40,60],[44,61],[42,66],[39,74],[35,74],[36,69],[37,63]], mirror: true },
  };
  // Diagonals use the matching side view with their own sword angle.
  const VIEWS = {
    s: ['s', 2.49, -1], sw: ['w', 2.46, -1], w: ['w', 2.62, -1], nw: ['w', 2.78, -1],
    n: ['n', .60, 1], ne: ['e', .48, 1], e: ['e', .59, 1], se: ['e', .68, 1],
  };
  const BLADES = {
    rusty_sword: { length: 27, profile: [[3,-2],[20,-2],[27,-4],[24,1],[18,3],[3,3]],
      face: '#9ca8ae', edge: '#e3ecdf', guard: '#b0844f', spine: '#62686c' },
    bronze_sword: { length: 30, profile: [[3,-2],[21,-3],[30,-6],[27,0],[20,3],[3,4]],
      face: '#bc8b4d', edge: '#fff0ac', guard: '#e4af55', spine: '#7e5037' },
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const ease = t => t * t * (3 - 2 * t);
  const turn = (start, end, t) => start + Math.atan2(Math.sin(end - start), Math.cos(end - start)) * ease(t);

  function makeCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas;
  }

  function path(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  }

  function fill(ctx, points, color) {
    path(ctx, points);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function prepareBody(atlas, info) {
    const body = makeCanvas(CELL);
    const ctx = body.getContext('2d');
    ctx.drawImage(atlas, info.column * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
    const arm = makeCanvas(CELL);
    if (info.arm) {
      const hand = arm.getContext('2d');
      path(hand, info.arm);
      hand.clip();
      // Keep the original wrist. The fist is drawn over the equipped handle.
      const wrist = info.grip[1] - 2;
      hand.drawImage(body, 0, 0, CELL, wrist, 0, 0, CELL, wrist);
    }

    ctx.save();
    path(ctx, info.oldBlade);
    ctx.clip();
    if (info.mirror) {
      ctx.clearRect(0, 0, CELL, CELL);
      ctx.translate(CELL, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(atlas, info.column * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
    } else {
      const west = info.column === 1;
      ctx.fillStyle = '#24213a';
      ctx.fillRect(0, 0, CELL, CELL);
      fill(ctx, [[44,61],[51,62],[51,66],[46,72],[west?52:43,73]], '#38344f');
    }
    ctx.restore();

    if (info.arm) {
      ctx.globalCompositeOperation = 'destination-out';
      fill(ctx, info.arm, '#000');
      if (info.underArm) {
        ctx.globalCompositeOperation = 'destination-over';
        fill(ctx, [[38,60],[47,59],[48,68],[43,71],[39,68]], '#27223b');
        fill(ctx, info.underArm, '#492a31');
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    return { body, arm };
  }

  function bladeAngle(idle, aim, swingDirection, progress) {
    const windEnd = .23;
    const followEnd = .59;
    const wind = aim - swingDirection * 1.65;
    const follow = aim + swingDirection * .95;
    if (progress < windEnd) return turn(idle, wind, progress / windEnd);
    if (progress < strikePhase) return turn(wind, aim, (progress - windEnd) / (strikePhase - windEnd));
    if (progress < followEnd) return turn(aim, follow, (progress - strikePhase) / (followEnd - strikePhase));
    return turn(follow, idle, (progress - followEnd) / (1 - followEnd));
  }

  function drawTrail(ctx, blade, progress, swingDirection, style) {
    if (progress < strikePhase || progress > .69) return;
    const radius = blade.length + (style === 'sweep' ? 8 : 3);
    const arc = swingDirection * (style === 'sweep' ? 1.5 : .88);
    ctx.save();
    ctx.globalAlpha = .85 * (1 - (progress - strikePhase) / (.69 - strikePhase));
    ctx.strokeStyle = style === 'dash' ? '#bcf5ff' : '#ffdb86';
    ctx.lineWidth = style === 'heavy' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -arc, -.12 * swingDirection, swingDirection < 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawBlade(ctx, blade, angle, progress, swingDirection, style) {
    ctx.save();
    ctx.rotate(angle);
    if (progress !== null) drawTrail(ctx, blade, progress, swingDirection, style);
    ctx.scale(1, swingDirection);
    path(ctx, blade.profile);
    ctx.strokeStyle = '#211d22';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = blade.face;
    ctx.fill();
    fill(ctx, [[3,-2],[blade.length-6,-2],blade.profile[2],
      [blade.length-9,0],[3,0]], blade.spine);
    fill(ctx, [[4,1],[blade.length-8,1],[blade.length-3,-1],[blade.length-6,2],[4,3]], blade.edge);

    ctx.fillStyle = '#251c20';
    ctx.fillRect(-8,-2,14,4);
    ctx.fillStyle = '#734835';
    ctx.fillRect(-7,-1,12,2);
    ctx.fillStyle = '#352720';
    ctx.fillRect(4,-4,4,8);
    ctx.fillStyle = blade.guard;
    ctx.fillRect(5,-3,2,6);
    ctx.fillRect(-8,-2,2,4);
    ctx.restore();
  }

  function drawGrip(ctx, angle, swingDirection) {
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(1, swingDirection);
    fill(ctx, [[-4,-2],[-2,-4],[1,-4],[4,-2],[4,1],[2,4],[-2,4],[-4,2]], '#2b1917');
    fill(ctx, [[-3,-1],[-2,-3],[0,-3],[3,-2],[3,1],[1,3],[-2,3],[-3,1]], '#b57450');
    fill(ctx, [[-2,-2],[-1,-3],[1,-3],[2,-2],[2,0],[0,1],[-2,1]], '#e8a775');
    ctx.fillStyle = '#8f5038';
    ctx.fillRect(-1,1,3,1);
    ctx.fillStyle = '#efb681';
    ctx.fillRect(1,-2,2,2);
    ctx.restore();
  }

  function create(atlas) {
    const stances = Object.fromEntries(Object.entries(BODY).map(([dir, info]) => [dir, prepareBody(atlas, info)]));
    const canvas = makeCanvas(SIZE);
    const scene = canvas.getContext('2d');
    scene.imageSmoothingEnabled = false;

    return function draw(ctx, actor, { dir, bearing, walking, phase, progress, size, heavyEffect }) {
      const [view, idle, swingDirection] = VIEWS[dir] ?? VIEWS.s;
      const stance = BODY[view];
      const source = BODY[stance.armSource ?? view];
      const { body } = stances[view];
      const { arm } = stances[stance.armSource ?? view];
      const blade = BLADES[actor.equipment?.weapon ?? actor.weapon] ?? BLADES.rusty_sword;
      const swinging = progress !== null;
      const useHeavySprite = swinging && actor.attackStyle === 'heavy' && heavyEffect?.ready;
      const walk = walking && !swinging ? Math.sin(phase * .5) : 0;
      const angle = swinging ? bladeAngle(idle, bearing, swingDirection, progress) : idle - walk * .10;
      const lift = clamp(Math.sin(angle - idle), -.8, .8);
      const armTurn = (stance.idleArm ?? 0) + (swinging ? lift : walk * .15);
      const [shoulderX, shoulderY] = source.shoulder;
      const [gripX, gripY] = source.grip;
      scene.clearRect(0, 0, SIZE, SIZE);
      scene.save();
      scene.translate(MARGIN, MARGIN);

      function drawRightArm() {
        scene.save();
        scene.translate(...stance.shoulder);
        scene.rotate(armTurn);
        scene.translate(gripX - shoulderX, gripY - shoulderY);
        const swordTurn = angle - armTurn;
        drawBlade(scene, blade, swordTurn, useHeavySprite ? null : progress, swingDirection, actor.attackStyle);
        scene.drawImage(arm, -gripX, -gripY);
        drawGrip(scene, swordTurn, swingDirection);
        scene.restore();
      }

      if (stance.armSource) drawRightArm();
      if (walking && !swinging) {
        const step = Math.round(Math.sin(phase * .5) * 3);
        scene.drawImage(body, 0, 0, CELL, 72, 0, 0, CELL, 72);
        scene.drawImage(body, 0, 69, 48, 27, 0, 69 + step, 48, 27);
        scene.drawImage(body, 48, 69, 48, 27, 48, 69 - step, 48, 27);
      } else scene.drawImage(body, 0, 0);
      if (!stance.armSource) drawRightArm();
      scene.restore();

      const scale = size / CELL;
      ctx.drawImage(canvas, -(CELL / 2 + MARGIN) * scale, -(86 + MARGIN) * scale, SIZE * scale, SIZE * scale);
      if (useHeavySprite) {
        const handX = stance.shoulder[0] + (gripX - shoulderX) * Math.cos(armTurn) - (gripY - shoulderY) * Math.sin(armTurn);
        const handY = stance.shoulder[1] + (gripX - shoulderX) * Math.sin(armTurn) + (gripY - shoulderY) * Math.cos(armTurn);
        heavyEffect.drawSlash(ctx, progress, (handX - CELL / 2) * scale, (handY - 86) * scale, size / 64, bearing, swingDirection < 0);
      }
    };
  }

  window.AyothayaPlayerSprite = { create };
})();

