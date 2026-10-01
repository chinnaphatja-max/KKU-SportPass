import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Clock, AlertCircle, Check, X, ChevronLeft, ChevronRight, Trophy, Waves, Target, Feather, Activity, Goal, LayoutGrid, MapPin, Users, Ticket, Ban, Coins, Lightbulb, Info, ChevronDown, Sparkles } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate, formatFullThaiDate, getBangkokDateStr, getBangkokDate, getQuickDateList, addDays } from '../utils/date';
import { useLanguage } from '../context/LanguageContext';

const SPORT_META = {
  swimming: { label: 'ว่ายน้ำ', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-100' },
  tennis: { label: 'เทนนิส', icon: Target, color: 'text-lime-500', bg: 'bg-lime-100' },
  badminton: { label: 'แบดมินตัน', icon: Feather, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  football: { label: 'ฟุตบอล', icon: Goal, color: 'text-green-500', bg: 'bg-green-100' },
  basketball: { label: 'บาสเก็ตบอล', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-100' },
  futsal: { label: 'ฟุตซอล', icon: Goal, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  all: { label: 'ทั้งหมด', icon: LayoutGrid, color: 'text-brand-500', bg: 'bg-brand-100' }
};

function getSportMeta(type) {
  return SPORT_META[type] || { label: type, icon: Trophy, color: 'text-gray-500', bg: 'bg-gray-100' };
}

export default function CourtBooking({ user }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const todayStr = getBangkokDateStr(0);
  const tomorrowStr = getBangkokDateStr(1);
  const maxDateStr = getBangkokDateStr(7);

  // If visiting late at night (>= 21:00), default initial date directly to tomorrow
  const bangkokNow = getBangkokDate(0);
  const isLateNight = bangkokNow.getHours() >= 21;
  const initialDate = searchParams.get('date') || (isLateNight ? tomorrowStr : todayStr);

  const [date, setDate] = useState(initialDate);
  const [userManuallySelected, setUserManuallySelected] = useState(Boolean(searchParams.get('date')));
  const [autoSwitchedNotice, setAutoSwitchedNotice] = useState(
    !searchParams.get('date') && isLateNight
      ? { reason: 'passed', from: todayStr, to: tomorrowStr }
      : null
  );
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState(null); // time string
  const [bookingStatus, setBookingStatus] = useState(null); // 'submitting' | 'success' | 'error'
  const [modalMsg, setModalMsg] = useState('');

  // Waitlist Modal State
  const [waitlistModalSlot, setWaitlistModalSlot] = useState(null);
  const [waitlistStatus, setWaitlistStatus] = useState(null); // 'submitting' | 'success' | 'error'
  const [waitlistMsg, setWaitlistMsg] = useState('');

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/courts?date=${date}`);
      const fetchedData = res.data;
      setData(fetchedData);

      // Requirement: "หากมันเต็มหมดแล้วหรือหมดช่วงเวลาทั้งวันแล้วก็เอาของวันใหม่มาแสดงเลย"
      // If user is viewing today and has NOT manually picked today, check if today is ended or fully booked
      if (date === todayStr && !userManuallySelected && !searchParams.get('date')) {
        const courtSlots = fetchedData?.operatingSlots?.[id] || fetchedData?.availableSlots?.[id] || [];
        const pastSlots = fetchedData?.pastSlots?.[id] || [];
        const bookedSlots = fetchedData?.bookedSlots?.[id] || {};
        const courtObj = fetchedData?.courts?.find(c => String(c.id) === String(id));
        const capacity = courtObj?.capacity || 1;
        const isClosed = Boolean(fetchedData?.isAllClosed || fetchedData?.closedCourts?.[id]);

        const allSlotsPassed = courtSlots.length > 0 && courtSlots.every(s => pastSlots.includes(s));
        const activeSlots = courtSlots.filter(s => !pastSlots.includes(s));
        const allRemainingFull = activeSlots.length > 0 && activeSlots.every(s => (bookedSlots[s] || 0) >= capacity);

        if (allSlotsPassed || allRemainingFull || isClosed || (courtSlots.length > 0 && activeSlots.length === 0)) {
          setDate(tomorrowStr);
          setAutoSwitchedNotice({
            reason: allSlotsPassed ? 'passed' : 'full',
            from: todayStr,
            to: tomorrowStr
          });
          return;
        }
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [date, id, todayStr, tomorrowStr, userManuallySelected, searchParams]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);


  const handleConfirmBook = async () => {
    if (!selectedSlot) return;
    setBookingStatus('submitting');
    setModalMsg('');

    try {
      const res = await axios.post('/api/book', {
        court_id: id,
        date: date,
        time: selectedSlot
      });

      if (res.data.success) {
        setBookingStatus('success');
        setModalMsg(t('court_redirecting', 'จองสำเร็จ! กำลังนำคุณไปยังหน้ารายการจอง...'));
        fetchCourts();
        setTimeout(() => {
          setSelectedSlot(null);
          setBookingStatus(null);
          navigate(`/myBookings?highlight=${res.data.booking_id || ''}`);
        }, 1200);
      }
    } catch (err) {
      setBookingStatus('error');
      setModalMsg(err.response?.data?.error || 'การจองล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleConfirmWaitlist = async () => {
    if (!waitlistModalSlot) return;
    setWaitlistStatus('submitting');
    setWaitlistMsg('');

    try {
      const res = await axios.post('/api/waitlist/join', {
        court_id: id,
        date: date,
        time: waitlistModalSlot
      });

      if (res.data.success) {
        setWaitlistStatus('success');
        setWaitlistMsg(res.data.message || 'เข้าคิวรอรับสิทธิ์สำเร็จ! ระบบจะเลื่อนคิวให้อัตโนมัติเมื่อมีที่ว่าง');
        fetchCourts();
        setTimeout(() => {
          setWaitlistModalSlot(null);
          setWaitlistStatus(null);
          navigate('/myBookings?tab=waitlist');
        }, 1500);
      }
    } catch (err) {
      setWaitlistStatus('error');
      setWaitlistMsg(err.response?.data?.error || 'ไม่สามารถเข้าคิวรอได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const court = data?.courts?.find(c => String(c.id) === String(id));
  const courtId = court?.id;
  const slots = data?.operatingSlots?.[courtId] || data?.availableSlots?.[courtId] || [];
  const bookedCounts = data?.bookedSlots?.[courtId] || {};
  const waitlistCounts = data?.waitlistCounts?.[courtId] || {};
  const userBookings = data?.userBookings?.[courtId] || {};
  const userWaitlists = data?.userWaitlists?.[courtId] || {};
  const pastSlotsList = data?.pastSlots?.[courtId] || [];
  const walkInSlotsList = data?.walkInSlots?.[courtId] || [];
  const capacity = court?.capacity || 1;
  const closedReason = data?.closedCourts?.[courtId];
  const isAllClosed = data?.isAllClosed;

  // Compute Thailand time (UTC+7) for client-side live checks
  const getSlotDetails = (time) => {
    if (closedReason || isAllClosed) {
      return { state: 'CLOSED' };
    }

    const now = new Date();
    const bangkokNow = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = bangkokNow.toISOString().split('T')[0];
    const currentH = String(bangkokNow.getHours()).padStart(2, '0');
    const currentM = String(bangkokNow.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentH}:${currentM}:00`;

    // Booked by current logged-in user
    const myBooking = userBookings[time];
    if (myBooking) {
      return { state: 'BOOKED_BY_ME', myBooking };
    }

    // Waitlisted by current logged-in user
    const myWaitlist = userWaitlists[time];
    if (myWaitlist) {
      return { state: 'WAITLISTED_BY_ME', myWaitlist };
    }

    const bookedCount = bookedCounts[time] || 0;
    const isFull = bookedCount >= capacity;
    const waitlistCount = waitlistCounts[time] || 0;

    // Check Walk-in availability (ongoing slot where someone dropped and waitlist is empty)
    const isWalkIn = walkInSlotsList.includes(time);
    if (isWalkIn && !isFull) {
      return { state: 'WALK_IN', bookedCount, remaining: capacity - bookedCount };
    }

    const isPast = pastSlotsList.includes(time) || (date < todayStr) || (date === todayStr && `${time}:00` <= currentTimeStr && !isWalkIn);
    if (isPast) {
      return { state: 'PAST' };
    }

    if (isFull) {
      return { state: 'FULL_WAITLISTABLE', bookedCount, waitlistCount };
    }

    return { state: 'AVAILABLE', bookedCount, remaining: capacity - bookedCount };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin shadow-lg"></div>
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูลสนามกีฬา</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'สนามกีฬาที่คุณเลือกอาจไม่มีอยู่ในระบบ'}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition">
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }

  const meta = getSportMeta(court.type);
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header Info */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-[60px] z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 line-clamp-1">{court.name}</h1>
            <p className="text-sm font-semibold text-brand-600">{formatThaiDate(date, true, language)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Court Details Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
            <Icon size={32} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                <MapPin size={12} /> {t('court_booking_title', 'ข้อมูลสนาม')}
              </div>
              {Number(court.fee_amount) > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">
                  <Coins size={13} className="text-amber-600" /> {t('label_price', 'ค่าบำรุงรักษา')}: {court.fee_amount} {t('receipt_baht', 'บาท')}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{court.name}</h2>
            <p className="text-sm text-gray-500 font-medium">
              {language === 'en' ? `Sports facility (${meta.label}) at Khon Kaen University` : `สนามกีฬาประเภท ${meta.label} ภายในมหาวิทยาลัยขอนแก่น`}
            </p>
          </div>
        </motion.div>

        {/* Auto-Switched to Tomorrow Notice */}
        {autoSwitchedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs sm:text-sm font-medium flex items-start sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold">
                  {autoSwitchedNotice.reason === 'passed'
                    ? t('court_auto_switch_passed', 'รอบเวลาของวันนี้หมดแล้ว ระบบปรับเป็นวันพรุ่งนี้ให้อัตโนมัติ')
                    : t('court_auto_switch_full', 'รอบเวลาของวันนี้เต็มหมดแล้ว ระบบปรับเป็นวันพรุ่งนี้ให้อัตโนมัติ')}
                </span>
                <p className="text-xs text-amber-700 mt-0.5">
                  {language === 'en'
                    ? `Showing available slots for ${formatThaiDate(date, true, language)}`
                    : `กำลังแสดงรอบเวลาว่างสำหรับ ${formatThaiDate(date, true, language)}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDate(todayStr);
                setUserManuallySelected(true);
                setAutoSwitchedNotice(null);
              }}
              className="px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold shrink-0 transition"
            >
              {t('court_view_today_anyway', 'ดูรอบวันนี้')}
            </button>
          </motion.div>
        )}

        {/* Rich Date Navigation Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 space-y-4">
          {/* Top Row: Date Display + Prev/Next Controls + Date Picker Overlay */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                {t('court_date_selected', 'วันที่ต้องการจอง')}
              </p>
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <span>{formatFullThaiDate(date, language)}</span>
                {date === todayStr && (
                  <span className="text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                    {t('court_date_today', 'วันนี้')}
                  </span>
                )}
                {date === tomorrowStr && (
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {t('court_date_tomorrow', 'พรุ่งนี้')}
                  </span>
                )}
              </h3>
            </div>

            {/* Controls: Prev Day, Next Day, and Date Picker Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Prev Day Button */}
              <button
                type="button"
                disabled={date <= todayStr}
                onClick={() => {
                  const prev = addDays(date, -1);
                  if (prev >= todayStr) {
                    setDate(prev);
                    setUserManuallySelected(true);
                    setAutoSwitchedNotice(null);
                  }
                }}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="วันก่อนหน้า"
                aria-label="วันก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Next Day Button */}
              <button
                type="button"
                disabled={date >= maxDateStr}
                onClick={() => {
                  const next = addDays(date, 1);
                  if (next <= maxDateStr) {
                    setDate(next);
                    setUserManuallySelected(true);
                    setAutoSwitchedNotice(null);
                  }
                }}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="วันถัดไป"
                aria-label="วันถัดไป"
              >
                <ChevronRight size={18} />
              </button>

              {/* Custom Date Picker Overlay Button */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition pointer-events-none select-none">
                  <CalendarPlus className="w-4 h-4 text-brand-600" />
                  <span>{t('court_date_pick_other', 'เลือกวันที่อื่น')}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-brand-500" />
                </div>
                <input 
                  id="court-date-picker"
                  type="date" 
                  value={date}
                  min={todayStr}
                  max={maxDateStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDate(e.target.value);
                      setUserManuallySelected(true);
                      setAutoSwitchedNotice(null);
                    }
                  }}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch (_) {}
                  }}
                  aria-label={t('court_change_date', 'เปลี่ยนวันที่')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Quick Date Chips Bar (Horizontal Scrollable) */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {getQuickDateList(7, language).map((chip) => {
                const isActive = (chip.dateStr === date);
                return (
                  <button
                    key={chip.dateStr}
                    type="button"
                    onClick={() => {
                      setDate(chip.dateStr);
                      setUserManuallySelected(true);
                      setAutoSwitchedNotice(null);
                    }}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-center transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-500/25 ring-2 ring-brand-600/20'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70 font-semibold'
                    }`}
                  >
                    <div className={`text-xs ${isActive ? 'text-white' : 'text-gray-900'} font-bold leading-tight`}>
                      {chip.mainLabel}
                    </div>
                    <div className={`text-[11px] ${isActive ? 'text-brand-100' : 'text-gray-500'} font-medium`}>
                      {chip.subLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {/* Time Slots */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <Clock className="text-brand-600" size={24} />
            <h3 className="font-extrabold text-lg text-gray-900">{t('court_available_times', 'ช่วงเวลาที่เปิดให้บริการ')}</h3>
          </div>

          {(closedReason || isAllClosed) ? (
            <div className="bg-red-50 text-red-500 p-6 rounded-2xl text-center text-sm font-semibold border border-red-100 flex flex-col items-center gap-2">
              <AlertCircle size={24} />
              {closedReason || t('court_closed_notice', 'ปิดให้บริการในวันที่เลือก')}
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-gray-50 text-gray-400 p-8 rounded-2xl text-center text-sm font-medium border border-gray-100 border-dashed">
              {t('court_no_slots', 'ไม่มีช่วงเวลาว่างในวันนี้')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((time) => {
                const details = getSlotDetails(time);

                // 1. Past or Closed Slot (Disabled, Grayed out)
                if (details.state === 'PAST' || details.state === 'CLOSED') {
                  return (
                    <div 
                      key={time} 
                      className="px-3 py-3 flex flex-col items-center justify-between text-sm bg-gray-100/70 border border-gray-200/80 text-gray-400 rounded-xl select-none opacity-60 cursor-not-allowed"
                      title={t('court_slot_past', 'หมดช่วงเวลา')}
                    >
                      <div className="text-center">
                        <span className="font-bold line-through text-gray-400">{time} {t('court_time_unit', 'น.')}</span>
                        <span className="block text-[11px] font-medium text-gray-400 mt-0.5">
                          {details.state === 'CLOSED' ? t('court_closed_notice', 'ปิดบริการ') : t('court_slot_past', 'หมดช่วงเวลา')}
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] bg-gray-200/60 text-gray-500 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <Ban size={11} /> {t('court_legend_past', 'หมดเวลา')}
                      </div>
                    </div>
                  );
                }

                // 2. Already Booked by Logged-in User (View E-Pass CTA)
                if (details.state === 'BOOKED_BY_ME') {
                  return (
                    <div 
                      key={time} 
                      className="px-3 py-2.5 flex flex-col items-center justify-between text-sm bg-brand-50 border-2 border-brand-500 text-brand-900 rounded-xl shadow-sm ring-2 ring-brand-500/10"
                    >
                      <div className="text-center mb-1.5">
                        <span className="font-extrabold text-brand-800">{time} {t('court_time_unit', 'น.')}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-700 bg-brand-100/80 px-2 py-0.5 rounded-full mt-0.5">
                          <Check size={12} strokeWidth={3} /> {t('court_slot_booked_by_me', 'สิทธิ์ของคุณ')}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => navigate(`/myBookings?highlight=${details.myBooking?.id || ''}`)}
                        className="w-full py-2 px-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Ticket size={13} />
                        {t('court_btn_view_pass', 'ดูบัตรคอร์ท')}
                      </button>
                    </div>
                  );
                }

                // 3. User is Already in Waitlist
                if (details.state === 'WAITLISTED_BY_ME') {
                  return (
                    <div 
                      key={time} 
                      className="px-3 py-2.5 flex flex-col items-center justify-between text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-xl shadow-sm"
                    >
                      <div className="text-center mb-1.5">
                        <span className="font-bold text-amber-900">{time} {t('court_time_unit', 'น.')}</span>
                        <span className="block text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full mt-0.5">
                          {t('court_already_waitlisted', 'คุณเข้าคิวแล้ว')}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => navigate('/myBookings?tab=waitlist')}
                        className="w-full py-2 px-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Clock size={13} />
                        {t('court_btn_view_pass', 'ดูคิวรอ')}
                      </button>
                    </div>
                  );
                }

                // 4. Walk-in Slot (Dropped reservation, no waitlist -> On-site users can claim immediately)
                if (details.state === 'WALK_IN') {
                  return (
                    <div 
                      key={time} 
                      className="px-3 py-2.5 flex flex-col items-center justify-between text-sm bg-gradient-to-b from-cyan-50/90 to-blue-50/40 border-2 border-cyan-400 text-cyan-950 rounded-xl shadow-sm hover:border-cyan-500 hover:shadow transition-all"
                    >
                      <div className="text-center mb-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-extrabold text-cyan-900">{time} {t('court_time_unit', 'น.')}</span>
                          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-cyan-800 bg-cyan-100/90 px-2 py-0.5 rounded-full mt-0.5 border border-cyan-200">
                          <Sparkles size={11} className="text-cyan-600" />
                          {t('court_slot_walkin', 'Walk-in หน้าสนาม')}
                        </span>
                        <span className="block text-[10px] text-cyan-700 font-semibold mt-0.5">
                          {t('court_slot_available', 'ว่าง')} ({details.remaining}/{capacity})
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => user ? setSelectedSlot(time) : navigate('/login')}
                        className="w-full py-2 px-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Users size={13} />
                        {t('court_btn_walkin', 'รับสิทธิ์ Walk-in')}
                      </button>
                    </div>
                  );
                }

                // 5. Slot is Full (Join Waitlist CTA)
                if (details.state === 'FULL_WAITLISTABLE') {
                  return (
                    <div 
                      key={time} 
                      className="px-3 py-2.5 flex flex-col items-center justify-between text-sm font-semibold bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-sm"
                    >
                      <div className="text-center mb-1">
                        <span className="font-bold text-slate-800">{time} {t('court_time_unit', 'น.')}</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[11px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                            {t('court_slot_full', 'เต็ม')} ({details.bookedCount}/{capacity})
                          </span>
                          {details.waitlistCount > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              (รอ {details.waitlistCount})
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => user ? setWaitlistModalSlot(time) : navigate('/login')}
                        className="w-full py-2 px-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Users size={13} />
                        {t('btn_join_waitlist', 'เข้าคิวรอ')}
                      </button>
                    </div>
                  );
                }

                // 6. Available Slot (Book Now CTA)
                return (
                  <button 
                    key={time} 
                    onClick={() => user ? setSelectedSlot(time) : navigate('/login')}
                    className="px-4 py-3 flex flex-col items-center justify-center text-sm font-bold bg-white text-gray-800 border border-emerald-500/30 rounded-xl shadow-sm hover:border-emerald-600 hover:bg-emerald-50/30 hover:shadow active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 text-center group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="group-hover:text-emerald-700 transition">{time} {t('court_time_unit', 'น.')}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-xs mt-1 text-emerald-600 font-semibold">
                      {t('court_slot_available', 'ว่าง')} ({details.remaining}/{capacity})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-gray-600 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-white border-2 border-emerald-500/50"></div> 
              {t('court_legend_available', 'ว่าง (เปิดจอง)')}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-cyan-50 border-2 border-cyan-400"></div> 
              {t('court_legend_walkin', 'วอล์คอินหน้าสนาม (หลุดจอง/ไม่มีคิว)')}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-brand-50 border-2 border-brand-500"></div> 
              {t('court_legend_my_booking', 'การจองของคุณ')}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></div> 
              {t('court_legend_full', 'เต็ม (เข้าคิวรอ)')}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-gray-200/80 border border-gray-300"></div> 
              {t('court_legend_past', 'หมดช่วงเวลา')}
            </div>
          </div>
        </div>
      </div>


      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
              onClick={() => bookingStatus !== 'submitting' && setSelectedSlot(null)}
            />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
              <motion.div 
                initial={{ y: "100%", sm: { scale: 0.95, y: 0, opacity: 0 } }} 
                animate={{ y: 0, sm: { scale: 1, opacity: 1 } }} 
                exit={{ y: "100%", sm: { scale: 0.95, opacity: 0 } }} 
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl pointer-events-auto relative"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
                
                {bookingStatus !== 'submitting' && bookingStatus !== 'success' && (
                  <button 
                    onClick={() => setSelectedSlot(null)}
                    className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors hidden sm:block"
                  >
                    <X size={20} />
                  </button>
                )}

                {bookingStatus === 'success' ? (
                  <div className="text-center py-8">
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                      className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                      <Check size={40} strokeWidth={3} />
                    </motion.div>
                    <h3 className="font-extrabold text-gray-900 text-2xl mb-2">จองสำเร็จ!</h3>
                    <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">{modalMsg}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center shrink-0">
                        <CalendarPlus size={24} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-xl">{t('court_confirm_modal_title', 'ยืนยันการจอง')}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t('court_confirm_modal_sub', 'โปรดตรวจสอบข้อมูลก่อนยืนยัน')}</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4 mb-6 border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_facility', 'สนามกีฬา')}</span>
                        <span className="font-bold text-gray-900">{court.name}</span>
                      </div>
                      <div className="h-px bg-gray-200/60" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_date', 'วันที่จอง')}</span>
                        <span className="font-bold text-gray-900">{formatThaiDate(date, true, language)}</span>
                      </div>
                      <div className="h-px bg-gray-200/60" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_time', 'ช่วงเวลา')}</span>
                        <span className="font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-lg">{selectedSlot} {t('court_time_unit', 'น.')}</span>
                      </div>
                    </div>

                    {modalMsg && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold mb-4 flex items-center gap-2">
                        <AlertCircle size={18} />
                        {modalMsg}
                      </div>
                    )}
                    
                    {walkInSlotsList.includes(selectedSlot) && (
                      <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2">
                        <Sparkles size={16} className="text-cyan-600 shrink-0" />
                        <span>{t('court_walkin_notice', 'สล็อตนี้เปิดรับ Walk-in สำหรับผู้ที่อยู่ที่สนามจริงเนื่องจากผู้จองเดิมหลุดสิทธิ์และไม่มีคิวรอ')}</span>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mb-6 font-medium text-center bg-gray-50 p-3 rounded-xl flex items-center justify-center gap-1.5">
                      <Lightbulb size={14} className="text-amber-500 shrink-0" />
                      <span>{t('court_confirm_modal_tip', 'หลังจองสำเร็จ สามารถสแกนเช็คอินตามเวลาเริ่มรอบ (T = 0 ถึง T + ... นาที) หรือกดยืนยันช่วง T - ... นาทีก่อนเริ่ม (ตามที่แอดมินกำหนด เช่น 10-5 นาที) เพื่อขอสิทธิ์ผ่อนผันเวลาเช็คอินสายได้')}</span>
                    </div>
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <button 
                        onClick={() => setSelectedSlot(null)} 
                        disabled={bookingStatus === 'submitting'}
                        className="w-full sm:flex-1 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {t('court_confirm_modal_cancel', 'ยกเลิก')}
                      </button>
                      <button 
                        onClick={handleConfirmBook} 
                        disabled={bookingStatus === 'submitting'} 
                        className="w-full sm:flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {bookingStatus === 'submitting' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('bookings_action_loading', 'กำลังดำเนินการ...')}
                          </>
                        ) : t('court_confirm_modal_btn', 'ยืนยันการจองสนาม')}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Waitlist Confirmation Modal */}
      <AnimatePresence>
        {waitlistModalSlot && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
              onClick={() => waitlistStatus !== 'submitting' && setWaitlistModalSlot(null)}
            />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
              <motion.div 
                initial={{ y: "100%", sm: { scale: 0.95, y: 0, opacity: 0 } }} 
                animate={{ y: 0, sm: { scale: 1, opacity: 1 } }} 
                exit={{ y: "100%", sm: { scale: 0.95, opacity: 0 } }} 
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl pointer-events-auto relative"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
                
                {waitlistStatus !== 'submitting' && waitlistStatus !== 'success' && (
                  <button 
                    onClick={() => setWaitlistModalSlot(null)}
                    className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors hidden sm:block"
                  >
                    <X size={20} />
                  </button>
                )}

                {waitlistStatus === 'success' ? (
                  <div className="text-center py-8">
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                      className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                      <Check size={40} strokeWidth={3} />
                    </motion.div>
                    <h3 className="font-extrabold text-gray-900 text-2xl mb-2">เข้าคิวสำเร็จ!</h3>
                    <p className="text-sm text-gray-600 font-medium max-w-xs mx-auto">{waitlistMsg}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-xl">{t('btn_join_waitlist', 'เข้าคิวรอรับสิทธิ์')}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t('waitlist_subtitle', 'ระบบคิวรอรับสิทธิ์อัตโนมัติเมื่อมีคนยกเลิก')}</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4 mb-6 border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_facility', 'สนามกีฬา')}</span>
                        <span className="font-bold text-gray-900">{court.name}</span>
                      </div>
                      <div className="h-px bg-gray-200/60" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_date', 'วันที่')}</span>
                        <span className="font-bold text-gray-900">{formatThaiDate(date, true, language)}</span>
                      </div>
                      <div className="h-px bg-gray-200/60" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-medium">{t('label_time', 'ช่วงเวลา')}</span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">{waitlistModalSlot} {t('court_time_unit', 'น.')}</span>
                      </div>
                    </div>

                    {waitlistMsg && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold mb-4 flex items-center gap-2">
                        <AlertCircle size={18} />
                        {waitlistMsg}
                      </div>
                    )}
                    
                    <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 p-4 rounded-xl mb-6 leading-relaxed flex items-start gap-2">
                      <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>กติการะบบคิวรออัตโนมัติ:</strong> เมื่อมีผู้ยกเลิกการจอง หรือไม่ยืนยันสิทธิ์ตามกำหนดเวลา ระบบจะเลื่อนคิวของคุณขึ้นเป็นผู้จองอัตโนมัติทันที
                      </div>
                    </div>
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <button 
                        onClick={() => setWaitlistModalSlot(null)} 
                        disabled={waitlistStatus === 'submitting'}
                        className="w-full sm:flex-1 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {t('court_confirm_modal_cancel', 'ยกเลิก')}
                      </button>
                      <button 
                        onClick={handleConfirmWaitlist} 
                        disabled={waitlistStatus === 'submitting'} 
                        className="w-full sm:flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {waitlistStatus === 'submitting' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('bookings_action_loading', 'กำลังเข้าคิว...')}
                          </>
                        ) : t('btn_join_waitlist', 'ยืนยันเข้าคิวรอ')}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
