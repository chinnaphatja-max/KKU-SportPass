import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings2, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

export default function CookieConsent() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);


  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('kku_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    localStorage.setItem('kku_cookie_consent', 'accepted_all');
    localStorage.setItem('kku_cookie_prefs', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    setShow(false);
    try {
      await axios.post('/api/cookies/consent', { analytics: true, marketing: true });
    } catch (e) {
      console.debug('Cookie consent logging skipped:', e.message);
    }
  };

  const handleDeclineAll = async () => {
    localStorage.setItem('kku_cookie_consent', 'declined_all');
    localStorage.setItem('kku_cookie_prefs', JSON.stringify({ essential: true, analytics: false, marketing: false }));
    setShow(false);
    try {
      await axios.post('/api/cookies/consent', { analytics: false, marketing: false });
    } catch (e) {
      console.debug('Cookie consent logging skipped:', e.message);
    }
  };

  const handleSaveSettings = async () => {
    localStorage.setItem('kku_cookie_consent', 'customized');
    localStorage.setItem('kku_cookie_prefs', JSON.stringify(preferences));
    setShowSettings(false);
    setShow(false);
    try {
      await axios.post('/api/cookies/consent', { analytics: preferences.analytics, marketing: preferences.marketing });
    } catch (e) {
      console.debug('Cookie consent logging skipped:', e.message);
    }
  };

  const ToggleSwitch = ({ label, description, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="pr-4">
        <div className="font-bold text-gray-800 text-sm">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
          checked ? 'bg-emerald-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {show && !showSettings && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto md:w-[450px] z-[9999]"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-[2rem] shadow-2xl shadow-gray-900/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Cookie size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-extrabold text-gray-900 text-lg">{t('cookie_title', 'การใช้คุกกี้')}</h3>
                    <button
                      onClick={handleDeclineAll}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {t('cookie_desc', 'เราใช้คุกกี้เพื่อเพิ่มประสิทธิภาพ และประสบการณ์ที่ดีในการใช้งานเว็บไซต์ คุณสามารถเลือกยอมรับ ปฏิเสธ หรือปรับแต่งการใช้งานคุกกี้ได้')} <br />
                    <Link to="/privacy-policy" className="text-brand-600 font-semibold hover:underline inline-flex items-center gap-1 mt-1">
                      {t('cookie_read_policy', 'อ่านนโยบายคุ้มครองข้อมูลส่วนบุคคล')} <ExternalLink size={12} />
                    </Link>
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleAcceptAll}
                      className="w-full bg-gray-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> {t('cookie_accept_all', 'ยอมรับทั้งหมด')}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSettings(true)}
                        className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings2 size={18} /> {t('cookie_customize', 'ปรับแต่งคุกกี้')}
                      </button>
                      <button
                        onClick={handleDeclineAll}
                        className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        {t('cookie_decline', 'ปฏิเสธ')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg">{t('cookie_settings_title', 'ปรับแต่งคุกกี้')}</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm border border-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <ToggleSwitch
                  label={t('cookie_essential_title', 'คุกกี้ที่จำเป็น (Essential)')}
                  description={t('cookie_essential_desc', 'จำเป็นสำหรับการทำงานพื้นฐานของเว็บไซต์ ไม่สามารถปิดการใช้งานได้')}
                  checked={preferences.essential}
                  disabled={true}
                  onChange={() => {}}
                />
                <ToggleSwitch
                  label={t('cookie_analytics_title', 'คุกกี้เพื่อการวิเคราะห์ (Analytics)')}
                  description={t('cookie_analytics_desc', 'ช่วยให้เราเข้าใจพฤติกรรมการใช้งาน และปรับปรุงประสบการณ์ให้ดีขึ้น')}
                  checked={preferences.analytics}
                  onChange={(v) => setPreferences({ ...preferences, analytics: v })}
                />
                <ToggleSwitch
                  label={t('cookie_marketing_title', 'คุกกี้เพื่อการโฆษณา (Marketing)')}
                  description={t('cookie_marketing_desc', 'ใช้สำหรับแสดงโฆษณาที่เกี่ยวข้องและตรงตามความสนใจของคุณ')}
                  checked={preferences.marketing}
                  onChange={(v) => setPreferences({ ...preferences, marketing: v })}
                />
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <Link to="/privacy-policy" className="text-brand-600 font-semibold text-sm flex items-center gap-1 hover:underline">
                    {t('cookie_read_policy', 'อ่านนโยบายคุ้มครองข้อมูลส่วนบุคคลฉบับเต็ม')} <ExternalLink size={14} />
                  </Link>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 bg-gray-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md"
                >
                  {t('cookie_save', 'บันทึกการตั้งค่า')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
