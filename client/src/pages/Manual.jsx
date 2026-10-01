import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  BookOpen, CheckCircle2, QrCode, MapPin, ArrowRight, ShieldCheck, 
  ScanLine, Clock, AlertTriangle, Users, CreditCard, HelpCircle, 
  FileText, ChevronDown, Sparkles, Navigation, XCircle, Search, 
  Calendar, Check, Info, Bell, Smartphone, Timer, AlertCircle, Ban, Zap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function Manual() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('booking'); // 'booking' | 'timing' | 'waitlist' | 'payment' | 'rules' | 'faq'
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Live Admin Settings fetched from database (/api/public-settings)
  const [systemSettings, setSystemSettings] = useState({
    pre_confirm_open_minutes: 10,
    pre_confirm_close_minutes: 5,
    checkin_early_minutes: 10,
    checkin_baseline_grace_minutes: 5,
    checkin_grace_minutes: 10,
    gps_radius_meters: 30,
    max_active_bookings_per_user: 2,
    max_advance_booking_days: 7,
    cancellation_lead_minutes: 30
  });

  useEffect(() => {
    let isMounted = true;
    axios.get('/api/public-settings')
      .then(res => {
        if (isMounted && res.data?.settings) {
          setSystemSettings(prev => ({ ...prev, ...res.data.settings }));
        }
      })
      .catch(err => {
        console.warn('Could not load public settings:', err.message);
      });
    return () => { isMounted = false; };
  }, []);

  const tabs = [
    { id: 'booking', label: isEn ? '1. Booking Guide' : '1. ขั้นตอนการจอง', icon: BookOpen, color: 'text-brand-600 bg-brand-50 border-brand-200' },
    { id: 'timing', label: isEn ? '2. Timing & Check-In' : '2. กฎเวลา & เช็คอิน', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'waitlist', label: isEn ? '3. Waitlist System' : '3. ระบบคิวรอ', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'payment', label: isEn ? '4. Rates & Payment' : '4. ค่าบริการ & ชำระเงิน', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'rules', label: isEn ? '5. Quota & Fair Play' : '5. กติกา & โควตา', icon: ShieldCheck, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'faq', label: isEn ? '6. FAQs & Help' : '6. คำถามที่พบบ่อย', icon: HelpCircle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  ];

  const faqs = [
    {
      q: isEn ? 'Why does the app say "You are not at the physical court" during check-in?' : 'สแกนเช็คอินแล้วขึ้นว่า "คุณไม่ได้อยู่ที่สนามจริง" เกิดจากอะไร?',
      a: isEn 
        ? `KKU SportPass uses GPS geofencing to prevent proxy bookings. Ensure Location Services (GPS) are enabled on your phone and granted browser permission. You must be physically within ${systemSettings.gps_radius_meters} meters of the court boundary.`
        : `ระบบมีกลไก Geofencing ตรวจจับพิกัด GPS เพื่อป้องกันการสแกนสวมสิทธิ์แทนกัน กรุณาตรวจสอบว่าเปิด GPS/Location บนสมาร์ทโฟน และอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่ง โดยคุณต้องอยู่ห่างจากจุดกึ่งกลางสนามไม่เกิน ${systemSettings.gps_radius_meters} เมตร`
    },
    {
      q: isEn ? 'Is Pre-Confirmation mandatory, and what are its benefits?' : 'การยืนยันสิทธิ์ล่วงหน้า (Pre-Confirm) บังคับกดหรือไม่ และมีประโยชน์อย่างไร?',
      a: isEn
        ? `Pre-confirmation is NOT mandatory. It is an optional grace extension for users who anticipate arriving late (e.g. traffic or delays). Tapping confirm between T - ${systemSettings.pre_confirm_open_minutes} to T - ${systemSettings.pre_confirm_close_minutes} minutes before start extends your on-site check-in deadline to T + ${systemSettings.checkin_grace_minutes} min. If you do not pre-confirm, your reservation remains active under baseline schedule (T = 0 to T + ${systemSettings.checkin_baseline_grace_minutes} min) giving you adequate time to open the website and check in.`
        : `การกดยืนยันล่วงหน้า "ไม่บังคับกด" โดยเป็นสิทธิ์ผ่อนผันพิเศษสำหรับผู้ที่คาดว่าจะมาสาย เช่น รถติดหรือติดธุระ หากกดในช่วง T - ${systemSettings.pre_confirm_open_minutes} ถึง T - ${systemSettings.pre_confirm_close_minutes} นาที ระบบจะขยายเวลาเช็คอินหน้าสนามให้เป็นพิเศษถึง T + ${systemSettings.checkin_grace_minutes} นาที แต่หากไม่ได้กดยืนยัน การจองจะยังคงอยู่ตามปกติและได้รับเวลาผ่อนผันพื้นฐาน (T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที ตามที่แอดมินกำหนด) เพื่อให้มีเวลาเปิดเว็บสแกนเช็คอินหน้าสนามได้ทัน`
    },
    {
      q: isEn ? 'What happens if a booking drops/expires? Who gets the court?' : 'หากมีคนหลุดจองหรือไม่ได้มาเช็คอิน สิทธิ์สนามจะตกเป็นของใคร?',
      a: isEn
        ? 'When a reservation drops, the system handles it in 2 ways: 1) If there is a Waitlist queue, the slot is automatically transferred to Queue #1. 2) If there is NO Waitlist queue, the slot immediately switches to "Walk-in" status in the system, allowing players who are physically present at the venue without prior reservation to take the court and play.'
        : 'เมื่อมีผู้ไม่มารายงานตัวตามกำหนดและสิทธิ์สิ้นสุดลง (คนหลุด) ระบบจะดำเนินการ 2 รูปแบบ: 1) กรณีมีคิวรอ (Waitlist): ระบบจะโอนสิทธิ์ให้คิวรออันดับ 1 อัตโนมัติทันที 2) กรณีไม่มีคิวรอ: สล็อตในระบบจะขึ้นสถานะเป็น "วอล์คอิน (Walk-in)" เปิดโอกาสให้ผู้เล่นที่อยู่หน้าสนามจริงโดยไม่ได้จองล่วงหน้า สามารถรับสิทธิ์และเข้าใช้งานสนามได้ทันที'
    },
    {
      q: isEn ? 'How does the automated Waitlist queue work?' : 'ระบบคิวรอรับสิทธิ์ (Waitlist) ทำงานอย่างไร?',
      a: isEn
        ? 'When a slot is fully booked, you can tap "Join Waitlist". If the current booker cancels or fails to check in, Queue #1 is promoted to an active booking automatically and receives an in-app notification.'
        : 'หากสล็อตที่ต้องการเต็ม คุณสามารถกดปุ่ม "เข้าคิวรอ" ได้ หากผู้จองเดิมกดยกเลิก หรือไม่มาเช็คอินตามกำหนด ระบบจะเลื่อนคิวอันดับ 1 ขึ้นเป็นผู้จองจริงโดยอัตโนมัติ พร้อมส่งการแจ้งเตือนในแอป'
    },

    {
      q: isEn ? `What happens if I arrive past the late check-in grace period (T + ${systemSettings.checkin_grace_minutes} min)?` : `ถ้ามาสายเกินกำหนดเวลาผ่อนผันหลังเริ่มรอบเวลา (T + ${systemSettings.checkin_grace_minutes} นาที) จะเกิดอะไรขึ้น?`,
      a: isEn
        ? `Check-in is permitted up to the grace period configured by administrators (T + ${systemSettings.checkin_grace_minutes} min for pre-confirmed users, or T = 0 to T + ${systemSettings.checkin_baseline_grace_minutes} min for baseline). Arriving later transitions the booking to "MISSED" (No-Show) or cancelled, immediately initiating 2 outcomes: transferring to Waitlist #1, or releasing the slot for on-site Walk-in players if no waitlist exists.`
        : `ระบบอนุญาตให้สแกนเช็คอินหน้าสนามได้ไม่เกินเวลาผ่อนผัน (T + ${systemSettings.checkin_grace_minutes} นาที สำหรับผู้ที่ยืนยันสิทธิ์ล่วงหน้า หรือ T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที สำหรับเวลาพื้นฐาน ตามที่แอดมินกำหนด) หากเกินเวลานี้ การจองจะเปลี่ยนเป็นสถานะไม่มาใช้งาน (Missed / No-Show) หรือถูกยกเลิกทันที และระบบจะดำเนินการ 2 ทางเลือก: โอนสิทธิ์ให้คิวรอ (Waitlist) หรือหากไม่มีคิวรอ จะเปิดเป็น Walk-in หน้าสนามให้ผู้ที่อยู่ ณ สนามจริงใช้งานแทน`
    },
    {
      q: isEn ? 'How does payment confirmation work for fee-based courts?' : 'การชำระเงินและตรวจสอบสถานะสำหรับสนามที่มีค่าบำรุงรักษาทำอย่างไร?',
      a: isEn
        ? 'For fee-based facilities (such as Tennis courts or nighttime lighting), you have 15 minutes to scan and pay via PromptPay QR. Once payment is received, your booking is confirmed automatically and marked as "Paid" in My Bookings.'
        : 'สำหรับสนามที่มีค่าบำรุงรักษา (เช่น สนามเทนนิส หรือค่าไฟสปอร์ตไลท์ช่วงค่ำ) ระบบจะให้เวลาชำระเงินผ่าน PromptPay QR ภายใน 15 นาที เมื่อชำระสำเร็จ ระบบจะยืนยันการจองอัตโนมัติและแสดงสถานะ "ชำระแล้ว" ในเมนูการจองของฉันทันที'
    },
    {
      q: isEn ? 'What is the maximum number of active bookings allowed?' : 'จำกัดการจองสูงสุดกี่รายการพร้อมกัน?',
      a: isEn
        ? 'To maintain fairness across campus, each student/staff account can have at most 2 active reservations simultaneously. Once a session is checked in and completed, quota re-opens.'
        : 'เพื่อกระจายโอกาสให้นักศึกษาและบุคลากรทุกคน ระบบจำกัดให้ผู้ใช้ 1 ท่านมีรายการจองที่รอใช้งาน (Pending/Pre-confirmed) ได้สูงสุดไม่เกิน 2 รายการพร้อมกัน เมื่อใช้งานเสร็จสิ้นแล้วจึงจะสามารถจองรอบใหม่เพิ่มเติมได้'
    }
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [searchQuery, faqs]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 font-sans">
      {/* Hero Header */}
      <div 
        style={{ background: 'linear-gradient(135deg, #732c14 0%, #d95326 50%, #312e81 100%)' }}
        className="pt-8 pb-20 px-4 sm:px-6 rounded-b-[36px] shadow-xl relative overflow-hidden text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-2 border border-white/20">
                <Sparkles size={13} className="text-amber-300" />
                {isEn ? 'KKU SportPass Master Guide' : 'คู่มือการใช้งานระบบจองสนามกีฬา มข.'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isEn ? 'User Guide & Operating Rules' : 'คู่มือการใช้งาน & กฎระเบียบสนาม'}
              </h1>
              <p className="text-brand-100 text-sm mt-1 max-w-xl">
                {isEn 
                  ? 'Complete handbook: reservation steps, pre-confirmation rules, on-site GPS check-ins, and waitlist allocations.'
                  : 'เจาะลึกทุกขั้นตอน: การจองสล็อต, ไทม์ไลน์การยืนยันสิทธิ์, การสแกนเช็คอิน GPS และระบบคิวรออัตโนมัติ'}
              </p>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner shrink-0 self-start sm:self-auto">
              <BookOpen size={30} className="text-white" />
            </div>
          </div>

          {/* Quick Stat Highlights - Live from System Settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-brand-200 block text-[11px] font-medium">{isEn ? 'Advance Booking' : 'จองล่วงหน้าได้'}</span>
              <span className="font-extrabold text-sm sm:text-base text-white">
                {isEn ? `Up to ${systemSettings.max_advance_booking_days} Days` : `สูงสุด ${systemSettings.max_advance_booking_days} วัน`}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-brand-200 block text-[11px] font-medium">{isEn ? 'Simultaneous Quota' : 'โควตาพร้อมกัน'}</span>
              <span className="font-extrabold text-sm sm:text-base text-white">
                {isEn ? `${systemSettings.max_active_bookings_per_user} Active Slots` : `${systemSettings.max_active_bookings_per_user} รายการ/คน`}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-brand-200 block text-[11px] font-medium">{isEn ? 'Late Grace Request' : 'ขอยืดเวลาสาย'}</span>
              <span className="font-extrabold text-sm sm:text-base text-white">
                T - {systemSettings.pre_confirm_open_minutes}m
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-brand-200 block text-[11px] font-medium">{isEn ? 'GPS Radius' : 'ระยะ GPS สนาม'}</span>
              <span className="font-extrabold text-sm sm:text-base text-white">
                {isEn ? `Within ${systemSettings.gps_radius_meters}m` : `ไม่เกิน ${systemSettings.gps_radius_meters} เมตร`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        
        {/* Navigation Tabs - Responsive Grid so all 6 options are completely visible without clipping */}
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-md border border-gray-100 mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/20 scale-[1.02]' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-gray-50/70'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="leading-snug">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BOOKING STEPS */}
        {activeTab === 'booking' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-black text-xl">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Step 1: Sign in with KKU Account' : 'ขั้นตอนที่ 1: เข้าสู่ระบบยืนยันตัวตน'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Authentication ensures genuine student/staff facility access' : 'เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยขอนแก่นอย่างปลอดภัย'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {isEn 
                  ? 'You can sign in using your official KKU Google Workspace (@kkumail.com / @kku.ac.th) or via the KKU SSONext gateway. Guest users may browse facilities but must log in to reserve or join a waitlist.'
                  : 'เริ่มต้นด้วยการเข้าสู่ระบบผ่าน Google บัญชีมหาวิทยาลัย (@kkumail.com หรือ @kku.ac.th) หรือผ่านระบบ KKU SSONext หากยังไม่เข้าสู่ระบบจะสามารถดูข้อมูลสนามได้ แต่จะไม่สามารถกดจองหรือเข้าคิวรอได้'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">KKU Google Account</span>
                    <span className="text-[11px] text-gray-400">@kkumail.com / @kku.ac.th</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-brand-600 text-white p-3.5 rounded-xl shadow-xs shadow-brand-600/20">
                  <ShieldCheck size={24} />
                  <div>
                    <span className="font-bold text-xs block">KKU SSONext</span>
                    <span className="text-[11px] text-brand-200">{isEn ? 'Single Sign-On' : 'ยืนยันตัวตนอัตโนมัติ'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Step 2: Select Facility & Date' : 'ขั้นตอนที่ 2: เลือกสนามกีฬาและวันที่'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Browse all 21 courts across sports complexes' : 'ตรวจสอบสถานะเปิด-ปิด และความจุของแต่ละสนาม'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {isEn
                  ? 'On the Dashboard, filter by sport type (Badminton, Tennis, Football, Swimming, etc.). Select your desired reservation date (up to 7 days in advance).'
                  : 'ที่หน้า Dashboard คุณสามารถกรองประเภทกีฬา (แบดมินตัน, เทนนิส, ฟุตบอล, สระว่ายน้ำ ฯลฯ) จากนั้นกดเลือกสนามที่ต้องการและระบุวันที่ต้องการเข้าใช้งาน'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                  3
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Step 3: Understand 4-Tier Slot States' : 'ขั้นตอนที่ 3: ทำความเข้าใจสถานะช่องเวลา (4-Tier States)'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Clear color codes prevent booking confusion' : 'สีชัดเจน ไม่สับสน รู้ทันทีว่าช่องไหนว่าง จองแล้ว หรือหมดเวลา'}</p>
                </div>
              </div>

              {/* Interactive Visual Demonstration of Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-gray-800">17:00 น.</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 block mb-2">{isEn ? 'Available (1/1)' : 'ว่าง (1/1)'}</span>
                  <div className="text-[11px] text-gray-500 bg-emerald-50/50 p-2 rounded-lg flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                    <span><strong>{isEn ? 'Available:' : 'สถานะว่าง:'}</strong> {isEn ? 'Click to book immediately.' : 'สามารถคลิกเพื่อยืนยันการจองได้ทันที'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-brand-50 border-2 border-brand-500 text-brand-900 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-brand-800">18:00 น.</span>
                    <span className="text-[10px] font-extrabold bg-brand-600 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Check size={10} strokeWidth={3} /> {isEn ? 'Your Booking' : 'สิทธิ์ของคุณ'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-brand-700 block mb-2">{isEn ? 'Booked by You' : 'คุณเป็นผู้จองสล็อตนี้'}</span>
                  <div className="text-[11px] text-brand-700 bg-white/70 p-2 rounded-lg flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1" />
                    <span><strong>{isEn ? 'Your Pass:' : 'สิทธิ์ของคุณ:'}</strong> {isEn ? 'Shows View Pass CTA. No waitlist duplicate.' : 'มีปุ่ม "ดูบัตรคอร์ท" ไม่แสดงปุ่มเข้าคิวซ้ำซ้อน'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800">19:00 น.</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{isEn ? 'Full' : 'เต็ม'}</span>
                  </div>
                  <span className="text-xs text-slate-500 block mb-2">{isEn ? 'Waitlist (2 waiting)' : 'มีคนรอคิว 2 คน'}</span>
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-1" />
                    <span><strong>{isEn ? 'Full/Waitlist:' : 'เต็ม (เข้าคิวรอ):'}</strong> {isEn ? 'Join queue for automated promotion.' : 'สามารถกดเข้าคิวรอรับสิทธิ์ได้'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-100/70 border border-gray-200 text-gray-400 opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm line-through">09:00 น.</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">{isEn ? 'Time Passed' : 'หมดช่วงเวลา'}</span>
                  </div>
                  <span className="text-xs block mb-2">{isEn ? 'Disabled slot' : 'สล็อตที่ผ่านเวลาไปแล้ว'}</span>
                  <div className="text-[11px] text-gray-500 bg-white/50 p-2 rounded-lg flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1" />
                    <span><strong>{isEn ? 'Past / Closed:' : 'หมดเวลา/ปิด:'}</strong> {isEn ? 'Disabled, cannot be clicked.' : 'สีเทาจาง ล็อกไม่ให้คลิก เพื่อรักษา Layout'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 p-4 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-brand-600 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-900 leading-relaxed">
                  <strong>{isEn ? 'Seamless Navigation:' : 'การนำทางอัตโนมัติ:'}</strong> {isEn 
                    ? 'When you confirm a booking, you are immediately routed to your digital ticket in My Bookings, complete with booking code and countdown timer.'
                    : 'เมื่อกดจองสำเร็จ ระบบจะนำทางอัตโนมัติไปยังหน้าบัตรคอร์ทของคุณทันที พร้อมแสดงรหัสการจองและตัวนับเวลาถอยหลัง'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: TIMING RULES & CHECK-IN */}
        {activeTab === 'timing' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
                  <Timer size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Pre-Confirmation & Check-In Rules' : 'กฎเวลาการยืนยันสิทธิ์ & เช็คอินหน้าสนาม'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Understand grace extensions (Pre-Confirm) vs. baseline check-in deadlines' : 'เข้าใจความแตกต่างระหว่างสิทธิ์ผ่อนผันเวลา (Pre-confirm) และสิทธิ์ตามเวลาพื้นฐาน (Baseline)'}</p>
                </div>
              </div>

              {/* Explanatory Policy Banner */}
              <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 leading-relaxed space-y-1">
                  <p className="font-bold">
                    {isEn 
                      ? 'Pre-confirmation is completely OPTIONAL — designed for traffic delays or schedule conflicts:'
                      : 'การกดยืนยันสิทธิ์ล่วงหน้า (Pre-Confirm) "ไม่บังคับกด" — ออกแบบมาสำหรับกรณีรถติดหรือเดินทางมาสาย:'}
                  </p>
                  <p>
                    {isEn
                      ? `• Pre-confirmed Users: Earn an extended grace period up to T + ${systemSettings.checkin_grace_minutes} min to scan QR on-site without losing the court.`
                      : `• ผู้ที่กดยืนยันล่วงหน้า: จะได้รับสิทธิ์ผ่อนผันขยายเวลามาสายได้จนถึง T + ${systemSettings.checkin_grace_minutes} นาที เพื่อเดินทางมาสแกน QR ที่สนามจริง`}
                  </p>
                  <p>
                    {isEn
                      ? `• Non-Preconfirmed Users: Reservation remains active! Held to baseline start time (T = 0 to T + ${systemSettings.checkin_baseline_grace_minutes} min), and can check in on-site or early.`
                      : `• ผู้ที่ไม่ได้กดยืนยันล่วงหน้า: สิทธิ์การจองยังคงอยู่ตามปกติ! ได้รับสิทธิ์ตามเวลาพื้นฐาน (T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที) และสามารถสแกนเช็คอินล่วงหน้าหรือตรงเวลาได้`}
                  </p>
                </div>

                {/* Live System Timing Settings Dashboard Card */}
                <div className="mt-4 p-4 sm:p-5 bg-gradient-to-br from-brand-50/90 via-blue-50/70 to-indigo-50/50 rounded-2xl border-2 border-brand-300 text-xs text-brand-950 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-brand-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-extrabold text-sm text-brand-900 flex items-center gap-1.5">
                        <Timer size={16} className="text-brand-600" />
                        {isEn ? 'Live System Timing Settings (Configured by Administrator)' : 'ค่ากำหนดเวลาปัจจุบันในระบบ (ดึงข้อมูลสดที่แอดมินตั้งค่าไว้)'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-extrabold bg-brand-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={10} /> {isEn ? 'Active Policy' : 'ใช้งานจริงขณะนี้'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-3 bg-white/95 rounded-xl border border-brand-100 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-gray-500 font-medium block text-[11px]">{isEn ? 'Pre-Confirmation Opens' : 'เปิดให้กดยืนยันขอผ่อนผันเวลา'}</span>
                        <strong className="text-brand-900 text-xs">Stage 1</strong>
                      </div>
                      <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        T - {systemSettings.pre_confirm_open_minutes} นาที
                      </span>
                    </div>

                    <div className="p-3 bg-white/95 rounded-xl border border-brand-100 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-gray-500 font-medium block text-[11px]">{isEn ? 'Pre-Confirmation Closes' : 'สิ้นสุดการกดยืนยันสิทธิ์'}</span>
                        <strong className="text-brand-900 text-xs">Stage 2</strong>
                      </div>
                      <span className="font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        T - {systemSettings.pre_confirm_close_minutes} นาที
                      </span>
                    </div>

                    <div className="p-3 bg-white/95 rounded-xl border border-brand-100 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-gray-500 font-medium block text-[11px]">{isEn ? 'Baseline Check-in Window' : 'เวลาเช็คอินพื้นฐาน (ไม่ยืนยัน)'}</span>
                        <strong className="text-brand-900 text-xs">Stage 3</strong>
                      </div>
                      <span className="font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                        T = 0 ถึง T + {systemSettings.checkin_baseline_grace_minutes} นาที
                      </span>
                    </div>

                    <div className="p-3 bg-white/95 rounded-xl border border-brand-100 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-gray-500 font-medium block text-[11px]">{isEn ? 'Extended Grace Deadline' : 'เช็คอินสายสูงสุด (กดยืนยันแล้ว)'}</span>
                        <strong className="text-brand-900 text-xs">Stage 4</strong>
                      </div>
                      <span className="font-extrabold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                        T + {systemSettings.checkin_grace_minutes} นาที
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-brand-150 flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-800">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} className="text-brand-600" />
                      {isEn ? `Early check-in opens: T - ${systemSettings.checkin_early_minutes} min prior` : `เช็คอินล่วงหน้าได้ตั้งแต่: T - ${systemSettings.checkin_early_minutes} นาทีก่อนเริ่ม`}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {isEn ? '* Values update dynamically when changed in Admin Settings' : '* ตัวเลขจะปรับเปลี่ยนอัตโนมัติตามที่แอดมินตั้งค่าไว้ในระบบ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Infographic Timeline */}
              <div className="relative border-l-4 border-brand-200 ml-4 pl-6 space-y-8 my-8">
                
                {/* Stage 1: T - ... นาที */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                    1
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-amber-700 uppercase tracking-wide bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        T - {systemSettings.pre_confirm_open_minutes} นาที (ก่อนเริ่มรอบ)
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                        {isEn ? `Live: T - ${systemSettings.pre_confirm_open_minutes} min` : `ค่าแอดมินตั้งไว้: ${systemSettings.pre_confirm_open_minutes} นาที`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900 mt-1.5">
                      {isEn 
                        ? `Pre-Confirmation Opens (${systemSettings.pre_confirm_open_minutes} min prior)` 
                        : `เปิดให้กดยืนยันขอผ่อนผันเวลา (${systemSettings.pre_confirm_open_minutes} นาทีก่อนเริ่มรอบ)`}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {isEn 
                        ? `If you are stuck in traffic or running slightly late, open "My Bookings" and tap "Confirm Attendance". System allows pre-confirming starting ${systemSettings.pre_confirm_open_minutes} minutes before start time.`
                        : `หากคุณติดธุระ รถติด หรือคาดว่าจะเดินทางมาหน้าสนามสาย ให้กดปุ่ม "ยืนยันขอผ่อนผันเวลา" ในเมนู "การจองของฉัน" ระบบเปิดให้กดยืนยันได้ตั้งแต่ ${systemSettings.pre_confirm_open_minutes} นาทีก่อนเริ่มรอบ`}
                    </p>
                  </div>
                </div>

                {/* Stage 2: T - ... นาที */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                    2
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-wide bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                        T - {systemSettings.pre_confirm_close_minutes} นาที (สิ้นสุดช่วงขอยืดหยุ่นเวลา)
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-300">
                        {isEn ? `Live: T - ${systemSettings.pre_confirm_close_minutes} min` : `ค่าแอดมินตั้งไว้: ${systemSettings.pre_confirm_close_minutes} นาที`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900 mt-1.5">
                      {isEn 
                        ? `Pre-Confirm Window Closes (${systemSettings.pre_confirm_close_minutes} min prior)` 
                        : `ปิดรับการขอยืดหยุ่นเวลา (${systemSettings.pre_confirm_close_minutes} นาทีก่อนเริ่มรอบ)`}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {isEn 
                        ? `If you did not pre-confirm before this ${systemSettings.pre_confirm_close_minutes}-minute cutoff, your reservation is NOT cancelled! You simply remain on the baseline schedule and can check in between T = 0 to T + ${systemSettings.checkin_baseline_grace_minutes} min.`
                        : `ผู้ที่ไม่ได้กดยืนยันก่อนเส้นตาย ${systemSettings.pre_confirm_close_minutes} นาทีนี้ การจองจะยังคงอยู่ ไม่ถูกยกเลิก! เพียงแต่จะได้รับสิทธิ์ตามเวลาพื้นฐานตรงๆ (ต้องมารายงานตัวที่สนามภายในช่วง T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที)`}
                    </p>
                  </div>
                </div>

                {/* Stage 3: T = 0 ถึง T + ... นาที */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                    T
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-brand-700 uppercase tracking-wide bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                        T = 0 ถึง T + {systemSettings.checkin_baseline_grace_minutes} นาที (ช่วงเวลาเช็คอินพื้นฐาน)
                      </span>
                      <span className="text-[10px] font-extrabold text-brand-900 bg-brand-100/90 px-2 py-0.5 rounded-full border border-brand-300">
                        {isEn ? `Live: +${systemSettings.checkin_baseline_grace_minutes} min` : `ค่าแอดมินตั้งไว้: ผ่อนผัน ${systemSettings.checkin_baseline_grace_minutes} นาที`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900 mt-1.5">
                      {isEn ? 'Session Starts & Baseline Check-In Window' : 'เริ่มรอบเวลาเข้าใช้งาน & เปิดรายงานตัวเช็คอิน'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {isEn 
                        ? `Arrive at the physical court and open "Scan" to verify attendance with QR + GPS. You may also check in early starting T - ${systemSettings.checkin_early_minutes} minutes prior to start time.`
                        : `เดินทางถึงสนามจริงและเปิดเมนู "สแกน" เพื่อเช็คอิน QR + พิกัด GPS (สามารถสแกนเช็คอินก่อนเวลาได้สูงสุด ${systemSettings.checkin_early_minutes} นาทีก่อนเริ่มรอบ)`}
                    </p>
                    <div className="mt-2 text-[11px] text-brand-900 bg-brand-50/80 border border-brand-200 p-2.5 rounded-xl font-medium">
                      {isEn
                        ? `Baseline Grace Window: Non-preconfirmed bookings are granted a ${systemSettings.checkin_baseline_grace_minutes}-minute grace period (T = 0 up to T + ${systemSettings.checkin_baseline_grace_minutes} min) to open the app and scan on-site without instant cutoff.`
                        : `สำคัญ: สำหรับผู้ที่ไม่ได้กดยืนยันล่วงหน้า ระบบให้เวลาผ่อนผันพื้นฐาน ${systemSettings.checkin_baseline_grace_minutes} นาทีแรก (T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที) เพื่อให้มีเวลาเข้าเว็บและสแกนเช็คอินหน้าสนามได้ทัน ไม่ถูกตัดสิทธิ์กระทันหัน`}
                    </div>
                    
                    {/* 2 Outcomes when dropped */}
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-950 font-medium space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Sparkles size={14} className="text-amber-600 shrink-0" />
                        <span>{isEn ? 'When a reservation expires (No-Show Drop), 2 outcomes apply:' : 'เมื่อพ้นกำหนดเช็คอินและสิทธิ์สิ้นสุดลง (คนหลุด) ระบบจะดำเนินการ 2 รูปแบบ:'}</span>
                      </div>
                      <div className="pl-4 space-y-1 text-[11px] leading-relaxed">
                        <div>
                          <strong>{isEn ? '1. If Waitlist Queue exists:' : '1. กรณีมีคิวรอ (Waitlist):'}</strong>{' '}
                          {isEn ? 'The slot is automatically and instantly transferred to Waitlist Queue #1.' : 'ระบบจะโอนสิทธิ์ให้คิวรอ (Waitlist) ลำดับถัดไปโดยอัตโนมัติทันที'}
                        </div>
                        <div>
                          <strong>{isEn ? '2. If NO Waitlist exists:' : '2. กรณีไม่มีคิวรอ:'}</strong>{' '}
                          {isEn ? 'The system flags the slot as "Walk-in", allowing players present at the venue without prior booking to walk in and play immediately.' : 'ในระบบจะขึ้นสถานะเป็น "วอล์คอิน (Walk-in)" เปิดโอกาสให้ผู้ที่อยู่หน้าสนามจริงโดยไม่ได้จองล่วงหน้า สามารถขอรับสิทธิ์เข้าใช้งานสนามได้ทันที'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage 4: T + ... นาที */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                    4
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-purple-700 uppercase tracking-wide bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                        T + {systemSettings.checkin_grace_minutes} นาที (เส้นตายเช็คอินสาย สำหรับผู้ที่ยืนยันสิทธิ์)
                      </span>
                      <span className="text-[10px] font-extrabold text-purple-900 bg-purple-100/90 px-2 py-0.5 rounded-full border border-purple-300">
                        {isEn ? `Live: T + ${systemSettings.checkin_grace_minutes} min` : `ค่าแอดมินตั้งไว้: ${systemSettings.checkin_grace_minutes} นาที`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900 mt-1.5">
                      {isEn 
                        ? `Extended Grace Period Closes (T + ${systemSettings.checkin_grace_minutes} min)` 
                        : `สิ้นสุดระยะผ่อนผันเช็คอินสาย (T + ${systemSettings.checkin_grace_minutes} นาที No-Show หลุดจอง)`}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {isEn 
                        ? `Pre-confirmed users have until T + ${systemSettings.checkin_grace_minutes} minutes to scan QR on-site. Past this deadline, the reservation becomes No-Show (MISSED) and is offered to Waitlist or Walk-in.`
                        : `สำหรับผู้ที่กดยืนยันขอผ่อนผันเวลาไว้ล่วงหน้า (กรณีรถติด/ติดธุระ) จะสามารถมาสายและสแกนเช็คอินได้จนถึงเวลา T + ${systemSettings.checkin_grace_minutes} นาที หากเกินกำหนด ระบบจะปรับเป็น No-Show (Missed) และปล่อยสนามให้ผู้รอคิวหรือ Walk-in หน้าสนามทันที`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
                  <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
                    {isEn ? 'Option A: Pre-Confirmed' : 'แบบที่ 1: กดยืนยันล่วงหน้า (Pre-confirmed)'}
                  </span>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    {isEn
                      ? `Best for traffic or delays. Grants extended grace period up to T + ${systemSettings.checkin_grace_minutes} min to scan QR at court.`
                      : `เหมาะสำหรับผู้ที่คาดว่าจะมาสาย (รถติด/ติดธุระ) ได้รับสิทธิ์ขยายเวลาเช็คอินหน้าสนามเป็น T + ${systemSettings.checkin_grace_minutes} นาที (ตามที่แอดมินกำหนด)`}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    {isEn ? 'Option B: Baseline Time (Not Confirmed)' : 'แบบที่ 2: ไม่ได้กดยืนยัน (เวลาพื้นฐาน)'}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {isEn
                      ? `No pre-confirmation required. You get baseline check-in time (T = 0 up to T + ${systemSettings.checkin_baseline_grace_minutes} min per admin settings) giving you time to open the web and scan QR on-site.`
                      : `ไม่ต้องกดอะไรล่วงหน้า ได้รับสิทธิ์เช็คอินตามเวลาพื้นฐาน T = 0 ถึง T + ${systemSettings.checkin_baseline_grace_minutes} นาที (ตามที่แอดมินกำหนด เพื่อให้มีเวลาเปิดเว็บสแกนเช็คอินหน้าสนาม)`}
                  </p>
                </div>
              </div>


              {/* Geofencing Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
                  <Navigation size={18} className="text-brand-600" />
                  <span>{isEn ? 'Static Court QR & GPS On-Site Verification:' : 'ป้าย QR ประจำสนาม & การตรวจวัดระยะ GPS หน้าสนามจริง:'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isEn 
                    ? `Court posters feature static QR codes that do not rotate. The system relies primarily on real on-site GPS geofencing (within ${systemSettings.gps_radius_meters} meters of the court boundary) as the primary security check to verify your physical presence. Please enable GPS and allow location access on your browser.`
                    : `ป้าย QR Code ประจำสนามเป็นป้ายแบบคงที่ (Static) โดยจะไม่มีการหมุนเวียนรหัสตรวจสอบ ระบบจึงใช้ "การตรวจวัดระยะพิกัด GPS หน้าสนามจริง" (ไม่เกิน ${systemSettings.gps_radius_meters} เมตรจากจุดกึ่งกลางสนาม) เป็นหลักสำคัญในการยืนยันตัวตน เพื่อป้องกันการสแกนสวมสิทธิ์แทนกัน กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่งบนเบราว์เซอร์มือถือขณะสแกน`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: WAITLIST AUTOMATION */}
        {activeTab === 'waitlist' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Automated Waitlist Queue System' : 'ระบบคิวรอรับสิทธิ์อัตโนมัติ (Waitlist Automation)'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Seamlessly integrated with core timing rules & dropped slot outcomes' : 'เชื่อมโยงกับระบบกฎเวลาหลักและสิทธิ์การเข้าใช้งานอย่างสมบูรณ์แบบ'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{isEn ? 'Join Waitlist' : 'กดเข้าคิวรอ'}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {isEn ? 'When a preferred time is full, tap "Join Waitlist". Your queue position is recorded transparently in chronological order.' : 'เมื่อรอบเวลาที่ต้องการเต็ม สามารถกดปุ่ม "เข้าคิวรอ" ได้ โดยระบบจะออกลำดับคิวให้อย่างโปร่งใสตามลำดับก่อน-หลัง'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{isEn ? 'Core Rule Auto-Promotion' : 'เลื่อนคิวอัตโนมัติเมื่อหลุดจอง'}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {isEn 
                      ? `If the host cancels or fails to check in before the grace deadline (T + ${systemSettings.checkin_baseline_grace_minutes} min for baseline, or T + ${systemSettings.checkin_grace_minutes} min for pre-confirmed), Queue #1 is automatically promoted to the active booking.` 
                      : `หากผู้จองเดิมกดยกเลิก หรือไม่มารายงานตัวเช็คอินภายในเวลาผ่อนผัน (เกิน T + ${systemSettings.checkin_baseline_grace_minutes} นาทีสำหรับเวลาพื้นฐาน หรือเกิน T + ${systemSettings.checkin_grace_minutes} นาทีสำหรับผู้ยืนยันสิทธิ์) ระบบจะตัดสิทธิ์และเลื่อนคิวอันดับ 1 ขึ้นเป็นผู้จองทันที`}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{isEn ? 'Instant Alert & On-Site Play' : 'รับการแจ้งเตือน & เช็คอิน'}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {isEn ? 'You receive an instant notification in the app. Simply open the app and scan the on-site QR code with GPS verification to play.' : 'คุณจะได้รับการแจ้งเตือน (In-App Notification) ทันที และสามารถเปิดระบบเพื่อสแกน QR Code พร้อมตรวจพิกัด GPS หน้าสนามเพื่อเข้าใช้งานได้ทันที'}
                  </p>
                </div>
              </div>

              {/* Dropped outcomes fallback */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl mb-4">
                <h4 className="font-bold text-xs text-indigo-900 mb-1">
                  {isEn ? 'Handoff Policy: Waitlist vs Walk-in' : 'การส่งต่อสิทธิ์: คิวรอ (Waitlist) กับ วอล์คอินหน้าสนาม (Walk-in)'}
                </h4>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  {isEn
                    ? 'When a reservation drops, the system prioritizes the Waitlist first. Only when NO waitlist candidates exist will the slot open for physical on-site Walk-in players.'
                    : 'เมื่อสล็อตเวลาหลุดจอง ระบบจะให้สิทธิ์แก่ "ผู้รอคิว (Waitlist)" เป็นลำดับแรกเสมอ หากไม่มีคิวรอในระบบ สล็อตจะเปลี่ยนเป็น "Walk-in หน้าสนาม" ให้ผู้เล่นที่อยู่ ณ สนามจริงสามารถกดรับสิทธิ์ได้ทันที'}
                </p>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">{isEn ? 'Waitlist Rules to Keep in Mind:' : 'กติกาการรอคิวที่ควรรู้:'}</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    <li>{isEn ? 'You cannot join a waitlist for a slot you already booked.' : 'ระบบป้องกันไม่ให้เข้าคิวรอในสล็อตที่ตนเองเป็นผู้จองอยู่แล้ว'}</li>
                    <li>{isEn ? 'You can cancel your waitlist position anytime in My Bookings without penalty.' : 'สามารถกดยกเลิกการรอคิวได้ตลอดเวลาในหน้า "การจองของฉัน" โดยไม่มีผลกระทบต่อประวัติ'}</li>
                    <li>{isEn ? 'Pre-confirmation (T - 10 to T - 5) is optional and does not drop reservations or trigger waitlists prematurely.' : 'ช่วงเวลายืนยันสิทธิ์ล่วงหน้าเป็นทางเลือกผ่อนผันเวลาเช็คอิน ไม่มีการตัดสิทธิ์ที่ T-5 เพื่อให้ผู้จองเดินทางมาใช้สิทธิ์ได้จริง'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: PAYMENT */}
        {activeTab === 'payment' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Facility Rates & Payment' : 'อัตราค่าบำรุงรักษา & การชำระเงิน'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Automated PromptPay EMVCo QR and instant booking confirmation' : 'ชำระสะดวกรวดเร็วผ่าน PromptPay QR พร้อมยืนยันการจองอัตโนมัติ'}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 font-bold">
                    15m
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{isEn ? '15-Minute Checkout Window' : 'หน้าต่างชำระเงิน 15 นาที'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {isEn 
                        ? 'For facilities requiring maintenance fees (e.g. Tennis courts, Swimming pool), you have 15 minutes to complete PromptPay QR checkout. Unpaid bookings expire automatically.'
                        : 'สำหรับสนามที่มีค่าบำรุงรักษา (เช่น สนามเทนนิส, สระว่ายน้ำ) ระบบจะล็อกสล็อตไว้ให้ 15 นาที หากไม่ชำระเงินภายในเวลา ระบบจะยกเลิกการจองและคืนสล็อตให้อัตโนมัติ'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{isEn ? 'Automated Verification & Status Tracking' : 'ตรวจสอบยอดเงินและยืนยันการจองอัตโนมัติ'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {isEn 
                        ? 'When your PromptPay transfer is completed, the system detects it and instantly confirms your booking. You can check the payment status directly under "My Bookings".'
                        : 'เมื่อทำรายการโอนผ่าน PromptPay เรียบร้อย ระบบจะตรวจจับและอัปเดตสถานะเป็น "ชำระแล้ว" พร้อมยืนยันการจองอัตโนมัติ โดยสามารถตรวจสอบประวัติได้ในเมนู "การจองของฉัน"'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: RULES & FAIR PLAY */}
        {activeTab === 'rules' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{isEn ? 'Fair-Play Policies & Campus Regulations' : 'กฎกติกาการใช้งาน & มารยาทในการจองสนาม'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Designed to keep athletic facilities fair and accessible' : 'เพื่อให้เกิดความเป็นธรรมและจัดสรรทรัพยากรสนามกีฬาอย่างคุ้มค่า'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                    <Ban size={18} />
                    <span>{isEn ? 'Prevent Ghost Bookings' : 'ห้ามจองกั๊กสิทธิ์ (No-Show)'}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isEn 
                      ? 'Do not reserve peak-hour slots if you are unsure of playing. If your plans change, cancel at least 30 minutes in advance so others can play.'
                      : 'ไม่ควรจองช่วงเวลา Prime-time ไว้ล่วงหน้าหากไม่แน่ใจว่าจะมาเล่นได้จริง หากติดธุระกรุณากดยกเลิกการจองล่วงหน้าอย่างน้อย 30 นาที เพื่อเปิดโอกาสให้เพื่อนๆ คนอื่น'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                    <Smartphone size={18} />
                    <span>{isEn ? 'Static Court QR & GPS Verification' : 'ป้าย QR คงที่ & การตรวจวัดระยะ GPS หน้าสนาม'}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isEn 
                      ? 'Court QR code posters are static and do not rotate codes. System security relies primarily on real on-site GPS distance verification to prevent off-site check-in or proxy scans.'
                      : 'ป้าย QR Code ประจำสนามเป็นป้ายแบบคงที่ (Static) ไม่หมุนเวียนรหัสตรวจสอบ แต่ระบบจะตรวจสอบความถูกต้องผ่านการตรวจวัดระยะ GPS หน้าสนามจริงเป็นหลักสำคัญ เพื่อป้องกันการส่งต่อภาพแคปหน้าจอหรือสแกนจากที่อื่น'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    <Users size={18} />
                    <span>{isEn ? 'Active Quota Limit' : 'จำกัด 2 รายการพร้อมกัน'}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isEn 
                      ? 'Each user can have up to 2 active future reservations at any time across all KKU sports facilities.'
                      : 'ผู้ใช้แต่ละคนสามารถมีรายการจองที่รอใช้งานอยู่ได้ไม่เกิน 2 รายการพร้อมกัน เพื่อป้องกันการผูกขาดสนาม'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 size={18} />
                    <span>{isEn ? 'Proper Athletic Attire' : 'การแต่งกายที่เหมาะสม'}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isEn 
                      ? 'Please wear proper non-marking sports shoes and athletic clothing to protect court surfaces.'
                      : 'กรุณาสวมใส่รองเท้ากีฬาพื้นยาง (Non-marking) และชุดกีฬาที่เหมาะสม เพื่อรักษาพื้นผิวของสนามกีฬา'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: FAQ & SEARCH */}
        {activeTab === 'faq' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{isEn ? 'Frequently Asked Questions (FAQs)' : 'คำถามที่พบบ่อย & แก้ไขปัญหา'}</h2>
                    <p className="text-xs text-gray-500">{isEn ? 'Quick answers to common issues and troubleshooting' : 'คำตอบสำหรับข้อสงสัยและปัญหาที่พบบ่อย'}</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isEn ? 'Search FAQ...' : 'ค้นหาคำถาม...'}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <HelpCircle size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{isEn ? 'No questions matched your search.' : 'ไม่พบคำถามที่ตรงกับคำค้นหา'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div 
                        key={idx} 
                        className="border border-gray-200 rounded-2xl overflow-hidden transition-all bg-white shadow-2xs"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-sm text-gray-800 hover:bg-slate-50/70 transition"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-xs flex items-center justify-center shrink-0">
                              Q
                            </span>
                            {faq.q}
                          </span>
                          <ChevronDown 
                            size={18} 
                            className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-brand-600' : ''}`} 
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-slate-50/50">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Bottom Bar */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-brand-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>{isEn ? 'Ready to Book? Go to Dashboard' : 'เข้าใจแล้ว พร้อมจองสนามเลย'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
