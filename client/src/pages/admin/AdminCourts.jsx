import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, MapPin } from 'lucide-react';
import axios from 'axios';

export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourt, setNewCourt] = useState({ name: '', type: 'badminton', lat: 16.4429, lng: 102.8252, capacity: 1 });

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/courts');
      setCourts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourt = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/courts', newCourt);
      setShowAddModal(false);
      fetchCourts();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเพิ่มสนาม');
    }
  };

  const handleDeleteCourt = async (id) => {
    if (!confirm(`ยืนยันการลบสนาม ${id}?`)) return;
    try {
      await axios.delete('/api/admin/courts', { data: { id } });
      fetchCourts();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบสนามได้');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg">รายการสนามทั้งหมด ({courts.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">จัดการเพิ่ม ลบ และดูข้อมูลตำแหน่งพิกัดของสนามกีฬาใน มข.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition"
        >
          <Plus size={16} /> เพิ่มสนามใหม่
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-6 text-gray-400 font-medium text-sm">
          ยังไม่มีข้อมูลสนามในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 bg-brand-50 text-brand-600 font-extrabold text-[11px] rounded-lg">
                    {c.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[10px] rounded">
                      รับ {c.capacity || 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      {c.sport_name || c.type}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 text-base mb-1">{c.name}</h4>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span>{c.latitude}, {c.longitude}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">ช่วงเวลา: {c.timeslot_count || 0} ช่อง</span>
                <button onClick={() => handleDeleteCourt(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-extrabold text-gray-900 text-lg mb-4">เพิ่มสนามใหม่</h3>
            <form onSubmit={handleCreateCourt} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อสนาม</label>
                <input
                  type="text"
                  required
                  value={newCourt.name}
                  onChange={(e) => setNewCourt({ ...newCourt, name: e.target.value })}
                  placeholder="สนามแบดมินตัน 2"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทกีฬา</label>
                <select
                  value={newCourt.type}
                  onChange={(e) => setNewCourt({ ...newCourt, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                >
                  <option value="badminton">แบดมินตัน</option>
                  <option value="futsal">ฟุตซอล</option>
                  <option value="basketball">บาสเกตบอล</option>
                  <option value="tennis">เทนนิส</option>
                  <option value="swimming">ว่ายน้ำ</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newCourt.lat}
                    onChange={(e) => setNewCourt({ ...newCourt, lat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newCourt.lng}
                    onChange={(e) => setNewCourt({ ...newCourt, lng: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนรับต่อรอบ (คน/กลุ่ม)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCourt.capacity}
                    onChange={(e) => setNewCourt({ ...newCourt, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20">บันทึก</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
