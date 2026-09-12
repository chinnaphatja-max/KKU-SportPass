import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ClipboardList, 
  AlertCircle, 
  CheckCircle2, 
  Star, 
  ArrowLeft, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  BookOpen, 
  Send,
  HelpCircle,
  Award
} from 'lucide-react';

// Likert Scale descriptors for 1-5 rating questions
const LIKERT_LEVELS = [
  { score: 5, label: 'เห็นด้วยอย่างยิ่ง', desc: 'ยอดเยี่ยม / ตรงใจมาก', activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/30' },
  { score: 4, label: 'เห็นด้วย', desc: 'ดี / สะดวกมาก', activeColor: 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30' },
  { score: 3, label: 'ปานกลาง', desc: 'พอใช้ / ปกติ', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30' },
  { score: 2, label: 'ไม่เห็นด้วย', desc: 'ควรปรับปรุง', activeColor: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/30' },
  { score: 1, label: 'ไม่เห็นด้วยอย่างยิ่ง', desc: 'ต้องแก้ไขด่วน', activeColor: 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30' }
];

export default function FormView() {
  const { id } = useParams();
  const location = useLocation();
  const isEvaluationRoute = location.pathname.includes('/evaluation');

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [responses, setResponses] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const fetchForm = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isEvaluationRoute || id === 'evaluation') {
        res = await axios.get('/api/forms/early-evaluation');
      } else {
        res = await axios.get(`/api/forms/${id}`);
      }

      if (res.data.success && res.data.form) {
        setForm(res.data.form);
      } else {
        setError('ไม่สามารถโหลดข้อมูลแบบฟอร์มได้');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  }, [id, isEvaluationRoute]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleChange = (qId, value) => {
    setResponses(prev => ({
      ...prev,
      [qId]: value
    }));

    // Clear validation error if user answered
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[qId];
        return newErrs;
      });
    }
  };

  // Calculate completion progress
  const progressStats = useMemo(() => {
    if (!form || !form.form_schema) return { answered: 0, total: 0, percent: 0 };
    const requiredQuestions = form.form_schema.filter(f => f.required);
    const total = requiredQuestions.length || form.form_schema.length;
    let answered = 0;
    requiredQuestions.forEach(f => {
      const val = responses[f.id];
      if (val !== undefined && val !== null && val !== '') {
        answered++;
      }
    });
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { answered, total, percent };
  }, [form, responses]);

  const validate = () => {
    const errs = {};
    let firstErrorId = null;

    if (form && form.form_schema) {
      form.form_schema.forEach(field => {
        if (field.required) {
          const val = responses[field.id];
          if (val === undefined || val === null || val === '') {
            errs[field.id] = 'กรุณาตอบคำถามนี้เพื่อดำเนินการต่อ';
            if (!firstErrorId) firstErrorId = field.id;
          }
        }
      });
    }

    setValidationErrors(errs);

    if (firstErrorId) {
      const element = document.getElementById(`field-${firstErrorId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validate()) {
      setSubmitError('กรุณากรอกคำตอบในข้อที่จำเป็น (*) ให้ครบถ้วน');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetFormId = form.id;
      const res = await axios.post(`/api/forms/${targetFormId}/responses`, { responses });
      if (res.data.success) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">กำลังเตรียมแบบสอบถาม...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่พบแบบฟอร์ม</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition shadow-sm">
            <ArrowLeft size={16} /> กลับสู่หน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  if (!form || !form.is_active) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{form?.title || 'แบบฟอร์ม'}</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            แบบสอบถามนี้ปิดรับการตอบกลับแล้ว ขอบคุณทุกท่านที่ให้ความร่วมมือครับ/ค่ะ
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition shadow-sm">
            <ArrowLeft size={16} /> กลับสู่หน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-[2.5rem] shadow-xl max-w-lg w-full text-center relative border border-white/60">
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20 rotate-3">
            <CheckCircle2 size={44} />
          </div>
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-3 border border-emerald-200">
            บันทึกคำตอบสำเร็จเรียบร้อย
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            ขอบคุณสำหรับความคิดเห็น!
          </h2>
          <p className="text-gray-600 mb-8 text-sm md:text-base leading-relaxed">
            ข้อมูลและข้อเสนอแนะอันมีค่าของท่านจะถูกนำไปใช้ในการวิเคราะห์และพัฒนานวัตกรรมระบบ <strong>KKU SportPass</strong> ในรายวิชา CP321007 ต่อไป
          </p>
          <div className="space-y-3">
            <a 
              href="https://kku-sport-pass.vercel.app/" 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 px-6 rounded-2xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <ExternalLink size={18} /> เยี่ยมชมและทดลองจองสนามบน KKU SportPass
            </a>
            <Link 
              to="/" 
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-200 transition"
            >
              <ArrowLeft size={16} /> กลับสู่หน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Group questions by section
  let currentSection = null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 font-sans pb-24 selection:bg-orange-200 selection:text-orange-900">
      {/* Sticky Progress Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm py-3 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <Link to="/" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-xs md:text-sm font-bold text-gray-700 truncate">
              {form.title}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-orange-600">{progressStats.answered} จาก {progressStats.total} ข้อ</div>
              <div className="text-[10px] text-gray-400">ความคืบหน้า {progressStats.percent}%</div>
            </div>
            <div className="w-24 sm:w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressStats.percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {/* Header Hero Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 relative">
          <div className="h-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">
                <BookOpen size={13} /> รายวิชา CP321007 Design Thinking for IT
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <Clock size={13} /> ใช้เวลาตอบ 3–5 นาที
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Award size={13} /> วิทยาลัยการคอมพิวเตอร์ มข.
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug mb-3">
              {form.title}
            </h1>

            {form.description && (
              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                {form.description}
              </div>
            )}

            {/* Prototype System Link Callout */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">ทดลองใช้งานเว็บไซต์ต้นแบบ (Prototype)</h4>
                  <p className="text-xs text-gray-500">สามารถเปิดชมระบบก่อนให้คะแนนเพื่อความแม่นยำ</p>
                </div>
              </div>
              <a 
                href="https://kku-sport-pass.vercel.app/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-600 border border-orange-300 font-bold text-xs hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-sm shrink-0"
              >
                <span>เปิดดูเว็บไซต์ KKU SportPass</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="text-rose-500 font-medium">* ข้อมูลที่มีเครื่องหมายดอกจัน จำเป็นต้องตอบ</span>
              <span>รหัสแบบฟอร์ม: #{form.id}</span>
            </div>
          </div>
        </div>

        {/* Question Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.form_schema && form.form_schema.map((field) => {
            // Check if we need to render a Section Header
            let renderSection = false;
            if (field.section && field.section !== currentSection) {
              currentSection = field.section;
              renderSection = true;
            }

            const isAnswered = responses[field.id] !== undefined && responses[field.id] !== null && responses[field.id] !== '';

            return (
              <div key={field.id} id={`field-${field.id}`} className="space-y-4">
                {/* Section Header */}
                {renderSection && (
                  <div className="pt-6 pb-1">
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-4 text-white shadow-md flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Award size={18} />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold tracking-tight">
                        {field.section}
                      </h3>
                    </div>
                  </div>
                )}

                {/* Question Card */}
                <div 
                  className={`bg-white rounded-2xl shadow-sm border p-5 sm:p-6 transition-all ${
                    validationErrors[field.id] 
                      ? 'border-rose-300 bg-rose-50/20 ring-2 ring-rose-100' 
                      : isAnswered 
                        ? 'border-orange-200/80' 
                        : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <label className="block text-sm sm:text-base font-bold text-gray-800 leading-snug">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                    </label>
                    {isAnswered && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                        <CheckCircle2 size={12} /> ตอบแล้ว
                      </span>
                    )}
                  </div>

                  {/* 1. Single Choice Radio / Select */}
                  {field.type === 'select' && (
                    <div className="space-y-2.5">
                      {field.options && field.options.map((opt, i) => {
                        const isChecked = responses[field.id] === opt;
                        return (
                          <label 
                            key={i} 
                            onClick={() => handleChange(field.id, opt)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-orange-50/60 border-orange-400 text-orange-900 shadow-sm font-semibold'
                                : 'bg-white border-gray-200 hover:bg-gray-50/80 text-gray-700'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name={field.id}
                              value={opt}
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 cursor-pointer"
                            />
                            <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Rating 1-5 Scale */}
                  {field.type === 'rating' && (
                    <div className="pt-2">
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-3 mb-3">
                        {LIKERT_LEVELS.map((item) => {
                          const isSelected = Number(responses[field.id]) === item.score;
                          return (
                            <button
                              type="button"
                              key={item.score}
                              onClick={() => handleChange(field.id, item.score)}
                              className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl border transition-all duration-150 ${
                                isSelected 
                                  ? `${item.activeColor} shadow-md scale-102 font-bold`
                                  : 'bg-slate-50/70 border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
                              }`}
                            >
                              <Star 
                                size={22} 
                                fill={isSelected ? 'currentColor' : 'none'} 
                                className={isSelected ? 'text-white drop-shadow-sm' : 'text-gray-400'} 
                              />
                              <span className="text-sm sm:text-base font-extrabold mt-1">
                                {item.score}
                              </span>
                              <span className="text-[10px] sm:text-xs text-center mt-1 line-clamp-1 leading-tight hidden xs:block">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Descriptive Legend */}
                      <div className="flex justify-between items-center px-1 text-[11px] text-gray-400 font-medium">
                        <span className="text-rose-500 font-semibold">1 = ไม่เห็นด้วยอย่างยิ่ง</span>
                        <span className="text-amber-500 font-semibold">3 = ปานกลาง</span>
                        <span className="text-emerald-600 font-semibold">5 = เห็นด้วยอย่างยิ่ง</span>
                      </div>
                    </div>
                  )}

                  {/* 3. Textarea / Open-ended Paragraph */}
                  {field.type === 'textarea' && (
                    <div>
                      <textarea 
                        rows={4}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="w-full border border-gray-200 rounded-2xl p-3.5 text-xs sm:text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition resize-y bg-gray-50/50"
                        placeholder={field.placeholder || 'ระบุความคิดเห็นหรือข้อเสนอแนะเพิ่มเติม...'}
                      />
                    </div>
                  )}

                  {/* 4. Text Input */}
                  {field.type === 'text' && (
                    <div>
                      <input 
                        type="text" 
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs sm:text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition bg-gray-50/50"
                        placeholder={field.placeholder || 'คำตอบของคุณ'}
                      />
                    </div>
                  )}

                  {/* Error Notification per Question */}
                  {validationErrors[field.id] && (
                    <div className="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" /> {validationErrors[field.id]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Form-level Submit Error */}
          {submitError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{submitError}</div>
            </div>
          )}

          {/* Submit Action Area */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-400 flex items-center gap-1.5 order-2 sm:order-1">
              <HelpCircle size={14} /> ข้อมูลจะถูกนำไปใช้เพื่อการศึกษาและการพัฒนานวัตกรรมเท่านั้น
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all order-1 sm:order-2 ${
                isSubmitting 
                  ? 'bg-orange-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/25 hover:-translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>ส่งแบบสอบถาม</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
