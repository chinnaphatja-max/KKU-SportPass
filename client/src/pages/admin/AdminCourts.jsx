import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, MapPin, Edit2, X, Save, Minus, AlertTriangle, 
  Navigation, Check, Eye, Compass, LocateFixed, DollarSign, Layers,
  Clipboard, Sparkles 
} from 'lucide-react';
import axios from 'axios';
import InteractiveMapPicker, { parseCoordinates } from '../../components/InteractiveMapPicker';

// ─── Sport type keyword map for mismatch detection ──────────────────────────
const SPORT_KEYWORDS = {
  badminton: ['แบดมินตัน', 'badminton'],
  futsal: ['ฟุตซอล', 'futsal', 'ฟุตบอล', 'football', 'soccer'],
  basketball: ['บาสเกตบอล', 'basketball', 'บาส'],
  tennis: ['เทนนิส', 'tennis'],
  swimming: ['ว่ายน้ำ', 'swimming', 'สระ', 'pool'],
  volleyball: ['วอลเลย์บอล', 'volleyball', 'วอลเลย์'],
  archery: ['ยิงธนู', 'archery', 'ธนู'],
  fitness: ['ฟิตเนส', 'fitness', 'gym', 'ยิม'],
  other: [],
};

const SPORT_OPTIONS = [
  { value: 'badminton', label: 'แบดมินตัน', icon: '🏸' },
  { value: 'futsal', label: 'ฟุตซอล / ฟุตบอล', icon: '⚽' },
  { value: 'basketball', label: 'บาสเกตบอล', icon: '🏀' },
  { value: 'tennis', label: 'เทนนิส', icon: '🎾' },
  { value: 'swimming', label: 'ว่ายน้ำ', icon: '🏊' },
  { value: 'volleyball', label: 'วอลเลย์บอล', icon: '🏐' },
  { value: 'archery', label: 'ยิงธนู', icon: '🎯' },
  { value: 'fitness', label: 'ฟิตเนส / Gym', icon: '💪' },
  { value: 'other', label: 'อื่นๆ', icon: '🏟️' },
];

const KKU_LANDMARKS = [
  { name: 'ศูนย์กีฬา 50 ปี มข.', lat: 16.4429, lng: 102.8252 },
  { name: 'สระว่ายน้ำ 50 ปี มข.', lat: 16.4422, lng: 102.8255 },
  { name: 'สนามกีฬากลาง มข.', lat: 16.4448, lng: 102.8260 },
  { name: 'อาคารพลศึกษา 1', lat: 16.4435, lng: 102.8240 },
  { name: 'อาคารพลศึกษา 2 (ยิม)', lat: 16.4440, lng: 102.8235 },
  { name: 'สนามเทนนิส มข.', lat: 16.4418, lng: 102.8268 },
  { name: 'สนามยิงธนู มข.', lat: 16.4455, lng: 102.8275 },
];

const PRICING_ROLES = [
  { key: 'school', label: 'นักเรียน (School Student)', default: 0 },
  { key: 'student', label: 'นักศึกษา มข. (KKU Student)', default: 20 },
  { key: 'staff', label: 'บุคลากร มข. (KKU Staff)', default: 40 },
  { key: 'external', label: 'บุคคลภายนอก (Public / External)', default: 100 },
];

const DEFAULT_FEE_STRUCTURE = () =>
  Object.fromEntries(PRICING_ROLES.map(r => [r.key, { price: r.default, blocked: false }]));

// ─── Mismatch detection ──────────────────────────────────────────────────────
function detectMismatch(name, type) {
  if (!name || !type || type === 'other') return false;
  const lower = name.toLowerCase();
  for (const [sport, words] of Object.entries(SPORT_KEYWORDS)) {
    if (sport === type || sport === 'other') continue;
    if (words.some(w => lower.includes(w))) {
      const matchedSportObj = SPORT_OPTIONS.find(s => s.value === sport);
      return {
        mismatchWith: matchedSportObj ? matchedSportObj.label : sport,
      };
    }
  }
  return false;
}

// ─── Stepper Component ───────────────────────────────────────────────────────
function Stepper({ value, onChange, min = 1, max = 200, unit = 'คน/รอบ' }) {
  const currentVal = Math.max(min, Math.min(max, parseInt(value, 10) || min));
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, currentVal - 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-orange-50 hover:text-[#fe6e00] text-gray-600 transition active:scale-95 font-bold"
        >
          <Minus size={15} />
        </button>
        <span className="w-16 text-center text-sm font-extrabold text-gray-900 select-none">
          {currentVal}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, currentVal + 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-orange-50 hover:text-[#fe6e00] text-gray-600 transition active:scale-95 font-bold"
        >
          <Plus size={15} />
        </button>
      </div>
      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg">
        {unit}
      </span>
    </div>
  );
}

// ─── Live Preview Card Component ─────────────────────────────────────────────
function LivePreviewCard({ form }) {
  const sport = SPORT_OPTIONS.find(s => s.value === form.type) || { label: 'กีฬา', icon: '🏟️' };
  
  let priceText = 'ฟรี (ไม่มีค่าธรรมเนียม)';
  let isFree = true;

  if (form.is_fee_required && form.fee_structure) {
    const activePrices = Object.values(form.fee_structure)
      .filter(entry => !entry.blocked)
      .map(entry => Number(entry.price) || 0);

    if (activePrices.length > 0) {
      const minP = Math.min(...activePrices);
      const maxP = Math.max(...activePrices);
      const unit = form.pricing_unit === 'per_session' ? 'ครั้ง' : 'ชม.';
      if (minP === 0 && maxP === 0) {
        priceText = 'ฟรี';
        isFree = true;
      } else if (minP === maxP) {
        priceText = `฿${minP} / ${unit}`;
        isFree = false;
      } else {
        priceText = `฿${minP} - ฿${maxP} / ${unit}`;
        isFree = false;
      }
    } else {
      priceText = 'ปิดรับการจองทุกกลุ่ม';
      isFree = false;
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/60 to-white border border-orange-200/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#fe6e00] flex items-center gap-1.5">
          <Eye size={13} /> ตัวอย่างมุมมองผู้ใช้งาน (Live Preview)
        </span>
        <span className="text-[10px] bg-white border border-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full shadow-xs">
          แสดงผลจริง
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="px-2 py-0.5 bg-orange-100 text-[#fe6e00] text-[10px] font-extrabold rounded-md flex items-center gap-1">
                <span>{sport.icon}</span> {sport.label}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                👥 รับ {form.capacity || 1} คน/รอบ
              </span>
            </div>
            <h4 className="font-extrabold text-gray-900 text-sm truncate">
              {form.name ? form.name.trim() : 'ชื่อสนาม (ยังไม่ได้ระบุ)'}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
              <MapPin size={11} className="text-[#fe6e00] shrink-0" />
              <span className="font-mono truncate">
                {form.lat && form.lng ? `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}` : 'ยังไม่ได้ระบุพิกัด'}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg ${
              isFree 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-orange-50 text-[#fe6e00] border border-orange-200'
            }`}>
              {priceText}
            </span>
            <p className="text-[9px] text-gray-400 mt-1">พร้อมเปิดจอง</p>
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── Dynamic Pricing Matrix Component ─────────────────────────────────────────
function FeeMatrix({ feeStructure, pricingUnit, onChange, onUnitChange }) {
  return (
    <div className="space-y-4">
      {/* Pricing Unit Selector */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">
          รูปแบบการคิดค่าบริการ (Pricing Unit)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: 'per_hour', label: '⏱️ รายชั่วโมง', sub: 'คิดตามจำนวนชั่วโมงที่จอง' },
            { val: 'per_session', label: '🎟️ รายครั้ง / เหมาจ่าย', sub: 'คิดราคาคงที่ต่อรอบ' },
          ].map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => onUnitChange(opt.val)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                pricingUnit === opt.val
                  ? 'border-[#fe6e00] bg-orange-50/80 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`text-xs font-extrabold ${pricingUnit === opt.val ? 'text-[#fe6e00]' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Role-based rows */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-700">
            เรทราคาตามกลุ่มผู้ใช้งาน
            <span className="ml-1 text-gray-400 font-normal">
              ({pricingUnit === 'per_hour' ? 'บาท / ชั่วโมง' : 'บาท / ครั้ง'})
            </span>
          </label>
          <span className="text-[10px] text-gray-400 font-medium">
            ใส่ 0 เพื่อให้ใช้งานฟรี
          </span>
        </div>

        <div className="space-y-2">
          {PRICING_ROLES.map(role => {
            const entry = feeStructure[role.key] || { price: 0, blocked: false };
            const isFree = !entry.blocked && Number(entry.price) === 0;

            return (
              <div
                key={role.key}
                className={`p-3 rounded-xl border transition-all ${
                  entry.blocked ? 'bg-red-50/70 border-red-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${entry.blocked ? 'text-red-700 line-through opacity-60' : 'text-gray-800'}`}>
                      {role.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Free Badge */}
                    {isFree && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                        ฟรี
                      </span>
                    )}

                    {/* Price Input */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={entry.price}
                        disabled={entry.blocked}
                        onChange={e => onChange(role.key, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                        className={`w-24 pl-6 pr-2 py-1.5 border rounded-lg text-xs font-bold text-right outline-none transition-all
                          ${entry.blocked 
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#fe6e00]/30 focus:border-[#fe6e00]'
                          }
                        `}
                      />
                    </div>

                    {/* Block Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer group" title="ปิดรับการจองสำหรับกลุ่มนี้">
                      <input
                        type="checkbox"
                        checked={entry.blocked}
                        onChange={e => onChange(role.key, 'blocked', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-4 h-4 rounded border border-gray-300 bg-white peer-checked:bg-red-500 peer-checked:border-red-500 flex items-center justify-center transition-all">
                        {entry.blocked && <X size={11} className="text-white font-bold" />}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 group-hover:text-red-500 transition whitespace-nowrap">
                        บล็อก
                      </span>
                    </label>
                  </div>
                </div>

                {entry.blocked && (
                  <p className="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    🚫 กลุ่มนี้ไม่สามารถมองเห็นหรือจองสนามนี้ได้
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Court Form Modal (for Add and Edit) ───────────────────────────────
function CourtFormModal({ court, isEdit = false, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: court?.name || '',
    type: court?.type || 'badminton',
    capacity: court?.capacity || 1,
    lat: court?.latitude || court?.lat || 16.4429,
    lng: court?.longitude || court?.lng || 102.8252,
    fee_amount: court?.fee_amount || 0,
    is_fee_required: Boolean(court?.is_fee_required),
    fee_structure: court?.fee_structure
      ? (typeof court.fee_structure === 'string' ? JSON.parse(court.fee_structure) : court.fee_structure)
      : DEFAULT_FEE_STRUCTURE(),
    pricing_unit: court?.pricing_unit || 'per_hour',
    id: court?.id || undefined,
  });

  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [coordToast, setCoordToast] = useState(null);

  const mismatchInfo = detectMismatch(form.name, form.type);
  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePasteClipboardToForm = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        alert('เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ดอัตโนมัติ กรุณาวางพิกัดลงในช่องด้านล่าง');
        return;
      }
      const clipText = await navigator.clipboard.readText();
      const parsed = parseCoordinates(clipText);
      if (parsed) {
        setField('lat', parsed.lat);
        setField('lng', parsed.lng);
        setCoordToast(`✨ ดึงพิกัดอัตโนมัติสำเร็จ: ${parsed.lat}, ${parsed.lng}`);
        setTimeout(() => setCoordToast(null), 3500);
      } else {
        alert(`ไม่พบรูปแบบพิกัดในคลิปบอร์ด: "${clipText.substring(0, 35)}..."\nคุณสามารถคลิก "เลือกจากแผนที่ มข." เพื่อปักหมุดได้`);
      }
    } catch (err) {
      alert('ไม่สามารถอ่านคลิปบอร์ดได้ กรุณาวางพิกัดลงในช่องหรือเปิดแผนที่');
    }
  };

  const updateFeeRow = (roleKey, field, value) => {
    setForm(f => ({
      ...f,
      fee_structure: {
        ...f.fee_structure,
        [roleKey]: { ...f.fee_structure[roleKey], [field]: value },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('กรุณากรอกชื่อสนาม');
      return;
    }

    if (form.is_fee_required) {
      const activeRoles = Object.values(form.fee_structure).filter(r => !r.blocked);
      if (activeRoles.length === 0) {
        alert('คุณเปิดเก็บค่าธรรมเนียม แต่ได้บล็อกทุกกลุ่มผู้ใช้ กรุณาเปิดให้มีอย่างน้อย 1 กลุ่มสามารถจองได้');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        fee_structure: form.is_fee_required ? form.fee_structure : null,
        pricing_unit: form.is_fee_required ? form.pricing_unit : 'per_hour',
      };

      if (isEdit) {
        await axios.put('/api/admin/courts', payload);
      } else {
        await axios.post('/api/admin/courts', payload);
      }
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || `เกิดข้อผิดพลาดในการ${isEdit ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลสนาม`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-4 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg">
                {isEdit ? 'แก้ไขข้อมูลสนามกีฬา' : 'เพิ่มสนามกีฬาใหม่'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEdit ? `รหัสสนาม: ${form.id}` : 'กรอกรายละเอียดสนามและกำหนดเงื่อนไขการจอง'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* ── Section 1: ข้อมูลทั่วไป (General Info) ── */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <Layers size={15} className="text-[#fe6e00]" />
                <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                  1. ข้อมูลทั่วไป (General Info)
                </h4>
              </div>

              {/* ชื่อสนาม */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ชื่อสนาม <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="เช่น สนามแบดมินตัน 1 (อาคารพลศึกษา)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#fe6e00]/40 focus:border-[#fe6e00] outline-none transition"
                />
              </div>

              {/* ประเภทกีฬา */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ประเภทกีฬา <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={e => setField('type', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#fe6e00]/40 outline-none transition"
                >
                  {SPORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>

                {/* Mismatch Warning */}
                {mismatchInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5"
                  >
                    <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">
                        ข้อสังเกต: ชื่อสนามอาจไม่สอดคล้องกับประเภทกีฬา
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        ชื่อสนามมีคำที่ใกล้เคียงกับกีฬา <strong>"{mismatchInfo.mismatchWith}"</strong> แต่คุณเลือกประเภทเป็นกีฬาอื่น โปรดตรวจสอบอีกครั้งก่อนบันทึก
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ความจุต่อรอบ (Stepper) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ความจุสูงสุดต่อรอบ <span className="text-red-500">*</span>
                </label>
                <Stepper
                  value={form.capacity}
                  onChange={v => setField('capacity', v)}
                  min={1}
                  max={200}
                  unit="คน / สล็อต"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  จำนวนผู้เล่นหรือกลุ่มที่สามารถจองได้พร้อมกันในหนึ่งช่วงเวลา
                </p>
              </div>
            </div>

            {/* ── Section 2: ตำแหน่งที่ตั้ง (Location & Coordinates) ── */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#fe6e00]" />
                  <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                    2. ตำแหน่งที่ตั้งและพิกัด GPS <span className="text-red-500">*</span>
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteClipboardToForm}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-xs"
                    title="อ่านพิกัดที่คัดลอกไว้ในคลิปบอร์ดทันที"
                  >
                    <Clipboard size={13} /> ดึงจากคลิปบอร์ด
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#fe6e00] border border-orange-200 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Compass size={13} /> แผนที่ปักหมุด
                  </button>
                </div>
              </div>

              {/* Smart Auto-parse Input */}
              <div>
                <input
                  type="text"
                  placeholder="📋 วางพิกัด (เช่น 16.443, 102.8253) หรือลิงก์ Google Maps ที่นี่ (ดึงอัตโนมัติ)..."
                  onChange={(e) => {
                    const parsed = parseCoordinates(e.target.value);
                    if (parsed) {
                      setField('lat', parsed.lat);
                      setField('lng', parsed.lng);
                      setCoordToast(`✨ ดึงพิกัดสำเร็จ: ${parsed.lat}, ${parsed.lng}`);
                      setTimeout(() => setCoordToast(null), 3500);
                    }
                  }}
                  className="w-full px-3 py-2 bg-orange-50/50 border border-dashed border-orange-200 rounded-xl text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-[#fe6e00]/40 focus:border-[#fe6e00] outline-none transition"
                />
              </div>

              {coordToast && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  <span>{coordToast}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Latitude (ละติจูด)
                  </label>
                  <input
                    type="number" step="any" required
                    value={form.lat}
                    onChange={e => setField('lat', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Longitude (ลองจิจูด)
                  </label>
                  <input
                    type="number" step="any" required
                    value={form.lng}
                    onChange={e => setField('lng', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3: ค่าบริการและเงื่อนไข (Pricing & Access) ── */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={15} className="text-[#fe6e00]" />
                  <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                    3. ค่าบริการและการเข้าถึง (Pricing & Policy)
                  </h4>
                </div>
                {/* Fee Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_fee_required)}
                    onChange={e => setField('is_fee_required', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fe6e00]" />
                </label>
              </div>

              {!form.is_fee_required && (
                <div className="py-2 flex items-center justify-between text-xs text-gray-500">
                  <span>สถานะปัจจุบัน:</span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">
                    ✨ ใช้งานฟรีสำหรับทุกคน
                  </span>
                </div>
              )}

              {/* Dynamic Pricing Matrix */}
              <AnimatePresence>
                {form.is_fee_required && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <FeeMatrix
                        feeStructure={form.fee_structure || DEFAULT_FEE_STRUCTURE()}
                        pricingUnit={form.pricing_unit}
                        onChange={updateFeeRow}
                        onUnitChange={v => setField('pricing_unit', v)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Section 4: Live Preview Card ── */}
            <LivePreviewCard form={form} />

            {/* ── Submit / Cancel Buttons ── */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-[#fe6e00] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 hover:bg-[#e06100] transition flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างสนาม'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Interactive Map Picker Modal */}
      {showMapPicker && (
        <InteractiveMapPicker
          lat={form.lat}
          lng={form.lng}
          onConfirm={(lat, lng) => {
            setField('lat', lat);
            setField('lng', lng);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  );
}

// ─── Main AdminCourts Page ───────────────────────────────────────────────────
export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/courts');
      setCourts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  const handleDeleteCourt = async (id) => {
    if (!confirm(`ยืนยันการลบสนาม ${id}? การลบนี้จะรวมถึงช่วงเวลาทั้งหมดของสนามนี้ด้วย`)) return;
    try {
      await axios.delete('/api/admin/courts', { data: { id } });
      fetchCourts();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบสนามได้');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">
            รายการสนามกีฬา ({courts.length})
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            จัดการเพิ่ม ลบ แก้ไขข้อมูลสนาม พิกัด GPS และตั้งค่าอัตราค่าธรรมเนียมตามกลุ่มผู้ใช้
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#fe6e00] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 hover:bg-[#e06100] transition"
        >
          <Plus size={16} /> เพิ่มสนามใหม่
        </button>
      </div>

      {/* Courts Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-[#fe6e00] rounded-full animate-spin" />
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 text-gray-400 font-medium text-sm">
          ยังไม่มีข้อมูลสนามในระบบ คลิกปุ่ม "เพิ่มสนามใหม่" ด้านบนเพื่อเริ่มสร้าง
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(c => {
            const isFee = Boolean(c.is_fee_required);
            const sportObj = SPORT_OPTIONS.find(s => s.value === c.type) || { icon: '🏟️', label: c.sport_name || c.type };

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 bg-orange-50 text-[#fe6e00] font-mono font-black text-[11px] rounded-lg border border-orange-100">
                      {c.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded">
                        👥 รับ {c.capacity || 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <span>{sportObj.icon}</span> {sportObj.label}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-gray-900 text-base mb-1 truncate">
                    {c.name}
                  </h4>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <MapPin size={13} className="text-[#fe6e00] shrink-0" />
                    <span className="font-mono text-[11px]">
                      {c.latitude ? Number(c.latitude).toFixed(4) : '-'}, {c.longitude ? Number(c.longitude).toFixed(4) : '-'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {isFee ? (
                      <span className="px-2.5 py-0.5 bg-orange-50 text-[#fe6e00] text-[10px] font-extrabold rounded-full border border-orange-200">
                        มีค่าบริการ • {c.pricing_unit === 'per_session' ? 'รายครั้ง' : 'รายชั่วโมง'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                        ฟรี (ไม่มีค่าธรรมเนียม)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">
                    ช่วงเวลา: <strong className="text-gray-700">{c.timeslot_count || 0}</strong> ช่อง
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCourt(c)}
                      className="p-2 text-gray-400 hover:text-[#fe6e00] hover:bg-orange-50 rounded-xl transition"
                      title="แก้ไขข้อมูลสนาม"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourt(c.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                      title="ลบสนาม"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add Court Modal ── */}
      {showAddModal && (
        <CourtFormModal
          isEdit={false}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchCourts();
          }}
        />
      )}

      {/* ── Edit Court Modal ── */}
      {editingCourt && (
        <CourtFormModal
          court={editingCourt}
          isEdit={true}
          onClose={() => setEditingCourt(null)}
          onSaved={() => {
            setEditingCourt(null);
            fetchCourts();
          }}
        />
      )}
    </div>
  );
}
