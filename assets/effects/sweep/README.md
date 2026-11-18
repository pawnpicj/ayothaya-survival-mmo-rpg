# กวาดดาบ · Sprite Sheet

ImageGen สร้างรอยกวาดทองแดงพื้นโปร่งใส นำมาจัดเป็น 6 เฟรมขนาด 160 × 80 พิกเซล จุดยึดอยู่กลางช่องที่ (80, 40)

- `sheet.png` ขนาด 480 × 160 พิกเซล จัด 3 คอลัมน์ × 2 แถว อ่านจากซ้ายไปขวา
- `frames/` เก็บ PNG แยกเฟรม จากรอยเริ่มกวาดจนถึงสะเก็ดที่จางลง
- `sweep-effect.js` วาดครึ่งหลังไว้ด้านหลังตัวละครและครึ่งหน้าไว้ด้านหน้า ประกายปะทะใช้เฟรมที่มีอยู่และเล่นแยกบนทุกเป้าที่ได้รับดาเมจ

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: production transparent VFX animation sprite sheet for Ayothaya Survival, a warm vintage pixel-art RPG.
Create ONE large landscape RGBA transparent PNG of exactly 6 animation frames in a centered, perfectly regular 3-column × 2-row invisible grid. Equal cells. Reading order left to right, top row then bottom row. Very generous alpha gutter; every frame stays inside its own cell. No grid, labels, UI, people, weapons, terrain, or shadows on a floor.
The action is one broad, very fast circular sword sweep around a player's waist, seen from a 55-degree top-down RPG camera. Every frame has the SAME imaginary pivot at the exact center of its cell. The path is a flattened horizontal ellipse, about 3 times as wide as high, taking 75% of the cell width maximum. Transparent center the whole time. The arc hugs the perimeter so it never hides the player standing in that center. Palette deep bronze, red copper, amber, a sharp thin sunny gold edge and a few ivory chips. Deliberate chunky, stepped pixel clusters and pointed ends. Very little glow, perfectly readable when drawn about 135 pixels wide. It should feel like one fast metallic sword circling at waist height, with warm embers, not a magic portal.
Frame 1 upper left: a narrow, clean bronze arc about one fifth of the way around the ellipse on its rightmost edge. Frame 2 upper center: a strong bright tapered crescent travels across the foreground half of the ellipse, copper body and gold leading edge. Frame 3 upper right: the peak, a full wraparound sweep made of one strong crisp front arc and one thinner darker back arc, with a few gold chips at the fast leading rim. Frame 4 bottom left: the same ellipse and scale, mostly two separate diminishing copper and gold curved sections with airy gaps. Frame 5 bottom center: widely scattered short burnt-orange arc fragments and tiny square sparks along the same ellipse. Frame 6 bottom right: the same ellipse left transparent except three widely spaced dim ember fragments that are about to vanish.
All six cells must genuinely be transparent RGBA outside of the effect, with equal gutters and a consistent pivot. No black or white background, rings stacked vertically, neon, pastel, blood, radial starburst, fog, fireball, or overly smooth gradients.
```
