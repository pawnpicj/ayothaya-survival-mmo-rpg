/* Game reference data, sprite crops, and shared animation rendering. */
(() => {
  "use strict";

  const { reference, pretSlam, chalawan, rabbitHop, cobra, cobraQueen, strikePhase, enemyAttackTells } = window.AyothayaGame;
  const { player, starterCaps, zones, monsters, activeSkills, basicAttackRange, defaultEnemyAttackDuration } = reference;
  const number = new Intl.NumberFormat("en-US");
  const skillMotionId = id => id === "guard" ? "guard-skill" : id;
  const soundAt = (at, event) => ({ at, event });
  const monsterHit = at => soundAt(at, { type: "damage", enemy: false });
  const swordHit = at => soundAt(at, { type: "skill-strike", contact: true });
  const wildAttacks = {
    "monkey-swipe": { ...enemyAttackTells.monkey, name: "ตะปบ", src: "assets/monkey-attack.png",
      color: "#ffce7a", fill: "rgba(238, 115, 30, .14)" },
    "spirit-swipe": { ...enemyAttackTells.spirit, name: "ฟาดพลังป่า", src: "assets/forest-spirit-attack.png",
      color: "#a6fff1", fill: "rgba(38, 175, 154, .17)" },
  };

  function drawAttackBoundary(ctx, project, radius, progress, { color, fill }) {
    function trace(fraction) {
      const segments = Math.max(1, Math.ceil(fraction * 48));
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = -Math.PI / 2 + i / segments * fraction * Math.PI * 2;
        const point = project(Math.cos(angle) * radius, Math.sin(angle) * radius);
        if (i === 0) ctx.moveTo(...point);
        else ctx.lineTo(...point);
      }
    }
    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";
    trace(1);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#211c16";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    if (progress > 0) {
      ctx.setLineDash([]);
      trace(Math.min(1, progress));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWildAttack(ctx, image, size, attack, elapsed, facingRight) {
    const { windup, duration } = attack;
    const contact = elapsed + 1e-9 >= windup;
    const frame = contact ? (elapsed < (windup + duration) / 2 ? 2 : 3) : (elapsed < windup * .35 ? 0 : 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (facingRight) ctx.scale(-1, 1);
    ctx.drawImage(image, frame * 96, 0, 96, 96,
      -Math.round(size / 2), -Math.round(86 * size / 96), size, size);
    ctx.restore();
  }
  const rabbit = {
    id: "rabbit", name: "กระต่ายป่า", role: zones.training.name + " · สัตว์ประกอบฉาก", group: "npc",
    src: "assets/wild-rabbit.png", sheet: [192, 48], rect: [0, 0, 48, 48],
    anchor: [.5, 42 / 48], motions: ["rabbit-hop", "idle"],
  };

  function drawRabbit(ctx, image, x, y, scale, phase, facingRight = false) {
    // The four poses share a ground pivot. The airborne lift is in the artwork.
    let frame = 0;
    if (phase >= rabbitHop.landing) frame = 3;
    else if (phase >= rabbitHop.takeoff) frame = 2;
    else if (phase >= rabbitHop.crouch) frame = 1;
    const [, , width, height] = rabbit.rect;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (facingRight) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, frame * width, 0, width, height,
      -Math.round(rabbit.anchor[0] * width * scale), -Math.round(rabbit.anchor[1] * height * scale),
      Math.round(width * scale), Math.round(height * scale));
    ctx.restore();
  }
  const guardianArt = {
    src: "assets/concepts/monster-concepts.png", sheet: [1312, 1199],
    style: "guardian", rect: [474, 423, 820, 746],
    clip: [[0.03, 0], [1, 0], [1, 1], [0, 1], [0, 0.62], [0.03, 0.46]],
    height: 1.2, anchor: [0.51, 0.992],
  };

  const cobraActor = {
    id: "cobra", kind: "cobra",
    src: "assets/cobra.png", sheet: [288, 288], rect: [0, 0, 96, 96],
    anchor: [.5, 86 / 96], motions: ["cobra-idle", "cobra-slither", "cobra-strike"],
  };

  const queenActor = {
    id: "cobra-queen", kind: "cobra_queen",
    src: "assets/cobra-queen.png", sheet: [384, 384], rect: [0, 0, 128, 128],
    anchor: [.5, 116 / 128], motions: ["cobra-idle", "cobra-slither", "queen-bite", "venom-pool"],
  };
  const venomAtlas = { src: "assets/venom-pool.png", width: 192, height: 96, spitStart: .76 };

  function drawCobra(ctx, image, x, y, size, motionId, elapsed, facingRight = false, actor = cobraActor) {
    const motion = motions[motionId];
    const [, , width, height] = actor.rect;
    const row = Math.min(2, actor.motions.indexOf(motionId));
    const phase = motion.loop ? (elapsed / motion.duration) % 1 : Math.min(1, elapsed / motion.duration);
    // Start the open-jaw frame at the same phase that applies damage in the game.
    let frame;
    if (motionId === 'venom-pool') {
      const { windup, recovery } = cobraQueen.venom;
      frame = elapsed < windup * venomAtlas.spitStart ? 0 : elapsed < windup ? 1 : elapsed < windup + recovery ? 2 : 0;
    } else {
      frame = motion.loop ? Math.floor(phase * 3) : phase < strikePhase ? 0 : phase < .62 ? 1 : 2;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (facingRight) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, frame * width, row * height, width, height,
      -Math.round(actor.anchor[0] * size), -Math.round(actor.anchor[1] * size), size, size);
    ctx.restore();
  }

  function drawVenomPool(ctx, image, x, y, rx, ry, elapsed, reducedMotion = false) {
    const warning = elapsed < 0;
    ctx.save();
    if (warning) {
      const progress = 1 + elapsed / cobraQueen.venom.windup;
      ctx.fillStyle = "rgba(120, 199, 43, " + (.15 + .19 * progress) + ")";
    } else {
      ctx.fillStyle = "#4268207a";
    }
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#141d10";
    ctx.lineWidth = warning ? 5 : 3;
    ctx.stroke();
    ctx.strokeStyle = "#d3fa73";
    ctx.lineWidth = warning ? 2 : 1.5;
    if (warning) ctx.setLineDash([7, 4]);
    ctx.stroke();
    if (!warning && image?.naturalWidth) {
      const frame = elapsed < .24 ? Math.floor(elapsed / .12) : reducedMotion ? 2 : 2 + Math.floor((elapsed - .24) / .16) % 4;
      const { width, height } = venomAtlas;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, (frame % 3) * width, Math.floor(frame / 3) * height, width, height,
        Math.round(x - rx / .93), Math.round(y - ry / .60), Math.round(rx * 2 / .93), Math.round(ry * 2 / .60));
    }
    ctx.restore();
  }

  function drawVenomSpit(ctx, fromX, fromY, x, y, elapsed) {
    const { windup } = cobraQueen.venom;
    const progress = (elapsed / windup - venomAtlas.spitStart) / (1 - venomAtlas.spitStart);
    if (progress < 0 || progress >= 1) return;
    ctx.save();
    for (let i = 3; i >= 0; i--) {
      const t = progress - i * .085;
      if (t < 0) continue;
      const px = Math.round(fromX + (x - fromX) * t);
      const py = Math.round(fromY + (y - fromY) * t - Math.sin(Math.PI * t) * 16);
      const size = 8 - i;
      ctx.fillStyle = '#365716';
      ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
      ctx.fillStyle = '#cbf86a';
      ctx.fillRect(px, py, size, size);
    }
    ctx.restore();
  }
  const npcSheets = {
    village: { src: "assets/village-npcs.png", sheet: [288, 96] },
    harbor: { src: "assets/harbor-npcs.png", sheet: [288, 96] },
    ranger: { src: "assets/ruins-ranger.png", sheet: [96, 96] },
    trainer: { src: "assets/recruit-trainer.png", sheet: [96, 96] },
  };
  const npcPlacements = {
    elder: ["village", 0, "lung-kham"], vendor: ["village", 1, "herbalist"], guard: ["village", 2, "gate-guard"],
    "ruins-guard": ["ranger", 0], "harbor-master": ["village", 2], "harbor-dockhand": ["harbor", 0],
    "harbor-villager": ["harbor", 1], "harbor-merchant": ["harbor", 2],
    "recruit-trainer": ["trainer", 0],
  };
  const npcArt = Object.fromEntries(Object.entries(npcPlacements).map(([id, [sheetKey, column, previewId = id]]) => [
    id, { ...npcSheets[sheetKey], rect: [column * 96, 0, 96, 96], anchor: [.5, 86 / 96], id: previewId },
  ]));
  const npcActors = Object.values(zones).flatMap(zone => zone.npcs.filter(npc => npcArt[npc.id]).map(npc => ({
    ...npcArt[npc.id], name: npc.name, role: [zone.name, npc.role ?? (npc.type === "vendor" ? "ร้านค้า" : "")].filter(Boolean).join(" · "),
    group: "npc", motions: ["idle"], still: true,
  })));

  const atlas = { src: "assets/sprites.png", sheet: [384, 192] };
  const normalMotions = ["idle", "walk", "attack", "hurt", "fall"];
  const monkeyArt = { ...atlas, rect: [192, 96, 96, 96], anchor: [.5, 86 / 96], height: .78,
    motions: ["idle", "walk", "monkey-swipe", "hurt", "fall"] };
  const spiritArt = { ...atlas, rect: [288, 96, 96, 96], anchor: [.5, 86 / 96], height: .95 };
  const monsterActors = [
    { ...monkeyArt, id: "village-monkey", kind: "village_monkey" },
    { ...monkeyArt, id: "monkey", kind: "monkey" },
    { ...spiritArt, id: "forest-spirit", kind: "ghost", motions: ["idle", "walk", "spirit-swipe", "hurt", "fall"] },
    { ...guardianArt, id: "stone-guardian", kind: "guardian", motions: normalMotions },
    { ...spiritArt, id: "grave-spirit", kind: "grave_spirit", motions: normalMotions },
    { ...guardianArt, id: "grave-guardian", kind: "grave_guardian", motions: normalMotions },
    { id: "pret-boss", kind: "pret", src: "assets/pret-boss.png", sheet: [1024, 1536], rect: [0, 0, 1024, 1536],
      height: 1.2, anchor: [0.43, 1], motions: ["idle", "walk", "attack", "pret-slam", "hurt", "fall"] },
    { id: "chalawan", kind: "chalawan", src: "assets/chalawan-boss.png", sheet: [1774, 887], rect: [0, 0, 1774, 887],
      height: .86, anchor: [.5, 1], motions: ["idle", "walk", "chalawan-bite", "chalawan-entrance", "tail-sweep", "hurt", "chalawan-fall"] },
    cobraActor,
    queenActor,
    { id: "training-dummy", kind: "dummy", src: "assets/training-dummy.png", sheet: [84, 112], rect: [0, 0, 84, 112],
      anchor: [.5, 1], motions: ["idle"], still: true },
  ].map(actor => {
    const monster = monsters[actor.kind];
    const foundIn = Object.values(zones).filter(zone => zone.bossType === actor.kind ||
      zone.enemies.some(([kind]) => kind === actor.kind)).map(zone => zone.name);
    const type = monster.boss ? "บอส" : monster.level ? "มอนสเตอร์" : "เป้าฝึก";
    const role = [type + (monster.level ? " Lv. " + monster.level : ""), ...foundIn].join(" · ");
    const stats = ["HP " + number.format(monster.hp)];
    if (monster.atk !== undefined) stats.push("ATK " + number.format(monster.atk));
    return { ...actor, name: monster.name, role, stats: stats.join(" · "), group: "monster" };
  });

  const actors = [
    { ...atlas, id: "one-handed-swordsman", name: player.name, role: player.job + " · อาชีพเริ่มต้น", group: "player",
      stats: `Base Lv. สูงสุด ${starterCaps.base} · Job Lv. สูงสุด ${starterCaps.job}`,
      rect: [26, 13, 46, 73], weapon: player.weapon, motions: ["idle", "walk", "attack", ...activeSkills.map(skill => skillMotionId(skill.id))] },
    ...npcActors,
    rabbit,
    ...monsterActors,
  ];

  const skillPreviewDurations = { heavy: .92, sweep: .95, guard: 1.15, heal: 1.12, dash: 1.05, thrust: 1.05, interrupt: 1.02 };
  const skillMotions = Object.fromEntries(activeSkills.map(skill => {
    const id = skillMotionId(skill.id);
    const [stat, minimum] = skill.stat;
    const requirements = `Base Lv. ${skill.baseLevel} · Job Lv. ${skill.jobLevel} · ${stat} ${minimum}`;
    const details = [];
    if (skill.strike) {
      details.push((skill.strike.area ? "รัศมี " : "ระยะ ") + skill.strike.range + " หน่วย");
      details.push(`ท่าโจมตี ${skill.strike.duration} วิ.`);
    }
    details.push(`ใช้ ${skill.cost} MP · คูลดาวน์ ${skill.cooldown} วิ.`);
    const attackDuration = skill.strike?.duration;
    const contactAt = skill.strike ? attackDuration * strikePhase : skill.id === "guard" ? .56 : undefined;
    const sounds = [soundAt(0, { type: "skill", skill: skill.id })];
    if (skill.strike) sounds.push(swordHit(contactAt));
    if (skill.id === "guard") sounds.push(soundAt(contactAt, { type: "damage", enemy: false, guarded: true }));
    return [id, { id, name: skill.name, description: skill.description, stats: requirements + "\n" + details.join(" · "),
      duration: skillPreviewDurations[skill.id] ?? attackDuration ?? 1, loop: true, attackDuration, contactAt, sounds }];
  }));
  const areaStats = skill => `รัศมี ${skill.radius} หน่วย · เตือน ${skill.windup} วิ. · คูลดาวน์ ${skill.cooldown} วิ.`;

  const motions = {
    ...skillMotions,
    idle: { id: "idle", name: "ท่าพัก", description: "ขยับตัวเบา ๆ ระหว่างยืนพัก", duration: 1.8, loop: true },
    walk: { id: "walk", name: "เดิน", description: "สลับจังหวะก้าวและถ่ายน้ำหนักอยู่กับที่", duration: 1.1, loop: true },
    attack: { id: "attack", name: "โจมตี", description: "ตั้งท่า พุ่งเข้าหาเป้าหมาย แล้วคืนสู่ท่าพัก", duration: 0.85, loop: false },
    "pret-slam": { id: "pret-slam", name: "ทุบพื้น",
      description: "ทุบพื้นโดนเป้าหมายในวงและทำให้ติดสตัน " + pretSlam.stunTime + " วิ.", stats: areaStats(pretSlam),
      sounds: [soundAt(pretSlam.windup, { type: "boss-slam", style: "pret-slam" })],
      duration: pretSlam.windup + pretSlam.recovery + .42, loop: true },
    "chalawan-bite": { id: "chalawan-bite", name: "กัดปกติ",
      description: "กัดโดนทำให้เลือดไหล 100% นาน " + chalawan.bleedDuration + " วิ.", duration: chalawan.biteDuration, loop: false,
      sounds: [monsterHit(chalawan.biteDuration * strikePhase)] },
    "chalawan-entrance": { id: "chalawan-entrance", name: "กระโจนจากน้ำ",
      description: "ชาละวันพุ่งจากผิวน้ำและลงกลางลาน", duration: chalawan.entranceDuration, loop: false },
    "tail-sweep": { id: "tail-sweep", name: "ฟาดหาง",
      description: "ง้างหางแล้วฟาดเป็นวงน้ำรอบตัว", stats: areaStats(chalawan.slam),
      sounds: [soundAt(chalawan.slam.windup, { type: "boss-slam", style: chalawan.slam.style })],
      duration: chalawan.slam.windup + chalawan.slam.recovery + .42, loop: true },
    "chalawan-fall": { id: "chalawan-fall", name: "ล้มลง",
      description: "หัวค่อย ๆ ตกและลำตัวทรุดแนบพื้น", duration: chalawan.collapseDuration, loop: false },
    cast: { id: "cast", name: "ร่ายสกิล", description: "รวบรวมพลังและปล่อยเอฟเฟกต์สกิล", duration: 1.4, loop: false },
    hurt: { id: "hurt", name: "ถูกโจมตี", description: "ชะงักและถอยจากแรงปะทะ", duration: 0.64, loop: false },
    fall: { id: "fall", name: "ล้มลง", description: "เสียหลักและจบท่าที่พื้น", duration: 1.2, loop: false },
    talk: { id: "talk", name: "พูดคุย", description: "เอนตัวและพยักหน้าระหว่างสนทนา", duration: 1.4, loop: true },
    gesture: { id: "gesture", name: "ทักทาย", description: "เอนตัวทักทายแล้วกลับมายืนตรง", duration: 1.15, loop: false },
    guard: { id: "guard", name: "ตั้งรับ", description: "ย่อตัวรับแรงและรักษาท่าป้องกัน", duration: 1.15, loop: true },
    hop: { id: "hop", name: "กระโดด", description: "ย่อตัวก่อนกระโดดและยุบตัวตอนแตะพื้น", duration: 1.0, loop: true },
    "rabbit-hop": { id: "rabbit-hop", name: "กระโดด", description: "ย่อตัว กระโดดไปข้างหน้า แล้วแตะพื้น", duration: rabbitHop.duration, loop: true },
    "cobra-idle": { id: "cobra-idle", name: "แผ่แม่เบี้ย", description: "ชูคอแล้วแกว่งหัวขณะหยุดนิ่ง", duration: 1.5, loop: true },
    "cobra-slither": { id: "cobra-slither", name: "เลื้อย", description: "เลื้อยต่ำสลับโค้งลำตัว", duration: .54, loop: true },
    "cobra-strike": { id: "cobra-strike", name: "ฉก", duration: cobra.strikeDuration, loop: false,
      sounds: [monsterHit(cobra.strikeDuration * strikePhase)],
      description: `ฉกโดนแล้วติดพิษ ${cobra.poisonTicks} ครั้ง ครั้งละ ${cobra.poisonDamageFraction * 100}% ของดาเมจที่ได้รับ ทุก 1 วินาที` },
    "queen-bite": { id: "queen-bite", name: "ฉก", duration: cobraQueen.strikeDuration, loop: false,
      sounds: [monsterHit(cobraQueen.strikeDuration * strikePhase)],
      description: "ง้างหัวก่อนฉกเป้าหมายระยะประชิด" },
    "venom-pool": { id: "venom-pool", name: "พ่นพิษลงพื้น",
      duration: cobraQueen.venom.windup + cobraQueen.venom.duration, loop: true,
      sounds: [soundAt(cobraQueen.venom.windup, { type: "venom-splash" })],
      stats: areaStats(cobraQueen.venom),
      description: `วงเตือนล็อกตำแหน่งก่อนพ่น บ่อพิษอยู่ ${cobraQueen.venom.duration} วิ. ดาเมจ ${Math.round(cobraQueen.venom.damageFraction * 100)}% ของ HP สูงสุดทุก ${cobraQueen.venom.interval} วิ.` },
    "monkey-swipe": { ...wildAttacks["monkey-swipe"], loop: false,
      sounds: [monsterHit(wildAttacks["monkey-swipe"].windup)],
      stats: `รัศมี ${wildAttacks["monkey-swipe"].radius} หน่วย · เตือน ${wildAttacks["monkey-swipe"].windup} วิ.`,
      description: "ย่อตัวแล้วยกอุ้งมือก่อนตะปบ ถอยออกนอกขอบวงก่อนมือฟาดลง" },
    "spirit-swipe": { ...wildAttacks["spirit-swipe"], loop: false,
      sounds: [monsterHit(wildAttacks["spirit-swipe"].windup)],
      stats: `รัศมี ${wildAttacks["spirit-swipe"].radius} หน่วย · เตือน ${wildAttacks["spirit-swipe"].windup} วิ.`,
      description: "รวบพลังไว้ที่มือก่อนฟาด ถอยออกนอกขอบวงก่อนพลังปะทุ" },
    roar: { id: "roar", name: "คำราม", description: "ตั้งหลักก่อนคำรามจนเกิดแรงสั่นสะเทือน", duration: 1.3, loop: false },
  };

  function motionForActor(actor, id) {
    const motion = motions[id];
    if (id === "attack") {
      if (actor.group === "player") {
        return { ...motion, stats: `ระยะ ${basicAttackRange} หน่วย`, sounds: [swordHit(motion.duration * strikePhase)] };
      }
      const { windup, basicStun } = monsters[actor.kind];
      const description = basicStun
        ? `โจมตีระยะประชิด มีโอกาส ${basicStun.chance * 100}% ให้ติดสตัน ${basicStun.duration} วิ.`
        : "โจมตีระยะประชิด";
      const duration = windup ?? defaultEnemyAttackDuration;
      return { ...motion, description, duration, sounds: [monsterHit(duration * strikePhase)] };
    }
    if (id === "idle" && actor.still) return { ...motion, description: "ยืนประจำจุดในเกม", loop: false };
    return motion;
  }

  window.AyothayaPreviewData = { actors, motions, motionForActor, npcArt, rabbit, drawRabbit, cobra: cobraActor, drawCobra,
    queen: queenActor, venomAtlas, drawVenomPool, drawVenomSpit, wildAttacks, drawAttackBoundary, drawWildAttack };
})();

