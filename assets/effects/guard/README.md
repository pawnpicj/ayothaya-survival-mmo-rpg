# กันภัย · Sprite Sheet

ImageGen สร้างตราโล่สีหยกและประกายปะทะพื้นโปร่งใส นำมาจัดเป็น 6 เฟรมขนาด 112 × 112 พิกเซล จุดยึดกลางช่องที่ (56, 56)

- `sheet.png` ขนาด 336 × 224 พิกเซล จัด 3 คอลัมน์ × 2 แถว
- แถวแรกเป็นเฟรมประกอบโล่ 3 เฟรม เฟรมสุดท้ายใช้แสดงว่ากันภัยยังทำงานอยู่
- แถวสองเป็นประกายรับแรงโจมตี 3 เฟรม เกมวางประกายด้านที่ศัตรูเข้ามา
- `frames/` เก็บ PNG แยกเฟรมของโล่และประกาย

## พรอมป์ ImageGen

```text
Use case: stylized-concept. Asset type: production transparent skill-effect sprite sheet for Ayothaya Survival, a warm hand-drawn pixel art RPG.
Create one landscape RGBA PNG of exactly six independent effects placed in a precise equal 3-column by 2-row invisible grid, reading left to right, top row then bottom row. No overlap, all frames whole and plenty of true transparent padding within their cells. All artwork composed around the exact center of each cell. No lettering, labels, grid, people, items, armor, terrain, or shadows.
Top row is three stages of a SINGLE upright translucent magical shield sigil in front view for a defender, recognizably shield-shaped. Thick colored silhouette only on its perimeter, bright jade-green to mint highlights, tarnished bronze-gold narrow accents on corners, an understated pointed crest and stepped edge geometry inspired by brick-and-gold Thai temple ornament. Thin stepped pixel outline and sparse geometric interior linework at the edge. Keep the ENTIRE central area almost fully transparent so the character behind reads through. Frame 1 top left: scattered mint and jade stepped corner pieces begin drawing the outline at their final positions. Frame 2 top middle: luminous jade shield outline rapidly closes, with a few narrow gold accents. Frame 3 top right: solid stable intact outline for sustained guard, elegant bright mint rim with jade shadow and restrained thin gold solder seams. Top row consistent shield width about 64 percent of each cell and height about 70 percent, centered on same pivot, with a pointed bottom, no visual size jump.
Bottom row is three stages of a SINGLE small directional parry spark on a transparent background, local centered impact point. No shield shape on bottom row. Frame 4 bottom left: short diagonal ivory slash spark with a mint core and two small gold shards. Frame 5 bottom middle: bright compact jade-and-pale-gold shatter flash with four square embers splintering mainly to the right, one signature gold chip. Frame 6 bottom right: a handful of separated small desaturated jade and warm bronze pixels vanishing outward to the right. Compact fragments have clear readable forms at 32-48 display pixels and are only about half a cell in width. Nothing red or fire-like. Authentically chunky deliberate hard-edged 16-bit pixel clusters, restrained highlights, no bokeh or soft large halo or vignette. True transparent alpha outside the drawn pixels.
```
