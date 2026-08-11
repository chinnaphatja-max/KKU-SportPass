import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { ShieldHalf, MapPin, Clock, CalendarX, QrCode, LogOut, RotateCw, Home, Shield, Settings, Users, PieChart } from 'lucide-react';
import axios from 'axios';

export default function AdminLayout({ user, onLogout }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleCronTimeout = async () => {
    setUpdating(true);
    try {
      await axios.get('/api/courts'); // triggers applyBookingTimeouts in Express
      setMsg('อัปเดตสถานะการหมดเวลาการจองสำเร็จแล้ว');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row text-gray-800">
      {/* Admin Sidebar */}
      <aside className="lg:w-72 bg-slate-950 text-white shrink-0">
        <div className="p-6 flex items-center justify-between lg:block border-b lg:border-none border-slate-900">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <ShieldHalf className="text-brand-500" /> Admin Panel
            </h1>
            <p className="text-xs text-slate-400 mt-1">KKU SportPass Control Center</p>
          </div>
          <button onClick={onLogout} className="lg:hidden w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 transition" title="ออกจากระบบ">
            <LogOut size={18} />
          </button>
        </div>

        {/* User Badge */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-extrabold text-white">
              {user?.name ? user.name.substring(0, 1) : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'ผู้ดูแลระบบ'}</p>
              <p className="text-xs text-slate-400">Admin Account</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="px-4 py-2 space-y-1.5 flex lg:block overflow-x-auto">
          <Link
            to="/admin"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin' || path === '/admin/courts' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <MapPin size={18} /> จัดการสนาม
          </Link>

          <Link
            to="/admin/timeslots"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/timeslots' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Clock size={18} /> จัดการเวลา
          </Link>

          <Link
            to="/admin/closures"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/closures' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <CalendarX size={18} /> ปฏิทินสนาม
          </Link>

          <Link
            to="/admin/qr"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/qr' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <QrCode size={18} /> สร้าง QR
          </Link>

          <Link
            to="/admin/admins"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/admins' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Shield size={18} /> ผู้ดูแลระบบ
          </Link>

          <Link
            to="/admin/mock-users"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/mock-users' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Users size={18} /> บัญชีทดสอบระบบ
          </Link>

          <Link
            to="/admin/settings"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/settings' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Settings size={18} /> ตั้งค่าระบบ
          </Link>

          <Link
            to="/admin/surveys"
            className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              path === '/admin/surveys' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <PieChart size={18} /> รายงานความพึงพอใจ
          </Link>
        </nav>

        <div className="hidden lg:block p-4 mt-auto border-t border-slate-900">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500 hover:text-white transition text-xs font-bold">
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">ระบบหลังบ้านผู้ดูแลสนาม</h2>
            <p className="text-xs text-gray-500">ข้อมูลในหน้านี้เชื่อมกับระบบจองจริงแบบเรียลไทม์</p>
          </div>

          <button
            onClick={handleCronTimeout}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition"
          >
            <RotateCw size={14} className={`text-brand-600 ${updating ? 'animate-spin' : ''}`} />
            อัปเดตสถานะหมดเวลา
          </button>
        </header>

        {msg && (
          <div className="mx-6 mt-4 bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-bold border border-emerald-200">
            {msg}
          </div>
        )}

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
