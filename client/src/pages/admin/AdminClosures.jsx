import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Calendar } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

export default function AdminClosures() {
  const [closures, setClosures] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClosure, setNewClosure] = useState({
    court_id: '',
    close_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

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
      setNewClosure({ court_id: '', close_date: '', start_time: '', end_time: '', reason: '' });
      fetchClosures();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกการปิดสนาม');
    }
  };

  const handleDeleteClosure = async (id) => {
    if (!window.confirm('ยืนยันการลบรายการปิดสนามนี้?')) return;
    try {
      await axios.delete('/api/admin/closures', { data: { id } });
      fetchClosures();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบรายการได้');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
          <Calendar className="text-[#fe6e00]" size={20} /> ปฏิทินการปิดสนาม (Court Closures)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          กำหนดการปิดให้บริการสนามชั่วคราว ทั้งแบบตลอดวันและแบบเฉพาะบางช่วงเวลา (Partial-Day Closure)
        </p>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Plus size={16} className="text-[#fe6e00]" /> เพิ่มรายการปิดสนาม
        </h4>
        <form onSubmit={handleAddClosure} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกสนาม (เว้นว่างหากปิดทุกสนาม)</label>
            <select
              value={newClosure.court_id}
              onChange={(e) => setNewClosure({ ...newClosure, court_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
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
              placeholder="เช่น ปรับปรุงพื้นสนาม, จัดกิจกรรมการแข่งขัน"
              value={newClosure.reason}
              onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              เวลาเริ่มต้น (เว้นว่าง = ปิดทั้งวัน)
            </label>
            <input
              type="time"
              value={newClosure.start_time}
              onChange={(e) => setNewClosure({ ...newClosure, start_time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              เวลาสิ้นสุด (เว้นว่าง = ปิดทั้งวัน)
            </label>
            <input
              type="time"
              value={newClosure.end_time}
              onChange={(e) => setNewClosure({ ...newClosure, end_time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" className="w-full py-2.5 bg-[#fe6e00] hover:bg-[#e06100] text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95">
              บันทึกรายการปิดสนาม
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
        <h4 className="font-bold text-gray-800 text-sm mb-4">รายการปิดสนามทั้งหมด ({closures.length})</h4>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-3 border-[#fe6e00]/30 border-t-[#fe6e00] rounded-full animate-spin"></div>
          </div>
        ) : closures.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8 font-medium">ไม่มีรายการปิดสนาม</p>
        ) : (
          <div className="space-y-2">
            {closures.map((cl) => {
              const isPartial = Boolean(cl.start_time && cl.end_time);
              return (
                <div key={cl.id} className="p-3.5 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100 hover:border-gray-200 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-xs">{cl.court_name || 'ทุกสนาม (All Courts)'}</span>
                      <span className="text-xs text-[#fe6e00] font-semibold">{formatThaiDate(cl.close_date, true)}</span>
                      {isPartial ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> {cl.start_time.substring(0, 5)} - {cl.end_time.substring(0, 5)} น.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ปิดทั้งวัน (All Day)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">สาเหตุ: {cl.reason}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteClosure(cl.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="ลบรายการ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
