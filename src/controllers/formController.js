const pool = require('../config/db');

// --- Admin APIs ---

// List all forms
exports.getAllForms = async (req, res) => {
    try {
        const [forms] = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
        res.json({ success: true, forms });
    } catch (err) {
        console.error('Error fetching forms:', err);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลแบบฟอร์มได้' });
    }
};

// Get single form + stats
exports.getFormById = async (req, res) => {
    try {
        const formId = req.params.id;

        // Fetch form details
        const [forms] = await pool.query('SELECT * FROM forms WHERE id = ?', [formId]);
        if (forms.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบฟอร์ม' });
        }
        const form = forms[0];

        // Fetch responses
        const [responses] = await pool.query('SELECT * FROM form_responses WHERE form_id = ?', [formId]);

        // Compute dynamic stats
        const dynamicStats = {};
        let totalResponses = 0;
        const parsedResponses = [];

        if (responses && responses.length > 0) {
            totalResponses = responses.length;
            responses.forEach(row => {
                let ans = row.responses_json;
                if (typeof ans === 'string') {
                    try {
                        ans = JSON.parse(ans);
                    } catch (e) {
                        ans = {};
                    }
                }
                parsedResponses.push({
                    id: row.id,
                    created_at: row.created_at,
                    responses: ans
                });

                for (const [qId, val] of Object.entries(ans)) {
                    if (!dynamicStats[qId]) {
                        dynamicStats[qId] = { counts: {}, total: 0, textResponses: [] };
                    }
                    if (val !== undefined && val !== null && val !== '') {
                        dynamicStats[qId].counts[val] = (dynamicStats[qId].counts[val] || 0) + 1;
                        dynamicStats[qId].total++;

                        if (typeof val === 'string' && val.trim().length > 0 && isNaN(Number(val))) {
                            dynamicStats[qId].textResponses.push(val.trim());
                        }
                    }
                }
            });

            // Compute averages for rating questions (numerical 1-5)
            for (const qId in dynamicStats) {
                let sum = 0;
                let ratingCount = 0;
                for (const [score, count] of Object.entries(dynamicStats[qId].counts)) {
                    const num = parseFloat(score);
                    if (!isNaN(num) && num >= 1 && num <= 5) {
                        sum += num * count;
                        ratingCount += count;
                    }
                }
                if (ratingCount > 0) {
                    dynamicStats[qId].average = (sum / ratingCount).toFixed(2);
                    dynamicStats[qId].ratingCount = ratingCount;
                }
            }
        }

        res.json({ 
            success: true, 
            form, 
            stats: {
                total: totalResponses,
                dynamicStats,
                responses: parsedResponses
            }
        });
    } catch (err) {
        console.error('Error fetching form:', err);
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลแบบฟอร์มได้' });
    }
};

// Create new form
exports.createForm = async (req, res) => {
    try {
        const { title, description, is_active, start_date, end_date, form_schema } = req.body;
        
        const formSchemaJson = typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema || []);
        
        const [result] = await pool.query(
            'INSERT INTO forms (title, description, is_active, start_date, end_date, form_schema) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, is_active ? 1 : 0, start_date, end_date, formSchemaJson]
        );

        const newFormId = result.insertId;
        const [newFormRows] = await pool.query('SELECT * FROM forms WHERE id = ?', [newFormId]);
        
        res.json({ success: true, form: newFormRows[0], message: 'สร้างแบบฟอร์มสำเร็จ' });
    } catch (err) {
        console.error('Error creating form:', err);
        res.status(500).json({ success: false, message: 'ไม่สามารถสร้างแบบฟอร์มได้' });
    }
};

// Update form
exports.updateForm = async (req, res) => {
    try {
        const formId = req.params.id;
        const { title, description, is_active, start_date, end_date, form_schema } = req.body;
        
        const formSchemaJson = typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema || []);
        
        await pool.query(
            'UPDATE forms SET title = ?, description = ?, is_active = ?, start_date = ?, end_date = ?, form_schema = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, is_active ? 1 : 0, start_date, end_date, formSchemaJson, formId]
        );

        res.json({ success: true, message: 'อัปเดตแบบฟอร์มสำเร็จ' });
    } catch (err) {
        console.error('Error updating form:', err);
        res.status(500).json({ success: false, message: 'ไม่สามารถอัปเดตแบบฟอร์มได้' });
    }
};

// Delete form
exports.deleteForm = async (req, res) => {
    try {
        const formId = req.params.id;
        await pool.query('DELETE FROM forms WHERE id = ?', [formId]);
        res.json({ success: true, message: 'ลบแบบฟอร์มสำเร็จ' });
    } catch (err) {
        console.error('Error deleting form:', err);
        res.status(500).json({ success: false, message: 'ไม่สามารถลบแบบฟอร์มได้' });
    }
};


// --- Public APIs ---

// Get currently active survey for public display (e.g. Home Page banner)
exports.getActiveSurvey = async (req, res) => {
    try {
        const [forms] = await pool.query(
            'SELECT id, title, description, is_active, start_date, end_date, form_schema FROM forms WHERE is_active = true ORDER BY updated_at DESC, id DESC'
        );

        if (!forms || forms.length === 0) {
            return res.json({ success: true, has_active_survey: false, form: null });
        }

        const now = new Date();
        const activeForm = forms.find(form => {
            if (!form.is_active) return false;
            if (form.start_date && new Date(form.start_date) > now) return false;
            if (form.end_date && new Date(form.end_date) < now) return false;
            return true;
        });

        if (!activeForm) {
            return res.json({ success: true, has_active_survey: false, form: null });
        }

        res.json({
            success: true,
            has_active_survey: true,
            form: {
                id: activeForm.id,
                title: activeForm.title,
                description: activeForm.description,
                is_active: true
            }
        });
    } catch (err) {
        console.error('Error fetching active survey:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบแบบประเมิน' });
    }
};

// Get form for public to fill
exports.getPublicForm = async (req, res) => {
    try {
        const formId = req.params.id;
        const [forms] = await pool.query('SELECT id, title, description, is_active, start_date, end_date, form_schema FROM forms WHERE id = ?', [formId]);
        
        if (forms.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแบบฟอร์ม' });
        }

        const form = forms[0];

        // Check date validity
        const now = new Date();
        let isActive = Boolean(form.is_active);
        if (isActive && form.start_date && new Date(form.start_date) > now) {
            isActive = false;
        }
        if (isActive && form.end_date && new Date(form.end_date) < now) {
            isActive = false;
        }

        res.json({ 
            success: true, 
            form: {
                ...form,
                is_active: isActive
            } 
        });
    } catch (err) {
        console.error('Error fetching public form:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม' });
    }
};

// Submit response
exports.submitFormResponse = async (req, res) => {
    try {
        const formId = req.params.id;
        const { responses } = req.body;
        const userId = req.user ? req.user.id : null;

        const responsesJson = typeof responses === 'string' ? responses : JSON.stringify(responses || {});

        await pool.query(
            'INSERT INTO form_responses (form_id, user_id, responses_json) VALUES (?, ?, ?)',
            [formId, userId, responsesJson]
        );

        res.json({ success: true, message: 'ส่งคำตอบสำเร็จ ขอบคุณสำหรับความร่วมมือครับ/ค่ะ' });
    } catch (err) {
        console.error('Error submitting form response:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำตอบ' });
    }
};

// Get the specific CP321007 Evaluation Form
exports.getEvaluationForm = async (req, res) => {
    try {
        const [forms] = await pool.query(
            "SELECT id, title, description, is_active, start_date, end_date, form_schema FROM forms WHERE title LIKE '%Early Design%' OR title LIKE '%CP321007%' ORDER BY id DESC LIMIT 1"
        );

        if (!forms || forms.length === 0) {
            return res.status(404).json({ success: false, message: 'ยังไม่พบแบบประเมิน CP321007 ในระบบ' });
        }

        const form = forms[0];
        const now = new Date();
        let isActive = Boolean(form.is_active);
        if (isActive && form.start_date && new Date(form.start_date) > now) {
            isActive = false;
        }
        if (isActive && form.end_date && new Date(form.end_date) < now) {
            isActive = false;
        }

        res.json({
            success: true,
            form: {
                ...form,
                is_active: isActive
            }
        });
    } catch (err) {
        console.error('Error fetching evaluation form:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดแบบประเมิน' });
    }
};

// Export responses to CSV with UTF-8 BOM
exports.exportFormResponsesCsv = async (req, res) => {
    try {
        const formId = req.params.id;
        const [forms] = await pool.query('SELECT title, form_schema FROM forms WHERE id = ?', [formId]);
        if (forms.length === 0) {
            return res.status(404).send('Form not found');
        }

        const form = forms[0];
        const schema = Array.isArray(form.form_schema) ? form.form_schema : [];
        const [responses] = await pool.query('SELECT id, created_at, responses_json FROM form_responses WHERE form_id = ? ORDER BY id ASC', [formId]);

        // CSV Header
        const headers = ['ลำดับ', 'วัน-เวลาที่ตอบ'];
        schema.forEach((field) => {
            const cleanLabel = (field.label || field.id).replace(/"/g, '""');
            headers.push(`"${cleanLabel}"`);
        });

        const rows = [headers.join(',')];

        responses.forEach((row, idx) => {
            let ans = row.responses_json;
            if (typeof ans === 'string') {
                try { ans = JSON.parse(ans); } catch (e) { ans = {}; }
            }
            const dateStr = new Date(row.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            const line = [idx + 1, `"${dateStr}"`];

            schema.forEach(field => {
                const val = ans[field.id];
                const textVal = val !== undefined && val !== null ? String(val).replace(/"/g, '""') : '';
                line.push(`"${textVal}"`);
            });

            rows.push(line.join(','));
        });

        const csvContent = '\uFEFF' + rows.join('\r\n');
        const filename = `form_${formId}_responses_${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    } catch (err) {
        console.error('Error exporting form CSV:', err);
        res.status(500).send('Error exporting form responses');
    }
};
