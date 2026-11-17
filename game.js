/* Ayothaya Survival — simulation, progression and save data. */
(() => {
  'use strict';

  const SAVE_KEY = 'ayothaya-survival-v1';
  const STAT_KEYS = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
  const BOUNDS = { left: 135, right: 1555, top: 190, bottom: 930 };
  const INTERACT_RANGE = 53;
  const MELEE_RANGE = 49;
  const STRIKE_PHASE = 0.38;
  const AUTO_RANGES = { near: 150, medium: 275, far: 450 };
  const AUTO_HEAL_BELOW = 60;
  const DUMMY_RECOVERY_DELAY = 5;
  const VILLAGE_GATE = {
    inner: BOUNDS.right, outer: 2080, viewX: 0.932, halfWidth: 18,
    route: [[1555, 277], [1632, 256], [1820, 256], [1895, 270], [1962, 286], [2014, 272], [2057, 244], [2080, 219]],
  };
  const RUINS_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: 0.108, halfWidth: 20,
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
    id: 'inner-gate', name: 'ประตูชั้นใน', x: 1360, y: 58, reach: 48,
    approachY: BOUNDS.top, exitY: 9, halfWidth: 32,
  };
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
      spawn: [310, 548], arrival: [158, 520], gateApproaches: [RUINS_GATE], innerGate: RUINS_INNER_GATE,
      obstacles: [],
      npcs: [{ id: 'ruins-guard', type: 'guard', name: 'พรานหม่อง', x: 415, y: 520 }],
      portals: [{ id: 'west-gate', name: 'บ้านท่ามะขาม', x: 7, y: 520,
        target: 'village', facing: 'w', automatic: true, reach: 11 }, RUINS_INNER_GATE],
      enemies: [
        ['ghost', 590, 430], ['ghost', 785, 620], ['ghost', 1065, 445], ['ghost', 1045, 855],
        ['monkey', 435, 773], ['monkey', 725, 860], ['monkey', 1010, 652],
        ['guardian', 1335, 380], ['guardian', 1460, 603], ['guardian', 1370, 864],
      ],
    },
    training: {
      id: 'training', name: 'ลานฝึก', levels: 'ทดสอบดาเมจ', width: 1680, height: 1120,
      bounds: { ...BOUNDS, left: TRAINING_RETURN_GATE.outer },
      spawn: [263, 548], gateApproaches: [TRAINING_RETURN_GATE], obstacles: [], npcs: [],
      portals: [{ id: 'training-exit', name: 'บ้านท่ามะขาม', x: 7, y: 520,
        target: 'village', arrival: [164, 270], facing: 'e', automatic: true, reach: 12 }],
      enemies: [['dummy', 640, 505], ['dummy', 955, 443], ['dummy', 1270, 565]],
    },
  };

  const MONSTERS = {
    tamarind: { name: 'ลูกมะขามภูต', level: 1, hp: 30, atk: 4, xp: 18, jobXp: 9, gold: 5, speed: 53, drop: 'tamarind_core', card: 'tamarind_card' },
    village_monkey: { name: 'ลิงป่า', sprite: 'monkey', level: 1, hp: 32, atk: 4, xp: 18, jobXp: 9, gold: 5, speed: 65, drop: 'monkey_claw', card: 'monkey_card' },
    monkey: { name: 'ลิงป่า', level: 2, hp: 53, atk: 7, xp: 30, jobXp: 15, gold: 9, speed: 83, drop: 'monkey_claw' },
    ghost: { name: 'นางไม้', level: 3, hp: 78, atk: 10, xp: 48, jobXp: 25, gold: 14, speed: 65, drop: 'spirit_dust' },
    guardian: { name: 'ยักษ์ศิลา', level: 5, hp: 142, atk: 17, xp: 96, jobXp: 54, gold: 27, speed: 63, drop: 'guardian_seal' },
    dummy: { name: 'หุ่นไล่กา', hp: 999999 },
  };

  const ITEMS = {
    potion: { name: 'ยาสมุนไพร', description: 'ฟื้นพลังชีวิต 45 หน่วย', type: 'consumable', icon: 'potion', price: 12, sell: 4 },
    elixir: { name: 'น้ำอบมนตรา', description: 'ฟื้นมานา 28 หน่วย', type: 'consumable', icon: 'elixir', price: 16, sell: 6 },
    town_scroll: { name: 'คัมภีร์กลับเมือง', description: 'พากลับจุดเริ่มต้นของเมืองที่ใกล้ที่สุด',
      type: 'consumable', icon: 'scroll', price: 20 },
    rusty_sword: { name: 'ดาบฝึกหัด', description: 'พลังโจมตี +4', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 4 },
    bronze_sword: { name: 'ดาบสำริด', description: 'พลังโจมตี +10', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 10, sell: 30 },
    tamarind_core: { name: 'เมล็ดมะขามภูต', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'seed', sell: 3 },
    monkey_claw: { name: 'กรงเล็บลิงป่า', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'claw', sell: 7 },
    spirit_dust: { name: 'ผงพงไพร', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'dust', sell: 10 },
    tamarind_card: { name: 'การ์ดมะขามภูต', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    monkey_card: { name: 'การ์ดลิงป่า', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    guardian_seal: { name: 'ตราอารักษ์', description: 'เครื่องรางเก่าที่พบจากยักษ์ศิลา', type: 'material', icon: 'seal', sell: 35 },
  };

  const DEFAULT_SKILL_SLOTS = ['heavy', 'sweep', 'guard', 'heal', 'dash'];
  const ITEM_SLOT_COUNT = 2;
  const ACTIVE_SKILLS = [
    { id: 'heavy', name: 'ฟันหนัก', icon: 'blade', baseLevel: 1, jobLevel: 1, stat: ['STR', 1], cost: 5, cooldown: 3,
      description: 'โจมตีเป้าหมายเดียวด้วยพลัง 185%', strike: { range: 90, duration: 0.46, multiplier: 1.85 } },
    { id: 'sweep', name: 'กวาดดาบ', icon: 'flame', baseLevel: 3, jobLevel: 2, stat: ['STR', 5], cost: 8, cooldown: 5,
      description: 'โจมตีมอนสเตอร์รอบตัวด้วยพลัง 120%', strike: { area: true, range: 92, duration: 0.43, multiplier: 1.2 } },
    { id: 'guard', name: 'ตั้งรับ', icon: 'shield', baseLevel: 2, jobLevel: 1, stat: ['VIT', 3], cost: 6, cooldown: 9,
      description: 'ลดความเสียหายที่ได้รับครึ่งหนึ่งเป็นเวลา 6 วินาที' },
    { id: 'heal', name: 'สมานแผล', icon: 'leaf', baseLevel: 3, jobLevel: 2, stat: ['INT', 4], cost: 10, cooldown: 10,
      description: 'ฟื้น HP ทันที 32 + INT × 3' },
    { id: 'dash', name: 'พุ่งตัด', icon: 'star', baseLevel: 5, jobLevel: 3, stat: ['AGI', 6], cost: 14, cooldown: 8,
      description: 'พุ่งเข้าโจมตีเป้าหมายในระยะกลางด้วยพลัง 230%', strike: { range: 195, duration: 0.42, multiplier: 2.3 } },
    { id: 'thrust', name: 'แทงดาบ', icon: 'thrust', baseLevel: 2, jobLevel: 1, stat: ['DEX', 3], cost: 6, cooldown: 4,
      description: 'แทงด้วยพลัง 145% ในระยะไกลกว่าฟันหนัก', strike: { range: 112, duration: 0.36, multiplier: 1.45 } },
    { id: 'interrupt', name: 'ฟันสกัด', icon: 'swords', baseLevel: 5, jobLevel: 3, stat: ['DEX', 5], cost: 9, cooldown: 7,
      description: 'ฟันด้วยพลัง 110% ขัดจังหวะและชะลอการโจมตีถัดไป 1.2 วินาที',
      strike: { range: 66, duration: 0.36, multiplier: 1.1 } },
  ];
  const AUTO_SKILL_SLOT_COUNT = 5;
  const ACTIVE_SKILL_IDS = new Set(ACTIVE_SKILLS.map(skill => skill.id));
  const PASSIVE_SKILLS = {
    mastery: { id: 'mastery', name: 'ชำนาญดาบ', icon: 'blade', baseLevel: 2, jobLevel: 1, stat: ['STR', 3], bonus: 0.1,
      description: 'เพิ่มความเสียหาย 10% เมื่อถือดาบ' },
    precision: { id: 'precision', name: 'จังหวะดาบ', icon: 'star', baseLevel: 5, jobLevel: 3, stat: ['DEX', 6], bonus: 0.08,
      description: 'เพิ่มโอกาสคริติคอล 8 จุดเปอร์เซ็นต์เมื่อถือดาบ' },
    discipline: { id: 'discipline', name: 'วินัยนักดาบ', icon: 'leaf', baseLevel: 6, jobLevel: 5, stat: ['INT', 7], bonus: 1,
      description: 'ฟื้นมานาเพิ่ม 1 หน่วยทุก 2 วินาที' },
  };
  const QUEST = {
    npcId: 'elder', title: 'เฝ้าท่ามะขาม', description: 'ช่วยลุงขามกำจัดลิงป่า Lv. 1 จำนวน 3 ตัว', needed: 3,
    rewards: { item: 'bronze_sword', gold: 35, xp: 38, jobXp: 18 },
  };
  const QUEST_OBJECTIVES = {
    available: 'คุยกับลุงขามเพื่อรับภารกิจ', active: 'กำจัดลิงป่า Lv. 1',
    ready: 'กลับไปรายงานลุงขาม', completed: 'เดินทางต่อสู่ดงเจดีย์ร้าง',
  };
  const RUINS_QUEST = {
    npcId: 'ruins-guard', title: 'เปิดประตูดงเจดีย์ร้าง',
    description: `กำจัด${MONSTERS.ghost.name} 10 ตัว และ${MONSTERS.guardian.name} 5 ตัว แล้วกลับไปรายงานพรานหม่อง`,
    goals: { ghost: 10, guardian: 5 },
    rewards: { unlock: 'เปิดประตูชั้นในของดงเจดีย์ร้าง' },
  };
  const RUINS_QUEST_OBJECTIVES = {
    available: 'คุยกับพรานหม่อง', active: 'กำจัดมอนสเตอร์ตามเป้าหมาย',
    ready: 'กลับไปหาพรานหม่อง', completed: 'ผ่านประตูชั้นในได้แล้ว',
  };
  const DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const GRID = 20;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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

  function readRuinsQuest(saved) {
    const started = ['active', 'ready', 'completed'].includes(saved?.status);
    const counts = Object.fromEntries(Object.entries(RUINS_QUEST.goals).map(([id, needed]) =>
      [id, started ? boundedNumber(saved.counts?.[id], 0, 0, needed) : 0]));
    const ready = meetsRuinsGoals(counts);
    const status = ready ? (saved.status === 'completed' ? 'completed' : 'ready') : started ? 'active' : 'available';
    return { ...RUINS_QUEST, status, counts, objective: RUINS_QUEST_OBJECTIVES[status] };
  }

  function meetsRuinsGoals(counts) {
    return Object.entries(RUINS_QUEST.goals).every(([id, needed]) => counts[id] === needed);
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

  function makePlayer(saved = {}) {
    const inventory = { potion: 3, elixir: 1, rusty_sword: 1 };
    if (saved.inventory && typeof saved.inventory === 'object') {
      for (const id of Object.keys(ITEMS)) {
        const count = boundedNumber(saved.inventory[id], 0, 0, 9999);
        if (count) inventory[id] = count;
        else delete inventory[id];
      }
      inventory.rusty_sword = 1;
    }
    const stats = Object.fromEntries(STAT_KEYS.map(key => [key, boundedNumber(saved.stats?.[key], 1, 1, 999)]));
    const equipment = { weapon: 'rusty_sword' };
    for (const [slot, id] of Object.entries(saved.equipment || {})) {
      if (Object.hasOwn(ITEMS, id) && ITEMS[id].slot === slot && inventory[id]) equipment[slot] = id;
    }
    const player = {
      x: 770, y: 570, dir: 's', moving: false, action: 'idle', actionTime: 0,
      name: 'นักดาบฝึกหัด', job: 'นักดาบ', level: boundedNumber(saved.level, 1, 1, 1000),
      jobLevel: boundedNumber(saved.jobLevel, 1, 1, 1000),
      xp: boundedNumber(saved.xp, 0, 0, 1000000), jobXp: boundedNumber(saved.jobXp, 0, 0, 1000000),
      gold: boundedNumber(saved.gold, 12, 0, 10000000), statPoints: boundedNumber(saved.statPoints, 0, 0, 9999),
      inventory, equipment, stats, hp: 100, mp: 50, guardTime: 0,
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
    };
  }

  function updateAttributes(player) {
    Object.assign(player, derivedAttributes(player, player.stats));
    player.nextXp = expNeeded(player.level);
    player.nextJobXp = jobExpNeeded(player.jobLevel);
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }

  function direction(dx, dy) {
    return DIRECTIONS[(Math.round(Math.atan2(dy, dx) * 4 / Math.PI) + 8) % 8];
  }

  function canStand(point, zone, margin = 10) {
    const { x, y } = point;
    const { left, right, top, bottom } = zone.bounds;
    if (!(x >= left && x <= right && y >= top && y <= bottom)) return false;
    const innerGate = zone.innerGate;
    if (innerGate && y < innerGate.approachY &&
        (Math.abs(x - innerGate.x) > innerGate.halfWidth || (!innerGate.open && y < innerGate.y))) return false;
    const gate = zone.gateApproaches?.find(gate => gate.outer > gate.inner ? x > gate.inner : x < gate.inner);
    if (gate) {
      const { route, halfWidth } = gate;
      const segment = route.findIndex(([endX], index) => index > 0 && x <= endX);
      if (segment < 0) return false;
      const [fromX, fromY] = route[segment - 1];
      const [toX, toY] = route[segment];
      const center = fromY + (toY - fromY) * (x - fromX) / (toX - fromX);
      if (Math.abs(y - center) > halfWidth) return false;
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

  function animate(entity, dt) {
    entity.actionTime = Math.max(0, entity.actionTime - dt);
    if (entity.actionTime === 0) entity.action = entity.moving ? 'walk' : 'idle';
  }

  function pose(entity, action, seconds) {
    entity.action = action;
    entity.actionDuration = seconds;
    entity.actionTime = seconds;
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
      player, zone: null, zoneInfo: null, enemies: [], npcs: [], portals: [], targetId: null,
      quest: { ...QUEST, status, count: progress, objective: QUEST_OBJECTIVES[status] },
      ruinsQuest: readRuinsQuest(saved?.ruinsQuest), trackedQuest: null,
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
      const [stat, minimum] = skill.stat;
      return [
        { label: 'Base Lv.', minimum: skill.baseLevel, current: player.level },
        { label: 'Job Lv.', minimum: skill.jobLevel, current: player.jobLevel },
        { label: stat, minimum, current: stats[stat] },
      ];
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
      const { x, y, hp, mp, level, jobLevel, xp, jobXp, gold, stats, statPoints, inventory, equipment } = player;
      const { count, status } = state.quest;
      const { status: ruinsStatus, counts } = state.ruinsQuest;
      const position = state.dead ? zones.village.spawn : [x, y];
      const { range, hpBelow, mpBelow, skillIds } = state.auto;
      return JSON.stringify({ version: 1, savedAt: Date.now(), zone: state.dead ? 'village' : state.zone, quest: { status, count },
        ruinsQuest: { status: ruinsStatus, counts },
        trainingCooldowns: state.trainingCooldowns,
        trainingManaCosts: state.trainingManaCosts,
        auto: { range, hpBelow, mpBelow, skillIds }, skillSlots: state.skillSlots, itemSlots: state.itemSlots,
        enabledSkills: [...state.enabledSkills],
        player: { x: position[0], y: position[1], hp: state.dead ? player.maxHp : hp,
          mp: state.dead ? player.maxMp : mp, level, jobLevel, xp, jobXp, gold, stats, statPoints, inventory, equipment } });
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
      state.ruinsQuest = readRuinsQuest(restored.ruinsQuest);
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
      if (id === 'ruins' && zones.ruins && state.quest.status === 'completed') return id;
      return 'village';
    }

    function enterZone(id, point, facing = 's') {
      const zone = zones[id];
      if (!zone) return;
      state.zone = id;
      state.trackedQuest = id === 'ruins' ? state.ruinsQuest : state.quest;
      state.zoneInfo = zone.innerGate ? {
        ...zone, innerGate: { ...zone.innerGate, open: state.ruinsQuest.status === 'completed' },
      } : zone;
      state.npcs = zone.npcs;
      state.portals = zone.portals;
      state.enemies = zone.enemies.map(([type, x, y], index) => {
        const details = MONSTERS[type];
        const name = type === 'dummy' ? `${details.name} ${index + 1}` : details.name;
        return { id: `${id}-${index}`, type, sprite: details.sprite ?? type, x, y, origin: { x, y }, name, level: details.level,
          hp: details.hp, maxHp: details.hp, moving: false, action: 'idle', actionTime: 0, dir: 's', visible: true,
          aggro: false, cooldown: 0.6, wander: null, wanderIn: 2 + index * 0.47, respawnIn: 0 };
      });
      const position = point && canStand(point, state.zoneInfo) ? point : { x: zone.spawn[0], y: zone.spawn[1] };
      placePlayer(position, facing);
      emit({ type: 'zone', zone: id, zoneInfo: state.zoneInfo });
    }

    function placePlayer(point, facing = 's') {
      pendingStrike = null;
      Object.assign(player, point, { dir: facing, moving: false, action: 'idle', actionTime: 0 });
      state.targetId = null;
      cancelMovement();
    }

    function nearestTown() {
      // Positions belong to their own maps. Add distances to portals along the route.
      const pending = [{ zone: state.zoneInfo, point: player, cost: 0 }];
      const visited = new Set();
      while (pending.length) {
        pending.sort((a, b) => b.cost - a.cost);
        const { zone, point, cost } = pending.pop();
        if (visited.has(zone.id)) continue;
        if (zone.town) return zone;
        visited.add(zone.id);
        for (const portal of zone.portals) {
          const next = zones[portal.target];
          if (!next || visited.has(next.id) || (portal.quest && state.quest.status !== 'completed')) continue;
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
      return state.enemies.find(enemy => enemy.id === state.targetId && enemy.hp > 0);
    }

    function selectTarget(id) {
      cancelMovement();
      state.targetId = state.enemies.some(enemy => enemy.id === id && enemy.hp > 0) ? id : null;
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
      if (state.dead) return false;
      const enemy = targetEnemy() || closestToPlayer(state.enemies.filter(entity => entity.hp > 0), 240);
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

    function removeItem(id) {
      player.inventory[id]--;
      if (player.inventory[id] === 0) delete player.inventory[id];
    }

    function giveExperience(xp, jobXp) {
      player.xp += xp;
      player.jobXp += jobXp;
      let leveled = false;
      while (player.xp >= player.nextXp) {
        player.xp -= player.nextXp;
        player.level++;
        player.statPoints += 3;
        updateAttributes(player);
        leveled = true;
      }
      while (player.jobXp >= player.nextJobXp) {
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
      quest.objective = (quest.goals ? RUINS_QUEST_OBJECTIVES : QUEST_OBJECTIVES)[status];
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
      if (enemy.type === 'dummy') {
        enemy.hp = enemy.maxHp;
        return;
      }
      const data = MONSTERS[enemy.type];
      enemy.respawnIn = 10;
      enemy.aggro = false;
      enemy.moving = false;
      enemy.action = 'death';
      player.gold += data.gold;
      if (state.targetId === enemy.id) {
        state.targetId = null;
        cancelMovement();
      }
      giveExperience(data.xp, data.jobXp);
      dropLoot(enemy, data.drop);
      if (data.card && Math.random() < 0.1 + (player.stats.LUK - 1) * 0.008) dropLoot(enemy, data.card);
      if (state.quest.status === 'active' && state.zone === 'village' && enemy.type === 'village_monkey') {
        state.quest.count++;
        if (state.quest.count >= state.quest.needed) {
          setQuest('ready');
          notice('กำจัดครบแล้ว กลับไปหาลุงขาม');
        } else {
          emit({ type: 'quest', status: 'active', count: state.quest.count });
        }
      }
      const ruinsQuest = state.ruinsQuest;
      if (state.zone === 'ruins' && ruinsQuest.status === 'active' &&
          ruinsQuest.counts[enemy.type] < ruinsQuest.goals[enemy.type]) {
        ruinsQuest.counts[enemy.type]++;
        if (meetsRuinsGoals(ruinsQuest.counts)) {
          setQuest('ready', ruinsQuest);
          notice('กำจัดครบแล้ว กลับไปหาพรานหม่องเพื่อเปิดประตู');
        } else {
          emit({ type: 'quest', status: 'active' });
        }
      }
      save();
    }

    function criticalChance(stats = player.stats) {
      const precision = player.equipment.weapon ? passiveBonus(PASSIVE_SKILLS.precision, stats) : 0;
      return Math.min(0.5, 0.06 + (stats.LUK - 1) * 0.01) + precision;
    }

    function defense(stats = player.stats) {
      return (stats.VIT - 1) * 0.65;
    }

    function basicAttackInterval(stats = player.stats) {
      return Math.max(0.29, 0.68 - (stats.AGI - 1) * 0.026);
    }

    function combatStats(stats = player.stats) {
      return { ...derivedAttributes(player, stats), defense: defense(stats), critical: criticalChance(stats),
        attacksPerSecond: 1 / basicAttackInterval(stats) };
    }

    function hitEnemy(enemy, multiplier, skill = null) {
      if (!enemy || enemy.hp <= 0) return;
      const wieldingSword = Boolean(player.equipment.weapon);
      const mastery = wieldingSword ? passiveBonus(PASSIVE_SKILLS.mastery) : 0;
      const critical = Math.random() < criticalChance();
      const power = player.attack * (0.92 + Math.random() * 0.16) + (player.stats.DEX - 1);
      const damage = Math.max(1, Math.round(power * multiplier * (1 + mastery) * (critical ? 1.5 : 1)));
      enemy.hp = Math.max(0, enemy.hp - damage);
      if (enemy.type === 'dummy') {
        enemy.lastHitAt = simulationTime;
      } else {
        enemy.aggro = true;
        enemy.cooldown = Math.max(skill === 'interrupt' ? 1.2 : 0.24, enemy.cooldown);
      }
      pose(enemy, 'hit', 0.14);
      emit({ type: 'damage', enemy: true, x: enemy.x, y: enemy.y, value: damage, critical, skill });
      if (enemy.hp === 0) defeatEnemy(enemy);
    }

    function hurtPlayer(enemy) {
      const data = MONSTERS[enemy.type];
      const guard = player.guardTime > 0 ? 0.5 : 1;
      const damage = Math.max(1, Math.round((data.atk - defense()) * guard));
      player.hp = Math.max(0, player.hp - damage);
      emit({ type: 'damage', enemy: false, x: player.x, y: player.y, value: damage, guarded: guard < 1 });
      if (player.hp > 0) {
        if (player.action === 'idle' || player.action === 'walk') pose(player, 'hit', 0.16);
        return;
      }
      state.dead = true;
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

    function resolveStrike(dt) {
      if (!pendingStrike || player.actionTime - dt > pendingStrike.impact) return;
      const { targets, range, multiplier, style } = pendingStrike;
      pendingStrike = null;
      const origin = style === 'basic' ? null : { x: player.x, y: player.y };
      const aimed = !skillsById.get(style)?.strike?.area;
      let contact = null;
      for (const enemy of targets) {
        const gap = distance(player, enemy);
        if (enemy.hp <= 0 || gap > range || !straightPath(player, enemy, state.zoneInfo)) continue;
        if (aimed && gap > 0) player.attackDir = direction(enemy.x - player.x, enemy.y - player.y);
        if (origin && !contact) contact = { x: enemy.x, y: enemy.y };
        if (style === 'dash') moveToward(player, enemy, Math.max(0, gap - 28), state.zoneInfo);
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
      if (state.dead || pendingStrike || !skill) return false;
      const unavailable = reason => {
        if (!automatic) notice(reason);
        return false;
      };
      if (!isSkillUnlocked(skill)) return unavailable('เลเวลหรือสเตตัสยังไม่ถึงเงื่อนไขสกิล');
      if (!state.enabledSkills.has(skill.id)) return unavailable('เปิดใช้งานสกิลนี้ในหน้าสกิลก่อน');
      const cooldowns = skillCooldownsEnabled();
      const manaCost = skillManaCostsEnabled() ? skill.cost : 0;
      if (cooldowns && skill.remaining > 0) return unavailable('สกิลกำลังพัก');
      if (player.mp < manaCost) return unavailable('มานาไม่พอ');
      const { strike } = skill;
      let targets;
      if (strike?.area) {
        targets = state.enemies.filter(enemy => enemy.hp > 0 && distance(player, enemy) < strike.range &&
          straightPath(player, enemy, state.zoneInfo));
        if (!targets.length) return unavailable('ไม่มีมอนสเตอร์ในระยะ');
      } else if (strike) {
        const enemy = targetEnemy();
        if (!enemy || distance(player, enemy) > strike.range || !straightPath(player, enemy, state.zoneInfo)) {
          return unavailable(enemy ? 'เป้าหมายอยู่นอกระยะสกิล' : 'เลือกมอนสเตอร์ก่อนใช้สกิล');
        }
        targets = [enemy];
        player.dir = direction(enemy.x - player.x, enemy.y - player.y);
      }
      if (skill.id === 'heal' && player.hp >= player.maxHp) return unavailable('พลังชีวิตเต็มแล้ว');
      player.mp -= manaCost;
      if (cooldowns) skill.remaining = skill.cooldown;
      attackCooldown = Math.max(attackCooldown, 0.43);
      if (strike) startStrike(targets, skill.id, strike.duration, strike.range + 10, strike.multiplier);
      else pose(player, 'cast', 0.38);
      if (skill.id === 'guard') player.guardTime = 6;
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

    function equipItem(id) {
      const item = player.inventory[id] && ITEMS[id];
      if (!item?.slot || player.equipment[item.slot] === id) return false;
      player.equipment[item.slot] = id;
      updateAttributes(player);
      notice(`สวม${item.name}`);
      save();
      return true;
    }

    function nearVendor() {
      return state.npcs.some(npc => npc.type === 'vendor' && distance(npc, player) <= INTERACT_RANGE + 10);
    }

    function buyItem(id) {
      const item = Object.hasOwn(ITEMS, id) && ITEMS[id];
      if (!item?.price || !nearVendor() || state.dead) return false;
      if (player.gold < item.price) { notice('เบี้ยไม่พอ'); return false; }
      player.gold -= item.price;
      addItem(id);
      notice(`ซื้อ${item.name}แล้ว`);
      save();
      return true;
    }

    function sellItem(id) {
      const item = player.inventory[id] && ITEMS[id];
      if (!item?.sell || !nearVendor() || state.dead || player.equipment[item.slot] === id) return false;
      removeItem(id);
      player.gold += item.sell;
      notice(`ขาย${item.name}แล้ว`);
      save();
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

    function acceptQuest() {
      const quest = state.trackedQuest;
      const owner = state.npcs.find(npc => npc.id === quest.npcId);
      if (state.dead || quest.status !== 'available' || state.interacting !== quest.npcId ||
          !owner || distance(player, owner) > (owner.reach ?? INTERACT_RANGE)) return false;
      setQuest('active', quest);
      save();
      return true;
    }

    function talkTo(npc) {
      const quest = state.trackedQuest;
      const ruins = quest === state.ruinsQuest;
      let questView;
      let text = 'ทางฝั่งตะวันออกเป็นป่ารก ระวังภูตแถวเจดีย์เก่าไว้ด้วย';
      if (npc.type === 'vendor') text = 'ยาสมุนไพรกับน้ำอบอยู่ตรงนี้ เลือกได้เลยจ้ะ';
      if (npc.id === 'guard') text = 'ข้ามสะพานไม้แล้วลอดประตูอิฐฝั่งตรงข้าม จะถึงดงเจดีย์ร้าง';
      if (npc.id === quest.npcId) {
        const { status } = quest;
        if (status === 'available') {
          questView = 'offer';
          text = ruins
            ? `ประตูชั้นในยังปิดอยู่ ${quest.description} ข้าจะเปิดประตูให้เมื่อเจ้ากลับมา`
            : 'ฝากกำจัดลิงป่า Lv. 1 สัก 3 ตัวให้ลุงหน่อย พวกมันลงมาป้วนเปี้ยนอยู่ทุ่งทางตะวันออก';
        } else if (status === 'ready') {
          setQuest('completed', quest);
          if (!ruins) {
            const { item, gold, xp, jobXp } = quest.rewards;
            player.gold += gold;
            addItem(item);
            giveExperience(xp, jobXp);
          }
          questView = 'reward';
          text = ruins ? 'ข้าเปิดประตูชั้นในให้แล้ว เดินไปลอดซุ้มอิฐด้านตะวันออกเฉียงเหนือได้เลย'
            : 'ขอบใจมาก ทีนี้ข้ามสะพานไม้แล้วลอดประตูอิฐไปดงเจดีย์ร้างได้แล้ว';
        } else if (status === 'active') {
          questView = 'progress';
          text = ruins ? questProgress(quest) : `จัดการลิงป่าได้ ${quest.count} จาก ${quest.needed} ตัวแล้ว`;
        } else {
          text = ruins ? 'ประตูชั้นในเปิดแล้ว ทางไปอยู่ตรงซุ้มอิฐด้านตะวันออกเฉียงเหนือ'
            : 'ถ้าจะไปดงเจดีย์ร้าง ให้เดินข้ามสะพานไม้ไปลอดประตูอิฐทางตะวันออก';
        }
        save();
      }
      emit({ type: 'dialog', npc, text, questView, quest });
    }

    function finishInteraction(entity) {
      cancelMovement();
      player.dir = direction(entity.x - player.x, entity.y - player.y);
      if (entity.id === state.zoneInfo.innerGate?.id) {
        if (!state.zoneInfo.innerGate.open) {
          notice('ทำภารกิจของพรานหม่องให้เสร็จก่อนผ่านประตู');
          return false;
        }
        return routeTo({ x: entity.x, y: player.y < entity.y ? entity.approachY : entity.exitY });
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
      const zone = zones[entity.target];
      if (!zone) return false;
      const [x, y] = entity.arrival ?? zone.arrival ?? zone.spawn;
      enterZone(entity.target, { x, y }, entity.facing);
      save();
      return true;
    }

    function interact(id) {
      if (state.dead) return false;
      setAuto(false);
      const entities = [...state.npcs, ...state.portals];
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

    function updatePlayer(dt, axis) {
      player.moving = false;
      attackCooldown = Math.max(0, attackCooldown - dt);
      player.guardTime = Math.max(0, player.guardTime - dt);
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
        if (!enemy) cancelMovement();
        else if (distance(player, enemy) <= MELEE_RANGE && straightPath(player, enemy, state.zoneInfo)) {
          waypoints = [];
          player.dir = direction(enemy.x - player.x, enemy.y - player.y);
          if (attackCooldown === 0 && !pendingStrike) {
            attackCooldown = basicAttackInterval();
            startStrike([enemy], 'basic', Math.min(0.4, attackCooldown), MELEE_RANGE + 10, 1);
          }
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
      resolveStrike(dt);
      animate(player, dt);
    }

    function updateEnemy(enemy, dt) {
      if (enemy.type === 'dummy') {
        if (enemy.hp < enemy.maxHp && simulationTime >= enemy.lastHitAt + DUMMY_RECOVERY_DELAY) {
          enemy.hp = enemy.maxHp;
        }
        animate(enemy, dt);
        return;
      }
      if (enemy.hp <= 0) {
        enemy.respawnIn -= dt;
        enemy.visible = enemy.respawnIn > 9.6;
        if (enemy.respawnIn <= 0) {
          Object.assign(enemy, enemy.origin, { hp: enemy.maxHp, action: 'idle', visible: true, wander: null, wanderIn: 2 });
        }
        return;
      }
      const details = MONSTERS[enemy.type];
      enemy.moving = false;
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      const gap = distance(enemy, player);
      const playerReachable = gap < 245 && straightPath(enemy, player, state.zoneInfo);
      if (state.zone === 'ruins' && gap < 100 && playerReachable) enemy.aggro = true;
      if (enemy.aggro && (!playerReachable || distance(enemy, enemy.origin) > 220 || state.dead)) {
        enemy.aggro = false;
        enemy.wander = enemy.origin;
      }
      if (enemy.action === 'attack') {
        const impact = enemy.actionDuration * (1 - STRIKE_PHASE);
        if (enemy.actionTime > impact && enemy.actionTime - dt <= impact &&
            !state.dead && gap <= 47 && playerReachable) hurtPlayer(enemy);
        animate(enemy, dt);
        return;
      }
      if (enemy.aggro && enemy.action !== 'hit') {
        if (gap < 35) {
          enemy.dir = direction(player.x - enemy.x, player.y - enemy.y);
          if (enemy.cooldown === 0) {
            enemy.cooldown = 1.3;
            pose(enemy, 'attack', 0.42);
          }
        } else moveToward(enemy, player, dt * details.speed, state.zoneInfo);
      } else if (!enemy.aggro) {
        enemy.wanderIn -= dt;
        if (!enemy.wander && enemy.wanderIn <= 0) {
          const point = { x: enemy.origin.x + Math.random() * 80 - 40, y: enemy.origin.y + Math.random() * 70 - 35 };
          if (straightPath(enemy, point, state.zoneInfo)) enemy.wander = point;
          enemy.wanderIn = 2 + Math.random() * 4;
        }
        if (enemy.wander) {
          moveToward(enemy, enemy.wander, dt * details.speed * 0.42, state.zoneInfo);
          if (!enemy.moving || distance(enemy, enemy.wander) < 1) enemy.wander = null;
        }
      }
      animate(enemy, dt);
    }

    function useAutoSkill() {
      if (pendingStrike || player.action === 'attack' || player.action === 'cast' || !state.auto.skillIds.some(Boolean)) return;
      const target = targetEnemy();
      for (const id of state.auto.skillIds) {
        const skill = skillsById.get(id);
        if (!skill || (skill.strike && !target)) continue;
        if (id === 'heal' && player.hp * 100 >= player.maxHp * AUTO_HEAL_BELOW) continue;
        if (id === 'guard' && (player.guardTime > 0 || !state.enemies.some(enemy =>
          enemy.hp > 0 && enemy.aggro && distance(player, enemy) <= MELEE_RANGE &&
          straightPath(player, enemy, state.zoneInfo)))) continue;
        if (id === 'interrupt' && (target.action !== 'attack' ||
          target.actionTime <= target.actionDuration * (1 - STRIKE_PHASE))) continue;
        if (castSkill(skill, true)) return;
      }
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
      useAutoSkill();
    }

    function findAutoTarget(dt, range) {
      autoSearchWait = Math.max(0, autoSearchWait - dt);
      if (autoSearchWait > 0) return;
      autoSearchWait = 0.3;
      const candidates = state.enemies
        .filter(enemy => enemy.hp > 0 && distance(player, enemy) <= AUTO_RANGES[range])
        .sort((a, b) => distance(player, a) - distance(player, b));
      for (const enemy of candidates) {
        const route = pathTo(player, enemy, state.zoneInfo);
        if (!route.length || distance(route.at(-1), enemy) > MELEE_RANGE) continue;
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
      for (const skill of state.skills) skill.remaining = Math.max(0, skill.remaining - dt);
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
        if (state.auto.enabled) {
          if (Math.hypot(axis.x || 0, axis.y || 0) > 0.01) setAuto(false);
          else updateAuto(dt, autoPaused);
        }
        updatePlayer(dt, { x: axis.x || 0, y: axis.y || 0 });
        for (const enemy of state.enemies) {
          if (state.dead) break;
          updateEnemy(enemy, dt);
        }
        regeneration += dt;
        if (regeneration >= 2) {
          regeneration -= 2;
          player.mp = Math.min(player.maxMp, player.mp + 1 + passiveBonus(PASSIVE_SKILLS.discipline));
          if (!state.enemies.some(enemy => enemy.aggro)) player.hp = Math.min(player.maxHp, player.hp + 1);
        }
      }
      timeSinceSave += dt;
      if (timeSinceSave >= 5) { timeSinceSave = 0; save(); }
    }

    const zone = savedZone(saved?.zone);
    const savedPoint = Number.isFinite(saved?.player?.x) && Number.isFinite(saved?.player?.y)
      ? { x: saved.player.x, y: saved.player.y } : null;
    const spawn = options.spawn || savedPoint;
    enterZone(zone, Array.isArray(spawn) ? { x: spawn[0], y: spawn[1] } : spawn);
    return { state, update, moveTo, selectTarget, attack, basicAttackRange: MELEE_RANGE,
      distanceTo: point => distance(player, point), useSkill, getSlotSkill, assignSkill, clearSkillSlots,
      skillRequirements, isSkillUnlocked, isSkillEnabled, enableSkill, resetLevels, resetCharacter, interact, useItem, equipItem,
      itemAction, assignItemSlot, acceptQuest, questProgress, buyItem, sellItem, raiseStat, statAllocation, applyStatPoints, combatStats,
      setAuto, configureAuto, skillCooldownsEnabled, setTrainingCooldowns, skillManaCostsEnabled, setTrainingManaCosts,
      save, exportSave, importSave,
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } };
  }

  window.AyothayaGame = { create, strikePhase: STRIKE_PHASE, autoHealBelow: AUTO_HEAL_BELOW };
})();
