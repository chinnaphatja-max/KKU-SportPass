import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Star,
  User,
  Activity,
  Clock,
  Trophy,
  MapPin,
  Zap,
  ShieldCheck,
  HeartHandshake,
  Smile,
  LayoutDashboard,
  Fingerprint,
  BadgeCheck,
  Sparkles,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ---------- Star Rating Component ----------
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(null);
  const displayValue = hovered !== null ? hovered : value;

  return (
    <div className="flex items-center gap-1.5 md:gap-3">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = (displayValue ?? 0) >= star;
        return (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.2, rotate: isActive ? [0, -8, 8, 0] : 0 }}
            whileTap={{ scale: 0.85 }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(star)}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm ${isActive
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-orange-500/30 scale-105'
                : 'bg-white border border-gray-200 text-gray-300 hover:border-orange-300 hover:bg-orange-50 hover:scale-105'
              }`}
          >
            <Star
              size={isActive ? 24 : 20}
              fill={isActive ? 'currentColor' : 'none'}
              className="drop-shadow-sm"
            />
          </motion.button>
        );
      })}
    </div>
  );
};

// ---------- Rating Row Component ----------
const RatingRow = ({
  name,
  title,
  desc,
  icon: Icon,
  value,
  onChange,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-white/70 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-300 group"
  >
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
      <div className="flex gap-4 items-start">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
          <Icon size={24} />
        </div>
        <div>
          <h5 className="font-bold text-gray-800 text-sm md:text-base">{title}</h5>
          <p className="text-xs md:text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="flex flex-col items-center shrink-0">
        <StarRating value={value} onChange={(val) => onChange(name, val)} />
        <div className="w-full flex justify-between px-2 mt-2 text-[10px] font-medium text-gray-400">
          <span>ควรปรับปรุง (1)</span>
          <span>ดีเยี่ยม (5)</span>
        </div>
      </div>
    </div>
  </motion.div>
);

// ---------- Main Survey Component ----------
export default function Survey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // ---------- Form State ----------
  const [formData, setFormData] = useState({
    userRole: '',
    usageFrequency: '',
    preferredSports: '',
    otherSport: '',
    gender: '',
    age: '',
    faculty: '',

    rating_ux_modern: null,
    rating_ux_clarity: null,
    rating_ux_nav: null,
    rating_ux_feedback: null,
    rating_func_status: null,
    rating_func_booking: null,
    rating_func_checkin: null,
    rating_func_manual: null,
    rating_perf_speed: null,
    rating_perf_gps: null,
    rating_perf_security: null,
    rating_prob_time: null,
    rating_prob_queue: null,
    rating_prob_plan: null,
    rating_overall: null,
  });

  // ---------- Handlers ----------
  const handleRadioChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- Step Validation ----------
  const validateStep1 = () => {
    if (!formData.userRole) {
      setError('กรุณาเลือกสถานภาพของผู้ใช้งาน');
      return false;
    }
    if (!formData.gender) {
      setError('กรุณาเลือกเพศ');
      return false;
    }
    if (!formData.age) {
      setError('กรุณาเลือกช่วงอายุ');
      return false;
    }
    if (
      (formData.userRole === 'นักศึกษามหาวิทยาลัยขอนแก่น' ||
        formData.userRole === 'บุคลากรมหาวิทยาลัยขอนแก่น') &&
      !formData.faculty.trim()
    ) {
      setError('กรุณาระบุคณะ/หน่วยงานต้นสังกัด');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!formData.usageFrequency) {
      setError('กรุณาเลือกความถี่ในการใช้งาน');
      return false;
    }
    if (!formData.preferredSports) {
      setError('กรุณาเลือกประเภทกีฬาที่ใช้บริการ');
      return false;
    }
    if (formData.preferredSports === 'อื่นๆ' && !formData.otherSport.trim()) {
      setError('กรุณาระบุชนิดกีฬาอื่นๆ ที่คุณใช้งาน');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = () => {
    const ratingFields = [
      'rating_ux_modern',
      'rating_ux_clarity',
      'rating_ux_nav',
      'rating_ux_feedback',
      'rating_func_status',
      'rating_func_booking',
      'rating_func_checkin',
      'rating_func_manual',
      'rating_perf_speed',
      'rating_perf_gps',
      'rating_perf_security',
      'rating_prob_time',
      'rating_prob_queue',
      'rating_prob_plan',
      'rating_overall',
    ];
    const missing = ratingFields.some((field) => formData[field] === null);
    if (missing) {
      setError('กรุณาให้คะแนนความพึงพอใจให้ครบทุกหัวข้อ (ดาวสีส้ม)');
      return false;
    }
    setError(null);
    return true;
  };

  // ---------- Navigation ----------
  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------- Submit ----------
  const submitSurvey = async () => {
    if (!validateStep3()) return;
    if (submitted) return;

    try {
      setLoading(true);
      setError(null);
      setSubmitted(true);

      const payload = {
        ...formData,
        preferredSports:
          formData.preferredSports === 'อื่นๆ'
            ? `อื่นๆ: ${formData.otherSport.trim()}`
            : formData.preferredSports,
      };

      // Simulate API call (replace with actual axios call)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // await axios.post('/api/surveys', payload);

      setSuccess(true);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Success Screen ----------
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center relative overflow-hidden border border-white/50"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-orange-400" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-orange-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"
          >
            <PartyPopper size={48} className="drop-shadow-sm" />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            ขอบคุณมากนะครับ/ค่ะ!
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            ข้อมูลอันมีค่าของคุณจะถูกนำไปใช้พัฒนาระบบ
            <br />
            <strong>KKU SportPass</strong> ให้ดียิ่งขึ้นไปอีก
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-gray-900/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            กลับสู่หน้าแรก
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------- Main Survey UI ----------
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-orange-200">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-blue-300/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Sparkles size={24} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            แบบประเมินความพึงพอใจ
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            มาร่วมสร้างประสบการณ์ที่ดีกว่าไปกับระบบจองสนามกีฬา{' '}
            <strong>KKU SportPass</strong>
          </p>
        </motion.div>

        {/* Progress Stepper */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2 md:gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 md:px-6 md:py-3 rounded-full shadow-sm border border-gray-100">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 md:gap-4">
                <div
                  className={`flex items-center gap-2 font-bold text-xs md:text-sm transition-colors duration-300 ${step >= s ? 'text-gray-900' : 'text-gray-300'
                    }`}
                >
                  <span
                    className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${step === s
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 scale-110'
                        : step > s
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100'
                      }`}
                  >
                    {step > s ? <CheckCircle2 size={14} /> : s}
                  </span>
                  <span className="hidden md:inline-block">
                    {s === 1 ? 'ข้อมูลทั่วไป' : s === 2 ? 'พฤติกรรม' : 'ให้คะแนน'}
                  </span>
                </div>
                {s < 3 && (
                  <div
                    className={`w-4 md:w-8 h-[2px] rounded-full transition-all duration-300 ${step > s ? 'bg-emerald-400' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-6 md:p-10 mb-20 relative overflow-hidden">
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-sm overflow-hidden"
              >
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: General Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <User size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">ข้อมูลผู้ใช้งานเบื้องต้น</h3>
                </div>

                <div className="space-y-8">
                  {/* Role Selection */}
                  <div className="bg-gray-50/50 p-5 md:p-6 rounded-3xl border border-gray-100">
                    <label className="block text-base font-bold text-gray-800 mb-4">
                      1. สถานภาพของคุณในมหาวิทยาลัยขอนแก่น
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'นักศึกษามหาวิทยาลัยขอนแก่น',
                        'บุคลากรมหาวิทยาลัยขอนแก่น',
                        'บุคคลทั่วไป',
                        'ผู้ดูแลระบบ / เจ้าหน้าที่',
                      ].map((role) => (
                        <button
                          type="button"
                          onClick={() => handleRadioChange('userRole', role)}
                          key={role}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left ${formData.userRole === role
                              ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-orange-200'
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.userRole === role
                                ? 'border-orange-500'
                                : 'border-gray-300'
                              }`}
                          >
                            {formData.userRole === role && (
                              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                            )}
                          </div>
                          <span
                            className={`font-semibold text-sm ${formData.userRole === role
                                ? 'text-orange-700'
                                : 'text-gray-600'
                              }`}
                          >
                            {role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="bg-gray-50/50 p-5 md:p-6 rounded-3xl border border-gray-100">
                    <label className="block text-base font-bold text-gray-800 mb-6">
                      2. ข้อมูลประชากรศาสตร์
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="block text-sm font-semibold text-gray-500 mb-3">
                          เพศ
                        </span>
                        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                          {['ชาย', 'หญิง', 'ทางเลือก'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleRadioChange('gender', opt)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${formData.gender === opt
                                  ? 'bg-gray-900 text-white shadow-md'
                                  : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-sm font-semibold text-gray-500 mb-3">
                          ช่วงอายุ
                        </span>
                        <select
                          value={formData.age}
                          onChange={(e) => handleRadioChange('age', e.target.value)}
                          className="w-full p-3.5 bg-white border border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-semibold text-gray-700 shadow-sm transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>
                            คลิกเพื่อเลือกช่วงอายุ
                          </option>
                          <option value="ต่ำกว่า 18 ปี">ต่ำกว่า 18 ปี</option>
                          <option value="18-22 ปี">18-22 ปี</option>
                          <option value="23-30 ปี">23-30 ปี</option>
                          <option value="31 ปีขึ้นไป">31 ปีขึ้นไป</option>
                        </select>
                      </div>
                    </div>

                    <AnimatePresence>
                      {(formData.userRole === 'นักศึกษามหาวิทยาลัยขอนแก่น' ||
                        formData.userRole === 'บุคลากรมหาวิทยาลัยขอนแก่น') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <span className="block text-sm font-semibold text-gray-500 mb-3">
                              คณะ / หน่วยงานต้นสังกัด
                            </span>
                            <input
                              type="text"
                              value={formData.faculty}
                              onChange={(e) =>
                                handleRadioChange('faculty', e.target.value)
                              }
                              placeholder="โปรดระบุชื่อคณะ หรือ หน่วยงาน..."
                              className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-semibold text-gray-800 shadow-sm transition-all placeholder:text-gray-300 placeholder:font-medium"
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Usage Behavior */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    พฤติกรรมการใช้งาน
                  </h3>
                </div>

                <div className="space-y-8">
                  {/* Frequency */}
                  <div className="bg-gray-50/50 p-5 md:p-6 rounded-3xl border border-gray-100">
                    <label className="block text-base font-bold text-gray-800 mb-4">
                      3. ความถี่ในการใช้งานสนามกีฬา
                    </label>
                    <div className="flex flex-col gap-3">
                      {[
                        'เข้าใช้งานทุกวัน / เป็นประจำ',
                        'เข้าใช้งานบางวัน (เช่น 1-3 วันต่อสัปดาห์)',
                        'เข้าใช้งานเป็นครั้งคราว',
                        'ไม่ค่อยมีเวลาออกกำลังกาย หรือ เข้าใช้งานโดยไม่จำเป็นต้องจอง',
                      ].map((freq) => (
                        <button
                          type="button"
                          onClick={() => handleRadioChange('usageFrequency', freq)}
                          key={freq}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left ${formData.usageFrequency === freq
                              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-emerald-200'
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.usageFrequency === freq
                                ? 'border-emerald-500'
                                : 'border-gray-300'
                              }`}
                          >
                            {formData.usageFrequency === freq && (
                              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                            )}
                          </div>
                          <span
                            className={`font-semibold text-sm ${formData.usageFrequency === freq
                                ? 'text-emerald-700'
                                : 'text-gray-600'
                              }`}
                          >
                            {freq}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sports */}
                  <div className="bg-gray-50/50 p-5 md:p-6 rounded-3xl border border-gray-100">
                    <label className="block text-base font-bold text-gray-800 mb-4">
                      4. กีฬาที่คุณชื่นชอบและใช้บริการบ่อยที่สุด
                    </label>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {[
                        'ฟุตบอล',
                        'บาสเกตบอล',
                        'วอลเลย์บอล',
                        'เทนนิส',
                        'แบดมินตัน',
                        'ฟุตซอล',
                        'อื่นๆ',
                      ].map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => handleRadioChange('preferredSports', sport)}
                          className={`px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-all duration-200 ${formData.preferredSports === sport
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                            }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {formData.preferredSports === 'อื่นๆ' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            value={formData.otherSport}
                            onChange={(e) =>
                              handleRadioChange('otherSport', e.target.value)
                            }
                            placeholder="โปรดระบุชนิดกีฬาที่คุณใช้งาน..."
                            className="w-full mt-2 p-4 bg-white border border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 shadow-sm transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Ratings */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Star size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    การประเมินความพึงพอใจ
                  </h3>
                </div>

                <div className="space-y-10">
                  {/* Category 1: UX/UI */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <LayoutDashboard className="text-gray-400" size={20} />
                      <h4 className="text-lg font-extrabold text-gray-800">
                        ด้านความสวยงาม (UX/UI Design)
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <RatingRow
                        name="rating_ux_modern"
                        title="ความทันสมัย"
                        desc="หน้าจอสะอาดตา สวยงาม และดูน่าใช้งาน"
                        icon={Sparkles}
                        value={formData.rating_ux_modern}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_ux_clarity"
                        title="ความชัดเจน"
                        desc="ตัวอักษรอ่านง่าย การใช้สีและไอคอนสื่อความหมายได้ดี"
                        icon={BadgeCheck}
                        value={formData.rating_ux_clarity}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_ux_nav"
                        title="การนำทาง (Navigation)"
                        desc="การจัดวางเมนูและการ์ดสนาม สะดวกต่อการค้นหาและใช้งาน"
                        icon={MapPin}
                        value={formData.rating_ux_nav}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_ux_feedback"
                        title="การตอบสนอง"
                        desc="มีข้อความแจ้งเตือน (เช่น จองสำเร็จ, ผิดพลาด) ที่ชัดเจน"
                        icon={Smile}
                        value={formData.rating_ux_feedback}
                        onChange={handleRatingChange}
                      />
                    </div>
                  </section>

                  {/* Category 2: Functional */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="text-gray-400" size={20} />
                      <h4 className="text-lg font-extrabold text-gray-800">
                        ด้านฟังก์ชัน (Functional Usability)
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <RatingRow
                        name="rating_func_status"
                        title="สถานะเรียลไทม์"
                        desc="ความสะดวกและแม่นยำในการดูตารางเวลาและสถานะสนาม"
                        icon={Clock}
                        value={formData.rating_func_status}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_func_booking"
                        title="ระบบการจอง"
                        desc="ขั้นตอนการจองคิวง่าย รวดเร็ว และไม่ซับซ้อน"
                        icon={CheckCircle2}
                        value={formData.rating_func_booking}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_func_checkin"
                        title="ระบบเช็คอิน"
                        desc="ความสะดวกในการสแกน QR Code หรือเช็คอินพิกัด GPS"
                        icon={Fingerprint}
                        value={formData.rating_func_checkin}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_func_manual"
                        title="คู่มือการใช้งาน"
                        desc="คู่มือมีความชัดเจนและช่วยเหลือได้จริงเมื่อเกิดปัญหา"
                        icon={HeartHandshake}
                        value={formData.rating_func_manual}
                        onChange={handleRatingChange}
                      />
                    </div>
                  </section>

                  {/* Category 3: Performance & Security */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="text-gray-400" size={20} />
                      <h4 className="text-lg font-extrabold text-gray-800">
                        ด้านประสิทธิภาพ (Performance & Security)
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <RatingRow
                        name="rating_perf_speed"
                        title="ความรวดเร็วของระบบ"
                        desc="หน้าเว็บและข้อมูลโหลดได้รวดเร็วทันใจ ไม่มีอาการค้าง"
                        icon={Zap}
                        value={formData.rating_perf_speed}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_perf_gps"
                        title="ความแม่นยำของพิกัด"
                        desc="ระบบจับระยะทาง GPS ทำงานได้อย่างเที่ยงตรง"
                        icon={MapPin}
                        value={formData.rating_perf_gps}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_perf_security"
                        title="ความปลอดภัย"
                        desc="รู้สึกปลอดภัยและมั่นใจในความเป็นส่วนตัวของการใช้ข้อมูล"
                        icon={ShieldCheck}
                        value={formData.rating_perf_security}
                        onChange={handleRatingChange}
                      />
                    </div>
                  </section>

                  {/* Category 4: Benefits */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="text-gray-400" size={20} />
                      <h4 className="text-lg font-extrabold text-gray-800">
                        ด้านประโยชน์ที่ได้รับ (Benefits)
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <RatingRow
                        name="rating_prob_time"
                        title="ประหยัดเวลา"
                        desc="ช่วยลดปัญหาการเสียเวลาเดินทางมาเก้อได้อย่างแท้จริง"
                        icon={Clock}
                        value={formData.rating_prob_time}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_prob_queue"
                        title="ลดความวุ่นวาย"
                        desc="ช่วยบริหารและจัดการปัญหาการแซงคิวหรือต่อคิวได้ดีเยี่ยม"
                        icon={User}
                        value={formData.rating_prob_queue}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_prob_plan"
                        title="วางแผนได้ดีขึ้น"
                        desc="ทำให้สามารถจัดสรรเวลาในการเล่นกีฬาในแต่ละวันได้ดีกว่าเดิม"
                        icon={CheckCircle2}
                        value={formData.rating_prob_plan}
                        onChange={handleRatingChange}
                      />
                      <RatingRow
                        name="rating_overall"
                        title="ความพึงพอใจโดยรวม"
                        desc="ภาพรวมความประทับใจที่คุณมีต่อระบบ KKU SportPass"
                        icon={Trophy}
                        value={formData.rating_overall}
                        onChange={handleRatingChange}
                      />
                    </div>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse md:flex-row gap-4 mt-12 pt-8 border-t border-gray-100">
            {step > 1 && (
              <button
                onClick={handlePrevStep}
                className="w-full md:w-auto px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} /> ย้อนกลับ
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="flex-1 w-full px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                ถัดไป <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={submitSurvey}
                disabled={loading || submitted}
                className="flex-1 w-full px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    กำลังบันทึกข้อมูล...
                  </>
                ) : (
                  <>
                    ส่งแบบประเมิน <CheckCircle2 size={20} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้เพื่อการพัฒนาระบบเท่านั้น
        </p>
      </div>
    </div>
  );
}