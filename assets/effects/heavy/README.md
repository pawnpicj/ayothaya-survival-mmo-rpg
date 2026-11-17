# ฟันหนัก · Sprite Sheet

ภาพสร้างด้วย ImageGen แบบโปร่งใส รอยดาบและประกายปะทะถูกตัดและย่อเป็นเฟรม RGBA ขนาด 96 × 96 พิกเซล

- `sheet.png` เป็นแอตลาส 288 × 288 พิกเซล มี 3 คอลัมน์และ 3 แถว อ่านจากซ้ายไปขวา
- ช่อง 1–5 คือรอยดาบจากภาพต้นฉบับเฟรม 4–8 เริ่มที่จังหวะปะทะและจางตามช่วงจบท่าตวัดใน GIF อ้างอิง จุดยึดมืออยู่ที่ (24, 44)
- ช่อง 6–9 คือประกายปะทะ 4 เฟรม จุดยึดอยู่ที่ (48, 48) และเล่นเมื่อการโจมตีโดนเป้า
- `frames/` เก็บ PNG แยกเฟรม โดยคงหมายเลข `slash-04.png` ถึง `slash-08.png` ตามภาพต้นฉบับ

## พรอมป์ ImageGen

### รอยดาบ

~~~text
Use case: stylized-concept. Asset type: production VFX sprite sheet for Ayothaya Survival, a warm pixel-art RPG.
Generate a single large wide transparent PNG arranged as an absolutely regular 4-column by 2-row invisible grid of eight equal cells. Reading order is left to right across row one, then across row two. Exactly one sprite in each cell, wholly separated, plenty of clear alpha padding between cells, no lines or borders. These are eight consecutive frames of ONE compact copper-and-gold sword swing aimed right. Its imaginary pivot is consistently at 37% of the cell width and 50% of its height. The blade's trail lives to the right of the pivot; keep the position and overall scale consistent. Row one: 1 a short thin curved copper streak near the upper-right of the pivot; 2 a longer rising ivory-edged stroke; 3 a clean narrow downward crescent with tapered sharp ends; 4 the peak, a decisive thin curved slash with a bright warm-white edge and a few artful gold pixel sparks. Row two: 5 the same arc slightly lower and broken at its ends; 6 a smaller curve of scattered copper flakes; 7 a pair of wispy short diagonal pieces and sparks; 8 just two or three tiny fading fragments. Aim for a quick slicing motion, not a halo: hard-edged deliberate 16-bit pixel clusters, restrained warm palette of dark bronze, saturated copper, sunlit gold and small ivory highlights. The slash should occupy only about half the cell and leave the actor readable when placed in front of their sword. It should read beautifully at about 60 pixels tall in a game. No character, sword, limbs, blood, numbers, labels, text, floor, rings, large white blob, smoke, or glow covering the background. True transparent alpha outside the pixels.
~~~

### ประกายปะทะ

~~~text
Use case: stylized-concept. Asset type: production impact VFX sprite sheet in a warm 16-bit pixel art RPG.
Generate a square RGBA transparent PNG with exactly four discrete sprites arranged as a regular invisible 2-column by 2-row grid of equal cells, wide transparent gutters, each sprite centered on the same impact pivot within its cell. They are consecutive frames of a SINGLE compact copper-gold hit spark. Top left: a small bright crossed spark like a fleck catching the light. Top right: the same spark at its peak, sharp ivory core and five restrained jagged copper and gold rays, with three small squared ember fragments. Bottom left: the core splits into short tapering rays and small flying embers with clear space in the middle. Bottom right: only a handful of tiny separated dim copper pixels fading at the edge. Keep the burst small and sharp, asymmetric and drawn with intentionally stepped hand-placed pixel clusters. Readable at a 24–32 pixel game size. Gold edge, burnt orange copper and hot ivory. No character, floor, ring, bounding box, typography, backdrop, big cloud or gradients across the frame. True transparent alpha outside the art.
~~~
