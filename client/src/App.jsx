import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, CalendarCheck, ScanLine, Info, LogOut } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from './context/LanguageContext';
import LanguageToggle from './components/LanguageToggle';

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

function Navigation() {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-lg mx-auto flex justify-around p-3">
        <Link to="/" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <Home size={20} />
          <span className="text-[10px] font-semibold">{t('nav_home', 'หน้าแรก')}</span>
        </Link>
        <Link to="/scan" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/scan' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <div className="w-10 h-10 bg-brand-600 rounded-full text-white flex items-center justify-center -mt-6 shadow-lg shadow-brand-500/30 border-4 border-white hover:bg-brand-500 transition">
            <ScanLine size={18} />
          </div>
          <span className="text-[10px] font-semibold mt-1">{t('nav_scan', 'สแกน')}</span>
        </Link>
        <Link to="/bookings" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/bookings' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <CalendarCheck size={20} />
          <span className="text-[10px] font-semibold">{t('nav_bookings', 'การจอง')}</span>
        </Link>
        <Link to="/manual" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${path === '/manual' ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
          <Info size={20} />
          <span className="text-[10px] font-semibold">{t('nav_manual', 'คู่มือ')}</span>
        </Link>
      </div>
    </nav>
  );
}

function UserLayout({ children, user, onLogout }) {
  const { t } = useLanguage();

  return (
    <div className="pb-20">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/KKU_SportPass.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="font-bold text-gray-800 text-lg tracking-tight">Sport<span className="text-brand-600">Pass</span></span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <LanguageToggle />

          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-gray-100">
              <div className="text-right">
                <div className="text-xs font-semibold text-gray-800">{user.name}</div>
                <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{user.role}</div>
              </div>
              <button 
                onClick={onLogout}
                className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-brand-600 bg-brand-50 px-4 py-1.5 rounded-full hover:bg-brand-100 transition">
              {t('nav_login', 'เข้าสู่ระบบ')}
            </Link>
          )}
        </div>
      </div>
      
      <main>
        {children}
      </main>

      <Navigation />
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
            <Route index element={<AdminCourts />} />
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
