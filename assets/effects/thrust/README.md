# แทงใจดำ · Sprite Sheet

ImageGen สร้างแนวคมแทงสีม่วงแดงและประกายปะทะพื้นโปร่งใส แล้วจัดเป็น 6 เฟรมบนแอตลาส 480 × 160 พิกเซล

- แถวแรกเป็นแนวคมแทง 3 เฟรมขนาด 160 × 80 พิกเซล เกมหมุนภาพตามทิศการแทงและปรับความยาวตามระยะถึงเป้า
- แถวสองเป็นประกาย 3 เฟรมขนาด 80 × 80 พิกเซล วางกลางช่องแต่ละคอลัมน์ จุดยึดประกายอยู่กลางเฟรมที่ (40, 40)
- `frames/` เก็บ PNG แต่ละเฟรมแยกกัน

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: an original transparent pixel-art VFX sprite sheet for the stationary blade-thrust skill in the fantasy Ayothaya Survival RPG.
A single landscape RGBA PNG with six isolated animation frames laid out in an exactly regular, invisible 3-column × 2-row grid of equal square cells. Reading left to right in each row. Every frame faces RIGHT. Generous transparent gutters. Razor-sharp hard-edged 16-bit pixel clusters, hand-drawn videogame VFX. Palette deep midnight plum and maroon, saturated wine-red, bright old-rose, with pale coral and small amber-white highlights. A controlled precise sword thrust. True transparency with minimal halo. No character, actual weapon, text, letters, UI, outlines of cells, blood, heart symbols, eyes, smoke, flame balls, vignette, or backdrop.
Top row is the forward line of ONE stationary thrust in 3 consecutive frames, always centered horizontally and at y=50% in its cell. A slender, linear effect length about 80 percent of a cell across, and thickness under 24 percent of a cell. Frame 1: narrow dark-plum streak with a few sharply tapered crimson lines converging toward the right. Frame 2: the peak, a long horizontal maroon diamond-like speed streak with a razor-thin warm rose-white core and sharp point on the right. Its lower edge carries one small antique-gold highlight and a few sharply stepped fragments. Frame 3: the same horizontal track breaking apart into short burgundy and coral slivers and a few tiny amber dots. Keep consistent tail near x=10% and tip near x=90% in all top row cells.
Bottom row is 3 consecutive contact frames of ONE compact puncture spark at the EXACT cell center. Frame 4: a sharp small coral-white cross spark with a deep maroon rim and two pixel shards outward. Frame 5: a strong bright thorn-like star impact from the exact center and three wine-red and old-gold chips flying rightward, strongly horizontal motion. Frame 6: sparse tiny red-purple, dark rose and amber fragments trailing right, quickly fading. Keep fireworks compact under 55 percent of the cell width and the core in the same place. No center fill outside the points, wide glow, or color tint in the transparent gutters.
```
