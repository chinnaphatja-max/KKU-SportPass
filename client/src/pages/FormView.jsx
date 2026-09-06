import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';

export default function FormView() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [responses, setResponses] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const fetchForm = useCallback(async () => {
    try {
      const res = await axios.get(`/api/forms/${id}`);
      if (res.data.success) {
        setForm(res.data.form);
      } else {
        setError('ไม่สามารถโหลดข้อมูลฟอร์มได้');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleChange = (qId, value) => {
    setResponses(prev => ({
      ...prev,
      [qId]: value
    }));
    // Clear validation error if user types
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[qId];
        return newErrs;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (form && form.form_schema) {
      form.form_schema.forEach(field => {
        if (field.required) {
          const val = responses[field.id];
          if (val === undefined || val === null || val === '') {
            errs[field.id] = 'กรุณาตอบคำถามนี้';
          }
        }
      });
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validate()) {
      setSubmitError('กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน');
      return;
    }

    try {
      const res = await axios.post(`/api/forms/${id}/responses`, { responses });
      if (res.data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่พบแบบฟอร์ม</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link to="/" className="inline-block bg-brand-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-700 transition">กลับสู่หน้าแรก</Link>
        </div>
      </div>
    );
  }

  if (!form.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border-t-4 border-gray-400">
          <ClipboardList size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">{form.title}</h2>
          <p className="text-gray-500 mb-6">แบบฟอร์มนี้ถูกปิดรับการตอบกลับแล้ว ขอบคุณที่ให้ความสนใจ</p>
          <Link to="/" className="inline-block bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-medium hover:bg-gray-200 transition">กลับสู่หน้าแรก</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งคำตอบสำเร็จ!</h2>
          <p className="text-gray-500 mb-8">ขอบคุณสำหรับเวลาและความร่วมมือในการตอบแบบฟอร์มนี้</p>
          <Link to="/" className="block w-full bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition">กลับสู่หน้าแรก</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 border-t-8 border-t-brand-500">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{form.title}</h1>
            {form.description && (
              <p className="text-gray-600 whitespace-pre-wrap">{form.description}</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-rose-500 font-medium">
              * จำเป็นต้องตอบ
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {form.form_schema && form.form_schema.map((field) => (
            <div key={field.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-colors ${validationErrors[field.id] ? 'border-rose-300 bg-rose-50/30' : 'border-gray-100'}`}>
              <label className="block text-base font-semibold text-gray-800 mb-4">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </label>

              {field.type === 'text' && (
                <input 
                  type="text" 
                  value={responses[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-brand-500 outline-none bg-transparent py-2 transition-colors"
                  placeholder="คำตอบของคุณ"
                />
              )}

              {field.type === 'textarea' && (
                <textarea 
                  value={responses[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px] resize-y"
                  placeholder="คำตอบของคุณ"
                />
              )}

              {field.type === 'select' && (
                <div className="space-y-2">
                  {field.options && field.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name={field.id}
                        value={opt}
                        checked={responses[field.id] === opt}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'rating' && (
                <div className="flex justify-between items-center max-w-sm mx-auto">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <label key={rating} className="flex flex-col items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name={field.id}
                        value={rating}
                        checked={String(responses[field.id]) === String(rating)}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                        ${String(responses[field.id]) === String(rating) 
                          ? 'bg-brand-600 text-white scale-110 shadow-md' 
                          : 'bg-gray-100 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-600'
                        }`}
                      >
                        {rating}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {validationErrors[field.id] && (
                <div className="mt-2 text-sm text-rose-500 flex items-center gap-1">
                  <AlertCircle size={14} /> {validationErrors[field.id]}
                </div>
              )}
            </div>
          ))}

          {submitError && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <button 
              type="submit"
              className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              ส่งคำตอบ
            </button>
            <div className="hidden sm:block text-sm text-gray-400">
              ไม่เปิดเผยข้อมูลส่วนตัว
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
