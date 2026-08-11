import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarOff, Plus, Trash2, MapPin } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

export default function AdminClosures() {
  const [closures, setClosures] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClosure, setNewClosure] = useState({ court_id: '', close_date: '', reason: '' });

  useEffect(() => {
    fetchClosures();
    fetchCourts();
  }, []);

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/closures');
      setClosures(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await axios.get('/api/admin/courts');
      setCourts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddClosure = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/closures', newClosure);
      setNewClosure({ court_id: '', close_date: '', reason: '' });
      fetchClosures();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกการปิดสนาม');
    }
  };

  const handleDeleteClosure = async (id) => {
    if (!confirm('ยืนยันการลบรายการปิดสนามนี้?')) return;
    try {
      await axios.delete('/api/admin/closures', { data: { id } });
      fetchClosures();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบรายการได้');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-gray-900 text-lg">ปฏิทินการปิดสนาม (Court Closures)</h3>
        <p className="text-xs text-gray-500 mt-0.5">กำหนดการปิดให้บริการสนามชั่วคราวกรณีฉุกเฉิน ซ่อมบำรุง หรือจัดกิจกรรม</p>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Plus size={16} className="text-brand-600" /> เพิ่มรายการปิดสนาม
        </h4>
        <form onSubmit={handleAddClosure} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกสนาม (เว้นว่างหากปิดทุกสนาม)</label>
            <select
              value={newClosure.court_id}
              onChange={(e) => setNewClosure({ ...newClosure, court_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
            >
              <option value="">-- ทุกสนาม (All Courts) --</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ปิดบริการ</label>
            <div className="relative group">
              <input
                type="text"
                readOnly
                value={newClosure.close_date ? formatThaiDate(newClosure.close_date, true) : 'เลือกวันที่'}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none group-focus-within:border-brand-500 transition-colors relative z-0 cursor-pointer"
              />
              <input
                type="date"
                required
                value={newClosure.close_date}
                onChange={(e) => setNewClosure({ ...newClosure, close_date: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                title="เลือกวันที่ปิดสนาม"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">สาเหตุ</label>
            <input
              type="text"
              required
              placeholder="เช่น ปรับปรุงพื้นสนาม"
              value={newClosure.reason}
              onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-700 transition">
              บันทึกรายการ
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
        <h4 className="font-bold text-gray-800 text-sm mb-4">รายการปิดสนามทั้งหมด ({closures.length})</h4>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          </div>
        ) : closures.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8 font-medium">ไม่มีรายการปิดสนาม</p>
        ) : (
          <div className="space-y-2">
            {closures.map((cl) => (
              <div key={cl.id} className="p-3.5 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                <div>
                  <span className="font-bold text-gray-900 text-xs">{cl.court_name || 'ทุกสนาม (All Courts)'}</span>
                  <span className="ml-2 text-xs text-brand-600 font-semibold">{formatThaiDate(cl.close_date, true)}</span>
                  <p className="text-xs text-gray-500 mt-0.5">สาเหตุ: {cl.reason}</p>
                </div>
                <button onClick={() => handleDeleteClosure(cl.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
