import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, CheckCircle2, Clock, XCircle, AlertTriangle, Ticket, Ban, Users, Receipt, CreditCard } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../utils/date';
import { useLanguage } from '../context/LanguageContext';
import ReceiptModal from '../components/ReceiptModal';

const STATUS_MAP = {
  PENDING: { labelKey: 'status_pending', defaultLabel: 'รอยืนยันสิทธิ์', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  PRE_CONFIRMED: { labelKey: 'status_pre_confirmed', defaultLabel: 'ยืนยันสิทธิ์แล้ว', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  CHECKED_IN: { labelKey: 'status_checked_in', defaultLabel: 'เช็คอินสำเร็จ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { labelKey: 'status_cancelled', defaultLabel: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  MISSED: { labelKey: 'status_missed', defaultLabel: 'ไม่ได้เช็คอิน (Missed)', color: 'bg-red-100 text-red-600 border-red-200', icon: AlertTriangle }
};

export default function MyBookings() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'waitlists'
  const [bookings, setBookings] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [paymentsMap, setPaymentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, wRes] = await Promise.all([
        axios.get('/api/myBookings'),
        axios.get('/api/waitlist/my')
      ]);
      setBookings(bRes.data.bookings || []);
      setWaitlists(wRes.data.waitlists || []);

      // Pre-fetch payments for fee-based bookings
      const paidCourts = (bRes.data.bookings || []).filter(b => Number(b.fee_amount) > 0 || b.is_fee_required);
      if (paidCourts.length > 0) {
        const pMap = {};
        await Promise.all(
          paidCourts.map(async (b) => {
            try {
              const pRes = await axios.get(`/api/payments/booking/${b.id}`);
              if (pRes.data.payment) {
                pMap[b.id] = pRes.data.payment;
              }
            } catch {}
          })
        );
        setPaymentsMap(pMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreConfirm = async (bookingId) => {
    setActionLoading(bookingId);
    setMsg('');
    try {
      const res = await axios.post('/api/preConfirm', { booking_id: bookingId });
      if (res.data.success) {
        setMsg('ยืนยันสิทธิ์เรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยืนยันสิทธิ์');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('คุณต้องการยกเลิกการจองสนามนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }
    setActionLoading(bookingId);
    setMsg('');
    try {
      const res = await axios.post('/api/cancelBooking', { booking_id: bookingId });
      if (res.data.success) {
        setMsg(res.data.waitlist_promoted 
          ? 'ยกเลิกการจองสำเร็จ และระบบได้เลื่อนคิวรอขึ้นเป็นผู้จองอัตโนมัติแล้ว' 
          : 'ยกเลิกการจองเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยกเลิกการจอง');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelWaitlist = async (waitlistId) => {
    if (!window.confirm('คุณต้องการยกเลิกการรอคิวนี้ใช่หรือไม่?')) {
      return;
    }
    setActionLoading(`w-${waitlistId}`);
    setMsg('');
    try {
      const res = await axios.post('/api/waitlist/cancel', { waitlist_id: waitlistId });
      if (res.data.success) {
        setMsg('ยกเลิกการรอคิวเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยกเลิกคิว');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessPayment = async (booking) => {
    setActionLoading(`pay-${booking.id}`);
    setMsg('');
    try {
      const res = await axios.post('/api/payments/pay', {
        booking_id: booking.id,
        payment_method: 'promptpay'
      });
      if (res.data.success && res.data.payment) {
        setPaymentsMap(prev => ({ ...prev, [booking.id]: res.data.payment }));
        // Open receipt modal with enriched booking details
        setActiveReceipt({
          ...res.data.payment,
          court_name: booking.court_name,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          booking_code: booking.booking_code,
          user_name: booking.user_name || 'สมาชิกผู้จอง',
          user_email: booking.user_email || ''
        });
        setMsg('ชำระเงินและออกใบเสร็จอิเล็กทรอนิกส์สำเร็จ');
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการชำระเงิน');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReceipt = async (booking) => {
    const existing = paymentsMap[booking.id];
    if (existing && existing.receipt_no) {
      try {
        const res = await axios.get(`/api/payments/receipt/${existing.receipt_no}`);
        if (res.data.receipt) {
          setActiveReceipt(res.data.receipt);
          return;
        }
      } catch {}
    }
    // Fallback synthesize
    setActiveReceipt({
      receipt_no: existing?.receipt_no || 'REC-2026-PREVIEW',
      transaction_ref: existing?.transaction_ref || 'PAY-SP-ON-FILE',
      paid_at: existing?.paid_at || new Date().toISOString(),
      amount: booking.fee_amount || 0,
      payment_method: existing?.payment_method || 'promptpay',
      court_name: booking.court_name,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      booking_code: booking.booking_code,
      user_name: booking.user_name || 'สมาชิกผู้จอง',
      user_email: booking.user_email || ''
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {activeTab === 'bookings' ? t('label_bookings_tab', 'การจองของฉัน') : t('label_waitlist_tab', 'รายการคิวรอของฉัน')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'bookings' 
              ? t('bookings_subtitle', 'รายการจองสนามกีฬา สถานะการเช็คอิน และใบเสร็จรับเงิน') 
              : t('waitlist_subtitle', 'รายการคิวรอรับสิทธิ์อัตโนมัติเมื่อมีคนยกเลิกการจอง')}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex bg-gray-100 p-1 rounded-2xl border border-gray-200/80 shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bookings'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <CalendarCheck size={14} />
            {t('nav_bookings', 'รายการจอง')}
            <span className="ml-1 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
              {bookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waitlists')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'waitlists'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            {t('label_waitlist_tab', 'คิวรอ (Waitlist)')}
            {waitlists.filter(w => w.status === 'WAITING').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold animate-pulse">
                {waitlists.filter(w => w.status === 'WAITING').length}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {msg && (
        <div className="mb-6 bg-brand-50 border border-brand-200 text-brand-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-brand-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'bookings' ? (
        /* TAB 1: BOOKINGS LIST */
        bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <CalendarCheck size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-bold text-gray-700 text-base">{t('msg_no_bookings', 'ยังไม่มีประวัติการจอง')}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('bookings_empty_sub', 'สามารถเลือกวันและจองสนามได้จากหน้าแรก')}</p>
          </div>
        ) : (

          <div className="space-y-4">
            {bookings.map((b) => {
              const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
              const Icon = statusInfo.icon;
              const canCancel = b.status === 'PENDING' || b.status === 'PRE_CONFIRMED';
              const hasFee = Number(b.fee_amount) > 0 || b.is_fee_required;
              const payment = paymentsMap[b.id];

              return (
                <motion.article key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{b.court_name}</h3>
                        {b.booking_code && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                            <Ticket size={11} className="text-brand-500" />
                            {b.booking_code}
                          </span>
                        )}
                        {hasFee && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                            💰 {b.fee_amount} {t('receipt_baht', 'บาท')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        {formatThaiDate(b.booking_date, true, language)} | {b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)} {t('court_time_unit', 'น.')}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusInfo.color} shrink-0`}>
                      <Icon size={12} />
                      {t(statusInfo.labelKey, statusInfo.defaultLabel)}
                    </span>
                  </div>

                  {/* Actions & Payment Area */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                    {/* E-Receipt / Payment Buttons */}
                    <div className="flex items-center gap-2">
                      {hasFee && (
                        payment ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(b)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition active:scale-95"
                          >
                            <Receipt size={13} />
                            {t('btn_view_receipt', 'ดูใบเสร็จ (E-Receipt)')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleProcessPayment(b)}
                            disabled={actionLoading === `pay-${b.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                          >
                            <CreditCard size={13} />
                            {actionLoading === `pay-${b.id}` ? t('bookings_action_loading', 'กำลังบันทึก...') : t('btn_pay_now', 'ชำระค่าบำรุงรักษา')}
                          </button>
                        )
                      )}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                      {canCancel && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={actionLoading === b.id}
                          className="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Ban size={13} />
                          {actionLoading === b.id ? t('bookings_cancel_loading', 'กำลังยกเลิก...') : t('btn_cancel_booking', 'ยกเลิกการจอง')}
                        </button>
                      )}

                      {b.status === 'PENDING' && (
                        <button
                          onClick={() => handlePreConfirm(b.id)}
                          disabled={actionLoading === b.id}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition active:scale-95 disabled:opacity-50"
                        >
                          {actionLoading === b.id ? t('bookings_action_loading', 'กำลังบันทึก...') : t('btn_pre_confirm', 'ยืนยันสิทธิ์เข้าใช้งาน')}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 2: WAITLIST LIST */
        waitlists.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-bold text-gray-700 text-base">{t('msg_no_waitlists', 'ไม่มีรายการคิวรอในขณะนี้')}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('waitlist_empty_sub', 'หากรอบเวลาที่ต้องการเต็ม สามารถกดปุ่ม "เข้าคิวรอ" ได้จากหน้ารายละเอียดสนาม')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {waitlists.map((w) => {
              const isWaiting = w.status === 'WAITING';
              const isPromoted = w.status === 'PROMOTED';

              return (
                <motion.article key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${isPromoted ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-100'}`}>
                  {/* Promoted banner if applicable */}
                  {isPromoted && (
                    <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <p>{t('msg_waitlist_promoted_banner', 'ยินดีด้วย! คุณได้รับการเลื่อนสิทธิ์ขึ้นเป็นการจองอัตโนมัติ')}</p>
                        {w.promoted_booking_code && (
                          <p className="text-[11px] font-mono font-bold text-emerald-900 mt-0.5">
                            {t('label_booking_code', 'รหัสการจอง')}: {w.promoted_booking_code}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{w.court_name}</h3>
                        {isWaiting && (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                            {t('label_queue_position', 'คิวลำดับที่')}: {w.queue_position}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        {formatThaiDate(w.booking_date, true, language)} | {w.start_time?.substring(0, 5)} - {w.end_time?.substring(0, 5)} {t('court_time_unit', 'น.')}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${
                      isWaiting 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : isPromoted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {isWaiting ? t('status_waiting', 'กำลังรอคิว') : isPromoted ? t('status_promoted', 'ได้รับสิทธิ์แล้ว') : w.status}
                    </span>
                  </div>

                  {isWaiting && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-400">
                        {t('label_total_waiting', 'คนรอคิวรอบนี้')}: <strong className="text-gray-700">{w.total_waiting || 1} {t('label_persons', 'คน')}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCancelWaitlist(w.id)}
                        disabled={actionLoading === `w-${w.id}`}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Ban size={13} />
                        {actionLoading === `w-${w.id}` ? t('bookings_cancel_loading', 'กำลังยกเลิก...') : t('btn_cancel_waitlist', 'ยกเลิกการรอคิว')}
                      </button>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )
      )}

      {/* E-Receipt Modal */}
      <AnimatePresence>
        {activeReceipt && (
          <ReceiptModal
            receipt={activeReceipt}
            onClose={() => setActiveReceipt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
