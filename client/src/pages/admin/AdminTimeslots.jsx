import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Trash2, MapPin } from 'lucide-react';
import axios from 'axios';

export default function AdminTimeslots() {
  const [timeslots, setTimeslots] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ court_id: '', start_time: '16:00', end_time: '17:00' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tsRes, courtsRes] = await Promise.all([
        axios.get('/api/admin/timeslots'),
        axios.get('/api/admin/courts')
      ]);
      setTimeslots(tsRes.data || []);
      setCourts(courtsRes.data || []);
      if (courtsRes.data?.length > 0 && !newSlot.court_id) {
        setNewSlot(prev => ({ ...prev, court_id: courtsRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [newSlot.court_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.court_id) return alert('กรุณาเลือกสนาม');
    try {
      await axios.post('/api/admin/timeslots', newSlot);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกช่วงเวลา');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('ยืนยันการลบช่วงเวลานี้?')) return;
    try {
      await axios.delete('/api/admin/timeslots', { data: { id } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบรายการได้');
    }
  };

  // Group timeslots by court_id
  const groupedSlots = timeslots.reduce((acc, slot) => {
    if (!acc[slot.court_id]) acc[slot.court_id] = [];
    acc[slot.court_id].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
          <Clock size={20} className="text-brand-600" /> จัดการเวลาเปิดให้บริการ (Timeslots)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">กำหนดช่วงเวลาที่อนุญาตให้ผู้ใช้งานเริ่มจองสนาม โดยแยกตามแต่ละสนามเพื่อการจัดการที่ง่ายขึ้น</p>
      </div>

      {/* Quick Add Form */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Plus size={16} className="text-brand-600" /> เพิ่มช่วงเวลาใหม่
        </h4>
        <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกสนาม</label>
            <select
              value={newSlot.court_id}
              onChange={(e) => setNewSlot({ ...newSlot, court_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เวลาเริ่ม (Start)</label>
            <input
              type="time"
              required
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เวลาสิ้นสุด (End)</label>
            <input
              type="time"
              required
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition">
              เพิ่มช่วงเวลา
            </button>
          </div>
        </form>
      </div>

      {/* Grouped Timeslots List By Court */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-6 text-gray-400 font-medium text-sm">
          ยังไม่มีข้อมูลสนามในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courts.map((court) => {
            const courtSlots = groupedSlots[court.id] || [];
            return (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-base">{court.name}</h4>
                        <p className="text-xs text-gray-400 font-medium">{court.sport_name || court.type} • {court.id}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold text-xs rounded-full">
                      {courtSlots.length} ช่วงเวลา
                    </span>
                  </div>

                  <div className="space-y-2">
                    {courtSlots.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 font-medium">ยังไม่มีการตั้งค่าช่วงเวลาเปิดบริการ</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {courtSlots.map((ts) => (
                          <div
                            key={ts.id}
                            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-brand-200 transition"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                              <Clock size={13} className="text-brand-600" />
                              <span>{ts.start_time.substring(0, 5)} - {ts.end_time.substring(0, 5)} น.</span>
                            </div>
                            <button
                              onClick={() => handleDeleteSlot(ts.id)}
                              className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition"
                              title="ลบช่วงเวลานี้"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
