export type LevelCode = 'EARLY_CHILDHOOD' | 'BASIC';

export const EDU_LEVELS: Array<{ code: LevelCode; nameTh: string }> = [
  { code: 'EARLY_CHILDHOOD', nameTh: 'ปฐมวัย' },
  { code: 'BASIC', nameTh: 'ขั้นพื้นฐาน' },
];

export const STANDARDS: Array<{ levelCode: LevelCode; code: string; nameTh: string; sortNo: number }> = [
  { levelCode: 'EARLY_CHILDHOOD', code: '1', nameTh: 'ผลลัพธ์คุณภาพของเด็กปฐมวัย', sortNo: 1 },
  { levelCode: 'EARLY_CHILDHOOD', code: '2', nameTh: 'การบริหารจัดการสถานพัฒนาเด็กปฐมวัย', sortNo: 2 },
  { levelCode: 'EARLY_CHILDHOOD', code: '3', nameTh: 'การพัฒนาคุณภาพการจัดประสบการณ์การเรียนรู้เด็กปฐมวัย', sortNo: 3 },
  { levelCode: 'BASIC', code: '1', nameTh: 'ผลลัพธ์ของการเรียนรู้', sortNo: 1 },
  { levelCode: 'BASIC', code: '2', nameTh: 'การพัฒนาคุณภาพการบริหารจัดการสถานศึกษา', sortNo: 2 },
  { levelCode: 'BASIC', code: '3', nameTh: 'การพัฒนาคุณภาพการจัดการเรียนรู้', sortNo: 3 },
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


