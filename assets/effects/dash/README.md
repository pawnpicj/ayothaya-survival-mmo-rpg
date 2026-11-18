# พุ่งแทงใจ · Sprite Sheet

ImageGen สร้างเส้นพุ่งและประกายปะทะพื้นโปร่งใส สไปรต์จัดเป็น 6 เฟรมบนแอตลาส 480 × 160 พิกเซล

- แถวแรกเป็นเส้นพุ่ง 3 เฟรมขนาด 160 × 80 พิกเซล เกมหมุนและปรับความยาวตามเส้นทางที่ตัวละครพุ่งจริง
- แถวสองเป็นประกาย 3 เฟรมขนาด 80 × 80 พิกเซล อยู่กลางช่องแต่ละคอลัมน์ เกมวางไว้ที่เป้าหมายเมื่อแทงโดน จุดยึดอยู่ที่ (40, 40) ของเฟรมประกาย
- `frames/` เก็บ PNG แต่ละเฟรมแยกกัน

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: production original transparent pixel-art VFX sprites for the dash-and-thrust skill of Ayothaya Survival.
One landscape RGBA PNG exactly 3 columns × 2 rows, equal invisible cells, reading left to right. Strong alpha gutters; the individual sprites each occupy only their own cell, with the pixel art facing to the RIGHT. The imaginary centerline is horizontal halfway down every cell. Transparent outside sprite pixels. No character, hands, weapon, damage numbers, typography, glyphs, UI, ground, backdrop, or bounding boxes.
Top row, three successive frames of ONE fast steel-blue horizontal dash streak. It has a tapered tail on the left and a sharp ice-blue tip on the right. Each frame is symmetric in its placement, centered in the cell and across the same length (70–85% of cell width), thin as a narrow knife of air, only around 16–27% of cell height. Frame 1: a swift narrow pair of stepped azure lines with an ivory-blue tip, darker blue afterimage underneath. Frame 2: the strong clean rightward thrust, two tightly aligned hard-edged turquoise and sky-blue bands around an ivory core that quickly tapers away on the left; a few little lateral bright chips. Frame 3: the same horizontal path breaking up into mostly short thin cobalt and mint streak fragments and faint cyan embers, transparently spaced.
Bottom row, three successive frames of ONE compact piercing impact, centered at the tip contact point right in the cell middle. Keep the origin of impact at the EXACT center for all three. Frame 4: a small bright icy crossed spark, blue-white core and two short cyan rays kicking outward to the right. Frame 5: outward-bursting clear rightward mint/cyan crystal-like slivers and a couple of square pale honey chips leaving the point of impact, core still bright. Frame 6: a handful of small fading electric-blue and muted ice pixel chips, separated and trailing to the right. Each impact is compact, no longer than half the cell.
Clean old-school videogame look, deliberate staggered pixel clusters, cobalt shaded edges, cool lake-blue and teal core with a few ivory glints. Big clean readable forms at 120 screen pixels for dash and 34 for impact. No giant cloud, portal, swirl, crescents, blood, lightning bolt icon, 3D blur, vignette, broad glow, oversaturated neon, black background or checkerboard. Truly transparent padding.
```
