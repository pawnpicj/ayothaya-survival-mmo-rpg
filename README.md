# Ayothaya Survival

ต้นแบบเกม RPG แฟนตาซีอโยธยาแบบ 2.5D ใช้สไปรต์พิกเซลบนฉากภาพวาดมุมเฉียงทั้งสองเขต ตัวเกมและ HUD ใช้ภาษาไทย

## เปิดเกม

- เล่นคนเดียวโดยเปิด `index.html` ใน Chrome หรือ Edge
- ทดลองออนไลน์ในเครื่องเดียวกันโดยเปิดเทอร์มินัลในโฟลเดอร์เกม รัน `node server.mjs` แล้วเปิด `http://127.0.0.1:4173`
- ทดลองบน LAN โดยรัน `node server.mjs --lan` ให้ผู้เล่นเปิดที่อยู่ LAN ซึ่งแสดงในเทอร์มินัล ผู้เล่นในเขตเดียวกันจะเห็นตำแหน่ง ท่าทาง และดาบที่สวมของกันและกัน

เซิร์ฟเวอร์ใช้ Node.js โดยไม่ต้องติดตั้งแพ็กเกจเพิ่ม ระบบ LAN รุ่นนี้แชร์ตำแหน่งและท่าทาง ส่วนการต่อสู้ เควสต์ ไอเทม และไฟล์เซฟอยู่ในเบราว์เซอร์แต่ละเครื่อง หากต้องการทดสอบด้วยตัวละครคนละเซฟในเครื่องเดียวกันให้ใช้คนละโปรไฟล์เบราว์เซอร์

## เริ่มเล่น

คุยกับลุงขามข้างบันไดวัดที่บ้านท่ามะขามเพื่อรับภารกิจปราบลิงป่า Lv. 1 จำนวน 3 ตัว แล้วกลับมารายงาน เครื่องหมาย **? สีเหลือง** คือมีเควสต์ให้รับ และ **? สีเขียว** คือพร้อมส่งเควสต์ กด **รับเควสต์** หรือ **สำเร็จเควสต์** ในแถบภารกิจเพื่อให้ตัวละครเดินไปคุยกับเจ้าของเควสต์ ในครั้งแรกหน้าต่างจะแสดงรางวัลพร้อมปุ่ม **รับภารกิจ** และ **ไม่รับภารกิจ** แม่ค้าสมุนไพรอยู่หน้าเพิงตลาด เมื่อส่งเควสต์แล้วให้ข้ามสะพานไม้และลอดประตูอิฐทางตะวันออก หรือคลิกประตูดงเจดีย์ร้าง ขากลับให้เดินลอดซุ้มฝั่งซ้ายของดง

ในดงเจดีย์ร้าง คุยกับพรานหม่องเพื่อรับภารกิจกำจัดนางไม้ 10 ตัว และยักษ์ศิลา 5 ตัว แล้วกลับไปรายงานเพื่อเปิดซุ้มทางไป **ป่าช้าวัดร้าง** ด้านตะวันออกเฉียงเหนือ

ในป่าช้าวัดร้าง กำจัดวิญญาณเฝ้าหลุมและอารักษ์ป่าช้ารวม **100 ตัว** ฝูงจะหายไป แล้ว **บอสผีเปรต** จะปรากฏที่ลานพิธีเพียงตัวเดียว หลังปราบบอส **10 วินาที** ฝูงจะเกิดใหม่และเริ่มนับรอบถัดไป ดูตัวนับและเวลารอได้จากแถบภารกิจ เกมบันทึกความคืบหน้าตามตัวละคร บอสมีโอกาสดรอปการ์ด **0.025%** ออกจากป่าช้าได้ทางซุ้มฝั่งซ้ายหรือใช้คัมภีร์กลับเมือง

เมื่อปราบผีเปรตจะได้ **กุญแจผี 1 ดอก** หากในกระเป๋ายังไม่มีกุญแจ กลับไปดงเจดีย์ร้างแล้วคลิกซุ้มอิฐฝั่งซ้ายบน หรือกด **F** เมื่ออยู่ใกล้ เพื่อใช้กุญแจเปิดทางไป **ท่าเรือท่าข้าม** ประตูจะเปิดค้างตามเซฟตัวละคร ทางกลับอยู่ซุ้มฝั่งซ้ายของท่าเรือ

ที่ท่าเรือ คุยกับ **นายท่าอิน** ข้างบันไดศาลาริมน้ำเพื่อรับภารกิจ **เรือเที่ยวสุดท้าย** คลิกหีบสินค้าฝั่งตะวันออก หรือกด **F** ใกล้หีบ เมื่อเก็บหีบแล้ว **ชาละวัน** จะกระโจนขึ้นกลางลาน หลบออกนอกวงเตือนตอนชาละวันฟาดหาง หลังปราบสำเร็จ ให้นำหีบกลับไปส่งนายท่าอินเพื่อเปิดจุดขึ้นเรือ ความคืบหน้าและสถานะจุดขึ้นเรือบันทึกในเซฟตัวละคร

ชาละวันกัดโดนจะทำให้เลือดไหลทุกครั้ง เสีย HP ทุกวินาทีเป็นเวลา 3 วินาที โดยแต่ละครั้งเสีย 15% ของดาเมจที่ได้รับจากการกัด เมื่อโดนกัดซ้ำ ระยะเวลาเลือดไหลจะเริ่มนับใหม่

ชนะชาละวันครั้งแรกจะได้ **เกราะหนังเจ้าแห่งลุ่มแม่น้ำ** (DEF +5, HP สูงสุด +50) และ **การ์ดชาละวัน** (ATK +5 และดาเมจ +15% ต่อศัตรูที่เลือดออก) โบนัส 15% ใช้กับการโจมตี สกิล และดาเมจเลือดออก เซฟเดิมที่จบเควสต์แล้วคุยกับนายท่าอินเพื่อท้าชาละวันรับรางวัลได้

หลังส่งเควสต์แล้ว คลิก **จุดขึ้นเรือ** ที่ศาลาริมน้ำ หรือกด **F** เมื่ออยู่ใกล้ แล้วเลือก **ขึ้นเรือ** เพื่อไป **ป่าจากน้ำกร่อย** ขาไปเที่ยวแรกฟรี เที่ยวถัดไป 20 เบี้ย จากปลายทางใช้ป้าย **เรือกลับท่าข้าม** ขากลับฟรีทุกเที่ยว

หลังจบ **เรือเที่ยวสุดท้าย** ให้ขึ้นเรือไป **ป่าจากน้ำกร่อย** แล้วคุยกับ **ครูเข้ม** ครูฝึกทหารใหม่ที่อยู่ใกล้ท่าน้ำเพื่อรับ **ทดสอบการเป็นทหาร** กำจัดงูเห่า 10 ตัวและนางพญางูเห่า 1 ตัว สลับลำดับได้ จากนั้นกลับไปรายงานครูเข้มที่เดิมเพื่อรับ **ป้ายรับรองเป็นทหารใหม่ 1 ชิ้น 450 Base EXP และ 225 Job EXP** เซฟจากบทก่อนเก็บจำนวนที่กำจัดไว้และนับต่อจนครบเป้าใหม่

บนลานดินในป่าจากน้ำกร่อยมี **งูเห่า Lv. 35 (HP 450)** จำนวน 6 ตัว กระจายห่างจากจุดลงเรือ เมื่อเข้าใกล้ งูจะเลื้อยเข้าหา ง้างหัว แล้วฉก ผู้เล่นที่ถูกฉกจะติดพิษ เสีย HP ทุกวินาที 4 ครั้ง ครั้งละ 10% ของดาเมจจากการฉก (ปัดเป็นจำนวนเต็ม ขั้นต่ำ 1 HP) การฉกซ้ำเติมจำนวนครั้งกลับเป็น 4 และคงจังหวะดาเมจพิษเดิม

**นางพญางูเห่า Lv. 40 (HP 6,800)** สุ่มเกิดหนึ่งใน 4 จุดหลังเข้าป่าจากน้ำกร่อยครั้งแรก 25–55 วินาที หลังปราบแล้วสุ่มเกิดใหม่ใน 90–150 วินาที ท่า **พ่นพิษลงพื้น** ล็อกพื้นที่ ณ ตำแหน่งผู้เล่นตอนเริ่มง้าง วงเตือนนาน 1.35 วินาที และบ่อพิษอยู่ 6 วินาที ผู้เล่นที่อยู่ในบ่อเสีย 14% ของ HP สูงสุดเมื่อพิษตกถึงพื้นและทุก 0.6 วินาทีที่จังหวะดาเมจ ถอยออกนอกวงเพื่อหยุดรับดาเมจจากบ่อ

เมื่อผีเปรตเตรียม **ทุบพื้น** จะมีวงเตือนรัศมี **160 หน่วย** รอบตัวบอส ผู้เล่นที่อยู่ในวงตอนปะทะจะติดสตัน **0.08 วินาที** การโจมตีปกติที่โดนมีโอกาส **0.2%** ให้ติดสตัน **0.01 วินาที**

เบี้ยจากการปราบมอนสเตอร์ ส่งภารกิจ และขายของให้ร้านลดลงครึ่งหนึ่งโดยปัดลง ถ้า Base Lv. ของผู้เล่นสูงกว่ามอนสเตอร์ **10–14 เลเวล** จะได้รับ Base EXP และ Job EXP **70%** ของเรตปัจจุบัน ถ้าสูงกว่า **15 เลเวลขึ้นไป** จะไม่ได้ EXP จากการกำจัดตัวนั้น

เข้าลานฝึกผ่านวาร์ปข้างซุ้มฝั่งซ้ายของบ้านท่ามะขาม ลองโจมตีหุ่นไล่กา 3 ตัว ตัวละ 999,999 HP ปุ่ม **คูลดาวน์สกิล** และ **ใช้มานา** สลับเปิดหรือปิดแยกกันได้ภายในลาน เมื่อปิดใช้มานาจะกดสกิลที่ปลดล็อกแล้วได้แม้มี 0 MP และ Auto จะไม่ใช้น้ำอบฟื้นมานา หุ่นแต่ละตัวฟื้น HP เต็มหลังผ่าน 5 วินาทีจากดาเมจครั้งล่าสุด หรือทันทีเมื่อตีจน HP หมด วาร์ปฝั่งซ้ายของลานพากลับบ้านท่ามะขาม

เมื่อเลือกหุ่น แถบเป้าหมายแสดงระยะเส้นตรงถึงหุ่นกับระยะเริ่มโจมตีปกติ ใช้หน่วยพิกัดแผนที่และไม่เปลี่ยนตามการซูม กด **K** ดูระยะเริ่มใช้สกิลหรือรัศมีสกิลรอบตัว

เมื่อกำจัดศัตรูที่มีการ์ดในตารางดรอป เกมจะสุ่มหนึ่งครั้งต่อการกำจัด มอนสเตอร์ทั่วไปมีโอกาส **0.01%** และบอสที่กำหนด `boss: true` มีโอกาส **0.025%** ทั้งสองอัตราเป็นค่าคงที่

เปิด [พรีวิวแอนิเมชัน](preview.html) จากไอคอนเล่นบนแถบเมนูเกมเพื่อดูตัวละครและ NPC ที่ใช้ในเกม รวมถึงมอนสเตอร์และบอสตามแผนที่ หน้า Preview อ่านชื่อ เลเวล สเตตัส และเงื่อนไขสกิลจากตัวเกม เลือกท่าแล้วปรับความเร็ว เลื่อนเวลา หรือดูทีละเฟรมได้

กด **เล่น** เพื่อฟังเสียงประกอบท่าโจมตีและสกิล ไอคอนลำโพงใช้เปิดหรือปิดเสียง และ Preview ใช้ระดับเสียงเอฟเฟกต์เดียวกับตัวเกม

เมื่อเพิ่มมอนสเตอร์ บอส หรือนักรบคลาสใหม่ ให้เพิ่มตัวละครและท่าของตัวละครนั้นใน Animation Preview ตาม [กติกาของโปรเจกต์](AGENTS.md)

กด **V** เพื่อเปิดกระเป๋าแบบช่องไอเทม คลิกไอเทมเพื่อดูรายละเอียด ใช้ หรือสวม กด **การ์ด** เพื่อกรองเฉพาะการ์ด เลือกไอเทมที่ใช้หรือสวมได้แล้วกด **ใส่ช่องบน** หรือ **ใส่ช่องล่าง** เพื่อกำหนดช่องลัดข้างแถบสกิล

กด **E** หรือปุ่ม **สวมใส่** ในกระเป๋าเพื่อดูอุปกรณ์และเปลี่ยนอาวุธ ลากไอคอนอาวุธหรือการ์ดจากรายการในหน้าสวมใส่ไปวางในช่องที่ต้องการ หรือใช้ปุ่มสวมตามปกติ Class 1 ใช้ช่องการ์ด 1–2, Class 2 เพิ่มช่อง 3 และ Class 3 เพิ่มช่อง 4 ใส่การ์ดซ้ำได้ตามจำนวนใบที่มี และโบนัสจากทุกช่องจะรวมกัน

ซื้อ **คัมภีร์กลับเมือง** จากแม่ค้าสมุนไพรใบละ **20 เบี้ย** แล้วใส่คัมภีร์ลงช่องลัดหรือกด **ใช้** ในกระเป๋าเพื่อกลับจุดเริ่มต้นของเมืองที่ใกล้ที่สุด ใช้ครั้งละหนึ่งใบ

คลิกขวาที่ไอเทมในกระเป๋าแล้วเลือก **ทิ้ง** ระบุจำนวนและกด **ยืนยันการทิ้ง** เพื่อลบไอเทมออกถาวร เกมจะเก็บชิ้นที่สวมอยู่และดาบฝึกหัดประจำตัวไว้

กด **Auto** เพื่อค้นหามอนสเตอร์และเดินเข้าระยะโจมตี ปุ่มตั้งค่าข้าง Auto ใช้เลือกระยะค้นหาใกล้ กลาง หรือไกล และกำหนดเปอร์เซ็นต์ใช้ยาสมุนไพรกับน้ำอบมนตราจากกระเป๋าแยกกัน ค่าเริ่มต้นคือ HP 50% และมานา 40% ใช้ไอเทมเมื่อค่าต่ำกว่าเปอร์เซ็นต์ที่ตั้งไว้ และตั้ง 0% เพื่อปิดการใช้ไอเทมชนิดนั้น การสั่งเดินเองจะปิด Auto

ในหน้าตั้งค่า **Auto** เลือกสกิล Active ที่เปิดใช้งานแล้วจากดรอปดาวน์ **Skill 1–5** ตามลำดับที่ต้องการให้ Auto ลองใช้ ช่องที่เว้นว่างจะถูกข้าม ระบบลองใช้สกิลที่พร้อมและอยู่ในระยะก่อน ถ้าสกิลโจมตีที่พร้อมใช้ต้องเข้าใกล้กว่าระยะโจมตีปกติ Auto จะเดินต่อจนถึงระยะสกิล ถ้าสกิลพักคูลดาวน์หรือมานาไม่พอ ระบบใช้ระยะโจมตีปกติ รักษาใจทำงานเมื่อ HP ต่ำกว่า 60% กันภัยตรวจระยะโจมตีของศัตรูและพื้นที่อันตราย และฟันสกัดทำงานเมื่อเป้าหมายง้างโจมตีหรือเป็นหุ่นในลานฝึก

นักดาบฝึกหัดถือดาบมือขวาขณะยืน เดิน และโจมตี เมื่อถึง Base Lv. 10 ให้กด **V** เปิดกระเป๋าแล้วสวมดาบสำริด

กด **K** หรือคลิกไอคอนหนังสือในแถบเมนูด้านบนเพื่อเปิดหน้าต่างสกิล เลือก **เปิดใช้งาน** เมื่อ Base Lv., Job Lv. และค่าสเตตัสถึงเงื่อนไขที่แสดงบนการ์ดสกิลในแท็บ **Active** หรือ **Passive** สกิล Active ที่เปิดแล้วใช้กับปุ่มลัดหรือ Auto ได้ ส่วนสกิล Passive จะเริ่มให้โบนัสทันที ในแท็บ Active ลากไอคอนสกิลที่เปิดแล้วไปวางในช่อง 1–5 ด้านบน หรือเลือกช่องก่อนแล้วคลิกสกิล ลากไอคอนในแถบสกิลด้านล่างเพื่อย้ายหรือสลับช่องได้เช่นกัน ปุ่ม **ล้างทั้งหมด** ทำให้ช่องลัดทั้ง 5 ว่าง การเปิดใช้งานและการจัดช่องจะบันทึกพร้อมเซฟเกม

| Base Lv. | สกิลที่ปลดล็อกตามเลเวล |
| --- | --- |
| 10 | ฟันหนัก |
| 15 | กวาดดาบ, กันภัย, รักษาใจ |
| 20 | พุ่งแทงใจ |
| 25 | แทงใจดำ |
| 30 | ฟันสกัด, โจมตีติดเลือด (Passive) |

ฟันสกัดขัดจังหวะและทำให้มอนสเตอร์เดินกับโจมตีช้าลง 30% นาน 4 วินาที เมื่อเปิด Passive โจมตีติดเลือด การโจมตีโดนมีโอกาส 20% ทำให้เลือดไหล 3 วินาที ดาเมจต่อครั้งเท่ากับ 15% ของดาเมจที่ทำได้ การติดซ้ำจะเริ่มนับเวลาใหม่

การโจมตีปกติและสกิลโจมตีของนักรบใช้ไฟล์ `assets/audio/sword sound.wav` เมื่อปะทะ ทั้งแบบกดเองและ Auto เสียงคริติคอลเล่นพร้อมตัวเลขสีทอง เสียงดาบเล่นซ้อนได้สูงสุด 3 เสียงและคริติคอล 6 เสียง ผีเปรตมีเสียงทุบดิน และชาละวันมีเสียงฟาดน้ำในจังหวะกระทบ เสียงเริ่มหลังคลิกหรือกดปุ่มในเกม กด **Esc** หรือปุ่มตั้งค่าถัดจากปุ่มเต็มจอเพื่อปรับคุณภาพภาพ ความสว่าง ระดับเสียง และเปิดหรือปิดเสียงโจมตีและสกิล การตั้งค่าจะบันทึกในเบราว์เซอร์

ในหน้าสถานะ **B** กด **+** เพื่อจัดแต้มและ **−** เพื่อคืนแต้มที่กำลังจัด จากนั้นกด **ยืนยัน** เพื่อบันทึก

กด **B → รีเซ็ตเลเวล** เพื่อตั้ง Base Lv. และ Job Lv. เป็น 1 และ EXP เป็น 0

หน้าสถานะ **B** แสดงเพดาน Base Lv. และ Job Lv. ของ Class ปัจจุบัน Class 1 มีเพดาน **35 / 10**, Class 2 **99 / 35** และ Class 3 **99 / 50** เมื่อถึงเพดาน แถบ EXP ของเลเวลนั้นจะแสดง **MAX** และหยุดสะสม ส่วนเลเวลอีกประเภทจะสะสมต่อจนถึงเพดานของตัวเอง

เริ่มตัวละครใหม่ได้จาก **B → รีเซ็ตตัวละคร → เริ่มใหม่** การเริ่มใหม่จะคืนเลเวล สเตตัส สกิล เควสต์ และไอเทมเป็นค่าเริ่มต้น

| ปุ่ม | การควบคุม |
| --- | --- |
| คลิกพื้น หรือ WASD / ปุ่มลูกศร | เดิน |
| คลิกศัตรู หรือ Space | เลือกเป้าหมายและเข้าประชิดเพื่อโจมตีต่อเนื่อง |
| 1–5 | ใช้สกิลของนักดาบ |
| K | เปิดหน้าต่างสกิลและจัดช่องลัด |
| คลิก NPC / ประตู หรือ F เมื่ออยู่ใกล้ | พูดคุยหรือเปลี่ยนเขต |
| V / C / B | กระเป๋า / สมุดภารกิจ / สถานะตัวละคร |
| E | หน้าสวมใส่และช่องการ์ด |
| ลูกกลิ้ง | ซูมกล้อง |
| Esc / F11 | เปิดตั้งค่าหรือปิดหน้าต่าง / เต็มจอ |

## ทดสอบเกม

ดูรหัส ขั้นตอน และผลที่คาดหวังใน [Test Case](tests/TEST-CASES.md) ชุดอัตโนมัติรันด้วย `node --test tests/game.test.cjs`

## ภาพต้นฉบับ

- `assets/tha-kham-harbor.png` ฉากท่าเรือท่าข้าม สร้างด้วย ImageGen แบบในตัว
- `assets/nipa-landing.png` ฉากจุดขึ้นลงเรือป่าจากน้ำกร่อย สร้างด้วย ImageGen แบบในตัว
- `assets/cobra.png` สไปรต์งูเห่าจาก ImageGen แบบในตัว ช่องละ 96 × 96 พิกเซล จุดยึด (48, 86) เรียงแถวแผ่แม่เบี้ย เลื้อย และฉก
- `assets/cobra-queen.png` สไปรต์นางพญางูเห่า 9 เฟรม ช่องละ 128 × 128 พิกเซล จุดยึด (64, 116)
- `assets/venom-pool.png` สไปรต์บ่อพิษ 6 เฟรม ช่องละ 192 × 96 พิกเซล ทั้งสองแผ่นสร้างด้วย ImageGen แบบในตัว
- `assets/nipa-return-sign.png` ป้ายไม้เรือกลับท่าข้าม สร้างด้วย ImageGen แบบในตัว
- `assets/harbor-npcs.png` สไปรต์ชิด แม่บัว และพ่อค้าเพิ่มจาก ImageGen แบบในตัว ช่องละ 96 × 96 พิกเซล จุดยึดเท้า (48, 86)
- `assets/chalawan-boss.png` สไปรต์ชาละวันพื้นโปร่งใส สร้างด้วย ImageGen แบบในตัว
- `assets/effects/chalawan-tail-sweep/sheet.png` เอฟเฟกต์คลื่นน้ำฟาดหาง 8 เฟรม เรียงซ้ายไปขวาในตาราง 4 คอลัมน์ 2 แถว
- `assets/monkey-attack.png` และ `assets/forest-spirit-attack.png` แอ็กชันตะปบของลิงป่าและฟาดพลังป่าของนางไม้จาก ImageGen แบบในตัว แผ่นละ 4 เฟรม ช่อง 96 × 96 พิกเซล จุดยึด (48, 86)
- `assets/harbor-crate.png`, `assets/pret-ash.png`, `assets/river-lord-armor.png`, `assets/chalawan-card.png` ภาพหีบ ไอคอนเถ้า เกราะ และการ์ด

<details>
<summary>พรอมป์ต้นฉบับสำหรับชาวบ้านท่าเรือ (ImageGen)</summary>

> Use case: stylized-concept. Original Ayothaya Survival RPG NPC sprite atlas. ONE horizontal row of exactly three isolated separate full-body chibi Thai townspeople of equal height, on genuine transparent alpha. Equal-width cells, each figure centered in its cell with generous gutters; all three feet on a perfectly shared baseline. LEFT male dock villager with dusty indigo work wrap and a short length of coiled rope. CENTER female villager with muted green sabai shawl, rust woven skirt and one small wicker basket. RIGHT male merchant in saffron-brown cloth with muted red shoulder wrap and a little coin pouch, friendly middle aged. Old Ayutthaya riverside market clothes. All three face nearly forward, slight three-quarter top-down view, standing relaxed and readable at 58px high. Classic crunchy 32-bit hand-clustered pixel art sprites, dark warm brown contour, chunky heads, short legs, simplified fabric folds. Warm skin and sunlight. No ground shadow, floor, text, borders, UI, backdrop or additional objects between figures. Bodies never overlap. Wide landscape canvas.

</details>

<details>
<summary>พรอมป์ ImageGen ของเอฟเฟกต์และไอเทมชาละวัน</summary>

**ฟาดหาง**

> Use case: stylized-concept. Asset type: eight-frame transparent RPG visual-effect sprite sheet for a giant Siamese crocodile's tail sweep. Draw WATER ONLY, no creature. 4 columns by 2 rows, with all EIGHT frames isolated inside equal square cells exactly at horizontal centers 12.5%, 37.5%, 62.5%, 87.5% and vertical centers 25%, 75%. Equal transparent padding at least 10% on each cell edge to avoid intersections. Each frame has its flattened ground ellipse centered horizontally and at 60% of its cell height. Animation in row-major reading order: F1 slender short curved teal wake at initiation; F2 rising half-loop jade wave with pale foam tips; F3 bright broad crest sweeping in a 3/4 flat elliptical arc; F4 maximum-energy aquamarine water crescent with gold flecks and a few droplets; F5 broad full broken elliptical ring and lower spray; F6 smaller scattered foam and golden dust near ground; F7 two faint low trailing wake segments with some droplets; F8 a sparse fading low trace of foam with widely separated small teal dots. Camera looks down at a fixed 3/4 angle, elliptical arc very wide horizontally. Hard edged hand-clustered retro 32-bit pixel art, golden-wharf reflections and pale ivory blue highlights. Landscape canvas exactly 2:1 overall aspect if supported. Transparent alpha background in every cell. No captions, watermarks, grid marks, gutters with fill, text, panel borders, weapon, character, upright whirlpool, background or ground.

**หีบสินค้า**

> Use case: stylized-concept. Asset type: one isolated quest prop for the original Ayothaya Survival game. Render a battered square teak cargo crate bound by two bands of pale hemp rope, with aged golden brass corner plates, deep seams between the boards, warm reddish timber, and a tiny teal cargo seal on the front. Three-quarter top-down RPG camera with the lid and two faces visible, roughly cubic silhouette readable at 32 px. Draw in crisp warm hand-clustered 32-bit pixel art with dark brown outlines. Center a single crate filling nearly the entire square frame, with a small margin. Transparent alpha background. No text, ground, shadow outside silhouette, scenery or extra objects.

**เถ้าอาคมผีเปรต**

> Use case: stylized-concept. Asset type: one isolated inventory icon for the original Ayothaya Survival game. A squat dark terracotta funerary censer with engraved brass Thai lotus edging, filled with violet-black enchanted ash and a short wisp of orchid-purple spirit smoke shaped like near-vertical flame; a few pinpoint lavender embers close to the bowl. Read clearly at 42 pixels inside an amber-brown RPG inventory, hard-edged hand-clustered 32-bit pixel art, directional highlights, deep outline. Centered single object with a close crop and transparent alpha background. No lettering, plate behind it, border, other objects or cast shadow.

**เกราะหนังเจ้าแห่งลุ่มแม่น้ำ**

> Use case: stylized-concept. Asset type: one isolated wearable torso armor inventory icon for the original Ayothaya Survival game. A sleeveless Thai river champion cuirass constructed from dark moss-green crocodile hide and overlapping bronze-tipped scale panels, fitted reddish-brown leather straps, engraved brass shoulder trim and a small deep green stone at the chest. A compact recognizable armor silhouette in three-quarter view as if shown without a wearer, hard-edged hand-clustered 32-bit pixel art, golden glints, strong dark outline, legible at 44px. Single object centered close in square canvas on transparent alpha. No character, limbs, text, ground, cast shadow or extra objects.

**การ์ดชาละวัน**

> Use case: stylized-concept. Asset type: one isolated original collectible RPG inventory card icon for Ayothaya Survival. A mostly upright worn rectangular teal-and-antique-gold card with small Thai lotus filigree corners and the portrait of a snarling huge golden-eyed olive Siamese crocodile with its long snout pointing right. Crocodile teeth and crimson droplet motif inset into the card border near bottom. Warm hard-edged 32-bit pixel art, high contrast, legible at 44px. Square canvas with one object centered and closely framed, transparent alpha outside card, tiny margin. No type, words, watermark, playing card numbers, extra objects or ground.

</details>

<details>
<summary>พรอมป์สไปรต์งูเห่า</summary>

> Original Ayothaya Survival monster sprite atlas, Thai fantasy pixel RPG. Match the shipped sprite sheet and player art references for sharply grouped pixel shading, deep brown 1-pixel silhouettes, moderate overhead three-quarter view and warm upper-left light. Draw the SAME Siamese monocled cobra facing screen left in all nine images. Dark moss-olive back, amber beige throat scales, ochre rims on flared hood, a round pale marking suggested on rear hood, readable black eyes. EXACTLY 3 columns × 3 rows: equal square cells with generous transparent gutters. Row 1 idle with loosely coiled body and raised open hood, three subtle variations swaying in place. Row 2 slither with head low, three different clearly offset S curves of the trailing body at fixed scale. Row 3 strike: wind-up raised hood with head held back; fast forward bite toward the left with jaws opening and tail still grounded; head pulls back and closes its jaws. The cobra is roughly 45–55 logical pixels tall when upright, formed by few clean pixel clusters and NO blur, in a 96px cell. Lock same body size, isometric angle and ground plane across all cells. Anchor at center of grounded body; strike can extend left from this anchor without overlapping any cell. Genuine transparent alpha, no background, shadows, text, grid marks, particles, or props. Square composition.

</details>

<details>
<summary>พรอมป์ท่าโจมตีลิงป่าและนางไม้</summary>

> Transparent single-row four-frame attack sprite strip for Ayothaya Survival. ORIGINAL small wild macaque monster, match existing monkey in the bottom row third cell of the referenced sprite atlas: chestnut warm brown coat, tan face with eye rims, pale belly, curled tail, big friendly dark eyes, same body size and outline. Same animal facing screen LEFT in each pose, same scale and fixed slightly top-down three-quarter game view, upper-left warm light, grouped hard-edged pixel shading. Exactly four perfectly separated columns with equal cell spacing, genuine transparent alpha. Four poses left-to-right: 1 crouches onto hindlegs visibly low with shoulder drawing back; 2 raises one distinct front paw above and slightly behind the ear, threatening, free paw planted in front, coiled tail; 3 swings that paw forward low toward screen left, stretched silhouette, feet still anchored; 4 compact recovery drawing paw back. No glow, ground, lettering, attack streak, or scenery. Distinct silhouettes; classic pixel sprite with animal about 43 logical pixels tall in a 96 pixel cell. A common grounded body pivot throughout, equal visual pixel density. Landscape 4:1 if possible.

> Transparent single-row four-frame attack sprite strip for Ayothaya Survival. ORIGINAL Thai forest spirit woman same design as rightmost lower-row figure of supplied sprite atlas: jade teal skin and draped pointed leaf textiles, dark teal leafy Thai chada-like updo, tapered ghostly skirt and long narrow arms, soft ivory eye glint. Keep the shipped cyan-teal color family and distinct humanoid silhouette. Same woman faces screen LEFT in each pose, fixed mildly overhead three-quarter RPG camera, upper-left directional light, crisp grouped pixel shading, compact sprite 64 logical pixels tall in a 96 pixel cell. Exactly four separate frames left to right, equal spacing and fully transparent background. 1 gathers both hands toward chest, tilted toward target; 2 lifts one arm diagonally up to shoulder height, other arm drawn in, with tiny mint magic glint in raised palm; 3 thrusts hand sharply LEFT, a small closed mint flash only at fingertips, rooted ghost-tail pivot; 4 lowers arm and relaxes. Same grounded pivot of ghost skirt, same size, cell margins and pixel density. No scenery, text, border, ambient aura, shadows, or unrelated figures. Landscape 4:1 if possible.

</details>

<details>
<summary>พรอมป์สไปรต์นางพญางูเห่าและบ่อพิษ</summary>

> Create a transparent 3-by-3 atlas for the queen cobra boss in Ayothaya Survival, original Thai pixel fantasy, following the supplied regular cobra atlas pose layout and game pixel style. Identical view and three identical objects across each row except poses: this is the SAME powerful giant female king cobra monster. Dark charcoal and jade Malay scales, aged muted gold hood rim and pale gold twin eye markings, angular wide hood, ember amber eyes, elegant small antique Siam gold diadem attached to brow. Thick coiling serpent only. All nine poses face screen LEFT in same three-quarter view with upper-left lighting and bold hard outline. Exactly THREE columns THREE rows, equal 1:1 cells; generous fully transparent gutters. Row 1 raised hood subtle idle variants. Row 2 three low sinuous slither poses with same diadem and body coloration. Row 3 raised wind-up, opened mouth with two clear fangs reaching LEFT with grounded rear coil, pullback recovery. No particles, projectiles, border, background, captions, or cast shadow. Maintain the grounded rear body volume and ground contact across frames. Matte hand-placed 32-bit pixel clusters and no blur. Square image.

> Create one transparent effect atlas in 3 columns by 2 rows, exactly six isolated same-size-cell animation frames, Ayothaya Survival warm Thai isometric 32-bit pixel art. Single magic green venom puddle projected onto the ground as a wide flat ellipse, seen from three-quarter above. Lush acid lime highlights, dark forest green liquid, jade edges, sharp luminous pixel clusters only. Keep broad uneven circular outline, same ground pivot and horizontal scale; about 2.5x as wide as high. First frame fresh green venom splashing and spreading from center, second peak impact outward broken ring with small splashes, frames three through six show same fully open pool with bubbles and clustered poisoned ripples travelling across it, low height. Readable dark rim and varied highlights over a burnt orange dirt map; small green bubbles stay close to the pool. Uniform grid with very wide genuine transparent alpha gutters, no shadows, letters, character, ground, ground warning ring or panels. Landscape 3:2 overall, frames row-major.

</details>

<details>
<summary>พรอมป์สไปรต์ชาละวัน</summary>

> Use case: stylized-concept. Asset type: isolated transparent monster game sprite for the original Ayothaya Survival game. Draw Chalawan, a gigantic squat Siamese river crocodile boss with broad long crocodilian snout, parted jaw and ivory teeth, mossy dark olive and bronze armored back scales, pale khaki underside, one amber eye and a muscular curved tail. Four planted short legs, proud threatening pose. True hard-edged hand-clustered 32-bit pixel art with strong dark outlines and warm late-afternoon golden rim light matching a historical Thai wharf tileset. Fixed elevated three-quarter RPG game camera looking down around 45 degrees; side-oriented head points RIGHT and chest slightly toward camera, with the whole silhouette clear at 120 pixels wide. Landscape composition, a single centered full-body silhouette fills the frame with small transparent margin all around. Render a genuinely transparent background with alpha. No shadow, ground, water, motion effects, scene, words, blood, other figures or extra limbs.

</details>

<details>
<summary>พรอมป์ฉากป่าจากน้ำกร่อย</summary>

> Use case: stylized-concept. Create a distinct, wide 16:9 full-bleed playable background for the original Ayothaya Survival RPG, depicting the ferry landing at Pa Chak Nam Kroy, a brackish nipa-palm forest near historical Ayutthaya. The supplied Thai harbor screenshot is a style reference only. Use detailed hand-clustered 32-bit pixel art, crisp outlines and tightly grouped pixel color, fixed elevated three-quarter view angled down about 55 degrees, late afternoon gold, dark jade mangroves and bright lime nipa fans, teal tidal river with visible ripples, ochre earthen paths and warm old timber. The top third is a gently winding tidal channel, fringed by dense nipa palms and mangrove roots. At the upper center, approximately x=48% of the canvas, y=37% to 49%, build a small rustic Thai wooden ferry dock with a tied long wooden canoe in the water and a short plank ramp whose FOOT opens directly onto broad dry land at x=48%, y=49%. Put ferry huts, poles and pots beside the dock, never in the clearing. The entire rectangle x=24% to 88%, y=49% to 87% is contiguous unobstructed dry ochre earth and short grass, a spacious, visibly walkable landing, with a thin branching dirt path leading right into the nipa grove. At the very edges rich fern clusters, nipa palms, warm roots and occasional broken brick, with restrained glints in the water. This is an uninhabited landing and quieter than Tha Kham, with an unmistakable brackish nipa landscape. No sky, horizon, characters, animals, enemies, signage, letters, interface, grid, beams, borders or watermark. Fully opaque polished environment artwork.

</details>

<details>
<summary>พรอมป์ป้ายเรือกลับท่าข้าม</summary>

> undefined

</details>

<details>
<summary>พรอมป์ฉากท่าเรือท่าข้าม</summary>

> Use case: stylized-concept. Create a new complete full-bleed wide playable environment background for the original game Ayothaya Survival, depicting Tha Kham river harbor (a historical Ayutthaya-era Siamese ferry landing). Highly detailed hand-clustered 32-bit pixel art, fixed three-quarter top-down game camera looking down about 55 degrees, strongly defined pixel edges, consistent scale, no sky, no horizon. Warm golden late-afternoon light over terracotta dirt, evergreen and ochre grass, teal water, teak timber and warm red brick. Maintain a very broad unobstructed earthen public landing in the middle and foreground. The rectangle x=16% to 86%, y=48% to 87% is continuous flat passable dry ground, some wheel tracks and sparse grass only. At the left edge place a small old Ayutthaya brick gateway with a pointed cream-edged arch centered near x=11% of the frame, the foot of its doorway near y=65%. The old gate opens directly onto the same broad clear ground and has a clean dark arch opening for the game to overlay its own portal effect. At the upper edge beyond the playable rectangle show teal river water, moored old Siamese wooden boats, docks, bamboo pilings, stilted timber ferry sheds with sharply peaked Thai gables, and trees. Put any big crates, baskets, and market structures along the far upper or far right edges. Visually distinguish the riverfront from a forest or temple map. No characters, no ghosts, no foreground props in the playable area, no lettering, watermark, interface, border, portals, or beams of light. The art itself is the background texture.

</details>

- `assets/effects/pret-slam/sheet.png` สไปรต์ชีตท่าทุบพื้นของผีเปรต 9 เฟรม สร้างด้วย ImageGen แบบในตัว

<details>
<summary>พรอมป์สไปรต์ชีตทุบพื้น</summary>

> Use case: stylized-concept. Production asset for the original Thai fantasy pixel RPG Ayothaya Survival. Generate exactly NINE isolated frames of a single ground slam VFX animation as a SQUARE 3 by 3 transparent sprite sheet. Read in row-major order. No lettering or panel borders. Each frame belongs entirely inside its equal-size square cell with generous clear padding and its SAME pivot at the horizontal center and 66% of the cell height. Same camera angle and same physical scale in all nine cells, never recenter or auto-scale per frame. Fixed three-quarter top-down game view (ground effect roughly twice as wide as deep). VFX concept: a violent cursed EARTH IMPACT at a haunted brick temple in Siam, with glowing scorched cracks and rocky fragmented dust, muted burnt amber and gold hot edges, shadow violet vapor as accent. Classic hand-clustered 32-bit pixel art, crisp chunky controlled detail drawn to read around 176 pixels wide in game, tonal clusters, no motion blur. Show a hard, uneven shockwave kissing the ground, broken and asymmetrical, with pieces thrown outward and lifted above the floor. Layout: Cell 1 compact ivory-hot burst at pivot with tiny rupture; cell 2 sharp low amber fans and first stone pieces with central white core; cell 3 open angular shockwave of glowing heated ground and chunky rising rocks; cell 4 strongest broad rugged burst with branched fissures, dusty purple-brown plumes rising and rock shards; cell 5 a wide low broken advancing wave, fading bright core, falling debris; cell 6 almost full-radius broken fragments and low dust, bright cracks deadening; cell 7 sparse fading smoke plumes, few settled fragments and faint cracks; cell 8 low isolated smoke wisps, dying embers; cell 9 two or three faint last embers and transparent negative space. Peak artwork fills at most 86% of cell width, widest shockwave stays elliptical and grounded. Smooth progression in width, debris trajectories and intensity between consecutive frames. The rocks and dust should read even over a lighter warm earth map. No character, no boss, no weapon, no closed geometrical neon rings, no perfect circles, no target marker, no floor tile or backing surface, no rectangular full-frame overlays, no environment, text, numbers, logos, panels, grid lines, or duplicate effects within a cell. Actual alpha transparency between frames and around each effect.

</details>

- `assets/abandoned-cemetery.png` และ `assets/pret-boss.png` สร้างด้วย ImageGen แบบในตัว

<details>
<summary>พรอมป์ฉากป่าช้าวัดร้างและบอสผีเปรต</summary>

> Use case: stylized-concept. Create a new wide 16:9 full-bleed playable environment background for Ayothaya Survival, a Thai historical-fantasy pixel RPG. It depicts ป่าช้าวัดร้าง, the cemetery of a ruined Ayutthaya temple. Style reference is the user's cropped orange brick arch amid golden grass: use the same 32-bit detailed hand-clustered pixel-art look and fixed three-quarter overhead camera looking down around 55 degrees, with crisp pixel edges. Use moonlit dusk with warm reddish-orange old Thai brick, olive ground, subtle violet shade and teal overgrowth. A short ruined brick entrance arch by the left edge at about 13% of image width and 65% of image height opens onto an unobstructed earthen path into a wide, almost flat dirt and grass clearing. A weathered low circular brick ritual dais with flat ground in its center sits around 66% from the left, 55% from the top, with clear approaches, for a large boss to later stand on. Put old Thai stupas, little brick memorial shrines and mossy brick wall fragments around the top and outer sides, with mature Thai foliage mixed in only around the edges. Keep the entire middle and lower part from x=17% to 92%, y=47% to 88% spacious and easy to cross, with readable ground so pixel sprites can stand out. Antique Thai architectural silhouettes, decorative cremation chedis at the edge, softly lit playable scene, no horizon or sky. The image is only the empty environment background. No figures, monsters, skeletons, limbs, blood, writing, logos, UI, grid, vignette or border.

> Use case: stylized-concept. Create one genuinely transparent PNG sprite for an original Thai 2.5D pixel RPG, a towering supernatural Thai phi pret (hungry ghost) boss. Whole body in a compact portrait-oriented composition, seen clearly from a three-quarter slightly elevated game angle, facing slightly toward screen right, both feet visible at the same ground level. Striking elongated proportions, tall thin arms with visible claw-like long fingers, hunched shoulders, small ghostly mouth and softly luminous violet eyes, gray-violet skin, ash-black sparse hair swept up, a tattered ankle-length burnt red-and-charcoal sarong, modest cloth wraps, shadowy desaturated lavender coloring and warm amber rim light. Thai folklore fantasy specter, immediately readable as a towering long-limbed figure. Crisp classic 32-bit hand-pixelled art, hard visible clusters, dark selectively outlined silhouette, relatively coarse sprite detail legible when rendered at 110 pixels tall, matching a detailed Thai temple cemetery backdrop. Full unobstructed figure, centered and tightly framed with a little clear transparent padding, no shadow on the ground, no platform, no aura outside silhouette, no glow beyond eyes, no logo, text, border, other character, blood or gore.

</details>

สร้างด้วย ImageGen ใน Codex และใช้แนวทางจาก [AI Game Spritesheets](https://github.com/chongdashu/ai-game-spritesheets) สำหรับการทำภาพอ้างอิงตัวละครหลายทิศและจัดจุดยึดเท้า สไปรต์ในเกมมีท่าหันหลัก 4 ทิศและใช้โค้ดเล่นแอนิเมชันตามสถานะ

- `assets/tha-phraya.png` ใช้ prompt สำหรับฉากเกมพิกเซลแบบ 32-bit มุมมองเฉียงลง 55° มีพระปรางค์อิฐ วิหารหลังคาซ้อนและช่อฟ้า เรือนไม้และร้านค้าริมคลอง ทุ่งโล่งเดินได้ตรงกลาง พร้อมต้นไม้และคันนาในโทนอุ่น
- `assets/tha-phraya-east-gate.png` เป็นฉากหมู่บ้านที่ใช้ในเกม สะพานและทางเดินขึ้นฝั่งเชื่อมถึงประตูอิฐแบบเดียวกับซุ้มในดงเจดีย์ร้าง ภาพสร้างด้วย ImageGen โดยใช้ฉากทั้งสองเป็นภาพอ้างอิง
- `assets/dong-chedi.png` สร้างด้วย ImageGen โดยอ้างอิงมุมกล้อง สี และรายละเอียดจากภาพหมู่บ้าน ปรางค์อิฐและแนวต้นไม้อยู่ด้านหลัง ทางเข้ากับลานต่อสู้อยู่ในพื้นที่เปิด
- `assets/village-bridge.png` เป็นภาพสะพานไม้พิกเซลอาร์ตจาก ImageGen ของแบบร่างทางข้ามหมู่บ้าน
- `assets/sprites.png` ใช้ prompt สำหรับ atlas พื้นโปร่งใส 4 คอลัมน์ × 2 แถว นักดาบผ้าคาดเอวสีทองและโจงกระเบนสีครามหันหน้า ซ้าย ขวา และหลัง ตามด้วยลุงขาม ลูกมะขามภูต ลิงป่า และนางไม้ ปรับขนาดแต่ละช่องเป็น 96 × 96 พิกเซลและจัดจุดยึดเท้าที่ (48, 86)
- `assets/player-anchor.png` ตัดจากภาพนักดาบหันหน้าใน atlas ชุดเดียวกัน
- `assets/ruins-ranger.png` เป็นสไปรต์พรานหม่องจาก ImageGen อ้างอิงขนาด รูปทรง และขอบพิกเซลของตัวผู้เล่น ใช้ช่อง 96 × 96 พิกเซลกับจุดยึดเท้าที่ (48, 86)
- `assets/village-npcs.png` เป็น atlas สไปรต์ลุงขาม แม่ค้าสมุนไพร และยามประตูท่า เรียงจากซ้ายไปขวา ใช้ช่อง 96 × 96 พิกเซลและจุดยึดเท้าที่ (48, 86) เช่นเดียวกับพรานหม่อง
- `assets/inventory-leather.png` เป็นพื้นหนังกระเป๋าขอบทองเหลืองจาก ImageGen
- `assets/town-scroll.png` เป็นไอคอนคัมภีร์กลับเมืองโปร่งใสจาก ImageGen ใช้ร่วมกันในช่องลัด กระเป๋า และร้าน NPC
- `assets/ghost-key.png` เป็นไอคอนกุญแจผีพื้นโปร่งใสขนาด 160 × 160 พิกเซลจาก ImageGen แบบในตัว
- `assets/inventory-icons.png` เป็นแผงไอคอนไอเทมพิกเซลอาร์ต 5 × 2 ช่องจาก ImageGen
- `assets/red-vortex.png` เป็นพื้นผิววังวนแดงโปร่งใสจาก ImageGen หมุนอยู่ในช่องประตูที่พร้อมวาร์ปในเกม

<details>
<summary>พรอมป์ต้นฉบับสำหรับคัมภีร์กลับเมือง (ImageGen)</summary>

> Use case: stylized-concept. Generate exactly one original transparent item icon for Ayothaya Survival, a Thai Ayutthaya fantasy pixel RPG. Square image, isolated, centered, 12% clear alpha padding each side. A warm aged parchment teleport scroll, diagonally tilted from lower left to upper right, loosely rolled ends capped with antique bronze, a short deep teal ribbon and small crimson wax seal near the base. The exposed center has a bold small turquoise portal ring with pale inner glint and a single gold spark, readable as a travel item at 32 pixels; it has NO text, rune lettering, labels, frames, background, UI, hands, or extra objects. Crisp dark umber outer silhouette, compact hand-placed pixel clusters, an amber paper body with at most 4 distinct tone bands, restrained gold highlights, no smooth illustration shading. Make it look like a 48x48 classic inventory sprite upscaled by nearest neighbor. Preserve genuine transparent alpha. Use a near-frontal three-quarter view and balanced diagonal; strong clear shape at handheld game UI size.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับกุญแจผี (ImageGen)</summary>

> Use case: stylized-concept. Create one isolated square inventory icon for Ayothaya Survival, a classic Thai fantasy pixel-art RPG. Ghost Key from a haunted Ayutthaya ruin: one antique tarnished bronze warded key. A skull-shaped bow with two dark eye sockets and tiny violet pinpoints, a small Siamese lotus engraving at the neck, a sturdy worn shaft and two unmistakable blocky key teeth. Set on a diagonal, big skull in the upper-left, key teeth in the lower-right. Antique-gold rim light, warm bronze midtones, deep plum shadows, and one very short lavender wisp tucked against the skull. Crisp hand-clustered 32-bit RPG pixel art, stepped edges, deep outline; bold silhouette legible at 36 pixels on a warm caramel brown inventory slot. Single object, centered close crop with modest even padding, genuine transparent alpha outside the silhouette. No slot, plate, lettering, ground, cast shadow, detached particles, or surrounding fog.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับวังวนแดง (ImageGen)</summary>

> Use case: stylized-concept. Generate a new uniquely drawn game VFX texture for Ayothaya Survival, a red magic portal swirl based on the color and swirling movement in the reference. Only the abstract portal itself. A SINGLE flat face-on circular spinning red vortex, centered in a SQUARE transparent PNG, symmetrically framed with safe transparent margins on all sides. Make imaginative broad curved uneven tapered spiral arcs of very saturated red, blood crimson, dark burgundy and near-black violet, all visibly curling into a tightly glowing white-pink luminous central eye. The core occupies about 16% of the total diameter, the intermediate swept red and deep ruby layers read strongly, and the irregular outer rim dissolves softly into transparent alpha all around. Stylized high-quality 32-bit video-game pixel art, expressive blocky pixel clusters with controlled edge glow, high contrast dark spaces between streaks. Strong readable shapes when tiny. Design it to remain centered while rotating on its axis for a 2D RPG portal animation. It is pure magic, no physical frame/rim/stone/door. DO NOT include any of the reference's humans, text, captions, lower panels, floor, surroundings, border, or frame. No background color, no title text, no icons, no interface, no square vignette, no transparency checkerboard drawn into image. Transparent outside the spiral, crisp red-dark layering, luminous only at the core. One texture, not a grid or multiple variations.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับฉากหมู่บ้านและประตูอิฐ (ImageGen)</summary>

> Use case: precise-object-edit. Edit image 1, the full 16:9 32-bit pixel RPG village map for Ayothaya Survival. Image 2 is the adjacent ruins map and the decorative/architectural reference for its matching gate only. Keep the same exact camera looking down at 55 degrees with no horizon, warm afternoon light, pixel edges, vegetation detail, buildings and scale. Preserve the framing and keep the left 73 percent of image 1 as close to the original as possible: the large Thai village viharn and its stairs left, roofed vendor stalls in the upper middle, the big tree behind them, rice at far left and uninterrupted grassy battle field in the entire lower-left and middle. Make the change within the right-most 27 percent. Create a very clear, continuous physically walkable route going LEFT TO RIGHT east from the village's ochre dirt clearing, onto a single narrow horizontal golden teak bridge over the turquoise canal, up on dry grassy land on the opposite bank, then through an open ruined Ayutthaya red-brick-and-cream-plaster pointed gate made in the exact same style as the little freestanding gateway at lower left of image 2. The bridge must meet solid dry land at BOTH ends with coherent lighting and feet-level connection. Lay out this entire important route around half image height (roughly y=49–55%). Near-bank bridge ramp at around x=77%, center deck around x=82%, bridge far landing around x=88%, small stretch of dry ochre trail behind it and OPEN gate threshold around x=94–95%, leaving a little margin and continuing dirt through it within the image. Both bridge entry and exit deck ends should have nearly the same screen Y so real 2D sprites can walk continuously west to east. Place new red-brick arch and both pillars entirely inside the frame. Facing three-quarter front so the dark open passage reads clearly, warm stone and light ivory trim, a few scattered bricks beside it, no closed door and no obstacle in the doorway. Clear dry ground around the gate below/left/right, solid east bank extends from there to the edge. Water remains visible above and below the bridge and around the new east shoreline. Remove the old far top-right decorative bridge to make only one crossing. Keep the lower two thirds of the village clearing roomy. Traditional Thai fantasy, same pixel art style, sunlight, and vibrant palette as the original. Absolutely no writing, symbols, labels, UI, signboard, characters, actors or NPCs; base game map only. Preserve 16:9 landscape.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับสะพานไม้ (ImageGen)</summary>

> Use case: stylized-concept. A single isolated new walkable pixel-art wooden footbridge asset for Ayothaya Survival. The reference image is the game village background and specifies the EXACT warm sunlit material colors, 32-bit hand-painted pixel edge density and elevated three-quarter RPG camera. Create only a compact Siam canal footbridge styled like the existing bridge in the reference, with its horizontal east-west axis strictly level in screen coordinates, left approach and right approach SAME vertical height, a very low shallow rise in the middle (at most 4% of span). Narrow for one or two chibi people, long horizontal silhouette about four times wider than tall, smoothly weathered warm golden teak individual planks showing their top surface, dark umber structural frame, 3–4 distinct short vertical support piles below, low simple railings of warm bamboo or teak on back and front with just a few posts and rope lashings. From the moderately elevated 55 degree game camera, make the walking surface conspicuous and accessible: broad flat readable deck on the middle band, back guardrails visible above it and front railing much lower and unobtrusive. The viewer should understand people cross from the exact leftmost edge to the exact rightmost edge of the deck. Straight bridge with no arching towers, no doors, no staircase, no stone approach angle. Detailed clusters of clean hard pixel highlights and dark warm outlines. Fully transparent alpha around the silhouette and under the deck. No water, sky, ground, islands, vegetation, shadows outside the bridge silhouette, characters, people, props, interface, letters, symbols, labels or borders. Center the bridge in a wide landscape aspect ratio with extra clear alpha above and below so all rail posts/supports are safely within bounds.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับสไปรต์ NPC หมู่บ้าน (ImageGen)</summary>

> Use case: stylized-concept. Game sprite sheet for Ayothaya Survival, an original Thai fantasy game. Both references are actual in-game 72-pixel-high sprites, one hero and one forest ranger. Use their characteristics as the art target. Create THREE different original village NPC sprites in a SINGLE horizontal row, identical scale, a common ground baseline, completely separated with ample transparent columns between them. Output landscape PNG with transparent alpha. Read at 1:1 as chunky hand-drawn low-resolution 32-bit JRPG pixel art: each individual silhouette should look drawn at only about 42–52 × 72 logical pixels then nearest-neighbor enlarged. Consistent dark nearly-black 1–2-pixel outer outlines, harsh clean nearest-neighbor pixel edges, discrete clusters of two or three shades per material, no gradient, confident large face, compact stout chibi body around 2.5–2.8 heads tall with short sturdy legs and broad feet, same moderately overhead three-quarter front view with faces readily visible and the same upper-left light. All three people warm brown Thai skin tones, ancient Siam town garments, not European fantasy characters. LEFT CELL: Lung Kham the elderly village headman, bowed shoulders, white hair in a short topknot, large silver brows and a round short white beard; ivory cloth draped over muted gold/ochre chong kraben; one curved dark wooden cane with a tiny knot at its top. A stooped readable silhouette and kind steady gaze. CENTER CELL: middle-aged herb seller woman, smiling, large simple broad woven straw hat, jade green cross-wrapped blouse with a plum-purple shoulder sash and deep plum chong kraben; one rounded woven medicine basket held at waist on her right in a clear silhouette, graphic bright cluster of green herbs in the basket. Her face remains fully visible under the hat. RIGHT CELL: tall sturdy village gate guard with strong shoulders, recognizable rust-red cloth tunic, dark umber headcloth, thin muted gold clasps, tan trouser wraps, carrying a short perfectly upright spear and a compact circular woven shield at the sides. Spear tip should extend only modestly above his head so he can have the same body size as the hero. No over-ornamentation or dither on clothing or props. Keep each whole isolated sprite and its props safely inside its third, center them horizontally in their three equal-width cells; put all feet on a shared baseline leaving generous top and bottom transparent margins. No cast ground shadows, sprites only, no landscape, no floor, no white or colored backing, no caption, no labels, no grids, no frames, no watermark. Make these match the pixel edges and proportions in the two references when standing beside them in a game.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับสไปรต์พรานหม่อง (ImageGen)</summary>

> Use case: stylized-concept. Single transparent game-ready character cutout for Ayothaya Survival. Reference image is the exact in-game player sprite and is a stylistic model, not the character to reproduce. Draw a NEW Thai forest ranger NPC to stand right beside this hero. Match the reference's low-resolution 32-bit JRPG sprite dimensions and style again: chunky visible hard-edged pixels on a coherent square pixel grid, dark almost-black 1–2 pixel outer outline, broad shapes, two or three deliberate hard shading levels per material, compact stocky chibi body with the same large head (roughly one-third height), short sturdy legs and big feet, same slightly-downward three-quarter front camera, light from upper-left, full torso and both feet visible. Draw as if artist drew at only 48–54 pixels wide by 72 pixels high and nearest-neighbor upscaled. No tiny shaded fabric patterns, smooth gradients, hazy outline, painterly brushstrokes, high-res anime portrait or realistic anatomy. A distinct friendly middle-aged Thai woodland scout: short dark hair tied back with a pale ochre cloth headband, warm bronze skin, heavy expressive brows, small dark chin stubble, deep desaturated teal short cloth wrap tunic with warm beige overshoulder band and broad textured brown waist sash, indigo chong kraben trousers, dark brown footwraps, a compact light tan rectangular woven shoulder satchel clearly visible against the right hip, a simple recurved brown wooden short bow held upright down by his side with clearly visible silhouette and modest quiver behind shoulder. No metal armor, no spear, no shield. Neutral idle front-facing ready pose, subtly turned toward the viewer, readable in thumbnails and clearly recognizably old Siam fantasy, not a costume portrait. Center the only one isolated full-body sprite with roomy margins. Fully transparent alpha everywhere off the character; no ground or cast shadow, no colored aura, no borders, no symbols, no labels or text. Strong silhouette like the reference.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับฉากดงเจดีย์ร้าง (ImageGen)</summary>

> Use case: style-transfer. Asset type: new 16:9 painted game map background for Ayothaya Survival, destination zone “ดงเจดีย์ร้าง”. Image 1 is style and camera reference only. Match its exact look of richly hand-painted hard-edged 32-bit pixel art, foreground texture density, near-orthographic three-quarter RPG camera looking diagonally down at about 55°, warm sunlight, color grading and the consistent relative scale of bricks and buildings. Generate a new distinct location in the same fantasy Ayutthaya world, an abandoned temple compound in tones of warm burnt sienna, ochre dirt, yellow-green grass and teal. No horizon, no sky. Layout for real sprite actors and combat: on the upper 0–37% of frame, asymmetric cluster of ornate weathered red brick lotus bud prangs, a broken Ayutthaya-style brick cloister and distant deep green jungle edge with just a handful of palm trees. Only the far upper edge and extreme right background have tall trees. The left entrance MUST emerge on level open earth around x=14%, y=62%, connected to a broad gently curving ochre dirt track that runs horizontally toward right-center at y=55–64%. Center and lower 50% are a wide continuous sunlit open grassy and dirt courtyard with tiny flowers, subtle grass pixel tufts, texture patches and flat moss only. From x=10% to 92%, y=44% to 89% every area stays clear so characters can be seen at ground level: no trees, large rocks, buildings, shafts, walls, tall grass, hard silhouettes, stairs or pits there. Just a few low groundcover patches in the very bottom corners. A shallow teal moat can appear in the very top or upper-right corner behind the temple and out of the walkable area. Use many crisp, warm orange brick pixels and detailed, tiny vegetation, bright enough to match the reference. Make it unmistakably the same game and visual artist as image 1 while the buildings and layout are different. The open foreground is a continuous detailed game landscape, no abrupt empty color. No people, animals, sprite actors, UI, writing, symbols, outlines for gameplay or text. Fully opaque extended landscape.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับสร้างฉาก (ImageGen)</summary>

> Use case: stylized-concept. Asset type: 16:9 game environment texture and art direction reference for Ayothaya Survival, an original Thai pixel fantasy RPG. Generate a wide full-bleed playable map from a fixed game camera looking diagonally down at 55 degrees; landscape is seen from the same angle everywhere, no horizon, no sky, no vanishing point. Exceptionally detailed but easy-to-read crisp 32-bit pixel art with thin selective warm dark outlines, hand-painted golden sun, tiny pixel grass textures, ochre ground, olive and jade rice plants. Warm saturated daytime. From LEFT across the upper third and upper center: historic Ayutthaya-inspired Thai riverside trading outpost, orange-brown brick lotus-bud prang with carved recesses, large brick-and-cream-viharn with a dark red lacquered multi-tiered gable and gold chofa finials, raised teak cottages with sharply peaked Thai gables, gold-trimmed merchant booths and woven baskets beneath the roofs, a few large banyan and palmyra trees. To the RIGHT, a calm teal canal with lilies and a simple timber bridge, bright dense palms on the far right, water curling along the far upper and right edges. In the CENTER and foreground, a large walkable sunlit area of grass and patchy wide orange dirt tracks, sparse dry rocky edges and flowers. Chunky textured leaves and moss frame the lower corners. Distinctive warm burnt orange / gold temple roofs against cool emerald shadows and turquoise water. Natural aerial composition with a handsome temple silhouette and varied little neighborhood landmarks. Maintain good visibility in center for overlaid game actors. Make every single pixel look like a clean vintage game screenshot background at high detail. No people, no characters, no interface, no letters or numbers, no overlays, no border. Fully opaque.

</details>

<details>
<summary>พรอมป์ต้นฉบับสำหรับสร้างสไปรต์ (ImageGen)</summary>

> Use case: stylized-concept. Asset type: in-game runtime pixel sprite atlas for Ayothaya Survival. Exactly 4 columns x 2 rows of separate immaculate centered full-body 32-bit pixel art characters, square cells with equal margins and clean alpha, NO GRID LINES, backdrop must be completely empty transparent alpha, each sprite separate and clearly away from adjacent cells. Camera angled diagonally down 50 degrees, old top-down fantasy JRPG style, real chunky pixel outlines, NES meets classic 32-bit palette richness, strong small silhouette, hand-cleaned pixels. Identical human scale and same bottom of feet per row. Sprites each fill roughly 45% of their cell width and 72% of cell height. Top row left to right: (1) idle SOUTH/front view facing viewer of adventurous Thai young adult man, black topknot, muted crimson sleeveless Thai wrap top, amber sash, indigo chong kraben trousers, bare calves, short silver sword at side. (2) same man WEST-facing towards left, same scale and outfit. (3) same man EAST-facing right, same scale and outfit. (4) same man NORTH/back facing away, exactly same crimson vest amber sash indigo bottoms and topknot. Bottom row left to right: (1) an elderly Thai village headman with gray hair, brass staff and ivory wrap clothing, jade sash, facing front. (2) mischievous squat amber tamarind pod forest spirit with round gleaming eyes and tiny feet, about half as tall as humans. (3) round rust brown macaque forest spirit, curled golden-brown tail, seated, about half as tall as humans. (4) luminous blue-green Thai ghost with muted teal cloth, round eyes and tiny crown, about half as tall as humans. Dark selective outlines appropriate for overlaying a light golden grassy game map. No ground, no shadows outside characters, no props except held weapons, no text, no UI and no atmospheric effects. 2:1 wide landscape.

</details>

