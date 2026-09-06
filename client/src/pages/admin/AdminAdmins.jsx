import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, User } from 'lucide-react';
import axios from 'axios';

export default function AdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/admins');
      setAdmins(res.data.admins || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/admins', formData);
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', phone: '' });
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างแอดมิน');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบผู้ดูแลระบบคนนี้?')) return;
    try {
      await axios.delete('/api/admin/admins', { data: { id } });
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบผู้ดูแลระบบได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
            <Shield size={20} className="text-brand-600" /> จัดการผู้ดูแลระบบ (Admins)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">เพิ่มหรือลบสิทธิ์ผู้ใช้งานระดับผู้ดูแลระบบ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
        >
          <Plus size={16} /> เพิ่มแอดมินใหม่
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((adm) => (
            <motion.div
              key={adm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    {adm.name} {adm.is_me && <span className="text-[10px] px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-bold">คุณ</span>}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{adm.email}</p>
                </div>
              </div>

              {!adm.is_me && (
                <button
                  onClick={() => handleDelete(adm.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                  title="ลบแอดมินคนนี้"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-extrabold text-gray-900 text-lg mb-4">เพิ่มผู้ดูแลระบบ</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="แอดมิน ประจำสนาม"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">อีเมล</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin.new@kkumail.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812345678"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
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
