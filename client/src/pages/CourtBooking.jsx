import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Clock, AlertCircle, Check, X, ChevronLeft, Trophy, Waves, Target, Feather, Activity, Goal, LayoutGrid, MapPin, Users } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../utils/date';
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
  
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(dateStr);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, language } = useLanguage();

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
  }, [fetchCourts, id]);

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
        setModalMsg('จองสำเร็จ! กรุณายืนยันสิทธิ์ในเมนูการจองล่วงหน้า 10-5 นาที');
        fetchCourts();
        setTimeout(() => {
          setSelectedSlot(null);
          setBookingStatus(null);
        }, 2500);
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
        }, 3000);
      }
    } catch (err) {
      setWaitlistStatus('error');
      setWaitlistMsg(err.response?.data?.error || 'ไม่สามารถเข้าคิวรอได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const court = data?.courts?.find(c => String(c.id) === String(id));
  const courtId = court?.id;
  const slots = data?.availableSlots?.[courtId] || [];
  const bookedCounts = data?.bookedSlots?.[courtId] || {};
  const capacity = court?.capacity || 1;
  const closedReason = data?.closedCourts?.[courtId];
  const isAllClosed = data?.isAllClosed;

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
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">
                  💰 {t('label_price', 'ค่าบำรุงรักษา')}: {court.fee_amount} {t('receipt_baht', 'บาท')}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{court.name}</h2>
            <p className="text-sm text-gray-500 font-medium">
              {language === 'en' ? `Sports facility (${meta.label}) at Khon Kaen University` : `สนามกีฬาประเภท ${meta.label} ภายในมหาวิทยาลัยขอนแก่น`}
            </p>
          </div>
        </motion.div>

        {/* Change Date Box */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">{t('court_date_selected', 'วันที่ต้องการจอง')}</p>
              <p className="font-bold text-gray-900">{formatThaiDate(date, true, language)}</p>
            </div>
            <div className="relative group">
                <button
                  type="button"
                  onClick={() => document.getElementById('court-date-picker')?.showPicker()}
                  className="flex items-center gap-2 w-full sm:w-auto bg-brand-50 text-brand-700 border border-brand-100 rounded-xl px-4 py-2.5 outline-none transition-all font-bold text-sm cursor-pointer hover:bg-brand-100"
                >
                  <CalendarPlus className="w-5 h-5" />
                  {t('court_change_date', 'เปลี่ยนวันที่')}
                </button>
                <input 
                  id="court-date-picker"
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                />
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
                const bookedCount = bookedCounts[time] || 0;
                const isFull = bookedCount >= capacity;
                
                return isFull ? (
                  <div key={time} className="px-3 py-2.5 flex flex-col items-center justify-between text-sm font-semibold bg-amber-50/70 text-gray-700 rounded-xl border border-amber-200/80 shadow-sm">
                    <div className="text-center mb-1">
                      <span className="font-bold text-gray-800">{time} {t('court_time_unit', 'น.')}</span>
                      <span className="block text-[10px] text-red-500 font-extrabold">{t('court_slot_full', 'เต็ม')} ({bookedCount}/{capacity})</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => user ? setWaitlistModalSlot(time) : navigate('/login')}
                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-sm transition flex items-center justify-center gap-1"
                    >
                      <Users size={12} />
                      {t('btn_join_waitlist', 'เข้าคิวรอ')}
                    </button>
                  </div>
                ) : (
                  <button 
                    key={time} 
                    onClick={() => user ? setSelectedSlot(time) : navigate('/login')}
                    className="px-4 py-3 flex flex-col items-center justify-center text-sm font-bold bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:border-brand-600 hover:bg-brand-600 hover:text-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                  >
                    <span>{time} {t('court_time_unit', 'น.')}</span>
                    <span className="text-[10px] mt-0.5 opacity-80 font-semibold">{t('court_slot_available', 'ว่าง')} ({capacity - bookedCount}/{capacity})</span>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="mt-6 flex justify-center gap-6 text-xs font-semibold text-gray-500 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white border border-gray-300"></div> {t('court_legend_available', 'ว่าง')}</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-200"></div> {t('court_legend_booked', 'ถูกจองแล้ว')}</div>
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
                    
                    <p className="text-xs text-gray-400 mb-6 font-medium text-center bg-gray-50/50 p-3 rounded-xl">
                      💡 {t('court_confirm_modal_tip', 'หลังจองสำเร็จ สถานะจะเป็นรอยืนยันสิทธิ์ และต้องกดยืนยันในแอปช่วง 10-5 นาทีก่อนเริ่มเล่น')}
                    </p>
                    
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
                    
                    <div className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200/70 p-4 rounded-xl mb-6 leading-relaxed">
                      📌 <strong>กติการะบบคิวรออัตโนมัติ:</strong> เมื่อมีผู้ยกเลิกการจอง หรือไม่ยืนยันสิทธิ์ตามกำหนดเวลา ระบบจะเลื่อนคิวของคุณขึ้นเป็นผู้จองอัตโนมัติทันที
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
