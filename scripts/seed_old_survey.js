require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const formSchema = [
  { id: 'userRole', type: 'select', label: 'สถานภาพของผู้ใช้งาน', required: true, options: ['นักศึกษามหาวิทยาลัยขอนแก่น', 'บุคลากรมหาวิทยาลัยขอนแก่น', 'บุคคลทั่วไป'] },
  { id: 'gender', type: 'select', label: 'เพศ', required: true, options: ['ชาย', 'หญิง', 'อื่นๆ', 'ไม่ระบุ'] },
  { id: 'age', type: 'select', label: 'ช่วงอายุ', required: true, options: ['ต่ำกว่า 18 ปี', '18 - 25 ปี', '26 - 35 ปี', '36 - 45 ปี', '46 ปีขึ้นไป'] },
  { id: 'faculty', type: 'text', label: 'คณะ/หน่วยงานต้นสังกัด (หากมี)', required: false },
  
  { id: 'usageFrequency', type: 'select', label: 'ความถี่ในการใช้งาน', required: true, options: ['ครั้งแรก', '1-2 ครั้ง/สัปดาห์', '3-4 ครั้ง/สัปดาห์', 'ทุกวัน'] },
  { id: 'preferredSports', type: 'select', label: 'ประเภทกีฬาที่ใช้บริการบ่อยที่สุด', required: true, options: ['แบดมินตัน', 'เทนนิส', 'ปิงปอง', 'สระว่ายน้ำ', 'ฟิตเนส', 'อื่นๆ'] },
  { id: 'otherSport', type: 'text', label: 'ชนิดกีฬาอื่นๆ (ระบุ)', required: false },

  { id: 'rating_ux_modern', type: 'rating', label: 'ความทันสมัย สะอาดตา ดูเป็นมิตร', required: true },
  { id: 'rating_ux_clarity', type: 'rating', label: 'ตัวอักษรอ่านง่าย และการใช้สี', required: true },
  { id: 'rating_ux_nav', type: 'rating', label: 'การจัดวางเมนูและการ์ด', required: true },
  { id: 'rating_ux_feedback', type: 'rating', label: 'การแจ้งเตือน (Feedback) ของระบบ', required: true },
  
  { id: 'rating_func_status', type: 'rating', label: 'การดูตารางเวลาแบบเรียลไทม์', required: true },
  { id: 'rating_func_booking', type: 'rating', label: 'ขั้นตอนการจองคิวที่ง่าย', required: true },
  { id: 'rating_func_checkin', type: 'rating', label: 'การสแกน QR Code และ GPS', required: true },
  { id: 'rating_func_manual', type: 'rating', label: 'ความชัดเจนของหน้าคู่มือ', required: true },

  { id: 'rating_perf_speed', type: 'rating', label: 'ความรวดเร็วในการโหลดข้อมูล', required: true },
  { id: 'rating_perf_gps', type: 'rating', label: 'ความแม่นยำของระบบ GPS', required: true },
  { id: 'rating_perf_security', type: 'rating', label: 'ความปลอดภัยของข้อมูลส่วนตัว', required: true },

  { id: 'rating_prob_time', type: 'rating', label: 'ช่วยลดปัญหาการเสียเวลาและค่าเดินทาง', required: true },
  { id: 'rating_prob_queue', type: 'rating', label: 'ช่วยแก้ไขปัญหาการต่อคิว', required: true },
  { id: 'rating_prob_plan', type: 'rating', label: 'ช่วยให้วางแผนการเล่นกีฬาได้ดีขึ้น', required: true },
  { id: 'rating_overall', type: 'rating', label: 'ยกระดับการให้บริการสนามกีฬา มข.', required: true },
  
  { id: 'suggestions', type: 'textarea', label: 'ข้อเสนอแนะเพิ่มเติม', required: false }
];

async function seed() {
  try {
    const res = await pool.query(
      "INSERT INTO forms (title, description, is_active, form_schema) VALUES ($1, $2, $3, $4) RETURNING id",
      [
        "แบบฟอร์มประเมินความพึงพอใจการใช้งานระบบ KKU SportPass",
        "แบบสำรวจนี้มีวัตถุประสงค์เพื่อประเมินความพึงพอใจในการใช้งานระบบ KKU SportPass และนำข้อเสนอแนะของท่านไปพัฒนาปรับปรุงระบบให้มีประสิทธิภาพมากยิ่งขึ้น",
        1,
        JSON.stringify(formSchema)
      ]
    );
    console.log("Successfully seeded old survey into new forms engine! Form ID:", res.rows[0].id);
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    pool.end();
  }
}

seed();
