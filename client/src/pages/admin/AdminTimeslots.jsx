import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Plus, Trash2, MapPin, Edit2, X, Save, Copy,
  Sparkles, Check, AlertCircle, RefreshCw, ChevronRight,
  Filter, Search, ArrowRight, Layers, HelpCircle
} from 'lucide-react';
import axios from 'axios';

export default function AdminTimeslots() {
  const [timeslots, setTimeslots] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' | 'single'
  const [selectedSport, setSelectedSport] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null); // { text, type: 'success' | 'error' }

  // Single Slot Form State (24-hour default)
  const [singleSlot, setSingleSlot] = useState({
    court_id: '',
    start_time: '16:00',
    end_time: '17:00'
  });
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk Generator State
  const [bulkConfig, setBulkConfig] = useState({
    targetCourtId: '',
    applyToAllInSport: false,
    startTime: '08:00',
    endTime: '20:00',
    durationMinutes: 60, // 30, 45, 60, 90, 120
    breakMinutes: 0 // 0, 10, 15, 30
  });
  const [generatingBulk, setGeneratingBulk] = useState(false);

  // Direct Edit Slot Modal
  const [editingSlot, setEditingSlot] = useState(null); // { id, court_id, start_time, end_time }
  const [savingEdit, setSavingEdit] = useState(false);

  // Copy Timeslots Modal
  const [copyModal, setCopyModal] = useState({
    isOpen: false,
    targetCourt: null,
    sourceCourtId: '',
    replaceExisting: true
  });
  const [copying, setCopying] = useState(false);

  // Clear Confirmation Modal
  const [clearModal, setClearModal] = useState({
    isOpen: false,
    court: null
  });
  const [clearing, setClearing] = useState(false);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tsRes, courtsRes] = await Promise.all([
        axios.get('/api/admin/timeslots'),
        axios.get('/api/admin/courts'),
      ]);
      setTimeslots(tsRes.data || []);
      const courtsData = courtsRes.data || [];
      setCourts(courtsData);

      if (courtsData.length > 0) {
        setSingleSlot(prev => ({ ...prev, court_id: prev.court_id || courtsData[0].id }));
        setBulkConfig(prev => ({ ...prev, targetCourtId: prev.targetCourtId || courtsData[0].id }));
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลช่วงเวลาได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Sports Categories
  const sportsList = useMemo(() => {
    const sportsMap = new Map();
    courts.forEach(c => {
      const sport = c.sport_name || c.type || 'ทั่วไป';
      sportsMap.set(sport, (sportsMap.get(sport) || 0) + 1);
    });
    return Array.from(sportsMap.entries()).map(([name, count]) => ({ name, count }));
  }, [courts]);

  // Grouped Slots by Court ID
  const groupedSlots = useMemo(() => {
    return timeslots.reduce((acc, slot) => {
      if (!acc[slot.court_id]) acc[slot.court_id] = [];
      acc[slot.court_id].push(slot);
      return acc;
    }, {});
  }, [timeslots]);

  // Filtered Courts
  const filteredCourts = useMemo(() => {
    return courts.filter(court => {
      const sport = court.sport_name || court.type || 'ทั่วไป';
      const matchesSport = selectedSport === 'all' || sport === selectedSport;
      const matchesSearch = !searchQuery ||
        court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        court.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSport && matchesSearch;
    });
  }, [courts, selectedSport, searchQuery]);

  // Bulk Generator Slot Calculator (Live Preview)
  const previewBulkSlots = useMemo(() => {
    const { startTime, endTime, durationMinutes, breakMinutes } = bulkConfig;
    if (!startTime || !endTime || durationMinutes <= 0) return [];

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal >= endTotal) return [];

    const slots = [];
    while (startTotal + durationMinutes <= endTotal) {
      const sH = Math.floor(startTotal / 60);
      const sM = startTotal % 60;
      const slotEndTotal = startTotal + durationMinutes;
      const eH = Math.floor(slotEndTotal / 60);
      const eM = slotEndTotal % 60;

      const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({
        start_time: formatTime(sH, sM),
        end_time: formatTime(eH, eM)
      });

      startTotal = slotEndTotal + breakMinutes;
    }
    return slots;
  }, [bulkConfig]);

  // Single Slot Submit
  const handleAddSingleSlot = async (e) => {
    e.preventDefault();
    if (!singleSlot.court_id) return showToast('กรุณาเลือกสนาม', 'error');
    if (singleSlot.start_time >= singleSlot.end_time) {
      return showToast('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด', 'error');
    }

    setSavingSingle(true);
    try {
      await axios.post('/api/admin/timeslots', singleSlot);
      showToast('เพิ่มช่วงเวลาเรียบร้อยแล้ว');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเพิ่มช่วงเวลา', 'error');
    } finally {
      setSavingSingle(false);
    }
  };

  // Bulk Generate Submit
  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (previewBulkSlots.length === 0) {
      return showToast('ช่วงเวลาไม่ถูกต้อง กรุณาตรวจสอบเวลาเปิด-ปิด', 'error');
    }

    let targetCourtIds = [];
    if (bulkConfig.applyToAllInSport) {
      const selectedCourt = courts.find(c => c.id === bulkConfig.targetCourtId);
      const sport = selectedCourt ? (selectedCourt.sport_name || selectedCourt.type) : null;
      targetCourtIds = courts.filter(c => (c.sport_name || c.type) === sport).map(c => c.id);
    } else {
      targetCourtIds = [bulkConfig.targetCourtId];
    }

    if (targetCourtIds.length === 0) {
      return showToast('กรุณาเลือกสนามเป้าหมาย', 'error');
    }

    setGeneratingBulk(true);
    try {
      const res = await axios.post('/api/admin/timeslots/bulk', {
        court_ids: targetCourtIds,
        slots: previewBulkSlots
      });
      showToast(res.data?.message || `สร้างช่วงเวลาสำเร็จ ${res.data?.count || previewBulkSlots.length} รายการ`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างช่วงเวลาอัตโนมัติ', 'error');
    } finally {
      setGeneratingBulk(false);
    }
  };

  // Delete Individual Slot
  const handleDeleteSlot = async (id) => {
    try {
      await axios.delete('/api/admin/timeslots', { data: { id } });
      showToast('ลบช่วงเวลาเรียบร้อยแล้ว');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'ไม่สามารถลบช่วงเวลาได้', 'error');
    }
  };

  // Direct Edit Slot Save (Using PUT)
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    if (editingSlot.start_time >= editingSlot.end_time) {
      return showToast('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด', 'error');
    }

    setSavingEdit(true);
    try {
      await axios.put('/api/admin/timeslots', {
        id: editingSlot.id,
        start_time: editingSlot.start_time,
        end_time: editingSlot.end_time
      });
      showToast('แก้ไขช่วงเวลาสำเร็จ');
      setEditingSlot(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'ไม่สามารถแก้ไขช่วงเวลาได้', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Copy Timeslots Submit
  const handleCopySubmit = async (e) => {
    e.preventDefault();
    if (!copyModal.sourceCourtId || !copyModal.targetCourt?.id) {
      return showToast('กรุณาเลือกสนามต้นทาง', 'error');
    }

    setCopying(true);
    try {
      const res = await axios.post('/api/admin/timeslots/copy', {
        source_court_id: copyModal.sourceCourtId,
        target_court_id: copyModal.targetCourt.id,
        replace_existing: copyModal.replaceExisting
      });
      showToast(res.data?.message || 'คัดลอกช่วงเวลาสำเร็จ');
      setCopyModal({ isOpen: false, targetCourt: null, sourceCourtId: '', replaceExisting: true });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'ไม่สามารถคัดลอกช่วงเวลาได้', 'error');
    } finally {
      setCopying(false);
    }
  };

  // Clear All Timeslots Submit
  const handleClearConfirm = async () => {
    if (!clearModal.court?.id) return;
    setClearing(true);
    try {
      const res = await axios.post('/api/admin/timeslots/clear', {
        court_id: clearModal.court.id
      });
      showToast(res.data?.message || 'ลบช่วงเวลาทั้งหมดสำเร็จ');
      setClearModal({ isOpen: false, court: null });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'ไม่สามารถลบช่วงเวลาทั้งหมดได้', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-red-600 text-white shadow-red-500/20'
                : 'bg-slate-900 text-white shadow-black/30 border border-slate-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} className="text-emerald-400" />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-gray-900 text-xl flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold shadow-sm">
              <Clock size={20} />
            </div>
            จัดการช่วงเวลาเปิดให้บริการ (Timeslots)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            กำหนดรอบเวลาที่อนุญาตให้ผู้ใช้บริการจองสนาม พร้อมระบบสร้างเวลาอัตโนมัติ (Bulk Generate) และคัดลอกตารางเวลา
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-2xl border border-gray-200 shadow-sm transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Top Action Hub: Toggle between Bulk Generate & Quick Single Slot */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
              activeTab === 'bulk'
                ? 'bg-white text-brand-600 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <Sparkles size={15} className={activeTab === 'bulk' ? 'text-brand-600' : 'text-gray-400'} />
            สร้างเวลาอัตโนมัติ (Bulk Generate)
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-200">
              แนะนำสำหรับเปิดสนามใหม่
            </span>
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
              activeTab === 'single'
                ? 'bg-white text-brand-600 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <Plus size={15} className={activeTab === 'single' ? 'text-brand-600' : 'text-gray-400'} />
            เพิ่มทีละช่วงเวลา (Quick Add)
          </button>
        </div>

        {/* Tab 1: Bulk Generator */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkGenerate} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Target Court */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">สนามเป้าหมาย</label>
                <select
                  value={bulkConfig.targetCourtId}
                  onChange={e => setBulkConfig({ ...bulkConfig, targetCourtId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sport_name || c.type || 'ทั่วไป'}) · {c.id}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none text-[11px] font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={bulkConfig.applyToAllInSport}
                    onChange={e => setBulkConfig({ ...bulkConfig, applyToAllInSport: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400 border-gray-300"
                  />
                  <span>สร้างให้กับทุกสนามในหมวดเดียวกันพร้อมกัน</span>
                </label>
              </div>

              {/* Start Time (24h) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เวลาเปิด (เริ่ม)</label>
                <input
                  type="time"
                  required
                  value={bulkConfig.startTime}
                  onChange={e => setBulkConfig({ ...bulkConfig, startTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                />
              </div>

              {/* End Time (24h) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เวลาปิด (สิ้นสุด)</label>
                <input
                  type="time"
                  required
                  value={bulkConfig.endTime}
                  onChange={e => setBulkConfig({ ...bulkConfig, endTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                />
              </div>

              {/* Slot Duration */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ระยะเวลาต่อรอบ</label>
                <select
                  value={bulkConfig.durationMinutes}
                  onChange={e => setBulkConfig({ ...bulkConfig, durationMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                >
                  <option value={30}>30 นาที</option>
                  <option value={45}>45 นาที</option>
                  <option value={60}>1 ชั่วโมง (60 นาที)</option>
                  <option value={90}>1.5 ชั่วโมง (90 นาที)</option>
                  <option value={120}>2 ชั่วโมง (120 นาที)</option>
                </select>
              </div>
            </div>

            {/* Live Preview Bar */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-600" />
                  ตัวอย่างช่วงเวลาที่จะถูกสร้าง ({previewBulkSlots.length} ช่วงเวลา)
                </span>
                <span className="text-[11px] text-gray-400 font-mono">ระบบจะข้ามช่วงเวลาที่มีอยู่แล้วโดยอัตโนมัติ</span>
              </div>

              {previewBulkSlots.length === 0 ? (
                <p className="text-xs text-red-500 font-semibold py-2">
                  ⚠️ เวลาเปิดต้องน้อยกว่าเวลาปิดอย่างน้อย {bulkConfig.durationMinutes} นาที
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                  {previewBulkSlots.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-[11px] font-mono font-bold text-gray-700 shadow-2xs"
                    >
                      {s.start_time} - {s.end_time}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                disabled={generatingBulk || previewBulkSlots.length === 0}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-brand-500/25 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingBulk ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>สร้าง {previewBulkSlots.length} ช่วงเวลารวดเดียว</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Quick Single Slot */}
        {activeTab === 'single' && (
          <form onSubmit={handleAddSingleSlot} className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เลือกสนาม</label>
                <select
                  value={singleSlot.court_id}
                  onChange={e => setSingleSlot({ ...singleSlot, court_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เวลาเริ่ม (24 ชม.)</label>
                <input
                  type="time"
                  required
                  value={singleSlot.start_time}
                  onChange={e => setSingleSlot({ ...singleSlot, start_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เวลาสิ้นสุด (24 ชม.)</label>
                <input
                  type="time"
                  required
                  value={singleSlot.end_time}
                  onChange={e => setSingleSlot({ ...singleSlot, end_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none transition"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingSingle}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-brand-500/25 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingSingle ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={15} />}
                  เพิ่มช่วงเวลา
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Filter Bar (Point 4: Filter Pills) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
              selectedSport === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
            }`}
          >
            <Layers size={13} />
            <span>ดูทั้งหมด</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedSport === 'all' ? 'bg-slate-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {courts.length}
            </span>
          </button>

          {sportsList.map(sport => (
            <button
              key={sport.name}
              onClick={() => setSelectedSport(sport.name)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                selectedSport === sport.name
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
              }`}
            >
              <span>{sport.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedSport === sport.name ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {sport.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสนาม..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-brand-400 outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Court Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-200">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-gray-500">กำลังโหลดช่วงเวลาของสนาม...</p>
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 text-gray-400">
          <Filter size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-bold text-gray-600">ไม่พบสนามที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนหมวดหมู่หรือคำค้นหา</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCourts.map(court => {
            const courtSlots = (groupedSlots[court.id] || []).sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );

            return (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3.5 mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 text-brand-600 flex items-center justify-center font-bold border border-orange-100/70 shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-base leading-snug">{court.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md">
                            {court.sport_name || court.type || 'ทั่วไป'}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400 font-medium">ID: {court.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Header Buttons */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded-xl">
                        {courtSlots.length} ช่วงเวลา
                      </span>

                      {/* Copy from another court (Point 3) */}
                      <button
                        onClick={() => setCopyModal({
                          isOpen: true,
                          targetCourt: court,
                          sourceCourtId: courts.find(c => c.id !== court.id && (groupedSlots[c.id]?.length || 0) > 0)?.id || '',
                          replaceExisting: true
                        })}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 hover:border-brand-200 transition"
                        title="คัดลอกตารางเวลาจากสนามอื่น"
                      >
                        <Copy size={12} />
                        <span>คัดลอกเวลา</span>
                      </button>

                      {/* Clear All Slots (Point 4) */}
                      {courtSlots.length > 0 && (
                        <button
                          onClick={() => setClearModal({ isOpen: true, court })}
                          className="flex items-center gap-1 px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition"
                          title="ลบเวลาทั้งหมดของสนามนี้"
                        >
                          <Trash2 size={12} />
                          <span>ล้างทั้งหมด</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timeslot Chips Container (Point 1: Timeslot Chips) */}
                  <div>
                    {courtSlots.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                        <Clock size={24} className="mx-auto text-gray-300 mb-1.5" />
                        <p className="text-xs font-bold text-gray-500">ยังไม่มีช่วงเวลาเปิดให้บริการ</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          ใช้เครื่องมือ "สร้างเวลาอัตโนมัติ" หรือกด "คัดลอกเวลา" จากสนามอื่น
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {courtSlots.map(ts => (
                          <div
                            key={ts.id}
                            className="group relative flex items-center gap-2 px-3 py-1.5 bg-[#F1F3F5] hover:bg-[#FEEFEA] text-gray-800 hover:text-brand-900 border border-gray-200/60 hover:border-brand-300 rounded-xl transition-all duration-200 select-none shadow-2xs"
                          >
                            <Clock size={12} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                            <span className="font-mono text-xs font-bold">
                              {ts.start_time.substring(0, 5)} - {ts.end_time.substring(0, 5)}
                            </span>

                            {/* Direct Action Icons revealed on Hover */}
                            <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-gray-300/60 group-hover:border-brand-200">
                              <button
                                onClick={() => setEditingSlot({ ...ts })}
                                className="p-1 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white transition"
                                title="แก้ไขช่วงเวลานี้"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(ts.id)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white transition"
                                title="ลบช่วงเวลานี้"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subfooter */}
                {courtSlots.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>รอบแรก: {courtSlots[0].start_time.substring(0, 5)} น.</span>
                    <span>รอบสุดท้าย: {courtSlots[courtSlots.length - 1].end_time.substring(0, 5)} น.</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Timeslot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Edit2 size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">แก้ไขช่วงเวลาเปิดบริการ</h3>
                  <p className="text-[11px] text-gray-400 font-mono">ID: {editingSlot.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 mb-4 text-xs font-semibold text-gray-700">
              สนาม: <span className="font-bold text-gray-900">{courts.find(c => c.id === editingSlot.court_id)?.name || editingSlot.court_id}</span>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลาเริ่ม (24 ชม.)</label>
                  <input
                    type="time"
                    required
                    value={editingSlot.start_time}
                    onChange={e => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลาสิ้นสุด (24 ชม.)</label>
                  <input
                    type="time"
                    required
                    value={editingSlot.end_time}
                    onChange={e => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Copy Modal (Point 3: Copy from other court) */}
      {copyModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-brand-600 flex items-center justify-center font-bold">
                  <Copy size={15} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">คัดลอกตารางเวลาจากสนามอื่น</h3>
                  <p className="text-[11px] text-gray-500">นำตารางเวลาของสนามต้นทางมาใส่ในสนามนี้</p>
                </div>
              </div>
              <button
                onClick={() => setCopyModal({ isOpen: false, targetCourt: null, sourceCourtId: '', replaceExisting: true })}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCopySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">สนามปลายทาง (ที่จะรับเวลา)</label>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-bold text-gray-900">
                  {copyModal.targetCourt?.name} ({copyModal.targetCourt?.id})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เลือกสนามต้นทาง (ที่จะคัดลอกมา)</label>
                <select
                  value={copyModal.sourceCourtId}
                  onChange={e => setCopyModal({ ...copyModal, sourceCourtId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-400 outline-none"
                >
                  <option value="">-- เลือกสนามต้นทาง --</option>
                  {courts
                    .filter(c => c.id !== copyModal.targetCourt?.id)
                    .map(c => {
                      const count = (groupedSlots[c.id] || []).length;
                      return (
                        <option key={c.id} value={c.id} disabled={count === 0}>
                          {c.name} ({count} ช่วงเวลา) {count === 0 ? '- ไม่มีช่วงเวลา' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={copyModal.replaceExisting}
                    onChange={e => setCopyModal({ ...copyModal, replaceExisting: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400 border-gray-300"
                  />
                  <span>ลบช่วงเวลาเดิมของสนามปลายทางทั้งหมดก่อนคัดลอก</span>
                </label>
                <p className="text-[10px] text-gray-500 mt-1 ml-6">
                  {copyModal.replaceExisting
                    ? '⚠️ ช่วงเวลาปัจจุบันของสนามปลายทางจะถูกแทนที่ด้วยตารางของสนามต้นทาง'
                    : 'ช่วงเวลาที่คัดลอกจะถูกนำมารวมกับของเดิม (ไม่ทับซ้อน)'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCopyModal({ isOpen: false, targetCourt: null, sourceCourtId: '', replaceExisting: true })}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={copying || !copyModal.sourceCourtId}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {copying ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                  <span>{copying ? 'กำลังคัดลอก...' : 'ยืนยันการคัดลอก'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Clear Confirmation Modal (Point 4: Clear All) */}
      {clearModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-extrabold text-gray-900 text-base mb-1">ยืนยันการลบช่วงเวลาทั้งหมด?</h3>
            <p className="text-xs text-gray-500 mb-5">
              คุณกำลังจะลบช่วงเวลาเปิดให้บริการทั้งหมดของ{' '}
              <span className="font-bold text-gray-800">"{clearModal.court?.name}"</span>{' '}
              (การกระทำนี้ไม่สามารถย้อนกลับได้)
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClearModal({ isOpen: false, court: null })}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearConfirm}
                disabled={clearing}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {clearing ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{clearing ? 'กำลังลบ...' : 'ยืนยันลบทั้งหมด'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
