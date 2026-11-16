(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("world");
  const minimap = $("minimap");
  const dialog = $("dialog");
  const autoToggle = $("auto-toggle");
  const game = window.AyothayaGame.create();
  const { state } = game;
  const world = window.AyothayaWorld.create(canvas);
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
  const target = () => state.enemies.find((enemy) => enemy.id === state.targetId && enemy.hp > 0);
  const questStatus = {
    available: "คุยกับลุงขามเพื่อรับภารกิจ",
    active: "ปราบลิงป่า Lv. 1 ในทุ่งริมน้ำ",
    ready: "กลับไปรายงานลุงขาม",
    completed: "ส่งภารกิจเรียบร้อย",
  };
  const attributes = {
    STR: "พลังโจมตี", AGI: "ความคล่องตัว", VIT: "พลังชีวิต",
    INT: "พลังวิชา", DEX: "ความแม่นยำ", LUK: "โชค",
  };
  const itemIcons = { potion: "leaf", elixir: "flame", sword: "blade", seed: "leaf",
    claw: "swords", dust: "star", card: "quest", seal: "shield" };

  function renderHUD() {
    const { player, quest, zoneInfo } = state;
    text("zone-name", zoneInfo.name);
    text("zone-range", zoneInfo.levels);
    text("map-coords", Math.round(player.x / 10) + ", " + Math.round(player.y / 10));
    text("gold", fmt(player.gold));
    text("quest-title", quest.title);
    text("quest-objective", quest.status === "completed" && state.zone === "ruins"
      ? "สำรวจดงเจดีย์ร้าง" : quest.objective ?? questStatus[quest.status] ?? quest.description);
    text("quest-count", quest.status === "available" ? "รับเควสต์" : quest.status === "completed" ? "สำเร็จ" : quest.count + " / " + quest.needed);
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
    if (enemy) {
      text("target-name", enemy.name);
      text("target-level", "Lv. " + enemy.level);
      text("target-hp-text", fmt(enemy.hp) + " / " + fmt(enemy.maxHp));
      fill("target-hp-fill", enemy.hp, enemy.maxHp);
    }

    skillButtons.forEach((button, slot) => {
      const skill = state.skills[slot];
      if (!skill) return;
      const remaining = Math.max(0, skill.remaining || 0);
      button.classList.toggle("on-cooldown", remaining > 0);
      button.classList.toggle("low-mana", skill.cost > player.mp);
      button.title = skill.name + " · " + skill.cost + " มานา\n" + skill.description;
      const name = button.querySelector(".skill-label");
      if (name && name.textContent !== skill.name) name.textContent = skill.name;
      const shade = button.querySelector(".skill-cooldown");
      if (shade) {
        shade.style.setProperty("--cooldown", 100 * Math.min(1, remaining / (skill.cooldown || 1)) + "%");
        shade.textContent = remaining ? remaining.toFixed(remaining < 1 ? 1 : 0) : "";
        shade.hidden = remaining <= 0;
      }
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

  function inventory() {
    const { inventory, equipment } = state.player;
    const allIds = [...new Set([...Object.keys(inventory), ...Object.values(equipment).filter(Boolean)])];
    const entries = allIds.flatMap((id) => {
      const item = state.items[id];
      const count = inventory[id] ?? 0;
      const equipped = Object.values(equipment).includes(id);
      if (!item || (!count && !equipped)) return [];
      const action = equipped ? "" : item.type === "equipment" || item.slot ? "equip"
        : item.type === "consumable" ? "use-item" : "";
      return ['<li class="item-row"><span class="item-glyph" aria-hidden="true"><svg class="icon"><use href="#i-' +
        (itemIcons[item.icon] ?? "bag") + '"></use></svg></span><div><strong>' + escape(item.name) +
        '</strong><small>' + escape(item.description ?? item.desc ?? "") + '</small></div><span>' +
        (equipped ? "สวมอยู่" : "×" + count) + '</span>' +
        (action ? '<button data-action="' + action + '" data-id="' + escape(id) + '">' +
          (action === "equip" ? "สวม" : "ใช้") + "</button>" : "") + "</li>"];
    });
    return '<p class="panel-summary">เงินที่มี <strong>' + fmt(state.player.gold) + ' เบี้ย</strong></p>' +
      (entries.length ? '<ul class="item-list">' + entries.join("") + "</ul>" : "<p>ยังไม่มีไอเทมในกระเป๋า</p>");
  }

  function character() {
    const player = state.player;
    const rows = Object.entries(player.stats).map(([id, value]) => '<li class="item-row"><div><strong>' +
      escape(id.toUpperCase()) + "</strong><small>" + escape(attributes[id.toUpperCase()]) + "</small></div><span>" +
      value + '</span><button aria-label="เพิ่ม ' + escape(id.toUpperCase()) + '" data-action="raise" data-id="' +
      escape(id) + '"' + (player.statPoints > 0 ? "" : " disabled") + ">+</button></li>");
    return '<p class="panel-summary">Base Lv. ' + player.level + ' · Job Lv. ' + player.jobLevel +
      '<br>Job EXP ' + fmt(player.jobXp) + ' / ' + fmt(player.nextJobXp) +
      '<br>แต้มสถานะคงเหลือ <strong>' + player.statPoints + '</strong></p><ul class="item-list">' +
      rows.join("") + "</ul>";
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
      return '<li class="item-row"><div><strong>' + escape(item.name) + (buying ? "" : " ×" + player.inventory[id]) +
        "</strong><small>" + escape(item.description) + "</small></div><span>" + price +
        ' เบี้ย</span><button data-action="' + action + '" data-id="' + id + '"' + disabled + '>' + label + '</button></li>';
    }).join("");
    return "<p>" + escape(dialogue.text) + '</p><p class="panel-summary">เงินที่มี <strong>' + fmt(player.gold) +
      ' เบี้ย</strong></p><h3>ซื้อจากร้าน</h3><ul class="item-list">' + rows(stock, "buy") + "</ul>" +
      (sellable.length ? '<h3>ขายให้ร้าน</h3><ul class="item-list">' + rows(sellable, "sell") + "</ul>" : "");
  }

  function autoSettings() {
    const { range, hpBelow, mpBelow } = state.auto;
    const ranges = [["near", "ใกล้"], ["medium", "กลาง"], ["far", "ไกล"]];
    const options = ranges.map(([value, name]) =>
      '<option value="' + value + '"' + (range === value ? " selected" : "") + ">" + name + "</option>").join("");
    const threshold = (name, label, value) => '<label class="auto-field"><span>' + label +
      '</span><span class="auto-percent"><input type="number" name="' + name +
      '" min="0" max="100" step="1" required value="' + value + '"><span aria-hidden="true">%</span></span></label>';
    return '<form id="auto-form" class="auto-form"><label class="auto-field"><span>ระยะค้นหามอนสเตอร์</span>' +
      '<select name="range">' + options + '</select></label>' +
      threshold("hpBelow", "ใช้ยาฟื้น HP เมื่อต่ำกว่า", hpBelow) +
      threshold("mpBelow", "ใช้น้ำอบฟื้นมานาเมื่อต่ำกว่า", mpBelow) +
      '<p class="muted">ตั้ง 0% เพื่อปิดการใช้ไอเทมชนิดนั้น</p><button type="submit">บันทึก</button></form>';
  }

  function renderPanel() {
    const { quest } = state;
    const titles = { inventory: "กระเป๋าสัมภาระ", quests: "บันทึกภารกิจ", character: "สถานะตัวละคร", help: "วิธีเล่น",
      "auto-settings": "ตั้งค่าการเล่นอัตโนมัติ",
      dialogue: dialogue?.npc.name, vendor: dialogue?.npc.name };
    const content = {
      inventory,
      character,
      "auto-settings": autoSettings,
      quests: () => "<h3>" + escape(quest.title) + "</h3><p>" + escape(quest.description) +
        '</p><p class="panel-summary">' + escape(questStatus[quest.status]) +
        (quest.status === "active" ? " · " + quest.count + " / " + quest.needed : "") + "</p>",
      help: () => '<dl class="key-list"><dt>คลิกพื้น / WASD</dt><dd>เดินและสำรวจ</dd>' +
        '<dt>คลิกศัตรู / Space</dt><dd>เข้าประชิดและโจมตีต่อเนื่อง</dd>' +
        '<dt>1–5</dt><dd>ใช้สกิล</dd><dt>F</dt><dd>คุยหรือเข้าเขตใกล้ตัว</dd>' +
        '<dt>V · C · B</dt><dd>กระเป๋า ภารกิจ สถานะ</dd>' +
        '<dt>ลูกกลิ้ง</dt><dd>ซูมกล้อง</dd>' +
        '<dt>F11</dt><dd>เต็มหน้าจอ</dd></dl>',
      dialogue: () => "<p>" + escape(dialogue.text) + "</p>",
      vendor: merchant,
    };
    text("dialog-title", titles[panel]);
    $("dialog-content").innerHTML = content[panel]?.() ?? "";
  }

  function openPanel(name) {
    if (dialog.open && name === panel && name !== "dialogue" && name !== "vendor") {
      dialog.close();
      return;
    }
    panel = name;
    keys.clear();
    renderPanel();
    if (!dialog.open) dialog.showModal();
  }

  function runAction(action, id) {
    switch (action) {
      case "inventory":
      case "quests":
      case "character":
      case "help":
      case "auto-settings": openPanel(action); return;
      case "auto-toggle":
        game.setAuto(!state.auto.enabled);
        renderHUD();
        return;
      case "close": dialog.close(); return;
      case "fullscreen":
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => notify("กด F11 เพื่อเปิดเต็มหน้าจอ"));
        return;
      case "clear-target": game.setAuto(false); game.selectTarget(null); return;
      case "attack": game.setAuto(false); game.attack(); return;
      case "talk": game.interact(); return;
      case "use-item": game.useItem(id); break;
      case "equip": game.equipItem(id); break;
      case "raise": game.raiseStat(id); break;
      case "buy": game.buyItem(id); break;
      case "sell": game.sellItem(id); break;
      default: return;
    }
    renderHUD();
    if (dialog.open) {
      renderPanel();
      const replacement = [...$("dialog-content").querySelectorAll("[data-action]")]
        .find((button) => button.dataset.action === action && button.dataset.id === id && !button.disabled);
      (replacement ?? $("dialog-close"))?.focus();
    }
  }

  document.addEventListener("click", (event) => {
    const skill = event.target.closest("[data-skill]");
    if (skill) {
      game.useSkill(Number(skill.dataset.skill));
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) runAction(button.dataset.action, button.dataset.id);
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "auto-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    game.configureAuto({
      range: form.get("range"),
      hpBelow: Number(form.get("hpBelow")),
      mpBelow: Number(form.get("mpBelow")),
    });
    dialog.close();
  });
  dialog.addEventListener("close", () => { panel = null; keys.clear(); });
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

  const shortcuts = { KeyV: "inventory", KeyC: "quests", KeyB: "character", KeyH: "help",
    Space: "attack", KeyF: "talk", Escape: "clear-target" };
  const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  document.addEventListener("keydown", (event) => {
    const { code } = event;
    if (event.ctrlKey || event.metaKey || event.altKey || (code === "Space" && event.target.closest?.("button"))) return;
    if (dialog.open) {
      const action = shortcuts[code];
      if (["inventory", "quests", "character", "help"].includes(action) && !event.repeat) {
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
      game.useSkill(Number(code[5]));
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

  game.subscribe((event) => {
    if (event.type === "dialog") {
      dialogue = event;
      openPanel(event.npc.type === "vendor" ? "vendor" : "dialogue");
    } else if (event.type === "damage" && world.screenPoint) {
      const label = document.createElement("span");
      label.className = "damage-number" + (event.enemy ? "" : " hurt");
      label.textContent = fmt(event.value);
      effects.append(label);
      hits.push({ x: event.x, y: event.y, label, start: performance.now() });
    } else if (event.type === "zone") {
      world.resetCamera();
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
      const progress = (now - effect.start) / 680;
      if (progress > 1) {
        effect.label.remove();
        hits.splice(index, 1);
        continue;
      }
      const point = world.screenPoint(effect.x, effect.y);
      effect.label.style.left = point.x + "px";
      effect.label.style.top = (point.y - 35 - 23 * progress) + "px";
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
      const { x, y, dir, moving, action, level, equipment } = state.player;
      sending = true;
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, x, y, zone: state.zone, dir, moving, action, level, weapon: equipment.weapon }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {}).finally(() => { sending = false; });
    }
    setInterval(sendPresence, 180);
  }

  renderHUD();
  requestAnimationFrame(animate);
  openLanPresence();
})();

