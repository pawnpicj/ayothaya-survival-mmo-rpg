/* Source crops use the original concept sheets without modifying their pixels. */
(() => {
  "use strict";

  const sheets = {
    player: { src: "assets/concepts/player-concepts.png", sheet: [1536, 1024] },
    npc: { src: "assets/concepts/npc-concepts.png", sheet: [1774, 887] },
    monster: { src: "assets/concepts/monster-concepts.png", sheet: [1312, 1199] },
  };

  const actors = [
    {
      id: "one-handed-swordsman", name: "นักดาบมือเดียว", role: "ตัวละครชายในเกม", group: "player",
      src: "assets/sprites.png", sheet: [384, 192], rect: [26, 13, 46, 73],
      weapon: "rusty_sword", motions: ["idle", "walk", "attack", "heavy"],
    },
    {
      id: "khram", name: "คราม", role: "นักดาบฝึกหัด", group: "player", style: "swordsman",
      rect: [123, 8, 490, 1004], height: 1, anchor: [0.60, 0.994],
      motions: ["idle", "walk", "attack", "cast", "hurt", "fall"],
    },
    {
      id: "mali", name: "มะลิ", role: "นักดาบฝึกหัด", group: "player", style: "swordsman",
      rect: [938, 40, 449, 972], height: 1, anchor: [0.34, 0.994],
      motions: ["idle", "walk", "attack", "cast", "hurt", "fall"],
    },
    {
      id: "lung-kham", name: "ลุงขาม", role: "ผู้ให้ภารกิจ", group: "npc", style: "elder",
      rect: [64, 65, 496, 802], height: 1, anchor: [0.61, 0.992],
      motions: ["idle", "walk", "talk", "gesture"],
    },
    {
      id: "herbalist", name: "แม่ค้าสมุนไพร", role: "ผู้ขายยาและสมุนไพร", group: "npc", style: "merchant",
      rect: [643, 42, 479, 825], height: 1, anchor: [0.45, 0.992],
      motions: ["idle", "walk", "talk", "gesture"],
    },
    {
      id: "gate-guard", name: "ยามประตูท่า", role: "ผู้เฝ้าประตู", group: "npc", style: "guard",
      rect: [1232, 0, 503, 867], height: 1, anchor: [0.47, 0.992],
      motions: ["idle", "walk", "talk", "guard", "attack"],
    },
    {
      id: "tamarind", name: "ลูกมะขามภูต", role: "มอนสเตอร์ Lv. 1", group: "monster", style: "tamarind",
      rect: [115, 57, 363, 330], height: 0.56, anchor: [0.51, 0.982],
      motions: ["idle", "hop", "attack", "hurt", "fall"],
    },
    {
      id: "monkey", name: "ลิงป่า", role: "มอนสเตอร์ Lv. 2", group: "monster", style: "monkey",
      rect: [628, 6, 543, 408], height: 0.65, anchor: [0.48, 0.981],
      motions: ["idle", "walk", "hop", "attack", "hurt", "fall"],
    },
    {
      id: "forest-spirit", name: "นางไม้", role: "มอนสเตอร์ Lv. 3", group: "monster", style: "spirit",
      // Bottom-row silhouettes overlap in x while remaining separated in y.
      rect: [11, 432, 483, 742], clip: [[0, 0], [1, 0], [1, 0.48], [0.955, 0.6], [0.955, 1], [0, 1]],
      height: 0.9, anchor: [0.49, 0.994],
      motions: ["idle", "cast", "hurt", "fall"],
    },
    {
      id: "stone-guardian", name: "ยักษ์ศิลา", role: "มอนสเตอร์ Lv. 5", group: "monster", style: "guardian",
      rect: [474, 423, 820, 746], clip: [[0.03, 0], [1, 0], [1, 1], [0, 1], [0, 0.62], [0.03, 0.46]],
      height: 1.2, anchor: [0.51, 0.992],
      motions: ["idle", "walk", "attack", "guard", "roar", "hurt", "fall"],
    },
  ].map((actor) => ({ ...sheets[actor.group], ...actor }));

  const motions = {
    idle: { id: "idle", name: "ท่าพัก", description: "ขยับตัวเบา ๆ ระหว่างยืนพัก", duration: 1.8, loop: true },
    walk: { id: "walk", name: "เดิน", description: "สลับจังหวะก้าวและถ่ายน้ำหนักอยู่กับที่", duration: 1.1, loop: true },
    attack: { id: "attack", name: "โจมตี", description: "ตั้งท่า พุ่งเข้าหาเป้าหมาย แล้วคืนสู่ท่าพัก", duration: 0.85, loop: false },
    heavy: { id: "heavy", name: "ฟันหนัก", description: "รอยดาบ 5 เฟรม · ประกายปะทะ 4 เฟรม", duration: 0.92, loop: true },
    cast: { id: "cast", name: "ร่ายสกิล", description: "รวบรวมพลังและปล่อยเอฟเฟกต์สกิล", duration: 1.4, loop: false },
    hurt: { id: "hurt", name: "ถูกโจมตี", description: "ชะงักและถอยจากแรงปะทะ", duration: 0.64, loop: false },
    fall: { id: "fall", name: "ล้มลง", description: "เสียหลักและจบท่าที่พื้น", duration: 1.2, loop: false },
    talk: { id: "talk", name: "พูดคุย", description: "เอนตัวและพยักหน้าระหว่างสนทนา", duration: 1.4, loop: true },
    gesture: { id: "gesture", name: "ทักทาย", description: "เอนตัวทักทายแล้วกลับมายืนตรง", duration: 1.15, loop: false },
    guard: { id: "guard", name: "ตั้งรับ", description: "ย่อตัวรับแรงและรักษาท่าป้องกัน", duration: 1.15, loop: true },
    hop: { id: "hop", name: "กระโดด", description: "ย่อตัวก่อนกระโดดและยุบตัวตอนแตะพื้น", duration: 1.0, loop: true },
    roar: { id: "roar", name: "คำราม", description: "ตั้งหลักก่อนคำรามจนเกิดแรงสั่นสะเทือน", duration: 1.3, loop: false },
  };

  window.AyothayaPreviewData = { actors, motions };
})();

