import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, CalendarCheck, ScanLine, Info, LogOut, User } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from './context/LanguageContext';
import LanguageToggle from './components/LanguageToggle';
import NotificationBell from './components/NotificationBell';

// CSRF Token: Read from cookie and send with every mutation request
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// Axios interceptor: automatically attach CSRF token header to all requests
axios.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});
// Critical Initial Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import CookieConsent from './components/CookieConsent';

// Lazy Loaded User Pages & Heavy Components
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Profile = lazy(() => import('./pages/Profile'));
const ScanCheckIn = lazy(() => import('./pages/ScanCheckIn'));
const CourtBooking = lazy(() => import('./pages/CourtBooking'));
const About = lazy(() => import('./pages/About'));
const Manual = lazy(() => import('./pages/Manual'));
const Survey = lazy(() => import('./pages/Survey'));
const FormView = lazy(() => import('./pages/FormView'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const MockUsersInfo = lazy(() => import('./pages/MockUsersInfo'));

// Lazy Loaded Admin Pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCourts = lazy(() => import('./pages/admin/AdminCourts'));
const AdminTimeslots = lazy(() => import('./pages/admin/AdminTimeslots'));
const AdminClosures = lazy(() => import('./pages/admin/AdminClosures'));
const AdminQR = lazy(() => import('./pages/admin/AdminQR'));
const QRPosterPrint = lazy(() => import('./pages/admin/QRPosterPrint'));
const AdminAdmins = lazy(() => import('./pages/admin/AdminAdmins'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminSurveys = lazy(() => import('./pages/admin/AdminSurveys'));
const AdminForms = lazy(() => import('./pages/admin/AdminForms'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminMarketing = lazy(() => import('./pages/admin/AdminMarketing'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-gray-500">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3"></div>
      <span className="text-xs font-medium text-gray-400">กำลังโหลดเนื้อหา...</span>
    </div>
  );
}

function Navigation({ user }) {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-lg mx-auto flex justify-between items-center py-2 px-3 sm:px-5">
        <Link to="/" className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${path === '/' ? 'text-brand-600 bg-brand-50 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}>
          <Home size={20} />
          <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">{t('nav_home', 'หน้าแรก')}</span>
        </Link>
        <Link to="/bookings" className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${path === '/bookings' ? 'text-brand-600 bg-brand-50 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}>
          <CalendarCheck size={20} />
          <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">{t('nav_bookings', 'การจอง')}</span>
        </Link>
        <Link to="/scan" className={`flex flex-col items-center gap-0.5 px-1 transition ${path === '/scan' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700 font-medium'}`}>
          <div className="w-11 h-11 bg-brand-600 rounded-full text-white flex items-center justify-center -mt-6 shadow-lg shadow-brand-500/30 border-4 border-white hover:bg-brand-500 transition active:scale-95">
            <ScanLine size={20} />
          </div>
          <span className="text-[11px] sm:text-xs font-bold mt-0.5 whitespace-nowrap">{t('nav_scan', 'สแกน')}</span>
        </Link>
        <Link to="/manual" className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${path === '/manual' ? 'text-brand-600 bg-brand-50 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}>
          <Info size={20} />
          <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">{t('nav_manual', 'คู่มือ')}</span>
        </Link>
        <Link to={user ? "/profile" : "/login"} className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${path === '/profile' ? 'text-brand-600 bg-brand-50 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}>
          <User size={20} />
          <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">{t('nav_profile', 'โปรไฟล์')}</span>
        </Link>
      </div>
    </nav>
  );
}

function UserLayout({ children, user, onLogout }) {
  const { t } = useLanguage();

  return (
    <div className="pb-24">
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/KKU_SportPass.png" alt="Logo" className="w-9 h-9 rounded-xl shadow-sm" />
          <span className="font-black text-gray-900 text-xl tracking-tight">Sport<span className="text-brand-600">Pass</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <NotificationBell user={user} />

          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
              <Link to="/profile" className="text-right hover:opacity-80 transition group" title="แก้ไขโปรไฟล์">
                <div className="text-sm font-bold text-gray-800 group-hover:text-brand-600 transition-colors">{user.name}</div>
                <div className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{user.role}</div>
              </Link>
              <button 
                onClick={onLogout}
                className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm sm:text-base font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-full hover:bg-brand-100 transition">
              {t('nav_login', 'เข้าสู่ระบบ')}
            </Link>
          )}
        </div>
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
    } catch {
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

  const isAdminRole = Boolean(user && ['admin', 'super_admin', 'staff', 'viewer'].includes(user.role));

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/qr-print" element={<QRPosterPrint />} />

          <Route path="/admin" element={isAdminRole ? <AdminLayout user={user} onLogout={handleLogout} /> : <Navigate to="/" />}>
            <Route index element={<AdminDashboard user={user} />} />
            <Route path="courts" element={<AdminCourts />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="timeslots" element={<AdminTimeslots />} />
            <Route path="closures" element={<AdminClosures />} />
            <Route path="qr" element={<AdminQR />} />
            <Route path="admins" element={<AdminAdmins user={user} />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="mock-users" element={<MockUsersInfo />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="surveys" element={<AdminSurveys />} />
            <Route path="forms" element={<AdminForms />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="marketing" element={<AdminMarketing />} />
          </Route>

          <Route path="/" element={
            user 
              ? (isAdminRole ? <Navigate to="/admin" /> : <UserLayout user={user} onLogout={handleLogout}><Dashboard user={user} /></UserLayout>)
              : <LandingPage />
          } />

          <Route path="/login" element={<Login onLoginSuccess={checkAuth} />} />
          <Route path="/register" element={<Register onLoginSuccess={checkAuth} />} />
          
          <Route path="/survey" element={<Survey />} />
          <Route path="/evaluation" element={<FormView />} />
          <Route path="/form/:id" element={<FormView />} />
          <Route path="/forms/:id" element={<FormView />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

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
                  <Route path="profile" element={<Profile user={user} onProfileUpdate={(updated) => setUser(prev => ({ ...prev, ...updated }))} onLogout={handleLogout} />} />
                </Routes>
              </UserLayout>
            }
          />
        </Routes>
      </Suspense>
      <CookieConsent />
    </Router>
  );
}
