import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, ArrowLeft, BarChart2, Calendar, FileText, CheckCircle, XCircle, Download, Star, MessageSquare, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editor states
  const [editingForm, setEditingForm] = useState(null);
  const [activeTab, setActiveTab] = useState('settings'); // settings, stats
  const [formStats, setFormStats] = useState(null);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/forms');
      setForms(res.data.forms || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถดึงข้อมูลแบบฟอร์มได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreateNew = async () => {
    try {
      const newForm = {
        title: 'ฟอร์มใหม่',
        description: '',
        is_active: false,
        start_date: null,
        end_date: null,
        form_schema: []
      };
      const res = await axios.post('/api/admin/forms', newForm);
      if (res.data.success) {
        setForms([res.data.form, ...forms]);
        handleEditForm(res.data.form);
      }
    } catch {
      alert('สร้างแบบฟอร์มไม่สำเร็จ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบฟอร์มนี้? ข้อมูลการตอบกลับทั้งหมดจะถูกลบด้วย')) return;
    try {
      await axios.delete(`/api/admin/forms/${id}`);
      setForms(forms.filter(f => f.id !== id));
      if (editingForm && editingForm.id === id) {
        setEditingForm(null);
      }
    } catch {
      alert('ลบแบบฟอร์มไม่สำเร็จ');
    }
  };

  const handleEditForm = async (form) => {
    setEditingForm(form);
    setActiveTab('settings');
    setFormStats(null);
    // Fetch stats for this form
    try {
      const res = await axios.get(`/api/admin/forms/${form.id}`);
      setFormStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveForm = async (updatedForm) => {
    try {
      await axios.put(`/api/admin/forms/${updatedForm.id}`, updatedForm);
      alert('บันทึกสำเร็จ');
      setForms(forms.map(f => f.id === updatedForm.id ? updatedForm : f));
      setEditingForm(updatedForm);
    } catch {
      alert('บันทึกไม่สำเร็จ');
    }
  };

  if (loading && forms.length === 0) return <div className="p-8 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>;

  if (editingForm) {
    return (
      <FormEditor 
        form={editingForm} 
        stats={formStats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSave={handleSaveForm}
        onBack={() => { setEditingForm(null); fetchForms(); }}
      />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-white rounded-xl hover:bg-gray-50 border border-gray-100 shadow-sm">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการแบบฟอร์ม</h1>
            <p className="text-sm text-gray-500">สร้างและจัดการฟอร์มสอบถามต่างๆ</p>
          </div>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 transition"
        >
          <Plus size={20} /> สร้างฟอร์มใหม่
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map(form => (
          <div key={form.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{form.title || 'ไม่มีชื่อ'}</h3>
              {form.is_active ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12}/> เปิดรับ</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full"><XCircle size={12}/> ปิดรับ</span>
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">{form.description || 'ไม่มีคำอธิบาย'}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
              <span className="flex items-center gap-1"><FileText size={14} /> {form.form_schema ? form.form_schema.length : 0} คำถาม</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(form.created_at).toLocaleDateString('th-TH')}</span>
            </div>
            
            <div className="flex gap-2 border-t border-gray-100 pt-4 mt-auto">
              <button 
                onClick={() => handleEditForm(form)}
                className="flex-1 flex items-center justify-center gap-1 bg-brand-50 text-brand-600 py-2 rounded-xl text-sm font-medium hover:bg-brand-100 transition"
              >
                <Edit2 size={16} /> จัดการ
              </button>
              <button 
                onClick={() => handleDelete(form.id)}
                className="w-10 flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {forms.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-500">
            ยังไม่มีแบบฟอร์ม กด "สร้างฟอร์มใหม่" เพื่อเริ่มต้น
          </div>
        )}
      </div>
    </div>
  );
}

function FormEditor({ form, stats, activeTab, setActiveTab, onSave, onBack }) {
  const [formData, setFormData] = useState(form);

  const handleUpdateField = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleAddQuestion = () => {
    const newQ = { id: `q_${Date.now()}`, type: 'text', label: '', required: false };
    handleUpdateField('form_schema', [...(formData.form_schema || []), newQ]);
  };

  const handleUpdateQuestion = (index, key, value) => {
    const newSchema = [...(formData.form_schema || [])];
    newSchema[index][key] = value;
    handleUpdateField('form_schema', newSchema);
  };

  const handleRemoveQuestion = (index) => {
    const newSchema = [...(formData.form_schema || [])];
    newSchema.splice(index, 1);
    handleUpdateField('form_schema', newSchema);
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white rounded-xl hover:bg-gray-50 border border-gray-100 shadow-sm">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{formData.title || 'ไม่มีชื่อ'}</h1>
            <p className="text-sm text-gray-500">จัดการรายละเอียดแบบฟอร์มและดูผลลัพธ์</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/form/${form.id}`} target="_blank" rel="noreferrer" className="px-4 py-2 text-brand-600 bg-brand-50 rounded-xl font-medium hover:bg-brand-100 text-sm">ดูหน้าฟอร์มจริง</a>
          <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 text-sm shadow-sm">
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-3 px-6 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'settings' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('settings')}
        >
          ตั้งค่าฟอร์ม & คำถาม
        </button>
        <button
          className={`pb-3 px-6 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'stats' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={16} /> ผลการตอบกลับ ({stats?.total || 0})
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg mb-2">ข้อมูลทั่วไป</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อฟอร์ม</label>
              <input 
                type="text" 
                value={formData.title || ''} 
                onChange={e => handleUpdateField('title', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
              <textarea 
                value={formData.description || ''} 
                onChange={e => handleUpdateField('description', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none h-24"
              ></textarea>
            </div>
            <div className="flex items-center gap-3 py-2 border-t border-gray-100 mt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.is_active || false} 
                  onChange={(e) => handleUpdateField('is_active', e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">เปิดรับการตอบกลับ (เปิดการใช้งาน)</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">วัน/เวลา เปิดฟอร์ม (ถ้ามี)</label>
                <input 
                  type="datetime-local" 
                  value={formData.start_date ? new Date(new Date(formData.start_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleUpdateField('start_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">วัน/เวลา ปิดฟอร์ม (ถ้ามี)</label>
                <input 
                  type="datetime-local" 
                  value={formData.end_date ? new Date(new Date(formData.end_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleUpdateField('end_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-lg">รายการคำถาม</h3>
              <button 
                onClick={handleAddQuestion}
                className="flex items-center gap-1 text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-100"
              >
                <Plus size={16} /> เพิ่มคำถาม
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.form_schema?.map((field, index) => (
                <div key={field.id} className="border border-gray-200 p-4 rounded-xl relative group">
                  <button 
                    onClick={() => handleRemoveQuestion(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">คำถาม / หัวข้อ</label>
                      <input 
                        type="text" 
                        value={field.label} 
                        onChange={(e) => handleUpdateQuestion(index, 'label', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="เช่น ชื่อ-นามสกุล"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">รูปแบบคำตอบ</label>
                      <select 
                        value={field.type} 
                        onChange={(e) => handleUpdateQuestion(index, 'type', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white"
                      >
                        <option value="text">ข้อความสั้น (Text)</option>
                        <option value="textarea">ข้อความยาว (Paragraph)</option>
                        <option value="rating">ให้คะแนน 1-5 (Rating)</option>
                        <option value="select">เลือก 1 ข้อ (Dropdown)</option>
                      </select>
                    </div>
                  </div>
                  
                  {field.type === 'select' && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">ตัวเลือก (คั่นด้วยจุลภาค ,)</label>
                      <input 
                        type="text" 
                        value={field.options?.join(', ') || ''} 
                        onChange={(e) => handleUpdateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="เช่น ตัวเลือก A, ตัวเลือก B, ตัวเลือก C"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`req_${field.id}`}
                      checked={field.required} 
                      onChange={(e) => handleUpdateQuestion(index, 'required', e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor={`req_${field.id}`} className="text-xs font-medium text-gray-600">จำเป็นต้องตอบ (Required)</label>
                  </div>
                </div>
              ))}
              {(!formData.form_schema || formData.form_schema.length === 0) && (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  ไม่มีคำถามในฟอร์มนี้ กด "เพิ่มคำถาม" เพื่อเริ่มต้น
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg">
            <div>
              <p className="text-brand-100 text-sm font-medium mb-1">ผู้ตอบแบบฟอร์มทั้งหมด</p>
              <h2 className="text-4xl font-bold">{stats?.total || 0} <span className="text-lg font-normal">คน</span></h2>
            </div>
            <div>
              <a 
                href={`/api/admin/forms/${form.id}/export-csv`} 
                download
                className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm shadow-md hover:bg-brand-50 transition-all"
              >
                <Download size={16} /> ส่งออกข้อมูลเป็น CSV (Excel)
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formData.form_schema?.map(field => {
              const fieldStat = stats?.dynamicStats?.[field.id];
              const fieldCounts = fieldStat?.counts || {};
              const items = Object.entries(fieldCounts).sort((a, b) => {
                // If keys are numbers (rating 1-5), sort descending by score
                const numA = Number(a[0]);
                const numB = Number(b[0]);
                if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
                return b[1] - a[1];
              });

              // Rating question display with Mean
              if (field.type === 'rating') {
                const avg = fieldStat?.average || '0.00';
                return (
                  <div key={field.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-semibold text-gray-800 text-sm leading-snug">{field.label}</h4>
                        <span className="shrink-0 inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold">
                          <Star size={12} fill="currentColor" /> {avg} / 5
                        </span>
                      </div>

                      <div className="space-y-2.5 mt-4">
                        {[5, 4, 3, 2, 1].map((score) => {
                          const count = fieldCounts[score] || 0;
                          const percent = stats?.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                          return (
                            <div key={score} className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span className="font-medium">ระดับ {score} ดาว</span>
                                <span className="font-bold text-gray-800">{count} คน ({percent}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-50 text-[11px] text-gray-400 text-right">
                      ตอบแล้ว {fieldStat?.total || 0} คน
                    </div>
                  </div>
                );
              }

              // Text / Textarea qualitative feedback display
              if (field.type === 'text' || field.type === 'textarea') {
                const comments = fieldStat?.textResponses || [];
                return (
                  <div key={field.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm md:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <MessageSquare size={16} />
                        </div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{field.label}</h4>
                      </div>
                      <span className="text-xs font-bold bg-gray-100 text-gray-700 py-1 px-2.5 rounded-lg shrink-0">
                        {comments.length} ความคิดเห็น
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {comments.map((text, cIdx) => (
                        <div key={cIdx} className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 flex items-start gap-2.5">
                          <Quote size={16} className="text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{text}</p>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-sm text-gray-400 py-4 text-center">ยังไม่มีข้อเสนอแนะในข้อนี้</p>
                      )}
                    </div>
                  </div>
                );
              }

              // Dropdown / Select choices
              return (
                <div key={field.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="font-semibold text-gray-800 text-sm mb-4 leading-snug">{field.label}</h4>
                  <div className="space-y-3">
                    {items.map(([key, count]) => {
                      const pct = stats?.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 truncate max-w-[180px]">{key}</span>
                            <span className="font-bold text-gray-800">{count} คน ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
