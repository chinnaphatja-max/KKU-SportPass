import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, CalendarCheck, ScanLine, ShieldHalf, Info, LogOut } from 'lucide-react';
import axios from 'axios';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import ScanCheckIn from './pages/ScanCheckIn';
import CourtBooking from './pages/CourtBooking';
import About from './pages/About';
import MockUsersInfo from './pages/MockUsersInfo';

import AdminLayout from './pages/admin/AdminLayout';
import AdminCourts from './pages/admin/AdminCourts';
import AdminTimeslots from './pages/admin/AdminTimeslots';
import AdminClosures from './pages/admin/AdminClosures';
import AdminQR from './pages/admin/AdminQR';
import QRPosterPrint from './pages/admin/QRPosterPrint';
import AdminAdmins from './pages/admin/AdminAdmins';
import AdminSettings from './pages/admin/AdminSettings';

function Navigation({ user }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-lg mx-auto flex justify-around p-3">
        <Link to="/" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <Home size={20} />
          <span className="text-[10px] font-semibold">หน้าแรก</span>
        </Link>
        <Link to="/scan" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/scan' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <div className="w-10 h-10 bg-brand-600 rounded-full text-white flex items-center justify-center -mt-6 shadow-lg shadow-brand-500/30 border-4 border-white hover:bg-brand-500 transition">
            <ScanLine size={18} />
          </div>
          <span className="text-[10px] font-semibold mt-1">เช็คอิน</span>
        </Link>
        <Link to="/bookings" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/bookings' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <CalendarCheck size={20} />
          <span className="text-[10px] font-semibold">การจอง</span>
        </Link>
        <Link to="/about" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/about' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <Info size={20} />
          <span className="text-[10px] font-semibold">ผู้ศึกษา</span>
        </Link>


      </div>
    </nav>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/KKU_SportPass.svg"
            alt="KKU SportPass Logo"
            className="h-8 w-auto"
            onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }}
          />
          <h1 className="font-extrabold text-xl tracking-tight text-gray-900">KKU SportPass</h1>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900">{user.name}</p>
                <p className="text-[10px] text-gray-400">{user.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}</p>
              </div>
              <button onClick={onLogout} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition ml-1" title="ออกจากระบบ">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-xs font-bold shadow-md shadow-brand-500/20 transition">
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function UserLayout({ children, user, onLogout }) {
  const location = useLocation();
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/about' || (!user && location.pathname === '/');

  if (isPublicPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="pb-24">
      <Header user={user} onLogout={onLogout} />
      <main className="w-full min-h-screen">
        {children}
      </main>
      <Navigation user={user} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/status');
      if (res.data.logged_in) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Standalone full-page QR poster for printing */}
        <Route path="/admin/qr-print" element={<QRPosterPrint />} />

        <Route path="/admin" element={user && user.role === 'admin' ? <AdminLayout user={user} onLogout={handleLogout} /> : <Navigate to="/" />}>
          <Route index element={<AdminCourts />} />
          <Route path="courts" element={<AdminCourts />} />
          <Route path="timeslots" element={<AdminTimeslots />} />
          <Route path="closures" element={<AdminClosures />} />
          <Route path="qr" element={<AdminQR />} />
          <Route path="admins" element={<AdminAdmins user={user} />} />
          <Route path="mock-users" element={<MockUsersInfo />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route
          path="/*"
          element={
            <UserLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Dashboard user={user} />) : <LandingPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login onLoginSuccess={checkAuth} />} />
                <Route path="/register" element={<Register onLoginSuccess={checkAuth} />} />
                <Route path="/court/:id" element={<CourtBooking user={user} />} />
                <Route path="/scan" element={<ScanCheckIn user={user} />} />
                <Route path="/bookings" element={<MyBookings user={user} />} />
              </Routes>
            </UserLayout>
          }
        />
      </Routes>
    </Router>
  );
}
