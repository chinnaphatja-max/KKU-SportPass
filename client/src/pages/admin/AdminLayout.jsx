import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  ShieldHalf, MapPin, Clock, CalendarX, QrCode, LogOut, Shield, 
  Settings, PieChart, CalendarCheck, ShieldCheck, LayoutDashboard, 
  BarChart2, FileText, Menu, X, ChevronRight, ExternalLink, 
  Sparkles, User
} from 'lucide-react';
import LanguageToggle from '../../components/LanguageToggle';

const IS_DEV = import.meta.env.DEV;

// Grouped navigation categories (Operating modules)
const NAV_SECTIONS = [
  {
    title: 'ภาพรวม & รายงาน',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'แดชบอร์ดภาพรวม', exact: true, roles: ['super_admin', 'admin', 'staff', 'viewer'] },
      { to: '/admin/analytics', icon: BarChart2, label: 'สถิติ & วิเคราะห์ผล', roles: ['super_admin', 'admin', 'viewer'] },
      { to: '/admin/surveys', icon: PieChart, label: 'รายงานความพึงพอใจ', roles: ['super_admin', 'admin', 'viewer'] },
    ]
  },
  {
    title: 'จัดการสนามกีฬา & เวลา',
    items: [
      { to: '/admin/courts', icon: MapPin, label: 'สนามกีฬา & ค่าบริการ', roles: ['super_admin', 'admin'] },
      { to: '/admin/timeslots', icon: Clock, label: 'ช่วงเวลาเปิดจอง', roles: ['super_admin', 'admin'] },
      { to: '/admin/closures', icon: CalendarX, label: 'ปฏิทินวันปิดสนาม', roles: ['super_admin', 'admin', 'staff'] },
      { to: '/admin/qr', icon: QrCode, label: 'สร้างโปสเตอร์ QR Code', roles: ['super_admin', 'admin', 'staff'] },
    ]
  },
  {
    title: 'งานปฏิบัติการ & บริการ',
    items: [
      { to: '/admin/bookings', icon: CalendarCheck, label: 'รายการจองทั้งหมด', roles: ['super_admin', 'admin', 'staff', 'viewer'] },
      { to: '/admin/forms', icon: FileText, label: 'คำร้อง & ข้อเสนอแนะ', roles: ['super_admin', 'admin', 'viewer'] },
    ]
  },
  {
    title: 'ผู้ดูแล & ความปลอดภัย',
    items: [
      { to: '/admin/admins', icon: Shield, label: 'ผู้ดูแลระบบ', roles: ['super_admin'] },
      { to: '/admin/audit-logs', icon: ShieldCheck, label: 'ประวัติการใช้งาน (Audit)', roles: ['super_admin', 'admin', 'viewer'] },
      ...(IS_DEV ? [{ to: '/admin/mock-users', icon: User, label: 'บัญชีทดสอบ (Dev)', roles: ['super_admin', 'admin'] }] : []),
    ]
  }
];

// Helper to map pathname to readable breadcrumb
function getBreadcrumb(pathname) {
  const map = {
    '/admin': 'แดชบอร์ดภาพรวม',
    '/admin/analytics': 'สถิติ & วิเคราะห์ผล',
    '/admin/surveys': 'รายงานความพึงพอใจ',
    '/admin/courts': 'จัดการสนามกีฬา',
    '/admin/timeslots': 'จัดการช่วงเวลา',
    '/admin/closures': 'ปฏิทินวันปิดสนาม',
    '/admin/qr': 'โปสเตอร์ QR Code ประจำสนาม',
    '/admin/bookings': 'รายการจองทั้งหมด',
    '/admin/forms': 'คำร้อง & แบบฟอร์ม',
    '/admin/admins': 'ผู้ดูแลระบบ',
    '/admin/audit-logs': 'ประวัติการทำงาน (Audit Logs)',
    '/admin/settings': 'ตั้งค่าระบบทั่วไป',
    '/admin/mock-users': 'บัญชีทดสอบระบบ',
  };
  return map[pathname] || 'หน้าจัดการ';
}

export default function AdminLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentRole = user?.role || 'staff';
  const roleLabels = {
    super_admin: 'ผู้ดูแลสูงสุด (Super Admin)',
    admin: 'ผู้ดูแลระบบ (Admin)',
    staff: 'เจ้าหน้าที่สนาม (Staff)',
    viewer: 'ผู้ตรวจการ (Viewer)',
  };

  const isNavActive = (item) => {
    if (item.exact) return path === item.to;
    return path === item.to || path.startsWith(item.to + '/');
  };

  const canAccessSettings = ['super_admin', 'admin'].includes(currentRole);

  return (
    <div className="min-h-screen flex bg-[#fbf9f6] text-gray-800 font-sans antialiased">
      {/* ── Desktop & Tablet Sidebar (Permanently Locked & Fixed to viewport) ── */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col h-screen sticky top-0 bg-slate-900 border-r border-slate-800/80 text-white z-30 select-none overflow-hidden">
        {/* 1. Fixed Brand Header */}
        <div className="h-16 px-6 shrink-0 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#fe6e00] to-[#ff8c33] flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
              <ShieldHalf size={20} className="drop-shadow-xs" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 text-white">
                KKU SportPass
              </h1>
              <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        {/* 3. Middle Scrollable Nav (Only this section scrolls if viewport is short) */}
        <nav className="flex-1 min-h-0 px-3 py-1 space-y-4 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => {
              if (currentRole === 'super_admin') return true;
              return item.roles.includes(currentRole);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item, iIdx) => {
                    const active = isNavActive(item);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={iIdx}
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-[#fe6e00] text-white shadow-md shadow-orange-600/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        <Icon size={16} className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* 4. PERMANENTLY FIXED FOOTER (Anchored at the bottom at all times!) */}
        <div className="p-3 shrink-0 border-t border-slate-800/90 bg-slate-950/70 space-y-1 mt-auto">
          {/* Settings Button (Fixed) */}
          {canAccessSettings && (
            <Link
              to="/admin/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                path === '/admin/settings'
                  ? 'bg-[#fe6e00] text-white shadow-md shadow-orange-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings size={15} className={path === '/admin/settings' ? 'text-white' : 'text-slate-400'} />
              <span className="flex-1 truncate">ตั้งค่าระบบ</span>
              {path === '/admin/settings' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </Link>
          )}

          {/* Open User Web Button (Fixed) */}
          <Link
            to="/booking"
            target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl text-xs font-semibold transition"
          >
            <ExternalLink size={14} />
            <span className="flex-1 truncate">เปิดหน้าเว็บผู้ใช้ทั่วไป</span>
          </Link>

          {/* Logout Button (Fixed) */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl text-xs font-semibold transition"
          >
            <LogOut size={14} />
            <span className="flex-1 text-left">ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl overflow-hidden">
            {/* Mobile Header */}
            <div className="h-16 px-5 shrink-0 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fe6e00] flex items-center justify-center text-white">
                  <ShieldHalf size={18} />
                </div>
                <span className="font-extrabold text-sm">KKU SportPass</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Scrollable Nav */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
              {NAV_SECTIONS.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                  {section.items
                    .filter(item => currentRole === 'super_admin' || item.roles.includes(currentRole))
                    .map((item, iIdx) => {
                      const active = isNavActive(item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={iIdx}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                            active ? 'bg-[#fe6e00] text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                </div>
              ))}
            </div>

            {/* Mobile Fixed Footer */}
            <div className="p-3 shrink-0 border-t border-slate-800 bg-slate-950/80 space-y-1">
              {canAccessSettings && (
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    path === '/admin/settings'
                      ? 'bg-[#fe6e00] text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings size={15} />
                  <span>ตั้งค่าระบบ</span>
                </Link>
              )}
              <Link
                to="/booking"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                <ExternalLink size={14} />
                <span>เปิดหน้าเว็บผู้ใช้ทั่วไป</span>
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 text-xs font-bold hover:bg-rose-500/20 rounded-xl transition"
              >
                <LogOut size={14} />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Navbar (Sticky Top) */}
        <header className="h-16 px-4 sm:px-8 bg-white/90 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-20 flex items-center justify-between gap-4 shadow-2xs">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
              aria-label="Toggle mobile menu"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-gray-400 hidden sm:inline">Admin</span>
              <ChevronRight size={13} className="text-gray-300 hidden sm:inline" />
              <h2 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                {getBreadcrumb(path)}
              </h2>
            </div>
          </div>

          {/* Right: Quick Indicators & Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-full text-xs font-extrabold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ระบบเปิดทำการปกติ • มข.</span>
            </div>

            {/* Quick action button */}
            <button
              onClick={() => navigate('/admin/courts')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#fe6e00] border border-orange-200 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <MapPin size={13} />
              <span>จัดการสนาม</span>
            </button>

            {/* Language toggle */}
            <LanguageToggle />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#fe6e00] font-black text-xs flex items-center justify-center border border-orange-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  {user?.role || 'Staff'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
