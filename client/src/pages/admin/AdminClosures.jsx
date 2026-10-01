import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Calendar, List } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function buildCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 0=Sun
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function AdminClosures() {
  const [closures, setClosures] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [calDate, setCalDate] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [newClosure, setNewClosure] = useState({
    court_id: '', close_date: '', start_time: '', end_time: '', reason: ''
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
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteClosure = async (id) => {
    if (!window.confirm('ยืนยันการลบรายการปิดสนามนี้?')) return;
    try {
      await axios.delete('/api/admin/closures', { data: { id } });
      fetchClosures();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบได้');
    }
  };

  // Calendar helpers
  const closureDateMap = closures.reduce((acc, cl) => {
    const d = cl.close_date?.split('T')[0] || cl.close_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(cl);
    return acc;
  }, {});

  const { year, month } = calDate;
  const calDays = buildCalendarDays(year, month);
  const today = new Date().toISOString().split('T')[0];

  const pad = (n) => String(n).padStart(2, '0');
  const calKey = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
            <Calendar className="text-[#fe6e00]" size={20} /> ปฏิทินการปิดสนาม (Court Closures)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">กำหนดการปิดให้บริการแบบตลอดวันหรือบางช่วงเวลา</p>
        </div>
        {/* View Toggle */}
        <div className="inline-flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List size={13} /> รายการ
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Calendar size={13} /> ปฏิทิน
          </button>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Plus size={16} className="text-[#fe6e00]" /> เพิ่มรายการปิดสนาม
        </h4>
        <form onSubmit={handleAddClosure} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกสนาม (เว้นว่างหากปิดทุกสนาม)</label>
            <select
              value={newClosure.court_id}
              onChange={e => setNewClosure({ ...newClosure, court_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            >
              <option value="">-- ทุกสนาม (All Courts) --</option>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ปิดบริการ</label>
            <div className="relative group">
              <input
                type="text" readOnly
                value={newClosure.close_date ? formatThaiDate(newClosure.close_date, true) : 'เลือกวันที่'}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium cursor-pointer"
              />
              <input
                type="date" required
                value={newClosure.close_date}
                onChange={e => setNewClosure({ ...newClosure, close_date: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">สาเหตุ</label>
            <input
              type="text" required
              placeholder="เช่น ปรับปรุงพื้นสนาม, งานแข่งขัน"
              value={newClosure.reason}
              onChange={e => setNewClosure({ ...newClosure, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เวลาเริ่ม (เว้นว่าง = ปิดทั้งวัน)</label>
            <input
              type="time"
              value={newClosure.start_time}
              onChange={e => setNewClosure({ ...newClosure, start_time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เวลาสิ้นสุด (เว้นว่าง = ปิดทั้งวัน)</label>
            <input
              type="time"
              value={newClosure.end_time}
              onChange={e => setNewClosure({ ...newClosure, end_time: e.target.value })}
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

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalDate(prev => {
                const d = new Date(prev.year, prev.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold hover:bg-gray-200 transition"
            >
              ← ย้อนหลัง
            </button>
            <h4 className="font-extrabold text-gray-900 text-base">
              {MONTHS_TH[month]} {year + 543}
            </h4>
            <button
              onClick={() => setCalDate(prev => {
                const d = new Date(prev.year, prev.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold hover:bg-gray-200 transition"
            >
              ถัดไป →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_TH.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = calKey(day);
              const dayClosures = closureDateMap[key] || [];
              const isToday = key === today;
              const hasClosure = dayClosures.length > 0;

              return (
                <div
                  key={key}
                  className={`min-h-[60px] p-1.5 rounded-xl border text-xs transition-all ${
                    hasClosure
                      ? 'bg-orange-50 border-orange-200'
                      : isToday
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <span className={`font-bold block text-center mb-1 ${isToday ? 'text-blue-600' : hasClosure ? 'text-[#fe6e00]' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {dayClosures.map((cl, ci) => (
                    <div key={ci} className="text-[9px] font-bold text-white bg-[#fe6e00] rounded px-1 py-0.5 mb-0.5 truncate leading-tight" title={`${cl.court_name || 'ทุกสนาม'}: ${cl.reason}`}>
                      {cl.court_name || 'ทุก'} {cl.start_time ? `${cl.start_time.substring(0, 5)}-${cl.end_time?.substring(0, 5)}` : 'ทั้งวัน'}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200 inline-block" /> มีการปิดสนาม</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> วันนี้</span>
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <h4 className="font-bold text-gray-800 text-sm mb-4">รายการปิดสนามทั้งหมด ({closures.length})</h4>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-[#fe6e00]/30 border-t-[#fe6e00] rounded-full animate-spin" />
            </div>
          ) : closures.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 font-medium">ไม่มีรายการปิดสนาม</p>
          ) : (
            <div className="space-y-2">
              {closures.map(cl => {
                const isPartial = Boolean(cl.start_time && cl.end_time);
                return (
                  <div key={cl.id} className="p-3.5 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100 hover:border-gray-200 transition">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-xs">{cl.court_name || 'ทุกสนาม (All Courts)'}</span>
                        <span className="text-xs text-[#fe6e00] font-semibold">{formatThaiDate(cl.close_date, true)}</span>
                        {isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> {cl.start_time.substring(0, 5)} – {cl.end_time.substring(0, 5)} น.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ปิดทั้งวัน
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">สาเหตุ: {cl.reason}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteClosure(cl.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
