import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Phone, AlertCircle, Building2, Eye, EyeOff, GraduationCap, Briefcase, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function Register({ onLoginSuccess }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', user_type: 'student' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailChange = (val) => {
    const clean = val.trim().toLowerCase();
    let detectedType = formData.user_type;
    if (clean.endsWith('@kkumail.com')) {
      detectedType = 'student';
    } else if (clean.endsWith('@kku.ac.th')) {
      detectedType = 'staff';
    } else if (clean.includes('@') && clean.split('@')[1]?.includes('.')) {
      detectedType = 'external';
    }
    setFormData(prev => ({ ...prev, email: val, user_type: detectedType }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/register', formData);
      if (res.data.success) {
        if (onLoginSuccess) await onLoginSuccess();
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (type) => {
    try {
      const res = await axios.get(`/api/auth/${type}`);
      if (res.data.success) {
        if (onLoginSuccess) await onLoginSuccess();
        navigate('/');
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 flex flex-col justify-center px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-end mb-3">
          <LanguageToggle variant="dark" />
        </div>

        <div className="text-center mb-5">
          <img
            src="/KKU_SportPass.svg"
            alt="KKU SportPass Logo"
            className="w-16 h-16 mx-auto mb-2 drop-shadow-md"
            onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
          />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">KKU SportPass</h1>
          <p className="mt-1 text-sm sm:text-base text-white/95 font-medium">{t('auth_login_subtitle', 'ระบบจองสนามกีฬา มหาวิทยาลัยขอนแก่น')}</p>
        </div>

        <div className="bg-white py-6 px-6 sm:px-7 shadow-xl rounded-2xl border border-white/40">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-5">{t('auth_register_title', 'สมัครสมาชิก')}</h2>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2.5 text-sm font-semibold">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            {/* User Group Selector */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">กลุ่มผู้ใช้งาน (User Category)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'student', label: 'นักศึกษา', icon: GraduationCap, sub: 'Student' },
                  { id: 'staff', label: 'บุคลากร', icon: Briefcase, sub: 'Staff' },
                  { id: 'external', label: 'บุคคลภายนอก', icon: Globe, sub: 'External' },
                ].map((grp) => {
                  const GrpIcon = grp.icon;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, user_type: grp.id })}
                      className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center cursor-pointer ${
                        formData.user_type === grp.id
                          ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <GrpIcon size={20} className="mb-1" />
                      <span className="text-sm leading-tight font-bold">{grp.label}</span>
                      <span className="text-xs opacity-70">{grp.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('auth_fullname', 'ชื่อ-นามสกุล')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  placeholder={t('auth_fullname_placeholder', 'สมชาย ใจดี')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('auth_email', 'อีเมล')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  placeholder="เช่น @kkumail.com, @kku.ac.th, @gmail.com"
                />
              </div>
              <div className="mt-1.5 text-xs font-medium">
                {formData.user_type === 'student' && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 border border-emerald-200">
                    <GraduationCap size={13} className="text-emerald-600" />
                    <span>สถานะนักศึกษา มข.</span>
                  </span>
                )}
                {formData.user_type === 'staff' && (
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 border border-blue-200">
                    <Briefcase size={13} className="text-blue-600" />
                    <span>สถานะบุคลากร มข.</span>
                  </span>
                )}
                {formData.user_type === 'external' && (
                  <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 border border-orange-200">
                    <Globe size={13} className="text-orange-600" />
                    <span>สถานะบุคคลภายนอก (สมัครได้ทุกอีเมล)</span>
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('auth_phone', 'เบอร์โทรศัพท์')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  placeholder={t('auth_phone_placeholder', '0812345678')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('auth_password', 'รหัสผ่าน')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 hover:bg-brand-500 transition text-base flex justify-center items-center active:scale-[0.98] disabled:opacity-70 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {t('auth_register_btn', 'สมัครสมาชิก')}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-base text-gray-600">
            <p>
              {t('auth_have_account', 'มีบัญชีอยู่แล้ว?')}{' '}
              <Link to="/login" className="text-brand-600 font-bold hover:underline">
                {t('auth_btn_login', 'เข้าสู่ระบบ')}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-8 font-medium">&copy; 2026 KKU SportPass</p>
      </motion.div>
    </div>
  );
}

