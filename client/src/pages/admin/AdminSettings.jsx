import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Shield, CreditCard, Calendar, Clock, Users, GraduationCap, Briefcase, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      setMessage('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว การตั้งค่ามีผลทันทีผ่านระบบ Cache Invalidation');
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h3 className="font-extrabold text-gray-900 text-xl flex items-center gap-2">
          <Settings size={22} className="text-[#fe6e00]" /> การตั้งค่าระบบ (System Settings)
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          กำหนดค่านโยบายการจอง โควตาผู้ใช้ ระยะเวลา Pre-confirm/Check-in เกตเวย์ชำระเงิน และโดเมนอีเมล
        </p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-200 shadow-sm animate-fadeIn">
          <AlertCircle size={18} /> {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-4 border-[#fe6e00]/20 border-t-[#fe6e00] rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Group 1: Booking Quotas & Rules */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Calendar size={18} className="text-[#fe6e00]" /> 1. กฎการจองล่วงหน้าและการยกเลิก (Booking & Cancellation Rules)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  จองล่วงหน้าสูงสุด (วัน)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.max_advance_booking_days ?? 7}
                  onChange={(e) => setSettings({ ...settings, max_advance_booking_days: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">อนุญาตให้ผู้ใช้เลือกวันที่จองล่วงหน้าได้ไม่เกินกี่วัน</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  โควตาการจองพร้อมกันสูงสุด (รายการ/คน)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_active_bookings_per_user ?? 2}
                  onChange={(e) => setSettings({ ...settings, max_active_bookings_per_user: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">จำนวนสล็อตที่ยังไม่ได้ใช้งานพร้อมกันสูงสุดต่อผู้ใช้</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  เวลายกเลิกล่วงหน้าขั้นต่ำ (นาที)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={settings.cancellation_lead_minutes ?? 30}
                  onChange={(e) => setSettings({ ...settings, cancellation_lead_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">ต้องกดยกเลิกก่อนเริ่มใช้งานอย่างน้อยกี่นาที</span>
              </div>
            </div>
          </div>

          {/* Group 2: Check-in & Pre-Confirm Rules */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock size={18} className="text-[#fe6e00]" /> 2. การยืนยันสิทธิ์และการเช็คอิน (Confirmation & Verification)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  เปิดยืนยันขอผ่อนผันเวลา (นาทีก่อนเริ่ม)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.pre_confirm_open_minutes ?? 10}
                  onChange={(e) => setSettings({ ...settings, pre_confirm_open_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">เริ่มเปิดให้กดยืนยัน (ไม่บังคับกด เผื่อรถติด/มาสาย)</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  ปิดรับการยืนยันขอผ่อนผัน (นาทีก่อนเริ่ม)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.pre_confirm_close_minutes ?? 5}
                  onChange={(e) => setSettings({ ...settings, pre_confirm_close_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">สิ้นสุดช่วงขอยืดหยุ่นเวลา หากไม่กดจะได้สิทธิ์ตามเวลาพื้นฐาน (T=0)</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  เปิดเช็คอินก่อนเริ่มรอบ (นาที)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.checkin_early_minutes ?? 10}
                  onChange={(e) => setSettings({ ...settings, checkin_early_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">อนุญาตให้ผู้ใช้สแกน QR เช็คอินล่วงหน้าก่อนถึงเวลาเริ่มรอบ</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  ระยะผ่อนผันเช็คอินพื้นฐาน (T = 0 ถึง T + ... นาที)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.checkin_baseline_grace_minutes ?? 5}
                  onChange={(e) => setSettings({ ...settings, checkin_baseline_grace_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">ระยะเวลาให้ผู้ใช้ที่ไม่กดยืนยันมีเวลาเปิดเว็บสแกนเช็คอินหน้าสนามก่อนตัดสิทธิ์หลุดจอง</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  ระยะผ่อนผันเช็คอินสาย (นาที)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.checkin_grace_minutes ?? 10}
                  onChange={(e) => setSettings({ ...settings, checkin_grace_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">ขยายเวลาเช็คอินหน้าสนามสำหรับผู้ที่กดยืนยันสิทธิ์ล่วงหน้า (T + Extended Grace)</span>
              </div>


              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  รัศมี GPS เช็คอิน (เมตร)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={settings.gps_radius_meters ?? 30}
                  onChange={(e) => setSettings({ ...settings, gps_radius_meters: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">ระยะห่างสูงสุดจากพิกัดสนามจริงที่ระบบยอมรับ</span>
              </div>
            </div>
          </div>

          {/* Group 3: Payment Configuration */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard size={18} className="text-[#fe6e00]" /> 3. ระบบการชำระเงินและพร้อมเพย์ (Payment Gateway)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  โหมดระบบการชำระเงิน (Payment Gateway Mode)
                </label>
                <select
                  value={settings.payment_mode || 'simulated'}
                  onChange={(e) => setSettings({ ...settings, payment_mode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                >
                  <option value="simulated">จำลองการชำระเงิน (Simulated Demo Mode)</option>
                  <option value="promptpay">ไทยคิวอาร์พร้อมเพย์ (Native PromptPay QR EMVCo)</option>
                  <option value="omise">เกตเวย์พาณิชย์ Omise / Opn Payments</option>
                </select>
                <span className="text-xs text-gray-500 mt-1 block">
                  โหมด PromptPay รองรับการสแกนผ่านแอปธนาคารไทยทุกแห่ง
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  หมายเลขพร้อมเพย์มหาวิทยาลัยขอนแก่น (PromptPay ID)
                </label>
                <input
                  type="text"
                  placeholder="0994000159491 หรือเบอร์มือถือ 08xxxxxxxx"
                  value={settings.promptpay_id || '0994000159491'}
                  onChange={(e) => setSettings({ ...settings, promptpay_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  เลขประจำตัวผู้เสียภาษี 13 หลัก หรือหมายเลขโทรศัพท์ 10 หลัก
                </span>
              </div>
            </div>
          </div>

          {/* Group 4: Security & Domains */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Shield size={18} className="text-[#fe6e00]" /> 4. ความปลอดภัยและการเข้าถึง (Security & Access Control)
            </h4>

            {/* Explanatory Policy Badge */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-brand-600 mt-0.5">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  ระบบรองรับบุคคล 3 กลุ่ม (นักศึกษา / บุคลากร / บุคคลภายนอก)
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed font-medium">
                  ระบบเปิดให้ลงทะเบียนได้ทุกโดเมนอีเมล (ไม่จำกัดเฉพาะอีเมลมหาวิทยาลัย) โดยใช้อีเมลเพื่อจำแนกและจำกัดสถานะกลุ่มผู้ใช้งานอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Domains */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <GraduationCap size={16} className="text-brand-600" /> โดเมนอีเมลสถานะนักศึกษา (Student Domains)
                </label>
                <input
                  type="text"
                  value={settings.student_email_domains ?? 'kkumail.com'}
                  onChange={(e) => setSettings({ ...settings, student_email_domains: e.target.value })}
                  placeholder="kkumail.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  ผู้ใช้อีเมลโดเมนนี้จะได้รับสถานะ <strong>นักศึกษา</strong> อัตโนมัติ
                </span>
              </div>

              {/* Staff Domains */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase size={16} className="text-brand-600" /> โดเมนอีเมลสถานะบุคลากร (Staff Domains)
                </label>
                <input
                  type="text"
                  value={settings.staff_email_domains ?? 'kku.ac.th'}
                  onChange={(e) => setSettings({ ...settings, staff_email_domains: e.target.value })}
                  placeholder="kku.ac.th"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  ผู้ใช้อีเมลโดเมนนี้จะได้รับสถานะ <strong>บุคลากร</strong> อัตโนมัติ
                </span>
              </div>
            </div>

            {/* External Registration Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Globe size={16} className="text-brand-600" /> อนุญาตให้บุคคลภายนอกลงทะเบียน (External Users)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  เปิดให้อีเมลทั่วไป (Gmail, Hotmail, Outlook ฯลฯ) สมัครใช้งานได้ในสถานะ <strong>บุคคลภายนอก</strong>
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={String(settings.allow_external_registration) !== 'false'}
                  onChange={(e) => setSettings({ ...settings, allow_external_registration: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fe6e00]"></div>
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#fe6e00] hover:bg-[#e06200] text-white rounded-2xl text-sm font-bold shadow-md shadow-[#fe6e00]/20 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าระบบ'}
            </button>
            <span className="text-xs text-gray-500">การบันทึกจะล้างแคชหน่วยความจำอัตโนมัติ</span>
          </div>
        </form>
      )}


    </div>
  );
}
