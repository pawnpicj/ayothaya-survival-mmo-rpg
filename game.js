/* Ayothaya Survival — simulation, progression and save data. */
(() => {
  'use strict';

  const SAVE_KEY = 'ayothaya-survival-v1';
  const STARTER_PLAYER = { name: 'นักดาบฝึกหัด', job: 'นักดาบ', weapon: 'rusty_sword' };
  const SIMULATION_STEP = 1 / 60;
  const MAX_FRAME_SECONDS = .25;
  const STAT_KEYS = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
  const BOUNDS = { left: 135, right: 1555, top: 190, bottom: 930 };
  const INTERACT_RANGE = 53;
  const BASIC_ATTACK_RANGE = 100;
  const DEFAULT_ENEMY_ATTACK_DURATION = .42;
  const STRIKE_PHASE = 0.38;
  const ENEMY_ATTACK_TELLS = {
    monkey: { id: 'monkey-swipe', duration: .72, windup: .40, radius: 47 },
    spirit: { id: 'spirit-swipe', duration: .86, windup: .50, radius: 47 },
  };
  const DASH_OVERSHOOT = 30;
  const BLEED_TICKS = 3;
  const BLEED_DAMAGE_FRACTION = .15;
  const BLEED_CHANCE = .2;
  const COBRA_POISON_TICKS = 4;
  const COBRA_POISON_DAMAGE_FRACTION = .10;
  const QUEEN_SPAWN_POINTS = [[455, 605], [690, 805], [1060, 615], [1330, 760]];
  const QUEEN_FIRST_SPAWN = [25, 55];
  const QUEEN_RESPAWN = [90, 150];
  const VENOM_POOL = { style: 'venom-pool', radius: 124, castRange: 210, windup: 1.35,
    recovery: .48, cooldown: 11, duration: 6, interval: .6, damageFraction: .14 };
  const CHALAWAN_BLEED_BONUS = .15;
  const MONSTER_CARD_DROP_CHANCE = .01 / 100;
  const BOSS_CARD_DROP_CHANCE = .025 / 100;
  const EXPERIENCE_REWARD_RATE = .75;
  const INTERRUPT_DELAY = 1.2;
  const SLOW_DURATION = 4;
  const SLOW_REDUCTION = .3;
  const AUTO_RANGES = { near: 150, medium: 275, far: 450 };
  const AUTO_HEAL_BELOW = 60;
  const AUTO_GUARD_RANGE = 49;
  const GUARD_DURATION = 6;
  const DUMMY_RECOVERY_DELAY = 5;
  const RABBIT_HOP = { duration: .64, crouch: .29, takeoff: .46, landing: .82, distance: 48 };
  const THA_KHAM_FERRY_FARE = 20;
  const VILLAGE_GATE = {
    inner: BOUNDS.right, outer: 2080, viewX: 0.932, halfWidth: 18,
    route: [[1555, 277], [1632, 256], [1820, 256], [1895, 270], [1962, 286], [2014, 272], [2057, 244], [2080, 219]],
  };
  const RUINS_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: 0.108, halfWidth: 20,
    route: [[0, 520], [135, 520]],
  };
  const RUINS_HARBOR_APPROACH = {
    inner: BOUNDS.left, outer: 0, viewX: .089, halfWidth: 27,
    route: [[0, 120], [20, 150], [60, 176], [135, 211]],
  };
  const HARBOR_RETURN_APPROACH = {
    inner: BOUNDS.left, outer: 0, viewX: .105, halfWidth: 25,
    route: [[0, 520], [135, 520]],
  };
  const VILLAGE_TRAINING_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: .163, halfWidth: 23,
    route: [[0, 270], [135, 270]],
  };
  const TRAINING_RETURN_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: .134, halfWidth: 24,
    route: [[0, 520], [135, 520]],
  };
  const RUINS_INNER_GATE = {
    id: 'inner-gate', name: 'ป่าช้าวัดร้าง', target: 'cemetery', facing: 'e', x: 1360, y: 58, reach: 48,
    approachY: BOUNDS.top, exitY: 9, halfWidth: 32,
  };
  const CEMETERY_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: .096, halfWidth: 26,
    route: [[0, 590], [135, 590]],
  };
  const CEMETERY_HUNT = {
    title: 'ล่าผีเปรต', needed: 100,
    description: 'กำจัดมอนสเตอร์ในป่าช้าวัดร้างให้ครบ 100 ตัวเพื่อเรียกบอสผีเปรตออกมาที่ลานพิธี',
  };
  const CEMETERY_RESPAWN_DELAY = 10000;
  const ZONES = {
    village: {
      id: 'village', name: 'บ้านท่ามะขาม', town: true, subtitle: 'เขตชานพระนคร', levels: 'Lv. 1–4',
      width: VILLAGE_GATE.outer, height: 1120, bounds: { ...BOUNDS, left: VILLAGE_TRAINING_GATE.outer, right: VILLAGE_GATE.outer, top: 90 },
      spawn: [770, 570], arrival: [1997, 277], gateApproaches: [VILLAGE_GATE, VILLAGE_TRAINING_GATE],
      obstacles: [
        // Open passages in front of the temple stairs and the market stall.
        { x: 135, y: 90, w: 255, h: 90 }, { x: 390, y: 90, w: 180, h: 44 },
        { x: 570, y: 90, w: 205, h: 90 }, { x: 980, y: 90, w: 575, h: 90 },
        { x: 365, y: 313, w: 130, h: 105 }, { x: 520, y: 290, w: 146, h: 127 },
        { x: 738, y: 270, w: 142, h: 132 }, { x: 930, y: 295, w: 140, h: 125 },
      ],
      npcs: [
        { id: 'elder', type: 'elder', name: 'ลุงขาม', x: 455, y: 151 },
        { id: 'vendor', type: 'vendor', name: 'แม่ค้าสมุนไพร', x: 886, y: 110 },
        { id: 'guard', type: 'guard', name: 'ยามประตูท่า', x: 1460, y: 330 },
      ],
      portals: [
        { id: 'east-gate', name: 'ดงเจดีย์ร้าง', x: 2075, y: 220,
          target: 'ruins', facing: 'e', quest: true, automatic: true, reach: 11 },
        { id: 'training-gate', name: 'ลานฝึก', x: 8, y: 270,
          target: 'training', facing: 'e', automatic: true, reach: 12 },
      ],
      enemies: [
        ['village_monkey', 780, 470], ['village_monkey', 405, 545], ['village_monkey', 500, 775],
        ['village_monkey', 945, 820], ['village_monkey', 1095, 650], ['village_monkey', 1335, 485],
        ['village_monkey', 1440, 765],
      ],
    },
    ruins: {
      id: 'ruins', name: 'ดงเจดีย์ร้าง', subtitle: 'เขตป่าตะวันออก', levels: 'Lv. 3–7',
      width: 1680, height: 1120, bounds: { ...BOUNDS, left: RUINS_GATE.outer, top: RUINS_INNER_GATE.exitY },
      spawn: [310, 548], arrival: [158, 520], gateApproaches: [RUINS_GATE, RUINS_HARBOR_APPROACH], innerGate: RUINS_INNER_GATE,
      obstacles: [],
      npcs: [{ id: 'ruins-guard', type: 'guard', name: 'พรานหม่อง', x: 415, y: 520 }],
      portals: [{ id: 'west-gate', name: 'บ้านท่ามะขาม', x: 7, y: 520,
        target: 'village', facing: 'w', automatic: true, reach: 11 }, RUINS_INNER_GATE,
        { id: 'harbor-gate', name: 'ท่าเรือท่าข้าม', x: 8, y: 132, target: 'harbor',
          key: 'ghost_key', facing: 'e', reach: 42 }],
      enemies: [
        ['ghost', 590, 430], ['ghost', 785, 620], ['ghost', 1065, 445], ['ghost', 1045, 855],
        ['monkey', 435, 773], ['monkey', 725, 860], ['monkey', 1010, 652],
        ['guardian', 1335, 380], ['guardian', 1460, 603], ['guardian', 1370, 864],
      ],
    },
    cemetery: {
      id: 'cemetery', name: 'ป่าช้าวัดร้าง', subtitle: 'สุสานหลังดงเจดีย์ร้าง', levels: 'Lv. 12–24',
      width: 1680, height: 1120, bounds: { ...BOUNDS, left: CEMETERY_GATE.outer },
      spawn: [260, 590], gateApproaches: [CEMETERY_GATE], obstacles: [], npcs: [],
      portals: [{ id: 'cemetery-exit', name: 'ดงเจดีย์ร้าง', x: 7, y: 590, target: 'ruins',
        arrival: [1360, 145], facing: 's', automatic: true, reach: 16 }],
      bossType: 'pret', bossSpawn: [1075, 365],
      enemies: [
        ['grave_spirit', 470, 390], ['grave_spirit', 565, 545], ['grave_spirit', 425, 798],
        ['grave_spirit', 640, 285], ['grave_spirit', 780, 675], ['grave_spirit', 940, 805],
        ['grave_spirit', 1215, 749], ['grave_spirit', 1430, 535], ['grave_spirit', 1370, 330],
        ['grave_guardian', 610, 735], ['grave_guardian', 755, 465], ['grave_guardian', 1050, 608],
        ['grave_guardian', 1330, 633], ['grave_guardian', 1445, 800],
      ],
    },
    harbor: {
      id: 'harbor', name: 'ท่าเรือท่าข้าม', levels: 'เขตท่าเรือ', width: 1680, height: 1120,
      bounds: { ...BOUNDS, left: HARBOR_RETURN_APPROACH.outer, top: -180 },
      northShore: [
        [135, 405], [210, -18], [525, -46], [705, -89], [755, -119],
        [985, -153], [1225, -167], [1380, -112], [1555, 30],
      ],
      spawn: [245, 520], gateApproaches: [HARBOR_RETURN_APPROACH], obstacles: [], enemies: [],
      npcs: [
        { id: 'harbor-master', type: 'harbor-master', name: 'นายท่าอิน', x: 735, y: -82 },
        { id: 'harbor-dockhand', type: 'villager', name: 'ชิด คนงานท่าเรือ', x: 460, y: 320,
          dialogue: 'ขนของขึ้นจากเรือแต่เช้าแล้ว ข้าขอพักตรงนี้สักประเดี๋ยว' },
        { id: 'harbor-villager', type: 'villager', name: 'แม่บัว', x: 1120, y: -30,
          dialogue: 'ข้าเอาปลาจากบ้านมาฝากขาย เดี๋ยวเรือเที่ยวหน้าก็กลับแล้วจ้ะ' },
        { id: 'harbor-merchant', type: 'vendor', name: 'พ่อค้าเพิ่ม', x: 1470, y: 115,
          dialogue: 'เดินทางไกลหรือ มียากับคัมภีร์กลับเมืองขาย ข้ารับซื้อของที่เจ้าเก็บมาได้ด้วย' },
      ],
      interactables: [
        { id: 'harbor-crate', type: 'harbor-crate', name: 'หีบสินค้า', x: 1090, y: 255 },
        { id: 'harbor-boarding', type: 'ferry', name: 'จุดขึ้นเรือ', signText: 'ท่าเรือท่าข้าม',
          x: 995, y: -126, target: 'nipa', fare: THA_KHAM_FERRY_FARE, facing: 's' },
      ],
      bossType: 'chalawan', bossSpawn: [850, 415], bossEntrance: [1170, -285],
      portals: [{ id: 'harbor-exit', name: 'ดงเจดีย์ร้าง', x: 8, y: 520, target: 'ruins',
        arrival: [160, 216], facing: 'se', automatic: true, reach: 14 }],
    },
    nipa: {
      id: 'nipa', name: 'ป่าจากน้ำกร่อย', levels: 'ท่าเรือริมป่าจาก', width: 1680, height: 1120,
      bossType: 'cobra_queen',
      bounds: { ...BOUNDS }, spawn: [770, 282], obstacles: [], portals: [],
      npcs: [{ id: 'recruit-trainer', type: 'trainer', name: 'ครูเข้ม', role: 'ครูฝึกทหารใหม่', x: 620, y: 292 }],
      enemies: [
        ['cobra', 330, 475], ['cobra', 545, 730], ['cobra', 815, 515],
        ['cobra', 1015, 795], ['cobra', 1200, 440], ['cobra', 1390, 665],
      ],
      interactables: [
        { id: 'nipa-boarding', type: 'ferry', name: 'เรือกลับท่าข้าม', signText: 'กลับท่าข้าม',
          x: 850, y: 232, target: 'harbor', arrival: [995, -42], facing: 's' },
      ],
    },
    training: {
      id: 'training', name: 'ลานฝึก', levels: 'ทดสอบดาเมจ', width: 1680, height: 1120,
      bounds: { ...BOUNDS, left: TRAINING_RETURN_GATE.outer },
      spawn: [263, 548], gateApproaches: [TRAINING_RETURN_GATE], obstacles: [], npcs: [],
      wildlife: [{ type: 'rabbit', x: 365, y: 560, route: [
        [470, 335], [840, 270], [1325, 325], [1450, 575], [1310, 825],
        [855, 720], [1050, 540], [720, 650], [475, 830], [250, 710], [365, 560],
      ] }],
      portals: [{ id: 'training-exit', name: 'บ้านท่ามะขาม', x: 7, y: 520,
        target: 'village', arrival: [164, 270], facing: 'e', automatic: true, reach: 12 }],
      enemies: [['dummy', 640, 505], ['dummy', 955, 443], ['dummy', 1270, 565]],
    },
  };

  const experienceReward = (baseXp, jobXp) => ({
    xp: Math.round(baseXp * EXPERIENCE_REWARD_RATE),
    jobXp: Math.round(jobXp * EXPERIENCE_REWARD_RATE),
  });
  const halfGold = amount => Math.floor(amount / 2);

  const MONSTERS = {
    tamarind: { name: 'ลูกมะขามภูต', level: 1, hp: 30, atk: 4, ...experienceReward(18, 9), gold: 5, speed: 53, drop: 'tamarind_core', card: 'tamarind_card' },
    village_monkey: { name: 'ลิงป่า', sprite: 'monkey', level: 1, hp: 32, atk: 4, ...experienceReward(18, 9), gold: 5,
      speed: 65, drop: 'monkey_claw', card: 'monkey_card', attackTell: ENEMY_ATTACK_TELLS.monkey },
    monkey: { name: 'ลิงป่า', level: 2, hp: 53, atk: 7, ...experienceReward(30, 15), gold: 9,
      speed: 83, drop: 'monkey_claw', attackTell: ENEMY_ATTACK_TELLS.monkey },
    ghost: { name: 'นางไม้', level: 3, hp: 78, atk: 10, ...experienceReward(48, 25), gold: 14,
      speed: 65, drop: 'spirit_dust', attackTell: ENEMY_ATTACK_TELLS.spirit },
    guardian: { name: 'ยักษ์ศิลา', level: 5, hp: 142, atk: 17, ...experienceReward(96, 54), gold: 27, speed: 63, drop: 'guardian_seal' },
    grave_spirit: { name: 'วิญญาณเฝ้าหลุม', sprite: 'ghost', level: 12, hp: 165, atk: 22, ...experienceReward(108, 57), gold: 26, speed: 72, drop: 'spirit_dust' },
    grave_guardian: { name: 'อารักษ์ป่าช้า', sprite: 'guardian', level: 16, hp: 235, atk: 28, ...experienceReward(145, 76), gold: 40, speed: 61, drop: 'guardian_seal' },
    pret: { name: 'ผีเปรต', boss: true, level: 24, hp: 5500, atk: 100, ...experienceReward(940, 470), gold: 240,
      speed: 56, attackRange: 58, windup: .68, attackInterval: 1.65,
      slam: { radius: 160, windup: 1.1, recovery: .45, cooldown: 7, stunTime: .08 },
      basicStun: { chance: .002, duration: .01 }, drop: 'pret_ash', card: 'pret_card' },
    chalawan: { name: 'ชาละวัน', boss: true, level: 34, hp: 4200, atk: 74, ...experienceReward(1200, 600), gold: 300,
      speed: 78, attackRange: 63, windup: .59, attackInterval: 1.35, entranceDuration: 1.65, collapseDuration: 1.2,
      basicBleed: true, drop: 'river_lord_armor', card: 'chalawan_card', cardChance: 1,
      slam: { style: 'tail-sweep', radius: 142, windup: 1.1, recovery: .44, cooldown: 6, stunTime: 0 } },
    cobra: { name: 'งูเห่า', level: 35, hp: 450, atk: 48, ...experienceReward(190, 104), gold: 52,
      speed: 84, aggroRange: 108, attackRange: 46, windup: .66, attackInterval: 1.45 },
    cobra_queen: { name: 'นางพญางูเห่า', boss: true, level: 40, hp: 6800, atk: 76,
      ...experienceReward(1400, 720), gold: 360, speed: 68, aggroRange: 220, attackRange: 59,
      windup: .72, attackInterval: 1.55, collapseDuration: .85, slam: VENOM_POOL },
    dummy: { name: 'หุ่นไล่กา', hp: 999999 },
  };

  const ITEMS = {
    potion: { name: 'ยาสมุนไพร', description: 'ฟื้นพลังชีวิต 45 หน่วย', type: 'consumable', icon: 'potion', price: 12, sell: halfGold(4) },
    elixir: { name: 'น้ำอบมนตรา', description: 'ฟื้นมานา 28 หน่วย', type: 'consumable', icon: 'elixir', price: 16, sell: halfGold(6) },
    town_scroll: { name: 'คัมภีร์กลับเมือง', description: 'พากลับจุดเริ่มต้นของเมืองที่ใกล้ที่สุด',
      type: 'consumable', icon: 'scroll', price: 20 },
    rusty_sword: { name: 'ดาบฝึกหัด', description: 'พลังโจมตี +4', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 4 },
    bronze_sword: { name: 'ดาบสำริด', description: 'พลังโจมตี +10', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 10, sell: halfGold(30), baseLevel: 10 },
    river_lord_armor: { name: 'เกราะหนังเจ้าแห่งลุ่มแม่น้ำ', description: 'DEF +5 · HP สูงสุด +50',
      type: 'equipment', icon: 'armor', slot: 'armor', defense: 5, hp: 50 },
    tamarind_core: { name: 'เมล็ดมะขามภูต', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'seed', sell: halfGold(3) },
    monkey_claw: { name: 'กรงเล็บลิงป่า', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'claw', sell: halfGold(7) },
    spirit_dust: { name: 'ผงพงไพร', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'dust', sell: halfGold(10) },
    tamarind_card: { name: 'การ์ดมะขามภูต', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    monkey_card: { name: 'การ์ดลิงป่า', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    guardian_seal: { name: 'ตราอารักษ์', description: 'เครื่องรางเก่าที่พบจากยักษ์ศิลา', type: 'material', icon: 'seal', sell: halfGold(35) },
    pret_ash: { name: 'เถ้าอาคมผีเปรต', description: 'เถ้าจากลานพิธี ใช้ขายให้ร้านค้า', type: 'material', icon: 'pret-ash', sell: halfGold(110) },
    ghost_key: { name: 'กุญแจผี', description: 'ใช้เปิดซุ้มทางไปท่าเรือท่าข้ามในดงเจดีย์ร้าง', type: 'key', icon: 'key' },
    recruit_badge: { name: 'ป้ายรับรองเป็นทหารใหม่', description: 'หลักฐานว่าผ่านการทดสอบของครูเข้มที่ป่าจากน้ำกร่อย',
      type: 'key', discardable: false },
    pret_card: { name: 'การ์ดผีเปรต', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 8 และ HP สูงสุด 35', type: 'equipment', icon: 'card', slot: 'card', attack: 8, hp: 35 },
    chalawan_card: { name: 'การ์ดชาละวัน', description: 'ATK +5 · ทำดาเมจเพิ่ม 15% ต่อมอนสเตอร์และบอสที่กำลังเลือดออก',
      type: 'equipment', icon: 'card', slot: 'card', attack: 5 },
  };

  const DEFAULT_SKILL_SLOTS = ['heavy', 'sweep', 'guard', 'heal', 'dash'];
  const ITEM_SLOT_COUNT = 2;
  const CLASS_LEVEL_CAPS = {
    1: { base: 35, job: 10 },
    2: { base: 99, job: 35 },
    3: { base: 99, job: 50 },
  };
  const CARD_SLOTS = [
    { id: 'card', classTier: 1 }, { id: 'card2', classTier: 1 },
    { id: 'card3', classTier: 2 }, { id: 'card4', classTier: 3 },
  ];
  const ACTIVE_SKILLS = [
    { id: 'heavy', name: 'ฟันหนัก', icon: 'blade', baseLevel: 10, jobLevel: 1, stat: ['STR', 1], cost: 5, cooldown: 3,
      description: 'โจมตีเป้าหมายเดียวด้วยพลัง 185%', strike: { range: 90, duration: 0.46, multiplier: 1.85 } },
    { id: 'sweep', name: 'กวาดดาบ', icon: 'flame', baseLevel: 15, jobLevel: 2, stat: ['STR', 5], cost: 8, cooldown: 5,
      description: 'โจมตีมอนสเตอร์รอบตัวด้วยพลัง 120%', strike: { area: true, range: 125, duration: 0.43, multiplier: 1.2 } },
    { id: 'guard', name: 'กันภัย', icon: 'shield', baseLevel: 15, jobLevel: 1, stat: ['VIT', 3], cost: 6, cooldown: 9,
      description: `ลดความเสียหายที่ได้รับครึ่งหนึ่งเป็นเวลา ${GUARD_DURATION} วินาที` },
    { id: 'heal', name: 'รักษาใจ', icon: 'leaf', baseLevel: 15, jobLevel: 2, stat: ['INT', 4], cost: 10, cooldown: 10,
      description: 'ฟื้น HP ทันที 32 + INT × 3' },
    { id: 'dash', name: 'พุ่งแทงใจ', icon: 'star', baseLevel: 20, jobLevel: 3, stat: ['AGI', 6], cost: 14, cooldown: 8,
      description: `พุ่งแทงด้วยพลัง 230% และไปต่อหลังเป้าสูงสุด ${DASH_OVERSHOOT} หน่วย`,
      strike: { range: 195, duration: 0.42, multiplier: 2.3 } },
    { id: 'thrust', name: 'แทงใจดำ', icon: 'thrust', baseLevel: 25, jobLevel: 1, stat: ['DEX', 3], cost: 6, cooldown: 4,
      description: `แทงด้วยพลัง 145% เป้าหมายเลือดไหล ${BLEED_TICKS} วิ. และได้รับดาเมจ ${BLEED_DAMAGE_FRACTION * 100}% ของแรงแทงทุกวินาที`,
      strike: { range: 112, duration: 0.36, multiplier: 1.45 } },
    { id: 'interrupt', name: 'ฟันสกัด', icon: 'swords', baseLevel: 30, jobLevel: 3, stat: ['DEX', 5], cost: 9, cooldown: 7,
      description: `ฟันด้วยพลัง 110% ขัดจังหวะ และลดความเร็วเดินกับโจมตี ${SLOW_REDUCTION * 100}% นาน ${SLOW_DURATION} วินาที`,
      strike: { range: 66, duration: 0.36, multiplier: 1.1 } },
  ];
  const AUTO_SKILL_SLOT_COUNT = 5;
  const ACTIVE_SKILL_IDS = new Set(ACTIVE_SKILLS.map(skill => skill.id));
  const PASSIVE_SKILLS = {
    bleed: { id: 'bleed', name: 'โจมตีติดเลือด', icon: 'thrust', baseLevel: 30, bonus: BLEED_CHANCE,
      description: `เมื่อโจมตีโดน มีโอกาส ${BLEED_CHANCE * 100}% ทำให้เลือดไหล ${BLEED_TICKS} วินาที ดาเมจ ${BLEED_DAMAGE_FRACTION * 100}% ของการโจมตีต่อวินาที` },
    mastery: { id: 'mastery', name: 'ชำนาญดาบ', icon: 'blade', baseLevel: 2, jobLevel: 1, stat: ['STR', 3], bonus: 0.1,
      description: 'เพิ่มความเสียหาย 10% เมื่อถือดาบ' },
    precision: { id: 'precision', name: 'จังหวะดาบ', icon: 'star', baseLevel: 5, jobLevel: 3, stat: ['DEX', 6], bonus: 0.08,
      description: 'เพิ่มโอกาสคริติคอล 8 จุดเปอร์เซ็นต์เมื่อถือดาบ' },
    discipline: { id: 'discipline', name: 'วินัยนักดาบ', icon: 'leaf', baseLevel: 6, jobLevel: 5, stat: ['INT', 7], bonus: 1,
      description: 'ฟื้นมานาเพิ่ม 1 หน่วยทุก 2 วินาที' },
  };
  const QUEST = {
    npcId: 'elder', title: 'เฝ้าท่ามะขาม', description: 'ช่วยลุงขามกำจัดลิงป่า Lv. 1 จำนวน 3 ตัว', needed: 3,
    rewards: { item: 'bronze_sword', gold: halfGold(35), ...experienceReward(38, 18) },
  };
  const QUEST_OBJECTIVES = {
    available: 'คุยกับลุงขามเพื่อรับภารกิจ', active: 'กำจัดลิงป่า Lv. 1',
    ready: 'กลับไปรายงานลุงขาม', completed: 'เดินทางต่อสู่ดงเจดีย์ร้าง',
  };
  const RUINS_QUEST = {
    npcId: 'ruins-guard', title: 'เปิดประตูดงเจดีย์ร้าง',
    description: `กำจัด${MONSTERS.ghost.name} 10 ตัว และ${MONSTERS.guardian.name} 5 ตัว แล้วกลับไปรายงานพรานหม่อง`,
    goals: { ghost: 10, guardian: 5 },
    rewards: { unlock: 'เปิดทางสู่ป่าช้าวัดร้าง' },
  };
  const RUINS_QUEST_OBJECTIVES = {
    available: 'คุยกับพรานหม่อง', active: 'กำจัดมอนสเตอร์ตามเป้าหมาย',
    ready: 'กลับไปหาพรานหม่อง', completed: 'เดินทางต่อสู่ป่าช้าวัดร้าง',
  };
  const HARBOR_QUEST = {
    npcId: 'harbor-master', title: 'เรือเที่ยวสุดท้าย',
    description: 'เก็บหีบสินค้าริมท่าฝั่งตะวันออก ปราบชาละวันที่กลางลาน แล้วนำหีบกลับไปให้นายท่าอิน', needed: 1,
    rewards: { unlock: 'เปิดจุดขึ้นเรือท่าข้าม' },
  };
  const HARBOR_QUEST_OBJECTIVES = {
    available: 'คุยกับนายท่าอิน', active: 'เก็บหีบสินค้าริมท่าฝั่งตะวันออก',
    fight: 'ปราบชาละวันกลางลานท่าเรือ',
    ready: 'นำหีบไปให้นายท่าอิน', completed: 'เปิดจุดขึ้นเรือแล้ว',
  };
  const HARBOR_QUEST_DIALOGUE = {
    available: 'เรือเที่ยวสุดท้ายกำลังจะออก แต่หีบสินค้าหลุดจากเชือกตอนเทียบท่า น้ำซัดไปเกยริมท่าฝั่งตะวันออก ฝากเจ้าไปเก็บกลับมาให้ข้าที',
    active: 'เดินเลียบแม่น้ำไปทางตะวันออก มองหาหีบไม้ แล้วนำกลับมาหาข้า',
    fight: 'ชาละวันขึ้นมาบนลานแล้ว! ปราบมันก่อน เราถึงจะเปิดท่าให้เรือออกได้',
    ready: 'ได้หีบคืนแล้ว ขอบใจมาก! ข้าเปิดจุดขึ้นเรือตรงศาลาริมน้ำให้เจ้าแล้ว พอลงเรือฝั่งป่าจากน้ำกร่อย ให้ไปหาครูเข้มใกล้ท่าน้ำ',
    completed: 'ขึ้นเรือตรงศาลาริมน้ำไปป่าจากน้ำกร่อยได้เลย ครูเข้มฝึกทหารใหม่อยู่ใกล้ท่าน้ำฝั่งนั้น',
  };
  const NIPA_QUEST = {
    npcId: 'recruit-trainer', title: 'ทดสอบการเป็นทหาร',
    description: 'กำจัดงูเห่า 10 ตัวและนางพญางูเห่า 1 ตัว แล้วกลับไปรายงานครูเข้มที่ป่าจากน้ำกร่อย',
    goals: { cobra: 10, cobra_queen: 1 },
    rewards: { item: 'recruit_badge', xp: 450, jobXp: 225 },
  };
  const NIPA_QUEST_OBJECTIVES = {
    available: 'คุยกับครูเข้มใกล้ท่าน้ำป่าจาก',
    active: 'กำจัดงูเห่าและนางพญางูเห่าที่ป่าจากน้ำกร่อย',
    ready: 'กลับไปรายงานครูเข้ม',
    completed: 'ได้รับป้ายรับรองเป็นทหารใหม่',
  };
  const NIPA_QUEST_DIALOGUE = {
    available: 'ถ้าอยากเป็นทหาร ให้ช่วยเปิดทางริมน้ำให้ชาวบ้านเดินได้ปลอดภัย กำจัดงูตามเป้าหมายแล้วกลับมารายงานข้า',
    active: 'มองพื้นให้ดีตอนนางพญาง้างหัว ถ้าเห็นวงเตือน ให้ถอยพ้นวงก่อนพิษจะตก ครบตามที่สั่งแล้วกลับมารายงานข้าที่นี่',
    ready: 'เจ้าทำได้ครบตามที่สั่ง ทางริมน้ำปลอดภัยขึ้นแล้ว รับป้ายนี้ไว้ ข้าขอรับรองว่าเจ้าผ่านการทดสอบเป็นทหารใหม่',
    completed: 'เก็บป้ายรับรองไว้ให้ดี เมื่อมีคนถามว่าใครเป็นผู้รับรอง ก็บอกไปว่าครูเข้มแห่งท่าน้ำป่าจาก',
  };
  const DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const GRID = 20;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const isFightable = enemy => enemy.hp > 0 && !enemy.entrance;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const expNeeded = level => 48 + (level - 1) * 29;
  const jobExpNeeded = level => 30 + (level - 1) * 17;
  let memorySave = null;

  function availableStorage(custom) {
    if (custom !== undefined) return custom ? [{ mode: 'local', backend: custom }] : [];
    const result = [];
    for (const [property, mode] of [['localStorage', 'local'], ['sessionStorage', 'session']]) {
      try {
        if (window[property]) result.push({ mode, backend: window[property] });
      } catch { /* Storage availability depends on the browser and document origin. */ }
    }
    if (window.history?.replaceState) {
      result.push({ mode: 'session', backend: {
        getItem: key => window.history.state?.[key],
        setItem: (key, value) => window.history.replaceState({ ...window.history.state, [key]: value }, ''),
      } });
    }
    result.push({ mode: 'memory', backend: {
      getItem: () => memorySave,
      setItem: (key, value) => { memorySave = value; },
    } });
    return result;
  }

  function readSave(storage) {
    try {
      return JSON.parse(storage?.getItem(SAVE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function questStatus(value, count) {
    if (value === 'completed') return 'completed';
    if (value === 'ready' || (value === 'active' && count >= QUEST.needed)) return 'ready';
    return value === 'active' ? 'active' : 'available';
  }

  function boundedNumber(value, fallback, minimum, maximum) {
    return Number.isFinite(value) ? clamp(Math.floor(value), minimum, maximum) : fallback;
  }

  function readHuntQuest(quest, objectives, saved) {
    const started = ['active', 'ready', 'completed'].includes(saved?.status);
    const counts = Object.fromEntries(Object.entries(quest.goals).map(([id, needed]) =>
      [id, started ? boundedNumber(saved.counts?.[id], 0, 0, needed) : 0]));
    const ready = meetsHuntGoals(quest.goals, counts);
    const status = ready ? (saved.status === 'completed' ? 'completed' : 'ready') : started ? 'active' : 'available';
    return { ...quest, status, counts, objective: objectives[status] };
  }

  function meetsHuntGoals(goals, counts) {
    return Object.entries(goals).every(([id, needed]) => counts[id] === needed);
  }

  function readHarborQuest(saved) {
    const started = ['active', 'fight', 'ready', 'completed'].includes(saved?.status);
    const count = started ? boundedNumber(saved.count, 0, 0, HARBOR_QUEST.needed) : 0;
    const collected = count === HARBOR_QUEST.needed;
    const bossDefeated = collected && saved.bossDefeated === true;
    let status = started ? 'active' : 'available';
    if (collected) status = saved.status === 'completed' ? 'completed' : bossDefeated ? 'ready' : 'fight';
    const loot = collected && saved.loot === 'earned' ? 'earned' :
      status === 'completed' && saved.loot === 'challenge' ? 'challenge' : 'unclaimed';
    return { ...HARBOR_QUEST, status, count, bossDefeated, loot, ferryUsed: status === 'completed' && saved.ferryUsed === true,
      objective: HARBOR_QUEST_OBJECTIVES[loot === 'challenge' ? 'fight' : status] };
  }

  function readCemeteryHunt(value, deadline) {
    const now = Date.now();
    const respawnAt = Number.isFinite(deadline) && deadline > now ? Math.min(deadline, now + CEMETERY_RESPAWN_DELAY) : 0;
    const count = respawnAt ? 0 : boundedNumber(value, 0, 0, CEMETERY_HUNT.needed);
    return { ...CEMETERY_HUNT, status: 'active', count, respawnAt, objective: respawnAt ? 'รอฝูงมอนสเตอร์กลับมา' :
      count === CEMETERY_HUNT.needed ? 'ผีเปรตอยู่ที่ลานพิธี' : 'กำจัดมอนสเตอร์ในป่าช้า' };
  }

  function readQueenSpawn(deadline) {
    return Number.isFinite(deadline) && deadline > 0 ? Math.min(deadline, Date.now() + QUEEN_RESPAWN[1] * 1000) : 0;
  }

  function queenSpawnAfter([min, max]) {
    return Date.now() + (min + Math.random() * (max - min)) * 1000;
  }

  function questProgress(quest) {
    if (!quest.goals) return `${quest.count} / ${quest.needed}`;
    return Object.entries(quest.goals).map(([id, needed]) => `${MONSTERS[id].name} ${quest.counts[id]}/${needed}`).join(' · ');
  }

  function itemAction(id) {
    const item = typeof id === 'string' && Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
    return item?.slot ? 'equip' : item?.type === 'consumable' ? 'use-item' : null;
  }

  function readItemSlots(savedSlots) {
    const choices = Array.isArray(savedSlots) ? savedSlots : [];
    const used = new Set();
    return Array.from({ length: ITEM_SLOT_COUNT }, (_, index) => {
      const id = choices[index];
      if (!itemAction(id) || used.has(id)) return null;
      used.add(id);
      return id;
    });
  }

  function meetsItemLevel(item, level) {
    return level >= (item.baseLevel ?? 1);
  }

  function readTradeCounts(savedCounts, priceKey) {
    const counts = {};
    for (const [id, item] of Object.entries(ITEMS)) {
      const count = boundedNumber(savedCounts?.[id], 0, 0, Number.MAX_SAFE_INTEGER);
      if (item[priceKey] > 0 && count > 0) counts[id] = count;
    }
    return counts;
  }

  function countEquipped(equipment, id) {
    return Object.values(equipment).filter(itemId => itemId === id).length;
  }

  function makePlayer(saved = {}) {
    const inventory = { potion: 3, elixir: 1, rusty_sword: 1 };
    if (saved.inventory && typeof saved.inventory === 'object') {
      for (const id of Object.keys(ITEMS)) {
        const count = boundedNumber(saved.inventory[id], 0, 0, id === 'ghost_key' ? 1 : 9999);
        if (count) inventory[id] = count;
        else delete inventory[id];
      }
      inventory.rusty_sword = 1;
    }
    const stats = Object.fromEntries(STAT_KEYS.map(key => [key, boundedNumber(saved.stats?.[key], 1, 1, 999)]));
    const equipment = { weapon: STARTER_PLAYER.weapon };
    const classTier = boundedNumber(saved.classTier, 1, 1, 3);
    const caps = CLASS_LEVEL_CAPS[classTier];
    const level = boundedNumber(saved.level, 1, 1, caps.base);
    for (const [slot, id] of Object.entries(saved.equipment || {})) {
      if (slot !== 'card' && Object.hasOwn(ITEMS, id) && ITEMS[id].slot === slot && inventory[id] && meetsItemLevel(ITEMS[id], level)) {
        equipment[slot] = id;
      }
    }
    for (const slot of CARD_SLOTS) {
      const id = saved.equipment?.[slot.id];
      if (classTier >= slot.classTier && Object.hasOwn(ITEMS, id) && ITEMS[id].slot === 'card' &&
          meetsItemLevel(ITEMS[id], level) && countEquipped(equipment, id) < inventory[id]) {
        equipment[slot.id] = id;
      }
    }
    const player = {
      x: 770, y: 570, dir: 's', moving: false, action: 'idle', actionTime: 0,
      name: STARTER_PLAYER.name, job: STARTER_PLAYER.job, level, classTier,
      jobLevel: boundedNumber(saved.jobLevel, 1, 1, caps.job),
      xp: boundedNumber(saved.xp, 0, 0, 1000000), jobXp: boundedNumber(saved.jobXp, 0, 0, 1000000),
      gold: boundedNumber(saved.gold, 12, 0, 10000000), statPoints: boundedNumber(saved.statPoints, 0, 0, 9999),
      inventory, equipment, stats, hp: 100, mp: 50, guardTime: 0, stunTime: 0, bleed: null, poison: null,
      tradeCounts: {
        bought: readTradeCounts(saved.tradeCounts?.bought, 'price'),
        sold: readTradeCounts(saved.tradeCounts?.sold, 'sell'),
      },
    };
    updateAttributes(player);
    player.hp = boundedNumber(saved.hp, player.maxHp, 1, player.maxHp);
    player.mp = boundedNumber(saved.mp, player.maxMp, 0, player.maxMp);
    return player;
  }

  function derivedAttributes(player, stats) {
    const equipped = Object.values(player.equipment).map(id => ITEMS[id]);
    return {
      maxHp: 100 + (player.level - 1) * 10 + (stats.VIT - 1) * 8 + equipped.reduce((total, item) => total + (item.hp || 0), 0),
      maxMp: 50 + (player.jobLevel - 1) * 4 + (stats.INT - 1) * 5,
      attack: 11 + (player.level - 1) * 2 + (stats.STR - 1) * 3 + equipped.reduce((total, item) => total + (item.attack || 0), 0),
      defense: (stats.VIT - 1) * .65 + equipped.reduce((total, item) => total + (item.defense || 0), 0),
    };
  }

  function updateAttributes(player) {
    Object.assign(player, derivedAttributes(player, player.stats));
    const { base, job } = CLASS_LEVEL_CAPS[player.classTier];
    player.maxLevel = base;
    player.maxJobLevel = job;
    player.nextXp = player.level < base ? expNeeded(player.level) : 0;
    player.nextJobXp = player.jobLevel < job ? jobExpNeeded(player.jobLevel) : 0;
    if (player.nextXp === 0) player.xp = 0;
    if (player.nextJobXp === 0) player.jobXp = 0;
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }

  function direction(dx, dy) {
    return DIRECTIONS[(Math.round(Math.atan2(dy, dx) * 4 / Math.PI) + 8) % 8];
  }

  function inGateApproach(x, y, gate) {
    const { route, halfWidth } = gate;
    const segment = route.findIndex(([endX], index) => index > 0 && x <= endX);
    if (segment < 0) return false;
    const [fromX, fromY] = route[segment - 1];
    const [toX, toY] = route[segment];
    const center = fromY + (toY - fromY) * (x - fromX) / (toX - fromX);
    return Math.abs(y - center) <= halfWidth;
  }

  function canStand(point, zone, margin = 10) {
    const { x, y } = point;
    const { left, right, top, bottom } = zone.bounds;
    if (!(x >= left && x <= right && y >= top && y <= bottom)) return false;
    const approaches = zone.gateApproaches?.filter(gate => gate.outer > gate.inner ? x > gate.inner : x < gate.inner);
    if (approaches?.length) {
      if (!approaches.some(gate => inGateApproach(x, y, gate))) return false;
    } else {
      const innerGate = zone.innerGate;
      if (innerGate && y < innerGate.approachY &&
          (Math.abs(x - innerGate.x) > innerGate.halfWidth || (!innerGate.open && y < innerGate.y))) return false;
      const shore = zone.northShore;
      if (shore) {
        const segment = shore.findIndex(([endX], index) => index > 0 && x <= endX);
        if (segment > 0) {
          const [fromX, fromY] = shore[segment - 1];
          const [toX, toY] = shore[segment];
          if (y < fromY + (toY - fromY) * (x - fromX) / (toX - fromX)) return false;
        }
      }
    }
    return !zone.obstacles.some(rect =>
      x > rect.x - margin && x < rect.x + rect.w + margin && y > rect.y - margin && y < rect.y + rect.h + margin);
  }

  function straightPath(start, end, zone) {
    if (!canStand(end, zone)) return false;
    const segments = Math.ceil(distance(start, end) / 9);
    for (let i = 1; i < segments; i++) {
      const fraction = i / segments;
      const x = start.x + (end.x - start.x) * fraction;
      const y = start.y + (end.y - start.y) * fraction;
      if (!canStand({ x, y }, zone)) return false;
    }
    return true;
  }

  function pathTo(start, goal, zone) {
    const { left, right, top, bottom } = zone.bounds;
    const destination = { x: clamp(goal.x, left, right), y: clamp(goal.y, top, bottom) };
    if (straightPath(start, destination, zone)) return [destination];

    const gridPoint = (column, row) => ({ x: left + column * GRID, y: top + row * GRID });
    function closestNode(point, requireConnection) {
      const column = Math.round((point.x - left) / GRID);
      const row = Math.round((point.y - top) / GRID);
      let closest = null;
      let bestDistance = Infinity;
      for (let dx = -7; dx <= 7; dx++) {
        for (let dy = -7; dy <= 7; dy++) {
          const node = gridPoint(column + dx, row + dy);
          const gap = distance(point, node);
          if (gap >= bestDistance || !canStand(node, zone)) continue;
          if (requireConnection && !straightPath(point, node, zone)) continue;
          closest = { ...node, column: column + dx, row: row + dy };
          bestDistance = gap;
        }
      }
      return closest;
    }

    const first = closestNode(start, true);
    const last = closestNode(destination, false);
    if (!first || !last) return [];
    const key = node => `${node.column},${node.row}`;
    const open = [{ ...first, cost: 0, score: distance(first, last), previous: null }];
    const costs = new Map([[key(first), 0]]);
    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].score < open[best].score) best = i;
      }
      const current = open.splice(best, 1)[0];
      if (current.cost > costs.get(key(current))) continue;
      if (key(current) === key(last)) {
        const raw = [];
        for (let node = current; node; node = node.previous) raw.unshift({ x: node.x, y: node.y });
        if (straightPath(last, destination, zone)) raw.push(destination);
        const compact = [];
        let anchor = start;
        for (let i = 0; i < raw.length; i++) {
          if (i + 1 < raw.length && straightPath(anchor, raw[i + 1], zone)) continue;
          compact.push(raw[i]);
          anchor = raw[i];
        }
        return compact;
      }
      for (const [dx, dy] of STEPS) {
        const column = current.column + dx;
        const row = current.row + dy;
        const node = { ...gridPoint(column, row), column, row };
        if (!straightPath(current, node, zone)) continue;
        const cost = current.cost + distance(current, node);
        const id = key(node);
        if (cost >= (costs.get(id) ?? Infinity)) continue;
        costs.set(id, cost);
        open.push({ ...node, cost, score: cost + distance(node, last), previous: current });
      }
    }
    return [];
  }

  function moveEntity(entity, point, zone) {
    const { x, y } = point;
    const previous = { x: entity.x, y: entity.y };
    if (canStand(point, zone)) {
      entity.x = x;
      entity.y = y;
    } else {
      if (canStand({ x, y: entity.y }, zone)) entity.x = x;
      if (canStand({ x: entity.x, y }, zone)) entity.y = y;
    }
    entity.moving = distance(entity, previous) > 0.02;
    if (entity.moving) entity.dir = direction(entity.x - previous.x, entity.y - previous.y);
  }

  function moveToward(entity, point, step, zone) {
    const gap = distance(entity, point);
    if (gap === 0) return;
    const next = gap <= step ? point : {
      x: entity.x + (point.x - entity.x) * (step / gap),
      y: entity.y + (point.y - entity.y) * (step / gap),
    };
    moveEntity(entity, next, zone);
  }

  function updateRabbit(rabbit, dt, zone) {
    if (rabbit.rest > 0) {
      rabbit.rest = Math.max(0, rabbit.rest - dt);
      return;
    }
    if (!rabbit.hop) {
      const [x, y] = rabbit.route[rabbit.waypoint];
      const goal = { x, y };
      const gap = distance(rabbit, goal);
      if (gap < .01 || !straightPath(rabbit, goal, zone)) {
        rabbit.waypoint = (rabbit.waypoint + 1) % rabbit.route.length;
        rabbit.rest = .8;
        return;
      }
      const fraction = Math.min(1, RABBIT_HOP.distance / gap);
      if (x !== rabbit.x) rabbit.facingRight = x > rabbit.x;
      rabbit.hop = {
        x: rabbit.x, y: rabbit.y,
        dx: (x - rabbit.x) * fraction, dy: (y - rabbit.y) * fraction,
      };
    }
    const { takeoff, landing, duration } = RABBIT_HOP;
    rabbit.phase = Math.min(1, rabbit.phase + dt / duration);
    const travel = clamp((rabbit.phase - takeoff) / (landing - takeoff), 0, 1);
    rabbit.x = rabbit.hop.x + rabbit.hop.dx * travel;
    rabbit.y = rabbit.hop.y + rabbit.hop.dy * travel;
    if (rabbit.phase === 1) {
      rabbit.phase = 0;
      rabbit.hop = null;
    }
  }

  function animate(entity, dt) {
    entity.actionTime = Math.max(0, entity.actionTime - dt);
    if (entity.actionTime === 0) entity.action = entity.moving ? 'walk' : 'idle';
  }

  function pose(entity, action, seconds) {
    entity.action = action;
    entity.actionDuration = seconds;
    entity.actionTime = seconds;
  }

  function isAreaAttack(enemy) {
    return enemy.slam && enemy.attackStyle === (enemy.slam.style ?? 'pret-slam');
  }

  function enemyImpactTime(enemy) {
    if (isAreaAttack(enemy)) return enemy.slam.recovery;
    if (enemy.attackTell) return enemy.actionDuration - enemy.attackTell.windup;
    return enemy.actionDuration * (1 - STRIKE_PHASE);
  }

  function autoOptions(settings) {
    const choices = Array.isArray(settings?.skillIds) ? settings.skillIds : [];
    const used = new Set();
    const skillIds = Array.from({ length: AUTO_SKILL_SLOT_COUNT }, (_, index) => {
      const id = choices[index];
      if (!ACTIVE_SKILL_IDS.has(id) || used.has(id)) return null;
      used.add(id);
      return id;
    });
    return {
      range: Object.hasOwn(AUTO_RANGES, settings?.range) ? settings.range : 'medium',
      hpBelow: boundedNumber(settings?.hpBelow, 50, 0, 100),
      mpBelow: boundedNumber(settings?.mpBelow, 40, 0, 100),
      skillIds,
    };
  }

  function createFrameClock() {
    let previousFrame = null;
    let accumulated = 0;
    return {
      advance(now, step) {
        if (previousFrame !== null) {
          accumulated += clamp((now - previousFrame) / 1000, 0, MAX_FRAME_SECONDS);
        }
        previousFrame = now;
        while (accumulated + 1e-9 >= SIMULATION_STEP) {
          accumulated = Math.max(0, accumulated - SIMULATION_STEP);
          step(SIMULATION_STEP);
        }
      },
      reset() {
        previousFrame = null;
        accumulated = 0;
      },
    };
  }

  function create(options = {}) {
    const stores = availableStorage(options.storage);
    let saved = null;
    let saveMode = null;
    for (const { backend, mode } of stores) {
      const candidate = readSave(backend);
      if (candidate?.player && candidate?.quest && (!saved || (candidate.savedAt || 0) > (saved.savedAt || 0))) {
        saved = candidate;
        saveMode = mode;
      }
    }
    const player = makePlayer(saved?.player || {});
    const zones = options.zones || ZONES;
    const count = boundedNumber(saved?.quest?.count, 0, 0, QUEST.needed);
    const status = questStatus(saved?.quest?.status, count);
    const progress = status === 'ready' || status === 'completed' ? QUEST.needed : count;
    const skills = ACTIVE_SKILLS.map(skill => ({ ...skill, remaining: 0 }));
    const skillsById = new Map(skills.map(skill => [skill.id, skill]));
    const skillSlots = readSkillSlots(saved?.skillSlots ?? (saved ? DEFAULT_SKILL_SLOTS : []));
    const state = {
      player, zone: null, zoneInfo: null, enemies: [], npcs: [], wildlife: [], interactables: [], portals: [], targetId: null,
      quest: { ...QUEST, status, count: progress, objective: QUEST_OBJECTIVES[status] },
      ruinsQuest: readHuntQuest(RUINS_QUEST, RUINS_QUEST_OBJECTIVES, saved?.ruinsQuest),
      cemeteryHunt: readCemeteryHunt(saved?.cemeteryKills, saved?.cemeteryRespawnAt),
      harborUnlocked: saved?.harborUnlocked === true,
      harborQuest: readHarborQuest(saved?.harborQuest),
      nipaQuest: readHuntQuest(NIPA_QUEST, NIPA_QUEST_OBJECTIVES, saved?.nipaQuest),
      queenSpawnAt: readQueenSpawn(saved?.queenSpawnAt), venomPool: null,
      trackedQuest: null,
      skills, passiveSkills: Object.values(PASSIVE_SKILLS), skillSlots, itemSlots: readItemSlots(saved?.itemSlots),
      enabledSkills: readEnabledSkills(saved, skillSlots), items: ITEMS,
      auto: { ...autoOptions(saved?.auto), enabled: false },
      trainingCooldowns: saved?.trainingCooldowns !== false,
      trainingManaCosts: saved?.trainingManaCosts !== false,
      destination: null, interacting: null, autoAttack: false, dead: false, saved: Boolean(saved), saveMode,
    };
    const subscribers = new Set();
    let waypoints = [];
    let attackCooldown = 0;
    let repath = 0;
    let regeneration = 0;
    let simulationTime = 0;
    let timeSinceSave = 0;
    let reviveIn = 0;
    let pendingInteract = null;
    let pendingStrike = null;
    let autoSearchWait = 0;
    let autoItemWait = 0;

    function emit(event) {
      for (const fn of subscribers) fn(event);
    }

    function notice(text) {
      emit({ type: 'notice', text });
    }

    function skillRequirements(skill, stats = player.stats) {
      const requirements = [{ label: 'Base Lv.', minimum: skill.baseLevel, current: player.level }];
      if (skill.jobLevel) requirements.push({ label: 'Job Lv.', minimum: skill.jobLevel, current: player.jobLevel });
      if (skill.stat) {
        const [stat, minimum] = skill.stat;
        requirements.push({ label: stat, minimum, current: stats[stat] });
      }
      return requirements;
    }

    function isSkillUnlocked(skill, stats) {
      return Boolean(skill && skillRequirements(skill, stats).every(({ current, minimum }) => current >= minimum));
    }

    function findSkill(id) {
      return skillsById.get(id) ?? (typeof id === 'string' && Object.hasOwn(PASSIVE_SKILLS, id) ? PASSIVE_SKILLS[id] : null);
    }

    function readEnabledSkills(saved, slots) {
      if (Array.isArray(saved?.enabledSkills)) return new Set(saved.enabledSkills.filter(id => findSkill(id)));
      // Migrate assignments from saves created before explicit activation.
      const disabled = Array.isArray(saved?.disabledSkills) ? new Set(saved.disabledSkills) : new Set();
      const chosen = [...slots, ...autoOptions(saved?.auto).skillIds];
      return new Set(chosen.filter(id => !disabled.has(id) && isSkillUnlocked(findSkill(id))));
    }

    function isSkillEnabled(skill, stats) {
      return isSkillUnlocked(skill, stats) && state.enabledSkills.has(skill.id);
    }

    function enableSkill(id) {
      const skill = findSkill(id);
      if (!isSkillUnlocked(skill)) return false;
      if (state.enabledSkills.has(id)) return true;
      state.enabledSkills.add(id);
      save();
      return true;
    }

    function readSkillSlots(savedSlots) {
      if (!Array.isArray(savedSlots)) return [...DEFAULT_SKILL_SLOTS];
      const used = new Set();
      return DEFAULT_SKILL_SLOTS.map((_, index) => {
        const id = savedSlots[index];
        if (used.has(id) || !skillsById.has(id)) return null;
        used.add(id);
        return id;
      });
    }

    function getSlotSkill(slot) {
      return skillsById.get(state.skillSlots[slot - 1]);
    }

    function assignSlot(slots, slot, id) {
      if (!Number.isInteger(slot) || slot < 1 || slot > slots.length) return false;
      const index = slot - 1;
      const previous = slots[index];
      if (previous === id) return true;
      const other = id === null ? -1 : slots.indexOf(id);
      if (other !== -1) slots[other] = previous;
      slots[index] = id;
      save();
      return true;
    }

    function assignSkill(slot, id) {
      if (id !== null && !isSkillEnabled(skillsById.get(id))) return false;
      return assignSlot(state.skillSlots, slot, id);
    }

    function assignItemSlot(slot, id) {
      if (id !== null && (!itemAction(id) || !player.inventory[id])) return false;
      return assignSlot(state.itemSlots, slot, id);
    }

    function clearSkillSlots() {
      state.skillSlots.fill(null);
      save();
    }

    function passiveBonus(skill, stats) {
      return isSkillEnabled(skill, stats) ? skill.bonus : 0;
    }

    function exportSave() {
      const { x, y, hp, mp, level, jobLevel, classTier, xp, jobXp, gold, stats, statPoints, inventory, equipment, tradeCounts } = player;
      const { count, status } = state.quest;
      const { status: ruinsStatus, counts } = state.ruinsQuest;
      const { status: nipaStatus, counts: nipaCounts } = state.nipaQuest;
      const { status: harborStatus, count: harborCount, bossDefeated, loot, ferryUsed } = state.harborQuest;
      const position = state.dead ? zones.village.spawn : [x, y];
      const { range, hpBelow, mpBelow, skillIds } = state.auto;
      return JSON.stringify({ version: 1, savedAt: Date.now(), zone: state.dead ? 'village' : state.zone, quest: { status, count },
        ruinsQuest: { status: ruinsStatus, counts }, cemeteryKills: state.cemeteryHunt.count,
        cemeteryRespawnAt: state.cemeteryHunt.respawnAt, queenSpawnAt: state.queenSpawnAt,
        harborUnlocked: state.harborUnlocked,
        harborQuest: { status: harborStatus, count: harborCount, bossDefeated, loot, ferryUsed },
        nipaQuest: { status: nipaStatus, counts: nipaCounts },
        trainingCooldowns: state.trainingCooldowns,
        trainingManaCosts: state.trainingManaCosts,
        auto: { range, hpBelow, mpBelow, skillIds }, skillSlots: state.skillSlots, itemSlots: state.itemSlots,
        enabledSkills: [...state.enabledSkills],
        player: { x: position[0], y: position[1], hp: state.dead ? player.maxHp : hp,
          mp: state.dead ? player.maxMp : mp, level, jobLevel, classTier, xp, jobXp, gold, stats, statPoints, inventory, equipment, tradeCounts } });
    }

    function save() {
      const data = exportSave();
      for (const { backend, mode } of stores) {
        try {
          backend.setItem(SAVE_KEY, data);
          state.saved = true;
          state.saveMode = mode;
          return true;
        } catch { /* Try the next storage backend. */ }
      }
      return false;
    }

    function importSave(data) {
      let restored;
      try { restored = JSON.parse(data); } catch { return false; }
      if (restored?.version !== 1 || !restored.player?.stats || !Object.hasOwn(QUEST_OBJECTIVES, restored.quest?.status)) return false;
      const progress = boundedNumber(restored.quest.count, 0, 0, QUEST.needed);
      const status = questStatus(restored.quest.status, progress);
      Object.assign(player, makePlayer(restored.player));
      state.skillSlots = readSkillSlots(restored.skillSlots);
      state.itemSlots = readItemSlots(restored.itemSlots);
      state.enabledSkills = readEnabledSkills(restored, state.skillSlots);
      state.trainingCooldowns = restored.trainingCooldowns !== false;
      state.trainingManaCosts = restored.trainingManaCosts !== false;
      Object.assign(state.auto, autoOptions(restored.auto), { enabled: false });
      autoSearchWait = 0;
      autoItemWait = 0;
      state.quest.count = status === 'ready' || status === 'completed' ? QUEST.needed : progress;
      state.ruinsQuest = readHuntQuest(RUINS_QUEST, RUINS_QUEST_OBJECTIVES, restored.ruinsQuest);
      state.cemeteryHunt = readCemeteryHunt(restored.cemeteryKills, restored.cemeteryRespawnAt);
      state.harborUnlocked = restored.harborUnlocked === true;
      state.harborQuest = readHarborQuest(restored.harborQuest);
      state.nipaQuest = readHuntQuest(NIPA_QUEST, NIPA_QUEST_OBJECTIVES, restored.nipaQuest);
      state.queenSpawnAt = readQueenSpawn(restored.queenSpawnAt);
      setQuest(status);
      state.dead = false;
      attackCooldown = 0;
      regeneration = 0;
      for (const skill of state.skills) skill.remaining = 0;
      enterZone(savedZone(restored.zone), { x: restored.player.x, y: restored.player.y });
      save();
      return true;
    }

    function resetLevels() {
      Object.assign(player, { level: 1, jobLevel: 1, xp: 0, jobXp: 0 });
      if (!meetsItemLevel(ITEMS[player.equipment.weapon], player.level)) player.equipment.weapon = 'rusty_sword';
      updateAttributes(player);
      if (!isSkillEnabled(skillsById.get('guard'))) player.guardTime = 0;
      if (pendingStrike && pendingStrike.style !== 'basic' && !isSkillEnabled(skillsById.get(pendingStrike.style))) {
        pendingStrike = null;
        pose(player, 'idle', 0);
      }
      save();
    }

    function resetCharacter() {
      const [x, y] = zones.village.spawn;
      const { range, hpBelow, mpBelow } = state.auto;
      return importSave(JSON.stringify({
        version: 1, zone: 'village', player: { x, y, stats: {} },
        quest: { status: 'available', count: 0 }, skillSlots: [], enabledSkills: [],
        auto: { range, hpBelow, mpBelow },
      }));
    }

    function cancelMovement() {
      waypoints = [];
      state.destination = null;
      state.autoAttack = false;
      state.interacting = null;
      pendingInteract = null;
    }

    function setAuto(enabled) {
      const next = Boolean(enabled) && !state.dead;
      if (state.auto.enabled === next) return next;
      state.auto.enabled = next;
      cancelMovement();
      state.targetId = null;
      pendingStrike = null;
      autoSearchWait = 0;
      return next;
    }

    function configureAuto(settings) {
      Object.assign(state.auto, autoOptions({ ...state.auto, ...settings }));
      save();
    }

    function skillCooldownsEnabled() {
      return state.zone !== 'training' || state.trainingCooldowns;
    }

    function setTrainingCooldowns(enabled) {
      if (state.zone !== 'training') return false;
      state.trainingCooldowns = Boolean(enabled);
      save();
      return true;
    }

    function skillManaCostsEnabled() {
      return state.zone !== 'training' || state.trainingManaCosts;
    }

    function setTrainingManaCosts(enabled) {
      if (state.zone !== 'training') return false;
      state.trainingManaCosts = Boolean(enabled);
      save();
      return true;
    }

    function savedZone(id) {
      if (id === 'training' && zones.training) return id;
      if (id === 'cemetery' && zones.cemetery && state.quest.status === 'completed' && state.ruinsQuest.status === 'completed') return id;
      if (id === 'harbor' && zones.harbor && state.harborUnlocked && state.quest.status === 'completed') return id;
      if (id === 'nipa' && zones.nipa && ferryUnlocked() && state.harborQuest.ferryUsed) return id;
      if (id === 'ruins' && zones.ruins && state.quest.status === 'completed') return id;
      return 'village';
    }

    function createEnemy(id, type, x, y, index = 0) {
      const details = MONSTERS[type];
      const name = type === 'dummy' ? `${details.name} ${index + 1}` : details.name;
      return { id, type, sprite: details.sprite ?? type, x, y, origin: { x, y }, name, level: details.level,
        hp: details.hp, maxHp: details.hp, moving: false, action: 'idle', actionTime: 0, dir: 's', visible: true,
        boss: Boolean(details.boss), aggro: false, cooldown: 0.6, slam: details.slam, slamCooldown: 0, attackTell: details.attackTell,
        slowTime: 0, wander: null,
        wanderIn: details.boss ? Infinity : 2 + index * 0.47, respawnIn: 0 };
    }

    function createZoneEnemies(zone) {
      return zone.enemies.map(([type, x, y], index) => createEnemy(`${zone.id}-${index}`, type, x, y, index));
    }

    function spawnCemeteryBoss() {
      const [x, y] = state.zoneInfo.bossSpawn;
      state.enemies = [createEnemy('cemetery-boss', state.zoneInfo.bossType ?? ZONES.cemetery.bossType, x, y)];
      state.targetId = null;
      cancelMovement();
    }

    function spawnHarborBoss() {
      const [x, y] = state.zoneInfo.bossSpawn;
      const [waterX, waterY] = state.zoneInfo.bossEntrance;
      const boss = createEnemy('harbor-boss', state.zoneInfo.bossType ?? ZONES.harbor.bossType, x, y);
      boss.entrance = { waterX, waterY, elapsed: 0, duration: MONSTERS.chalawan.entranceDuration };
      state.enemies.push(boss);
    }

    function updateQueenSpawn() {
      if (state.zone !== 'nipa' || Date.now() < state.queenSpawnAt ||
          state.enemies.some(enemy => enemy.type === 'cobra_queen' && (enemy.hp > 0 || enemy.visible))) return;
      const choices = QUEEN_SPAWN_POINTS.filter(([x, y]) => {
        const point = { x, y };
        return distance(player, point) >= 160 && canStand(point, state.zoneInfo);
      });
      if (!choices.length) return;
      const [x, y] = choices[Math.floor(Math.random() * choices.length)];
      state.enemies = state.enemies.filter(enemy => enemy.type !== 'cobra_queen');
      state.enemies.push(createEnemy('nipa-queen', state.zoneInfo.bossType ?? ZONES.nipa.bossType, x, y));
      notice('นางพญางูเห่าปรากฏตัวในป่าจากน้ำกร่อย');
    }

    function updateVenomPool() {
      const pool = state.venomPool;
      if (!pool) return;
      pool.elapsed = simulationTime - pool.start;
      if (pool.elapsed >= VENOM_POOL.duration - 1e-8) {
        state.venomPool = null;
        return;
      }
      if (simulationTime + 1e-8 < pool.nextTick) return;
      pool.nextTick += VENOM_POOL.interval;
      if (distance(player, pool) <= VENOM_POOL.radius) {
        const guard = player.guardTime > 0 ? .5 : 1;
        const damage = Math.max(1, Math.round(player.maxHp * VENOM_POOL.damageFraction * guard));
        damagePlayer(damage, { status: 'poison' });
      }
    }

    function recordCemeteryKill(enemy, receivedKey) {
      const { count, needed } = state.cemeteryHunt;
      if (!enemy.boss && count >= needed) return;
      const hunt = enemy.boss ? readCemeteryHunt(0, Date.now() + CEMETERY_RESPAWN_DELAY) : readCemeteryHunt(count + 1);
      state.cemeteryHunt = state.trackedQuest = hunt;
      if (hunt.count === needed) {
        spawnCemeteryBoss();
        notice('ผีเปรตปรากฏตัวที่ลานพิธี');
      } else if (enemy.boss) {
        const result = receivedKey ? 'ได้รับกุญแจผี 1 ดอก' : 'ปราบผีเปรตสำเร็จ';
        notice(`${result} · ฝูงมอนสเตอร์จะกลับมาใน ${CEMETERY_RESPAWN_DELAY / 1000} วินาที`);
      }
      emit({ type: 'quest', status: hunt.status, count: hunt.count });
    }

    function finishCemeteryRespawn() {
      const { respawnAt } = state.cemeteryHunt;
      if (!respawnAt || Date.now() < respawnAt) return;
      state.cemeteryHunt = readCemeteryHunt(0);
      if (state.zone === 'cemetery') {
        state.trackedQuest = state.cemeteryHunt;
        state.enemies = createZoneEnemies(state.zoneInfo);
        notice('ฝูงมอนสเตอร์กลับมาแล้ว เริ่มการล่ารอบใหม่');
        emit({ type: 'quest', status: 'active', count: 0 });
      }
      save();
    }

    function updateInteractables() {
      state.interactables = (state.zoneInfo.interactables ?? []).filter(entity =>
        entity.type !== 'harbor-crate' || state.harborQuest.status === 'active');
    }

    function refreshTrackedQuest() {
      const { zone, harborQuest, nipaQuest } = state;
      const harborStory = harborQuest.status === 'completed' && harborQuest.loot !== 'challenge' ? nipaQuest : harborQuest;
      state.trackedQuest = { cemetery: state.cemeteryHunt, ruins: state.ruinsQuest,
        harbor: harborStory, nipa: nipaQuest }[zone] ?? state.quest;
    }

    function enterZone(id, point, facing = 's') {
      const zone = zones[id];
      if (!zone) return;
      state.zone = id;
      state.venomPool = null;
      if (id === 'nipa' && !state.queenSpawnAt) state.queenSpawnAt = queenSpawnAfter(QUEEN_FIRST_SPAWN);
      refreshTrackedQuest();
      state.zoneInfo = zone.innerGate ? {
        ...zone, innerGate: { ...zone.innerGate, open: state.ruinsQuest.status === 'completed' },
      } : zone;
      state.npcs = zone.npcs;
      state.wildlife = (zone.wildlife ?? []).map(animal => ({
        ...animal, phase: 0, rest: .5, waypoint: 0, facingRight: false, hop: null,
      }));
      state.portals = zone.portals;
      updateInteractables();
      if (id !== 'cemetery') state.enemies = createZoneEnemies(zone);
      else if (state.cemeteryHunt.count === CEMETERY_HUNT.needed) spawnCemeteryBoss();
      else state.enemies = state.cemeteryHunt.respawnAt ? [] : createZoneEnemies(zone);
      const position = point && canStand(point, state.zoneInfo) ? point : { x: zone.spawn[0], y: zone.spawn[1] };
      placePlayer(position, facing);
      if (id === 'harbor' && (state.harborQuest.status === 'fight' || state.harborQuest.loot === 'challenge')) spawnHarborBoss();
      emit({ type: 'zone', zone: id, zoneInfo: state.zoneInfo });
    }

    function placePlayer(point, facing = 's') {
      pendingStrike = null;
      Object.assign(player, point, { dir: facing, moving: false, action: 'idle', actionTime: 0, stunTime: 0 });
      state.targetId = null;
      cancelMovement();
    }

    function nearestTown() {
      // Positions belong to their own maps. Add distances to the exits along the route.
      const pending = [{ zone: state.zoneInfo, point: player, cost: 0 }];
      const visited = new Set();
      while (pending.length) {
        pending.sort((a, b) => b.cost - a.cost);
        const { zone, point, cost } = pending.pop();
        if (visited.has(zone.id)) continue;
        if (zone.town) return zone;
        visited.add(zone.id);
        const ferries = ferryUnlocked() ? (zone.interactables ?? []).filter(entity => entity.type === 'ferry') : [];
        for (const portal of [...zone.portals, ...ferries]) {
          const next = zones[portal.target];
          if (!next || visited.has(next.id) || (portal.quest && state.quest.status !== 'completed')) continue;
          if (portal.key && !state.harborUnlocked) continue;
          if (portal.id === zone.innerGate?.id && state.ruinsQuest.status !== 'completed') continue;
          const [x, y] = portal.arrival ?? next.arrival ?? next.spawn;
          pending.push({ zone: next, point: { x, y }, cost: cost + distance(point, portal) });
        }
      }
      return null;
    }

    function routeTo(point, showDestination = true) {
      waypoints = pathTo(player, point, state.zoneInfo);
      state.destination = showDestination && waypoints.length ? waypoints.at(-1) : null;
      return waypoints.length > 0;
    }

    function moveTo(x, y) {
      if (state.dead || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      setAuto(false);
      cancelMovement();
      return routeTo({ x, y });
    }

    function targetEnemy() {
      return state.enemies.find(enemy => enemy.id === state.targetId && isFightable(enemy));
    }

    function selectTarget(id) {
      cancelMovement();
      state.targetId = state.enemies.some(enemy => enemy.id === id && isFightable(enemy)) ? id : null;
      return Boolean(state.targetId);
    }

    function closestToPlayer(entities, radius) {
      let closest = null;
      let bestRange = radius;
      for (const entity of entities) {
        const gap = distance(player, entity);
        if (gap < bestRange) {
          closest = entity;
          bestRange = gap;
        }
      }
      return closest;
    }

    function attack() {
      if (state.dead || player.stunTime > 0) return false;
      const enemy = targetEnemy() || closestToPlayer(state.enemies.filter(isFightable), 240);
      if (!enemy) return false;
      state.targetId = enemy.id;
      state.autoAttack = true;
      pendingInteract = null;
      state.destination = null;
      repath = 0;
      return true;
    }

    function addItem(id, count = 1) {
      player.inventory[id] = (player.inventory[id] || 0) + count;
    }

    function removeItem(id, count = 1) {
      player.inventory[id] -= count;
      if (player.inventory[id] === 0) delete player.inventory[id];
    }

    function discardableItemCount(id) {
      if (state.dead || typeof id !== 'string' || !Object.hasOwn(ITEMS, id)) return 0;
      if (ITEMS[id].discardable === false) return 0;
      const reserved = id === 'rusty_sword' ? 1 : countEquipped(player.equipment, id);
      return Math.max(0, (player.inventory[id] ?? 0) - reserved);
    }

    function discardItem(id, count) {
      if (!Number.isSafeInteger(count) || count < 1 || count > discardableItemCount(id)) return false;
      removeItem(id, count);
      if (!player.inventory[id]) state.itemSlots = state.itemSlots.map(itemId => itemId === id ? null : itemId);
      save();
      notice(`ทิ้ง${ITEMS[id].name} ×${count} แล้ว`);
      return true;
    }

    function giveExperience(xp, jobXp) {
      if (player.nextXp > 0) player.xp += xp;
      if (player.nextJobXp > 0) player.jobXp += jobXp;
      let leveled = false;
      while (player.nextXp > 0 && player.xp >= player.nextXp) {
        player.xp -= player.nextXp;
        player.level++;
        player.statPoints += 3;
        updateAttributes(player);
        leveled = true;
      }
      while (player.nextJobXp > 0 && player.jobXp >= player.nextJobXp) {
        player.jobXp -= player.nextJobXp;
        player.jobLevel++;
        player.statPoints++;
        updateAttributes(player);
        leveled = true;
      }
      if (leveled) {
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        emit({ type: 'level', x: player.x, y: player.y, text: `Base Lv. ${player.level} · Job Lv. ${player.jobLevel}` });
      }
    }

    function setQuest(status, quest = state.quest) {
      quest.status = status;
      const objectives = quest === state.harborQuest ? HARBOR_QUEST_OBJECTIVES :
        quest === state.nipaQuest ? NIPA_QUEST_OBJECTIVES :
        quest === state.ruinsQuest ? RUINS_QUEST_OBJECTIVES : QUEST_OBJECTIVES;
      quest.objective = objectives[status];
      if (quest === state.harborQuest) {
        updateInteractables();
        refreshTrackedQuest();
      }
      if (quest === state.ruinsQuest && status === 'completed' && state.zoneInfo.innerGate) {
        state.zoneInfo.innerGate.open = true;
      }
      emit({ type: 'quest', status, count: quest.count });
    }

    function dropLoot(enemy, id) {
      addItem(id);
      emit({ type: 'loot', itemId: id, count: 1, x: enemy.x, y: enemy.y, text: `ได้รับ ${ITEMS[id].name}` });
    }

    function defeatEnemy(enemy) {
      enemy.bleed = null;
      enemy.slowTime = 0;
      if (enemy.type === 'dummy') {
        enemy.hp = enemy.maxHp;
        return;
      }
      const data = MONSTERS[enemy.type];
      enemy.respawnIn = 10;
      enemy.aggro = false;
      enemy.moving = false;
      pose(enemy, 'death', data.collapseDuration ?? .4);
      player.gold += halfGold(data.gold);
      if (state.targetId === enemy.id) {
        state.targetId = null;
        cancelMovement();
      }
      const levelGap = player.level - data.level;
      if (levelGap < 15) {
        const rate = levelGap >= 10 ? .7 : 1;
        giveExperience(Math.round(data.xp * rate), Math.round(data.jobXp * rate));
      }
      if (data.drop) dropLoot(enemy, data.drop);
      const receivedKey = enemy.type === 'pret' && !player.inventory.ghost_key;
      if (receivedKey) dropLoot(enemy, 'ghost_key');
      const cardChance = data.cardChance ?? (data.boss ? BOSS_CARD_DROP_CHANCE : MONSTER_CARD_DROP_CHANCE);
      if (data.card && Math.random() < cardChance) dropLoot(enemy, data.card);
      if (state.zone === 'cemetery') recordCemeteryKill(enemy, receivedKey);
      if (enemy.type === 'chalawan') {
        const quest = state.harborQuest;
        quest.bossDefeated = true;
        quest.loot = 'earned';
        const turnIn = quest.status === 'fight';
        setQuest(turnIn ? 'ready' : 'completed', quest);
        notice(turnIn ? 'ได้รับเกราะและการ์ดชาละวัน · นำหีบไปให้นายท่าอิน' : 'ได้รับเกราะและการ์ดชาละวัน');
      }
      if (enemy.type === 'cobra_queen') {
        state.queenSpawnAt = queenSpawnAfter(QUEEN_RESPAWN);
        state.venomPool = null;
      }
      if (state.quest.status === 'active' && state.zone === 'village' && enemy.type === 'village_monkey') {
        state.quest.count++;
        if (state.quest.count >= state.quest.needed) {
          setQuest('ready');
          notice('กำจัดครบแล้ว กลับไปหาลุงขาม');
        } else {
          emit({ type: 'quest', status: 'active', count: state.quest.count });
        }
      }
      if (state.zone === 'ruins') recordHuntKill(state.ruinsQuest, enemy.type);
      if (state.zone === 'nipa') recordHuntKill(state.nipaQuest, enemy.type);
      save();
    }

    function recordHuntKill(quest, type) {
      if (quest.status !== 'active' || !(quest.counts[type] < quest.goals[type])) return;
      quest.counts[type]++;
      if (meetsHuntGoals(quest.goals, quest.counts)) {
        setQuest('ready', quest);
        notice(`กำจัดครบแล้ว · ${quest.objective}`);
      } else {
        emit({ type: 'quest', status: 'active' });
      }
    }

    function criticalChance(stats = player.stats) {
      const precision = player.equipment.weapon ? passiveBonus(PASSIVE_SKILLS.precision, stats) : 0;
      return Math.min(0.8, 0.06 + (stats.LUK - 1) * 0.01 + precision);
    }

    function basicAttackInterval(stats = player.stats) {
      return Math.max(0.29, 0.68 - (stats.AGI - 1) * 0.026);
    }

    function combatStats(stats = player.stats) {
      return { ...derivedAttributes(player, stats), critical: criticalChance(stats),
        attacksPerSecond: 1 / basicAttackInterval(stats) };
    }

    function damageEnemy(enemy, damage, details) {
      enemy.hp = Math.max(0, enemy.hp - damage);
      if (enemy.type === 'dummy') enemy.lastHitAt = simulationTime;
      emit({ type: 'damage', enemy: true, x: enemy.x, y: enemy.y, value: damage, ...details });
      if (enemy.hp === 0) defeatEnemy(enemy);
    }

    function damageWithChalawanCard(baseDamage, bleeding) {
      const bonus = bleeding && countEquipped(player.equipment, 'chalawan_card') ? CHALAWAN_BLEED_BONUS : 0;
      return Math.max(1, Math.round(baseDamage * (1 + bonus)));
    }

    function applyBleed(target, hitDamage) {
      target.bleed = { damage: Math.max(1, Math.round(hitDamage * BLEED_DAMAGE_FRACTION)),
        nextTick: simulationTime + 1, ticksLeft: BLEED_TICKS };
    }

    function consumeDamageTick(target, kind) {
      const status = target[kind];
      if (!status || simulationTime < status.nextTick) return 0;
      status.nextTick += 1;
      if (--status.ticksLeft === 0) target[kind] = null;
      return status.damage;
    }

    function hitEnemy(enemy, multiplier, skill = null) {
      if (!enemy || enemy.hp <= 0) return;
      const wieldingSword = Boolean(player.equipment.weapon);
      const mastery = wieldingSword ? passiveBonus(PASSIVE_SKILLS.mastery) : 0;
      const critical = Math.random() < criticalChance();
      const power = player.attack * (0.92 + Math.random() * 0.16) + (player.stats.DEX - 1);
      const baseDamage = power * multiplier * (1 + mastery) * (critical ? 1.5 : 1);
      const damage = damageWithChalawanCard(baseDamage, Boolean(enemy.bleed));
      const bleedChance = passiveBonus(PASSIVE_SKILLS.bleed);
      if (enemy.hp > damage && (skill === 'thrust' || (bleedChance > 0 && Math.random() < bleedChance))) {
        applyBleed(enemy, Math.round(baseDamage));
      }
      if (enemy.type !== 'dummy') {
        enemy.aggro = true;
        const interrupts = skill === 'interrupt';
        if (interrupts) enemy.slowTime = SLOW_DURATION;
        enemy.cooldown = Math.max(interrupts ? INTERRUPT_DELAY * (1 - SLOW_REDUCTION) : 0.24, enemy.cooldown);
      }
      const slamming = enemy.action === 'attack' && isAreaAttack(enemy);
      if (!slamming || skill === 'interrupt') pose(enemy, 'hit', 0.14);
      damageEnemy(enemy, damage, { critical, skill });
    }

    function hurtPlayer(enemy, slam = null) {
      const data = MONSTERS[enemy.type];
      const guard = player.guardTime > 0 ? 0.5 : 1;
      const damage = Math.max(1, Math.round((data.atk - player.defense) * guard));
      let stunTime = 0;
      if (player.hp > damage) {
        if (!slam && data.basicBleed) applyBleed(player, damage);
        if (enemy.type === 'cobra') {
          player.poison = {
            damage: Math.max(1, Math.round(damage * COBRA_POISON_DAMAGE_FRACTION)),
            nextTick: player.poison?.nextTick ?? simulationTime + 1,
            ticksLeft: COBRA_POISON_TICKS,
          };
        }
        stunTime = slam?.stunTime ?? (data.basicStun && Math.random() < data.basicStun.chance ? data.basicStun.duration : 0);
        if (stunTime > 0) {
          player.stunTime = Math.max(player.stunTime, stunTime);
          pendingStrike = null;
          player.moving = false;
          pose(player, 'hit', 0.16);
        } else if (player.action === 'idle' || player.action === 'walk') {
          pose(player, 'hit', 0.16);
        }
      }
      damagePlayer(damage, { guarded: guard < 1, area: Boolean(slam), source: { x: enemy.x, y: enemy.y }, stunTime });
    }

    function damagePlayer(damage, details) {
      player.hp = Math.max(0, player.hp - damage);
      emit({ type: 'damage', enemy: false, x: player.x, y: player.y, value: damage, ...details });
      if (player.hp > 0) return;
      state.dead = true;
      player.bleed = null;
      player.poison = null;
      setAuto(false);
      pendingStrike = null;
      reviveIn = 3;
      cancelMovement();
      state.targetId = null;
      player.action = 'death';
      player.moving = false;
      save();
      notice('คุณหมดแรง กำลังกลับไปยังท่าน้ำ');
    }

    function startStrike(targets, style, duration, range, multiplier) {
      player.attackStyle = style;
      player.attackDir = player.dir;
      pose(player, 'attack', duration);
      pendingStrike = { targets, range, multiplier, style, impact: duration * (1 - STRIKE_PHASE) };
    }

    function dashPastTarget(target, gap) {
      const angle = gap > 0 ? Math.atan2(target.y - player.y, target.x - player.x)
        : DIRECTIONS.indexOf(player.attackDir) * Math.PI / 4;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      let arrival = target;
      for (let extra = 1; extra <= DASH_OVERSHOOT; extra++) {
        const point = { x: target.x + dx * extra, y: target.y + dy * extra };
        if (!canStand(point, state.zoneInfo)) break;
        arrival = point;
      }
      moveEntity(player, arrival, state.zoneInfo);
    }

    function resolveStrike(dt) {
      if (!pendingStrike || player.actionTime - dt > pendingStrike.impact) return;
      const { targets, range, multiplier, style } = pendingStrike;
      pendingStrike = null;
      const origin = style === 'basic' ? null : { x: player.x, y: player.y };
      const aimed = !skillsById.get(style)?.strike?.area;
      let contact = null;
      for (const enemy of targets) {
        const gap = distance(player, enemy);
        if (!isFightable(enemy) || !state.enemies.includes(enemy) || gap > range || !straightPath(player, enemy, state.zoneInfo)) continue;
        if (aimed && gap > 0) player.attackDir = direction(enemy.x - player.x, enemy.y - player.y);
        if (origin && !contact) contact = { x: enemy.x, y: enemy.y };
        if (style === 'dash') dashPastTarget(enemy, gap);
        hitEnemy(enemy, multiplier, style === 'basic' ? null : style);
      }
      if (origin) {
        emit({ type: 'skill-strike', skill: style, origin, contact, dir: player.attackDir,
          arrival: { x: player.x, y: player.y }, range: range - 10 });
      }
    }

    function useSkill(slot) {
      return castSkill(getSlotSkill(slot));
    }

    function castSkill(skill, automatic = false) {
      if (state.dead || player.stunTime > 0 || !skill) return false;
      const unavailable = reason => {
        if (!automatic) notice(reason);
        return false;
      };
      const missing = skillRequirements(skill).filter(({ current, minimum }) => !(current >= minimum));
      if (missing.length) {
        const requirements = missing.map(({ label, minimum }) => `${label} ${minimum}`).join(' · ');
        return unavailable(`${skill.name} ต้องการ ${requirements}`);
      }
      if (!state.enabledSkills.has(skill.id)) return unavailable(`กด K แล้วเปิดใช้งาน ${skill.name}`);
      const cooldowns = skillCooldownsEnabled();
      const manaCost = skillManaCostsEnabled() ? skill.cost : 0;
      if (cooldowns && skill.remaining > 0) return unavailable('สกิลกำลังพัก');
      if (player.mp < manaCost) return unavailable('มานาไม่พอ');
      if (pendingStrike) return unavailable('รอให้การโจมตีปัจจุบันจบก่อน');
      const { strike } = skill;
      let targets;
      if (strike?.area) {
        targets = state.enemies.filter(enemy => isFightable(enemy) && distance(player, enemy) <= strike.range &&
          straightPath(player, enemy, state.zoneInfo));
        if (!targets.length) return unavailable('ไม่มีมอนสเตอร์ในระยะ');
      } else if (strike) {
        const enemy = targetEnemy();
        const gap = enemy ? distance(player, enemy) : Infinity;
        if (gap > strike.range || !straightPath(player, enemy, state.zoneInfo)) {
          return unavailable(enemy ? 'เป้าหมายอยู่นอกระยะสกิล' : 'เลือกมอนสเตอร์ก่อนใช้สกิล');
        }
        targets = [enemy];
        if (gap > 0) player.dir = direction(enemy.x - player.x, enemy.y - player.y);
      }
      if (skill.id === 'heal' && player.hp >= player.maxHp) return unavailable('พลังชีวิตเต็มแล้ว');
      player.mp -= manaCost;
      if (cooldowns) skill.remaining = skill.cooldown;
      attackCooldown = Math.max(attackCooldown, 0.43);
      if (strike) startStrike(targets, skill.id, strike.duration, strike.range + 10, strike.multiplier);
      else pose(player, 'cast', 0.38);
      if (skill.id === 'guard') player.guardTime = GUARD_DURATION;
      if (skill.id === 'heal') player.hp = Math.min(player.maxHp, player.hp + 32 + player.stats.INT * 3);
      emit({ type: 'skill', skill: skill.id, name: skill.name, x: player.x, y: player.y,
        windup: strike ? strike.duration * STRIKE_PHASE : 0 });
      return true;
    }

    function useTownScroll(id) {
      const town = nearestTown();
      if (!town) { notice('ไม่พบเมืองที่กลับได้จากพื้นที่นี้'); return false; }
      setAuto(false);
      removeItem(id);
      if (town.id === state.zone) {
        const [x, y] = town.spawn;
        placePlayer({ x, y });
        emit({ type: 'zone', zone: town.id, zoneInfo: town });
      } else {
        enterZone(town.id);
      }
      notice('กลับถึง' + town.name + 'แล้ว');
      save();
      return true;
    }

    function useItem(id) {
      if (state.dead || !player.inventory[id]) return false;
      if (id === 'town_scroll') return useTownScroll(id);
      if (id === 'potion' && player.hp < player.maxHp) player.hp = Math.min(player.hp + 45, player.maxHp);
      else if (id === 'elixir' && player.mp < player.maxMp) player.mp = Math.min(player.mp + 28, player.maxMp);
      else return false;
      removeItem(id);
      notice(`ใช้${ITEMS[id].name}`);
      save();
      return true;
    }

    function equipItem(id, cardSlot = 'card') {
      const item = Object.hasOwn(ITEMS, id) && ITEMS[id];
      if (!item?.slot || countEquipped(player.equipment, id) >= (player.inventory[id] ?? 0)) return false;
      const slot = item.slot === 'card' ? cardSlot : item.slot;
      if (item.slot === 'card' && !CARD_SLOTS.some(entry => entry.id === slot && player.classTier >= entry.classTier)) return false;
      if (player.equipment[slot] === id) return false;
      if (!meetsItemLevel(item, player.level)) {
        notice(`ต้องการ Base Lv. ${item.baseLevel} เพื่อสวม${item.name}`);
        return false;
      }
      player.equipment[slot] = id;
      updateAttributes(player);
      notice(`สวม${item.name}`);
      save();
      return true;
    }

    function unequip(slot) {
      if (!player.equipment[slot]) return false;
      const item = ITEMS[player.equipment[slot]];
      delete player.equipment[slot];
      updateAttributes(player);
      save();
      notice(`ถอด${item.name}แล้ว`);
      return true;
    }

    function unequipCard(slot) {
      return CARD_SLOTS.some(entry => entry.id === slot) && unequip(slot);
    }

    function nearVendor() {
      return state.npcs.some(npc => npc.type === 'vendor' && distance(npc, player) <= INTERACT_RANGE + 10);
    }

    function recordTrade(counts, id, count) {
      counts[id] = Math.min(Number.MAX_SAFE_INTEGER, (counts[id] ?? 0) + count);
    }

    function buyItem(id) {
      const item = Object.hasOwn(ITEMS, id) && ITEMS[id];
      if (!item?.price || !nearVendor() || state.dead) return false;
      if (player.gold < item.price) { notice('เบี้ยไม่พอ'); return false; }
      player.gold -= item.price;
      addItem(id);
      recordTrade(player.tradeCounts.bought, id, 1);
      save();
      notice(`ซื้อ${item.name} ×1 แล้ว`);
      return true;
    }

    function sellableItemCount(id) {
      const item = Object.hasOwn(ITEMS, id) && ITEMS[id];
      if (!item?.sell || countEquipped(player.equipment, id) > 0) return 0;
      return player.inventory[id] ?? 0;
    }

    function sellItem(id, count = 1) {
      if (state.dead || !nearVendor() || !Number.isSafeInteger(count) || count < 1 || count > sellableItemCount(id)) return false;
      const item = ITEMS[id];
      const payment = item.sell * count;
      removeItem(id, count);
      player.gold += payment;
      recordTrade(player.tradeCounts.sold, id, count);
      save();
      notice(`ขาย${item.name} ×${count} ได้ ${payment} เบี้ย`);
      return true;
    }

    function statAllocation(upgrades) {
      if (!upgrades || typeof upgrades !== 'object' || Array.isArray(upgrades)) return null;
      const stats = { ...player.stats };
      let spent = 0;
      for (const [key, amount] of Object.entries(upgrades)) {
        if (!STAT_KEYS.includes(key) || !Number.isSafeInteger(amount) || amount < 0 || stats[key] + amount > 999) return null;
        stats[key] += amount;
        spent += amount;
      }
      return spent <= player.statPoints ? { stats, remaining: player.statPoints - spent, spent } : null;
    }

    function applyStatPoints(upgrades) {
      const allocation = statAllocation(upgrades);
      if (!allocation?.spent) return false;
      player.stats = allocation.stats;
      player.statPoints = allocation.remaining;
      updateAttributes(player);
      save();
      return true;
    }

    function raiseStat(key) {
      return applyStatPoints({ [key]: 1 });
    }

    function questForNpc(id) {
      if (id === state.harborQuest.npcId) return state.harborQuest;
      return state.trackedQuest;
    }

    function acceptQuest() {
      const quest = questForNpc(state.interacting);
      const owner = state.npcs.find(npc => npc.id === quest.npcId);
      if (state.dead || quest.status !== 'available' || state.interacting !== quest.npcId ||
          !owner || distance(player, owner) > (owner.reach ?? INTERACT_RANGE)) return false;
      setQuest('active', quest);
      save();
      return true;
    }

    function startHarborChallenge() {
      const quest = state.harborQuest;
      const owner = state.npcs.find(npc => npc.id === quest.npcId);
      if (state.dead || state.zone !== 'harbor' || quest.status !== 'completed' || quest.loot !== 'unclaimed' ||
          state.interacting !== quest.npcId || !owner || distance(player, owner) > INTERACT_RANGE) return false;
      quest.loot = 'challenge';
      quest.objective = HARBOR_QUEST_OBJECTIVES.fight;
      refreshTrackedQuest();
      spawnHarborBoss();
      save();
      notice('ชาละวันขึ้นมาท้าประลองที่กลางลาน!');
      return true;
    }

    function talkTo(npc) {
      const quest = questForNpc(npc.id);
      const ruins = quest === state.ruinsQuest;
      let questView;
      let text = 'ทางฝั่งตะวันออกเป็นป่ารก ระวังภูตแถวเจดีย์เก่าไว้ด้วย';
      if (npc.type === 'vendor') text = 'ยาสมุนไพรกับน้ำอบอยู่ตรงนี้ เลือกได้เลยจ้ะ';
      if (npc.id === 'guard') text = 'ข้ามสะพานไม้แล้วลอดประตูอิฐฝั่งตรงข้าม จะถึงดงเจดีย์ร้าง';
      text = npc.dialogue ?? text;
      if (npc.id === quest.npcId) {
        const { status } = quest;
        const storyText = quest === state.harborQuest ? HARBOR_QUEST_DIALOGUE[status] :
          quest === state.nipaQuest ? NIPA_QUEST_DIALOGUE[status] : null;
        if (status === 'available') {
          questView = 'offer';
          text = storyText ?? (ruins
            ? 'ทางเข้าป่าช้าวัดร้างยังปิดอยู่ ช่วยกำจัดมอนสเตอร์ที่เฝ้าทาง แล้วกลับมารายงาน ข้าจะเปิดประตูให้'
            : 'ฝากกำจัดลิงป่า Lv. 1 สัก 3 ตัวให้ลุงหน่อย พวกมันลงมาป้วนเปี้ยนอยู่ทุ่งทางตะวันออก');
        } else if (status === 'ready') {
          setQuest('completed', quest);
          if (quest.rewards.item) {
            const { item, gold, xp, jobXp } = quest.rewards;
            player.gold += gold ?? 0;
            addItem(item);
            giveExperience(xp, jobXp);
          }
          questView = 'reward';
          text = storyText ?? (ruins ? 'ข้าเปิดทางสู่ป่าช้าวัดร้างแล้ว เดินไปลอดซุ้มอิฐด้านตะวันออกเฉียงเหนือได้เลย'
            : 'ขอบใจมาก ทีนี้ข้ามสะพานไม้แล้วลอดประตูอิฐไปดงเจดีย์ร้างได้แล้ว');
        } else if (status === 'active' || status === 'fight') {
          questView = 'progress';
          text = storyText ?? (ruins ? 'เมื่อกำจัดครบแล้ว กลับมาหาข้าที่ประตูดงเจดีย์ร้าง'
            : `จัดการลิงป่าได้ ${quest.count} จาก ${quest.needed} ตัวแล้ว`);
        } else if (quest === state.harborQuest && quest.loot !== 'earned') {
          if (quest.loot === 'unclaimed') {
            questView = 'challenge';
            text = 'ชาละวันยังวนเวียนอยู่ใต้ท่า หากเจ้าพร้อม ข้าจะเรียกมันขึ้นมาที่ลาน รางวัลคือเกราะหนังเจ้าแห่งลุ่มแม่น้ำและการ์ดชาละวัน';
          } else {
            text = 'ชาละวันรอเจ้าอยู่ที่กลางลาน';
          }
        } else {
          text = storyText ?? (ruins ? 'ทางไปป่าช้าวัดร้างอยู่ตรงซุ้มอิฐด้านตะวันออกเฉียงเหนือ'
            : 'ถ้าจะไปดงเจดีย์ร้าง ให้เดินข้ามสะพานไม้ไปลอดประตูอิฐทางตะวันออก');
        }
        save();
      }
      emit({ type: 'dialog', npc, text, questView, quest });
    }

    function finishInteraction(entity) {
      cancelMovement();
      player.dir = direction(entity.x - player.x, entity.y - player.y);
      if (entity.type === 'harbor-crate') {
        const quest = state.harborQuest;
        if (quest.status !== 'active') return false;
        quest.count = quest.needed;
        spawnHarborBoss();
        setQuest('fight', quest);
        save();
        notice('เก็บหีบแล้ว ระวังชาละวัน!');
        return true;
      }
      if (entity.type === 'ferry') {
        const destination = zones[entity.target]?.name;
        if (!ferryUnlocked() || !destination) {
          notice('ทำภารกิจเรือเที่ยวสุดท้ายให้เสร็จเพื่อเปิดท่า');
          return false;
        }
        state.interacting = entity.id;
        emit({ type: 'ferry', id: entity.id, origin: state.zoneInfo.name, destination, fare: ferryFare(entity),
          firstTrip: Boolean(entity.fare && !state.harborQuest.ferryUsed) });
        return true;
      }
      if (entity.id === state.zoneInfo.innerGate?.id) {
        if (!state.zoneInfo.innerGate.open) {
          notice('ทำภารกิจของพรานหม่องให้เสร็จก่อนผ่านประตู');
          return false;
        }
        return routeTo({ x: entity.x, y: entity.exitY });
      }
      if (!entity.target) {
        state.interacting = entity.id;
        talkTo(entity);
        return true;
      }
      if (entity.quest && state.quest.status !== 'completed') {
        notice('ทำภารกิจของลุงขามให้เสร็จก่อนผ่านประตู');
        return false;
      }
      if (entity.key && !state.harborUnlocked) {
        if (!player.inventory[entity.key]) {
          notice('ต้องใช้กุญแจผีจากบอสผีเปรตเพื่อเปิดประตูท่าเรือท่าข้าม');
          return false;
        }
        if (!zones[entity.target]) return false;
        removeItem(entity.key);
        state.harborUnlocked = true;
        const entered = travelThrough(entity);
        if (entered) notice('ใช้กุญแจผีเปิดประตูท่าเรือท่าข้ามแล้ว');
        return entered;
      }
      return travelThrough(entity);
    }

    function travelThrough(entity) {
      const zone = zones[entity.target];
      if (!zone) return false;
      const [x, y] = entity.arrival ?? zone.arrival ?? zone.spawn;
      enterZone(entity.target, { x, y }, entity.facing);
      save();
      return true;
    }

    function ferryUnlocked() {
      return state.harborUnlocked && state.harborQuest.status === 'completed';
    }

    function ferryFare(entity) {
      return state.harborQuest.ferryUsed ? entity.fare ?? 0 : 0;
    }

    function boardFerry(id) {
      if (state.dead || player.stunTime > 0 || !ferryUnlocked() || id !== state.interacting) return false;
      const ferry = state.interactables.find(entity => entity.type === 'ferry' && entity.id === id);
      if (!ferry || !zones[ferry.target] || distance(player, ferry) > (ferry.reach ?? INTERACT_RANGE)) return false;
      const fare = ferryFare(ferry);
      if (player.gold < fare) { notice('เบี้ยไม่พอสำหรับค่าเรือ'); return false; }
      player.gold -= fare;
      if (ferry.fare) state.harborQuest.ferryUsed = true;
      return travelThrough(ferry);
    }

    function interact(id) {
      if (state.dead || player.stunTime > 0) return false;
      setAuto(false);
      const entities = [...state.npcs, ...state.interactables, ...state.portals];
      const entity = id ? entities.find(candidate => candidate.id === id) : closestToPlayer(entities, 145);
      if (!entity) { notice('ไม่มีใครอยู่ใกล้พอให้คุย'); return false; }
      cancelMovement();
      if (entity.automatic && entity.quest && state.quest.status !== 'completed') {
        notice('ทำภารกิจของลุงขามให้เสร็จก่อนข้ามสะพาน');
        return false;
      }
      if (distance(player, entity) <= (entity.reach ?? INTERACT_RANGE)) return finishInteraction(entity);
      if (!routeTo(entity, false)) return false;
      pendingInteract = entity;
      return true;
    }

    function updatePlayer(dt, axis, approachRange = BASIC_ATTACK_RANGE) {
      player.moving = false;
      attackCooldown = Math.max(0, attackCooldown - dt);
      player.guardTime = Math.max(0, player.guardTime - dt);
      if (player.stunTime > 0) {
        const blockedTime = Math.min(dt, player.stunTime);
        player.stunTime -= blockedTime;
        animate(player, blockedTime);
        dt -= blockedTime;
        if (dt === 0) return;
      }
      const axisLength = Math.hypot(axis.x, axis.y);
      const autoCasting = state.auto.enabled && (player.action === 'cast' ||
        (player.action === 'attack' && player.attackStyle !== 'basic'));
      const speed = (165 + Math.min(65, (player.stats.AGI - 1) * 4)) * dt;
      if (axisLength > 0.01) {
        cancelMovement();
        moveEntity(player, {
          x: player.x + axis.x / axisLength * speed,
          y: player.y + axis.y / axisLength * speed,
        }, state.zoneInfo);
      } else if (state.autoAttack && !autoCasting) {
        const enemy = targetEnemy();
        const gap = enemy ? distance(player, enemy) : Infinity;
        const hasClearPath = gap <= BASIC_ATTACK_RANGE && straightPath(player, enemy, state.zoneInfo);
        if (!enemy) cancelMovement();
        else if (gap <= approachRange && hasClearPath) {
          waypoints = [];
          player.dir = direction(enemy.x - player.x, enemy.y - player.y);
          if (attackCooldown === 0 && !pendingStrike) {
            attackCooldown = basicAttackInterval();
            startStrike([enemy], 'basic', Math.min(0.4, attackCooldown), BASIC_ATTACK_RANGE + 10, 1);
          }
        } else if (approachRange < BASIC_ATTACK_RANGE && hasClearPath) {
          waypoints = [];
          moveToward(player, enemy, Math.min(speed, gap - approachRange + 1), state.zoneInfo);
        } else {
          repath -= dt;
          if (repath <= 0) {
            routeTo(enemy, false);
            repath = 0.25;
          }
        }
      }
      if (waypoints.length && !autoCasting) {
        const waypoint = waypoints[0];
        moveToward(player, waypoint, speed, state.zoneInfo);
        // The next leg can run along a wall edge, so reach this corner exactly.
        if (player.x === waypoint.x && player.y === waypoint.y) waypoints.shift();
        if (!waypoints.length) state.destination = null;
      }
      if (pendingInteract && distance(player, pendingInteract) <= (pendingInteract.reach ?? INTERACT_RANGE)) finishInteraction(pendingInteract);
      else if (!waypoints.length) pendingInteract = null;
      const exit = state.portals.find(portal => portal.automatic &&
        (!portal.quest || state.quest.status === 'completed') &&
        distance(player, portal) <= (portal.reach ?? INTERACT_RANGE));
      if (exit) finishInteraction(exit);
      const innerGate = state.zoneInfo.innerGate;
      if (innerGate?.open && player.y <= innerGate.exitY + 20 && Math.abs(player.x - innerGate.x) <= innerGate.halfWidth) {
        travelThrough(innerGate);
      }
      resolveStrike(dt);
      animate(player, dt);
    }

    function updateEnemy(enemy, dt) {
      if (enemy.entrance) {
        enemy.entrance.elapsed += dt;
        if (enemy.entrance.elapsed >= enemy.entrance.duration) {
          enemy.entrance = null;
          enemy.dir = direction(player.x - enemy.x, player.y - enemy.y);
        }
        return;
      }
      const bleedDamage = consumeDamageTick(enemy, 'bleed');
      if (bleedDamage) damageEnemy(enemy, damageWithChalawanCard(bleedDamage, true), { status: 'bleed' });
      if (enemy.type === 'dummy') {
        if (enemy.hp < enemy.maxHp && simulationTime >= enemy.lastHitAt + DUMMY_RECOVERY_DELAY) {
          enemy.hp = enemy.maxHp;
        }
        animate(enemy, dt);
        return;
      }
      if (enemy.hp <= 0) {
        if (enemy.boss && !enemy.visible) return;
        enemy.respawnIn -= dt;
        enemy.actionTime = Math.max(0, enemy.actionTime - dt);
        enemy.visible = enemy.actionTime > 0;
        if (enemy.respawnIn <= 0 && !enemy.boss) {
          Object.assign(enemy, enemy.origin, { hp: enemy.maxHp, action: 'idle', visible: true, wander: null, wanderIn: 2 });
        }
        return;
      }
      const details = MONSTERS[enemy.type];
      const attackRange = details.attackRange ?? 35;
      const { slam } = enemy;
      enemy.moving = false;
      const actionStep = dt - Math.min(dt, enemy.slowTime) * SLOW_REDUCTION;
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - actionStep);
      if (slam) enemy.slamCooldown = Math.max(0, enemy.slamCooldown - dt);
      const gap = distance(enemy, player);
      const playerReachable = gap < 245 && straightPath(enemy, player, state.zoneInfo);
      if (enemy.type === 'chalawan' && gap < 180 && playerReachable) enemy.aggro = true;
      const localAggroRange = state.zone === 'ruins' || state.zone === 'cemetery' ? 100 : 0;
      if (gap < (details.aggroRange ?? localAggroRange) && playerReachable) enemy.aggro = true;
      if (enemy.aggro && (!playerReachable || distance(enemy, enemy.origin) > 220 || state.dead)) {
        enemy.aggro = false;
        enemy.wander = enemy.origin;
      }
      if (enemy.action === 'attack') {
        const impact = enemyImpactTime(enemy);
        if (enemy.actionTime > impact && enemy.actionTime - actionStep <= impact) {
          const groundSlam = isAreaAttack(enemy) ? slam : null;
          if (groundSlam?.style === VENOM_POOL.style) {
            state.venomPool = { ...enemy.venomTarget, elapsed: 0, start: simulationTime, nextTick: simulationTime };
            emit({ type: 'venom-splash' });
          } else {
            if (groundSlam) emit({ type: 'boss-slam', style: enemy.attackStyle });
            const reach = groundSlam?.radius ?? enemy.attackTell?.radius ?? attackRange + 12;
            if (!state.dead && playerReachable && gap <= reach) hurtPlayer(enemy, groundSlam);
          }
        }
        animate(enemy, actionStep);
        return;
      }
      if (enemy.aggro && enemy.action !== 'hit') {
        if (slam && enemy.slamCooldown === 0 && enemy.cooldown === 0 && gap <= (slam.castRange ?? slam.radius)) {
          enemy.attackStyle = slam.style ?? 'pret-slam';
          if (slam.style === VENOM_POOL.style) enemy.venomTarget = { x: player.x, y: player.y };
          if (slam.style) enemy.dir = direction(player.x - enemy.x, player.y - enemy.y);
          enemy.slamCooldown = slam.cooldown;
          enemy.cooldown = details.attackInterval;
          pose(enemy, 'attack', slam.windup + slam.recovery);
          return;
        }
        if (gap < attackRange) {
          enemy.dir = direction(player.x - enemy.x, player.y - enemy.y);
          if (enemy.cooldown === 0) {
            enemy.attackStyle = null;
            enemy.cooldown = details.attackInterval ?? 1.3;
            pose(enemy, 'attack', enemy.attackTell?.duration ?? details.windup ?? DEFAULT_ENEMY_ATTACK_DURATION);
            // Start the visible warning at its full duration, just like boss area attacks.
            if (enemy.attackTell) return;
          }
        } else moveToward(enemy, player, actionStep * details.speed, state.zoneInfo);
      } else if (!enemy.aggro) {
        enemy.wanderIn -= dt;
        if (!enemy.wander && enemy.wanderIn <= 0) {
          const point = { x: enemy.origin.x + Math.random() * 80 - 40, y: enemy.origin.y + Math.random() * 70 - 35 };
          if (straightPath(enemy, point, state.zoneInfo)) enemy.wander = point;
          enemy.wanderIn = 2 + Math.random() * 4;
        }
        if (enemy.wander) {
          moveToward(enemy, enemy.wander, actionStep * details.speed * 0.42, state.zoneInfo);
          if (!enemy.moving || distance(enemy, enemy.wander) < 1) enemy.wander = null;
        }
      }
      animate(enemy, dt);
    }

    function threatensAutoGuard(enemy) {
      if (enemy.hp <= 0 || !enemy.aggro || enemy.entrance) return false;
      const castingArea = enemy.action === 'attack' && isAreaAttack(enemy) && enemy.actionTime > enemyImpactTime(enemy);
      if (castingArea && enemy.venomTarget && enemy.attackStyle === VENOM_POOL.style) {
        return distance(player, enemy.venomTarget) <= enemy.slam.radius;
      }
      const basicRange = (MONSTERS[enemy.type].attackRange ?? 35) + 12;
      const range = castingArea ? enemy.slam.radius : Math.max(AUTO_GUARD_RANGE, basicRange);
      return distance(player, enemy) <= range && straightPath(player, enemy, state.zoneInfo);
    }

    function useAutoSkill(dt) {
      // The last tick of a basic attack can hand off to a skill instead of starting another basic attack.
      const finishingBasic = player.attackStyle === 'basic' && attackCooldown <= dt;
      if (pendingStrike || player.action === 'cast' || (player.action === 'attack' && !finishingBasic)) return;
      const target = targetEnemy();
      let approachRange;
      for (const id of state.auto.skillIds) {
        const skill = skillsById.get(id);
        if (!skill || !isSkillEnabled(skill) || (skill.strike && !target)) continue;
        if ((skillCooldownsEnabled() && skill.remaining > 0) || (skillManaCostsEnabled() && player.mp < skill.cost)) continue;
        if (id === 'heal' && player.hp * 100 >= player.maxHp * AUTO_HEAL_BELOW) continue;
        if (id === 'guard') {
          if (player.guardTime > 0) continue;
          const inVenom = state.venomPool && distance(player, state.venomPool) <= VENOM_POOL.radius;
          if (!inVenom && !state.enemies.some(threatensAutoGuard)) continue;
        }
        if (id === 'interrupt' && target.type !== 'dummy' && (target.action !== 'attack' ||
          target.actionTime <= enemyImpactTime(target))) continue;
        if (castSkill(skill, true)) return;
        if (skill.strike?.range < BASIC_ATTACK_RANGE) approachRange ??= skill.strike.range;
      }
      return approachRange;
    }

    function updateAuto(dt, paused) {
      if (paused) {
        if (state.autoAttack) {
          cancelMovement();
          state.targetId = null;
          pendingStrike = null;
        }
        return;
      }
      const { hpBelow, mpBelow, range } = state.auto;
      autoItemWait = Math.max(0, autoItemWait - dt);
      if (autoItemWait === 0) {
        const heals = player.hp * 100 < player.maxHp * hpBelow && useItem('potion');
        if (heals || (skillManaCostsEnabled() && player.mp * 100 < player.maxMp * mpBelow && useItem('elixir'))) autoItemWait = 1;
      }
      if (!state.autoAttack || !targetEnemy()) findAutoTarget(dt, range);
      return useAutoSkill(dt);
    }

    function findAutoTarget(dt, range) {
      autoSearchWait = Math.max(0, autoSearchWait - dt);
      if (autoSearchWait > 0) return;
      autoSearchWait = 0.3;
      const candidates = state.enemies
        .filter(enemy => isFightable(enemy) && distance(player, enemy) <= AUTO_RANGES[range])
        .sort((a, b) => distance(player, a) - distance(player, b));
      for (const enemy of candidates) {
        const route = pathTo(player, enemy, state.zoneInfo);
        if (!route.length || distance(route.at(-1), enemy) > BASIC_ATTACK_RANGE) continue;
        selectTarget(enemy.id);
        attack();
        waypoints = route;
        repath = 0.25;
        break;
      }
    }

    function update(dt, axis = { x: 0, y: 0 }, autoPaused = false) {
      if (!(dt > 0)) return;
      dt = Math.min(dt, 0.08);
      simulationTime += dt;
      finishCemeteryRespawn();
      for (const skill of state.skills) skill.remaining = Math.max(0, skill.remaining - dt);
      const bleedDamage = consumeDamageTick(player, 'bleed');
      if (bleedDamage) damagePlayer(bleedDamage, { status: 'bleed' });
      const poisonDamage = consumeDamageTick(player, 'poison');
      if (poisonDamage) damagePlayer(poisonDamage, { status: 'poison' });
      if (state.dead) {
        reviveIn -= dt;
        if (reviveIn <= 0) {
          state.dead = false;
          player.hp = player.maxHp;
          player.mp = player.maxMp;
          enterZone('village');
          save();
        }
      } else {
        let approachRange;
        if (state.auto.enabled) {
          if (Math.hypot(axis.x || 0, axis.y || 0) > 0.01) setAuto(false);
          else if (player.stunTime === 0) approachRange = updateAuto(dt, autoPaused);
        }
        updatePlayer(dt, { x: axis.x || 0, y: axis.y || 0 }, approachRange);
        updateQueenSpawn();
        const enemies = state.enemies;
        for (const enemy of enemies) {
          if (state.dead || state.enemies !== enemies) break;
          updateEnemy(enemy, dt);
        }
        if (!state.dead) updateVenomPool();
        regeneration += dt;
        if (regeneration >= 2) {
          regeneration -= 2;
          player.mp = Math.min(player.maxMp, player.mp + 1 + passiveBonus(PASSIVE_SKILLS.discipline));
          if (!state.enemies.some(enemy => enemy.aggro)) player.hp = Math.min(player.maxHp, player.hp + 1);
        }
      }
      for (const rabbit of state.wildlife) updateRabbit(rabbit, dt, state.zoneInfo);
      timeSinceSave += dt;
      if (timeSinceSave >= 5) { timeSinceSave = 0; save(); }
    }

    const zone = savedZone(saved?.zone);
    const savedPoint = Number.isFinite(saved?.player?.x) && Number.isFinite(saved?.player?.y)
      ? { x: saved.player.x, y: saved.player.y } : null;
    const spawn = options.spawn || savedPoint;
    enterZone(zone, Array.isArray(spawn) ? { x: spawn[0], y: spawn[1] } : spawn);
    return { state, update, get time() { return simulationTime; }, moveTo, selectTarget, attack, basicAttackRange: BASIC_ATTACK_RANGE,
      distanceTo: point => distance(player, point), useSkill, getSlotSkill, assignSkill, clearSkillSlots,
      skillRequirements, isSkillUnlocked, isSkillEnabled, enableSkill, resetLevels, resetCharacter, interact, boardFerry, useItem, equipItem,
      cardSlots: CARD_SLOTS, unequipCard, unequipArmor: () => unequip('armor'), equippedItemCount: id => countEquipped(player.equipment, id),
      itemAction, assignItemSlot, discardableItemCount, discardItem, acceptQuest, startHarborChallenge, questProgress, buyItem, sellableItemCount, sellItem,
      raiseStat, statAllocation, applyStatPoints, combatStats,
      setAuto, configureAuto, skillCooldownsEnabled, setTrainingCooldowns, skillManaCostsEnabled, setTrainingManaCosts,
      save, exportSave, importSave,
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } };
  }

  window.AyothayaGame = { create, createFrameClock, strikePhase: STRIKE_PHASE, autoHealBelow: AUTO_HEAL_BELOW,
    reference: { player: STARTER_PLAYER, starterCaps: CLASS_LEVEL_CAPS[1], zones: ZONES, monsters: MONSTERS,
      activeSkills: ACTIVE_SKILLS, basicAttackRange: BASIC_ATTACK_RANGE, defaultEnemyAttackDuration: DEFAULT_ENEMY_ATTACK_DURATION },
    enemyAttackTells: ENEMY_ATTACK_TELLS,
    guardDuration: GUARD_DURATION, dashOvershoot: DASH_OVERSHOOT, pretSlam: MONSTERS.pret.slam, rabbitHop: RABBIT_HOP,
    cobra: { name: MONSTERS.cobra.name, level: MONSTERS.cobra.level, strikeDuration: MONSTERS.cobra.windup,
      poisonTicks: COBRA_POISON_TICKS, poisonDamageFraction: COBRA_POISON_DAMAGE_FRACTION },
    cobraQueen: { name: MONSTERS.cobra_queen.name, level: MONSTERS.cobra_queen.level,
      strikeDuration: MONSTERS.cobra_queen.windup, venom: VENOM_POOL },
    chalawan: { slam: MONSTERS.chalawan.slam, entranceDuration: MONSTERS.chalawan.entranceDuration,
      biteDuration: MONSTERS.chalawan.windup, bleedDuration: BLEED_TICKS, collapseDuration: MONSTERS.chalawan.collapseDuration } };
})();
