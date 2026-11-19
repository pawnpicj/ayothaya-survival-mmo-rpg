/* Combat samples and synthesized skill cues. */
(() => {
  "use strict";

  const preferenceKey = "ayothaya-skill-sound";
  const volumeKey = "ayothaya-sound-volume";
  const samples = {
    sword: { file: "sword sound.wav", voices: 3 },
    monster: { file: "animal melee sound.wav" },
    critical: { file: "critical__strike4.wav", voices: 6 },
    recovery: { file: "heal-rpg.wav" },
  };
  // Each voice is [waveform, start Hz, end Hz, duration, gain, delay].
  const starts = {
    heavy: [
      ["triangle", 160, 275, .12, .11],
      ["noise", 380, 910, .10, .14, .025],
    ],
    sweep: [
      ["noise", 580, 1720, .14, .17],
      ["sine", 189, 247, .13, .05, .02],
    ],
    dash: [
      ["noise", 285, 2240, .15, .20],
      ["triangle", 126, 540, .12, .08, .025],
    ],
    thrust: [
      ["triangle", 430, 830, .066, .085],
      ["noise", 830, 2650, .09, .16, .018],
    ],
    interrupt: [
      ["triangle", 525, 292, .07, .11],
      ["triangle", 630, 476, .08, .075, .047],
    ],
  };
  const miss = [["noise", 1580, 505, .14, .16]];
  const blocked = [
    ["triangle", 237, 146, .11, .12],
    ["sine", 820, 782, .19, .13],
    ["noise", 1920, 880, .07, .13],
  ];
  const bossImpacts = {
    "pret-slam": [
      ["triangle", 96, 39, .26, .27],
      ["noise", 690, 148, .24, .30],
      ["sine", 143, 51, .24, .14, .026],
    ],
    "tail-sweep": [
      ["noise", 2100, 520, .27, .25],
      ["noise", 3200, 960, .17, .13, .045],
      ["sine", 780, 350, .12, .055, .085],
      ["sine", 1020, 570, .085, .04, .16],
    ],
  };
  function create() {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    let enabled = true;
    let volume = 0.55;
    try {
      enabled = localStorage.getItem(preferenceKey) !== "off";
      const savedVolume = localStorage.getItem(volumeKey);
      if (savedVolume !== null && Number.isFinite(Number(savedVolume))) {
        volume = Math.max(0, Math.min(1, Number(savedVolume)));
      }
    } catch {}
    const clips = {};
    function makeClip(cue) {
      const clip = new window.Audio("assets/audio/" + encodeURIComponent(samples[cue].file));
      clip.preload = "auto";
      clip.volume = volume;
      return clip;
    }
    if (window.Audio) {
      for (const cue of Object.keys(samples)) clips[cue] = [makeClip(cue)];
    }
    let context;
    let master;
    let noise;
    let resuming = false;
    let pending;
    let lastCritical = -Infinity;

    function unlock() {
      if (!enabled || !AudioContext || context?.state === "running" || resuming) return;
      if (!context) {
        try { context = new AudioContext(); } catch { return; }
        master = context.createGain();
        master.gain.value = volume;
        master.connect(context.destination);
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .28), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
      }
      resuming = true;
      context.resume().then(() => {
        if (enabled && !document.hidden && pending && performance.now() - pending.queuedAt < 220) {
          playVoices(pending.voices);
        }
      }).catch(() => {}).finally(() => {
        resuming = false;
        pending = null;
      });
    }

    function playVoice([waveform, fromHz, toHz, duration, level, delay = 0], start) {
      const time = start + delay;
      const isNoise = waveform === "noise";
      const source = isNoise ? context.createBufferSource() : context.createOscillator();
      const envelope = context.createGain();
      let filter;
      if (isNoise) {
        source.buffer = noise;
        filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = .78;
        source.connect(filter);
        filter.connect(envelope);
      } else {
        source.type = waveform;
        source.connect(envelope);
      }
      const pitch = (filter ?? source).frequency;
      pitch.setValueAtTime(fromHz, time);
      pitch.exponentialRampToValueAtTime(toHz, time + duration);
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.linearRampToValueAtTime(level, time + Math.min(.012, duration / 5));
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      envelope.connect(master);
      source.onended = () => {
        source.disconnect();
        filter?.disconnect();
        envelope.disconnect();
      };
      source.start(time);
      source.stop(time + duration);
    }

    function playVoices(voices) {
      if (!context) return;
      if (context.state !== "running") {
        if (resuming) pending = { voices, queuedAt: performance.now() };
        return;
      }
      const start = context.currentTime + .006;
      for (const voice of voices) playVoice(voice, start);
    }

    function playSample(cue) {
      const pool = clips[cue];
      if (!pool) return;
      const limit = samples[cue].voices;
      let clip = limit ? pool.find(voice => voice.paused || voice.ended) : pool[0];
      if (!clip && pool.length < limit) {
        clip = makeClip(cue);
        pool.push(clip);
      }
      if (!clip) return;
      clip.currentTime = 0;
      clip.play().catch(() => {});
    }

    function play(event, time = performance.now() / 1000) {
      if (!enabled || document.hidden) return;
      let cue;
      let voices;
      if (event.type === "skill") {
        if (event.skill === "guard" || event.skill === "heal") cue = "recovery";
        else voices = starts[event.skill];
      } else if (event.type === "skill-strike") {
        if (event.contact) cue = "sword";
        else voices = miss;
      } else if (event.type === "boss-slam") {
        voices = bossImpacts[event.style];
      } else if (event.type === "venom-splash") {
        voices = [["noise", 1750, 480, .22, .17], ["sine", 205, 72, .15, .13], ["triangle", 540, 270, .10, .055, .09]];
      } else if (event.type === "damage") {
        if (event.enemy && event.critical === true) {
          // One accent covers critical hits that land together, such as a sweep.
          if (time - lastCritical < .06) return;
          lastCritical = time;
          cue = "critical";
        } else if (event.enemy && event.skill === null) {
          cue = "sword";
        } else if (event.enemy === false && event.status !== "bleed" && event.status !== "poison") {
          if (!event.area) cue = "monster";
          if (event.guarded) voices = blocked;
        }
      }
      playSample(cue);
      if (voices) playVoices(voices);
    }

    function updateGain() {
      if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .014);
    }

    function setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(1, value));
      for (const clip of Object.values(clips).flat()) clip.volume = volume;
      updateGain();
      try { localStorage.setItem(volumeKey, String(volume)); } catch {}
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      updateGain();
      if (enabled) unlock();
      else {
        pending = null;
        for (const clip of Object.values(clips).flat()) clip.pause();
      }
      try { localStorage.setItem(preferenceKey, enabled ? "on" : "off"); } catch {}
    }

    return { supported: Boolean(window.Audio || AudioContext), get enabled() { return enabled; },
      get volume() { return volume; }, unlock, play, setEnabled, setVolume };
  }

  window.AyothayaSkillAudio = { create };
})();
