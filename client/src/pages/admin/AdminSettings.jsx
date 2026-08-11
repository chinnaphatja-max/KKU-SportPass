import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/settings');
      const list = res.data.settings || [];
      const map = {};
      list.forEach(s => {
        map[s.setting_key] = s.setting_value;
      });
      setSettings(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.put('/api/admin/settings', { settings });
      setMessage('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
          <Settings size={20} className="text-brand-600" /> การตั้งค่าระบบ (System Settings)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">ปรับแต่งเงื่อนไขเวลาการยืนยันสิทธิ์ รัศมี GPS และการอนุญาตโดเมนอีเมล</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
          <AlertCircle size={18} /> {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">เวลาเปิดยืนยันสิทธิ์ก่อนเริ่ม (นาที)</label>
              <input
                type="number"
                value={settings.pre_confirm_open_minutes || 10}
                onChange={(e) => setSettings({ ...settings, pre_confirm_open_minutes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">เวลาปิดยืนยันสิทธิ์ก่อนเริ่ม (นาที)</label>
              <input
                type="number"
                value={settings.pre_confirm_close_minutes || 5}
                onChange={(e) => setSettings({ ...settings, pre_confirm_close_minutes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ระยะผ่อนผันเช็คอินหลังเวลาเริ่ม (นาที)</label>
              <input
                type="number"
                value={settings.checkin_grace_minutes || 15}
                onChange={(e) => setSettings({ ...settings, checkin_grace_minutes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">รัศมี GPS อนุญาตเช็คอิน (เมตร)</label>
              <input
                type="number"
                value={settings.gps_radius_meters || 30}
                onChange={(e) => setSettings({ ...settings, gps_radius_meters: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">โดเมนอีเมลที่อนุญาตให้สมัคร (คั่นด้วยเครื่องหมายจุลภาค)</label>
            <input
              type="text"
              value={settings.allowed_email_domains || 'kkumail.com,kku.ac.th'}
              onChange={(e) => setSettings({ ...settings, allowed_email_domains: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition flex items-center gap-2"
            >
              <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
