(() => {
  "use strict";

  const { actors, motions } = window.AyothayaPreviewData;
  const byId = (id) => document.getElementById(id);
  const catalog = byId("actor-list");
  const animationList = byId("animation-list");
  const timeline = byId("timeline");
  const play = byId("play-toggle");
  const speedControl = byId("playback-speed");
  const zoomControl = byId("zoom");
  const groupButtons = [...document.querySelectorAll("[data-group]")];
  const groundButtons = [...document.querySelectorAll("[data-ground]")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const { pretSlam, chalawan } = window.AyothayaGame;
  const effectStarts = { heavy: .225, sweep: .26, "guard-skill": .62, heal: .30, dash: .24, thrust: .22,
    interrupt: .22, "pret-slam": pretSlam.windup + .13,
    "chalawan-entrance": chalawan.entranceDuration / 2, "tail-sweep": chalawan.slam.windup + .1,
    "chalawan-fall": chalawan.collapseDuration * .72 };
  const stepSize = () => Object.hasOwn(effectStarts, motion.id) ? 1 / 60 : 1 / 24;
  const timeString = (value) => value.toFixed(2) + " วิ";
  const timelineMax = Number(timeline.max);

  const requestedEffect = location.hash === "#guard" ? "guard-skill" : location.hash.slice(1);
  const showEffect = Object.hasOwn(effectStarts, requestedEffect);
  let actor = (showEffect && actors.find(person => person.motions.includes(requestedEffect))) || actors[0];
  let group = actor.group;
  let motion = motions[showEffect ? requestedEffect : actor.motions[0]];
  let elapsed = showEffect ? effectStarts[requestedEffect] : 0;
  let playing = !showEffect && !reduceMotion.matches;
  let speed = Number(speedControl.value) || 1;
  let zoom = Number(zoomControl?.value) || 1;
  let ground = groundButtons.find((button) => button.getAttribute("aria-pressed") === "true")?.dataset.ground || "dark";
  let previousTick = null;
  let frame = null;
  const stage = window.AyothayaPreviewStage.create(byId("preview-canvas"), requestDraw);

  function text(id, value) {
    const element = byId(id);
    if (element && element.textContent !== value) element.textContent = value;
  }

  function mark(button, selected) {
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }

  function makeThumb(person) {
    const wrapper = document.createElement("span");
    wrapper.className = "actor-thumb";
    wrapper.setAttribute("aria-hidden", "true");
    const art = document.createElement("span");
    art.className = "actor-thumb-art";
    const [x, y, width, height] = person.rect;
    const [sheetWidth, sheetHeight] = person.sheet;
    const scale = Math.min(43 / width, 43 / height);
    Object.assign(art.style, {
      display: "block",
      width: width * scale + "px",
      height: height * scale + "px",
      backgroundImage: 'url("' + person.src + '")',
      backgroundSize: sheetWidth * scale + "px " + sheetHeight * scale + "px",
      backgroundPosition: -x * scale + "px " + -y * scale + "px",
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
    });
    if (person.clip) {
      art.style.clipPath = "polygon(" + person.clip.map(([left, top]) =>
        (left * 100) + "% " + (top * 100) + "%").join(", ") + ")";
    }
    wrapper.append(art);
    return wrapper;
  }

  function makeActorCard(person) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "actor-card";
    button.dataset.actor = person.id;
    const info = document.createElement("span");
    info.className = "actor-info";
    const name = document.createElement("strong");
    const role = document.createElement("small");
    name.textContent = person.name;
    role.textContent = person.role;
    info.append(name, role);
    button.append(makeThumb(person), info);
    mark(button, actor.id === person.id);
    return button;
  }

  function renderCatalog() {
    for (const button of groupButtons) mark(button, button.dataset.group === group);
    const visible = actors.filter((person) => person.group === group);
    catalog.replaceChildren(...visible.map(makeActorCard));
    text("actor-count", String(visible.length) + " ตัว");
  }

  function renderMotions() {
    animationList.replaceChildren(...actor.motions.map((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "animation-button";
      button.dataset.animation = id;
      button.textContent = motions[id].name;
      mark(button, motion.id === id);
      return button;
    }));
  }

  function renderSelection() {
    for (const button of catalog.querySelectorAll("[data-actor]")) mark(button, button.dataset.actor === actor.id);
    text("actor-name", actor.name);
    text("actor-role", actor.role);
    byId("preview-canvas").setAttribute("aria-label", actor.name + " · " + motion.name);
    text("animation-name", motion.name);
    text("animation-description", motion.description);
    text("duration-readout", timeString(motion.duration));
  }

  function renderTime() {
    const value = String(Math.round(elapsed / motion.duration * timelineMax));
    if (timeline.value !== value) timeline.value = value;
    const readout = timeString(elapsed);
    if (timeline.getAttribute("aria-valuetext") !== readout) timeline.setAttribute("aria-valuetext", readout);
    text("time-readout", readout);
  }

  function renderPlaying() {
    const label = playing ? "หยุดชั่วคราว" : "เล่น";
    play.dataset.playing = String(playing);
    play.setAttribute("aria-label", label);
    text("play-label", label);
  }

  function draw(now) {
    frame = null;
    if (playing && previousTick !== null) {
      elapsed += Math.min(0.1, Math.max(0, now - previousTick) / 1000) * speed;
      if (elapsed >= motion.duration) {
        if (motion.loop) elapsed %= motion.duration;
        else {
          elapsed = motion.duration;
          playing = false;
          renderPlaying();
        }
      }
    }
    previousTick = playing ? now : null;
    stage.draw(actor, motion, elapsed, { zoom, ground });
    renderTime();
    if (playing) requestDraw();
  }

  function requestDraw() {
    if (frame === null) frame = requestAnimationFrame(draw);
  }

  function setPlaying(next) {
    playing = next;
    previousTick = null;
    renderPlaying();
    requestDraw();
  }

  function resetTimeline(startPlaying) {
    elapsed = 0;
    setPlaying(startPlaying);
  }

  function selectActor(person) {
    actor = person;
    motion = motions[actor.motions.includes(motion.id) ? motion.id : actor.motions[0]];
    renderMotions();
    renderSelection();
    resetTimeline(playing);
  }

  function selectGroup(next) {
    if (next === group) return;
    const first = actors.find((person) => person.group === next);
    if (!first) return;
    group = next;
    actor = first;
    renderCatalog();
    selectActor(actor);
  }

  function selectMotion(id) {
    if (!actor.motions.includes(id)) return;
    motion = motions[id];
    for (const button of animationList.querySelectorAll("[data-animation]")) mark(button, button.dataset.animation === id);
    renderSelection();
    resetTimeline(!reduceMotion.matches || playing);
  }

  function seek(seconds) {
    elapsed = Math.max(0, Math.min(seconds, motion.duration));
    setPlaying(false);
  }

  function togglePlaying() {
    if (playing) setPlaying(false);
    else if (elapsed >= motion.duration) resetTimeline(true);
    else setPlaying(true);
  }

  for (const button of groupButtons) {
    button.addEventListener("click", () => selectGroup(button.dataset.group));
  }

  catalog.addEventListener("click", (event) => {
    const person = actors.find((item) => item.id === event.target.closest("[data-actor]")?.dataset.actor);
    if (person && person !== actor) selectActor(person);
  });
  animationList.addEventListener("click", (event) => {
    const id = event.target.closest("[data-animation]")?.dataset.animation;
    if (id) selectMotion(id);
  });
  play.addEventListener("click", togglePlaying);
  byId("replay").addEventListener("click", () => resetTimeline(true));
  byId("step-back").addEventListener("click", () => seek(elapsed - stepSize()));
  byId("step-next").addEventListener("click", () => seek(elapsed + stepSize()));
  timeline.addEventListener("input", () => seek(Number(timeline.value) / timelineMax * motion.duration));
  speedControl.addEventListener("change", () => {
    speed = Number(speedControl.value) || 1;
    previousTick = null;
  });
  zoomControl?.addEventListener("change", () => {
    zoom = Number(zoomControl.value) || 1;
    requestDraw();
  });
  for (const button of groundButtons) {
    button.addEventListener("click", () => {
      ground = button.dataset.ground;
      for (const choice of groundButtons) mark(choice, choice === button);
      requestDraw();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest?.("button, a, input, select, textarea, [contenteditable]")) return;
    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      togglePlaying();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      seek(elapsed + stepSize() * (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  document.addEventListener("visibilitychange", () => { previousTick = null; });
  reduceMotion.addEventListener("change", (event) => { if (event.matches) setPlaying(false); });
  if (typeof ResizeObserver === "function") new ResizeObserver(requestDraw).observe(byId("stage"));
  else window.addEventListener("resize", requestDraw);

  renderCatalog();
  renderMotions();
  renderSelection();
  renderPlaying();
  renderTime();
  requestDraw();
})();
