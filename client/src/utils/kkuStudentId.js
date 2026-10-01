/**
 * โครงสร้างและความหมายของรหัสนักศึกษา มหาวิทยาลัยขอนแก่น (KKU Student ID)
 * รูปแบบ: YYLFFNNN-C (10 หลัก + 1 เครื่องหมายขีด)
 * 
 * หลักที่ 1-2 (YY): ปีการศึกษาที่เข้าศึกษา (พ.ศ.) เช่น 69 = ปี 2569
 * หลักที่ 3 (L): ระดับการศึกษา / ประเภทหลักสูตร (1,3,5 = ป.ตรี, 7,8,9 = บัณฑิตศึกษา)
 * หลักที่ 4-5 (FF): รหัสคณะ / ส่วนงานที่สังกัด
 * หลักที่ 6-9 (NNNN): ลำดับที่ของนักศึกษา (Running Number)
 * หลักสุดท้ายหลังขีด - (C): ตัวเลขตรวจสอบความถูกต้อง (Check Digit)
 */

export const KKU_FACULTY_MAP = {
  '01': { code: '01', name_th: 'คณะเกษตรศาสตร์', name_en: 'Faculty of Agriculture', abbr: 'AG' },
  '02': { code: '02', name_th: 'คณะวิทยาศาสตร์', name_en: 'Faculty of Science', abbr: 'SC' },
  '03': { code: '03', name_th: 'คณะเกษตรศาสตร์', name_en: 'Faculty of Agriculture', abbr: 'AG' },
  '04': { code: '04', name_th: 'คณะวิศวกรรมศาสตร์', name_en: 'Faculty of Engineering', abbr: 'EN' },
  '05': { code: '05', name_th: 'คณะศึกษาศาสตร์', name_en: 'Faculty of Education', abbr: 'ED' },
  '06': { code: '06', name_th: 'คณะพยาบาลศาสตร์', name_en: 'Faculty of Nursing', abbr: 'NU' },
  '07': { code: '07', name_th: 'คณะแพทยศาสตร์', name_en: 'Faculty of Medicine', abbr: 'MD' },
  '08': { code: '08', name_th: 'คณะมนุษยศาสตร์และสังคมศาสตร์', name_en: 'Faculty of Humanities and Social Sciences', abbr: 'HS' },
  '09': { code: '09', name_th: 'คณะเทคนิคการแพทย์', name_en: 'Faculty of Associated Medical Sciences', abbr: 'AM' },
  '10': { code: '10', name_th: 'บัณฑิตวิทยาลัย', name_en: 'Graduate School', abbr: 'GS' },
  '11': { code: '11', name_th: 'คณะสาธารณสุขศาสตร์', name_en: 'Faculty of Public Health', abbr: 'PH' },
  '13': { code: '13', name_th: 'คณะทันตแพทยศาสตร์', name_en: 'Faculty of Dentistry', abbr: 'DT' },
  '15': { code: '15', name_th: 'คณะเภสัชศาสตร์', name_en: 'Faculty of Pharmaceutical Sciences', abbr: 'PS' },
  '16': { code: '16', name_th: 'คณะเทคโนโลยี', name_en: 'Faculty of Technology', abbr: 'TE' },
  '18': { code: '18', name_th: 'คณะสัตวแพทยศาสตร์', name_en: 'Faculty of Veterinary Medicine', abbr: 'VM' },
  '20': { code: '20', name_th: 'คณะสถาปัตยกรรมศาสตร์', name_en: 'Faculty of Architecture', abbr: 'AR' },
  '21': { code: '21', name_th: 'คณะบริหารธุรกิจและการบัญชี', name_en: 'Khon Kaen Business School', abbr: 'BS' },
  '22': { code: '22', name_th: 'คณะศิลปกรรมศาสตร์', name_en: 'Faculty of Fine and Applied Arts', abbr: 'FA' },
  '27': { code: '27', name_th: 'คณะนิติศาสตร์', name_en: 'Faculty of Law', abbr: 'LW' },
  '28': {
    code: '28',
    name_th: 'วิทยาลัยกิจการและนโยบายสาธารณะ',
    name_en: 'College of Public Affairs and Policy',
    abbr: 'COPA',
    legacy_th: 'วิทยาลัยการปกครองท้องถิ่น',
    url: 'https://copa.kku.ac.th/'
  },
  '29': { code: '29', name_th: 'วิทยาลัยนานาชาติ', name_en: 'KKU International College', abbr: 'IC' },
  '32': { code: '32', name_th: 'คณะเศรษฐศาสตร์', name_en: 'Faculty of Economics', abbr: 'EC' },
  '38': { code: '38', name_th: 'วิทยาลัยการคอมพิวเตอร์', name_en: 'College of Computing', abbr: 'CP' },
  '45': { code: '45', name_th: 'คณะสหวิทยาการ (วิทยาเขตหนองคาย)', name_en: 'Faculty of Interdisciplinary Studies', abbr: 'NK' },
  '74': { code: '74', name_th: 'วิทยาลัยบัณฑิตศึกษาการจัดการ', name_en: 'College of Graduate Study in Management', abbr: 'MBA' }
};

export const LEVEL_MAP = {
  '1': 'ระดับปริญญาตรี',
  '2': 'ระดับปริญญาตรี',
  '3': 'ระดับปริญญาตรี (ภาคปกติ/ภาคพิเศษ)',
  '4': 'ระดับปริญญาตรี (โครงการพิเศษ)',
  '5': 'ระดับบัณฑิตศึกษา (ปริญญาโท)',
  '6': 'ระดับปริญญาตรี (เทียบโอน/ต่อเนื่อง)',
  '7': 'ระดับปริญญาเอก (และรวมถึงหลักสูตรประกาศนียบัตรบัณฑิตชั้นสูง)',
  '8': 'ระดับบัณฑิตศึกษา (ประกาศนียบัตรบัณฑิต)',
  '9': 'ระดับปริญญาเอก (Ph.D.)'
};

// รายการคณะเรียงตามลำดับสำหรับ Select Dropdown
export const KKU_FACULTY_OPTIONS = [
  '01 : คณะเกษตรศาสตร์ (AG)',
  '02 : คณะวิทยาศาสตร์ (SC)',
  '04 : คณะวิศวกรรมศาสตร์ (EN)',
  '05 : คณะศึกษาศาสตร์ (ED)',
  '06 : คณะพยาบาลศาสตร์ (NU)',
  '07 : คณะแพทยศาสตร์ (MD)',
  '08 : คณะมนุษยศาสตร์และสังคมศาสตร์ (HS)',
  '09 : คณะเทคนิคการแพทย์ (AM)',
  '10 : บัณฑิตวิทยาลัย (GS)',
  '11 : คณะสาธารณสุขศาสตร์ (PH)',
  '13 : คณะทันตแพทยศาสตร์ (DT)',
  '15 : คณะเภสัชศาสตร์ (PS)',
  '16 : คณะเทคโนโลยี (TE)',
  '18 : คณะสัตวแพทยศาสตร์ (VM)',
  '20 : คณะสถาปัตยกรรมศาสตร์ (AR)',
  '21 : คณะบริหารธุรกิจและการบัญชี (KKBS / BS)',
  '22 : คณะศิลปกรรมศาสตร์ (FA)',
  '27 : คณะนิติศาสตร์ (LW)',
  '28 : วิทยาลัยกิจการและนโยบายสาธารณะ (COPA KKU / เดิม COLA)',
  '29 : วิทยาลัยนานาชาติ (KKUIC / IC)',
  '32 : คณะเศรษฐศาสตร์ (EC)',
  '38 : วิทยาลัยการคอมพิวเตอร์ (CP)',
  '45 : คณะสหวิทยาการ (วิทยาเขตหนองคาย / NK)',
  '74 : วิทยาลัยบัณฑิตศึกษาการจัดการ (MBA)',
  'สำนักงานอธิการบดี / กองบริการกลาง (University Headquarters)',
  'บุคคลภายนอกทั่วไป (General Public / External)'
];

/**
 * ฟอร์แมตรหัสนักศึกษาให้มีขีดคั่นก่อนหลักสุดท้าย เช่น 693080099-9
 */
export function formatKKUStudentId(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '').substring(0, 10);
  if (digits.length <= 9) {
    return digits;
  }
  return `${digits.substring(0, 9)}-${digits.substring(9, 10)}`;
}

/**
 * แปลผลและแยกส่วนประกอบของรหัสนักศึกษา มข.
 */
export function parseKKUStudentId(idString) {
  if (!idString) return null;
  const digits = String(idString).replace(/\D/g, '');
  if (digits.length < 2) return null;

  const year2 = digits.substring(0, 2);
  const entryYearBE = `25${year2}`;

  let level = null;
  if (digits.length >= 3) {
    const levelCode = digits[2];
    level = LEVEL_MAP[levelCode] || (Number(levelCode) >= 7 ? 'บัณฑิตศึกษา' : 'ปริญญาตรี');
  }

  let faculty = null;
  let facultyCode = null;
  if (digits.length >= 5) {
    facultyCode = digits.substring(3, 5);
    faculty = KKU_FACULTY_MAP[facultyCode] || null;
  }

  let runningNumber = null;
  if (digits.length >= 6) {
    runningNumber = digits.substring(5, Math.min(digits.length, 9));
  }

  let checkDigit = null;
  if (digits.length >= 10) {
    checkDigit = digits[9];
  }

  return {
    raw: digits,
    formatted: digits.length === 10 ? `${digits.substring(0, 9)}-${digits[9]}` : digits,
    entryYearBE,
    level,
    facultyCode,
    faculty,
    runningNumber,
    checkDigit,
    isComplete: digits.length === 10
  };
}
