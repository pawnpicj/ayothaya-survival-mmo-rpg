/* Short, locally synthesized cues for skill starts, strikes, and shield blocks. */
(() => {
  "use strict";

  const preferenceKey = "ayothaya-skill-sound";
  const volume = 0.55;
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
    guard: [
      ["triangle", 220, 220, .21, .14],
      ["sine", 660, 660, .24, .12, .028],
      ["sine", 930, 912, .18, .05, .055],
    ],
    heal: [
      ["sine", 523, 523, .19, .09],
      ["sine", 659, 659, .22, .11, .05],
      ["triangle", 784, 784, .28, .09, .10],
      ["sine", 1047, 1047, .20, .05, .15],
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
  const impacts = {
    heavy: [
      ["triangle", 115, 49, .19, .22],
      ["noise", 650, 225, .14, .25],
      ["sine", 394, 275, .10, .07, .025],
    ],
    sweep: [
      ["noise", 2410, 625, .26, .25],
      ["noise", 1450, 420, .17, .14, .058],
      ["triangle", 225, 140, .19, .09],
    ],
    dash: [
      ["noise", 2540, 710, .22, .27],
      ["triangle", 525, 236, .16, .14, .025],
      ["sine", 103, 62, .15, .12],
    ],
    thrust: [
      ["noise", 2410, 1030, .094, .23],
      ["triangle", 490, 710, .105, .16],
      ["sine", 960, 825, .12, .07, .016],
    ],
    interrupt: [
      ["triangle", 320, 152, .10, .18],
      ["noise", 1630, 530, .09, .24],
      ["sine", 830, 740, .12, .10, .024],
    ],
  };
  const miss = [["noise", 1580, 505, .14, .16]];
  const blocked = [
    ["triangle", 237, 146, .11, .12],
    ["sine", 820, 782, .19, .13],
    ["noise", 1920, 880, .07, .13],
  ];

  function create() {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    let enabled = true;
    try { enabled = localStorage.getItem(preferenceKey) !== "off"; } catch {}
    let context;
    let master;
    let noise;
    let resuming = false;
    let pending;

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
        if (pending && performance.now() - pending.queuedAt < 220) play(pending.event);
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

    function play(event) {
      if (!enabled || !context || document.hidden) return;
      let voices;
      if (event.type === "skill") voices = starts[event.skill];
      if (event.type === "skill-strike" && impacts[event.skill]) voices = event.contact ? impacts[event.skill] : miss;
      if (event.type === "damage" && event.guarded) voices = blocked;
      if (!voices) return;
      if (context.state !== "running") {
        if (resuming) pending = { event, queuedAt: performance.now() };
        return;
      }
      const start = context.currentTime + .006;
      for (const voice of voices) playVoice(voice, start);
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .014);
      if (enabled) unlock();
      else pending = null;
      try { localStorage.setItem(preferenceKey, enabled ? "on" : "off"); } catch {}
    }

    return { supported: Boolean(AudioContext), get enabled() { return enabled; }, unlock, play, setEnabled };
  }

  window.AyothayaSkillAudio = { create };
})();
