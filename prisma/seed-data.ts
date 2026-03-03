export type LevelCode = 'EARLY_CHILDHOOD' | 'BASIC' | 'ASSISTANT_TEACHER';

export const EDU_LEVELS: Array<{ code: LevelCode; nameTh: string }> = [
  { code: 'EARLY_CHILDHOOD', nameTh: 'ปฐมวัย' },
  { code: 'BASIC', nameTh: 'ขั้นพื้นฐาน' },
  { code: 'ASSISTANT_TEACHER', nameTh: 'การประเมินครูผู้ช่วย' },
];

export const STANDARDS: Array<{ levelCode: LevelCode; code: string; nameTh: string; sortNo: number }> = [
  { levelCode: 'EARLY_CHILDHOOD', code: '1', nameTh: 'ผลลัพธ์คุณภาพของเด็กปฐมวัย', sortNo: 1 },
  { levelCode: 'EARLY_CHILDHOOD', code: '2', nameTh: 'การบริหารจัดการสถานพัฒนาเด็กปฐมวัย', sortNo: 2 },
  { levelCode: 'EARLY_CHILDHOOD', code: '3', nameTh: 'การพัฒนาคุณภาพการจัดประสบการณ์การเรียนรู้เด็กปฐมวัย', sortNo: 3 },
  { levelCode: 'BASIC', code: '1', nameTh: 'ผลลัพธ์ของการเรียนรู้', sortNo: 1 },
  { levelCode: 'BASIC', code: '2', nameTh: 'การพัฒนาคุณภาพการบริหารจัดการสถานศึกษา', sortNo: 2 },
  { levelCode: 'BASIC', code: '3', nameTh: 'การพัฒนาคุณภาพการจัดการเรียนรู้', sortNo: 3 },
  // การประเมินครูผู้ช่วย (ตาม doc_ref6 / แนวทางประเมินครูผู้ช่วย)
  { levelCode: 'ASSISTANT_TEACHER', code: '1', nameTh: 'ด้านวิชาชีพ - การจัดการเรียนรู้', sortNo: 1 },
  { levelCode: 'ASSISTANT_TEACHER', code: '2', nameTh: 'ด้านวิชาชีพ - การส่งเสริมสนับสนุน', sortNo: 2 },
  { levelCode: 'ASSISTANT_TEACHER', code: '3', nameTh: 'ด้านสังคม', sortNo: 3 },
  { levelCode: 'ASSISTANT_TEACHER', code: '4', nameTh: 'ด้านคุณลักษณะ - วินัย คุณธรรม จริยธรรม', sortNo: 4 },
  { levelCode: 'ASSISTANT_TEACHER', code: '5', nameTh: 'ด้านคุณลักษณะ - การพัฒนาตนเอง', sortNo: 5 },
];

export const INDICATORS: Array<{
  levelCode: LevelCode;
  standardCode: string;
  code: string;
  nameTh: string;
  sortNo: number;
}> = [
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '1', code: '1.1', nameTh: 'เด็กเจริญเติบโตสมวัย สุขภาพแข็งแรง และมีพัฒนาการด้านการเคลื่อนไหว', sortNo: 1 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '1', code: '1.2', nameTh: 'สติปัญญา การเรียนรู้ และความคิดสร้างสรรค์', sortNo: 2 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '1', code: '1.3', nameTh: 'ภาษาและการสื่อสาร', sortNo: 3 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '1', code: '1.4', nameTh: 'อารมณ์และจิตใจ', sortNo: 4 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '1', code: '1.5', nameTh: 'สังคมและคุณธรรม', sortNo: 5 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.1', nameTh: 'วิสัยทัศน์ พันธกิจ และค่านิยมของสถานศึกษาหรือสถานพัฒนาเด็กปฐมวัย', sortNo: 1 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.2', nameTh: 'กลยุทธ์และเป้าหมายของสถานศึกษาหรือสถานพัฒนาเด็กปฐมวัย', sortNo: 2 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.3', nameTh: 'ผู้บริหารมีภาวะผู้นำทางวิชาการและบริหารจัดการด้วยหลักธรรมาภิบาล', sortNo: 3 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.4', nameTh: 'การพัฒนาวิชาชีพผู้บริหาร ครู/ผู้ดูแลเด็ก และบุคลากรทางการศึกษา', sortNo: 4 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.5', nameTh: 'การนิเทศครู/ผู้ดูแลเด็ก และการประเมินการปฏิบัติงานอย่างเป็นระบบ', sortNo: 5 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.6', nameTh: 'การใช้สื่อ อุปกรณ์ และระบบเทคโนโลยีสนับสนุนการจัดการศึกษา', sortNo: 6 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.7', nameTh: 'การจัดสภาพแวดล้อม อาคารสถานที่ ปลอดภัยและถูกสุขลักษณะ', sortNo: 7 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.8', nameTh: 'สวัสดิการ–สวัสดิภาพ แนวทางป้องกันโรค อุบัติภัย และภัยพิบัติ', sortNo: 8 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.9', nameTh: 'ระบบและกระบวนการช่วยเหลือดูแลเด็กปฐมวัย', sortNo: 9 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '2', code: '2.10', nameTh: 'ประกันคุณภาพภายใน/การสื่อสารผลและการมีส่วนร่วมของผู้เกี่ยวข้อง', sortNo: 10 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '3', code: '3.1', nameTh: 'หลักสูตร/แผนจัดประสบการณ์ที่เน้นพัฒนาการทั้งห้าและการเล่นเป็นฐาน', sortNo: 1 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '3', code: '3.2', nameTh: 'การจัดประสบการณ์การเรียนรู้เชิงรุก เหมาะวัย มีส่วนร่วม และคำนึงความปลอดภัย', sortNo: 2 },
  { levelCode: 'EARLY_CHILDHOOD', standardCode: '3', code: '3.3', nameTh: 'การประเมินพัฒนาการและการใช้ข้อมูลรายบุคคลเพื่อพัฒนาเด็กอย่างต่อเนื่อง', sortNo: 3 },
  { levelCode: 'BASIC', standardCode: '1', code: '1.1', nameTh: 'ผู้เรียนมีสมรรถนะตามหลักสูตรสถานศึกษา', sortNo: 1 },
  { levelCode: 'BASIC', standardCode: '1', code: '1.2', nameTh: 'ผู้เรียนมีคุณลักษณะที่พึงประสงค์ตามหลักสูตรสถานศึกษา', sortNo: 2 },
  { levelCode: 'BASIC', standardCode: '1', code: '1.3', nameTh: 'ผู้เรียนสามารถนำตนเองในการเรียนรู้', sortNo: 3 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.1', nameTh: 'วิสัยทัศน์ พันธกิจ และค่านิยมของสถานศึกษา', sortNo: 1 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.2', nameTh: 'นโยบาย ทิศทาง กลยุทธ์ และแผนงานสอดคล้องวิสัยทัศน์/พันธกิจ', sortNo: 2 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.3', nameTh: 'ผู้บริหารมีภาวะผู้นำทางวิชาการและบริหารจัดการด้วยหลักธรรมาภิบาล', sortNo: 3 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.4', nameTh: 'แผนงานและการพัฒนาครูและบุคลากรทางการศึกษา', sortNo: 4 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.5', nameTh: 'กระบวนการนิเทศการปฏิบัติงานของครูและบุคลากรทางการศึกษาอย่างเป็นระบบ', sortNo: 5 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.6', nameTh: 'การใช้สื่อ อุปกรณ์ และระบบเทคโนโลยีเพื่อสนับสนุนการจัดการศึกษา', sortNo: 6 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.7', nameTh: 'การจัดสภาพแวดล้อม อาคารสถานที่ ปลอดภัยและถูกสุขลักษณะ', sortNo: 7 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.8', nameTh: 'สวัสดิการ/สวัสดิภาพ แนวทางป้องกันโรค อุบัติภัย และภัยพิบัติ', sortNo: 8 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.9', nameTh: 'ระบบและกระบวนการช่วยเหลือผู้เรียน', sortNo: 9 },
  { levelCode: 'BASIC', standardCode: '2', code: '2.10', nameTh: 'การเสริมสร้างเครือข่ายผู้ปกครอง องค์กร และชุมชนเพื่อสนับสนุนการจัดการเรียนรู้', sortNo: 10 },
  { levelCode: 'BASIC', standardCode: '3', code: '3.1', nameTh: 'การออกแบบหลักสูตรและแผนการจัดการเรียนรู้ที่เสริมสมรรถนะ/คุณลักษณะ', sortNo: 1 },
  { levelCode: 'BASIC', standardCode: '3', code: '3.2', nameTh: 'การจัดกิจกรรมการเรียนรู้ที่เสริมสมรรถนะ/คุณลักษณะ', sortNo: 2 },
  { levelCode: 'BASIC', standardCode: '3', code: '3.3', nameTh: 'ครูวัดและประเมินผลการเรียนรู้อย่างเป็นระบบและต่อเนื่อง', sortNo: 3 },
  // ครูผู้ช่วย — ด้านวิชาชีพ การจัดการเรียนรู้ (1.1–1.7)
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.1', nameTh: 'การวิเคราะห์หลักสูตร', sortNo: 1 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.2', nameTh: 'การออกแบบการจัดการเรียนรู้', sortNo: 2 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.3', nameTh: 'การจัดกิจกรรมการเรียนรู้', sortNo: 3 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.4', nameTh: 'การเลือกและใช้สื่อ เทคโนโลยี', sortNo: 4 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.5', nameTh: 'การวัดและประเมินผล', sortNo: 5 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.6', nameTh: 'การจัดบรรยากาศ', sortNo: 6 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '1', code: '1.7', nameTh: 'การใช้เทคโนโลยีดิจิทัล', sortNo: 7 },
  // ครูผู้ช่วย — ด้านวิชาชีพ การส่งเสริมสนับสนุน (2.1–2.3)
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '2', code: '2.1', nameTh: 'การจัดทำข้อมูลสารสนเทศ', sortNo: 1 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '2', code: '2.2', nameTh: 'ระบบดูแลช่วยเหลือผู้เรียน', sortNo: 2 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '2', code: '2.3', nameTh: 'กฎหมายและระเบียบปฏิบัติ', sortNo: 3 },
  // ครูผู้ช่วย — ด้านสังคม (3.1–3.2)
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '3', code: '3.1', nameTh: 'การเรียนรู้จากกัลยาณมิตร (Mentor/ครูพี่เลี้ยง)', sortNo: 1 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '3', code: '3.2', nameTh: 'การเรียนรู้เป็นเครือข่าย (PLC)', sortNo: 2 },
  // ครูผู้ช่วย — ด้านคุณลักษณะ วินัย คุณธรรม (ตัวชี้วัด 4 มี 11 พฤติกรรมบ่งชี้ใน sub)
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '4', code: '4', nameTh: 'วินัย คุณธรรม จริยธรรม และการประพฤติตน', sortNo: 1 },
  // ครูผู้ช่วย — ด้านคุณลักษณะ การพัฒนาตนเอง (5.1–5.4)
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '5', code: '5.1', nameTh: 'ภาษาไทยและอังกฤษ', sortNo: 1 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '5', code: '5.2', nameTh: 'เทคโนโลยีดิจิทัล', sortNo: 2 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '5', code: '5.3', nameTh: 'การเงิน', sortNo: 3 },
  { levelCode: 'ASSISTANT_TEACHER', standardCode: '5', code: '5.4', nameTh: 'สุขภาพ', sortNo: 4 },
];

const RAW_SUB_INDICATORS: Array<{ indicatorRef: string; itemNo: number; textTh: string }> = [
  { indicatorRef: '1.1', itemNo: 1, textTh: 'น้ำหนัก/ส่วนสูงสมส่วนตามเกณฑ์กรมอนามัย' },
  { indicatorRef: '1.1', itemNo: 2, textTh: 'ใช้กล้ามเนื้อมัดใหญ่เคลื่อนไหวและทรงตัวได้' },
  { indicatorRef: '1.1', itemNo: 3, textTh: 'ใช้กล้ามเนื้อมัดเล็ก–ตาประสานสัมพันธ์ได้' },
  { indicatorRef: '1.1', itemNo: 4, textTh: 'มีสุขนิสัยที่ดีและช่วยเหลือตนเองเหมาะสมตามวัย' },
  { indicatorRef: '1.1', itemNo: 5, textTh: 'รับประทานอาหารมีประโยชน์หลากหลาย' },
  { indicatorRef: '1.1', itemNo: 6, textTh: 'เล่น/ทำกิจกรรมอย่างปลอดภัย' },
  { indicatorRef: '1.2', itemNo: 1, textTh: 'บอกเล่าเรื่องราวเกี่ยวกับตนเอง บุคคล สถานที่ และสิ่งแวดล้อมได้' },
  { indicatorRef: '1.2', itemNo: 2, textTh: 'คิดแก้ปัญหาอย่างง่าย มีพื้นฐานคณิตศาสตร์/วิทยาศาสตร์' },
  { indicatorRef: '1.2', itemNo: 3, textTh: 'สร้างผลงานตามจินตนาการและความคิดสร้างสรรค์' },
  { indicatorRef: '1.3', itemNo: 1, textTh: 'ฟัง–พูดสื่อสารโต้ตอบ ตั้งคำถาม เล่าเรื่องต่อเนื่อง' },
  { indicatorRef: '1.3', itemNo: 2, textTh: 'อ่านภาพ/สัญลักษณ์ รู้จักตัวอักษรและอ่านเบื้องต้น' },
  { indicatorRef: '1.3', itemNo: 3, textTh: 'วาด–ขีดเขียนได้สอดคล้องพัฒนาการ' },
  { indicatorRef: '1.4', itemNo: 1, textTh: 'แสดงออกทางอารมณ์เหมาะสม มีทัศนคติดีต่อตนเองและผู้อื่น' },
  { indicatorRef: '1.4', itemNo: 2, textTh: 'ยับยั้งชั่งใจ อดทน รอคอย และปรับตัวตามสถานการณ์' },
  { indicatorRef: '1.4', itemNo: 3, textTh: 'สนใจและเข้าร่วมกิจกรรมอย่างเหมาะสมตามวัย' },
  { indicatorRef: '1.5', itemNo: 1, textTh: 'ยอมรับความแตกต่าง อยู่ร่วมและทำงานกับผู้อื่นได้' },
  { indicatorRef: '1.5', itemNo: 2, textTh: 'มีค่านิยมที่พึงประสงค์ เมตตา แบ่งปัน มีวินัยและซื่อสัตย์' },
  { indicatorRef: '1.5', itemNo: 3, textTh: 'ภาคภูมิใจในครอบครัว/ชุมชน และเป็นพลเมืองดี' },
  { indicatorRef: '2.1-EC', itemNo: 1, textTh: 'กำหนดวิสัยทัศน์–พันธกิจ–ค่านิยมโดยมีส่วนร่วมและสื่อสารทั่วถึง' },
  { indicatorRef: '2.1-EC', itemNo: 2, textTh: 'ทบทวน/ปรับให้สอดคล้องบริบทและสถานการณ์' },
  { indicatorRef: '2.2-EC', itemNo: 1, textTh: 'กำหนดกลยุทธ์และเป้าหมายที่วัดผลได้และติดตามต่อเนื่อง' },
  { indicatorRef: '2.2-EC', itemNo: 2, textTh: 'ใช้ผลประเมินภายใน/ภายนอกครั้งก่อนพัฒนางานและรายงานสาธารณะ' },
  { indicatorRef: '2.3-EC', itemNo: 1, textTh: 'บริหารด้วยหลักธรรมาภิบาล 6 ประการ' },
  { indicatorRef: '2.3-EC', itemNo: 2, textTh: 'ส่งเสริม PLC และสำรวจความพึงพอใจผู้เกี่ยวข้อง' },
  { indicatorRef: '2.4-EC', itemNo: 1, textTh: 'แผนพัฒนาวิชาชีพครู/ผู้ดูแลเด็ก ครอบคลุมความเสี่ยง–ความปลอดภัย' },
  { indicatorRef: '2.4-EC', itemNo: 2, textTh: 'ติดตามผลการพัฒนาและนำไปสู่การปฏิบัติ' },
  { indicatorRef: '2.5-EC', itemNo: 1, textTh: 'นิเทศการสอนและประเมินผลงานครูอย่างเป็นระบบ' },
  { indicatorRef: '2.5-EC', itemNo: 2, textTh: 'นำผลนิเทศสู่แผนพัฒนาวิชาชีพ' },
  { indicatorRef: '3.1-EC', itemNo: 1, textTh: 'โครงสร้างหลักสูตร/แผนจัดประสบการณ์เหมาะวัยและเน้นการเล่นเป็นฐาน' },
  { indicatorRef: '3.1-EC', itemNo: 2, textTh: 'บูรณาการพัฒนาการทั้ง 5 ด้านและบริบทท้องถิ่น' },
  { indicatorRef: '3.2-EC', itemNo: 1, textTh: 'กิจกรรม Active/Play-based ปลอดภัย มีส่วนร่วม และคำนึงความแตกต่างระหว่างบุคคล' },
  { indicatorRef: '3.2-EC', itemNo: 2, textTh: 'ใช้สื่อ/อุปกรณ์เหมาะวัย และสะท้อนกลับการเรียนรู้' },
  { indicatorRef: '3.3-EC', itemNo: 1, textTh: 'ประเมินพัฒนาการรายบุคคล สร้างสารสนเทศเพื่อพัฒนาเด็ก' },
  { indicatorRef: '3.3-EC', itemNo: 2, textTh: 'สื่อสารผลแก่ผู้ปกครอง/ผู้เกี่ยวข้องและใช้ผลปรับแผน' },
  { indicatorRef: '1.1-B', itemNo: 1, textTh: 'หลักฐานสมรรถนะผู้เรียนตามหลักสูตรสถานศึกษา (ผลอ่าน–เขียน–สื่อสาร ฯลฯ)' },
  { indicatorRef: '1.1-B', itemNo: 2, textTh: 'ผลสัมฤทธิ์/ชิ้นงาน/ผลงาน/รางวัล/การทดสอบ (RT/NT/O-NET ฯลฯ)' },
  { indicatorRef: '1.1-B', itemNo: 3, textTh: 'โครงการ/กิจกรรมพัฒนาคุณภาพผู้เรียนและหลักฐานอื่นที่เกี่ยวข้อง' },
  { indicatorRef: '1.2-B', itemNo: 1, textTh: 'หลักฐานคุณลักษณะที่พึงประสงค์ (รักชาติ ศาสน์ กษัตริย์ ซื่อสัตย์ วินัย ใฝ่รู้ ฯลฯ)' },
  { indicatorRef: '1.2-B', itemNo: 2, textTh: 'จิตสาธารณะ–พลโลก–อนุรักษ์ภูมิปัญญา/สิ่งแวดล้อม/วัฒนธรรมไทย' },
  { indicatorRef: '1.3-B', itemNo: 1, textTh: 'หลักฐานการนำตนเองในการเรียนรู้และการประเมินตนเองของผู้เรียน' },
  { indicatorRef: '2.1-B', itemNo: 1, textTh: 'มีส่วนร่วมกำหนดวิสัยทัศน์ พันธกิจ ค่านิยมและสื่อสารทั่วถึง' },
  { indicatorRef: '2.2-B', itemNo: 1, textTh: 'นโยบาย–กลยุทธ์–แผนงานสอดคล้องวิสัยทัศน์/พันธกิจและประเมินต่อเนื่อง' },
  { indicatorRef: '2.3-B', itemNo: 1, textTh: 'หลักธรรมาภิบาล/รับฟังข้อเสนอแนะผู้มีส่วนเกี่ยวข้อง' },
  { indicatorRef: '2.4-B', itemNo: 1, textTh: 'แผนพัฒนาครู/บุคลากร ครอบคลุมความรู้ ทักษะ ความปลอดภัย การคุ้มครอง' },
  { indicatorRef: '2.5-B', itemNo: 1, textTh: 'ระบบนิเทศติดตามผลการปฏิบัติงานครูและนำผลสู่การพัฒนา' },
  { indicatorRef: '2.6-B', itemNo: 1, textTh: 'เทคโนโลยี–สื่อ–อุปกรณ์สนับสนุนการเรียนรู้และการประเมินผลการใช้' },
  { indicatorRef: '2.7-B', itemNo: 1, textTh: 'อาคาร–สภาพแวดล้อมปลอดภัย ถูกสุขลักษณะ มีแผนบำรุงรักษา' },
  { indicatorRef: '2.8-B', itemNo: 1, textTh: 'สวัสดิการ/สวัสดิภาพ/ป้องกันโรค–อุบัติภัย–ภัยพิบัติ และการซักซ้อม' },
  { indicatorRef: '2.9-B', itemNo: 1, textTh: 'ระบบดูแลช่วยเหลือผู้เรียนแบบบูรณาการ' },
  { indicatorRef: '2.10-B', itemNo: 1, textTh: 'เครือข่ายผู้ปกครอง–องค์กร–ชุมชน ร่วมสนับสนุนการจัดการเรียนรู้' },
  { indicatorRef: '3.1-B', itemNo: 1, textTh: 'หลักสูตร/แผนการสอนเน้นสมรรถนะ–คุณลักษณะ' },
  { indicatorRef: '3.2-B', itemNo: 1, textTh: 'กิจกรรมการเรียนรู้เชิงรุกและการมีส่วนร่วมของผู้เรียน' },
  { indicatorRef: '3.3-B', itemNo: 1, textTh: 'ระบบวัดและประเมินผลอย่างเป็นระบบและต่อเนื่อง' },
  // ครูผู้ช่วย (doc_ref6) — ตัวชี้วัดย่อย
  { indicatorRef: '1.1-AT', itemNo: 1, textTh: 'มีการวิเคราะห์หลักสูตร มาตรฐานการเรียนรู้ และตัวชี้วัด' },
  { indicatorRef: '1.1-AT', itemNo: 2, textTh: 'มีการจัดทำรายวิชาหรือคำอธิบายรายวิชา' },
  { indicatorRef: '1.1-AT', itemNo: 3, textTh: 'มีหน่วยการเรียนรู้ที่ครอบคลุมเนื้อหาของหลักสูตร' },
  { indicatorRef: '1.2-AT', itemNo: 1, textTh: 'ออกแบบหน่วยการเรียนรู้ให้สอดคล้องกับรายวิชา' },
  { indicatorRef: '1.2-AT', itemNo: 2, textTh: 'มีหน่วยการเรียนรู้สอดคล้องกับผู้เรียนและบริบทของสถานศึกษา' },
  { indicatorRef: '1.2-AT', itemNo: 3, textTh: 'มีผลวิเคราะห์ผู้เรียนเป็นรายบุคคล' },
  { indicatorRef: '1.3-AT', itemNo: 1, textTh: 'จัดการเรียนรู้โดยใช้รูปแบบ เทคนิค และเน้นกระบวนการ Active Learning' },
  { indicatorRef: '1.3-AT', itemNo: 2, textTh: 'จัดการเรียนรู้สอดคล้องกับมาตรฐาน ตัวชี้วัด และจุดประสงค์' },
  { indicatorRef: '1.4-AT', itemNo: 1, textTh: 'เลือกและใช้สื่อ เทคโนโลยี และแหล่งเรียนรู้ที่สอดคล้องกับกิจกรรม' },
  { indicatorRef: '1.4-AT', itemNo: 2, textTh: 'สื่อที่ใช้ช่วยให้ผู้เรียนเกิดทักษะการคิด' },
  { indicatorRef: '1.5-AT', itemNo: 1, textTh: 'มีการวัดและประเมินผลด้วยวิธีการที่หลากหลาย เหมาะสม' },
  { indicatorRef: '1.5-AT', itemNo: 2, textTh: 'สอดคล้องกับมาตรฐานการเรียนรู้ เพื่อพัฒนาผู้เรียนอย่างต่อเนื่อง' },
  { indicatorRef: '1.6-AT', itemNo: 1, textTh: 'จัดบรรยากาศที่ส่งเสริมและพัฒนาผู้เรียน ให้เกิดกระบวนการคิด ทักษะชีวิต ทักษะการทำงาน และทักษะด้านสารสนเทศ/เทคโนโลยี' },
  { indicatorRef: '1.7-AT', itemNo: 1, textTh: 'มีการจัดการเรียนรู้แบบออนไลน์ หรือประยุกต์ใช้สื่อดิจิทัลเพื่อส่งเสริมการเรียนรู้' },
  { indicatorRef: '2.1-AT', itemNo: 1, textTh: 'จัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา เพื่อใช้ส่งเสริมสนับสนุนการเรียนรู้และพัฒนาคุณภาพผู้เรียน' },
  { indicatorRef: '2.2-AT', itemNo: 1, textTh: 'ดำเนินการตามระบบดูแลช่วยเหลือผู้เรียน โดยใช้ข้อมูลสารสนเทศรายบุคคล' },
  { indicatorRef: '2.2-AT', itemNo: 2, textTh: 'ประสานความร่วมมือกับผู้เกี่ยวข้องเพื่อพัฒนาและแก้ปัญหาผู้เรียน' },
  { indicatorRef: '2.3-AT', itemNo: 1, textTh: 'เรียนรู้กฎหมาย ระเบียบที่เกี่ยวข้อง (งาน 4 ฝ่าย: วิชาการ, งบประมาณ, บุคคล, บริหารทั่วไป)' },
  { indicatorRef: '2.3-AT', itemNo: 2, textTh: 'เรียนรู้เรื่องการจัดซื้อจัดจ้าง การเงิน พัสดุ และงานสารบรรณ' },
  { indicatorRef: '2.3-AT', itemNo: 3, textTh: 'มีความรู้ด้านนโยบายและกฎหมายการศึกษา' },
  { indicatorRef: '3.1-AT', itemNo: 1, textTh: 'มีการเรียนรู้จากกัลยาณมิตร (Mentor/ครูพี่เลี้ยง)' },
  { indicatorRef: '3.1-AT', itemNo: 2, textTh: 'มีรายงานหรือบันทึกจากการสังเกตการสอนเพื่อนำมาปรับใช้กับตนเอง' },
  { indicatorRef: '3.2-AT', itemNo: 1, textTh: 'มีการเรียนรู้ร่วมกันเป็นเครือข่ายทางวิชาชีพ (PLC)' },
  { indicatorRef: '3.2-AT', itemNo: 2, textTh: 'มีหลักฐานการเรียนรู้ร่วมกันทางเครือข่ายวิชาชีพ' },
  { indicatorRef: '3.2-AT', itemNo: 3, textTh: 'นำผลมาปรับใช้กับการจัดการเรียนการสอนของตนเอง' },
  { indicatorRef: '4-AT', itemNo: 1, textTh: 'มีวินัยในตนเอง ยอมรับและปฏิบัติตามกฎ กติกา มารยาท ขนบธรรมเนียม' },
  { indicatorRef: '4-AT', itemNo: 2, textTh: 'ตรงต่อเวลา' },
  { indicatorRef: '4-AT', itemNo: 3, textTh: 'อุทิศเวลาให้แก่ทางราชการและผู้เรียนอย่างต่อเนื่อง' },
  { indicatorRef: '4-AT', itemNo: 4, textTh: 'เอาใจใส่ช่วยเหลือผู้เรียน/ผู้รับบริการ เต็มความสามารถ สม่ำเสมอ และเท่าเทียมกัน' },
  { indicatorRef: '4-AT', itemNo: 5, textTh: 'รักษาความสามัคคี มีน้ำใจเอื้อเฟื้อเผื่อแผ่ต่อเพื่อนร่วมงาน' },
  { indicatorRef: '4-AT', itemNo: 6, textTh: 'ช่วยเหลือ/ร่วมมือแก่ส่วนรวมอย่างทุ่มเท เสียสละจนสำเร็จเกิดประโยชน์' },
  { indicatorRef: '4-AT', itemNo: 7, textTh: 'มีส่วนร่วมอนุรักษ์วัฒนธรรมไทยและสิ่งแวดล้อม (อย่างน้อย 2 กิจกรรม)' },
  { indicatorRef: '4-AT', itemNo: 8, textTh: 'ดำรงชีวิตตามหลักปรัชญาของเศรษฐกิจพอเพียง' },
  { indicatorRef: '4-AT', itemNo: 9, textTh: 'ละเว้นอบายมุขและสิ่งเสพติด รวมถึงร่วมรณรงค์ส่งเสริมผู้อื่น' },
  { indicatorRef: '4-AT', itemNo: 10, textTh: 'ประพฤติตนเป็นแบบอย่างที่ดีให้กับผู้เรียน' },
  { indicatorRef: '4-AT', itemNo: 11, textTh: 'รักษาชื่อเสียง ปกป้องศักดิ์ศรีวิชาชีพจนได้รับการยกย่อง (อย่างน้อย 1 รายการ)' },
  { indicatorRef: '5.1-AT', itemNo: 1, textTh: 'อบรม/พัฒนาทักษะการใช้ภาษาไทย อย่างน้อย 1 หลักสูตร' },
  { indicatorRef: '5.1-AT', itemNo: 2, textTh: 'อบรม/พัฒนาทักษะการใช้ภาษาอังกฤษ อย่างน้อย 1 หลักสูตร' },
  { indicatorRef: '5.2-AT', itemNo: 1, textTh: 'เข้ารับการอบรมและพัฒนาทักษะการใช้เทคโนโลยีดิจิทัลเพื่อการศึกษา' },
  { indicatorRef: '5.3-AT', itemNo: 1, textTh: 'เข้ารับการพัฒนาด้านการวางแผนการเงินและวินัยทางการเงิน' },
  { indicatorRef: '5.4-AT', itemNo: 1, textTh: 'เข้ารับการพัฒนาหรือดูแลสุขภาพกายและใจ' },
];

export const SUB_INDICATORS = RAW_SUB_INDICATORS.map(({ indicatorRef, itemNo, textTh }) => {
  const [indicatorCode, suffix] = indicatorRef.split('-');
  let levelCode: LevelCode;
  if (!suffix) {
    levelCode = 'EARLY_CHILDHOOD';
  } else if (suffix === 'EC') {
    levelCode = 'EARLY_CHILDHOOD';
  } else if (suffix === 'B') {
    levelCode = 'BASIC';
  } else if (suffix === 'AT') {
    levelCode = 'ASSISTANT_TEACHER';
  } else {
    throw new Error(`ไม่รู้จักรหัสตัวชี้วัดย่อย: ${indicatorRef}`);
  }
  return {
    levelCode,
    indicatorCode,
    itemNo,
    textTh,
  };
});


