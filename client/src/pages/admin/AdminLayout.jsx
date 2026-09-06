import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { ShieldHalf, MapPin, Clock, CalendarX, QrCode, LogOut, RotateCw, Shield, Settings, Users, PieChart, CalendarCheck, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import LanguageToggle from '../../components/LanguageToggle';

export default function AdminLayout({ user, onLogout }) {
  const location = useLocation();
  const path = location.pathname;
  const [msg, setMsg] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleCronTimeout = async () => {
    setUpdating(true);
    try {
      await axios.get('/api/courts');
      setMsg('อัปเดตสถานะการหมดเวลาการจองสำเร็จแล้ว');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans" style={{ backgroundColor: '#fcfaf7', color: '#423d38' }}>
      {/* Admin Sidebar (Dark Frosted Shell) */}
      <aside className="lg:w-64 shrink-0 flex flex-col backdrop-blur-[12px]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.70)', color: '#ffffff', borderRight: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <div className="p-4 flex items-center justify-between lg:block" style={{ height: '64px', borderBottom: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShieldHalf style={{ color: '#fe6e00' }} /> Command Center
            </h1>
          </div>
          <button onClick={onLogout} className="lg:hidden w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition">
            <LogOut size={16} />
          </button>
        </div>

        {/* User Badge */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <div className="w-8 h-8 rounded flex items-center justify-center font-extrabold text-white" style={{ backgroundColor: '#fe6e00' }}>
              {user?.name ? user.name.substring(0, 1) : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'System Admin'}</p>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{user?.role || 'Operations'}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="px-3 py-2 space-y-1 flex lg:block overflow-x-auto">
          {[
            { to: '/admin', icon: MapPin, label: 'จัดการสนาม', match: ['/admin', '/admin/courts'] },
            { to: '/admin/bookings', icon: CalendarCheck, label: 'ตารางการจอง' },
            { to: '/admin/timeslots', icon: Clock, label: 'จัดการเวลา' },
            { to: '/admin/closures', icon: CalendarX, label: 'ปฏิทินสนาม' },
            { to: '/admin/qr', icon: QrCode, label: 'สร้าง QR' },
            { to: '/admin/admins', icon: Shield, label: 'ผู้ดูแลระบบ' },
            { to: '/admin/audit-logs', icon: ShieldCheck, label: 'ประวัติการทำงาน' },
            { to: '/admin/mock-users', icon: Users, label: 'บัญชีทดสอบระบบ' },
            { to: '/admin/surveys', icon: PieChart, label: 'รายงานความพึงพอใจ' },
            { to: '/admin/forms', icon: PieChart, label: 'แบบฟอร์ม (ใหม่)' },
            { to: '/admin/settings', icon: Settings, label: 'ตั้งค่าระบบ' },
          ].map((item, idx) => {
            const isActive = item.match ? item.match.includes(path) : path === item.to;
            return (
              <Link
                key={idx}
                to={item.to}
                className="shrink-0 flex items-center gap-3 transition-colors font-medium text-sm"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? '#fe6e00' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.70)'
                }}
              >
                <item.icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block p-3 mt-auto" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-3 transition-colors text-sm font-medium"
            style={{ padding: '6px 12px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.70)', backgroundColor: 'transparent' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.70)'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header (Shell style) */}
        <header className="px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-[12px] z-10" 
          style={{ height: '64px', backgroundColor: 'rgba(0, 0, 0, 0.70)', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="flex items-center h-full">
            <h2 className="text-lg font-bold">Evreghen SOC Workspace</h2>
            <span className="ml-4 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>LIVE DATA</span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle variant="dark" />
            <button
              onClick={handleCronTimeout}
              disabled={updating}
              className="flex items-center gap-2 text-xs font-semibold rounded-md transition-colors h-[36px]"
              style={{ padding: '0 12px', backgroundColor: 'rgba(255, 255, 255, 0.10)', color: '#ffffff' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)'}
            >
              <RotateCw size={14} className={updating ? 'animate-spin' : ''} style={{ color: '#fe6e00' }} />
              Sync Telemetry
            </button>
          </div>
        </header>

        {msg && (
          <div className="mx-8 mt-6 px-4 py-3 rounded-md text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: '#dcfce7', color: '#016630', border: '1px solid #bbf7d0' }}>
            {msg}
          </div>
        )}

        <div className="p-8 max-w-[1400px] w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
