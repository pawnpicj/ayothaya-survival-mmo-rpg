(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("world");
  const minimap = $("minimap");
  const dialog = $("dialog");
  const bagContext = $("bag-context");
  const bagDiscardButton = bagContext.querySelector("button");
  const autoToggle = $("auto-toggle");
  const questTracker = $("quest-tracker");
  const scoutingPanels = {
    minimap: { button: $("minimap-toggle"), content: $("minimap-panel") },
    questTracker: { button: $("quest-tracker-toggle"), content: questTracker },
  };
  const itemShortcuts = [...document.querySelectorAll('[data-action="item-shortcut"]')];
  const itemSlotNames = ["ช่องบน", "ช่องล่าง"];
  const itemImages = {
    town_scroll: "town-scroll",
    river_lord_armor: "river-lord-armor",
    chalawan_card: "chalawan-card",
    pret_ash: "pret-ash",
  };
  const game = window.AyothayaGame.create();
  const { state } = game;
  const world = window.AyothayaWorld.create(canvas);
  const skillAudio = window.AyothayaSkillAudio?.create();
  const displayKey = "ayothaya-display-settings";
  const displayQualities = new Map([
    ["economy", { label: "ประหยัด", scale: .7 }],
    ["standard", { label: "มาตรฐาน", scale: 1 }],
    ["sharp", { label: "คมชัด", scale: 1.25 }],
  ]);
  const displaySettings = { quality: "standard", brightness: 100, minimap: true, questTracker: true };
  const brightnessRange = { min: 70, max: 130 };
  try {
    const saved = JSON.parse(localStorage.getItem(displayKey));
    if (displayQualities.has(saved?.quality)) displaySettings.quality = saved.quality;
    if (Number.isFinite(saved?.brightness)) {
      displaySettings.brightness = Math.max(brightnessRange.min, Math.min(brightnessRange.max, saved.brightness));
    }
    for (const id of Object.keys(scoutingPanels)) {
      if (typeof saved?.[id] === "boolean") displaySettings[id] = saved[id];
    }
  } catch {}
  applyDisplaySettings();
  Object.keys(scoutingPanels).forEach(renderScoutingPanel);
  const keys = new Set();
  const skillButtons = [...document.querySelectorAll("[data-skill]")];
  const hits = [];
  let panel = null;
  let ferryOffer = null;
  let dialogue = null;
  let toastTimeout;
  let peerCount = 0;
  let connected = false;
  let peers = [];
  let portraitTime = 0;
  let lastRender = 0;
  let skillTab = "active";
  let selectedSlot = 1;
  let activeDrag = null;
  let suppressDragClick = false;
  let selectedItem = null;
  let sortInventory = false;
  let cardsOnly = false;
  let equipmentTab = "gear";
  let selectedCardSlot = "card";
  let pendingStats = {};

  const text = (id, value) => {
    const element = $(id);
    const next = String(value ?? "");
    if (element && element.textContent !== next) element.textContent = next;
  };
  const setHidden = (id, hidden) => { if ($(id)) $(id).hidden = hidden; };
  const fill = (id, value, max) => {
    const element = $(id);
    const width = (100 * Math.max(0, Math.min(1, value / (max || 1)))) + "%";
    if (element && element.style.width !== width) element.style.width = width;
  };
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const fmt = (value) => Math.floor(value ?? 0).toLocaleString("en-US");
  const skillRangeText = ({ strike }) => strike ? (strike.area ? "รัศมี " : "ระยะ ") + strike.range + " หน่วย" : "";
  const target = () => state.enemies.find((enemy) => enemy.id === state.targetId && enemy.hp > 0);
  const questActionLabels = { available: "รับเควสต์", ready: "สำเร็จเควสต์" };
  const attributes = {
    STR: "พลังโจมตี", AGI: "ความคล่องตัว", VIT: "พลังชีวิต",
    INT: "พลังวิชา", DEX: "ความแม่นยำ", LUK: "โชค",
  };
  const itemIcons = { potion: "leaf", elixir: "flame", sword: "blade", seed: "leaf",
    claw: "swords", dust: "star", card: "quest", seal: "shield", scroll: "quest", key: "key" };
  const inventoryArt = [
    "potion", "elixir", "rusty_sword", "bronze_sword", "tamarind_core",
    "monkey_claw", "spirit_dust", "tamarind_card", "monkey_card", "guardian_seal",
  ];
  const interfaceIcon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  const skillArtwork = (id) => '<svg class="skill-art" aria-hidden="true"><use href="#i-skill-' + id + '"></use></svg>';

  function renderHUD() {
    const { player, trackedQuest: quest, zoneInfo } = state;
    const training = zoneInfo.id === "training";
    const cooldowns = game.skillCooldownsEnabled();
    const manaCosts = game.skillManaCostsEnabled();
    setHidden("training-controls", !training);
    setHidden("quest-widget", training || zoneInfo.id === "nipa");
    if (training) {
      for (const [id, enabled] of [["training-cooldown", cooldowns], ["training-mana", manaCosts]]) {
        const button = $(id);
        const pressed = String(enabled);
        if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
        text(id + "-state", enabled ? "เปิด" : "ปิด");
      }
    }
    text("zone-name", zoneInfo.name);
    text("zone-range", zoneInfo.levels);
    text("map-coords", Math.round(player.x / 10) + ", " + Math.round(player.y / 10));
    text("gold", fmt(player.gold));
    renderItemShortcuts(player);
    text("quest-title", quest.title);
    const questStatus = quest.loot === "challenge" ? "fight" : quest.status;
    const multiGoalProgress = quest.goals && quest.status === "active";
    text("quest-objective", multiGoalProgress ? game.questProgress(quest) : quest.objective);
    const questAction = questActionLabels[quest.status];
    const questOwner = quest.npcId ?? "";
    const respawnSeconds = quest.respawnAt ? Math.max(0, Math.ceil((quest.respawnAt - Date.now()) / 1000)) : null;
    text("quest-count", respawnSeconds !== null ? respawnSeconds + " วิ." :
      questAction ?? (questStatus === "completed" ? "ส่งแล้ว" : questStatus === "fight" ? "บอส" :
        multiGoalProgress ? "" : game.questProgress(quest)));
    if (questTracker.dataset.status !== questStatus || questTracker.dataset.owner !== questOwner) {
      questTracker.dataset.status = questStatus;
      questTracker.dataset.owner = questOwner;
      questTracker.dataset.action = questAction ? "quest-owner" : "quests";
      const owner = state.npcs.find(npc => npc.id === quest.npcId);
      const detail = questAction && owner ? questAction + " · เดินไปหา" + owner.name : "เปิดสมุดภารกิจ";
      questTracker.setAttribute("aria-label", detail);
      questTracker.title = detail;
    }
    text("player-name", player.name || "นักเดินทาง");
    text("player-job", player.job || "ดาบอโยธยา");
    setHidden("player-bleed", !player.bleed);
    text("base-level", fmt(player.level));
    text("job-level", fmt(player.jobLevel));
    text("hp-text", fmt(player.hp) + " / " + fmt(player.maxHp));
    text("sp-text", fmt(player.mp) + " / " + fmt(player.maxMp));
    text("xp-text", player.nextXp === 0 ? "MAX" : fmt(player.xp) + " / " + fmt(player.nextXp));
    fill("hp-fill", player.hp, player.maxHp);
    fill("sp-fill", player.mp, player.maxMp);
    fill("xp-fill", player.nextXp === 0 ? 1 : player.xp, player.nextXp || 1);
    text($("network-label") ? "network-label" : "network", connected ? "LAN · " + (peerCount + 1) + " คน" : "เล่นคนเดียว");
    $("network")?.classList.toggle("connected", connected);
    const autoActive = String(state.auto.enabled);
    if (autoToggle.getAttribute("aria-pressed") !== autoActive) autoToggle.setAttribute("aria-pressed", autoActive);
    text("auto-state", state.auto.enabled ? "เปิด" : "ปิด");

    const enemy = target();
    setHidden("target", !enemy);
    setHidden("target-bleed", !enemy?.bleed);
    setHidden("target-slow", !enemy?.slowTime);
    setHidden("training-range", !training || !enemy);
    if (enemy) {
      text("target-name", (enemy.boss ? "บอส " : "") + enemy.name);
      text("target-level", enemy.level ? "Lv. " + enemy.level : "");
      text("target-hp-text", fmt(enemy.hp) + " / " + fmt(enemy.maxHp));
      fill("target-hp-fill", enemy.hp, enemy.maxHp);
      if (training) {
        text("training-target-distance", game.distanceTo(enemy).toFixed(1));
        text("training-attack-range", game.basicAttackRange);
      }
    }

    skillButtons.forEach((button, index) => {
      const slot = index + 1;
      const skill = game.getSlotSkill(slot);
      const remaining = cooldowns ? (skill?.remaining ?? 0) : 0;
      const name = skill?.name ?? "ว่าง";
      const inactive = Boolean(skill && !game.isSkillEnabled(skill));
      const locked = inactive && !game.isSkillUnlocked(skill);
      const status = locked ? "ยังไม่ปลดล็อก" : inactive ? "รอเปิดใช้งาน" : "";
      const binding = skill ? skill.id + ":" + status : "";
      if (button.dataset.binding !== binding) {
        button.dataset.binding = binding;
        button.className = "skill panel style-" + (skill?.icon ?? "empty");
        const skillLabel = status ? name + " · " + status : name;
        const requirements = locked ? "\nต้องการ " + game.skillRequirements(skill)
          .map(({ label, minimum }) => label + " " + minimum).join(" · ") : "";
        button.title = skill
          ? [skillLabel, skill.cost + " มานา", skillRangeText(skill)].filter(Boolean).join(" · ") + "\n" + skill.description + requirements
          : "ช่องว่าง · คลิกเพื่อจัดสกิล";
        button.setAttribute("aria-label", "ช่อง " + slot + " " + (skill ? skillLabel : "ว่าง เปิดหน้าต่างสกิล"));
        button.querySelector("use").setAttribute("href", "#i-skill-" + (skill?.id ?? "empty"));
        button.querySelector(".skill-label").textContent = name;
        if (skill && !inactive) button.dataset.dragSkill = skill.id;
        else delete button.dataset.dragSkill;
      }
      button.classList.toggle("skill-inactive", inactive);
      button.classList.toggle("on-cooldown", remaining > 0);
      button.classList.toggle("low-mana", Boolean(manaCosts && skill && skill.cost > player.mp));
      const shade = button.querySelector(".skill-cooldown");
      shade.style.setProperty("--cooldown", (remaining ? 100 * remaining / skill.cooldown : 0) + "%");
      shade.textContent = remaining ? remaining.toFixed(remaining < 1 ? 1 : 0) : "";
      shade.hidden = remaining <= 0;
    });

    const nearby = [...state.npcs, ...state.interactables]
      .find(entity => Math.hypot(player.x - entity.x, player.y - entity.y) < 120);
    const showHint = nearby && !dialog.open;
    setHidden("interaction-hint", !showHint);
    if (showHint) {
      const label = $("interaction-name") || $("interaction-hint");
      const action = nearby.type === "harbor-crate" ? "เก็บ" :
        nearby.type === "ferry" ? (state.harborQuest.status === "completed" ? "ขึ้นเรือ" : "ตรวจ") : "คุย";
      if (label) label.textContent = nearby.name + " · F " + action;
    }
  }

  function notify(message) {
    if (!message) return;
    text("toast", message);
    setHidden("toast", false);
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => setHidden("toast", true), 2900);
  }

  function itemArtwork(id) {
    if (Object.hasOwn(itemImages, id)) {
      return '<img class="item-image-art" src="assets/' + itemImages[id] + '.png" alt="" draggable="false">';
    }
    const cell = inventoryArt.indexOf(id);
    if (cell < 0) return interfaceIcon(itemIcons[state.items[id]?.icon] ?? "bag");
    return '<span class="bag-item-art" aria-hidden="true" style="background-position:' +
      (cell % 5) * 25 + '% ' + Math.floor(cell / 5) * 100 + '%"></span>';
  }

  function renderItemShortcuts(player) {
    itemShortcuts.forEach((button, index) => {
      const id = state.itemSlots[index];
      const item = state.items[id];
      const count = player.inventory[id] ?? 0;
      const label = itemSlotNames[index] + (item ? " · " + item.name + " ×" + fmt(count) : " · ว่าง");
      const quantity = button.querySelector(".item-shortcut-count");
      if (button.dataset.item !== (id ?? "")) {
        button.dataset.item = id ?? "";
        button.querySelector(".item-shortcut-icon").innerHTML = item ? itemArtwork(id) : "";
      }
      if (button.getAttribute("aria-label") !== label) {
        button.setAttribute("aria-label", label);
        button.title = count ? label : label + " · เปิดกระเป๋าเพื่อกำหนดช่อง";
      }
      const countText = fmt(count);
      if (quantity.textContent !== countText) quantity.textContent = countText;
      quantity.hidden = !item;
      button.classList.toggle("out-of-stock", Boolean(item && !count));
      button.classList.toggle("equipped", Boolean(item?.slot && game.equippedItemCount(id)));
    });
  }

  function inventoryShortcuts(selected) {
    const canAssign = selected?.count > 0 && game.itemAction(selected.id);
    const slots = state.itemSlots.map((id, index) => {
      const name = itemSlotNames[index];
      const item = state.items[id];
      const current = item ? escape(item.name) : "ว่าง";
      return '<div class="bag-binding"><button type="button" data-action="bind-item-slot" data-id="' + (index + 1) +
        '" title="' + current + '"' + (canAssign && id !== selected.id ? "" : " disabled") +
        '>ใส่' + name + '<small>' + current + '</small></button>' +
        (item ? '<button type="button" class="bag-binding-clear" data-action="clear-item-slot" data-id="' + (index + 1) +
          '" aria-label="ล้าง' + name + '">×</button>' : '') + '</div>';
    }).join("");
    return '<section class="bag-shortcuts"><h3>ช่องลัดไอเทม</h3><div class="bag-binding-grid">' + slots + '</div></section>';
  }

  function inventory() {
    const { inventory, equipment, gold } = state.player;
    const equipped = new Set(Object.values(equipment));
    const entries = [...new Set([...Object.keys(inventory), ...equipped])].flatMap(id => {
      const item = state.items[id];
      const count = inventory[id] || 0;
      if (!item || (cardsOnly && item.slot !== "card") || (!count && !equipped.has(id))) return [];
      return [{ id, item, count, equipped: equipped.has(id) }];
    });
    if (sortInventory) entries.sort((a, b) => a.item.type.localeCompare(b.item.type) || a.item.name.localeCompare(b.item.name, "th"));
    const selected = entries.find(entry => entry.id === selectedItem) ?? entries[0];
    selectedItem = selected?.id ?? null;
    const slots = entries.map(({ id, item, count, equipped }) => {
      const name = escape(item.name);
      return '<li><button type="button" class="bag-slot" data-action="inventory-select" data-id="' + id +
        '" aria-pressed="' + (id === selectedItem) + '" aria-label="' + name + ' ×' + count +
        (equipped ? ' · สวมอยู่' : '') + '" title="' + name + '">' + itemArtwork(id) +
        (equipped ? '<span class="bag-equipped" aria-hidden="true">สวม</span>' : '') +
        (count > 1 ? '<span class="bag-count" aria-hidden="true">' + fmt(count) + '</span>' : '') + '</button></li>';
    });
    const total = Math.max(20, Math.ceil(slots.length / 5) * 5);
    const emptySlots = '<li class="bag-slot bag-slot-empty" aria-hidden="true"></li>'.repeat(total - slots.length);
    let detail = '<p class="bag-empty">' + (cardsOnly ? 'ยังไม่มีการ์ด' : 'ยังไม่มีไอเทมในกระเป๋า') + '</p>';
    if (selected) {
      const { id, item } = selected;
      const action = game.itemAction(id);
      const requirement = item.baseLevel ? '<small>ต้องการ Base Lv. ' + item.baseLevel + '</small>' : '';
      const locked = item.baseLevel > state.player.level;
      detail = '<div><strong>' + escape(item.name) + '</strong><small>' + escape(item.description) + '</small>' + requirement + '</div>' +
        (item.slot === "card" ? '<button type="button" data-action="manage-card" data-id="' + id + '">จัดการการ์ด</button>' :
          selected.equipped ? (item.slot === "armor" ? '<button type="button" data-action="unequip-armor">ถอดเกราะ</button>' :
            '<span class="bag-worn">สวมอยู่</span>') : action ?
          '<button type="button" data-action="' + action + '" data-id="' + id + '"' + (locked ? ' disabled' : '') + '>' +
          (action === "equip" ? "สวม" : "ใช้") + '</button>' : '');
    }
    return '<ul class="bag-grid" aria-label="' + (cardsOnly ? "การ์ด" : "ไอเทมในกระเป๋า") + '">' +
      slots.join("") + emptySlots + '</ul><div class="bag-detail">' + detail + '</div>' + inventoryShortcuts(selected) +
      '<div class="bag-footer"><button type="button" data-action="equipment" title="สวมใส่ (E)">สวมใส่</button>' +
      '<button type="button" data-action="inventory-sort" aria-pressed="' + sortInventory +
      '">จัดเรียง</button><button type="button" data-action="inventory-cards" aria-pressed="' + cardsOnly +
      '">การ์ด</button><span class="bag-gold">' + interfaceIcon("coin") + fmt(gold) + ' เบี้ย</span></div>';
  }

  function equipmentGear() {
    const { player, items } = state;
    const rail = (slots) => '<ul class="equipment-rail">' + slots.map(([label, icon, id, slot]) => {
      const name = id ? escape(items[id].name) : "ว่าง";
      return '<li class="equipment-cell' + (id ? ' equipped' : '') + '"' +
        (slot ? ' data-equipment-slot="' + slot + '" tabindex="-1"' : '') + '><span class="equipment-icon">' +
        (id ? itemArtwork(id) : interfaceIcon(icon)) + '</span><span><small>' + label +
        '</small><strong>' + name + '</strong></span></li>';
    }).join("") + '</ul>';
    const gear = Object.entries(items).filter(([id, item]) => ["weapon", "armor"].includes(item.slot) && player.inventory[id]);
    const choices = gear.map(([id, item]) => {
      const locked = item.baseLevel > player.level;
      const equipped = id === player.equipment[item.slot];
      const draggable = locked || equipped ? '' : ' data-drag-equipment="' + id + '"';
      const action = equipped && item.slot === "armor" ? '<button type="button" data-action="unequip-armor">ถอดเกราะ</button>' :
        '<button type="button" data-action="equip" data-id="' + id + '"' + (locked || equipped ? ' disabled' : '') + '>' +
        (equipped ? 'สวมอยู่' : 'สวม') + '</button>';
      return '<li class="equipment-choice"' + draggable + '><span class="equipment-icon">' + itemArtwork(id) + '</span><div><strong>' +
        escape(item.name) + '</strong><small>' + escape(item.description) +
        (locked ? ' · ต้องการ Base Lv. ' + item.baseLevel : '') + '</small></div>' + action + '</li>';
    }).join("");
    return '<div class="equipment-layout">' +
      rail([["ศีรษะ", "helm"], ["อาวุธ", "blade", player.equipment.weapon, "weapon"], ["รองเท้า", "boot"]]) +
      '<figure class="equipment-figure"><img src="assets/player-anchor.png" alt="นักดาบฝึกหัด" width="41" height="72"></figure>' +
      rail([["เกราะ", "armor", player.equipment.armor, "armor"], ["มือรอง", "shield"], ["เครื่องประดับ", "coin"]]) + '</div>' +
      '<div class="equipment-card-heading"><h3>อุปกรณ์ในกระเป๋า</h3><small>ลากไอคอนไปช่องอาวุธหรือเกราะ</small></div>' +
      '<ul class="equipment-choices">' + choices + '</ul>';
  }

  function equipmentCards() {
    const { player, items } = state;
    const available = game.cardSlots.filter(slot => player.classTier >= slot.classTier);
    if (!available.some(slot => slot.id === selectedCardSlot)) selectedCardSlot = available[0].id;
    const picked = player.equipment[selectedCardSlot];
    const selectedNumber = game.cardSlots.findIndex(slot => slot.id === selectedCardSlot) + 1;
    const slots = game.cardSlots.map(({ id, classTier }, index) => {
      const locked = player.classTier < classTier;
      const item = player.equipment[id];
      const label = 'ช่อง ' + (index + 1);
      const stateLabel = locked ? 'ปลดล็อก Class ' + classTier : item ? escape(items[item].name) : 'ว่าง';
      return '<button type="button" class="equipment-card-slot" data-action="select-card-slot" data-id="' + id +
        '" data-equipment-slot="' + id + '" aria-pressed="' + (id === selectedCardSlot) + '"' + (locked ? ' disabled' : '') + '><span>' + label +
        '</span><span class="equipment-icon">' + (item ? itemArtwork(item) : interfaceIcon(locked ? "lock" : "card-slot")) +
        '</span><strong>' + stateLabel + '</strong></button>';
    }).join("");
    const choices = Object.entries(items).filter(([id, item]) => item.slot === "card" && player.inventory[id]).map(([id, item]) => {
      const free = player.inventory[id] - game.equippedItemCount(id);
      const name = escape(item.name);
      const draggable = free > 0 ? ' data-drag-equipment="' + id + '"' : '';
      return '<li class="equipment-choice"' + draggable + '><span class="equipment-icon">' + itemArtwork(id) + '</span><div><strong>' + name +
        '</strong><small>' + escape(item.description) + '</small><small>พร้อมใส่ ' + fmt(free) + ' จาก ' +
        fmt(player.inventory[id]) + ' ใบ</small></div><button type="button" data-action="equip-card" data-id="' + id +
        '" aria-label="ใส่' + name + ' ในช่อง ' + selectedNumber + '"' + (id === picked || free < 1 ? ' disabled' : '') + '>' +
        (id === picked ? 'สวมในช่องนี้' : 'ใส่ช่อง ' + selectedNumber) + '</button></li>';
    }).join("");
    return '<p class="equipment-card-capacity">Class ' + player.classTier + ' · ใช้ได้ ' + available.length + ' จาก ' + game.cardSlots.length + ' ช่อง</p>' +
      '<div class="equipment-card-slots" role="group" aria-label="ช่องสวมการ์ด">' + slots + '</div>' +
      '<div class="equipment-card-heading"><h3>การ์ดในกระเป๋า</h3>' + (choices ? '<small>ลากไอคอนไปช่องการ์ด</small>' : '') +
      (picked ? '<button type="button" data-action="unequip-card" data-id="' + selectedCardSlot + '">ถอดจากช่อง ' +
        selectedNumber + '</button>' : '') + '</div>' +
      (choices ? '<ul class="equipment-choices">' + choices + '</ul>' : '<p class="muted">ยังไม่มีการ์ดในกระเป๋า</p>');
  }

  function equipmentPanel() {
    const tabs = [["gear", "อุปกรณ์"], ["cards", "การ์ด"]].map(([id, label]) =>
      '<button type="button" data-action="equipment-tab" data-id="' + id + '" aria-pressed="' +
      (equipmentTab === id) + '">' + label + '</button>').join("");
    return '<div class="equipment-navigation"><div class="equipment-tabs" role="group" aria-label="หมวดสวมใส่">' + tabs +
      '</div><button type="button" data-action="inventory">กระเป๋า</button></div>' +
      (equipmentTab === "cards" ? equipmentCards() : equipmentGear());
  }

  function discardItemPanel() {
    const item = state.items[selectedItem];
    const max = game.discardableItemCount(selectedItem);
    return '<form id="discard-item-form"><p><strong>' + escape(item.name) +
      '</strong></p><p class="muted">ไอเทมที่ทิ้งจะถูกลบถาวร</p>' +
      (max > 1 ? '<label class="bag-discard-quantity"><span>จำนวนที่จะทิ้ง</span>' +
        '<input type="number" name="quantity" min="1" max="' + max + '" step="1" value="1" required></label>' :
        '<input type="hidden" name="quantity" value="1">') +
      (max === 0 ? '<p class="muted">ขณะนี้ไม่มีไอเทมที่ทิ้งได้</p>' : '') +
      '<div class="dialog-actions"><button type="button" data-action="inventory">ยกเลิก</button>' +
      '<button type="submit" class="bag-discard-confirm"' + (max === 0 ? ' disabled' : '') + '>ยืนยันการทิ้ง</button></div></form>';
  }

  function questRewards(quest, received) {
    const { item, gold, xp, jobXp, unlock } = quest.rewards;
    const rewards = unlock ? [[interfaceIcon("quest"), unlock]] : [
      [itemArtwork(item), state.items[item].name + " ×1"],
      [interfaceIcon("coin"), fmt(gold) + " เบี้ย"],
      [interfaceIcon("star"), fmt(xp) + " Base EXP"],
      [interfaceIcon("quest"), fmt(jobXp) + " Job EXP"],
    ];
    return '<section class="quest-reward-list"><h3>' + (received ? 'รางวัลที่ได้รับ' : 'รางวัลภารกิจ') +
      '</h3><ul>' + rewards.map(([icon, label]) => '<li>' + icon + '<span>' + escape(label) +
      '</span></li>').join("") + '</ul></section>';
  }

  function npcDialogue() {
    const { quest, questView, text: line } = dialogue;
    const body = '<p>' + escape(line) + '</p>';
    if (!questView) return body;
    if (questView === "challenge") return '<h3>ท้าชาละวัน</h3>' + body +
      '<div class="dialog-actions"><button type="button" data-action="harbor-challenge">ท้าชาละวัน</button></div>';
    return '<h3>' + escape(quest.title) + '</h3>' + body + questRewards(quest, questView === "reward") +
      (questView === "offer" ? '<div class="dialog-actions quest-offer-actions">' +
        '<button type="button" data-action="close">ไม่รับภารกิจ</button>' +
        '<button type="button" data-action="accept-quest">รับภารกิจ</button></div>' : "");
  }

  function ferryPanel() {
    const { origin, destination, fare, firstTrip } = ferryOffer;
    const canPay = state.player.gold >= fare;
    const fareLabel = firstTrip ? "ฟรีเที่ยวแรก" : fare ? fmt(fare) + " เบี้ย" : "ฟรี";
    return '<dl class="key-list"><dt>ต้นทาง</dt><dd>' + escape(origin) +
      '</dd><dt>ปลายทาง</dt><dd>' + escape(destination) +
      '</dd><dt>ค่าโดยสาร</dt><dd>' + fareLabel +
      '</dd><dt>เบี้ยที่มี</dt><dd>' + fmt(state.player.gold) + ' เบี้ย</dd></dl>' +
      (canPay ? '' : '<p class="muted">เบี้ยไม่พอสำหรับค่าเรือ</p>') +
      '<div class="dialog-actions"><button type="button" data-action="close">ยกเลิก</button>' +
      '<button type="button" data-action="board-ferry"' + (canPay ? '' : ' disabled') + '>ขึ้นเรือ</button></div>';
  }

  function character() {
    const player = state.player;
    const { stats, remaining, spent } = game.statAllocation(pendingStats);
    const { attack, defense, critical, attacksPerSecond, maxHp, maxMp } = game.combatStats(stats);
    const trainingRows = Object.entries(stats).map(([id, value]) => {
      const pending = pendingStats[id] ?? 0;
      return '<tr><th scope="row"><strong>' + id + '</strong><small>' + escape(attributes[id]) + '</small></th><td>' +
        fmt(player.stats[id]) + (pending ? '<span class="character-stat-delta">+' + pending + '</span>' : "") +
        '</td><td><div class="character-stepper"><button type="button" aria-label="ลด ' + id +
        '" data-action="stat-remove" data-id="' + id + '"' + (pending ? "" : " disabled") + '>−</button>' +
        '<button type="button" aria-label="เพิ่ม ' + id + '" data-action="stat-add" data-id="' + id + '"' +
        (remaining > 0 && value < 999 ? "" : " disabled") + '>+</button></div></td></tr>';
    }).join("");
    const combatRows = [
      ["ATK", fmt(attack), "พลังโจมตีรวมอุปกรณ์"],
      ["DEF", defense.toFixed(2).replace(/\.?0+$/, ""), "ค่าลดดาเมจก่อนปัดเศษ"],
      ["Critical", (critical * 100).toFixed(0) + "%", "โอกาสคริติคอล"],
      ["ASPD", attacksPerSecond.toFixed(2) + " ครั้ง/วิ.", "ความเร็วโจมตีปกติ"],
      ["Max HP", fmt(maxHp), "พลังชีวิตสูงสุด"],
      ["Max MP", fmt(maxMp), "มานาสูงสุด"],
    ].map(([label, value, detail]) => '<tr><th scope="row"><strong>' + label + '</strong><small>' + detail +
      '</small></th><td>' + value + '</td></tr>').join("");
    const exp = (kind, level, cap, value, next) => {
      const capped = next === 0;
      return '<div class="character-exp"><span>' + kind + ' Lv. <strong>' + level + ' / ' + cap +
        '</strong></span><span>' + (capped ? 'MAX' : fmt(value) + ' / ' + fmt(next) + ' EXP') + '</span><progress aria-label="' +
        kind + ' EXP" value="' + (capped ? 1 : value) + '" max="' + (next || 1) + '"></progress></div>';
    };
    return '<div class="character-overview"><div><strong>' + escape(player.name) + '</strong><small>' +
      escape(player.job) + ' · Class ' + player.classTier + '</small></div><p>แต้มสถานะ <strong>' + fmt(remaining) + '</strong></p></div>' +
      '<div class="character-experience">' + exp("Base", player.level, player.maxLevel, player.xp, player.nextXp) +
      exp("Job", player.jobLevel, player.maxJobLevel, player.jobXp, player.nextJobXp) + '</div>' +
      '<div class="character-tables"><section class="character-board"><h3 id="character-training">ค่าสเตตัส</h3>' +
      '<table aria-labelledby="character-training"><tbody>' + trainingRows + '</tbody></table></section>' +
      '<section class="character-board"><h3 id="character-combat">ค่าต่อสู้</h3>' +
      '<table aria-labelledby="character-combat"><tbody>' + combatRows + '</tbody></table></section></div>' +
      '<div class="dialog-actions character-actions"><button type="button" data-action="reset-levels">รีเซ็ตเลเวล</button>' +
      '<button type="button" data-action="reset-character">รีเซ็ตตัวละคร</button>' +
      '<button type="button" data-action="confirm-stats"' + (spent ? "" : " disabled") + '>ยืนยัน</button></div>';
  }

  function merchant() {
    const { items, player } = state;
    const entries = Object.entries(items);
    const stock = entries.filter(([, item]) => item.price > 0);
    const sellable = entries.map(([id, item]) => [id, item, game.sellableItemCount(id)])
      .filter(([id, , available]) => available > 0 || player.tradeCounts.sold[id] > 0);
    const rows = (entries, action) => entries.map(([id, item, available]) => {
      const buying = action === "buy";
      const price = buying ? item.price : item.sell;
      const label = buying ? "ซื้อ" : "ขาย";
      const counter = (buying ? player.tradeCounts.bought : player.tradeCounts.sold)[id] ?? 0;
      const disabled = (buying ? player.gold < price : available === 0) ? " disabled" : "";
      const name = escape(item.name);
      const sellAll = buying ? "" : '<button type="button" data-action="sell-all" data-id="' + id +
        '" aria-label="ขายทั้งหมด ' + name + ' ' + fmt(available) + ' ชิ้น"' +
        (available ? ' title="รับ ' + fmt(price * available) + ' เบี้ย"' : '') + disabled + '>ขายทั้งหมด</button>';
      return '<li class="item-row vendor-row" data-vendor-row="' + id + '" data-vendor-kind="' + action +
        '" tabindex="-1"><span class="vendor-item-art" aria-hidden="true">' + itemArtwork(id) +
        '</span><div class="vendor-item-info"><strong>' + name + (buying ? "" : " ×" + fmt(available)) +
        '</strong><small>' + escape(item.description) + '</small><small class="vendor-count">' + label +
        'แล้ว <strong>' + fmt(counter) + '</strong> ชิ้น</small></div><div class="vendor-actions"><span>' + fmt(price) +
        ' เบี้ย</span><div class="vendor-buttons"><button type="button" data-action="' + action + '" data-id="' + id +
        '" aria-label="' + label + ' ' + name + ' 1 ชิ้น"' + disabled + '>' + label + '</button>' + sellAll + '</div></div></li>';
    }).join("");
    return "<p>" + escape(dialogue.text) + '</p><p class="panel-summary">เงินที่มี <strong>' + fmt(player.gold) +
      ' เบี้ย</strong></p><h3>ซื้อจากร้าน</h3><ul class="item-list">' + rows(stock, "buy") + "</ul>" +
      (sellable.length ? '<h3>ขายให้ร้าน</h3><ul class="item-list">' + rows(sellable, "sell") + "</ul>" : "");
  }

  function autoSettings() {
    const { range, hpBelow, mpBelow, skillIds } = state.auto;
    const ranges = [["near", "ใกล้"], ["medium", "กลาง"], ["far", "ไกล"]];
    const options = ranges.map(([value, name]) =>
      '<option value="' + value + '"' + (range === value ? " selected" : "") + ">" + name + "</option>").join("");
    const threshold = (name, label, value) => '<label class="auto-field"><span>' + label +
      '</span><span class="auto-percent"><input type="number" name="' + name +
      '" min="0" max="100" step="1" required value="' + value + '"><span aria-hidden="true">%</span></span></label>';
    const available = state.skills.filter(skill => game.isSkillEnabled(skill));
    const skills = skillIds.map((id, index) => {
      const skillOptions = available.map(skill => '<option value="' + escape(skill.id) + '"' +
        (skill.id === id ? ' selected' : skillIds.includes(skill.id) ? ' disabled' : '') + '>' +
        escape(skill.name) + '</option>').join("");
      const unavailable = id && !available.some(skill => skill.id === id) && state.skills.find(skill => skill.id === id);
      const savedOption = unavailable ? '<option value="' + escape(id) + '" selected data-unavailable>' +
        escape(unavailable.name) + ' · ยังใช้ไม่ได้</option>' : '';
      return '<label class="auto-skill-slot"><span>Skill ' + (index + 1) +
        '</span><select name="skill"><option value="">ว่าง</option>' + skillOptions + savedOption + '</select></label>';
    }).join("");
    const hint = available.length ? "Auto ลองใช้จาก Skill 1 ไป Skill 5"
      : "กด K เพื่อเปิดใช้งานสกิล Active แล้วกลับมาเลือกที่นี่";
    return '<form id="auto-form" class="auto-form"><label class="auto-field"><span>ระยะค้นหามอนสเตอร์</span>' +
      '<select name="range">' + options + '</select></label>' +
      threshold("hpBelow", "ใช้ยาฟื้น HP เมื่อต่ำกว่า", hpBelow) +
      threshold("mpBelow", "ใช้น้ำอบฟื้นมานาเมื่อต่ำกว่า", mpBelow) +
      '<p class="muted">ตั้ง 0% เพื่อปิดการใช้ไอเทมชนิดนั้น</p>' +
      '<fieldset class="auto-skills"><legend>สกิลที่ให้ Auto ใช้</legend><p class="muted">' + hint +
      '</p><div>' + skills + '</div></fieldset>' +
      '<button type="submit">บันทึก</button></form>';
  }

  function skillBook() {
    const active = skillTab === "active";
    const tabs = [["active", "Active · สกิลกดใช้"], ["passive", "Passive · สกิลติดตัว"]];
    const tabButtons = tabs.map(([id, label]) => '<button type="button" data-action="skill-tab" data-id="' + id +
      '" aria-pressed="' + (skillTab === id) + '">' + label + '</button>').join("");
    let slots = "";
    if (active) {
      const slotButtons = state.skillSlots.map((_, index) => {
        const slot = index + 1;
        const skill = game.getSlotSkill(slot);
        const name = escape(skill?.name ?? "ว่าง");
        const draggable = game.isSkillEnabled(skill) ? ' data-drag-skill="' + skill.id + '"' : '';
        return '<button type="button" class="book-slot style-' + (skill?.icon ?? "empty") +
          '" data-action="select-skill-slot" data-id="' + slot + '" aria-pressed="' + (slot === selectedSlot) +
          '" aria-label="ช่อง ' + slot + ' ' + name + '"' + draggable + '><kbd>' + slot + '</kbd>' +
          skillArtwork(skill?.id ?? "empty") + '<span>' + name + '</span></button>';
      }).join("");
      slots = '<div class="book-loadout"><div class="book-slots" role="group" aria-label="ช่องลัดสกิล 1 ถึง 5">' + slotButtons + '</div>' +
        '<div class="book-instructions"><p id="skill-choice">ลากไอคอนลงช่อง 1–5 หรือคลิกสกิลเพื่อใส่ช่อง <strong>' + selectedSlot +
        '</strong></p><div class="book-slot-actions"><button type="button" data-action="clear-skill-slot"' +
        (game.getSlotSkill(selectedSlot) ? '' : ' disabled') + '>ล้างช่อง</button>' +
        '<button type="button" data-action="clear-all-skill-slots"' +
        (state.skillSlots.some(Boolean) ? '' : ' disabled') + '>ล้างทั้งหมด</button></div></div></div>';
    }
    const catalog = active ? state.skills : state.passiveSkills;
    const cards = catalog.map((skill) => {
      const unlocked = game.isSkillUnlocked(skill);
      const assignedSlot = active ? state.skillSlots.indexOf(skill.id) + 1 : 0;
      const enabled = game.isSkillEnabled(skill);
      const status = assignedSlot ? "ช่อง " + assignedSlot : "";
      const requirements = game.skillRequirements(skill).map(({ label, minimum, current }) =>
        '<span class="book-requirement' + (current < minimum ? ' missing' : '') + '">' +
        label + ' ' + minimum + (current < minimum ? ' (มี ' + current + ')' : '') + '</span>').join("");
      const details = active ? '<small class="book-cost">' +
        [skill.cost + ' มานา', 'พัก ' + skill.cooldown + ' วิ.', skillRangeText(skill)].filter(Boolean).join(' · ') + '</small>' : '';
      const content = '<span class="book-icon">' + skillArtwork(skill.id) + '</span><span class="book-card-text"><strong>' +
        escape(skill.name) + '</strong><small>' + escape(skill.description) + '</small>' + details +
        '<span class="book-requirements" aria-label="เงื่อนไข">' + requirements + '</span></span>';
      const main = active && enabled ? '<button type="button" class="book-card-main" data-action="assign-skill" data-id="' +
        skill.id + '" data-drag-skill="' + skill.id + '" aria-describedby="skill-choice">' + content + '</button>' :
        '<div class="book-card-main">' + content + '</div>';
      const activation = enabled ? '<span class="book-skill-status" tabindex="-1" data-action="skill-enabled" data-id="' +
        skill.id + '">ใช้งานแล้ว</span>' :
        unlocked ? '<button type="button" class="book-skill-enable" data-action="enable-skill" data-id="' +
          skill.id + '" aria-label="เปิดใช้งาน ' + escape(skill.name) + '">เปิดใช้งาน</button>' : '';
      const controls = (status ? '<span class="book-card-state">' + status + '</span>' : '') + activation;
      return '<li class="book-card style-' + skill.icon + (unlocked ? '' : ' locked') + '">' + main +
        (controls ? '<div class="book-card-controls">' + controls + '</div>' : '') + '</li>';
    }).join("");
    return '<div class="book-heading"><p>นักดาบมือเดียว <span>· Base Lv. ' + state.player.level + ' · Job Lv. ' + state.player.jobLevel +
      '</span></p><div class="book-tabs" role="group" aria-label="ประเภทสกิล">' + tabButtons + '</div></div>' +
      slots + (active ? '' : '<p class="book-passive-note">สกิลติดตัวเริ่มให้โบนัสเมื่อผ่านเงื่อนไขและกดเปิดใช้งาน</p>') +
      '<ul class="book-catalog">' + cards + '</ul>';
  }

  function applyDisplaySettings() {
    world.setRenderScale(displayQualities.get(displaySettings.quality).scale);
    const { brightness } = displaySettings;
    canvas.style.filter = brightness === 100 ? "" : "brightness(" + brightness + "%)";
  }

  function saveDisplaySettings() {
    try { localStorage.setItem(displayKey, JSON.stringify(displaySettings)); } catch {}
  }

  function renderScoutingPanel(id) {
    const { button, content } = scoutingPanels[id];
    const expanded = displaySettings[id];
    content.hidden = !expanded;
    button.setAttribute("aria-expanded", String(expanded));
    button.title = (expanded ? "ซ่อน" : "แสดง") + button.getAttribute("aria-label");
  }

  function settings() {
    const range = (id, label, value, min, max) =>
      '<label class="settings-row"><span>' + label + '</span><span class="settings-range">' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + value +
      '" aria-valuetext="' + value + '%"><span class="settings-value" aria-hidden="true">' + value + '%</span></span></label>';
    const qualityOptions = [...displayQualities].map(([id, { label }]) => '<option value="' + id + '"' +
      (id === displaySettings.quality ? " selected" : "") + ">" + label + "</option>").join("");
    return '<fieldset class="settings-group"><legend>ภาพ</legend>' +
      '<label class="settings-row"><span>คุณภาพภาพ</span><select id="display-quality">' + qualityOptions + '</select></label>' +
      range("display-brightness", "ความสว่าง", displaySettings.brightness, brightnessRange.min, brightnessRange.max) +
      '</fieldset>' +
      (skillAudio?.supported ? '<fieldset class="settings-group"><legend>เสียง</legend>' +
        '<label class="settings-row settings-switch"><span>เสียงโจมตีและสกิล</span>' +
        '<input type="checkbox" role="switch" id="combat-sound"' + (skillAudio.enabled ? " checked" : "") + '></label>' +
        range("combat-volume", "ระดับเสียง", Math.round(skillAudio.volume * 100), 0, 100) + '</fieldset>' : "");
  }

  function renderPanel() {
    bagContext.hidden = true;
    clearDrag();
    const quest = state.trackedQuest;
    const titles = { inventory: "กระเป๋าสัมภาระ", equipment: "สวมใส่", quests: "บันทึกภารกิจ", character: "สถานะตัวละคร", help: "วิธีเล่น", settings: "ตั้งค่า",
      "auto-settings": "ตั้งค่าการเล่นอัตโนมัติ", skills: "สกิล", "reset-levels": "รีเซ็ตเลเวล", "reset-character": "เริ่มตัวละครใหม่",
      "discard-item": "ทิ้งไอเทม", ferry: "เรือข้ามฟาก",
      dialogue: dialogue?.npc.name + (dialogue?.questView ? " (ภารกิจ)" : ""), vendor: dialogue?.npc.name };
    const content = {
      inventory,
      equipment: equipmentPanel,
      "discard-item": discardItemPanel,
      character,
      settings,
      "reset-levels": () => '<p>ตั้ง Base Lv. และ Job Lv. เป็น 1 และ EXP ทั้งคู่เป็น 0</p>' +
        '<div class="dialog-actions"><button type="button" data-action="character">กลับ</button>' +
        '<button type="button" data-action="confirm-reset-levels">ยืนยันรีเซ็ตเลเวล</button></div>',
      "reset-character": () => '<p>เริ่มใหม่ที่ Base Lv. 1 และ Job Lv. 1 เซฟตัวละครปัจจุบันจะถูกแทนที่</p>' +
        '<div class="dialog-actions"><button type="button" data-action="character">กลับ</button>' +
        '<button type="button" data-action="confirm-reset-character">เริ่มใหม่</button></div>',
      skills: skillBook,
      "auto-settings": autoSettings,
      quests: () => "<h3>" + escape(quest.title) + "</h3><p>" + escape(quest.description) +
        '</p><p class="panel-summary">' + escape(quest.objective) +
        (quest.status === "active" ? " · " + escape(game.questProgress(quest)) : "") + "</p>" +
        (quest.rewards ? questRewards(quest, quest.status === "completed") : "") +
        (state.zone !== "training" && questActionLabels[quest.status] ? '<div class="dialog-actions"><button type="button" data-action="quest-owner">' +
          questActionLabels[quest.status] + '</button></div>' : ""),
      help: () => '<dl class="key-list"><dt>คลิกพื้น / WASD</dt><dd>เดินและสำรวจ</dd>' +
        '<dt>คลิกศัตรู / Space</dt><dd>เข้าประชิดและโจมตีต่อเนื่อง</dd>' +
        '<dt>1–5 · K</dt><dd>ใช้สกิล · เปิดหน้าต่างสกิล</dd><dt>F</dt><dd>คุยหรือเข้าเขตใกล้ตัว</dd>' +
        '<dt>V · E · C · B</dt><dd>กระเป๋า สวมใส่ ภารกิจ สถานะ</dd>' +
        '<dt>ลูกกลิ้ง</dt><dd>ซูมกล้อง</dd>' +
        '<dt>F11</dt><dd>เต็มหน้าจอ</dd><dt>Esc</dt><dd>เปิดตั้งค่าหรือปิดหน้าต่าง</dd></dl>',
      dialogue: npcDialogue,
      vendor: merchant,
      ferry: ferryPanel,
    };
    text("dialog-title", titles[panel]);
    dialog.classList.toggle("skill-dialog", panel === "skills");
    dialog.classList.toggle("character-dialog", panel === "character");
    dialog.classList.toggle("inventory-dialog", panel === "inventory");
    dialog.classList.toggle("equipment-dialog", panel === "equipment");
    $("dialog-content").innerHTML = content[panel]?.() ?? "";
  }

  function openPanel(name) {
    pendingStats = {};
    if (dialog.open && name === panel && name !== "dialogue" && name !== "vendor") {
      dialog.close();
      return;
    }
    panel = name;
    keys.clear();
    renderPanel();
    $("dialog-content").scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    else $("dialog-close").focus();
  }

  function useSlot(slot) {
    if (game.getSlotSkill(slot)) {
      game.useSkill(slot);
    } else {
      selectedSlot = slot;
      skillTab = "active";
      openPanel("skills");
    }
  }

  function clearDrag() {
    const drag = activeDrag;
    activeDrag = null;
    if (!drag?.preview) return;
    suppressDragClick = true;
    drag.preview.remove();
    drag.source.classList.remove("is-dragging");
    drag.target?.classList.remove("drop-target");
    if (drag.source.hasPointerCapture(drag.pointerId)) drag.source.releasePointerCapture(drag.pointerId);
  }

  function dropTarget(drag, x, y) {
    const target = document.elementFromPoint(x, y);
    if (drag.kind === "skill") return target?.closest(dialog.open ? ".book-slot" : "[data-skill]");
    const slot = target?.closest("[data-equipment-slot]:not(:disabled)");
    if (!slot) return null;
    const key = slot.dataset.equipmentSlot;
    const type = game.cardSlots.some(entry => entry.id === key) ? "card" : key;
    return state.items[drag.id]?.slot === type && state.player.equipment[key] !== drag.id ? slot : null;
  }

  function highlightDropTarget(drag, x, y) {
    const target = dropTarget(drag, x, y);
    if (target === drag.target) return;
    drag.target?.classList.remove("drop-target");
    target?.classList.add("drop-target");
    drag.target = target;
  }

  function scrollEquipmentDrag() {
    const drag = activeDrag;
    if (drag?.kind !== "equipment" || !drag.preview || drag.target) return;
    const content = $("dialog-content");
    const { left, right, top, bottom } = content.getBoundingClientRect();
    const { pointerX: x, pointerY: y } = drag;
    if (x < left || x > right || y < top || y > bottom) return;
    const edge = 32;
    const distance = Math.max(0, y - bottom + edge) - Math.max(0, top + edge - y);
    if (!distance) return;
    const previous = content.scrollTop;
    content.scrollTop += distance * .28;
    if (content.scrollTop !== previous) highlightDropTarget(drag, x, y);
  }

  document.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || activeDrag) return;
    suppressDragClick = false;
    const source = event.target.closest("[data-drag-skill], [data-drag-equipment]");
    if (!source) return;
    const equipment = Boolean(source.dataset.dragEquipment);
    if (equipment && event.target.closest("button")) return;
    if (event.pointerType === "touch" && (equipment || source.matches(".book-card-main")) &&
        !event.target.closest(equipment ? ".equipment-icon" : ".book-icon")) return;
    activeDrag = { source, kind: equipment ? "equipment" : "skill", id: source.dataset.dragEquipment ?? source.dataset.dragSkill,
      pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  });

  document.addEventListener("pointermove", (event) => {
    const drag = activeDrag;
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.preview) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
      if (!drag.source.isConnected) { clearDrag(); return; }
      const preview = document.createElement("span");
      preview.className = "drag-ghost";
      preview.setAttribute("aria-hidden", "true");
      if (drag.kind === "skill") {
        const skill = state.skills.find(entry => entry.id === drag.id);
        if (!game.isSkillEnabled(skill)) { clearDrag(); return; }
        preview.classList.add("style-" + skill.icon);
        preview.innerHTML = skillArtwork(skill.id);
      } else {
        preview.innerHTML = itemArtwork(drag.id);
      }
      (dialog.open ? dialog : document.body).append(preview);
      drag.preview = preview;
      drag.source.setPointerCapture(event.pointerId);
      drag.source.classList.add("is-dragging");
    }
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    drag.preview.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    highlightDropTarget(drag, event.clientX, event.clientY);
  });

  document.addEventListener("pointerup", (event) => {
    const drag = activeDrag;
    if (drag?.pointerId !== event.pointerId) return;
    const target = drag.preview && dropTarget(drag, event.clientX, event.clientY);
    clearDrag();
    if (!target) return;
    if (drag.kind === "equipment") {
      const slot = target.dataset.equipmentSlot;
      if (state.items[drag.id]?.slot === "card") {
        selectedCardSlot = slot;
        runAction("equip-card", drag.id);
      } else runAction("equip", drag.id);
      return;
    }
    const slot = Number(target.dataset.id ?? target.dataset.skill);
    if (dialog.open) {
      selectedSlot = slot;
      runAction("assign-skill", drag.id);
    } else if (game.assignSkill(slot, drag.id)) {
      renderHUD();
    }
  });

  document.addEventListener("pointercancel", (event) => {
    if (activeDrag?.pointerId === event.pointerId) clearDrag();
  });

  document.addEventListener("click", (event) => {
    if (!suppressDragClick || event.detail === 0) return;
    suppressDragClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  function runAction(action, id) {
    switch (action) {
      case "inventory":
      case "equipment":
      case "quests":
      case "character":
      case "reset-character":
      case "reset-levels":
      case "help":
      case "settings":
      case "skills":
      case "auto-settings": openPanel(action); return;
      case "toggle-scouting":
        if (!Object.hasOwn(scoutingPanels, id)) return;
        displaySettings[id] = !displaySettings[id];
        renderScoutingPanel(id);
        if (id === "minimap" && displaySettings.minimap) world.drawMinimap(minimap, state);
        saveDisplaySettings();
        return;
      case "quest-owner":
        if (!questActionLabels[state.trackedQuest.status]) return;
        if (dialog.open) dialog.close();
        game.interact(state.trackedQuest.npcId);
        renderHUD();
        return;
      case "accept-quest":
      case "harbor-challenge":
        if (action === "accept-quest" ? game.acceptQuest() : game.startHarborChallenge()) {
          dialog.close();
          canvas.focus({ preventScroll: true });
          renderHUD();
          if (action === "accept-quest") notify("รับภารกิจแล้ว");
        }
        return;
      case "board-ferry":
        if (panel === "ferry" && game.boardFerry(ferryOffer.id)) {
          dialog.close();
          canvas.focus({ preventScroll: true });
          renderHUD();
        }
        return;
      case "inventory-select": selectedItem = id; break;
      case "manage-card": {
        const { equipment, classTier } = state.player;
        const slots = game.cardSlots.filter(slot => classTier >= slot.classTier);
        selectedCardSlot = (slots.find(slot => !equipment[slot.id]) ??
          slots.find(slot => equipment[slot.id] === id) ?? slots[0]).id;
        equipmentTab = "cards";
        openPanel("equipment");
        $("dialog-content").querySelector('[data-action="select-card-slot"][aria-pressed="true"]').focus();
        return;
      }
      case "equipment-tab": equipmentTab = id; break;
      case "select-card-slot": selectedCardSlot = id; break;
      case "equip-card": game.equipItem(id, selectedCardSlot); break;
      case "unequip-card": game.unequipCard(id); break;
      case "unequip-armor": game.unequipArmor(); break;
      case "inventory-discard":
        if (game.discardableItemCount(id)) {
          selectedItem = id;
          openPanel("discard-item");
          dialog.querySelector('#discard-item-form button[data-action="inventory"]').focus();
        }
        return;
      case "bind-item-slot": game.assignItemSlot(Number(id), selectedItem); break;
      case "clear-item-slot": game.assignItemSlot(Number(id), null); break;
      case "item-shortcut": {
        const item = state.itemSlots[Number(id) - 1];
        if (!item || !state.player.inventory[item]) {
          openPanel("inventory");
          return;
        }
        runAction(game.itemAction(item), item);
        return;
      }
      case "inventory-sort": sortInventory = !sortInventory; break;
      case "inventory-cards": cardsOnly = !cardsOnly; break;
      case "skill-tab": skillTab = id; break;
      case "select-skill-slot": selectedSlot = Number(id); break;
      case "assign-skill": game.assignSkill(selectedSlot, id); break;
      case "clear-skill-slot": game.assignSkill(selectedSlot, null); break;
      case "clear-all-skill-slots": game.clearSkillSlots(); break;
      case "enable-skill": game.enableSkill(id); break;
      case "auto-toggle":
        game.setAuto(!state.auto.enabled);
        renderHUD();
        return;
      case "training-cooldown":
        if (game.setTrainingCooldowns(!state.trainingCooldowns)) renderHUD();
        return;
      case "training-mana":
        if (game.setTrainingManaCosts(!state.trainingManaCosts)) renderHUD();
        return;
      case "confirm-reset-levels":
        game.resetLevels();
        renderHUD();
        openPanel("character");
        return;
      case "confirm-reset-character":
        game.resetCharacter();
        skillTab = "active";
        selectedSlot = 1;
        equipmentTab = "gear";
        selectedCardSlot = "card";
        hits.length = 0;
        effects.replaceChildren();
        dialog.close();
        renderHUD();
        notify("เริ่มตัวละครใหม่แล้ว");
        return;
      case "close": dialog.close(); return;
      case "fullscreen":
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => notify("กด F11 เพื่อเปิดเต็มหน้าจอ"));
        return;
      case "clear-target": game.setAuto(false); game.selectTarget(null); return;
      case "attack": game.setAuto(false); game.attack(); return;
      case "talk": game.interact(); return;
      case "use-item":
        if (game.useItem(id) && id === "town_scroll" && dialog.open) dialog.close();
        break;
      case "equip": game.equipItem(id); break;
      case "stat-add":
      case "stat-remove": {
        const amount = (pendingStats[id] ?? 0) + (action === "stat-add" ? 1 : -1);
        const draft = { ...pendingStats, [id]: amount };
        if (game.statAllocation(draft)) pendingStats = draft;
        break;
      }
      case "confirm-stats":
        if (game.applyStatPoints(pendingStats)) {
          pendingStats = {};
          notify("อัปค่าสเตตัสแล้ว");
        }
        break;
      case "buy": game.buyItem(id); break;
      case "sell": game.sellItem(id); break;
      case "sell-all": game.sellItem(id, game.sellableItemCount(id)); break;
      default: return;
    }
    renderHUD();
    if (dialog.open) {
      renderPanel();
      const nextAction = action === "enable-skill" ? "skill-enabled" : action;
      const replacement = [...$("dialog-content").querySelectorAll("[data-action]")]
        .find((element) => element.dataset.action === nextAction && element.dataset.id === id && !element.disabled);
      const slotButton = panel === "skills" && skillTab === "active"
        ? $("dialog-content").querySelector('[data-action="select-skill-slot"][aria-pressed="true"]') : null;
      if (action === "skill-tab" || action === "equipment-tab") $("dialog-content").scrollTop = 0;
      const itemButton = panel === "inventory" ? $("dialog-content").querySelector('.bag-slot[aria-pressed="true"]') : null;
      const statButton = panel === "character" ? $("dialog-content").querySelector('[data-action="confirm-stats"]:enabled') : null;
      const gearSlot = action === "unequip-armor" ? "armor" : action === "equip" ? state.items[id]?.slot : null;
      const equipmentSlot = panel === "equipment" ? $("dialog-content").querySelector(gearSlot
        ? '[data-equipment-slot="' + gearSlot + '"]' : '[data-action="select-card-slot"][aria-pressed="true"]') : null;
      const vendorRow = panel === "vendor" && ["buy", "sell", "sell-all"].includes(action)
        ? $("dialog-content").querySelector(`[data-vendor-row="${CSS.escape(id)}"][data-vendor-kind="${action === "buy" ? "buy" : "sell"}"]`)
        : null;
      (replacement ?? slotButton ?? itemButton ?? statButton ?? equipmentSlot ?? vendorRow ?? $("dialog-close")).focus({ preventScroll: true });
    }
  }

  document.addEventListener("click", (event) => {
    const skill = event.target.closest("[data-skill]");
    if (skill) {
      useSlot(Number(skill.dataset.skill));
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) runAction(button.dataset.action, button.dataset.id);
  });
  document.addEventListener("change", (event) => {
    if (!event.target.matches('#auto-form select[name="skill"]')) return;
    const slots = [...event.target.form.querySelectorAll('select[name="skill"]')];
    const chosen = new Set(slots.map(slot => slot.value));
    for (const slot of slots) {
      for (const option of slot.options) {
        option.disabled = option.value !== slot.value &&
          (option.hasAttribute("data-unavailable") || chosen.has(option.value)) && option.value !== "";
      }
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "discard-item-form") {
      event.preventDefault();
      const quantity = Number(new FormData(event.target).get("quantity"));
      if (game.discardItem(selectedItem, quantity)) {
        openPanel("inventory");
        renderHUD();
      } else renderPanel();
      return;
    }
    if (event.target.id !== "auto-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    game.configureAuto({
      range: form.get("range"),
      hpBelow: Number(form.get("hpBelow")),
      mpBelow: Number(form.get("mpBelow")),
      skillIds: form.getAll("skill"),
    });
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) {
      panel = null;
      ferryOffer = null;
      pendingStats = {};
      keys.clear();
      bagContext.hidden = true;
      clearDrag();
    }
  });
  dialog.addEventListener("contextmenu", (event) => {
    const slot = event.target.closest('[data-action="inventory-select"]');
    if (panel !== "inventory" || !slot) return;
    event.preventDefault();
    const { id } = slot.dataset;
    bagDiscardButton.dataset.id = id;
    bagDiscardButton.disabled = game.discardableItemCount(id) === 0;
    const reason = $("bag-context-reason");
    reason.hidden = !bagDiscardButton.disabled;
    reason.textContent = game.equippedItemCount(id) ? "กำลังสวมอยู่" :
      id === "rusty_sword" ? "ดาบประจำตัว" : "ไอเทมนี้ทิ้งไม่ได้";
    bagContext.hidden = false;
    const bounds = dialog.getBoundingClientRect();
    const anchor = slot.getBoundingClientRect();
    const x = (event.clientX || anchor.left) - bounds.left;
    const y = (event.clientY || anchor.bottom) - bounds.top;
    bagContext.style.left = Math.max(7, Math.min(x, dialog.clientWidth - bagContext.offsetWidth - 7)) + "px";
    bagContext.style.top = Math.max(7, Math.min(y, dialog.clientHeight - bagContext.offsetHeight - 7)) + "px";
    (bagDiscardButton.disabled ? bagContext : bagDiscardButton).focus({ preventScroll: true });
  });
  dialog.addEventListener("pointerdown", (event) => {
    if (!bagContext.contains(event.target)) bagContext.hidden = true;
  });
  $("dialog-content").addEventListener("scroll", () => { bagContext.hidden = true; });
  dialog.addEventListener("cancel", (event) => {
    if (!bagContext.hidden) {
      event.preventDefault();
      bagContext.hidden = true;
      dialog.querySelector('[data-action="inventory-select"][data-id="' + bagDiscardButton.dataset.id + '"]')?.focus();
    } else if (panel === "discard-item") {
      event.preventDefault();
      openPanel("inventory");
    }
  });
  dialog.addEventListener("input", ({ target }) => {
    if (panel !== "settings") return;
    const { id, value } = target;
    if (target.type === "range") {
      target.setAttribute("aria-valuetext", value + "%");
      target.nextElementSibling.textContent = value + "%";
    }
    switch (id) {
      case "combat-volume": skillAudio.setVolume(Number(value) / 100); return;
      case "combat-sound": skillAudio.setEnabled(target.checked); return;
      case "display-quality": displaySettings.quality = value; break;
      case "display-brightness": displaySettings.brightness = Number(value); break;
      default: return;
    }
    applyDisplaySettings();
    saveDisplaySettings();
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || dialog.open) return;
    const { x, y, entity, kind } = world.hit(event.clientX, event.clientY);
    if (kind === "enemy") {
      game.setAuto(false);
      game.selectTarget(entity.id);
      game.attack();
    } else if (kind === "npc" || kind === "portal" || kind === "interactable") {
      game.interact(entity.id);
    } else if (Number.isFinite(x) && Number.isFinite(y)) {
      game.moveTo(x, y);
    }
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    world.zoomBy(event.deltaY > 0 ? 0.93 : 1.075);
  }, { passive: false });

  const shortcuts = { KeyV: "inventory", KeyE: "equipment", KeyC: "quests", KeyB: "character", KeyH: "help", KeyK: "skills",
    Space: "attack", KeyF: "talk", Escape: "settings" };
  const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  document.addEventListener("keydown", (event) => {
    const { code } = event;
    if (event.ctrlKey || event.metaKey || event.altKey || (code === "Space" && event.target.closest?.("button"))) return;
    if (dialog.open) {
      const action = shortcuts[code];
      if (["inventory", "equipment", "quests", "character", "help", "skills"].includes(action) && !event.repeat) {
        event.preventDefault();
        openPanel(action);
      }
      return;
    }
    if (movement.has(code)) {
      event.preventDefault();
      keys.add(code);
      return;
    }
    if (event.repeat) return;
    if (/^Digit[1-5]$/.test(code)) {
      event.preventDefault();
      useSlot(Number(code[5]));
    } else if (shortcuts[code]) {
      event.preventDefault();
      runAction(shortcuts[code]);
    }
  });
  document.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => { keys.clear(); clearDrag(); });
  window.addEventListener("pagehide", () => game.save());
  document.addEventListener("visibilitychange", () => { if (document.hidden) game.save(); });

  const effects = document.createElement("div");
  effects.className = "world-effects";
  effects.setAttribute("aria-hidden", "true");
  canvas.after(effects);

  if (skillAudio?.supported) {
    for (const type of ["pointerup", "keydown", "click"]) document.addEventListener(type, skillAudio.unlock, true);
  }

  game.subscribe((event) => {
    skillAudio?.play(event);
    if (dialog.open && ((event.type === "level" && (panel === "skills" || panel === "character")) || (event.type === "quest" && panel === "quests"))) {
      const { action, id } = document.activeElement.dataset;
      renderPanel();
      const button = [...$("dialog-content").querySelectorAll("[data-action]")]
        .find((entry) => entry.dataset.action === action && entry.dataset.id === id && !entry.disabled);
      (button ?? $("dialog-close")).focus({ preventScroll: true });
    }
    if (event.type === "dialog") {
      dialogue = event;
      openPanel(event.npc.type === "vendor" ? "vendor" : "dialogue");
    } else if (event.type === "ferry") {
      ferryOffer = event;
      openPanel("ferry");
    } else if (event.type === "skill" || event.type === "skill-strike") {
      world.playSkillEffect(event);
    } else if (event.type === "damage" && world.screenPoint) {
      world.playSkillEffect(event);
      const label = document.createElement("span");
      const critical = event.enemy && event.critical === true;
      const kind = event.status === "bleed" ? " bleed" : critical ? " critical" : event.enemy ? "" : " hurt";
      label.className = "damage-number" + kind + (event.stunTime > 0 ? " stun" : "");
      label.textContent = fmt(event.value) + (event.stunTime > 0 ? " · สตัน" : "");
      effects.append(label);
      const lift = event.skill === "interrupt" ? 48 : 0;
      hits.push({ x: event.x, y: event.y, label, critical, lift, start: performance.now() });
    } else if (event.type === "zone") {
      world.resetCamera();
      world.clearSkillEffects();
      notify(state.zoneInfo.name);
    } else if (event.type !== "damage") {
      notify(event.text);
    }
  });

  function animate(now) {
    scrollEquipmentDrag();
    const dt = Math.min(0.05, Math.max(0, (now - (lastRender || now)) / 1000));
    lastRender = now;
    const x = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const y = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
    game.update(dt, world.relativeAxis?.(x, y) ?? { x, y }, dialog.open || document.hidden);
    state.remotePlayers = peers.filter((peer) => peer.zone === state.zone);
    world.draw(state, now / 1000);
    for (let index = hits.length - 1; index >= 0; index -= 1) {
      const effect = hits[index];
      const progress = (now - effect.start) / (effect.critical ? 840 : 680);
      if (progress > 1) {
        effect.label.remove();
        hits.splice(index, 1);
        continue;
      }
      const point = world.screenPoint(effect.x, effect.y, effect.lift);
      effect.label.style.left = point.x + "px";
      const height = effect.critical ? 47 : 35;
      effect.label.style.top = (point.y - height - 23 * progress) + "px";
      effect.label.style.opacity = String(Math.min(1, 2 - 2 * progress));
    }
    if (now - portraitTime > 80) {
      if (displaySettings.minimap) world.drawMinimap(minimap, state);
      renderHUD();
      portraitTime = now;
    }
    requestAnimationFrame(animate);
  }

  function openLanPresence() {
    if (!/^https?:$/.test(location.protocol) || typeof EventSource === "undefined") return;
    const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0")).join("");
    const stream = new EventSource("/api/players");
    stream.addEventListener("open", () => { connected = true; });
    stream.addEventListener("message", (event) => {
      const snapshot = JSON.parse(event.data);
      peers = snapshot.filter((peer) => peer.id !== id);
      peerCount = peers.length;
    });
    stream.addEventListener("error", () => {
      connected = false;
      peers = [];
      peerCount = 0;
    });
    let sending = false;
    function sendPresence() {
      if (!connected || sending) return;
      const { x, y, dir, attackDir, moving, action, level, equipment } = state.player;
      const facing = action === "attack" ? (attackDir ?? dir) : dir;
      sending = true;
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, x, y, zone: state.zone, dir: facing, moving, action, level, weapon: equipment.weapon }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {}).finally(() => { sending = false; });
    }
    setInterval(sendPresence, 180);
  }

  renderHUD();
  requestAnimationFrame(animate);
  openLanPresence();
})();

