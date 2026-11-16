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
  const VILLAGE_GATE = {
    inner: BOUNDS.right, outer: 2080, viewX: 0.932, halfWidth: 18,
    route: [[1555, 277], [1632, 256], [1820, 256], [1895, 270], [1962, 286], [2014, 272], [2057, 244], [2080, 219]],
  };
  const RUINS_GATE = {
    inner: BOUNDS.left, outer: 0, viewX: 0.108, halfWidth: 20,
    route: [[0, 520], [135, 520]],
  };
  const ZONES = {
    village: {
      id: 'village', name: 'บ้านท่ามะขาม', subtitle: 'เขตชานพระนคร', levels: 'Lv. 1–4',
      width: VILLAGE_GATE.outer, height: 1120, bounds: { ...BOUNDS, right: VILLAGE_GATE.outer, top: 90 },
      spawn: [770, 570], arrival: [1997, 277], gateApproach: VILLAGE_GATE,
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
      portals: [{ id: 'east-gate', name: 'ดงเจดีย์ร้าง', x: 2075, y: 220,
        target: 'ruins', facing: 'e', quest: true, automatic: true, reach: 11 }],
      enemies: [
        ['village_monkey', 780, 470], ['village_monkey', 405, 545], ['village_monkey', 500, 775],
        ['village_monkey', 945, 820], ['village_monkey', 1095, 650], ['village_monkey', 1335, 485],
        ['village_monkey', 1440, 765],
      ],
    },
    ruins: {
      id: 'ruins', name: 'ดงเจดีย์ร้าง', subtitle: 'เขตป่าตะวันออก', levels: 'Lv. 3–7',
      width: 1680, height: 1120, bounds: { ...BOUNDS, left: RUINS_GATE.outer },
      spawn: [310, 548], arrival: [158, 520], gateApproach: RUINS_GATE,
      obstacles: [],
      npcs: [{ id: 'ruins-guard', type: 'guard', name: 'พรานเฝ้าดง', x: 415, y: 520 }],
      portals: [{ id: 'west-gate', name: 'บ้านท่ามะขาม', x: 7, y: 520,
        target: 'village', facing: 'w', automatic: true, reach: 11 }],
      enemies: [
        ['ghost', 590, 430], ['ghost', 785, 620], ['ghost', 1065, 445], ['ghost', 1045, 855],
        ['monkey', 435, 773], ['monkey', 725, 860], ['monkey', 1010, 652],
        ['guardian', 1335, 380], ['guardian', 1460, 603], ['guardian', 1370, 864],
      ],
    },
  };

  const MONSTERS = {
    tamarind: { name: 'ลูกมะขามภูต', level: 1, hp: 30, atk: 4, xp: 18, jobXp: 9, gold: 5, speed: 53, drop: 'tamarind_core', card: 'tamarind_card' },
    village_monkey: { name: 'ลิงป่า', sprite: 'monkey', level: 1, hp: 32, atk: 4, xp: 18, jobXp: 9, gold: 5, speed: 65, drop: 'monkey_claw', card: 'monkey_card' },
    monkey: { name: 'ลิงป่า', level: 2, hp: 53, atk: 7, xp: 30, jobXp: 15, gold: 9, speed: 83, drop: 'monkey_claw' },
    ghost: { name: 'ภูตพงไพร', level: 3, hp: 78, atk: 10, xp: 48, jobXp: 25, gold: 14, speed: 65, drop: 'spirit_dust' },
    guardian: { name: 'อารักษ์ศิลา', level: 5, hp: 142, atk: 17, xp: 96, jobXp: 54, gold: 27, speed: 63, drop: 'guardian_seal' },
  };

  const ITEMS = {
    potion: { name: 'ยาสมุนไพร', description: 'ฟื้นพลังชีวิต 45 หน่วย', type: 'consumable', icon: 'potion', price: 12, sell: 4 },
    elixir: { name: 'น้ำอบมนตรา', description: 'ฟื้นมานา 28 หน่วย', type: 'consumable', icon: 'elixir', price: 16, sell: 6 },
    rusty_sword: { name: 'ดาบฝึกหัด', description: 'พลังโจมตี +4', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 4 },
    bronze_sword: { name: 'ดาบสำริด', description: 'พลังโจมตี +10', type: 'equipment', icon: 'sword', slot: 'weapon', attack: 10, sell: 30 },
    tamarind_core: { name: 'เมล็ดมะขามภูต', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'seed', sell: 3 },
    monkey_claw: { name: 'กรงเล็บลิงป่า', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'claw', sell: 7 },
    spirit_dust: { name: 'ผงพงไพร', description: 'วัตถุดิบสำหรับขาย', type: 'material', icon: 'dust', sell: 10 },
    tamarind_card: { name: 'การ์ดมะขามภูต', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    monkey_card: { name: 'การ์ดลิงป่า', description: 'ใส่ช่องการ์ดเพื่อเพิ่มพลังโจมตี 3 และ HP สูงสุด 12', type: 'equipment', icon: 'card', slot: 'card', attack: 3, hp: 12 },
    guardian_seal: { name: 'ตราอารักษ์', description: 'เครื่องรางเก่าที่อารักษ์ศิลาฝากไว้', type: 'material', icon: 'seal', sell: 35 },
  };

  const SKILLS = [
    { id: 'heavy', name: 'ฟันหนัก', cost: 5, cooldown: 3, description: 'โจมตีเป้าหมายเดียวอย่างแรง' },
    { id: 'sweep', name: 'กวาดดาบ', cost: 8, cooldown: 5, description: 'โจมตีมอนสเตอร์ในวงรอบตัว' },
    { id: 'guard', name: 'ตั้งรับ', cost: 6, cooldown: 9, description: 'ลดความเสียหายที่ได้รับครึ่งหนึ่งเป็นเวลา 6 วินาที' },
    { id: 'heal', name: 'สมานแผล', cost: 10, cooldown: 10, description: 'ฟื้นพลังชีวิตทันที' },
    { id: 'dash', name: 'พุ่งตัด', cost: 14, cooldown: 8, description: 'พุ่งเข้าโจมตีเป้าหมายในระยะกลาง' },
  ];
  const QUEST = { title: 'เฝ้าท่ามะขาม', description: 'ช่วยลุงขามกำจัดลิงป่า Lv. 1 จำนวน 3 ตัว', needed: 3 };
  const QUEST_OBJECTIVES = {
    available: 'คุยกับลุงขามเพื่อรับภารกิจ', active: 'กำจัดลิงป่า Lv. 1',
    ready: 'กลับไปรายงานลุงขาม', completed: 'เดินทางต่อสู่ดงเจดีย์ร้าง',
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

  function updateAttributes(player) {
    const equipped = Object.values(player.equipment).map(id => ITEMS[id]);
    player.maxHp = 100 + (player.level - 1) * 10 + (player.stats.VIT - 1) * 8 + equipped.reduce((total, item) => total + (item.hp || 0), 0);
    player.maxMp = 50 + (player.jobLevel - 1) * 4 + (player.stats.INT - 1) * 5;
    player.attack = 11 + (player.level - 1) * 2 + (player.stats.STR - 1) * 3 + equipped.reduce((total, item) => total + (item.attack || 0), 0);
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
    const gate = zone.gateApproach;
    if (gate && (gate.outer > gate.inner ? x > gate.inner : x < gate.inner)) {
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
    const segments = Math.ceil(distance(start, end) / 9);
    for (let i = 1; i <= segments; i++) {
      const x = start.x + (end.x - start.x) * i / segments;
      const y = start.y + (end.y - start.y) * i / segments;
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

  function moveEntity(entity, dx, dy, zone) {
    const previous = { x: entity.x, y: entity.y };
    if (canStand({ x: entity.x + dx, y: entity.y + dy }, zone)) {
      entity.x += dx;
      entity.y += dy;
    } else {
      if (canStand({ x: entity.x + dx, y: entity.y }, zone)) entity.x += dx;
      if (canStand({ x: entity.x, y: entity.y + dy }, zone)) entity.y += dy;
    }
    entity.moving = distance(entity, previous) > 0.02;
    if (entity.moving) entity.dir = direction(entity.x - previous.x, entity.y - previous.y);
  }

  function moveToward(entity, point, step, zone) {
    const gap = distance(entity, point);
    if (gap < 0.001) return;
    const fraction = Math.min(1, step / gap);
    moveEntity(entity, (point.x - entity.x) * fraction, (point.y - entity.y) * fraction, zone);
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
    return {
      range: Object.hasOwn(AUTO_RANGES, settings?.range) ? settings.range : 'medium',
      hpBelow: boundedNumber(settings?.hpBelow, 50, 0, 100),
      mpBelow: boundedNumber(settings?.mpBelow, 40, 0, 100),
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
    const state = {
      player, zone: null, zoneInfo: null, enemies: [], npcs: [], portals: [], targetId: null,
      quest: { ...QUEST, status, count: progress, objective: QUEST_OBJECTIVES[status] },
      skills: SKILLS.map(skill => ({ ...skill, remaining: 0 })), items: ITEMS,
      auto: { ...autoOptions(saved?.auto), enabled: false },
      destination: null, interacting: null, autoAttack: false, dead: false, saved: Boolean(saved), saveMode,
    };
    const subscribers = new Set();
    let waypoints = [];
    let attackCooldown = 0;
    let repath = 0;
    let regeneration = 0;
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

    function exportSave() {
      const { x, y, hp, mp, level, jobLevel, xp, jobXp, gold, stats, statPoints, inventory, equipment } = player;
      const { count, status } = state.quest;
      const position = state.dead ? zones.village.spawn : [x, y];
      const { range, hpBelow, mpBelow } = state.auto;
      return JSON.stringify({ version: 1, savedAt: Date.now(), zone: state.dead ? 'village' : state.zone, quest: { status, count },
        auto: { range, hpBelow, mpBelow },
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
      Object.assign(state.auto, autoOptions(restored.auto), { enabled: false });
      autoSearchWait = 0;
      autoItemWait = 0;
      state.quest.count = status === 'ready' || status === 'completed' ? QUEST.needed : progress;
      setQuest(status);
      state.dead = false;
      attackCooldown = 0;
      regeneration = 0;
      for (const skill of state.skills) skill.remaining = 0;
      const zone = restored.zone === 'ruins' && state.quest.status === 'completed' && zones.ruins ? 'ruins' : 'village';
      enterZone(zone, { x: restored.player.x, y: restored.player.y });
      save();
      return true;
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

    function enterZone(id, point, facing = 's') {
      const zone = zones[id];
      if (!zone) return;
      pendingStrike = null;
      state.zone = id;
      state.zoneInfo = zone;
      state.npcs = zone.npcs;
      state.portals = zone.portals;
      state.enemies = zone.enemies.map(([type, x, y], index) => {
        const details = MONSTERS[type];
        return { id: `${id}-${index}`, type, sprite: details.sprite ?? type, x, y, origin: { x, y }, name: details.name, level: details.level,
          hp: details.hp, maxHp: details.hp, moving: false, action: 'idle', actionTime: 0, dir: 's', visible: true,
          aggro: false, cooldown: 0.6, wander: null, wanderIn: 2 + index * 0.47, respawnIn: 0 };
      });
      const position = point && canStand(point, zone) ? point : { x: zone.spawn[0], y: zone.spawn[1] };
      Object.assign(player, position, { dir: facing, moving: false, action: 'idle', actionTime: 0 });
      state.targetId = null;
      state.interacting = null;
      cancelMovement();
      emit({ type: 'zone', zone: id, zoneInfo: zone });
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

    function setQuest(status) {
      state.quest.status = status;
      state.quest.objective = QUEST_OBJECTIVES[status];
      emit({ type: 'quest', status, count: state.quest.count });
    }

    function dropLoot(enemy, id) {
      addItem(id);
      emit({ type: 'loot', itemId: id, count: 1, x: enemy.x, y: enemy.y, text: `ได้รับ ${ITEMS[id].name}` });
    }

    function defeatEnemy(enemy) {
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
      save();
    }

    function hitEnemy(enemy, multiplier, skill = null) {
      if (!enemy || enemy.hp <= 0) return;
      const critical = Math.random() < Math.min(0.5, 0.06 + (player.stats.LUK - 1) * 0.01);
      const damage = Math.max(1, Math.round((player.attack * (0.92 + Math.random() * 0.16) + (player.stats.DEX - 1)) * multiplier * (critical ? 1.5 : 1)));
      enemy.hp = Math.max(0, enemy.hp - damage);
      enemy.aggro = true;
      enemy.cooldown = Math.max(0.24, enemy.cooldown);
      pose(enemy, 'hit', 0.14);
      emit({ type: 'damage', enemy: true, x: enemy.x, y: enemy.y, value: damage, critical, skill });
      if (enemy.hp === 0) defeatEnemy(enemy);
    }

    function hurtPlayer(enemy) {
      const data = MONSTERS[enemy.type];
      const guard = player.guardTime > 0 ? 0.5 : 1;
      const damage = Math.max(1, Math.round((data.atk - (player.stats.VIT - 1) * 0.65) * guard));
      player.hp = Math.max(0, player.hp - damage);
      emit({ type: 'damage', enemy: false, x: player.x, y: player.y, value: damage });
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
      pose(player, 'attack', duration);
      pendingStrike = { targets, range, multiplier, style, impact: duration * (1 - STRIKE_PHASE) };
    }

    function resolveStrike(dt) {
      if (!pendingStrike || player.actionTime - dt > pendingStrike.impact) return;
      const { targets, range, multiplier, style } = pendingStrike;
      pendingStrike = null;
      for (const enemy of targets) {
        const gap = distance(player, enemy);
        if (enemy.hp <= 0 || gap > range || !straightPath(player, enemy, state.zoneInfo)) continue;
        if (style === 'dash') moveToward(player, enemy, Math.max(0, gap - 28), state.zoneInfo);
        hitEnemy(enemy, multiplier, style === 'basic' ? null : style);
      }
    }

    function useSkill(index) {
      if (state.dead || pendingStrike) return false;
      const skill = state.skills[index - 1];
      if (!skill) return false;
      if (skill.remaining > 0) { notice('สกิลกำลังพัก'); return false; }
      if (player.mp < skill.cost) { notice('มานาไม่พอ'); return false; }
      const enemy = targetEnemy();
      const range = skill.id === 'dash' ? 195 : 66;
      const targeted = skill.id === 'dash' || skill.id === 'heavy';
      if (targeted && (!enemy || distance(player, enemy) > range || !straightPath(player, enemy, state.zoneInfo))) {
        notice(enemy ? 'เป้าหมายอยู่นอกระยะสกิล' : 'เลือกมอนสเตอร์ก่อนใช้สกิล');
        return false;
      }
      const area = state.enemies.filter(entity => entity.hp > 0 && distance(player, entity) < 92 && straightPath(player, entity, state.zoneInfo));
      if (skill.id === 'sweep' && !area.length) { notice('ไม่มีมอนสเตอร์ในระยะ'); return false; }
      if (skill.id === 'heal' && player.hp >= player.maxHp) { notice('พลังชีวิตเต็มแล้ว'); return false; }
      player.mp -= skill.cost;
      skill.remaining = skill.cooldown;
      attackCooldown = Math.max(attackCooldown, 0.43);
      if (targeted) player.dir = direction(enemy.x - player.x, enemy.y - player.y);
      if (skill.id === 'guard' || skill.id === 'heal') pose(player, 'cast', 0.38);
      if (skill.id === 'heavy') startStrike([enemy], skill.id, 0.46, range + 10, 1.85);
      if (skill.id === 'sweep') startStrike(area, skill.id, 0.43, 102, 1.2);
      if (skill.id === 'guard') player.guardTime = 6;
      if (skill.id === 'heal') player.hp = Math.min(player.maxHp, player.hp + 32 + player.stats.INT * 3);
      if (skill.id === 'dash') startStrike([enemy], skill.id, 0.42, range + 10, 2.3);
      emit({ type: 'skill', skill: skill.id, name: skill.name, x: player.x, y: player.y });
      return true;
    }

    function useItem(id) {
      if (state.dead || !player.inventory[id]) return false;
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

    function raiseStat(key) {
      if (!STAT_KEYS.includes(key) || player.statPoints <= 0 || player.stats[key] >= 999) return false;
      player.stats[key]++;
      player.statPoints--;
      updateAttributes(player);
      save();
      return true;
    }

    function talkTo(npc) {
      let text = 'ทางฝั่งตะวันออกเป็นป่ารก ระวังภูตแถวเจดีย์เก่าไว้ด้วย';
      if (npc.type === 'vendor') text = 'ยาสมุนไพรกับน้ำอบอยู่ตรงนี้ เลือกได้เลยจ้ะ';
      if (npc.id === 'guard') text = 'ข้ามสะพานไม้แล้วลอดประตูอิฐฝั่งตรงข้าม จะถึงดงเจดีย์ร้าง';
      if (npc.type === 'elder') {
        const { status } = state.quest;
        if (status === 'available') {
          setQuest('active');
          text = 'ฝากกำจัดลิงป่า Lv. 1 สัก 3 ตัวให้ลุงหน่อย พวกมันลงมาป้วนเปี้ยนอยู่ทุ่งทางตะวันออก';
        } else if (status === 'ready') {
          setQuest('completed');
          player.gold += 35;
          addItem('bronze_sword');
          giveExperience(38, 18);
          text = 'ขอบใจมาก รับดาบสำริดกับเบี้ย 35 ไปเถิด ทีนี้ข้ามสะพานไม้แล้วลอดประตูอิฐไปดงเจดีย์ร้างได้แล้ว';
        } else if (status === 'active') {
          text = `จัดการลิงป่าได้ ${state.quest.count} จาก ${state.quest.needed} ตัวแล้ว`;
        } else {
          text = 'ถ้าจะไปดงเจดีย์ร้าง ให้เดินข้ามสะพานไม้ไปลอดประตูอิฐทางตะวันออก';
        }
        save();
      }
      emit({ type: 'dialog', npc, text });
    }

    function finishInteraction(entity) {
      cancelMovement();
      player.dir = direction(entity.x - player.x, entity.y - player.y);
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
      const [x, y] = zone.arrival || zone.spawn;
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
      const speed = (165 + Math.min(65, (player.stats.AGI - 1) * 4)) * dt;
      if (axisLength > 0.01) {
        cancelMovement();
        moveEntity(player, axis.x / axisLength * speed, axis.y / axisLength * speed, state.zoneInfo);
      } else if (state.autoAttack) {
        const enemy = targetEnemy();
        if (!enemy) cancelMovement();
        else if (distance(player, enemy) <= MELEE_RANGE && straightPath(player, enemy, state.zoneInfo)) {
          waypoints = [];
          player.dir = direction(enemy.x - player.x, enemy.y - player.y);
          if (attackCooldown === 0 && !pendingStrike) {
            attackCooldown = Math.max(0.29, 0.68 - (player.stats.AGI - 1) * 0.026);
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
      if (waypoints.length) {
        moveToward(player, waypoints[0], speed, state.zoneInfo);
        if (distance(player, waypoints[0]) < 1) waypoints.shift();
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
        if (heals || (player.mp * 100 < player.maxMp * mpBelow && useItem('elixir'))) autoItemWait = 1;
      }
      if (state.autoAttack && targetEnemy()) return;

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
          player.mp = Math.min(player.maxMp, player.mp + 1);
          if (!state.enemies.some(enemy => enemy.aggro)) player.hp = Math.min(player.maxHp, player.hp + 1);
        }
      }
      timeSinceSave += dt;
      if (timeSinceSave >= 5) { timeSinceSave = 0; save(); }
    }

    const zone = saved?.zone === 'ruins' && status === 'completed' && zones.ruins ? 'ruins' : 'village';
    const savedPoint = Number.isFinite(saved?.player?.x) && Number.isFinite(saved?.player?.y)
      ? { x: saved.player.x, y: saved.player.y } : null;
    const spawn = options.spawn || savedPoint;
    enterZone(zone, Array.isArray(spawn) ? { x: spawn[0], y: spawn[1] } : spawn);
    return { state, update, moveTo, selectTarget, attack, useSkill, interact, useItem, equipItem,
      buyItem, sellItem, raiseStat, setAuto, configureAuto, save, exportSave, importSave,
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } };
  }

  window.AyothayaGame = { create, strikePhase: STRIKE_PHASE };
})();
