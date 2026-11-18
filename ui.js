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
  const itemShortcuts = [...document.querySelectorAll('[data-action="item-shortcut"]')];
  const itemSlotNames = ["ช่องบน", "ช่องล่าง"];
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
  const displaySettings = { quality: "standard", brightness: 100 };
  const brightnessRange = { min: 70, max: 130 };
  try {
    const saved = JSON.parse(localStorage.getItem(displayKey));
    if (displayQualities.has(saved?.quality)) displaySettings.quality = saved.quality;
    if (Number.isFinite(saved?.brightness)) {
      displaySettings.brightness = Math.max(brightnessRange.min, Math.min(brightnessRange.max, saved.brightness));
    }
  } catch {}
  applyDisplaySettings();
  const keys = new Set();
  const skillButtons = [...document.querySelectorAll("[data-skill]")];
  const hits = [];
  let panel = null;
  let dialogue = null;
  let toastTimeout;
  let peerCount = 0;
  let connected = false;
  let peers = [];
  let portraitTime = 0;
  let lastRender = 0;
  let skillTab = "active";
  let selectedSlot = 1;
  let selectedItem = null;
  let sortInventory = false;
  let cardsOnly = false;
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
    claw: "swords", dust: "star", card: "quest", seal: "shield", scroll: "quest" };
  const inventoryArt = [
    "potion", "elixir", "rusty_sword", "bronze_sword", "tamarind_core",
    "monkey_claw", "spirit_dust", "tamarind_card", "monkey_card", "guardian_seal",
  ];
  const skillIcon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';

  function renderHUD() {
    const { player, trackedQuest: quest, zoneInfo } = state;
    const training = zoneInfo.id === "training";
    const cooldowns = game.skillCooldownsEnabled();
    const manaCosts = game.skillManaCostsEnabled();
    setHidden("training-controls", !training);
    setHidden("quest-tracker", training);
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
    const multiGoalProgress = quest.goals && quest.status === "active";
    text("quest-objective", multiGoalProgress ? game.questProgress(quest) : quest.objective);
    const questAction = questActionLabels[quest.status];
    const questOwner = quest.npcId ?? "";
    const respawnSeconds = quest.respawnAt ? Math.max(0, Math.ceil((quest.respawnAt - Date.now()) / 1000)) : null;
    text("quest-count", respawnSeconds !== null ? respawnSeconds + " วิ." :
      questAction ?? (quest.status === "completed" ? "ส่งแล้ว" : multiGoalProgress ? "" : game.questProgress(quest)));
    if (questTracker.dataset.status !== quest.status || questTracker.dataset.owner !== questOwner) {
      questTracker.dataset.status = quest.status;
      questTracker.dataset.owner = questOwner;
      questTracker.dataset.action = questAction ? "quest-owner" : "quests";
      const owner = state.npcs.find(npc => npc.id === quest.npcId);
      const detail = questAction && owner ? questAction + " · เดินไปหา" + owner.name : "เปิดสมุดภารกิจ";
      questTracker.setAttribute("aria-label", detail);
      questTracker.title = detail;
    }
    text("player-name", player.name || "นักเดินทาง");
    text("player-job", player.job || "ดาบอโยธยา");
    text("base-level", fmt(player.level));
    text("job-level", fmt(player.jobLevel));
    text("hp-text", fmt(player.hp) + " / " + fmt(player.maxHp));
    text("sp-text", fmt(player.mp) + " / " + fmt(player.maxMp));
    text("xp-text", fmt(player.xp) + " / " + fmt(player.nextXp));
    fill("hp-fill", player.hp, player.maxHp);
    fill("sp-fill", player.mp, player.maxMp);
    fill("xp-fill", player.xp, player.nextXp);
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
      const binding = skill ? skill.id + (inactive ? ":inactive" : "") : "";
      if (button.dataset.binding !== binding) {
        button.dataset.binding = binding;
        button.className = "skill panel style-" + (skill?.icon ?? "empty");
        const skillLabel = name + (inactive ? " · รอเปิดใช้งาน" : "");
        button.title = skill
          ? [skillLabel, skill.cost + " มานา", skillRangeText(skill)].filter(Boolean).join(" · ") + "\n" + skill.description
          : "ช่องว่าง · คลิกเพื่อจัดสกิล";
        button.setAttribute("aria-label", "ช่อง " + slot + " " + (skill ? skillLabel : "ว่าง เปิดหน้าต่างสกิล"));
        button.querySelector("use").setAttribute("href", "#i-" + (skill?.icon ?? "plus"));
        button.querySelector(".skill-label").textContent = name;
      }
      button.classList.toggle("skill-inactive", inactive);
      button.classList.toggle("on-cooldown", remaining > 0);
      button.classList.toggle("low-mana", Boolean(manaCosts && skill && skill.cost > player.mp));
      const shade = button.querySelector(".skill-cooldown");
      shade.style.setProperty("--cooldown", (remaining ? 100 * remaining / skill.cooldown : 0) + "%");
      shade.textContent = remaining ? remaining.toFixed(remaining < 1 ? 1 : 0) : "";
      shade.hidden = remaining <= 0;
    });

    const nearby = state.npcs.find((npc) => Math.hypot(player.x - npc.x, player.y - npc.y) < 120);
    const showHint = nearby && !dialog.open;
    setHidden("interaction-hint", !showHint);
    if (showHint) {
      const label = $("interaction-name") || $("interaction-hint");
      if (label) label.textContent = nearby.name + " · F คุย";
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
    if (id === "town_scroll") return '<img class="town-scroll-art" src="assets/town-scroll.png" alt="" draggable="false">';
    const cell = inventoryArt.indexOf(id);
    if (cell < 0) return skillIcon(itemIcons[state.items[id]?.icon] ?? "bag");
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
      button.classList.toggle("equipped", Boolean(item?.slot && player.equipment[item.slot] === id));
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
        (selected.equipped ? '<span class="bag-worn">สวมอยู่</span>' : action ?
          '<button type="button" data-action="' + action + '" data-id="' + id + '"' + (locked ? ' disabled' : '') + '>' +
          (action === "equip" ? "สวม" : "ใช้") + '</button>' : '');
    }
    return '<ul class="bag-grid" aria-label="' + (cardsOnly ? "การ์ด" : "ไอเทมในกระเป๋า") + '">' +
      slots.join("") + emptySlots + '</ul><div class="bag-detail">' + detail + '</div>' + inventoryShortcuts(selected) +
      '<div class="bag-footer"><button type="button" data-action="inventory-sort" aria-pressed="' + sortInventory +
      '">จัดเรียง</button><button type="button" data-action="inventory-cards" aria-pressed="' + cardsOnly +
      '">การ์ด</button><span class="bag-gold">' + skillIcon("coin") + fmt(gold) + ' เบี้ย</span></div>';
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
    const rewards = unlock ? [[skillIcon("quest"), unlock]] : [
      [itemArtwork(item), state.items[item].name + " ×1"],
      [skillIcon("coin"), fmt(gold) + " เบี้ย"],
      [skillIcon("star"), fmt(xp) + " Base EXP"],
      [skillIcon("quest"), fmt(jobXp) + " Job EXP"],
    ];
    return '<section class="quest-reward-list"><h3>' + (received ? 'รางวัลที่ได้รับ' : 'รางวัลภารกิจ') +
      '</h3><ul>' + rewards.map(([icon, label]) => '<li>' + icon + '<span>' + escape(label) +
      '</span></li>').join("") + '</ul></section>';
  }

  function npcDialogue() {
    const { quest, questView, text: line } = dialogue;
    const body = '<p>' + escape(line) + '</p>';
    if (!questView) return body;
    return '<h3>' + escape(quest.title) + '</h3>' + body + questRewards(quest, questView === "reward") +
      (questView === "offer" ? '<div class="dialog-actions quest-offer-actions">' +
        '<button type="button" data-action="close">ไม่รับภารกิจ</button>' +
        '<button type="button" data-action="accept-quest">รับภารกิจ</button></div>' : "");
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
    const exp = (kind, level, value, max) => '<div class="character-exp"><span>' + kind + ' Lv. <strong>' + level +
      '</strong></span><span>' + fmt(value) + ' / ' + fmt(max) + ' EXP</span><progress aria-label="' + kind +
      ' EXP" value="' + value + '" max="' + max + '"></progress></div>';
    return '<div class="character-overview"><div><strong>' + escape(player.name) + '</strong><small>' +
      escape(player.job) + '</small></div><p>แต้มสถานะ <strong>' + fmt(remaining) + '</strong></p></div>' +
      '<div class="character-experience">' + exp("Base", player.level, player.xp, player.nextXp) +
      exp("Job", player.jobLevel, player.jobXp, player.nextJobXp) + '</div>' +
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
    const stock = Object.entries(items).filter(([, item]) => Number.isFinite(item.price));
    const sellable = Object.entries(items).filter(([id, item]) =>
      player.inventory[id] > 0 && item.sell > 0 && player.equipment[item.slot] !== id);
    const rows = (entries, action) => entries.map(([id, item]) => {
      const buying = action === "buy";
      const price = buying ? item.price : item.sell;
      const label = buying ? "ซื้อ" : "ขาย";
      const disabled = buying && player.gold < price ? " disabled" : "";
      return '<li class="item-row"><span class="vendor-item-art" aria-hidden="true">' + itemArtwork(id) +
        '</span><div><strong>' + escape(item.name) + (buying ? "" : " ×" + player.inventory[id]) +
        "</strong><small>" + escape(item.description) + "</small></div><span>" + price +
        ' เบี้ย</span><button data-action="' + action + '" data-id="' + id + '"' + disabled + '>' + label + '</button></li>';
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
        return '<button type="button" class="book-slot style-' + (skill?.icon ?? "empty") +
          '" data-action="select-skill-slot" data-id="' + slot + '" aria-pressed="' + (slot === selectedSlot) +
          '" aria-label="ช่อง ' + slot + ' ' + name + '"><kbd>' + slot + '</kbd>' +
          skillIcon(skill?.icon ?? "plus") + '<span>' + name + '</span></button>';
      }).join("");
      slots = '<div class="book-slots" role="group" aria-label="ช่องลัดสกิล 1 ถึง 5">' + slotButtons + '</div>' +
        '<div class="book-instructions"><p id="skill-choice">คลิกสกิลที่เปิดแล้วเพื่อใส่ช่อง <strong>' + selectedSlot +
        '</strong></p><div class="book-slot-actions"><button type="button" data-action="clear-skill-slot"' +
        (game.getSlotSkill(selectedSlot) ? '' : ' disabled') + '>ล้างช่อง</button>' +
        '<button type="button" data-action="clear-all-skill-slots"' +
        (state.skillSlots.some(Boolean) ? '' : ' disabled') + '>ล้างทั้งหมด</button></div></div>';
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
      const content = '<span class="book-icon">' + skillIcon(skill.icon) + '</span><span class="book-card-text"><strong>' +
        escape(skill.name) + '</strong><small>' + escape(skill.description) + '</small>' + details +
        '<span class="book-requirements" aria-label="เงื่อนไข">' + requirements + '</span></span>';
      const main = active && enabled ? '<button type="button" class="book-card-main" data-action="assign-skill" data-id="' +
        skill.id + '" aria-describedby="skill-choice">' + content + '</button>' :
        '<div class="book-card-main">' + content + '</div>';
      const activation = enabled ? '<span class="book-skill-status" tabindex="-1" data-action="skill-enabled" data-id="' +
        skill.id + '">ใช้งานแล้ว</span>' :
        unlocked ? '<button type="button" class="book-skill-enable" data-action="enable-skill" data-id="' +
          skill.id + '" aria-label="เปิดใช้งาน ' + escape(skill.name) + '">เปิดใช้งาน</button>' : '';
      return '<li class="book-card style-' + skill.icon + (unlocked ? '' : ' locked') + '">' + main +
        '<div class="book-card-controls">' + (status ? '<span class="book-card-state">' + status + '</span>' : '') +
        activation + '</div></li>';
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
    const quest = state.trackedQuest;
    const titles = { inventory: "กระเป๋าสัมภาระ", quests: "บันทึกภารกิจ", character: "สถานะตัวละคร", help: "วิธีเล่น", settings: "ตั้งค่า",
      "auto-settings": "ตั้งค่าการเล่นอัตโนมัติ", skills: "สกิล", "reset-levels": "รีเซ็ตเลเวล", "reset-character": "เริ่มตัวละครใหม่",
      "discard-item": "ทิ้งไอเทม",
      dialogue: dialogue?.npc.name + (dialogue?.questView ? " (ภารกิจ)" : ""), vendor: dialogue?.npc.name };
    const content = {
      inventory,
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
        '<dt>V · C · B</dt><dd>กระเป๋า ภารกิจ สถานะ</dd>' +
        '<dt>ลูกกลิ้ง</dt><dd>ซูมกล้อง</dd>' +
        '<dt>F11</dt><dd>เต็มหน้าจอ</dd><dt>Esc</dt><dd>เปิดตั้งค่าหรือปิดหน้าต่าง</dd></dl>',
      dialogue: npcDialogue,
      vendor: merchant,
    };
    text("dialog-title", titles[panel]);
    dialog.classList.toggle("skill-dialog", panel === "skills");
    dialog.classList.toggle("character-dialog", panel === "character");
    dialog.classList.toggle("inventory-dialog", panel === "inventory");
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

  function runAction(action, id) {
    switch (action) {
      case "inventory":
      case "quests":
      case "character":
      case "reset-character":
      case "reset-levels":
      case "help":
      case "settings":
      case "skills":
      case "auto-settings": openPanel(action); return;
      case "quest-owner":
        if (!questActionLabels[state.trackedQuest.status]) return;
        if (dialog.open) dialog.close();
        game.interact(state.trackedQuest.npcId);
        renderHUD();
        return;
      case "accept-quest":
        if (game.acceptQuest()) {
          dialog.close();
          canvas.focus({ preventScroll: true });
          renderHUD();
          notify("รับภารกิจแล้ว");
        }
        return;
      case "inventory-select": selectedItem = id; break;
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
      if (action === "skill-tab") $("dialog-content").scrollTop = 0;
      const itemButton = panel === "inventory" ? $("dialog-content").querySelector('.bag-slot[aria-pressed="true"]') : null;
      const statButton = panel === "character" ? $("dialog-content").querySelector('[data-action="confirm-stats"]:enabled') : null;
      (replacement ?? slotButton ?? itemButton ?? statButton ?? $("dialog-close")).focus({ preventScroll: true });
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
    if (!dialog.open) { panel = null; pendingStats = {}; keys.clear(); bagContext.hidden = true; }
  });
  dialog.addEventListener("contextmenu", (event) => {
    const slot = event.target.closest('[data-action="inventory-select"]');
    if (panel !== "inventory" || !slot) return;
    event.preventDefault();
    const { id } = slot.dataset;
    const item = state.items[id];
    bagDiscardButton.dataset.id = id;
    bagDiscardButton.disabled = game.discardableItemCount(id) === 0;
    const reason = $("bag-context-reason");
    reason.hidden = !bagDiscardButton.disabled;
    reason.textContent = state.player.equipment[item.slot] === id ? "กำลังสวมอยู่" :
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
    try { localStorage.setItem(displayKey, JSON.stringify(displaySettings)); } catch {}
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || dialog.open) return;
    const { x, y, entity, kind } = world.hit(event.clientX, event.clientY);
    if (kind === "enemy") {
      game.setAuto(false);
      game.selectTarget(entity.id);
      game.attack();
    } else if (kind === "npc" || kind === "portal") {
      game.interact(entity.id);
    } else if (Number.isFinite(x) && Number.isFinite(y)) {
      game.moveTo(x, y);
    }
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    world.zoomBy(event.deltaY > 0 ? 0.93 : 1.075);
  }, { passive: false });

  const shortcuts = { KeyV: "inventory", KeyC: "quests", KeyB: "character", KeyH: "help", KeyK: "skills",
    Space: "attack", KeyF: "talk", Escape: "settings" };
  const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  document.addEventListener("keydown", (event) => {
    const { code } = event;
    if (event.ctrlKey || event.metaKey || event.altKey || (code === "Space" && event.target.closest?.("button"))) return;
    if (dialog.open) {
      const action = shortcuts[code];
      if (["inventory", "quests", "character", "help", "skills"].includes(action) && !event.repeat) {
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
  window.addEventListener("blur", () => keys.clear());
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
      world.drawMinimap(minimap, state);
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

