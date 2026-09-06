import { motion } from 'framer-motion';
import { CalendarCheck, MapPin, ShieldHalf, ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="bg-white/80 backdrop-blur-md fixed w-full z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img
                src="/KKU_SportPass.svg"
                alt="KKU SportPass Logo"
                className="h-10 w-auto"
                onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
              />
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">KKU SportPass</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <Link to="/about" className="text-brand-700 hover:text-brand-800 font-bold px-3 py-2 rounded-full transition hover:bg-brand-50 text-xs hidden sm:flex items-center gap-1.5">
                {t('nav_about', 'เกี่ยวกับเรา')}
              </Link>
              <Link to="/login" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full font-bold transition shadow-lg shadow-brand-500/30 text-xs">
                {t('nav_login', 'เข้าสู่ระบบ')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white pt-32 pb-24 border-b border-gray-100">
        <div className="absolute inset-y-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100 via-white to-white -z-10 opacity-70"></div>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
            <img
              src="/KKU_SportPass.svg"
              alt="KKU SportPass Logo"
              className="h-44 w-auto mx-auto drop-shadow-lg"
              onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
            />
          </motion.div>
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
            {t('landing_hero_title', 'จองสนามกีฬาได้ง่ายกว่าที่เคย')}
            <span className="block text-brand-600 mt-2">{t('landing_hero_sub', 'เพื่อชาว มข. โดยเฉพาะ')}</span>
          </motion.h1>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
            {t('landing_hero_desc', 'KKU SportPass เป็นแพลตฟอร์มดิจิทัลที่ช่วยให้นักศึกษาและบุคลากรของมหาวิทยาลัยขอนแก่น สามารถจองสนามกีฬา เช็คอิน และจัดการตารางการเล่นกีฬาได้อย่างสะดวกสบาย')}
          </motion.p>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-full font-bold text-sm transition shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2">
              {t('landing_btn_start', 'เริ่มใช้งานเลย')} <ArrowRight size={18} />
            </Link>
            <a href="#features" className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold text-sm transition flex items-center justify-center gap-2">
              {t('landing_btn_features', 'ดูคุณสมบัติ')} <ChevronDown size={18} />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900">{t('landing_feat_title', 'ฟีเจอร์เด่นของระบบ')}</h2>
            <p className="mt-3 text-sm text-gray-500 font-medium">{t('landing_feat_sub', 'ออกแบบมาเพื่อป้องกันการจองซ้ำและการทิ้งสนามโดยเฉพาะ')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 text-brand-600">
                <CalendarCheck size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">{t('landing_f1_title', 'จองออนไลน์ 24 ชม.')}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{t('landing_f1_desc', 'ดูตารางเวลาที่ว่างและทำการจองสนามกีฬาทุกประเภทภายใน มข. ได้อย่างรวดเร็วผ่านสมาร์ทโฟน')}</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 text-brand-600">
                <MapPin size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">{t('landing_f2_title', 'เช็คอินหน้าสนามด้วย GPS')}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{t('landing_f2_desc', 'ป้องกันการสวมรอย ด้วยระบบสแกน QR Code พร้อมตรวจสอบตำแหน่ง GPS ว่าอยู่ที่สนามจริงในรัศมี 30 เมตร')}</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 text-brand-600">
                <ShieldHalf size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">{t('landing_f3_title', 'ระบบจัดการล้ำสมัย')}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{t('landing_f3_desc', 'สำหรับผู้ดูแล สามารถจัดการสนาม เพิ่มเวลาให้บริการ และแจ้งปิดสนามกรณีฉุกเฉินหรือซ่อมบำรุงได้ทันที')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
          <img
            src="/KKU_SportPass.svg"
            alt="KKU SportPass Logo"
            className="h-10 w-auto mx-auto"
            onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
          />
          <p className="text-xs text-gray-400 font-medium">&copy; 2026 KKU SportPass — {t('landing_footer_text', 'มหาวิทยาลัยขอนแก่น (Khon Kaen University)')}</p>
        </div>
      </footer>

    </div>
  );
}
