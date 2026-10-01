import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, User, Edit2, X, Save } from 'lucide-react';
import axios from 'axios';

const ROLES = [
  { value: 'admin', label: 'Admin — จัดการสนาม/จอง/ตั้งค่า' },
  { value: 'staff', label: 'Staff — ปฏิบัติการสนาม/เช็คอิน' },
  { value: 'viewer', label: 'Viewer — อ่านอย่างเดียว' },
  { value: 'super_admin', label: 'Super Admin — สิทธิ์เต็ม (ใช้ระวัง)' },
];

const ROLE_BADGE = {
  super_admin: 'bg-red-50 text-red-700 border-red-200',
  admin: 'bg-brand-50 text-brand-700 border-brand-200',
  staff: 'bg-blue-50 text-blue-700 border-blue-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function AdminAdmins({ user }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAdmins(); }, []);

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

  const openAdd = () => {
    setFormData({ name: '', email: '', password: '', phone: '', role: 'staff' });
    setEditingAdmin(null);
    setShowAddModal(true);
  };

  const openEdit = (adm) => {
    setFormData({ name: adm.name, email: adm.email, phone: adm.phone || '', password: '', role: adm.role || 'admin' });
    setEditingAdmin(adm);
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAdmin) {
        // Update: send role + name + phone (no password if blank)
        const payload = { id: editingAdmin.id, name: formData.name, phone: formData.phone, role: formData.role };
        if (formData.password.trim()) payload.password = formData.password;
        await axios.put('/api/admin/admins', payload);
      } else {
        await axios.post('/api/admin/admins', formData);
      }
      setShowAddModal(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบผู้ดูแลระบบคนนี้?')) return;
    try {
      await axios.delete('/api/admin/admins', { data: { id } });
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
            <Shield size={20} className="text-brand-600" /> จัดการผู้ดูแลระบบ
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">เพิ่ม แก้ไข ลบ และกำหนดสิทธิ์ Role ของผู้ดูแลระบบ</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
        >
          <Plus size={16} /> เพิ่มแอดมินใหม่
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
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
                <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg">
                  {adm.name?.substring(0, 1) || <User size={18} />}
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    {adm.name}
                    {adm.is_me && (
                      <span className="text-[10px] px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-bold">คุณ</span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{adm.email}</p>
                  <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGE[adm.role] || ROLE_BADGE.viewer}`}>
                    {adm.role}
                  </span>
                </div>
              </div>

              {!adm.is_me && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(adm)}
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition border border-transparent hover:border-brand-200"
                    title="แก้ไข Role / ข้อมูล"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(adm.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="ลบแอดมิน"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-gray-900 text-lg">
                {editingAdmin ? 'แก้ไขข้อมูลแอดมิน' : 'เพิ่มผู้ดูแลระบบใหม่'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="แอดมิน ประจำสนาม"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">อีเมล</label>
                <input
                  type="email" required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={Boolean(editingAdmin)}
                  placeholder="admin@kku.ac.th"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-400 outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812345678"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  รหัสผ่าน {editingAdmin && <span className="font-normal text-gray-400">(เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
                </label>
                <input
                  type="password"
                  minLength={editingAdmin ? 0 : 6}
                  required={!editingAdmin}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-400 outline-none"
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">สิทธิ์การเข้าถึง (Role)</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-400 outline-none"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Save size={14} /> {saving ? 'กำลังบันทึก...' : (editingAdmin ? 'บันทึกการแก้ไข' : 'สร้างแอดมิน')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
