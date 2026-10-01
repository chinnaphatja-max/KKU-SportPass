import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, AlertCircle, Building2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function Login({ onLoginSuccess }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        if (onLoginSuccess) await onLoginSuccess();
        if (res.data.user && res.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (type) => {
    // Redirect to backend endpoint which will trigger Passport.js OAuth flow
    window.location.href = `/api/auth/${type}?t=${Date.now()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 flex flex-col justify-center px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-end mb-3">
          <LanguageToggle variant="dark" />
        </div>

        <div className="text-center mb-6">
          <img
            src="/KKU_SportPass.svg"
            alt="KKU SportPass Logo"
            className="w-16 h-16 mx-auto mb-2 drop-shadow-md"
            onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
          />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">KKU SportPass</h1>
          <p className="mt-1 text-sm sm:text-base text-white/95 font-medium">{t('auth_login_subtitle', 'ระบบจองสนามกีฬา มหาวิทยาลัยขอนแก่น')}</p>
        </div>

        <div className="bg-white py-6 px-6 sm:px-8 shadow-xl rounded-2xl border border-white/20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">{t('auth_login_title', 'เข้าสู่ระบบ')}</h2>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2.5 text-sm font-semibold">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('auth_email', 'อีเมล')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition"
                  placeholder={t('auth_email_placeholder', 'you@kkumail.com หรือ @kku.ac.th')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('auth_password', 'รหัสผ่าน')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
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
              className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 hover:bg-brand-500 transition text-base flex justify-center items-center active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {t('auth_btn_login', 'เข้าสู่ระบบ')} <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <span className="border-b w-1/4"></span>
            <span className="text-xs text-gray-400 uppercase font-bold">{t('auth_oauth_or', 'หรือเข้าสู่ระบบด้วย')}</span>
            <span className="border-b w-1/4"></span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700 font-bold text-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 mr-2.5" />
              {t('auth_login_google', 'เข้าสู่ระบบด้วย Google')}
            </button>

            <button
              onClick={() => handleOAuthLogin('ssonext')}
              className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl shadow-sm hover:from-red-700 hover:to-amber-700 transition text-sm"
            >
              <Building2 size={18} className="mr-2" />
              {t('auth_login_ssonext', 'เข้าสู่ระบบด้วย KKU SSONext')}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            {t('auth_no_account', 'ยังไม่มีบัญชีใช่หรือไม่?')}{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-bold hover:underline">
              {t('auth_register_link', 'สมัครสมาชิก')}
            </Link>
          </div>
        </div>

        <p className="text-center text-white/80 text-xs mt-6 font-medium">&copy; 2026 KKU SportPass</p>
      </motion.div>
    </div>
  );
}

