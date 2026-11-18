# ฟันสกัด · Sprite Sheet

ImageGen สร้างรอยฟันตัดกันสีม่วงเงินและสะเก็ดพื้นโปร่งใส นำมาจัดเป็น 6 เฟรมขนาด 96 × 96 พิกเซล จุดยึดปะทะอยู่กลางเฟรมที่ (48, 48)

- `sheet.png` ขนาด 288 × 192 พิกเซล จัด 3 คอลัมน์ × 2 แถว อ่านจากซ้ายไปขวา
- `frames/` เก็บ PNG แต่ละเฟรม ตั้งแต่รอยแรก รอยตัดกัน จนถึงสะเก็ดสุดท้าย
- เกมและ Preview ใช้ตัววาดเดียวกันเพื่อวางภาพตรงจุดที่ฟันโดน

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: original transparent pixel-art action VFX sprite sheet for the Counter Slash ability in Ayothaya Survival.
Generate a single landscape RGBA PNG, exactly 3 columns by 2 rows of same-size invisible square cells. Six isolated consecutive frames in reading order. All effects share a stationary impact pivot at the exact center of their cell. No grid, label, UI, letters, symbols, crossed swords, characters, weapons, blood, setting, checkerboard, background, or shadows.
One fast pair of tight diagonal strikes meeting in a compact X at the impact point, a sharp metallic lavender-silver and pale ivory palette with deep violet/charcoal edges, only a few tiny amber fragments. Both diagonal cuts are curved, narrow, and visibly taper to sword-motion points, not thick block letters. A strong readable silhouette at only 56–70 screen pixels. Bold 16-bit pixel clusters, clean stair-stepped edges, generous transparent gaps. Very restrained glow immediately around the cut edges only. Keep each frame under 72 percent cell width and height, with completely clear gutters.
Frame 1 top left: one slender lavender and white diagonal slash angles down-right, its center at the impact point. Frame 2 top center: a second rising diagonal slash has just crossed the first, a decisive, distinct full peaked X with a small warm-white accent at its center. Frame 3 top right: the split cross still reads, its center flashing once, with two sharp violet fragments breaking from its ends. Frame 4 bottom left: four broken tapered slash fragments arcing away from the same center and a tiny amber chip. Frame 5 bottom center: a few separated lavender and amber shards dissipate. Frame 6 bottom right: only three tiny faint gold and violet pixels remain. No ring, no whirlwind, no aura, no giant flare, no broad gradients in the transparent area. A hand-placed pixel RPG effect, true transparent alpha off the painted pixels.
```
