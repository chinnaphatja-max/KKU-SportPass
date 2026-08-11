import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../utils/date';

const STATUS_MAP = {
  PENDING: { label: 'รอยืนยันสิทธิ์', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  PRE_CONFIRMED: { label: 'ยืนยันสิทธิ์แล้ว', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  CHECKED_IN: { label: 'เช็คอินสำเร็จ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  MISSED: { label: 'ไม่ได้เช็คอิน (Missed)', color: 'bg-red-100 text-red-600 border-red-200', icon: AlertTriangle }
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/myBookings');
      setBookings(res.data.bookings || []);
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
        fetchBookings();
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยืนยันสิทธิ์');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">การจองของฉัน</h2>
        <p className="text-xs text-gray-500 mt-1">รายการจองสนามกีฬาและสถานะการเช็คอิน</p>
      </motion.div>

      {msg && (
        <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-xl text-xs font-semibold">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <CalendarCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-700 text-base">ยังไม่มีประวัติการจอง</h3>
          <p className="text-xs text-gray-400 mt-1">สามารถเลือกวันและจองสนามได้จากหน้าแรก</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
            const Icon = statusInfo.icon;

            return (
              <motion.article key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{b.court_name}</h3>
                    <p className="text-xs text-gray-500 font-medium">{formatThaiDate(b.booking_date, true)} | {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)} น.</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>
                    <Icon size={12} />
                    {statusInfo.label}
                  </span>
                </div>

                {b.status === 'PENDING' && (
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                    <button
                      onClick={() => handlePreConfirm(b.id)}
                      disabled={actionLoading === b.id}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading === b.id ? 'กำลังบันทึก...' : 'ยืนยันสิทธิ์เข้าใช้งาน'}
                    </button>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
