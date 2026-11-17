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
  level: 9, jobLevel: 8, hp: 142, mp: 120, statPoints: 14,
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
  assert.equal(state.player.gold, 12 + 3 * 5 + 35);
  assert.equal(state.player.level, 2);
  assert.equal(state.player.jobLevel, 2);
  const gold = state.player.gold;
  talk(game, 'elder');
  assert.equal(state.player.gold, gold, 'The quest reward should be granted once');
  assert.equal(state.player.inventory.bronze_sword, 1);
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

test('TC-GATE-02 | Ruins arch blocks movement until turn-in and stays open after reload', () => {
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
  assert.ok(game.interact(gate.id));
  advanceUntil(game, () => state.player.y === gate.exitY, 'Should walk through the open arch');
  const restored = create({ storage: memoryStorage(game.exportSave()) });
  assert.ok(restored.state.zoneInfo.innerGate.open);
  assert.equal(restored.state.player.y, gate.exitY);
});

test('TC-ITEM-01 | Merchant restricts purchases, sells the scroll for 20 and buys loot', () => {
  const game = create({ storage: memoryStorage() });
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
  assert.equal(player.gold, gold - 20 + 7);
  const broke = fixture({ player: { x: 886, y: 110, gold: 19 } });
  assert.equal(broke.buyItem('town_scroll'), false);
  assert.equal(broke.state.player.gold, 19);
});

test('TC-ITEM-02 | Equip items and cards, swap shortcuts and keep bindings through saves', () => {
  const game = fixture({ player: { hp: 80, inventory: { potion: 1, elixir: 2, bronze_sword: 1, monkey_card: 1, monkey_claw: 2 } } });
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
  assert.equal(player.maxHp, 112);
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

test('TC-SKILL-02 | All three Passive skills affect damage, critical chance or mana', () => {
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
  const mastery = arena(enemies, trainedPlayer);
  assert.ok(mastery.enableSkill('mastery'));
  assert.ok(firstDamage(mastery) > firstDamage(baseline));
  const passives = arena([], { ...trainedPlayer, mp: 0 });
  const critical = passives.combatStats().critical;
  assert.ok(passives.enableSkill('precision'));
  assert.ok(Math.abs(passives.combatStats().critical - critical - 0.08) < 1e-9);
  assert.ok(passives.enableSkill('discipline'));
  tick(passives, 40);
  assert.equal(passives.state.player.mp, 2);
});

test('TC-COMBAT-02 | All seven active skills, mana, cooldown, ranges and effects', () => {
  for (const id of ['heavy', 'sweep', 'guard', 'heal', 'dash', 'thrust', 'interrupt']) {
    const distance = id === 'dash' ? 150 : ['heavy', 'thrust'].includes(id) ? 90 : 31;
    const game = arena([['guardian', 775 + distance, 610], ['ghost', 775 + distance, 650]], trainedPlayer,
      { enabledSkills: [id], skillSlots: [id] });
    const { player, enemies: [first, second] } = game.state;
    const events = [];
    game.subscribe((event) => events.push(event));
    const { x, hp, mp } = player;
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
      assert.ok(events.some((event) => event.type === 'skill-strike' && event.skill === id && event.contact));
      if (id === 'sweep') assert.ok(second.hp < second.maxHp);
      if (id === 'dash') assert.ok(player.x - x > 100);
      if (id === 'interrupt') assert.ok(first.cooldown > 0.8);
    }
  }
  const far = arena([['guardian', 866, 610]], trainedPlayer, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
  far.selectTarget(far.state.enemies[0].id);
  assert.equal(far.useSkill(1), false);
  assert.equal(far.state.skills[0].remaining, 0);
  const emptyMana = arena([['guardian', 796, 610]], { ...trainedPlayer, mp: 0 }, { enabledSkills: ['heavy'], skillSlots: ['heavy'] });
  emptyMana.selectTarget(emptyMana.state.enemies[0].id);
  assert.equal(emptyMana.useSkill(1), false);
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
  tick(game, 12);
  assert.equal(guardian.visible, false);
  advanceUntil(game, () => guardian.hp === guardian.maxHp, 'Guardian should respawn with full health', 210);
  assert.equal(guardian.action, 'idle');
  assert.equal(guardian.visible, true);
  assert.deepEqual([guardian.x, guardian.y], [guardian.origin.x, guardian.origin.y]);
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
  game.resetLevels();
  assert.deepEqual([state.player.level, state.player.jobLevel, state.player.xp, state.player.jobXp], [1, 1, 0, 0]);
  assert.equal(state.player.stats.STR, 8);
  assert.equal(state.player.inventory.bronze_sword, 1);
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
  const game = fixture({ zone: 'training', enabledSkills: ['heavy'], skillSlots: ['heavy'], player: { x: 608, y: 505 } });
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
    enabledSkills: ['heavy'], skillSlots: ['heavy'], player: { x: 608, y: 505, mp: 0 },
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
