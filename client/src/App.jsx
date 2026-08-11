import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
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
import Manual from './pages/Manual';
import MockUsersInfo from './pages/MockUsersInfo';

import Survey from './pages/Survey';

import AdminLayout from './pages/admin/AdminLayout';
import AdminCourts from './pages/admin/AdminCourts';
import AdminTimeslots from './pages/admin/AdminTimeslots';
import AdminClosures from './pages/admin/AdminClosures';
import AdminQR from './pages/admin/AdminQR';
import QRPosterPrint from './pages/admin/QRPosterPrint';
import AdminAdmins from './pages/admin/AdminAdmins';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSurveys from './pages/admin/AdminSurveys';

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
          <span className="text-[10px] font-semibold mt-1">สแกน</span>
        </Link>
        <Link to="/bookings" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/bookings' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <CalendarCheck size={20} />
          <span className="text-[10px] font-semibold">การจอง</span>
        </Link>
        <Link to="/manual" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/manual' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <Info size={20} />
          <span className="text-[10px] font-semibold">คู่มือ</span>
        </Link>
      </div>
    </nav>
  );
}

function UserLayout({ children, user, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="pb-20">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/KKU_SportPass.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="font-bold text-gray-800 text-lg tracking-tight">Sport<span className="text-brand-600">Pass</span></span>
        </div>
        
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-800">{user.name}</div>
              <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{user.role}</div>
            </div>
            <button 
              onClick={onLogout}
              className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-sm font-semibold text-brand-600 bg-brand-50 px-4 py-1.5 rounded-full hover:bg-brand-100 transition">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
      
      <main>
        {children}
      </main>

      <Navigation user={user} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/status');
      if (res.data.logged_in) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
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
          <Route path="surveys" element={<AdminSurveys />} />
        </Route>

        <Route path="/" element={
          user 
            ? (user.role === 'admin' ? <Navigate to="/admin" /> : <UserLayout user={user} onLogout={handleLogout}><Dashboard user={user} /></UserLayout>)
            : <LandingPage />
        } />

        <Route path="/login" element={<Login onLoginSuccess={checkAuth} />} />
        <Route path="/register" element={<Register onLoginSuccess={checkAuth} />} />
        
        {/* Make survey accessible without UserLayout so it takes full screen nicely */}
        <Route path="/survey" element={<Survey />} />

        <Route
          path="/*"
          element={
            <UserLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="about" element={<About />} />
                <Route path="manual" element={<Manual />} />
                <Route path="court/:id" element={<CourtBooking user={user} />} />
                <Route path="scan" element={<ScanCheckIn user={user} />} />
                <Route path="bookings" element={<MyBookings user={user} />} />
              </Routes>

            </UserLayout>
          }
        />
      </Routes>
    </Router>
  );
}
