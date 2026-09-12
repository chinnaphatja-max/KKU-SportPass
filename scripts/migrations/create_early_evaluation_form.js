require('dotenv').config();
const { Pool } = require('pg');

async function createEarlyEvaluationForm() {
    console.log('🚀 Updating Early Design & Concept Evaluation Form for CP321007 with rich Section System & Descriptions...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const formTitle = 'แบบสอบถามการประเมินการออกแบบและความพึงพอใจระยะแรก (Early Design & Concept Evaluation)';
        const formDescription = `โครงการนวัตกรรม: KKU SportPass - ระบบจองสนามกีฬามหาวิทยาลัยขอนแก่น
รายวิชา CP321007 การคิดเชิงออกแบบสำหรับเทคโนโลยีสารสนเทศ (Design Thinking for IT) วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น

คำชี้แจง:
แบบสอบถามนี้จัดทำขึ้นโดยนักศึกษารายวิชา CP321007 เพื่อรวบรวมความคิดเห็นและความพึงพอใจระยะแรกที่มีต่อการออกแบบและแนวคิดการทำงานของเว็บไซต์ KKU SportPass (https://kku-sport-pass.vercel.app/) เพื่อนำข้อมูลไปใช้ปรับปรุงและพัฒนานวัตกรรมให้ตอบโจทย์การใช้งานของนักศึกษาและบุคลากรมหาวิทยาลัยขอนแก่นอย่างมีประสิทธิภาพสูงสุด

การตอบแบบสอบถามนี้ใช้เวลาประมาณ 3–5 นาที และข้อมูลทั้งหมดจะถูกนำไปใช้เพื่อประโยชน์ทางการศึกษาและการพัฒนาระบบเท่านั้น`;

        const sec1Title = 'ส่วนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบสอบถาม (Demographics & Baseline)';
        const sec1Desc = '(โปรดเลือกตอบเพียง 1 ข้อที่ตรงกับท่านมากที่สุด)';

        const sec2Title = 'ส่วนที่ 2: การประเมินความรู้สึกแรกเห็นและการคาดการณ์ความสะดวก (Early UI & Perceived Usability)';
        const sec2Desc = '(คำชี้แจง: โปรดให้คะแนนตามระดับความคิดเห็นหลังจากได้ชมตัวอย่างหน้าตาและแนวคิดการทำงานของเว็บไซต์ KKU SportPass)\nระดับความคิดเห็น: 5 = เห็นด้วยอย่างยิ่ง | 4 = เห็นด้วย | 3 = ปานกลาง | 2 = ไม่เห็นด้วย | 1 = ไม่เห็นด้วยอย่างยิ่ง';

        const sec3Title = 'ส่วนที่ 3: ความรู้สึกและคุณค่าที่คาดว่าจะได้รับหากนำไปใช้จริง (Perceived Value & Intention to Use)';
        const sec3Desc = '(คำชี้แจง: โปรดประเมินตามความคิดเห็นของท่านหากมีการเปิดใช้งานระบบนี้ในมหาวิทยาลัยขอนแก่นจริง)\nระดับความคิดเห็น: 5 = เห็นด้วยอย่างยิ่ง | 4 = เห็นด้วย | 3 = ปานกลาง | 2 = ไม่เห็นด้วย | 1 = ไม่เห็นด้วยอย่างยิ่ง';

        const sec4Title = 'ส่วนที่ 4: ความคิดเห็นและข้อเสนอแนะเพิ่มเติม (Qualitative Feedback)';
        const sec4Desc = '(คำชี้แจง: ระบุความคิดเห็น ข้อเสนอแนะ หรือสิ่งที่ท่านต้องการให้ปรับปรุงเพิ่มเติมสำหรับระบบ KKU SportPass)';

        const formSchema = [
            // ส่วนที่ 1
            {
                id: 'sec1_q1_role',
                section: sec1Title,
                section_description: sec1Desc,
                label: '1. สถานภาพของผู้ตอบแบบสอบถาม',
                type: 'select',
                options: [
                    'นักศึกษามหาวิทยาลัยขอนแก่น',
                    'คณาจารย์ / บุคลากรมหาวิทยาลัยขอนแก่น',
                    'บุคคลทั่วไป / ผู้ใช้บริการสนามกีฬา'
                ],
                required: true
            },
            {
                id: 'sec1_q2_frequency',
                section: sec1Title,
                section_description: sec1Desc,
                label: '2. ความถี่ในการเข้าใช้บริการสนามกีฬา มหาวิทยาลัยขอนแก่น',
                type: 'select',
                options: [
                    'สัปดาห์ละ 3–5 วันขึ้นไป (ใช้งานเป็นประจำ)',
                    'สัปดาห์ละ 1–2 วัน (ใช้งานบางวัน)',
                    'เดือนละ 1–3 ครั้ง (ใช้งานเป็นครั้งคราว)',
                    'ยังไม่เคยใช้งาน'
                ],
                required: true
            },

            // ส่วนที่ 2
            {
                id: 'sec2_q1_layout',
                section: sec2Title,
                section_description: sec2Desc,
                label: '1. การจัดวางเมนูและองค์ประกอบบนหน้าเว็บมีความเป็นระเบียบ สะอาดตา',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q2_clarity',
                section: sec2Title,
                section_description: sec2Desc,
                label: '2. ข้อความและภาษาที่ใช้บนหน้าเว็บมีความชัดเจน เข้าใจได้ง่าย',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q3_court_status',
                section: sec2Title,
                section_description: sec2Desc,
                label: '3. การแสดงสถานะสนาม (ว่าง / ไม่ว่าง) สื่อความหมายชัดเจนและดูง่าย',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q4_booking_process',
                section: sec2Title,
                section_description: sec2Desc,
                label: '4. ขั้นตอนและวิธีการจองสนามที่แสดงบนระบบดูเข้าใจง่าย ไม่ซับซ้อน',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q5_payment_slip',
                section: sec2Title,
                section_description: sec2Desc,
                label: '5. รูปแบบการแนบสลิปชำระเงินและตรวจสอบข้อมูลบนระบบดูสะดวก',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q6_qr_checkin',
                section: sec2Title,
                section_description: sec2Desc,
                label: '6. แนวคิดการสแกน QR Code เพื่อยืนยันเข้าสนามน่าจะช่วยเพิ่มความสะดวก',
                type: 'rating',
                required: true
            },
            {
                id: 'sec2_q7_learnability',
                section: sec2Title,
                section_description: sec2Desc,
                label: '7. โดยรวมระบบนี้มีรูปแบบการใช้งานที่น่าจะเรียนรู้ได้รวดเร็ว (User-friendly)',
                type: 'rating',
                required: true
            },

            // ส่วนที่ 3
            {
                id: 'sec3_q8_save_time',
                section: sec3Title,
                section_description: sec3Desc,
                label: '8. ระบบนี้จะช่วยลดเวลาในการเดินทางมาเช็กสนามหรือจองสนามด้วยตนเอง',
                type: 'rating',
                required: true
            },
            {
                id: 'sec3_q9_reduce_conflicts',
                section: sec3Title,
                section_description: sec3Desc,
                label: '9. ระบบนี้จะช่วยลดปัญหาการจองเวลาทับซ้อนและการเข้าคิวที่ไม่เป็นระเบียบ',
                type: 'rating',
                required: true
            },
            {
                id: 'sec3_q10_intention_to_use',
                section: sec3Title,
                section_description: sec3Desc,
                label: '10. หากระบบนี้เปิดใช้งานจริง ท่านมีความตั้งใจที่จะใช้เว็บไซต์นี้ในการจองสนาม',
                type: 'rating',
                required: true
            },
            {
                id: 'sec3_q11_overall_satisfaction',
                section: sec3Title,
                section_description: sec3Desc,
                label: '11. โดยภาพรวม ท่านพึงพอใจต่อแนวคิดและการออกแบบระบบ KKU SportPass',
                type: 'rating',
                required: true
            },

            // ส่วนที่ 4
            {
                id: 'sec4_q12_strengths',
                section: sec4Title,
                section_description: sec4Desc,
                label: '12. จุดเด่นหรือสิ่งที่ท่านชื่นชอบมากที่สุดบนเว็บไซต์ KKU SportPass คืออะไร? (ตอบตามความรู้สึกจริงจากการรับชมตัวอย่างระบบ)',
                type: 'textarea',
                placeholder: 'ระบุจุดเด่นหรือฟีเจอร์ที่ประทับใจ...',
                required: false
            },
            {
                id: 'sec4_q13_concerns',
                section: sec4Title,
                section_description: sec4Desc,
                label: '13. หากนำระบบ KKU SportPass ไปเปิดใช้งานจริงในสนามกีฬามหาวิทยาลัยขอนแก่น ท่านมีข้อกังวลหรือข้อเสนอแนะในการปรับปรุงเพิ่มเติมอย่างไร? (เช่น การแสดงผลบนมือถือ, การเพิ่มฟีเจอร์อื่นๆ หรือความชัดเจนของข้อมูล)',
                type: 'textarea',
                placeholder: 'ระบุข้อกังวล ข้อเสนอแนะ หรือสิ่งที่ต้องการให้ปรับปรุง...',
                required: false
            }
        ];

        // Check if form already exists
        const existingForm = await pool.query(
            "SELECT id, title FROM forms WHERE title LIKE '%Early Design%' OR title LIKE '%CP321007%'"
        );

        let formId;
        if (existingForm.rows.length > 0) {
            formId = existingForm.rows[0].id;
            console.log(`ℹ️ Form exists with ID ${formId}. Updating schema with section system & descriptions...`);
            await pool.query(
                `UPDATE forms 
                 SET title = $1, description = $2, form_schema = $3::jsonb, is_active = true, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $4`,
                [formTitle, formDescription, JSON.stringify(formSchema), formId]
            );
            console.log(`✅ Form ID ${formId} updated with full section system & descriptions.`);
        } else {
            const result = await pool.query(
                `INSERT INTO forms (title, description, is_active, form_schema)
                 VALUES ($1, $2, true, $3::jsonb)
                 RETURNING id`,
                [formTitle, formDescription, JSON.stringify(formSchema)]
            );
            formId = result.rows[0].id;
            console.log(`🎉 Created new form with ID: ${formId}`);
        }

        await pool.end();
        return formId;
    } catch (err) {
        console.error('❌ Failed to update CP321007 form:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    createEarlyEvaluationForm().then((id) => {
        console.log(`✅ Completed. Form ID is: ${id}`);
        process.exit(0);
    });
}

module.exports = createEarlyEvaluationForm;
