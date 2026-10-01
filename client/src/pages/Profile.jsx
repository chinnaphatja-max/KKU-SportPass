import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, Mail, Phone, Save, AlertCircle, CheckCircle2, KeyRound, 
  Eye, EyeOff, Camera, ShieldCheck, Bell, Globe, 
  ChevronDown, ChevronUp, LogOut, Building2, CreditCard, Sparkles,
  GraduationCap, Briefcase, Info, Check, HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { 
  KKU_FACULTY_MAP, 
  KKU_FACULTY_OPTIONS, 
  formatKKUStudentId, 
  parseKKUStudentId 
} from '../utils/kkuStudentId';

export default function Profile({ user, onProfileUpdate, onLogout }) {
  const { t, language, setLanguage } = useLanguage();
  const fileInputRef = useRef(null);

  // Profile State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    user_type: '',
    faculty: '',
    student_id: '',
    avatar_url: ''
  });

  // Password Accordion State
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // KKU ID Guide Accordion
  const [isIdGuideOpen, setIsIdGuideOpen] = useState(false);

  // Notification Preferences State
  const [notif15m, setNotif15m] = useState(() => {
    return localStorage.getItem('kku_notif_15m') !== 'false';
  });
  const [notifWaitlist, setNotifWaitlist] = useState(() => {
    return localStorage.getItem('kku_notif_waitlist') !== 'false';
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Ensure documentElement never has dark class
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('kku_theme');
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user/profile');
      if (res.data.user) {
        setProfile(res.data.user);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live parsed information of KKU Student ID
  const parsedStudentId = useMemo(() => {
    return parseKKUStudentId(profile.student_id);
  }, [profile.student_id]);

  // Handle Student ID Input with auto-format and auto-faculty match
  const handleStudentIdChange = (e) => {
    const formatted = formatKKUStudentId(e.target.value);
    const parsed = parseKKUStudentId(formatted);

    setProfile(prev => {
      const next = { ...prev, student_id: formatted };
      // Auto sync faculty if detected and not already customized by user
      if (parsed?.faculty && (!prev.faculty || prev.faculty === '')) {
        const matchedOption = KKU_FACULTY_OPTIONS.find(opt => 
          opt.startsWith(parsed.faculty.code) || 
          opt.includes(parsed.faculty.name_th) || 
          (parsed.faculty.legacy_th && opt.includes(parsed.faculty.legacy_th))
        );
        if (matchedOption) {
          next.faculty = matchedOption;
        }
      }
      return next;
    });
  };

  // Avatar Image Upload
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ขนาดรูปภาพต้องไม่เกิน 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, avatar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Notification Preference Toggles
  const handleToggleNotif15m = () => {
    const nextVal = !notif15m;
    setNotif15m(nextVal);
    localStorage.setItem('kku_notif_15m', String(nextVal));
  };

  const handleToggleNotifWaitlist = () => {
    const nextVal = !notifWaitlist;
    setNotifWaitlist(nextVal);
    localStorage.setItem('kku_notif_waitlist', String(nextVal));
  };

  // Password Strength Calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, text: 'รหัสผ่านอ่อน (Weak)', color: 'bg-rose-500', barColor: 'text-rose-600' };
    if (score <= 3) return { score: 2, text: 'รหัสผ่านปานกลาง (Medium)', color: 'bg-amber-500', barColor: 'text-amber-600' };
    return { score: 3, text: 'รหัสผ่านปลอดภัย (Strong)', color: 'bg-emerald-500', barColor: 'text-emerald-600' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  // Submit Profile Changes
  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' });
        return;
      }
      if (newPassword.length < 6) {
        setMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        faculty: profile.faculty,
        student_id: profile.student_id,
        avatar_url: profile.avatar_url
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await axios.put('/api/user/profile', payload);
      setMessage({ type: 'success', text: res.data.message || 'บันทึกข้อมูลเรียบร้อยแล้ว' });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordOpen(false);

      if (onProfileUpdate && res.data.user) {
        onProfileUpdate(res.data.user);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
      setSaving(false);
    }
  };

  // Logout Handler
  const handleLogoutClick = async () => {
    if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      if (onLogout) {
        onLogout();
      } else {
        try {
          await axios.post('/api/auth/logout');
          window.location.href = '/login';
        } catch (err) {
          window.location.href = '/login';
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-gray-500">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3"></div>
        <span className="text-sm font-bold text-gray-600">กำลังโหลดข้อมูลโปรไฟล์...</span>
      </div>
    );
  }

  const isStudent = profile.user_type === 'student';
  const isStaff = profile.user_type === 'staff';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 font-sans pb-32">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200">
        
        {/* ==================================================================== */}
        {/* 1. Header Profile Avatar with Camera Overlay & Identification        */}
        {/* ==================================================================== */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-gray-200 mb-6">
          {/* Avatar with Camera Icon Overlay */}
          <div className="relative group shrink-0">
            <div className="p-1 rounded-2xl bg-gradient-to-tr from-brand-500 via-amber-500 to-rose-500 shadow-sm">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile Avatar" 
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border-2 border-white" 
                />
              ) : (
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-3xl font-black border-2 border-white shadow-inner">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            
            {/* Camera Upload Overlay Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md border-2 border-white transition transform hover:scale-105 active:scale-95"
              title="เปลี่ยนรูปโปรไฟล์ (สูงสุด 2MB)"
            >
              <Camera size={14} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {profile.name || 'ผู้ใช้งาน KKU SportPass'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 font-mono mt-0.5 font-semibold">
              {profile.email}
            </p>
            
            {/* User Category Badges */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border ${
                isStudent 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isStaff
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-orange-50 text-brand-800 border-orange-200'
              }`}>
                {isStudent ? (
                  <>
                    <GraduationCap size={15} className="text-emerald-700" />
                    <span>นักศึกษา มข.</span>
                  </>
                ) : isStaff ? (
                  <>
                    <Briefcase size={15} className="text-blue-700" />
                    <span>บุคลากร มข.</span>
                  </>
                ) : (
                  <>
                    <Globe size={15} className="text-brand-700" />
                    <span>บุคคลภายนอก</span>
                  </>
                )}
              </span>

              <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl border border-gray-200">
                สิทธิ์: {profile.role}
              </span>

              {profile.faculty && (
                <span className="px-2.5 py-1 bg-orange-50 text-brand-800 text-xs font-semibold rounded-xl border border-orange-200 truncate max-w-[240px]">
                  {profile.faculty.split('(')[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. Account Status & Booking Quota Standing (Clean Light Mode)        */}
        {/* ==================================================================== */}
        <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-600">สถานะบัญชีการจอง</div>
              <div className="text-sm font-black text-emerald-700 flex items-center gap-2 mt-0.5">
                <span>สิทธิ์การจอง: ปกติ</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-orange-200 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-brand-700 flex items-center justify-center shrink-0 border border-orange-200">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-600">การผิดนัด (No-Show Penalties)</div>
              <div className="text-sm font-black text-gray-900 mt-0.5">
                0 / 3 ครั้ง <span className="text-xs font-bold text-emerald-700">(ไม่ติดโทษแบน)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {message.text && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold mb-6 flex items-center gap-2.5 border shadow-2xs ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="shrink-0 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          
          {/* ==================================================================== */}
          {/* 3. Personal & University Information                                 */}
          {/* ==================================================================== */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <User size={18} className="text-brand-600" /> ข้อมูลทั่วไปและมหาวิทยาลัย
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">ชื่อ - นามสกุล</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-500 outline-none transition"
              />
            </div>

            {/* Student ID / Staff ID (Self-Entered with Smart KKU Structure Parser) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  {isStaff 
                    ? 'รหัสบุคลากร (Staff ID)' 
                    : isStudent 
                    ? 'รหัสนักศึกษา มข. (Student ID)' 
                    : 'รหัสอ้างอิงผู้ใช้งาน (Citizen / User Ref)'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-brand-800 font-extrabold bg-orange-100 px-2.5 py-0.5 rounded-lg border border-orange-200">
                    กรอกด้วยตนเอง (Manual Input)
                  </span>
                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => setIsIdGuideOpen(!isIdGuideOpen)}
                      className="text-[11px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <HelpCircle size={13} />
                      <span>โครงสร้างรหัส</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  maxLength={11}
                  value={profile.student_id || ''}
                  onChange={handleStudentIdChange}
                  placeholder={isStudent ? "เช่น 693080099-9 หรือ 653040123-4" : "เช่น STF-0012 หรือรหัสประจำตัว"}
                  className="w-full pl-4 pr-11 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-500 outline-none transition shadow-2xs tracking-wide"
                />
                <GraduationCap size={18} className="absolute right-3.5 top-3 text-brand-600" />
              </div>

              {/* Live KKU ID Parser Insight Banner */}
              {isStudent && parsedStudentId && (
                <div className="mt-2 p-3 bg-brand-50/70 border border-brand-200/80 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-brand-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-brand-600" />
                      <span>ข้อมูลที่ระบบตรวจพบอัตโนมัติ:</span>
                    </span>
                    {parsedStudentId.isComplete && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                        <Check size={11} /> ครบ 10 หลัก (รวม Check Digit)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-gray-500">ปีที่เข้าศึกษา: </span>
                      <span className="font-bold text-gray-800">ปี {parsedStudentId.entryYearBE}</span>
                    </div>
                    {parsedStudentId.level && (
                      <div>
                        <span className="text-gray-500">ระดับ: </span>
                        <span className="font-bold text-gray-800">{parsedStudentId.level}</span>
                      </div>
                    )}
                    {parsedStudentId.faculty && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-gray-500">สังกัด: </span>
                        <span className="font-bold text-brand-700">
                          {parsedStudentId.faculty.name_th} ({parsedStudentId.faculty.abbr})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* KKU Student ID Structure Guide Accordion */}
              {isIdGuideOpen && (
                <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-700 space-y-3 transition-all animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="font-black text-gray-900 flex items-center gap-1.5">
                      <Info size={14} className="text-brand-600" />
                      โครงสร้างและความหมายของรหัสนักศึกษา มข.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsIdGuideOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ปิด
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p><b className="text-brand-700">หลักที่ 1 - 2:</b> ปีการศึกษาที่เข้าศึกษา (พ.ศ.) เช่น <code className="bg-white px-1 border border-gray-200 rounded">69</code> = ปี 2569, <code className="bg-white px-1 border border-gray-200 rounded">63</code> = ปี 2563</p>
                    <p><b className="text-brand-700">หลักที่ 3:</b> ระดับการศึกษา (<code className="bg-white px-1 border border-gray-200 rounded">3</code> = ปริญญาตรี (ภาคปกติ/ภาคพิเศษ), <code className="bg-white px-1 border border-gray-200 rounded">5</code> = บัณฑิตศึกษา (ปริญญาโท), <code className="bg-white px-1 border border-gray-200 rounded">7</code> = ปริญญาเอก และรวมถึงหลักสูตรประกาศนียบัตรบัณฑิตชั้นสูง)</p>
                    <p><b className="text-brand-700">หลักที่ 4 - 5:</b> รหัสคณะที่สังกัด (เช่น <code className="bg-white px-1 border border-gray-200 rounded">08</code> มนุษยศาสตร์ฯ, <code className="bg-white px-1 border border-gray-200 rounded">28</code> วิทยาลัยกิจการและนโยบายสาธารณะ (COPA KKU - เดิม COLA), <code className="bg-white px-1 border border-gray-200 rounded">38</code> วิทยาลัยการคอมพิวเตอร์, <code className="bg-white px-1 border border-gray-200 rounded">04</code> วิศวกรรมศาสตร์ ฯลฯ)</p>
                    <p><b className="text-brand-700">หลักที่ 6 - 9:</b> ลำดับที่ของนักศึกษา (Running Number)</p>
                    <p><b className="text-brand-700">หลักสุดท้าย (หลังขีด -):</b> ตัวเลขตรวจสอบความถูกต้อง (Check Digit)</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-600 mt-1 flex items-start gap-1 font-medium">
                <Info size={14} className="shrink-0 mt-0.5 text-brand-600" />
                <span>
                  เนื่องจากระบบยังไม่สามารถดึงข้อมูลจาก KKU SSO ได้ กรุณากรอกรหัสนักศึกษาของท่านเพื่อใช้คิดอัตราค่าบริการตามสิทธิ์นักศึกษา มข.
                </span>
              </p>
            </div>

            {/* Faculty / Department Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                คณะ / หน่วยงาน (Faculty / Department)
              </label>
              <div className="relative">
                <select
                  value={profile.faculty || ''}
                  onChange={(e) => setProfile({ ...profile, faculty: e.target.value })}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-500 outline-none transition appearance-none cursor-pointer"
                >
                  <option value="">-- กรุณาเลือกคณะ หรือหน่วยงานของคุณ --</option>
                  {KKU_FACULTY_OPTIONS.map((fac, idx) => (
                    <option key={idx} value={fac}>{fac}</option>
                  ))}
                </select>
                <Building2 size={18} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                * ข้อมูลนี้ใช้สำหรับการคิดค่าบริการตามสิทธิ์และจัดสรรทรัพยากรสนามกีฬา
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">อีเมลผู้ใช้งาน (Email)</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl text-xs sm:text-sm font-mono font-semibold text-gray-600 cursor-not-allowed"
                />
                <Mail size={18} className="absolute right-3.5 top-3 text-gray-400" />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="08xxxxxxxx"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-500 outline-none transition"
                />
                <Phone size={18} className="absolute right-3.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 4. Preferences: Notifications & Language                             */}
          {/* ==================================================================== */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-600" /> การตั้งค่าระบบและการแจ้งเตือน
            </h3>

            {/* Notification Toggles */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 border border-orange-200">
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-900">เตือนก่อนถึงเวลาจองสนาม 15 นาที</div>
                    <div className="text-[11px] text-gray-500">ส่งแจ้งเตือนในระบบเพื่อเตรียมพร้อมเช็คอิน</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotif15m}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                    notif15m ? 'bg-brand-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    notif15m ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-900">เตือนเมื่อได้สิทธิ์เลื่อนคิวอัตโนมัติ (Waitlist)</div>
                    <div className="text-[11px] text-gray-500">แจ้งเตือนทันทีเมื่อมีผู้ยกเลิกและคุณได้รับสิทธิ์เข้าจอง</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifWaitlist}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                    notifWaitlist ? 'bg-brand-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    notifWaitlist ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-2.5">
                <Globe size={18} className="text-brand-600" />
                <span className="text-xs sm:text-sm font-bold text-gray-800">ภาษาของระบบ (Language)</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLanguage('th')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'th' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  TH
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'en' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 5. Collapsible Password Section (Accordion UX)                       */}
          {/* ==================================================================== */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsPasswordOpen(!isPasswordOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center shrink-0 border border-orange-200">
                  <KeyRound size={18} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-gray-900 block">เปลี่ยนรหัสผ่าน (Security & Password)</span>
                  <span className="text-[11px] text-gray-500 block">คลิกเพื่อเปิดฟอร์มเปลี่ยนรหัสผ่าน</span>
                </div>
              </div>
              {isPasswordOpen ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {/* Accordion Form Content */}
            {isPasswordOpen && (
              <div className="mt-4 p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl space-y-4 transition-all">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">รหัสผ่านปัจจุบัน</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="ระบุรหัสผ่านเดิมเพื่อยืนยัน"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                      title={showCurrentPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password & Strength Indicator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">รหัสผ่านใหม่</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                        tabIndex={-1}
                        title={showNewPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1 h-1.5 w-full">
                          <div className={`h-full rounded-full flex-1 transition-colors ${pwdStrength.score >= 1 ? pwdStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-full rounded-full flex-1 transition-colors ${pwdStrength.score >= 2 ? pwdStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-full rounded-full flex-1 transition-colors ${pwdStrength.score >= 3 ? pwdStrength.color : 'bg-gray-200'}`} />
                        </div>
                        <div className={`text-[11px] font-bold ${pwdStrength.barColor}`}>
                          ระดับความปลอดภัย: {pwdStrength.text}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-400 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                        tabIndex={-1}
                        title={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* 6. Primary Action Button: Save Changes                               */}
          {/* ==================================================================== */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-brand-500/20 transition transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการเปลี่ยนแปลงโปรไฟล์'}</span>
            </button>
          </div>
        </form>

        {/* ==================================================================== */}
        {/* 7. Action Button: Logout (Distinct Outlined Red Button at Bottom)     */}
        {/* ==================================================================== */}
        <div className="pt-6 mt-6 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 active:scale-98"
          >
            <LogOut size={16} />
            ออกจากระบบ (Log Out)
          </button>
        </div>

      </div>
    </div>
  );
}
