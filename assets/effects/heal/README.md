# รักษาใจ · Sprite Sheet

ImageGen สร้างใบสมุนไพรและรอยแสงสีทองพื้นโปร่งใส นำมาจัดเป็น 6 เฟรมขนาด 128 × 128 พิกเซล ใช้จุดยึดที่เท้า (64, 104)

- `sheet.png` ขนาด 384 × 256 พิกเซล จัด 3 คอลัมน์ × 2 แถว อ่านจากซ้ายไปขวา
- `frames/` เก็บ PNG แยกเฟรม ตั้งแต่แสงเริ่มขึ้นที่พื้นจนเหลือเพียงสะเก็ดแสง
- เกมและ Preview ใช้ตัววาดเดียวกัน โดยวางสไปรต์หลังตัวละครและยึดตามตำแหน่งเท้า

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: production RGBA particle sprite sheet for the Healing Herbs skill in Ayothaya Survival, a hand-drawn 2D pixel RPG.
One landscape transparent PNG, perfectly regular invisible grid of exactly 3 columns by 2 rows, six isolated animation frames in reading order. Equal cells, generous clear alpha gutters. Every cell uses the same invisible pivot where a character's FEET would be, horizontally centered at x=50%, vertically at y=78% of the cell. Visual effect only. No character, body, hand, item, potions, background, tiles, glyphs, text, numbers, symbols, interface, text-like elements, or borders.
The animation depicts a warm herbal life spell growing from a small, shallow ellipse of sunlight at floor level and curling UP, with clearly recognizable elongated paired green leaves and restrained small square gleams of warm gold. Center open for the player throughout. Each frame fits within x=15%–85% and y=12%–88% of the cell. Rich stepped 16-bit pixels, deeper forest and olive colors on leaf backs, fresh pear and green leaf tips, pale honey glints. Bold leaf silhouettes and clean edges, readable when displayed only 110 pixels across. Soft glow, only immediately around the pixels, and no broad halo or fog.
Frame 1 top left: very small shallow gold-and-green elliptical glint at feet with two young leaf tips poking up. Frame 2 top middle: an opening incomplete shallow amber ellipse around the feet and three leaves curling upward at the outer left and right edge, lowest near boots and highest about halfway up. Frame 3 top right: fullest stage, a thin loose S-shaped upward trail of light and four big dark-to-pear-green herb leaves around the empty center, with a few square gold sparks. Frame 4 bottom left: ring thins away while four leaves sweep outward and rise above the empty center, leaving amber trails. Frame 5 bottom middle: ground almost clear, three small green tips and little gold sparks drift higher. Frame 6 bottom right: only three fading golden pixel motes high in the cell and a tiny leaf fragment. Do not rotate or shift the ground pivot between frames. True transparent alpha all around the effect. No checkerboard, black backdrop, big plus signs, shield, fire, smoke, neon ribbon, or water.
```
