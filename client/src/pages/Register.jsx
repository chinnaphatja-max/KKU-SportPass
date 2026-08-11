import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Phone, AlertCircle, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Register({ onLoginSuccess }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 flex flex-col justify-center px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center mb-6">
          <img
            src="/KKU_SportPass.svg"
            alt="KKU SportPass Logo"
            className="w-20 h-20 mx-auto mb-3 drop-shadow-lg"
            onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">KKU SportPass</h1>
          <p className="mt-1 text-xs text-white/80 font-medium">สมัครสมาชิกเพื่อเริ่มจองสนามกีฬา</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
          <h2 className="text-xl font-bold text-gray-800 mb-6">สมัครสมาชิก</h2>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อ-นามสกุล</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium"
                  placeholder="สมชาย ใจดี"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">อีเมล</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium"
                  placeholder="you@kkumail.com หรือ @kku.ac.th"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">เบอร์โทรศัพท์</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium"
                  placeholder="0812345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-500 transition text-xs flex justify-center items-center active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  สมัครสมาชิก <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <span className="border-b w-1/4"></span>
            <span className="text-[10px] text-gray-400 uppercase font-bold">หรือสมัครสมาชิกด้วย</span>
            <span className="border-b w-1/4"></span>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700 font-semibold text-xs"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 mr-2.5" />
              สมัครสมาชิกด้วย Google
            </button>

            <button
              onClick={() => handleOAuthLogin('ssonext')}
              className="w-full flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700 font-semibold text-xs"
            >
              <Building2 size={16} className="text-brand-600 mr-2.5" />
              สมัครสมาชิกด้วย KKU SSONext
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="text-brand-600 font-bold hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/60 text-[11px] mt-6 font-medium">&copy; 2026 KKU SportPass</p>
      </motion.div>
    </div>
  );
}
