import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldHalf, Plus, Trash2, MapPin, Clock, CalendarX, Settings } from 'lucide-react';
import axios from 'axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('courts');
  const [courts, setCourts] = useState([]);
  const [closures, setClosures] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding court
  const [newCourt, setNewCourt] = useState({ name: '', type: 'badminton', capacity: 1, lat: 16.4429, lng: 102.8252 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'courts') {
        const res = await axios.get('/api/admin/courts');
        setCourts(res.data || []);
      } else if (activeTab === 'closures') {
        const res = await axios.get('/api/admin/closures');
        setClosures(res.data || []);
      } else if (activeTab === 'timeslots') {
        const res = await axios.get('/api/admin/timeslots');
        setTimeslots(res.data || []);
      }
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
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างสนาม');
    }
  };

  const handleDeleteCourt = async (id) => {
    if (!confirm(`ยืนยันการลบสนาม ${id}?`)) return;
    try {
      await axios.delete('/api/admin/courts', { data: { id } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบสนามได้');
    }
  };

  return (
    <div className="px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldHalf size={24} className="text-brand-600" />
            ระบบแอดมิน (Admin)
          </h2>
          <p className="text-xs text-gray-500 mt-1">จัดการสนาม เวลาให้บริการ ปิดสนาม และการตั้งค่า</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'courts', label: 'จัดการสนาม', icon: MapPin },
          { id: 'closures', label: 'การปิดสนาม', icon: CalendarX },
          { id: 'timeslots', label: 'ช่วงเวลา', icon: Clock }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'courts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-sm">รายการสนามทั้งหมด ({courts.length})</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
            >
              <Plus size={16} /> เพิ่มสนามใหม่
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {courts.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{c.name} <span className="text-xs text-gray-400 font-normal">({c.id})</span></h4>
                    <p className="text-xs text-gray-500 mt-0.5">ประเภท: {c.type} | รับได้: {c.capacity || 1} คน/กลุ่ม | พิกัด: {c.latitude}, {c.longitude}</p>
                  </div>
                  <button onClick={() => handleDeleteCourt(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Court Modal */}
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนรับต่อรอบ (คน/กลุ่ม)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newCourt.capacity}
                  onChange={(e) => setNewCourt({ ...newCourt, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
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
