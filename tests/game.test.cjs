const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const sandbox = { window: {}, Math: Object.assign(Object.create(Math), { random: () => 0.65 }) };
runInNewContext(readFileSync(join(__dirname, '..', 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });

const { create } = sandbox.window.AyothayaGame;
const saveKey = 'ayothaya-survival-v1';
const villageComplete = { status: 'completed', count: 3 };
const ruinsComplete = { status: 'completed', counts: { ghost: 10, guardian: 5 } };
const trainedPlayer = {
  level: 30, jobLevel: 8, hp: 142, mp: 120, statPoints: 14,
  stats: { STR: 8, AGI: 7, VIT: 7, INT: 9, DEX: 7, LUK: 5 },
};

function memoryStorage(initial) {
  let data = initial;
  return {
    getItem: (key) => key === saveKey ? data : null,
    setItem: (key, value) => { if (key === saveKey) data = value; },
  };
}

const initialGame = create({ storage: null });
const village = initialGame.state.zoneInfo;
const initialSave = JSON.parse(initialGame.exportSave());

function fixture({ player, ...changes } = {}, options = {}) {
  const saved = { ...initialSave, ...changes, player: { ...initialSave.player, ...player } };
  return create({ ...options, storage: memoryStorage(JSON.stringify(saved)) });
}

function arena(enemies, player = {}, changes = {}) {
  return fixture({ ...changes, player: { x: 775, y: 610, ...player } }, {
    zones: { village: { ...village, obstacles: [], enemies } },
  });
}

const ruins = fixture({ zone: 'ruins', quest: villageComplete }).state.zoneInfo;

function monsterEncounter(type, gap, { player, obstacles, ...changes } = {}) {
  const zone = type === 'village_monkey' ? village : ruins;
  const spawn = zone.enemies.find(([kind]) => kind === type);
  const [, x, y] = spawn;
  return fixture({ zone: zone.id, quest: villageComplete, ...changes, player: { ...player, x: x - gap, y } }, {
    zones: { village, [zone.id]: { ...zone, obstacles: obstacles ?? zone.obstacles, enemies: [spawn] } },
  });
}

function tick(game, frames = 1, axis, paused) {
  for (let i = 0; i < frames; i++) game.update(0.05, axis, paused);
}

function advanceUntil(game, reached, expected, limit = 520) {
  for (let i = 0; i < limit && !game.state.dead && !reached(); i++) tick(game);
  const { x, y, hp } = game.state.player;
  assert.ok(reached(), expected + ' (x=' + x.toFixed(2) + ', y=' + y.toFixed(2) + ', HP=' + hp + ')');
}

function talk(game, npcId) {
  assert.ok(game.interact(npcId), 'Interaction should start: ' + npcId);
  advanceUntil(game, () => game.state.interacting === npcId, 'Should reach ' + npcId + ' and open its dialogue');
}

function nearestEnemy(game, type) {
  const { enemies, player } = game.state;
  return enemies.filter((enemy) => enemy.type === type && enemy.hp > 0)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
}

function defeat(game, type) {
  advanceUntil(game, () => Boolean(nearestEnemy(game, type)), type + ' should respawn');
  const enemy = nearestEnemy(game, type);
  assert.ok(game.selectTarget(enemy.id));
  assert.ok(game.attack());
  advanceUntil(game, () => enemy.hp === 0, 'Should defeat ' + type);
}

function provokeMonkey(game) {
  const [monkey] = game.state.enemies;
  assert.ok(game.selectTarget(monkey.id));
  assert.ok(game.attack());
  advanceUntil(game, () => monkey.hp < monkey.maxHp, 'The first hit should provoke the monkey');
  assert.ok(monkey.hp > 0);
  game.selectTarget(null);
}

function clearVillage(game) {
  talk(game, 'elder');
  assert.ok(game.acceptQuest());
  for (let i = 0; i < 3; i++) defeat(game, 'village_monkey');
  assert.equal(game.state.quest.status, 'ready');
  assert.equal(game.interact('east-gate'), false);
  talk(game, 'elder');
  assert.equal(game.state.quest.status, 'completed');
}

test('TC-QUEST-01 | Village quest, combat rewards and level progression', () => {
  const game = create({ storage: memoryStorage() });
  const { state } = game;
  assert.equal(state.player.level, 1);
  assert.equal(state.zone, 'village');
  assert.ok(state.enemies.length > 0);
  assert.ok(state.enemies.every((enemy) => enemy.type === 'village_monkey' && enemy.level === 1));
  assert.equal(game.acceptQuest(), false);
  assert.equal(game.interact('east-gate'), false);
  clearVillage(game);
  assert.equal(state.quest.count, 3);
  assert.equal(state.player.inventory.monkey_claw, 3);
  assert.equal(state.player.inventory.bronze_sword, 1);
  assert.equal(state.player.gold, 12 + 3 * 2 + 17);
  assert.equal(state.player.level, 2);
  assert.equal(state.player.jobLevel, 2);
  assert.deepEqual([state.quest.rewards.xp, state.quest.rewards.jobXp], [29, 14]);
  assert.deepEqual([state.player.xp, state.player.jobXp], [23, 5]);
  const gold = state.player.gold;
  talk(game, 'elder');
  assert.equal(state.player.gold, gold, 'The quest reward should be granted once');
  assert.equal(state.player.inventory.bronze_sword, 1);
});

test('TC-EXP-01 | Monster EXP pays 70% from a gap of 10 and stops from a gap of 15', () => {
  for (const [level, xp, jobXp] of [[10, 14, 7], [11, 10, 5], [15, 10, 5], [16, 0, 0]]) {
    const game = arena([['village_monkey', 806, 610]], { level, jobLevel: 9 });
    defeat(game, 'village_monkey');
    assert.deepEqual([game.state.player.xp, game.state.player.jobXp], [xp, jobXp]);
    assert.equal(game.state.player.gold, 14);
    assert.equal(game.state.player.inventory.monkey_claw, 1);
  }
});

test('Class caps stop Base and Job level-ups and discard excess EXP', () => {
  for (const [classTier, baseCap, jobCap] of [[1, 35, 10], [2, 99, 35], [3, 99, 50]]) {
    const game = fixture({
      quest: { status: 'ready', count: 3 },
      player: { classTier, x: 455, y: 151, level: baseCap - 1, jobLevel: jobCap - 1,
        xp: 47 + (baseCap - 2) * 29, jobXp: 29 + (jobCap - 2) * 17, statPoints: 0 },
    });
    talk(game, 'elder');
    const { player } = game.state;
    assert.deepEqual([player.level, player.jobLevel], [baseCap, jobCap]);
    assert.deepEqual([player.xp, player.jobXp, player.nextXp, player.nextJobXp], [0, 0, 0, 0]);
    assert.equal(player.statPoints, 4);

    const saved = JSON.parse(game.exportSave());
    saved.player.level += 1;
    saved.player.jobLevel += 1;
    saved.player.xp = 1000;
    saved.player.jobXp = 1000;
    const restored = create({ storage: memoryStorage(JSON.stringify(saved)) }).state.player;
    assert.deepEqual([restored.level, restored.jobLevel, restored.xp, restored.jobXp], [baseCap, jobCap, 0, 0]);
    assert.equal(restored.statPoints, 4);
  }
});

test('A capped EXP track does not block gains on the other track', () => {
  for (const [level, jobLevel, xp, jobXp] of [[35, 9, 0, 14], [34, 10, 29, 0], [35, 10, 0, 0]]) {
    const game = fixture({ quest: { status: 'ready', count: 3 }, player: { x: 455, y: 151, level, jobLevel } });
    talk(game, 'elder');
    const { player } = game.state;
    assert.deepEqual([player.level, player.jobLevel, player.xp, player.jobXp], [level, jobLevel, xp, jobXp]);
    assert.equal(player.statPoints, 0);
    assert.equal(player.inventory.bronze_sword, 1);
  }
});

test('TC-MOVE-01 | Direction, speed and stopping for eight movement inputs', () => {
  const directions = [
    ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1],
    ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0], ['nw', -1, -1],
  ];
  const distances = [];
  for (const [dir, dx, dy] of directions) {
    const game = arena([]);
    const { player } = game.state;
    const start = { x: player.x, y: player.y };
    tick(game, 4, { x: dx, y: dy });
    assert.equal(player.dir, dir);
    assert.equal(player.action, 'walk');
    assert.equal(Math.sign(player.x - start.x), dx);
    assert.equal(Math.sign(player.y - start.y), dy);
    distances.push(Math.hypot(player.x - start.x, player.y - start.y));
    const stop = { x: player.x, y: player.y };
    tick(game, 2);
    assert.equal(player.action, 'idle');
    assert.equal(player.dir, dir);
    assert.deepEqual({ x: player.x, y: player.y }, stop);
  }
  assert.ok(distances.every((distance) => Math.abs(distance - distances[0]) < 1e-6), 'Diagonal speed should match cardinal speed');
});

test('TC-MOVE-02 | Walk from the elder to the herbalist with one click', () => {
  const game = create({ storage: memoryStorage() });
  clearVillage(game);
  talk(game, 'vendor');

  for (const step of [1 / 120, 1 / 60, 1 / 30, 0.05, 0.08]) {
    const nearElder = fixture({ quest: villageComplete, player: { x: 462, y: 157 } });
    assert.ok(nearElder.interact('vendor'));
    for (let elapsed = 0; elapsed < 10 && !nearElder.state.interacting; elapsed += step) nearElder.update(step);
    assert.equal(nearElder.state.interacting, 'vendor', 'The route should work with a frame duration of ' + step);
  }
});

test('TC-MOVE-03 | Keyboard collision, click detour and replacing a queued walk', () => {
  const game = fixture({ player: { x: 800, y: 460 } });
  const { state } = game;
  const { player } = state;
  tick(game, 10, { x: 0, y: -1 });
  assert.equal(player.x, 800);
  assert.ok(player.y >= 402 && player.y < 460, 'The obstacle should stop northward movement');
  assert.ok(game.moveTo(800, 220));
  advanceUntil(game, () => !state.destination, 'Click should route around the obstacle');
  assert.ok(Math.hypot(player.x - 800, player.y - 220) < 1);

  assert.ok(game.moveTo(800, 460));
  tick(game, 2, { x: 1, y: 0 });
  assert.equal(state.destination, null);
  const stop = { x: player.x, y: player.y };
  tick(game, 8);
  assert.deepEqual({ x: player.x, y: player.y }, stop);
});

test('TC-MOVE-04 | A skill started while walking resolves against the impact range', () => {
  for (const [dx, shouldHit] of [[1, true], [-1, false]]) {
    const game = arena([['guardian', 853, 610]], trainedPlayer, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
    const { player, enemies: [target] } = game.state;
    const strikes = [];
    game.subscribe((event) => { if (event.type === 'skill-strike') strikes.push(event); });
    assert.ok(game.selectTarget(target.id));
    tick(game, 1, { x: 1, y: 0 });
    assert.equal(player.action, 'walk');
    const { x, mp } = player;
    assert.ok(game.useSkill(1));
    assert.equal(player.mp, mp - 5);
    assert.equal(player.action, 'attack');
    tick(game, 2, { x: dx, y: 0 });
    assert.equal(target.hp, target.maxHp, 'The windup should not deal damage');
    assert.equal(Math.sign(player.x - x), dx);
    tick(game, 3, { x: dx, y: 0 });
    assert.equal(strikes.length, 1);
    assert.equal(Boolean(strikes[0].contact), shouldHit);
    assert.equal(target.hp < target.maxHp, shouldHit);
    assert.ok(game.getSlotSkill(1).remaining > 0);
  }
});

test('TC-MOVE-05 | A connected sword skill faces its target while the player moves', () => {
  for (const [axis, walkingDir, impactDir] of [[-1, 'w', 'e'], [1, 'e', 'w']]) {
    const game = arena([['guardian', 797, 610]], trainedPlayer, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
    const { player, enemies: [target] } = game.state;
    const strikes = [];
    game.subscribe((event) => { if (event.type === 'skill-strike') strikes.push(event); });
    assert.ok(game.selectTarget(target.id));
    assert.ok(game.useSkill(1));
    tick(game, 2, { x: axis, y: 0 });
    assert.equal(player.dir, walkingDir);
    assert.equal(player.attackDir, 'e', 'Windup should keep the initial aim');
    tick(game, 2, { x: axis, y: 0 });
    assert.equal(strikes.length, 1);
    const [strike] = strikes;
    assert.ok(strike.contact, 'The skill should still hit a target in range');
    assert.equal(strike.dir, impactDir, 'The strike should face the target that takes damage');
    assert.equal(player.attackDir, impactDir);
    assert.equal(player.dir, walkingDir);
  }
});

test('TC-GATE-01 | Village bridge unlocks at hand-in and both arches change zones', () => {
  const game = create({ storage: memoryStorage() });
  assert.equal(game.interact('east-gate'), false);
  clearVillage(game);
  assert.ok(game.interact('east-gate'));
  advanceUntil(game, () => game.state.zone === 'ruins', 'Should cross the village bridge and arch');
  assert.ok(game.interact('west-gate'));
  advanceUntil(game, () => game.state.zone === 'village', 'Should enter the village from the ruins');
});

test('TC-QUEST-02 | Ruins quest counts two species independently and creatures respawn', () => {
  const game = fixture({
    zone: 'ruins', quest: villageComplete,
    player: { x: 355, y: 520, level: 20, jobLevel: 20, stats: { STR: 65, VIT: 35, AGI: 11 } },
  });
  const { state } = game;
  assert.equal(state.npcs[0].name, 'พรานหม่อง');
  assert.equal(nearestEnemy(game, 'ghost').name, 'นางไม้');
  assert.equal(nearestEnemy(game, 'guardian').name, 'ยักษ์ศิลา');
  defeat(game, 'ghost');
  assert.equal(state.ruinsQuest.counts.ghost, 0);
  talk(game, 'ruins-guard');
  assert.ok(game.acceptQuest());
  defeat(game, 'monkey');
  assert.equal(state.ruinsQuest.counts.ghost, 0);
  assert.equal(state.ruinsQuest.counts.guardian, 0);
  for (let i = 0; i < 10; i++) defeat(game, 'ghost');
  assert.equal(state.ruinsQuest.counts.ghost, 10);
  assert.equal(state.ruinsQuest.status, 'active');
  defeat(game, 'ghost');
  assert.equal(state.ruinsQuest.counts.ghost, 10);
  for (let i = 0; i < 5; i++) defeat(game, 'guardian');
  assert.equal(state.ruinsQuest.counts.guardian, 5);
  assert.equal(state.ruinsQuest.status, 'ready');
  assert.equal(state.zoneInfo.innerGate.open, false);
});

test('TC-GATE-02 | The ruins arch opens the cemetery after turn-in and allows round trips', () => {
  const game = fixture({
    zone: 'ruins', quest: villageComplete, ruinsQuest: { ...ruinsComplete, status: 'ready' },
    player: { x: 1360, y: 192, level: 10, stats: { VIT: 9 } },
  });
  const { state } = game;
  const gate = state.zoneInfo.innerGate;
  assert.ok(game.moveTo(gate.x, gate.exitY));
  advanceUntil(game, () => !state.destination, 'Approach to locked arch should stop there');
  tick(game, 30, { x: 0, y: -1 });
  assert.ok(state.player.y >= gate.y, 'Cannot walk through a locked arch with the keyboard');
  talk(game, 'ruins-guard');
  assert.equal(state.ruinsQuest.status, 'completed');
  assert.ok(gate.open);
  assert.equal(gate.name, 'ป่าช้าวัดร้าง');
  assert.ok(game.interact(gate.id));
  advanceUntil(game, () => state.zone === 'cemetery', 'Should walk through the arch into the cemetery');
  assert.equal(state.cemeteryHunt.count, 0);
  assert.equal(state.enemies.length, 14);
  assert.ok(!state.enemies.some(enemy => enemy.boss));
  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.zone, 'cemetery');
  assert.ok(restored.interact('cemetery-exit'));
  advanceUntil(restored, () => restored.state.zone === 'ruins', 'Cemetery exit should return to ruins');
  assert.ok(restored.state.zoneInfo.innerGate.open);
  assert.ok(restored.state.player.y > gate.y + gate.reach);
  tick(restored, 26, { x: 0, y: -1 });
  assert.equal(restored.state.zone, 'cemetery', 'Keyboard walking should enter the cemetery');
});

test('TC-CEM-01 | Cemetery progress is saved and the hundredth kill spawns one repeatable Pret boss', () => {
  const game = fixture({
    zone: 'cemetery', quest: villageComplete, ruinsQuest: ruinsComplete, cemeteryKills: 98,
    player: { x: 405, y: 390, level: 30, stats: { STR: 720, VIT: 25 } },
  });
  defeat(game, 'grave_spirit');
  assert.equal(game.state.cemeteryHunt.count, 99);
  assert.ok(!game.state.enemies.some(enemy => enemy.boss));

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.cemeteryHunt.count, 99);
  defeat(restored, 'grave_spirit');
  const { state } = restored;
  assert.equal(state.cemeteryHunt.count, 100);
  assert.equal(state.trackedQuest, state.cemeteryHunt);
  const [boss] = state.enemies.filter(enemy => enemy.boss);
  assert.equal(boss.name, 'ผีเปรต');
  assert.deepEqual([boss.hp, boss.maxHp], [5500, 5500]);
  assert.deepEqual([boss.x, boss.y], [1075, 365]);
  assert.equal(state.enemies.length, 1);

  let now = Date.now();
  sandbox.Date = { now: () => now };
  try {
    const reloaded = create({ storage: memoryStorage(restored.exportSave()) });
    assert.equal(reloaded.state.enemies.length, 1);
    assert.ok(reloaded.state.enemies[0].boss);
    assert.equal(reloaded.state.enemies[0].hp, 5500);
    Object.assign(reloaded.state.player, { x: 980, y: 365 });
    defeat(reloaded, 'pret');
    assert.equal(reloaded.state.cemeteryHunt.count, 0);
    assert.equal(reloaded.state.cemeteryHunt.respawnAt, now + 10000);
    assert.equal(reloaded.state.player.inventory.pret_ash, 1);
    assert.ok(reloaded.state.enemies.every(enemy => enemy.hp === 0));
    now += 9999;
    const waiting = create({ storage: memoryStorage(reloaded.exportSave()) });
    tick(waiting);
    assert.equal(waiting.state.enemies.length, 0);
    assert.equal(waiting.state.cemeteryHunt.respawnAt, now + 1);
    now++;
    tick(waiting);
    assert.equal(waiting.state.enemies.length, 14);
    assert.ok(waiting.state.enemies.every(enemy => !enemy.boss && enemy.hp === enemy.maxHp));
    defeat(waiting, 'grave_spirit');
    assert.equal(waiting.state.cemeteryHunt.count, 1);
  } finally {
    delete sandbox.Date;
  }
});

test('Cemetery round ends on the hundredth kill even during an area strike', () => {
  const game = fixture({
    zone: 'cemetery', quest: villageComplete, ruinsQuest: ruinsComplete, cemeteryKills: 99,
    player: { ...trainedPlayer, x: 405, y: 390, stats: { ...trainedPlayer.stats, STR: 720 } },
    enabledSkills: ['sweep'], skillSlots: ['sweep'],
  });
  const { player, enemies } = game.state;
  Object.assign(enemies[1], { x: 450, y: 405 });
  assert.ok(game.useSkill(1));
  advanceUntil(game, () => game.state.enemies.some(enemy => enemy.boss), 'Sweep should trigger the boss round');
  assert.equal(game.state.enemies.length, 1);
  assert.equal(player.inventory.spirit_dust, 1);
  assert.equal(player.gold, 12 + 13);
});

test('TC-CEM-02 | Pret card uses the boss drop rate of 0.025%', () => {
  const random = sandbox.Math.random;
  try {
    for (const [roll, wins] of [[.000249, true], [.00025, false]]) {
      const game = fixture({
        zone: 'cemetery', quest: villageComplete, ruinsQuest: ruinsComplete, cemeteryKills: 100,
        player: { x: 980, y: 365, classTier: 2, level: 30, jobLevel: 30, stats: { STR: 720 } },
      });
      sandbox.Math.random = () => roll;
      defeat(game, 'pret');
      assert.equal(game.state.player.inventory.pret_card, wins ? 1 : undefined);
      assert.equal(game.state.player.inventory.pret_ash, 1);
      assert.equal(game.state.player.gold, 12 + 120);
      assert.deepEqual([game.state.player.xp, game.state.player.jobXp], [705, 353]);
    }
  } finally {
    sandbox.Math.random = random;
  }
});

test('Pret guarantees one ghost key only when the bag has none', () => {
  for (const startingCount of [0, 1]) {
    const game = fixture({
      zone: 'cemetery', quest: villageComplete, ruinsQuest: ruinsComplete, cemeteryKills: 100,
      player: { x: 980, y: 365, level: 30, stats: { STR: 999 }, inventory: { ghost_key: startingCount } },
    });
    const drops = [];
    game.subscribe(event => { if (event.type === 'loot' && event.itemId === 'ghost_key') drops.push(event.count); });
    defeat(game, 'pret');
    assert.deepEqual(drops, startingCount ? [] : [1]);
    assert.equal(game.state.player.inventory.ghost_key, 1);
    const restored = create({ storage: memoryStorage(game.exportSave()) });
    assert.equal(restored.state.player.inventory.ghost_key, 1);
  }
});

test('The northwestern ruins gate consumes one key, opens the harbor, and stays open across saves', () => {
  const starting = { zone: 'ruins', quest: villageComplete, ruinsQuest: ruinsComplete, player: { x: 320, y: 410 } };
  const locked = fixture(starting);
  const notices = [];
  locked.subscribe(event => { if (event.type === 'notice') notices.push(event.text); });
  assert.ok(locked.interact('harbor-gate'));
  advanceUntil(locked, () => notices.some(text => text.includes('ต้องใช้กุญแจผี')), 'Should reach the locked northwest gate');
  assert.equal(locked.state.zone, 'ruins');
  assert.equal(locked.state.harborUnlocked, false);

  const game = fixture({ ...starting, player: { ...starting.player, inventory: { ghost_key: 1 } } });
  assert.ok(game.interact('harbor-gate'));
  advanceUntil(game, () => game.state.zone === 'harbor', 'Should walk to the gate and enter the harbor');
  assert.equal(game.state.harborUnlocked, true);
  assert.equal(game.state.player.inventory.ghost_key, undefined);

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.zone, 'harbor');
  assert.ok(restored.interact('harbor-exit'));
  advanceUntil(restored, () => restored.state.zone === 'ruins', 'Should return to the ruins');
  assert.ok(restored.interact('harbor-gate'));
  advanceUntil(restored, () => restored.state.zone === 'harbor', 'Should re-enter without another key');
});

test('The cargo summons Chalawan and boarding requires victory and turn-in', () => {
  const game = fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    player: { ...trainedPlayer, x: 995, y: -126, stats: { ...trainedPlayer.stats, STR: 290, VIT: 120 } },
  });
  const notices = [];
  const dialogs = [];
  game.subscribe(event => {
    if (event.type === 'notice') notices.push(event.text);
    if (event.type === 'dialog') dialogs.push(event);
  });
  assert.equal(game.state.trackedQuest, game.state.harborQuest);
  assert.equal(game.interact('harbor-boarding'), false);
  assert.match(notices.at(-1), /เรือเที่ยวสุดท้าย/);
  assert.equal(game.acceptQuest(), false);
  assert.equal(game.state.interactables.some(entity => entity.id === 'harbor-crate'), false);

  talk(game, 'harbor-master');
  assert.equal(dialogs.at(-1).questView, 'offer');
  assert.ok(game.acceptQuest());
  assert.equal(game.acceptQuest(), false);
  assert.equal(game.state.harborQuest.status, 'active');
  assert.ok(game.interact('harbor-crate'));
  advanceUntil(game, () => game.state.harborQuest.status === 'fight', 'Collecting the cargo should start the fight');
  assert.equal(game.state.harborQuest.count, 1);
  assert.equal(game.state.interactables.some(entity => entity.id === 'harbor-crate'), false);
  const [leapingBoss] = game.state.enemies;
  assert.equal(leapingBoss.type, 'chalawan');
  assert.deepEqual([leapingBoss.x, leapingBoss.y], [850, 415]);
  assert.ok(leapingBoss.entrance.waterY < game.state.zoneInfo.bounds.top);
  assert.equal(game.selectTarget(leapingBoss.id), false, 'The boss becomes a target after landing');
  assert.equal(game.attack(), false);
  talk(game, 'harbor-master');
  assert.equal(dialogs.at(-1).questView, 'progress');
  assert.equal(game.state.harborQuest.status, 'fight');

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.harborQuest.status, 'fight');
  assert.equal(restored.state.enemies.length, 1);
  const [boss] = restored.state.enemies;
  advanceUntil(restored, () => !boss.entrance, 'The boss should land after resuming the encounter');
  defeat(restored, 'chalawan');
  assert.equal(restored.state.harborQuest.status, 'ready');
  assert.equal(restored.state.harborQuest.bossDefeated, true);
  assert.equal(restored.state.harborQuest.loot, 'earned');
  assert.equal(restored.state.player.inventory.river_lord_armor, 1);
  assert.equal(restored.state.player.inventory.chalawan_card, 1);
  assert.equal(boss.action, 'death');
  assert.equal(boss.actionDuration, sandbox.window.AyothayaGame.chalawan.collapseDuration);
  tick(restored, 18);
  assert.equal(boss.visible, true, 'Chalawan should remain visible through the collapse');
  tick(restored, 7);
  assert.equal(boss.visible, false, 'The collapsed boss should disappear after the animation');

  const afterBattle = create({ storage: memoryStorage(restored.exportSave()) });
  assert.equal(afterBattle.state.harborQuest.status, 'ready');
  assert.equal(afterBattle.state.enemies.length, 0);
  const rewardDialogs = [];
  afterBattle.subscribe(event => { if (event.type === 'dialog') rewardDialogs.push(event); });
  talk(afterBattle, 'harbor-master');
  assert.equal(rewardDialogs.at(-1).questView, 'reward');
  assert.equal(afterBattle.state.harborQuest.status, 'completed');
  talk(afterBattle, 'harbor-master');
  assert.equal(rewardDialogs.at(-1).questView, undefined);

  const loaded = create({ storage: memoryStorage(afterBattle.exportSave()) });
  assert.equal(loaded.state.harborQuest.status, 'completed');
  assert.equal(loaded.state.harborQuest.count, 1);
  let boardingOffer;
  loaded.subscribe(event => { if (event.type === 'ferry') boardingOffer = event; });
  assert.ok(loaded.interact('harbor-boarding'));
  advanceUntil(loaded, () => Boolean(boardingOffer), 'Should reach the open boarding point');
  assert.equal(boardingOffer.destination, 'ป่าจากน้ำกร่อย');
  assert.equal(boardingOffer.fare, 0);
});

test('The first outbound ferry is free, later fares charge once, and returns are free', () => {
  const legacy = JSON.parse(fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'completed', count: 1, bossDefeated: true, loot: 'earned' },
    player: { x: 995, y: -126, gold: 30, inventory: { town_scroll: 1 } },
  }).exportSave());
  delete legacy.harborQuest.ferryUsed;
  const game = create({ storage: memoryStorage(JSON.stringify(legacy)) });
  let offer;
  game.subscribe(event => { if (event.type === 'ferry') offer = event; });
  assert.equal(game.boardFerry('harbor-boarding'), false);
  talk(game, 'harbor-boarding');
  assert.equal(offer.firstTrip, true);
  assert.equal(offer.fare, 0);
  assert.equal(game.state.zone, 'harbor');
  assert.ok(game.boardFerry('harbor-boarding'));
  assert.equal(game.state.zone, 'nipa');
  assert.equal(game.state.player.gold, 30);
  assert.equal(game.state.harborQuest.ferryUsed, true);

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.zone, 'nipa');
  assert.deepEqual([restored.state.player.x, restored.state.player.y], [...restored.state.zoneInfo.spawn]);
  restored.subscribe(event => { if (event.type === 'ferry') offer = event; });
  talk(restored, 'nipa-boarding');
  assert.equal(offer.fare, 0);
  assert.ok(restored.boardFerry('nipa-boarding'));
  assert.equal(restored.state.zone, 'harbor');
  assert.equal(restored.state.player.gold, 30);

  talk(restored, 'harbor-boarding');
  assert.equal(offer.firstTrip, false);
  assert.equal(offer.fare, 20);
  assert.equal(restored.state.player.gold, 30, 'Opening the ferry dialog does not charge');
  assert.ok(restored.boardFerry('harbor-boarding'));
  assert.equal(restored.state.player.gold, 10);
  assert.equal(restored.boardFerry('harbor-boarding'), false, 'The same ferry confirmation cannot charge twice');
  talk(restored, 'nipa-boarding');
  assert.ok(restored.boardFerry('nipa-boarding'));
  talk(restored, 'harbor-boarding');
  assert.equal(restored.boardFerry('harbor-boarding'), false);
  assert.equal(restored.state.zone, 'harbor');
  assert.equal(restored.state.player.gold, 10);
});

test('Travelers can take the return ferry with zero gold or use a town scroll', () => {
  const saved = fixture({
    zone: 'nipa', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'completed', count: 1, ferryUsed: true },
    player: { gold: 0, inventory: { town_scroll: 1 } },
  }).exportSave();
  const game = create({ storage: memoryStorage(saved) });
  assert.ok(game.useItem('town_scroll'));
  assert.equal(game.state.zone, 'village');
  const returning = create({ storage: memoryStorage(saved) });
  talk(returning, 'nipa-boarding');
  assert.ok(returning.boardFerry('nipa-boarding'));
  assert.equal(returning.state.zone, 'harbor');
  assert.equal(returning.state.player.gold, 0);
});

test('Harbor quest imports restore pickup and fight and preserve boarding for existing completions', () => {
  const changes = {
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    player: { x: 1090, y: 255 },
  };
  const olderSave = JSON.parse(fixture(changes).exportSave());
  delete olderSave.harborQuest;
  const game = create({ storage: memoryStorage(JSON.stringify(olderSave)) });
  assert.equal(game.state.harborQuest.status, 'available');
  assert.equal(game.state.interactables.some(entity => entity.id === 'harbor-crate'), false);
  olderSave.harborQuest = { status: 'active', count: 0 };
  assert.ok(game.importSave(JSON.stringify(olderSave)));
  assert.ok(game.interact(), 'The interaction key should collect the nearby crate');
  assert.equal(game.state.harborQuest.status, 'fight');
  olderSave.harborQuest = { status: 'ready', count: 1 };
  assert.ok(game.importSave(JSON.stringify(olderSave)));
  assert.equal(game.state.harborQuest.status, 'fight', 'An old unsubmitted crate should resume at the fight');
  assert.equal(game.state.enemies.length, 1);
  olderSave.harborQuest.status = 'completed';
  assert.ok(game.importSave(JSON.stringify(olderSave)));
  assert.equal(game.state.harborQuest.status, 'completed');
  assert.equal(game.state.enemies.length, 0);
});

test('Chalawan signals its sweep before hitting and the player can dodge outside the radius', () => {
  const encounter = () => fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'fight', count: 1 }, player: { ...trainedPlayer, x: 940, y: 415 },
  });
  for (const dodge of [false, true]) {
    const game = encounter();
    const [boss] = game.state.enemies;
    let impact = false;
    const hits = [];
    game.subscribe(event => {
      if (event.type === 'boss-slam') impact = true;
      if (event.type === 'damage' && !event.enemy) hits.push(event.value);
    });
    advanceUntil(game, () => boss.action === 'attack' && boss.attackStyle === 'tail-sweep', 'Tail sweep should wind up');
    assert.equal(hits.length, 0);
    if (dodge) tick(game, 21, { x: 1, y: 0 });
    advanceUntil(game, () => impact, 'The telegraphed sweep should resolve');
    assert.equal(hits.length, dodge ? 0 : 1);
    assert.equal(game.state.player.bleed, null, 'The tail sweep does not apply bleed');
  }
});

test('Chalawan applies bleed on each normal bite, refreshing three one-second ticks', () => {
  const game = fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'fight', count: 1 }, player: { ...trainedPlayer, hp: 400, x: 900, y: 415 },
  });
  const { player, enemies: [boss] } = game.state;
  boss.slamCooldown = boss.slam.cooldown;
  const bites = [];
  const ticks = [];
  game.subscribe(event => {
    if (event.type !== 'damage' || event.enemy) return;
    (event.status === 'bleed' ? ticks : bites).push(event.value);
  });
  advanceUntil(game, () => bites.length === 1, 'The first bite should hit');
  assert.equal(player.bleed.ticksLeft, 3);
  assert.equal(player.bleed.damage, Math.round(bites[0] * .15));
  tick(game, 19);
  assert.equal(ticks.length, 0);

  advanceUntil(game, () => bites.length === 2, 'The second bite should refresh bleed');
  assert.equal(ticks.length, 1);
  assert.equal(player.bleed.ticksLeft, 3);
  player.x = 1250;
  tick(game, 19);
  assert.equal(ticks.length, 1);
  advanceUntil(game, () => ticks.length === 4, 'Three refreshed bleed ticks should finish after dodging away');
  assert.deepEqual(ticks, Array(4).fill(Math.round(bites[1] * .15)));
  assert.equal(player.bleed, null);
  tick(game, 25);
  assert.equal(ticks.length, 4);
});

test('Lethal bleed revives the player in town and clears the status', () => {
  const game = fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'fight', count: 1 }, player: { ...trainedPlayer, x: 900, y: 415 },
  });
  const { player, enemies: [boss] } = game.state;
  boss.slamCooldown = boss.slam.cooldown;
  advanceUntil(game, () => Boolean(player.bleed), 'A normal bite should apply bleed');
  player.x = 1250;
  player.hp = 1;
  advanceUntil(game, () => game.state.dead, 'A bleed tick should defeat the player');
  assert.equal(player.hp, 0);
  assert.equal(player.bleed, null);
  tick(game, 65);
  assert.equal(game.state.dead, false);
  assert.equal(game.state.zone, 'village');
  assert.equal(player.hp, player.maxHp);
});

test('A completed harbor save can challenge Chalawan once to earn the new drops', () => {
  const game = fixture({
    zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
    harborQuest: { status: 'completed', count: 1, bossDefeated: true },
    player: { ...trainedPlayer, x: 735, y: -82, stats: { ...trainedPlayer.stats, STR: 290, VIT: 120 } },
  });
  assert.equal(game.startHarborChallenge(), false, 'The challenge starts through the harbor master');
  talk(game, 'harbor-master');
  assert.ok(game.startHarborChallenge());
  assert.equal(game.startHarborChallenge(), false);
  assert.equal(game.state.harborQuest.status, 'completed');

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  const [boss] = restored.state.enemies;
  advanceUntil(restored, () => !boss.entrance, 'The challenge should resume after loading');
  defeat(restored, 'chalawan');
  assert.equal(restored.state.harborQuest.status, 'completed');
  assert.equal(restored.state.harborQuest.loot, 'earned');
  assert.equal(restored.state.player.inventory.river_lord_armor, 1);
  assert.equal(restored.state.player.inventory.chalawan_card, 1);
  const finished = create({ storage: memoryStorage(restored.exportSave()) });
  assert.equal(finished.state.enemies.length, 0);
  talk(finished, 'harbor-master');
  assert.equal(finished.startHarborChallenge(), false);
});

function pretEncounter(gap) {
  return fixture({
    zone: 'cemetery', quest: villageComplete, ruinsQuest: ruinsComplete, cemeteryKills: 100,
    player: { ...trainedPlayer, x: 1075 - gap, y: 365 }, enabledSkills: ['guard', 'interrupt'],
    skillSlots: ['guard', 'interrupt'],
  });
}

test('Pret slam warns before hitting in all directions and stuns exactly 0.08 seconds', () => {
  const game = pretEncounter(95);
  const { player } = game.state;
  const boss = game.state.enemies.find(enemy => enemy.boss);
  const hits = [];
  game.subscribe(event => { if (event.type === 'damage' && !event.enemy) hits.push(event); });
  advanceUntil(game, () => boss.action === 'attack' && boss.attackStyle === 'pret-slam', 'Slam should start');
  assert.ok(game.selectTarget(boss.id));
  assert.ok(game.attack());
  advanceUntil(game, () => boss.hp < boss.maxHp, 'An ordinary hit should land during the windup');
  assert.equal(boss.action, 'attack', 'The ordinary hit should not cancel the slam');
  assert.equal(hits.length, 0);
  game.selectTarget(null);
  player.x = boss.x + 160;
  advanceUntil(game, () => hits.length === 1, 'Slam should hit at the edge behind the boss', 25);
  assert.equal(hits[0].value, 96);
  assert.equal(hits[0].stunTime, .08);
  assert.equal(player.stunTime, .08);
  assert.equal(game.attack(), false);
  assert.equal(game.useSkill(1), false);
  const x = player.x;
  tick(game, 1, { x: 1, y: 0 });
  assert.equal(player.x, x);
  game.update(.03, { x: 1, y: 0 });
  assert.equal(player.x, x);
  assert.equal(player.stunTime, 0);
  assert.ok(game.useSkill(1));
  tick(game, 1, { x: 1, y: 0 });
  assert.ok(player.x > x);
});

test('Pret slam misses after the player leaves its warning ring and can be interrupted', () => {
  const dodge = pretEncounter(90);
  const boss = dodge.state.enemies.find(enemy => enemy.boss);
  let impacts = 0;
  dodge.subscribe(event => { if (event.type === 'boss-slam') impacts++; });
  const { player } = dodge.state;
  const hp = player.hp;
  advanceUntil(dodge, () => boss.action === 'attack' && boss.attackStyle === 'pret-slam', 'Slam should start');
  tick(dodge, 12, { x: -1, y: 0 });
  assert.ok(boss.x - player.x > 160);
  advanceUntil(dodge, () => impacts === 1, 'Slam should still resolve after the dodge', 20);
  assert.equal(player.hp, hp);
  assert.equal(player.stunTime, 0);

  const interrupt = pretEncounter(40);
  const target = interrupt.state.enemies.find(enemy => enemy.boss);
  advanceUntil(interrupt, () => target.action === 'attack' && target.attackStyle === 'pret-slam', 'Slam should start');
  assert.ok(interrupt.selectTarget(target.id));
  assert.ok(interrupt.useSkill(2));
  advanceUntil(interrupt, () => target.action === 'hit', 'Interrupt should stop the windup');
  assert.equal(interrupt.state.player.stunTime, 0);
});

test('Pret basic hit rolls a 0.2% chance and blocks only 0.01 seconds of movement', () => {
  const random = sandbox.Math.random;
  try {
    for (const [roll, stunTime] of [[.001999, .01], [.002, 0]]) {
      const game = pretEncounter(35);
      const { player } = game.state;
      const boss = game.state.enemies.find(enemy => enemy.boss);
      boss.slamCooldown = boss.slam.cooldown;
      sandbox.Math.random = () => roll;
      let hit;
      game.subscribe(event => { if (event.type === 'damage' && !event.enemy) hit = event; });
      advanceUntil(game, () => Boolean(hit), 'Pret should hit with a basic attack');
      assert.equal(hit.value, 96);
      assert.equal(hit.stunTime, stunTime);
      assert.equal(player.stunTime, stunTime);
      const x = player.x;
      game.update(.016, { x: -1, y: 0 });
      const moveSpeed = 165 + (player.stats.AGI - 1) * 4;
      assert.ok(Math.abs(x - player.x - (.016 - stunTime) * moveSpeed) < 1e-8);
      assert.equal(player.stunTime, 0);
    }
  } finally {
    sandbox.Math.random = random;
  }
});

test('TC-ITEM-01 | Merchant restricts purchases, sells the scroll for 20 and buys loot', () => {
  const game = fixture({ player: { level: 10 } });
  assert.equal(game.buyItem('town_scroll'), false);
  clearVillage(game);
  assert.ok(game.moveTo(795, 230));
  advanceUntil(game, () => !game.state.destination, 'Walk via the courtyard to the market');
  talk(game, 'vendor');
  const { player } = game.state;
  const gold = player.gold;
  assert.ok(game.buyItem('town_scroll'));
  assert.equal(player.gold, gold - 20);
  assert.equal(player.inventory.town_scroll, 1);
  assert.ok(game.equipItem('bronze_sword'));
  assert.equal(game.sellItem('bronze_sword'), false, 'Equipped sword cannot be sold');
  assert.ok(game.sellItem('monkey_claw'));
  assert.equal(player.inventory.monkey_claw, 2);
  assert.equal(player.gold, gold - 20 + 3);
  const broke = fixture({ player: { x: 886, y: 110, gold: 19 } });
  assert.equal(broke.buyItem('town_scroll'), false);
  assert.equal(broke.state.player.gold, 19);
});

test('Merchant counts completed trades and sells an item stack at its per-item price', () => {
  const legacy = {
    ...initialSave,
    player: { ...initialSave.player, x: 886, y: 110, level: 10, gold: 40,
      inventory: { potion: 3, elixir: 2, bronze_sword: 2 }, equipment: { weapon: 'bronze_sword' } },
  };
  delete legacy.player.tradeCounts;
  const game = create({ storage: memoryStorage(JSON.stringify(legacy)) });
  const { inventory, tradeCounts } = game.state.player;
  assert.equal(tradeCounts.bought.potion, undefined);
  assert.equal(tradeCounts.sold.potion, undefined);
  assert.ok(game.buyItem('potion'));
  assert.equal(tradeCounts.bought.potion, 1);
  assert.equal(game.sellableItemCount('potion'), 4);
  assert.equal(game.sellableItemCount('bronze_sword'), 0);
  assert.equal(game.sellItem('bronze_sword', 2), false);
  for (const count of [0, -1, 1.5, 5]) assert.equal(game.sellItem('potion', count), false);
  assert.equal(tradeCounts.sold.potion, undefined);
  assert.ok(game.sellItem('potion'));
  assert.equal(tradeCounts.sold.potion, 1);
  assert.ok(game.sellItem('potion', game.sellableItemCount('potion')));
  assert.equal(tradeCounts.sold.potion, 4);
  assert.equal(inventory.potion, undefined);
  assert.equal(inventory.elixir, 2);
  assert.equal(inventory.bronze_sword, 2);
  assert.equal(game.state.player.gold, 36);

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.player.tradeCounts.bought.potion, 1);
  assert.equal(restored.state.player.tradeCounts.sold.potion, 4);
  assert.ok(restored.resetCharacter());
  assert.equal(restored.state.player.tradeCounts.bought.potion, undefined);
  assert.equal(restored.state.player.tradeCounts.sold.potion, undefined);
});

test('TC-ITEM-02 | Equip items and cards, swap shortcuts and keep bindings through saves', () => {
  const game = fixture({ player: { level: 10, hp: 180, inventory: { potion: 1, elixir: 2, bronze_sword: 1, monkey_card: 1, monkey_claw: 2 } } });
  const { player } = game.state;
  assert.equal(game.assignItemSlot(1, 'monkey_claw'), false);
  assert.equal(game.assignItemSlot(3, 'potion'), false);
  assert.ok(game.assignItemSlot(1, 'potion'));
  assert.ok(game.assignItemSlot(2, 'elixir'));
  assert.ok(game.assignItemSlot(2, 'potion'));
  assert.equal(game.state.itemSlots.join(','), 'elixir,potion');
  assert.ok(game.useItem('potion'));
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.inventory.potion, undefined);
  assert.equal(game.useItem('potion'), false);
  const attack = player.attack;
  assert.ok(game.equipItem('bronze_sword'));
  assert.ok(game.equipItem('monkey_card'));
  assert.equal(player.attack, attack + 6 + 3);
  assert.equal(player.maxHp, 202);
  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.itemSlots.join(','), 'elixir,potion');
  assert.equal(restored.state.player.equipment.card, 'monkey_card');
  assert.ok(restored.assignItemSlot(2, null));
  assert.equal(restored.state.itemSlots[1], null);
});

test('TC-ITEM-03 | Return scroll uses one item, turns Auto off and preserves quest progress', () => {
  const game = fixture({
    zone: 'ruins', quest: villageComplete, ruinsQuest: { status: 'active', counts: { ghost: 2, guardian: 1 } },
    player: { x: 410, y: 520, inventory: { town_scroll: 2 } },
  });
  game.setAuto(true);
  assert.ok(game.useItem('town_scroll'));
  const { state } = game;
  assert.equal(state.zone, 'village');
  assert.deepEqual([state.player.x, state.player.y], [770, 570]);
  assert.equal(state.player.inventory.town_scroll, 1);
  assert.equal(state.auto.enabled, false);
  assert.equal(state.ruinsQuest.counts.ghost, 2);
  assert.ok(game.useItem('town_scroll'));
  assert.equal(game.useItem('town_scroll'), false);
});

test('Card slots unlock cumulatively by class and apply each equipped copy', () => {
  for (const [classTier, capacity] of [[1, 2], [2, 3], [3, 4]]) {
    const game = fixture({ player: { classTier, inventory: { monkey_card: 4 } } });
    const { player } = game.state;
    const { attack, maxHp } = player;
    for (const [index, slot] of game.cardSlots.entries()) {
      assert.equal(game.equipItem('monkey_card', slot.id), index < capacity);
    }
    assert.equal(game.equipItem('monkey_card', 'weapon'), false);
    assert.equal(game.equippedItemCount('monkey_card'), capacity);
    assert.equal(player.attack, attack + 3 * capacity);
    assert.equal(player.maxHp, maxHp + 12 * capacity);
    assert.equal(game.discardableItemCount('monkey_card'), 4 - capacity);
    const restored = create({ storage: memoryStorage(game.exportSave()) });
    assert.equal(restored.state.player.classTier, classTier);
    assert.equal(restored.equippedItemCount('monkey_card'), capacity);
    assert.ok(restored.unequipCard('card2'));
    assert.equal(restored.state.player.inventory.monkey_card, 4);
    assert.equal(restored.state.player.maxHp, maxHp + 12 * (capacity - 1));
    assert.equal(restored.state.player.attack, attack + 3 * (capacity - 1));
  }
});

test('Old saves keep their first card and extra slots cannot exceed owned copies', () => {
  const saved = {
    ...initialSave,
    player: { ...initialSave.player, inventory: { monkey_card: 1, pret_card: 1 },
      equipment: { card: 'monkey_card', card2: 'monkey_card', card3: 'pret_card' } },
  };
  delete saved.player.classTier;
  const game = create({ storage: memoryStorage(JSON.stringify(saved)) });
  assert.equal(game.state.player.classTier, 1);
  assert.equal(game.state.player.equipment.card, 'monkey_card');
  assert.equal(game.state.player.equipment.card2, undefined);
  assert.equal(game.state.player.equipment.card3, undefined);
  assert.equal(game.equipItem('monkey_card', 'card2'), false);
  assert.ok(game.equipItem('pret_card', 'card2'));
  assert.equal(game.discardItem('pret_card', 1), false);
  assert.ok(game.unequipCard('card2'));
  assert.ok(game.discardItem('pret_card', 1));
});

test('River Lord armor adds 50 max HP and blocks 5 damage until removed', () => {
  const game = monsterEncounter('guardian', 30, { player: { inventory: { river_lord_armor: 1 } } });
  const { player } = game.state;
  const before = game.combatStats();
  assert.ok(game.equipItem('river_lord_armor'));
  assert.equal(player.equipment.armor, 'river_lord_armor');
  assert.equal(game.combatStats().maxHp, before.maxHp + 50);
  assert.equal(game.combatStats().defense, before.defense + 5);

  const loaded = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(loaded.state.player.equipment.armor, 'river_lord_armor');
  assert.equal(loaded.combatStats().defense, before.defense + 5);

  const hits = [];
  game.subscribe(event => { if (event.type === 'damage' && !event.enemy) hits.push(event.value); });
  advanceUntil(game, () => hits.length === 1, 'The guardian should hit the armored player');
  assert.ok(game.unequipArmor());
  assert.equal(player.equipment.armor, undefined);
  assert.equal(game.combatStats().maxHp, before.maxHp);
  advanceUntil(game, () => hits.length === 2, 'The guardian should hit again after removing armor');
  assert.deepEqual(hits, [12, 17]);
});

test('Bronze sword requires Base Lv. 10, including equipment saved before the requirement', () => {
  const equipment = { weapon: 'bronze_sword' };
  const inventory = { bronze_sword: 1 };
  const underLevel = fixture({ player: { level: 9, equipment, inventory } });
  assert.equal(underLevel.state.player.inventory.bronze_sword, 1);
  assert.equal(underLevel.state.player.equipment.weapon, 'rusty_sword');
  assert.equal(underLevel.equipItem('bronze_sword'), false);
  const eligible = fixture({ player: { level: 10, inventory } });
  assert.ok(eligible.equipItem('bronze_sword'));
  const restored = create({ storage: memoryStorage(eligible.exportSave()) });
  assert.equal(restored.state.player.equipment.weapon, 'bronze_sword');
});

test('Discard removes the confirmed quantity, preserves equipped copies and clears empty shortcuts', () => {
  const game = fixture({
    player: { level: 10, inventory: { potion: 3, bronze_sword: 2 }, equipment: { weapon: 'bronze_sword' } },
    itemSlots: ['potion', 'bronze_sword'],
  });
  const { inventory, equipment } = game.state.player;
  for (const quantity of [0, -1, 1.5, 4]) assert.equal(game.discardItem('potion', quantity), false);
  assert.equal(game.discardItem('missing', 1), false);
  assert.equal(game.discardItem('rusty_sword', 1), false);
  assert.equal(game.discardItem('bronze_sword', 2), false);
  assert.ok(game.discardItem('bronze_sword', 1));
  assert.equal(inventory.bronze_sword, 1);
  assert.equal(equipment.weapon, 'bronze_sword');
  assert.equal(game.state.itemSlots[1], 'bronze_sword');

  assert.ok(game.discardItem('potion', 2));
  assert.equal(inventory.potion, 1);
  assert.equal(game.state.itemSlots[0], 'potion');
  assert.ok(game.discardItem('potion', 1));
  assert.equal(game.discardItem('potion', 1), false);
  assert.equal(game.state.itemSlots[0], null);

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.player.inventory.potion, undefined);
  assert.equal(restored.state.itemSlots[0], null);
  assert.equal(restored.state.player.equipment.weapon, 'bronze_sword');
});

test('A monster card rolls once per kill at a fixed 0.01% even with high LUK', () => {
  const random = sandbox.Math.random;
  try {
    for (const [roll, dropped] of [[.000099, true], [.0001, false], [.000249, false]]) {
      const game = arena([['village_monkey', 806, 610]], { level: 10, stats: { LUK: 99 } });
      const loot = [];
      game.subscribe(event => { if (event.type === 'loot') loot.push(event.itemId); });
      sandbox.Math.random = () => roll;
      defeat(game, 'village_monkey');
      assert.deepEqual(loot, dropped ? ['monkey_claw', 'monkey_card'] : ['monkey_claw']);
      assert.equal(game.state.player.inventory.monkey_card, dropped ? 1 : undefined);
    }
  } finally {
    sandbox.Math.random = random;
  }
});

test('TC-STATS-01 | Draft points can be discarded and confirmation updates derived stats', () => {
  const game = fixture({ player: { ...trainedPlayer, stats: { ...trainedPlayer.stats, STR: 2 } } });
  const { player } = game.state;
  const attack = player.attack;
  assert.equal(game.statAllocation({ STR: 3 }).remaining, 11);
  assert.equal(game.statAllocation({ STR: -1 }), null);
  assert.equal(game.applyStatPoints({ STR: 15 }), false);
  assert.equal(player.stats.STR, 2);
  assert.ok(game.applyStatPoints({ STR: 3, DEX: 1 }));
  assert.equal(player.attack, attack + 9);
  assert.equal(player.statPoints, 10);
});

test('TC-SKILL-01 | Requirements, activating Active and Passive skills, slot swap and clear', () => {
  const game = fixture({ player: { ...trainedPlayer, stats: { ...trainedPlayer.stats, STR: 2 } } });
  assert.equal(game.enableSkill('sweep'), false);
  assert.equal(game.enableSkill('mastery'), false);
  assert.equal(game.assignSkill(1, 'heavy'), false);
  assert.ok(game.applyStatPoints({ STR: 3 }));
  assert.ok(game.enableSkill('mastery'));
  assert.ok(game.isSkillEnabled(game.state.passiveSkills.find((skill) => skill.id === 'mastery')));
  assert.ok(game.enableSkill('sweep'));
  assert.ok(game.enableSkill('heavy'));
  assert.ok(game.assignSkill(1, 'sweep'));
  assert.ok(game.assignSkill(2, 'heavy'));
  assert.ok(game.assignSkill(1, 'heavy'));
  assert.equal(game.state.skillSlots.slice(0, 2).join(','), 'heavy,sweep');
  game.clearSkillSlots();
  assert.ok(game.state.skillSlots.every((id) => id === null));
  assert.ok(game.isSkillEnabled(game.state.skills.find((skill) => skill.id === 'sweep')));
});

test('TC-SKILL-02 | Mastery, Precision and Discipline affect damage, critical chance or mana', () => {
  function firstDamage(game) {
    let damage;
    game.subscribe((event) => {
      if (event.type === 'damage' && event.enemy && damage === undefined) damage = event.value;
    });
    game.selectTarget(game.state.enemies[0].id);
    assert.ok(game.attack());
    advanceUntil(game, () => damage !== undefined, 'Basic attack should hit');
    return damage;
  }

  const enemies = [['guardian', 806, 610]];
  const baseline = arena(enemies, trainedPlayer);
  const baselineDamage = firstDamage(baseline);
  const mastery = arena(enemies, trainedPlayer);
  assert.ok(mastery.enableSkill('mastery'));
  assert.ok(firstDamage(mastery) > baselineDamage);
  const lucky = arena(enemies, { ...trainedPlayer, stats: { ...trainedPlayer.stats, LUK: 90 } });
  assert.equal(lucky.combatStats().critical, .8);
  assert.ok(lucky.enableSkill('precision'));
  assert.equal(lucky.combatStats().critical, .8);
  assert.ok(firstDamage(lucky) > baselineDamage, 'A roll of .65 should critically hit at the 80% cap');
  const passives = arena([], { ...trainedPlayer, mp: 0 });
  const critical = passives.combatStats().critical;
  assert.ok(passives.enableSkill('precision'));
  assert.ok(Math.abs(passives.combatStats().critical - critical - 0.08) < 1e-9);
  assert.ok(passives.enableSkill('discipline'));
  tick(passives, 40);
  assert.equal(passives.state.player.mp, 2);
});

test('Active skills and the bleed passive unlock exactly at their required Base levels', () => {
  const requirements = {
    heavy: 10, sweep: 15, guard: 15, heal: 15, dash: 20, thrust: 25, interrupt: 30, bleed: 30,
  };
  for (const [id, level] of Object.entries(requirements)) {
    const locked = fixture({ player: { ...trainedPlayer, level: level - 1 }, enabledSkills: [id], skillSlots: [id] });
    const skill = [...locked.state.skills, ...locked.state.passiveSkills].find(entry => entry.id === id);
    assert.equal(locked.enableSkill(id), false, id);
    assert.equal(locked.isSkillEnabled(skill), false, id);
    assert.equal(locked.useSkill(1), false, id);
    const eligible = fixture({ player: { ...trainedPlayer, level } });
    assert.ok(eligible.enableSkill(id), id);
  }
});

test('A bound skill reports its missing requirements or activation step', () => {
  const locked = fixture({ player: { level: 4, jobLevel: 1 }, skillSlots: ['heavy', 'sweep'] });
  const notices = [];
  const recordNotice = ({ type, text }) => { if (type === 'notice') notices.push(text); };
  locked.subscribe(recordNotice);
  assert.equal(locked.useSkill(1), false);
  assert.equal(locked.useSkill(2), false);
  assert.deepEqual(notices, [
    'ฟันหนัก ต้องการ Base Lv. 10',
    'กวาดดาบ ต้องการ Base Lv. 15 · Job Lv. 2 · STR 5',
  ]);

  const ready = arena([['guardian', 825, 610]], { level: 10 }, { skillSlots: ['heavy'] });
  ready.subscribe(recordNotice);
  assert.equal(ready.useSkill(1), false);
  assert.equal(notices.at(-1), 'กด K แล้วเปิดใช้งาน ฟันหนัก');
  assert.ok(ready.enableSkill('heavy'));
  const [enemy] = ready.state.enemies;
  assert.ok(ready.selectTarget(enemy.id));
  assert.ok(ready.useSkill(1));
  tick(ready, 9);
  assert.ok(enemy.hp < enemy.maxHp);
});

test('Bleed passive rolls a 20% chance on a direct hit and produces three damage ticks', () => {
  const random = sandbox.Math.random;
  try {
    for (const [enabled, roll, expectedTicks] of [[false, .15, 0], [true, .20, 0], [true, .19, 3]]) {
      const game = fixture({ zone: 'training', player: { level: 30, x: 580, y: 505 } });
      const [dummy] = game.state.enemies;
      const events = [];
      game.subscribe(event => { if (event.type === 'damage' && event.enemy) events.push(event); });
      if (enabled) assert.ok(game.enableSkill('bleed'));
      sandbox.Math.random = () => roll;
      assert.ok(game.selectTarget(dummy.id));
      assert.ok(game.attack());
      advanceUntil(game, () => events.length === 1, 'Basic attack should hit once');
      game.selectTarget(null);
      tick(game, 64);
      assert.equal(events.length, expectedTicks + 1);
      assert.ok(events.slice(1).every(event => event.status === 'bleed' && event.value === Math.round(events[0].value * .15)));
      assert.ok(!dummy.bleed);
    }
  } finally {
    sandbox.Math.random = random;
  }
});

test('TC-COMBAT-01 | Basic attack starts at 100 units and approaches from outside range', () => {
  const edge = fixture({ zone: 'training', player: { x: 540, y: 505 } });
  const [dummy] = edge.state.enemies;
  assert.equal(edge.basicAttackRange, 100);
  assert.ok(edge.selectTarget(dummy.id));
  assert.ok(edge.attack());
  tick(edge);
  assert.equal(edge.state.player.action, 'attack');
  assert.equal(edge.state.player.x, 540);
  advanceUntil(edge, () => dummy.hp < dummy.maxHp, 'Basic attack should hit from 100 units');

  const far = fixture({ zone: 'training', player: { x: 539, y: 505 } });
  const [farDummy] = far.state.enemies;
  assert.ok(far.selectTarget(farDummy.id));
  assert.ok(far.attack());
  tick(far);
  assert.ok(far.state.player.x > 539);
  assert.equal(farDummy.hp, farDummy.maxHp);
  advanceUntil(far, () => farDummy.hp < farDummy.maxHp, 'Basic attack should connect after approaching');
});

test('TC-COMBAT-02 | All seven active skills, mana, cooldown, ranges and effects', () => {
  for (const id of ['heavy', 'sweep', 'guard', 'heal', 'dash', 'thrust', 'interrupt']) {
    const distance = id === 'dash' ? 150 : ['heavy', 'thrust'].includes(id) ? 90 : 31;
    const game = arena([['guardian', 775 + distance, 610], ['ghost', 775 + distance, 650]], trainedPlayer,
      { enabledSkills: [id], skillSlots: [id] });
    const { player, enemies: [first, second] } = game.state;
    const events = [];
    game.subscribe((event) => events.push(event));
    const { hp, mp } = player;
    game.selectTarget(first.id);
    assert.ok(game.useSkill(1), id);
    assert.equal(player.mp, mp - game.getSlotSkill(1).cost, id + ' mana');
    assert.equal(game.useSkill(1), false, id + ' cooldown');
    tick(game, 9);
    assert.ok(events.some((event) => event.type === 'skill' && event.skill === id), id + ' cast');
    if (id === 'guard') assert.ok(player.guardTime > 5);
    else if (id === 'heal') assert.ok(player.hp > hp);
    else {
      assert.ok(first.hp < first.maxHp, id + ' should damage the target');
      const strike = events.find((event) => event.type === 'skill-strike' && event.skill === id);
      assert.ok(strike?.contact);
      if (id === 'sweep') assert.ok(second.hp < second.maxHp);
      if (id === 'dash') {
        assert.equal(strike.arrival.x, strike.contact.x + 30);
        assert.equal(player.x, strike.arrival.x);
      }
      if (id === 'interrupt') assert.ok(first.slowTime > 3.5);
    }
  }
  const far = arena([['guardian', 866, 610]], trainedPlayer, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
  far.selectTarget(far.state.enemies[0].id);
  assert.equal(far.useSkill(1), false);
  assert.equal(far.state.skills[0].remaining, 0);
  const emptyMana = arena([['guardian', 796, 610]], { ...trainedPlayer, mp: 0 }, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
  emptyMana.selectTarget(emptyMana.state.enemies[0].id);
  assert.equal(emptyMana.useSkill(1), false);

  const sweep = arena([['guardian', 899, 610], ['guardian', 775, 485], ['guardian', 901, 610]], trainedPlayer,
    { enabledSkills: ['sweep'], skillSlots: ['sweep'] });
  const [inside, edge, outside] = sweep.state.enemies;
  assert.ok(sweep.useSkill(1));
  tick(sweep, 9);
  assert.ok(inside.hp < inside.maxHp, 'Sweep should hit at 124 units');
  assert.ok(edge.hp < edge.maxHp, 'Sweep should hit at 125 units');
  assert.equal(outside.hp, outside.maxHp, 'Sweep should miss at 126 units');
});

test('Thrust applies three bleed ticks and a second thrust refreshes the timer', () => {
  const game = fixture({
    zone: 'training', trainingCooldowns: false, enabledSkills: ['thrust'], skillSlots: ['thrust'],
    player: { ...trainedPlayer, x: 550, y: 505 },
  });
  const [target] = game.state.enemies;
  const strikes = [];
  const ticks = [];
  game.subscribe(event => {
    if (event.type !== 'damage') return;
    if (event.skill === 'thrust') strikes.push(event.value);
    if (event.status === 'bleed') ticks.push(event.value);
  });

  assert.ok(game.selectTarget(target.id));
  assert.ok(game.useSkill(1));
  advanceUntil(game, () => strikes.length === 1, 'Thrust should hit the target');
  assert.ok(target.bleed);
  tick(game, 19);
  assert.equal(ticks.length, 0);
  advanceUntil(game, () => ticks.length === 1, 'Bleed should tick after one second', 3);
  assert.equal(ticks[0], Math.round(strikes[0] * .15));

  tick(game, 8);
  assert.ok(game.useSkill(1));
  advanceUntil(game, () => strikes.length === 2, 'A second thrust should hit');
  tick(game, 19);
  assert.equal(ticks.length, 1, 'The second thrust should replace the previous timer');
  advanceUntil(game, () => ticks.length === 4, 'Refreshed bleed should tick three times', 45);
  assert.equal(target.bleed, null);
  tick(game, 21);
  assert.deepEqual(ticks.slice(1), Array(3).fill(Math.round(strikes[1] * .15)));
  assert.equal(target.maxHp - target.hp, [...strikes, ...ticks].reduce((total, value) => total + value, 0));
});

test('Chalawan cards add ATK and apply one 15% bonus to hits and ticks on bleeding enemies', () => {
  const fight = {
    enabledSkills: ['thrust'], skillSlots: ['thrust'],
    player: { ...trainedPlayer, inventory: { chalawan_card: 2 } },
  };
  const encounters = [
    arena([['guardian', 825, 610]], fight.player, { enabledSkills: fight.enabledSkills, skillSlots: fight.skillSlots }),
    fixture({ ...fight, zone: 'harbor', harborUnlocked: true, quest: villageComplete, ruinsQuest: ruinsComplete,
      harborQuest: { status: 'fight', count: 1 }, player: { ...fight.player, x: 900, y: 415 } }),
  ];
  for (const game of encounters) {
    const { player, enemies: [target] } = game.state;
    target.hp = target.maxHp = 1000;
    const originalAttack = player.attack;
    assert.ok(game.equipItem('chalawan_card'));
    assert.equal(player.attack, originalAttack + 5);
    assert.ok(game.equipItem('chalawan_card', 'card2'));
    assert.equal(player.attack, originalAttack + 10);
    advanceUntil(game, () => !target.entrance, 'Enemy should be targetable');
    const damage = [];
    const ticks = [];
    game.subscribe(event => {
      if (event.type !== 'damage' || !event.enemy) return;
      (event.status === 'bleed' ? ticks : damage).push(event.value);
    });
    const power = player.attack * (.92 + .65 * .16) + player.stats.DEX - 1;
    assert.ok(game.selectTarget(target.id));
    assert.ok(game.useSkill(1));
    advanceUntil(game, () => damage.length === 1, 'Thrust should start bleeding');
    assert.equal(damage[0], Math.round(power * 1.45), 'The opening hit has no bleeding bonus');
    assert.ok(game.attack());
    advanceUntil(game, () => damage.length === 2, 'The follow-up attacks a bleeding enemy');
    assert.equal(damage[1], Math.round(power * 1.15));
    game.selectTarget(null);
    advanceUntil(game, () => ticks.length === 1, 'Bleed should tick with the equipped card');
    assert.equal(ticks[0], Math.round(Math.round(damage[0] * .15) * 1.15));
    assert.ok(game.unequipCard('card'));
    assert.ok(game.unequipCard('card2'));
    advanceUntil(game, () => ticks.length === 2, 'The existing bleed continues when the card is removed');
    assert.equal(ticks[1], Math.round(damage[0] * .15));
  }
});

test('A lethal bleed counts toward quests and awards loot once', () => {
  const game = arena([['village_monkey', 865, 610]], { level: 25, stats: { DEX: 3 } },
    { quest: { status: 'active', count: 0 }, enabledSkills: ['thrust'], skillSlots: ['thrust'] });
  const { player, enemies: [target], quest } = game.state;
  target.hp = target.maxHp = 100;
  const gold = player.gold;
  assert.ok(game.selectTarget(target.id));
  assert.ok(game.useSkill(1));
  advanceUntil(game, () => Boolean(target.bleed), 'The initial hit should leave the target alive');
  assert.ok(target.hp > 0);
  advanceUntil(game, () => target.hp === 0, 'Bleed should finish the target');
  assert.equal(target.bleed, null);
  tick(game, 65);
  assert.equal(quest.count, 1);
  assert.equal(player.gold, gold + 2);
  assert.equal(player.inventory.monkey_claw, 1);
});

test('Dash lands before an obstacle behind the target and still deals damage', () => {
  const zone = { ...village, obstacles: [{ x: 936, y: 570, w: 1, h: 90 }], enemies: [['guardian', 925, 610]] };
  const game = fixture({ enabledSkills: ['dash'], skillSlots: ['dash'], player: { ...trainedPlayer, x: 775, y: 610 } },
    { zones: { village: zone } });
  const [target] = game.state.enemies;
  assert.ok(game.selectTarget(target.id));
  assert.ok(game.useSkill(1));
  tick(game, 9);
  assert.equal(game.state.player.x, 926);
  assert.equal(game.state.player.y, 610);
  assert.ok(target.hp < target.maxHp);
});

test('TC-COMBAT-03 | Death returns the player to town with progress intact', () => {
  const game = fixture({
    zone: 'ruins', quest: villageComplete, ruinsQuest: { status: 'active', counts: { ghost: 3, guardian: 2 } },
    player: { x: 1330, y: 380, hp: 1 },
  });
  const { state } = game;
  game.setAuto(true);
  for (let i = 0; !state.dead && i < 60; i++) tick(game, 1, undefined, true);
  assert.ok(state.dead);
  assert.equal(state.auto.enabled, false);
  assert.equal(JSON.parse(game.exportSave()).zone, 'village');
  tick(game, 62);
  assert.equal(state.dead, false);
  assert.equal(state.zone, 'village');
  assert.equal(state.player.hp, state.player.maxHp);
  assert.equal(state.ruinsQuest.counts.ghost, 3);
  assert.equal(state.ruinsQuest.counts.guardian, 2);
});

test('TC-MOB-01 | Idle wandering, village retaliation and ruins proximity aggro', () => {
  for (const type of ['village_monkey', 'monkey', 'ghost', 'guardian']) {
    const game = monsterEncounter(type, 190);
    const [enemy] = game.state.enemies;
    assert.equal(enemy.action, 'idle');
    advanceUntil(game, () => enemy.action === 'walk', type + ' should wander', 80);
    assert.equal(enemy.aggro, false);
    assert.ok(Math.hypot(enemy.x - enemy.origin.x, enemy.y - enemy.origin.y) > 0);
    advanceUntil(game, () => enemy.action === 'idle', type + ' should settle after wandering', 80);
  }

  const villageGame = monsterEncounter('village_monkey', 42);
  const [monkey] = villageGame.state.enemies;
  tick(villageGame, 12);
  assert.equal(monkey.aggro, false);
  assert.equal(villageGame.state.player.hp, villageGame.state.player.maxHp);
  provokeMonkey(villageGame);
  advanceUntil(villageGame, () => monkey.action === 'walk', 'Village monkey should chase after being struck');
  assert.equal(monkey.dir, 'w');

  for (const type of ['monkey', 'ghost', 'guardian']) {
    const game = monsterEncounter(type, 80);
    const [enemy] = game.state.enemies;
    tick(game);
    assert.ok(enemy.aggro, type + ' should aggro by proximity');
    assert.equal(enemy.action, 'walk');
    assert.equal(enemy.dir, 'w');
    assert.ok(enemy.x < enemy.origin.x);
  }
});

test('TC-MOB-02 | Monster attack windup, damage, cooldown and dodging before impact', () => {
  for (const [type, expectedDamage] of [['village_monkey', 4], ['monkey', 7], ['ghost', 10], ['guardian', 17]]) {
    const game = monsterEncounter(type, 28);
    const { player, enemies: [enemy] } = game.state;
    const hits = [];
    game.subscribe((event) => { if (event.type === 'damage' && !event.enemy) hits.push(event.value); });
    if (type === 'village_monkey') provokeMonkey(game);
    advanceUntil(game, () => enemy.action === 'attack', type + ' should start an attack');
    const hp = player.hp;
    tick(game);
    assert.equal(player.hp, hp, 'The windup should not deal damage');
    advanceUntil(game, () => hits.length > 0, type + ' should hit in range', 10);
    assert.equal(player.hp, hp - expectedDamage);
    tick(game, 10);
    assert.deepEqual(hits, [expectedDamage], 'The same swing should hit once');
    advanceUntil(game, () => hits.length === 2, type + ' should attack again after cooldown', 35);
  }

  const dodge = monsterEncounter('guardian', 28);
  const { player, enemies: [guardian] } = dodge.state;
  advanceUntil(dodge, () => guardian.action === 'attack', 'Guardian should wind up within reach');
  const hp = player.hp;
  tick(dodge, 6, { x: -1, y: 0 });
  assert.ok(guardian.x - player.x > 47);
  assert.equal(player.hp, hp, 'Stepping out of reach should dodge the swing');
});

test('TC-MOB-03 | Monsters stop chasing at a wall or after the player escapes', () => {
  const blocked = monsterEncounter('guardian', 75, {
    obstacles: [{ x: 1298, y: 345, w: 20, h: 70 }],
    player: trainedPlayer, enabledSkills: ['thrust'], skillSlots: ['thrust'],
  });
  const { player, enemies: [guard] } = blocked.state;
  assert.ok(blocked.selectTarget(guard.id));
  const mp = player.mp;
  assert.equal(blocked.useSkill(1), false, 'A wall should block the skill even within its range');
  assert.equal(player.mp, mp);
  tick(blocked, 14, { x: 1, y: 0 });
  assert.equal(guard.aggro, false);
  assert.equal(guard.x, guard.origin.x);

  const fleeing = monsterEncounter('guardian', 75);
  const [enemy] = fleeing.state.enemies;
  tick(fleeing);
  assert.ok(enemy.aggro);
  assert.ok(fleeing.moveTo(900, enemy.y));
  advanceUntil(fleeing, () => !enemy.aggro, 'Guardian should stop pursuing an escaped player');
  advanceUntil(fleeing, () => Math.hypot(enemy.x - enemy.origin.x, enemy.y - enemy.origin.y) < 1,
    'Guardian should return to its spawn');
});

test('TC-MOB-04 | Interrupt cancels an attack, and a defeated monster disappears and respawns', () => {
  const game = monsterEncounter('guardian', 28, {
    player: trainedPlayer, enabledSkills: ['interrupt'], skillSlots: ['interrupt'],
  });
  const [guardian] = game.state.enemies;
  const hits = [];
  game.subscribe((event) => { if (event.type === 'damage' && !event.enemy) hits.push(event.value); });
  advanceUntil(game, () => guardian.action === 'attack', 'Guardian should start an attack');
  assert.ok(game.selectTarget(guardian.id));
  assert.ok(game.useSkill(1));
  tick(game, 3);
  assert.equal(guardian.action, 'hit');
  tick(game, 5);
  assert.deepEqual(hits, [], 'The interrupted attack should not damage the player');

  defeat(game, 'guardian');
  assert.equal(guardian.action, 'death');
  assert.equal(guardian.aggro, false);
  assert.equal(guardian.slowTime, 0);
  tick(game, 12);
  assert.equal(guardian.visible, false);
  advanceUntil(game, () => guardian.hp === guardian.maxHp, 'Guardian should respawn with full health', 210);
  assert.equal(guardian.action, 'idle');
  assert.equal(guardian.visible, true);
  assert.deepEqual([guardian.x, guardian.y], [guardian.origin.x, guardian.origin.y]);
});

test('Interrupt reduces monster movement, attack recovery and windup for four seconds', () => {
  const game = arena([['guardian', 835, 610]], trainedPlayer, { enabledSkills: ['interrupt'], skillSlots: ['interrupt'] });
  const [guardian] = game.state.enemies;
  assert.ok(game.selectTarget(guardian.id));
  assert.ok(game.useSkill(1));
  advanceUntil(game, () => guardian.slowTime > 0, 'Interrupt should apply slow');
  const slowedAt = guardian.slowTime;
  advanceUntil(game, () => guardian.moving, 'The slowed enemy should still chase');
  const x = guardian.x;
  const cooldown = guardian.cooldown;
  tick(game);
  assert.ok(Math.abs(x - guardian.x - 63 * .05 * .7) < 1e-6);
  assert.ok(Math.abs(cooldown - guardian.cooldown - .05 * .7) < 1e-6);
  advanceUntil(game, () => guardian.action === 'attack', 'Slowed monster should start an attack');
  const windup = guardian.actionTime;
  tick(game);
  assert.ok(Math.abs(windup - guardian.actionTime - .05 * .7) < 1e-6);
  assert.ok(slowedAt > 3.9);
  advanceUntil(game, () => guardian.slowTime === 0, 'Slow should expire', 85);
  advanceUntil(game, () => guardian.action === 'attack', 'Monster should attack again');
  const normalWindup = guardian.actionTime;
  tick(game);
  assert.ok(Math.abs(normalWindup - guardian.actionTime - .05) < 1e-6);
});

test('TC-AUTO-01 | Near, medium and far search–range boundaries', () => {
  for (const [range, distance] of [['near', 150], ['medium', 275], ['far', 450]]) {
    for (const offset of [0, 1]) {
      const game = arena([['village_monkey', 775 + distance + offset, 610]]);
      game.configureAuto({ range });
      game.setAuto(true);
      tick(game);
      assert.equal(Boolean(game.state.targetId), offset === 0, range + ' boundary');
    }
  }
});

test('TC-AUTO-02 | Independent HP and mana thresholds, equality and disabling at zero', () => {
  const equal = arena([], { hp: 50, mp: 20 });
  equal.setAuto(true);
  tick(equal);
  assert.equal(equal.state.player.inventory.potion, 3);
  assert.equal(equal.state.player.inventory.elixir, 1);
  const below = arena([], { hp: 49, mp: 19 });
  below.setAuto(true);
  tick(below);
  assert.equal(below.state.player.inventory.potion, 2);
  assert.equal(below.state.player.inventory.elixir, 1);
  assert.equal(below.state.player.hp, 94);
  tick(below, 21);
  assert.equal(below.state.player.inventory.elixir, undefined);
  assert.equal(below.state.player.mp, 47);
  const off = arena([], { hp: 2, mp: 0 });
  off.configureAuto({ hpBelow: 0, mpBelow: 0 });
  off.setAuto(true);
  tick(off, 25);
  assert.equal(off.state.player.inventory.potion, 3);
  assert.equal(off.state.player.inventory.elixir, 1);
});

test('TC-AUTO-03 | Skill priority, pause, basic attack fallback and manual movement override', () => {
  const game = arena([['guardian', 806, 610]], trainedPlayer, { enabledSkills: ['heavy', 'sweep'] });
  const used = [];
  game.subscribe((event) => { if (event.type === 'skill') used.push(event.skill); });
  game.configureAuto({ skillIds: ['sweep', null, 'heavy', 'heavy'] });
  assert.equal(game.state.auto.skillIds.join(','), 'sweep,,heavy,,');
  game.setAuto(true);
  tick(game, 1, undefined, true);
  assert.equal(used.length, 0);
  assert.equal(game.state.targetId, null);
  tick(game);
  assert.equal(used[0], 'sweep');
  tick(game, 1, { x: -1, y: 0 });
  assert.equal(game.state.auto.enabled, false);
  const fallback = arena([['guardian', 803, 610]], { mp: 0 }, { enabledSkills: [] });
  fallback.configureAuto({ skillIds: ['heavy'] });
  fallback.setAuto(true);
  tick(fallback, 12);
  assert.ok(fallback.state.enemies[0].hp < fallback.state.enemies[0].maxHp);
});

test('Auto can practice Interrupt on stationary training dummies', () => {
  const game = fixture({ zone: 'training', enabledSkills: ['interrupt'], player: { ...trainedPlayer, x: 580, y: 505 } });
  let contact;
  game.subscribe(event => {
    if (event.type === 'skill-strike' && event.skill === 'interrupt') contact = event.contact;
  });
  game.configureAuto({ skillIds: ['interrupt'] });
  game.setAuto(true);
  advanceUntil(game, () => Boolean(contact), 'Auto should land Interrupt on a training dummy');
  assert.equal(contact.x, game.state.enemies[0].x);
  assert.equal(contact.y, game.state.enemies[0].y);
});

test('TC-SAVE-01 | Legacy and damaged saves, and incomplete ruins progress', () => {
  const oldSave = {
    version: 1, zone: 'ruins', quest: villageComplete,
    player: { x: 355, y: 520, level: 9, stats: { STR: 8 } },
  };
  const legacy = create({ storage: memoryStorage(JSON.stringify(oldSave)) });
  assert.equal(legacy.state.zone, 'ruins');
  assert.equal(legacy.state.ruinsQuest.status, 'available');
  assert.equal(legacy.state.zoneInfo.innerGate.open, false);
  const partial = fixture({ ...oldSave, ruinsQuest: { status: 'active', counts: { ghost: 10, guardian: 4 } } });
  assert.equal(partial.state.ruinsQuest.counts.guardian, 4);
  assert.equal(partial.state.ruinsQuest.status, 'active');
  assert.equal(partial.importSave('{"version":1,'), false);
  assert.equal(partial.importSave('{"version":5}'), false);
  assert.equal(partial.state.player.level, 9);
  const store = memoryStorage('invalid JSON');
  const fresh = create({ storage: store });
  assert.equal(fresh.state.zone, 'village');
  assert.ok(fresh.save());
  assert.equal(create({ storage: store }).state.player.level, 1);
});

test('TC-SAVE-02 | Resetting levels and starting a new character have different scopes', () => {
  const game = fixture({
    zone: 'ruins', quest: villageComplete, ruinsQuest: ruinsComplete,
    enabledSkills: ['sweep'], skillSlots: ['sweep'],
    player: { ...trainedPlayer, inventory: { potion: 2, bronze_sword: 1 }, equipment: { weapon: 'bronze_sword' } },
  });
  const { state } = game;
  assert.equal(state.player.equipment.weapon, 'bronze_sword');
  game.resetLevels();
  assert.deepEqual([state.player.level, state.player.jobLevel, state.player.xp, state.player.jobXp], [1, 1, 0, 0]);
  assert.equal(state.player.stats.STR, 8);
  assert.equal(state.player.inventory.bronze_sword, 1);
  assert.equal(state.player.equipment.weapon, 'rusty_sword');
  assert.equal(game.useSkill(1), false);
  assert.equal(state.quest.status, 'completed');
  assert.ok(game.resetCharacter());
  assert.equal(state.zone, 'village');
  assert.equal(state.quest.status, 'available');
  assert.equal(state.ruinsQuest.status, 'available');
  assert.equal(state.player.stats.STR, 1);
  assert.equal(state.player.inventory.potion, 3);
  assert.equal(state.player.inventory.bronze_sword, undefined);
  assert.equal(state.enabledSkills.size, 0);
});

test('TC-TRAIN-01 | The village gate leads to three stationary dummies and back', () => {
  const game = create({ storage: memoryStorage() });
  const { state } = game;
  assert.ok(game.interact('training-gate'));
  advanceUntil(game, () => state.zone === 'training', 'A new character should reach the yard');
  assert.equal(state.enemies.length, 3);
  assert.ok(state.enemies.every(dummy => dummy.type === 'dummy' && dummy.hp === 999999 && dummy.maxHp === 999999));
  const [dummy] = state.enemies;
  assert.ok(game.selectTarget(dummy.id));
  assert.ok(game.attack());
  advanceUntil(game, () => dummy.hp < dummy.maxHp, 'Basic attack should record damage');
  game.selectTarget(null);
  const progress = { gold: state.player.gold, xp: state.player.xp, jobXp: state.player.jobXp, inventory: { ...state.player.inventory } };
  dummy.hp = 1;
  assert.ok(game.selectTarget(dummy.id));
  assert.ok(game.attack());
  advanceUntil(game, () => dummy.hp === 999999, 'A defeated dummy should refill immediately');
  game.selectTarget(null);
  tick(game, 55);
  assert.equal(state.player.hp, state.player.maxHp);
  assert.deepEqual([dummy.x, dummy.y], [dummy.origin.x, dummy.origin.y]);
  assert.equal(dummy.action, 'idle');
  assert.equal(dummy.aggro, false);
  assert.deepEqual({ gold: state.player.gold, xp: state.player.xp, jobXp: state.player.jobXp, inventory: { ...state.player.inventory } }, progress);
  assert.equal(state.quest.count, 0);
  assert.ok(game.interact('training-exit'));
  advanceUntil(game, () => state.zone === 'village', 'The return gate should lead to the village');
  assert.deepEqual([state.player.x, state.player.y], [164, 270]);
});

test('TC-TRAIN-02 | Cooldown toggle and saved preference apply only in the yard', () => {
  const game = fixture({ zone: 'training', enabledSkills: ['heavy'], skillSlots: ['heavy'], player: { level: 10, x: 608, y: 505 } });
  const { state } = game;
  assert.equal(state.zone, 'training');
  assert.equal(game.skillCooldownsEnabled(), true);
  assert.ok(game.selectTarget(state.enemies[0].id));
  const mp = state.player.mp;
  assert.ok(game.useSkill(1));
  tick(game, 10);
  assert.equal(game.useSkill(1), false);
  assert.ok(game.setTrainingCooldowns(false));
  assert.ok(game.useSkill(1));
  tick(game, 10);
  assert.ok(game.useSkill(1));
  assert.equal(state.player.mp, mp - 15);

  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.equal(restored.state.zone, 'training');
  assert.equal(restored.skillCooldownsEnabled(), false);
  assert.ok(restored.setTrainingCooldowns(true));
  assert.ok(restored.selectTarget(restored.state.enemies[0].id));
  assert.ok(restored.useSkill(1));
  tick(restored, 10);
  assert.equal(restored.useSkill(1), false);

  assert.ok(game.interact('training-exit'));
  advanceUntil(game, () => state.zone === 'village', 'Return to the village with training cooldowns off');
  assert.equal(game.skillCooldownsEnabled(), true);
  assert.equal(game.setTrainingCooldowns(false), false);
  assert.ok(game.moveTo(752, 470));
  advanceUntil(game, () => !state.destination, 'Walk into skill range of a village monster');
  assert.ok(game.selectTarget(state.enemies[0].id));
  assert.ok(game.useSkill(1));
  tick(game, 10);
  assert.equal(game.useSkill(1), false);
});

test('TC-TRAIN-03 | Mana toggle applies to manual and automatic skills in the yard', () => {
  const game = fixture({
    zone: 'training', trainingCooldowns: false, trainingManaCosts: undefined,
    enabledSkills: ['heavy'], skillSlots: ['heavy'], player: { level: 10, x: 608, y: 505, mp: 0 },
  });
  const { state } = game;
  assert.equal(game.skillManaCostsEnabled(), true);
  assert.ok(game.selectTarget(state.enemies[0].id));
  assert.equal(game.useSkill(1), false);
  assert.ok(game.setTrainingManaCosts(false));
  assert.ok(game.useSkill(1));
  assert.equal(state.player.mp, 0);
  tick(game, 10);
  assert.ok(game.setTrainingManaCosts(true));
  assert.equal(game.useSkill(1), false);
  assert.ok(game.setTrainingManaCosts(false));

  const saved = game.exportSave();
  const auto = create({ storage: memoryStorage(saved) });
  assert.equal(auto.skillManaCostsEnabled(), false);
  const casts = [];
  auto.subscribe(event => { if (event.type === 'skill') casts.push(event.skill); });
  auto.configureAuto({ skillIds: ['heavy'], mpBelow: 100 });
  auto.setAuto(true);
  tick(auto);
  assert.deepEqual(casts, ['heavy']);
  assert.equal(auto.state.player.mp, 0);
  assert.equal(auto.state.player.inventory.elixir, 1);

  assert.ok(game.interact('training-exit'));
  advanceUntil(game, () => state.zone === 'village', 'Return with the training mana rule switched off');
  assert.equal(game.skillManaCostsEnabled(), true);
  assert.equal(game.setTrainingManaCosts(false), false);
  assert.ok(game.moveTo(752, 470));
  advanceUntil(game, () => !state.destination, 'Move in range of a village monster');
  assert.ok(game.selectTarget(state.enemies[0].id));
  state.player.mp = 4;
  assert.equal(game.useSkill(1), false);
  state.player.mp = 5;
  assert.ok(game.useSkill(1));
  assert.equal(state.player.mp, 0);
});

test('TC-TRAIN-04 | Each dummy refills five seconds after its latest hit', () => {
  const game = fixture({
    zone: 'training', trainingCooldowns: false, enabledSkills: ['heavy'], skillSlots: ['heavy'],
    player: { level: 10 },
  });
  const { player, enemies: [first, second, third] } = game.state;
  const frame = 1 / 16;
  function advance(frames) {
    for (let count = 0; count < frames; count++) game.update(frame);
  }
  function hit(dummy) {
    Object.assign(player, { x: dummy.x - 32, y: dummy.y });
    const previousHp = dummy.hp;
    assert.ok(game.selectTarget(dummy.id));
    assert.ok(game.useSkill(1));
    for (let count = 0; count < 12 && dummy.hp === previousHp; count++) advance(1);
    assert.ok(dummy.hp < previousHp);
  }

  hit(first);
  advance(24);
  hit(second);
  advance(20);
  hit(first);
  advance(79);
  assert.ok(first.hp < first.maxHp);
  assert.equal(second.hp, second.maxHp);
  assert.equal(third.hp, third.maxHp);
  advance(1);
  assert.equal(first.hp, first.maxHp);
});
