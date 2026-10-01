import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, CheckCircle2, Clock, XCircle, AlertTriangle, Search, Filter, RefreshCw, UserCheck, Ban, Ticket, Download, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

const STATUS_MAP = {
  PENDING: { label: 'รอยืนยันสิทธิ์', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  PRE_CONFIRMED: { label: 'ยืนยันแล้ว-รอเช็คอิน', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  CHECKED_IN: { label: 'เช็คอินแล้ว', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
  MISSED: { label: 'ขาดการเช็คอิน (Missed)', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle }
};

export default function AdminBookings() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courtId, setCourtId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1, has_next: false, has_prev: false, limit: 50 });
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState('');

  // Modal for Manual Override Check-in / Cancel with Reason
  const [modalState, setModalState] = useState({
    open: false,
    type: '', // 'checkin' or 'cancel'
    booking: null,
    reason: ''
  });

  const fetchCourts = async () => {
    try {
      const res = await axios.get('/api/admin/courts');
      setCourts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (courtId) params.append('court_id', courtId);
      if (status) params.append('status', status);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', page);
      params.append('limit', 50);

      const res = await axios.get(`/api/admin/bookings?${params.toString()}`);
      setBookings(res.data.bookings || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      } else {
        setPagination({
          total: res.data.bookings?.length || 0,
          total_pages: 1,
          page: 1,
          limit: 50,
          has_next: false,
          has_prev: false
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, courtId, status, search, page]);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const openActionModal = (booking, type) => {
    const defaultReason = type === 'checkin'
      ? 'เช็คอินแทนผู้ใช้โดยเจ้าหน้าที่ (ผู้ใช้มีปัญหาเรื่องเครือข่าย/GPS)'
      : 'ยกเลิกเนื่องจากเหตุสุดวิสัยหรือคำขอของผู้ใช้';
    setModalState({
      open: true,
      type,
      booking,
      reason: defaultReason
    });
  };

  const handleModalSubmit = async () => {
    const { type, booking, reason } = modalState;
    if (!booking) return;

    setActionLoading(booking.id);
    try {
      if (type === 'checkin') {
        const res = await axios.post(`/api/admin/bookings/${booking.id}/checkin`, { reason });
        if (res.data.success) {
          setMsg(`เช็คอินรายการ ${booking.booking_code || booking.id} สำเร็จ`);
          setModalState({ open: false, type: '', booking: null, reason: '' });
          fetchBookings();
        }
      } else if (type === 'cancel') {
        const res = await axios.post(`/api/admin/bookings/${booking.id}/cancel`, { reason });
        if (res.data.success) {
          setMsg(`ยกเลิกรายการ ${booking.booking_code || booking.id} สำเร็จ`);
          setModalState({ open: false, type: '', booking: null, reason: '' });
          fetchBookings();
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setActionLoading(null);
    }
  };

  const exportToCsv = () => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (courtId) params.append('court_id', courtId);
    if (status) params.append('status', status);
    if (search.trim()) params.append('search', search.trim());
    window.location.href = `/api/admin/bookings/export-csv?${params.toString()}`;
  };

  const exportPaymentsCsv = () => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (search.trim()) params.append('search', search.trim());
    window.location.href = `/api/admin/payments/export-csv?${params.toString()}`;
  };

  const setRelativeDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  // Stats calculation for the current view
  const stats = {
    total: bookings.length,
    checkedIn: bookings.filter(b => b.status === 'CHECKED_IN').length,
    active: bookings.filter(b => b.status === 'PENDING' || b.status === 'PRE_CONFIRMED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED' || b.status === 'MISSED').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="text-[#fe6e00]" /> รายการจองประจำวัน (Operations)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            แดชบอร์ดปฏิบัติการสำหรับเจ้าหน้าที่สนาม ค้นหา เช็คอินแทน และตรวจสอบสถานะแบบเรียลไทม์
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={exportToCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            title="ดาวน์โหลดรายการจองทั้งหมดตามเงื่อนไขค้นหาเป็นไฟล์ CSV"
          >
            <Download size={14} className="text-[#fe6e00]" /> ส่งออก Bookings (CSV)
          </button>
          <button
            onClick={exportPaymentsCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            title="ดาวน์โหลดประวัติการชำระเงินและใบเสร็จเป็นไฟล์ CSV"
          >
            <Download size={14} className="text-emerald-600" /> ส่งออก Payments (CSV)
          </button>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400">การจองทั้งหมด</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600">เช็คอินสำเร็จ</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.checkedIn}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-blue-600">รอยืนยัน / รอเช็คอิน</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">ยกเลิก / Missed</p>
          <p className="text-2xl font-extrabold text-gray-600 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        {/* Date Filter & Quick jumps */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setRelativeDate(0)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${date === new Date().toISOString().split('T')[0] ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setRelativeDate(1)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              พรุ่งนี้
            </button>
          </div>
        </div>

        {/* Court Filter */}
        <div className="flex-1 min-w-[150px]">
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50 bg-white"
          >
            <option value="">ทุกสนาม</option>
            {courts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-44">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50 bg-white"
          >
            <option value="">ทุกสถานะ</option>
            <option value="PENDING">รอยืนยันสิทธิ์</option>
            <option value="PRE_CONFIRMED">ยืนยันแล้ว-รอเช็คอิน</option>
            <option value="CHECKED_IN">เช็คอินแล้ว</option>
            <option value="CANCELLED">ยกเลิกแล้ว</option>
            <option value="MISSED">ขาดการเช็คอิน</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล หรือรหัสการจอง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 pl-9 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs font-semibold animate-pulse">
            กำลังโหลดข้อมูลการจอง...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Filter size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-600">ไม่พบรายการจองตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนวันที่ หรือเคลียร์การค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3.5 px-4">รหัสการจอง</th>
                  <th className="py-3.5 px-4">ผู้จอง</th>
                  <th className="py-3.5 px-4">สนาม</th>
                  <th className="py-3.5 px-4">วันที่ & เวลา</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => {
                  const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
                  const canCheckin = b.status === 'PENDING' || b.status === 'PRE_CONFIRMED';
                  const canCancel = b.status !== 'CANCELLED';

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200 text-xs">
                          <Ticket size={14} className="text-[#fe6e00]" />
                          {b.booking_code || `#${b.id}`}
                        </span>
                        {b.manual_override_name && (
                          <div className="mt-1">
                            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Override: {b.manual_override_name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{b.user_name || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-600">{b.user_email || '-'}</p>
                        {b.user_phone && <p className="text-xs text-gray-500">{b.user_phone}</p>}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{b.court_name}</p>
                        <span className="text-xs uppercase font-bold text-gray-500">{b.court_type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-900">{formatThaiDate(b.booking_date, true)}</p>
                        <p className="text-xs text-gray-600 font-mono font-bold">{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)} น.</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {b.cancellation_reason && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                            <MessageSquare size={13} /> {b.cancellation_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canCheckin && (
                            <button
                              onClick={() => openActionModal(b, 'checkin')}
                              disabled={actionLoading === b.id}
                              title="เช็คอินแทนผู้ใช้โดยเจ้าหน้าที่"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <UserCheck size={14} /> เช็คอิน
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => openActionModal(b, 'cancel')}
                              disabled={actionLoading === b.id}
                              title="ยกเลิกการจอง"
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg text-xs font-semibold transition border border-gray-200 active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Ban size={14} /> ยกเลิก
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {bookings.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-semibold text-gray-500 bg-white">
            <div>
              แสดง {(pagination.page - 1) * (pagination.limit || 50) + 1} - {Math.min(pagination.page * (pagination.limit || 50), pagination.total)} จากทั้งหมด <span className="font-bold text-gray-800">{pagination.total}</span> รายการ
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={!pagination.has_prev}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ย้อนกลับ
              </button>
              <span className="px-3 py-1.5 font-bold text-gray-800 bg-gray-50 rounded-lg">
                หน้า {pagination.page} / {pagination.total_pages || 1}
              </span>
              <button
                disabled={!pagination.has_next}
                onClick={() => setPage(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal (Manual Override Check-in / Cancel with Reason) */}
      {modalState.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-scaleUp">
            <h3 className="text-lg font-extrabold text-gray-900 mb-2 flex items-center gap-2">
              {modalState.type === 'checkin' ? (
                <>
                  <UserCheck className="text-emerald-600" /> เช็คอินแทนผู้ใช้ (Manual Override)
                </>
              ) : (
                <>
                  <Ban className="text-red-600" /> ยกเลิกการจองโดยเจ้าหน้าที่
                </>
              )}
            </h3>

            <p className="text-xs text-gray-500 mb-4">
              รหัสการจอง: <span className="font-mono font-bold text-gray-800">{modalState.booking?.booking_code || modalState.booking?.id}</span> ({modalState.booking?.court_name})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ระบุเหตุผลในการทำรายการ (บันทึก Audit Trail):
              </label>
              <textarea
                value={modalState.reason}
                onChange={(e) => setModalState(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
                placeholder="พิมพ์เหตุผลหรือคำอธิบาย..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalState({ open: false, type: '', booking: null, reason: '' })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={!modalState.reason.trim()}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50 ${
                  modalState.type === 'checkin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
