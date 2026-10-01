import { useState, useEffect } from 'react';
import { 
  CalendarCheck, Clock, CheckCircle2, XCircle, Users, TrendingUp, 
  AlertTriangle, CreditCard, RefreshCw, ArrowRight, Flame, Shield,
  Sparkles, MapPin, QrCode, Calendar, BarChart3, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

const BRAND = '#fe6e00';

function KpiCard({ icon: Icon, label, value, sub, color = BRAND, bg = '#fff7f2', link, loading, trend }) {
  const card = (
    <div
      className="relative bg-white rounded-3xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between gap-3 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
      style={{ minHeight: 135 }}
    >
      {/* Decorative background glow */}
      <div 
        className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-[0.06] -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" 
        style={{ background: color }} 
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 select-none">
            {label}
          </p>
          {loading ? (
            <div className="mt-2.5 h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <h3 className="text-3xl font-black mt-1.5 tracking-tight text-gray-900">
              {value ?? '—'}
            </h3>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:rotate-3" 
          style={{ backgroundColor: bg }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-100/80 text-xs">
        {sub && <p className="text-[11px] text-gray-500 font-medium truncate">{sub}</p>}
        {trend && (
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
            {trend}
          </span>
        )}
      </div>
    </div>
  );

  return link ? <Link to={link} className="block">{card}</Link> : card;
}

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookingStats, setBookingStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [trackRes, bookRes, payRes] = await Promise.allSettled([
        axios.get('/api/admin/tracking-stats'),
        axios.get(`/api/admin/bookings?date=${today}&limit=10`),
        axios.get('/api/admin/payments?limit=5'),
      ]);
      if (trackRes.status === 'fulfilled') setStats(trackRes.value.data);
      if (bookRes.status === 'fulfilled') setBookingStats(bookRes.value.data);
      if (payRes.status === 'fulfilled') setPaymentStats(payRes.value.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const bs = stats?.bookings || {};
  const us = stats?.users || {};
  const todayBookings = bookingStats?.bookings || [];
  const todayTotal = bookingStats?.pagination?.total ?? todayBookings.length;
  const todayCheckedIn = todayBookings.filter(b => b.status === 'CHECKED_IN').length;
  const todayPending = todayBookings.filter(b => b.status === 'PENDING' || b.status === 'PRE_CONFIRMED').length;

  const recentPayments = paymentStats?.payments || [];
  const totalRevenue = recentPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const completionRate = bs.total > 0 ? Math.round((bs.completed / bs.total) * 100) : 0;

  return (
    <div className="space-y-7">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-700/60">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#fe6e00]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <Sparkles size={11} /> ศูนย์สั่งการและควบคุมระบบ
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              สวัสดี, {user?.name || 'ผู้ดูแลระบบ'} 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              ภาพรวมสนามกีฬา มข. ประจำวันที่ {formatThaiDate(new Date().toISOString().split('T')[0], true)}
            </p>
          </div>

          {/* Right Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2 shadow-xs active:scale-95"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-400' : 'text-orange-400'} />
              <span>รีเฟรชข้อมูล</span>
            </button>
            <button
              onClick={() => navigate('/admin/courts')}
              className="px-4 py-2.5 bg-[#fe6e00] hover:bg-[#e06100] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <MapPin size={14} />
              <span>จัดการสนาม</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Action Hub ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'จัดการสนามกีฬา', icon: MapPin, to: '/admin/courts', color: '#fe6e00', desc: 'เพิ่ม/แก้ไข/ค่าบริการ' },
          { label: 'ตารางการจองวันนี้', icon: CalendarCheck, to: '/admin/bookings', color: '#3b82f6', desc: 'ตรวจสอบ/เช็คอิน' },
          { label: 'โปสเตอร์ QR Code', icon: QrCode, to: '/admin/qr', color: '#10b981', desc: 'สั่งพิมพ์ป้ายสนาม' },
          { label: 'ปฏิทินวันปิดสนาม', icon: Calendar, to: '/admin/closures', color: '#8b5cf6', desc: 'ตั้งค่าวันหยุด/ซ่อมบำรุง' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.to}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition group flex items-center gap-3.5"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-gray-900 group-hover:text-[#fe6e00] transition truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {item.desc}
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* ── Key Metrics (Row 1) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">
            ดัชนีชี้วัดหลักประจำวัน (Daily KPIs)
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">
            อัปเดตแบบเรียลไทม์
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={CalendarCheck}
            label="การจองวันนี้"
            value={loading ? null : todayTotal}
            sub={`เช็คอินแล้ว ${todayCheckedIn} รายการ`}
            color="#fe6e00"
            bg="#fff7f2"
            link="/admin/bookings"
            loading={loading}
          />
          <KpiCard
            icon={Clock}
            label="รอดำเนินการ / เช็คอิน"
            value={loading ? null : todayPending}
            sub="รอเข้าใช้งานวันนี้"
            color="#3b82f6"
            bg="#eff6ff"
            link="/admin/bookings"
            loading={loading}
          />
          <KpiCard
            icon={Users}
            label="ผู้ใช้งานทั้งหมด"
            value={loading ? null : us.total?.toLocaleString()}
            sub="นศ. / บุคลากร / บุคคลภายนอก"
            color="#10b981"
            bg="#f0fdf4"
            loading={loading}
          />
          <KpiCard
            icon={CreditCard}
            label="รายได้ล่าสุด"
            value={loading ? null : `฿${totalRevenue.toLocaleString()}`}
            sub="ชำระเงินสำเร็จ (5 ล่าสุด)"
            color="#8b5cf6"
            bg="#f5f3ff"
            link="/admin/bookings"
            loading={loading}
          />
        </div>
      </div>

      {/* ── Operations & Performance (Row 2) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">
            ประสิทธิภาพระบบสะสม (Overall Operations)
          </h3>
          <Link to="/admin/analytics" className="text-xs font-bold text-[#fe6e00] hover:underline flex items-center gap-1">
            ดูสถิติเชิงลึก <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={CheckCircle2}
            label="เช็คอินสำเร็จ (สะสม)"
            value={loading ? null : bs.completed?.toLocaleString()}
            sub={`จากทั้งหมด ${bs.total?.toLocaleString() ?? '—'} การจอง`}
            color="#10b981"
            bg="#f0fdf4"
            loading={loading}
          />
          <KpiCard
            icon={XCircle}
            label="ขาดการเช็คอิน (Missed)"
            value={loading ? null : bs.missed?.toLocaleString()}
            sub="ไม่เข้าใช้งานตามเวลา"
            color="#ef4444"
            bg="#fef2f2"
            loading={loading}
          />
          <KpiCard
            icon={AlertTriangle}
            label="ค้างอยู่ในระบบ (Active)"
            value={loading ? null : bs.active?.toLocaleString()}
            sub="การจองที่ยังไม่หมดอายุ"
            color="#f59e0b"
            bg="#fffbeb"
            loading={loading}
          />
          <KpiCard
            icon={TrendingUp}
            label="Completion Rate"
            value={loading ? null : `${completionRate}%`}
            sub="อัตราความสำเร็จของการจอง"
            color="#fe6e00"
            bg="#fff7f2"
            loading={loading}
          />
        </div>
      </div>

      {/* ── Today's Bookings Live Feed ── */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-[#fe6e00]" />
            <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">
              รายการจองวันนี้ (10 ล่าสุด)
            </h3>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs font-bold text-[#fe6e00] hover:text-[#e06100] flex items-center gap-1"
          >
            ดูทั้งหมด ({todayTotal}) <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : todayBookings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CalendarCheck size={36} className="mx-auto mb-2 text-gray-300 stroke-1" />
            <p className="text-sm font-bold text-gray-600">ยังไม่มีการจองในวันนี้</p>
            <p className="text-xs text-gray-400 mt-0.5">รายการจองใหม่จะปรากฏที่นี่แบบอัตโนมัติ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-5 text-left">ผู้จอง</th>
                  <th className="py-3 px-5 text-left">สนาม</th>
                  <th className="py-3 px-5 text-left">เวลาที่จอง</th>
                  <th className="py-3 px-5 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayBookings.map((b) => {
                  const statusMap = {
                    PENDING: { label: 'รอยืนยันสิทธิ์', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
                    PRE_CONFIRMED: { label: 'ยืนยันแล้ว-รอเช็คอิน', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                    CHECKED_IN: { label: 'เช็คอินแล้ว', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    CANCELLED: { label: 'ยกเลิกแล้ว', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
                    MISSED: { label: 'ขาดการเช็คอิน', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                  };
                  const s = statusMap[b.status] || statusMap.PENDING;

                  return (
                    <tr key={b.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-black text-xs flex items-center justify-center shrink-0">
                            {b.user_name ? b.user_name.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 truncate">{b.user_name || 'ไม่ระบุ'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{b.user_email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-gray-800">
                        {b.court_name}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-gray-700">
                        {b.start_time?.substring(0, 5)} – {b.end_time?.substring(0, 5)} น.
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
