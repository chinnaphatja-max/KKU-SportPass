import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, QrCode, MapPin, AlertCircle, X, Navigation, Waves, Target, Feather, Activity, Goal, LayoutGrid, Trophy, Dumbbell, CircleDot, Shield, Crosshair, Zap, Star, Search, Clock } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../utils/date';
import { useLanguage } from '../context/LanguageContext';

const SPORT_META = {
  swimming: { labelTh: 'ว่ายน้ำ', labelEn: 'Swimming', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-100', image: 'https://images.unsplash.com/photo-1519315901367-f34f8a554a32?w=800&q=80' },
  tennis: { labelTh: 'เทนนิส', labelEn: 'Tennis', icon: Target, color: 'text-lime-500', bg: 'bg-lime-100', image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80' },
  badminton: { labelTh: 'แบดมินตัน', labelEn: 'Badminton', icon: Feather, color: 'text-indigo-500', bg: 'bg-indigo-100', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
  football: { labelTh: 'ฟุตบอล', labelEn: 'Football', icon: Goal, color: 'text-green-500', bg: 'bg-green-100', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80' },
  basketball: { labelTh: 'บาสเก็ตบอล', labelEn: 'Basketball', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-100', image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80' },
  futsal: { labelTh: 'ฟุตซอล', labelEn: 'Futsal', icon: Goal, color: 'text-emerald-500', bg: 'bg-emerald-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  fitness: { labelTh: 'ฟิตเนส', labelEn: 'Fitness', icon: Dumbbell, color: 'text-gray-700', bg: 'bg-gray-200', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  petanque: { labelTh: 'เปตอง', labelEn: 'Petanque', icon: CircleDot, color: 'text-stone-500', bg: 'bg-stone-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  sepak_takraw: { labelTh: 'เซปักตะกร้อ', labelEn: 'Sepak Takraw', icon: CircleDot, color: 'text-amber-600', bg: 'bg-amber-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  volleyball: { labelTh: 'วอลเลย์บอล', labelEn: 'Volleyball', icon: Activity, color: 'text-yellow-500', bg: 'bg-yellow-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  table_tennis: { labelTh: 'เทเบิลเทนนิส', labelEn: 'Table Tennis', icon: Target, color: 'text-red-500', bg: 'bg-red-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  martial_arts: { labelTh: 'ศิลปะป้องกันตัว', labelEn: 'Martial Arts', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  shooting: { labelTh: 'ยิงปืน', labelEn: 'Shooting', icon: Crosshair, color: 'text-zinc-600', bg: 'bg-zinc-200', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  archery: { labelTh: 'ยิงธนู', labelEn: 'Archery', icon: Crosshair, color: 'text-teal-600', bg: 'bg-teal-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  softball: { labelTh: 'ซอฟท์บอล', labelEn: 'Softball', icon: CircleDot, color: 'text-orange-400', bg: 'bg-orange-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  hockey: { labelTh: 'ฮอกกี้', labelEn: 'Hockey', icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-100', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  rugby: { labelTh: 'รักบี้', labelEn: 'Rugby', icon: Goal, color: 'text-amber-800', bg: 'bg-amber-200', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  all: { labelTh: 'ทั้งหมด', labelEn: 'All Sports', icon: LayoutGrid, color: 'text-brand-500', bg: 'bg-brand-100', image: 'https://images.unsplash.com/photo-1587280501635-a19760152b40?w=800&q=80' }
};

function getSportMeta(type, language = 'th') {
  const meta = SPORT_META[type] || { labelTh: type, labelEn: type, icon: Trophy, color: 'text-gray-500', bg: 'bg-gray-100', image: 'https://images.unsplash.com/photo-1587280501635-a19760152b40?w=800&q=80' };
  return {
    ...meta,
    label: language === 'en' ? meta.labelEn : meta.labelTh
  };
}

export default function Dashboard({ user }) {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeReminder, setActiveReminder] = useState(null);

  useEffect(() => {
    if (!user) return;
    axios.get('/api/myBookings')
      .then(res => {
        const today = new Date().toISOString().split('T')[0];
        const active = (res.data.bookings || []).find(b => 
          b.booking_date === today && (b.status === 'PENDING' || b.status === 'PRE_CONFIRMED')
        );
        setActiveReminder(active || null);
      })
      .catch(() => {});
  }, [user]);

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/courts?date=${date}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  const courts = data?.courts || [];
  const sportsList = ['all', ...new Set(courts.map(c => c.type))];
  const visibleCourts = courts.filter(c => {
    const matchesSport = selectedSport === 'all' || c.type === selectedSport;
    const matchesSearch = !searchQuery.trim() || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.type && c.type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSport && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Premium Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-700 p-8 md:p-12 text-white shadow-2xl shadow-brand-500/30"
          >
            {/* Animated Background Elements */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -left-10 -bottom-10 w-48 h-48 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none"
            />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-4 border border-white/10"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  {t('dash_system_active', 'ระบบเปิดให้บริการแล้ว')}
                </motion.div>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">{t('dash_hero_title', 'จองสนามกีฬา มข.')}</h1>
                <p className="text-brand-50 md:text-lg opacity-90 max-w-md leading-relaxed font-light">
                  {t('dash_hero_sub', 'แพลตฟอร์มการจองออนไลน์ที่ทันสมัยที่สุด สะดวก รวดเร็ว พร้อมระบบยืนยันสิทธิ์ด้วย QR Code')}
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Active Booking Reminder Card */}
        {activeReminder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 md:p-5 rounded-3xl bg-white border-2 border-orange-200 shadow-lg shadow-orange-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fe6e00] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Clock size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#fe6e00] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                    🔔 {t('dash_reminder_today', 'รายการจองวันนี้')}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-700">
                    {activeReminder.booking_code || `#${activeReminder.id}`}
                  </span>
                </div>
                <p className="font-extrabold text-gray-900 text-sm md:text-base mt-1">
                  {activeReminder.court_name} ({activeReminder.start_time.substring(0, 5)} - {activeReminder.end_time.substring(0, 5)} น.)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeReminder.status === 'PENDING'
                    ? 'รอยืนยันสิทธิ์ล่วงหน้า (Pre-Confirm) ก่อนเริ่มรอบการใช้งาน'
                    : 'ยืนยันสิทธิ์เรียบร้อยแล้ว เตรียมพร้อมสแกน QR เพื่อเช็คอินที่สนาม'}
                </p>
              </div>
            </div>
            <div className="self-end sm:self-center shrink-0">
              {activeReminder.status === 'PENDING' ? (
                <Link
                  to="/bookings"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#fe6e00] hover:bg-[#e06100] text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
                >
                  <CheckCircle2 size={15} /> {t('btn_pre_confirm', 'กดยืนยันสิทธิ์')}
                </Link>
              ) : (
                <Link
                  to="/scan"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
                >
                  <QrCode size={15} /> {t('btn_checkin_qr', 'สแกน QR เช็คอิน')}
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Modern Guide Icons */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3 md:gap-6 mb-8 lg:mb-10"
        >
          {[
            { icon: CalendarPlus, label: 'เลือกเวลา', desc: 'จองล่วงหน้า 1 วัน', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { icon: CheckCircle2, label: 'ยืนยัน', desc: '10 นาทีก่อนเล่น', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { icon: QrCode, label: 'สแกนคิวอาร์', desc: 'ที่สนาม', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            { icon: Navigation, label: 'เช็คพิกัด', desc: 'ระบบ GPS', color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' }
          ].map((item, idx) => (
            <div key={idx} className={`bg-white rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col items-center text-center shadow-sm border ${item.border} hover:shadow-md transition-shadow group cursor-default`}>
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <span className="text-xs md:text-sm font-bold text-gray-800">{item.label}</span>
              <span className="hidden md:block text-[11px] text-gray-500 mt-1">{item.desc}</span>
            </div>
          ))}
        </motion.section>

        {/* Satisfaction Survey Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Link to="/survey" className="block relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 md:p-8 text-white shadow-lg hover:shadow-xl transition-shadow group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shrink-0">
                  <Star size={28} className="text-white" fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">📝 {t('dash_survey_banner_title', 'ทำแบบประเมินความพึงพอใจ')}</h3>
                  <p className="text-orange-50 font-medium text-sm md:text-base">{t('dash_survey_banner_desc', 'ช่วยเราพัฒนา KKU SportPass ให้ดียิ่งขึ้น เพื่อประสบการณ์ที่ยอดเยี่ยมของทุกคน!')}</p>
                </div>
              </div>
              <div className="shrink-0 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl shadow-sm group-hover:bg-orange-50 transition-colors w-full md:w-auto text-center">
                {t('dash_survey_banner_btn', 'เริ่มทำแบบประเมิน')}
              </div>
            </div>
          </Link>
        </motion.section>

        {/* Interactive Map Section */}
        <InteractiveMap onZoneClick={(zone) => setSelectedZone(zone)} />

        {/* Zone Selection Modal */}
        <AnimatePresence>
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setSelectedZone(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-lg">
                      {selectedZone.id.replace('z', '')}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900">{selectedZone.title}</h3>
                      <p className="text-sm text-brand-600 mt-1 font-semibold">เลือกสนามกีฬาที่ต้องการจอง</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedZone(null)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {courts
                      .filter(c => c.id.startsWith(selectedZone.id))
                      .map((court, idx) => (
                        <CourtCard 
                          key={court.id} 
                          court={court} 
                          date={date}
                          closedReason={data?.closedCourts?.[court.id]}
                          index={idx}
                        />
                    ))}
                  </div>
                  {courts.filter(c => c.id.startsWith(selectedZone.id)).length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">ไม่มีข้อมูลสนามกีฬาในโซนนี้</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Section (Sticky on Mobile) */}
        <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-xl pb-4 pt-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:pt-0 mt-8">
          <section className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-shrink-0">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">เลือกวันที่ต้องการ</label>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => document.getElementById('dashboard-date-picker')?.showPicker()}
                    className="flex items-center justify-between w-full md:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 md:py-3 outline-none group-focus-within:ring-2 group-focus-within:ring-brand-500/50 group-focus-within:border-brand-500 transition-all font-semibold text-gray-700 text-sm md:text-base cursor-pointer relative z-0 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarPlus className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                      {formatThaiDate(date, true)}
                    </div>
                  </button>
                  <input 
                    id="dashboard-date-picker"
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ค้นหาสนาม</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('dash_search_placeholder', 'พิมพ์ชื่อสนาม เช่น แบดมินตัน, ว่ายน้ำ...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 md:py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition"
                  />
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full overflow-hidden">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('label_court_type', 'ประเภทกีฬา')}</label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide snap-x">
                {sportsList.map((type) => {
                  const meta = getSportMeta(type, language);
                  const isSelected = selectedSport === type;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedSport(type)}
                      className={`shrink-0 snap-start px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                        isSelected 
                          ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-100' 
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 scale-95 hover:scale-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Courts Grid */}
        <section className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin shadow-lg"></div>
              <p className="text-sm text-gray-500 mt-6 font-semibold animate-pulse">กำลังดึงข้อมูลสนามอัปเดตล่าสุด...</p>
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 p-6 rounded-3xl flex items-center gap-4 border border-red-100 shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <p className="font-semibold">{error}</p>
            </motion.div>
          ) : data?.isAllClosed ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-red-100 p-10 rounded-3xl text-center shadow-lg shadow-red-500/5">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="font-extrabold text-2xl text-gray-900 mb-2">ปิดให้บริการ</h3>
              <p className="text-gray-500 font-medium">วันที่คุณเลือกปิดให้บริการทุกสนาม กรุณาเลือกวันอื่น</p>
            </motion.div>
          ) : visibleCourts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl">
              <div className="text-6xl mb-4 grayscale opacity-20">🏟️</div>
              <h3 className="text-lg font-bold text-gray-800">ไม่พบสนามกีฬา</h3>
              <p className="text-gray-400 font-medium text-sm mt-1">ลองเปลี่ยนประเภทกีฬาหรือวันที่ดูอีกครั้ง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {visibleCourts.map((court, idx) => (
                <CourtCard 
                  key={court.id} 
                  court={court} 
                  date={date}
                  closedReason={data.closedCourts[court.id]}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}

function CourtCard({ court, date, closedReason, index }) {
  const { t, language } = useLanguage();
  const meta = getSportMeta(court.type, language);
  const Icon = meta.icon;
  
  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        to={`/court/${court.id}?date=${date}`}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full hover:border-brand-200 hover:-translate-y-1 block"
      >
        <div className="p-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-900 text-lg truncate leading-tight group-hover:text-brand-600 transition-colors">{court.name}</h3>
            <div className="flex items-center gap-2 mt-1">
                <p className={`text-xs font-bold ${meta.color}`}>{meta.label}</p>
                {court.price && court.price !== 'ฟรี' ? (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                    {court.price}
                  </span>
                ) : court.price === 'ฟรี' ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    {t('label_free', 'ฟรี')}
                  </span>
                ) : null}
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6 pt-0 bg-white flex-1 flex flex-col justify-end">
          {closedReason ? (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-center text-xs font-semibold border border-red-100">
              {t('dash_closed', 'ปิดให้บริการ')}: {closedReason}
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold text-gray-400 group-hover:text-brand-500 transition-colors">{t('dash_view_slots', 'คลิกเพื่อดูตารางเวลา')}</span>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                <Navigation size={16} className="-rotate-90" />
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
}

function InteractiveMap({ onZoneClick }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 mb-8 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="text-brand-500 w-5 h-5" />
        <h2 className="text-lg font-bold text-gray-900">แผนที่สนามกีฬา มหาวิทยาลัยขอนแก่น</h2>
      </div>
      
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
        <img 
          src="https://sports.kku.ac.th/wp-content/uploads/2025/05/ec0d27f6-3693-4d42-b031-0b69a48c4d63.jpg" 
          alt="KKU Sports Facilities Map" 
          className="w-full h-auto object-contain mix-blend-multiply"
        />
        {/* Map Overlay Areas - Clickable Regions */}
        <MapArea top="15%" left="29%" width="12%" height="15%" zone="Zone 1" title="อาคารพลศึกษา" delay={0.3} onClick={() => onZoneClick({ id: 'z1', title: 'Zone 1 อาคารพลศึกษา' })} />
        <MapArea top="15%" left="15%" width="13%" height="12%" zone="Zone 2" title="อาคารอเนกประสงค์" delay={0.4} onClick={() => onZoneClick({ id: 'z2', title: 'Zone 2 อาคารอเนกประสงค์' })} />
        <MapArea top="28%" left="15%" width="13%" height="15%" zone="Zone 3" title="สนามกีฬา 50 ปี มข." delay={0.5} onClick={() => onZoneClick({ id: 'z3', title: 'Zone 3 สนามกีฬา 50 ปี มข.' })} />
        <MapArea top="65%" left="28%" width="10%" height="13%" zone="Zone 4" title="สนามเทนนิสสีฐาน" delay={0.6} onClick={() => onZoneClick({ id: 'z4', title: 'Zone 4 สนามเทนนิสสีฐาน' })} />
      </div>
    </motion.section>
  );
}

function MapArea({ top, left, width, height, zone, title, delay, onClick }) {
  const innerContent = (
    <div className="w-full h-full rounded-2xl border-2 border-transparent hover:border-brand-500 hover:bg-brand-500/20 hover:backdrop-blur-[2px] transition-all duration-300 cursor-pointer flex items-center justify-center relative">
      
      {/* The Circular Pin */}
      <div className="relative flex items-center justify-center group-hover:scale-110 transition-transform">
        <div className="absolute w-6 h-6 bg-brand-500/40 rounded-full animate-ping"></div>
        <div className="w-6 h-6 bg-brand-500 border-2 border-white rounded-full shadow-md z-10 flex items-center justify-center text-white text-[10px] font-bold">
          {zone.replace('Zone ', '')}
        </div>
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-900 text-white text-xs font-bold py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all pointer-events-none z-20 shadow-xl">
        <div className="text-brand-300 text-[10px] uppercase mb-0.5">{zone}</div>
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="absolute group"
      style={{ top, left, width, height }}
    >
      <div onClick={onClick} className="block w-full h-full">
        {innerContent}
      </div>
    </motion.div>
  );
}
