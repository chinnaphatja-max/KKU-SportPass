import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Printer, QrCode, ExternalLink, Eye, MapPin, Search, 
  ShieldCheck, Check, Copy, Download, Sparkles, Navigation, Layers 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SPORT_FILTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'badminton', label: 'แบดมินตัน' },
  { value: 'futsal', label: 'ฟุตซอล' },
  { value: 'basketball', label: 'บาสเกตบอล' },
  { value: 'tennis', label: 'เทนนิส' },
  { value: 'swimming', label: 'ว่ายน้ำ' },
  { value: 'volleyball', label: 'วอลเลย์บอล' },
  { value: 'archery', label: 'ยิงธนู' },
  { value: 'fitness', label: 'ฟิตเนส' },
];

export default function AdminQR() {
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [copied, setCopied] = useState(false);
  const qrSvgRef = useRef(null);

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/courts');
      const data = res.data || [];
      setCourts(data);
      if (data.length > 0 && !selectedCourtId) {
        setSelectedCourtId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourtId]);

  const fetchToken = useCallback(async () => {
    if (!selectedCourtId) return;
    try {
      const res = await axios.get(`/api/qrToken?court_id=${selectedCourtId}`);
      setQrPayload(res.data.qr_payload || '');
    } catch (err) {
      console.error(err);
    }
  }, [selectedCourtId]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const selectedCourt = courts.find((c) => c.id === selectedCourtId) || courts[0];

  const handleOpenPrintPage = () => {
    window.open(`/admin/qr-print?court_id=${selectedCourtId}`, '_blank');
  };

  const handleCopyPayload = () => {
    if (!qrPayload) return;
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredCourts = courts.filter(c => {
    const matchSearch = !search.trim() || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchSport = sportFilter === 'all' || c.type === sportFilter;
    return matchSearch && matchSport;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-gray-900 text-xl tracking-tight flex items-center gap-2">
            <QrCode size={22} className="text-[#fe6e00]" />
            สร้างโปสเตอร์ QR Code ประจำสนาม
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            สร้างป้ายโปสเตอร์สำหรับติดหน้าสนาม เพื่อให้นิสิตและบุคลากรใช้สแกนเช็คอินควบคู่กับระบบ Geofencing GPS (ระยะ 30 เมตร)
          </p>
        </div>

        <button
          onClick={handleOpenPrintPage}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fe6e00] hover:bg-[#e06100] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 transition active:scale-95"
        >
          <Printer size={15} />
          <span>พิมพ์ / บันทึกโปสเตอร์ A4</span>
        </button>
      </div>

      {/* Main Grid: Controls vs Live Poster Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
        {/* Left Column: Court Selector & Information */}
        <div className="space-y-4">
          {/* Card 1: Facility Selector */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#fe6e00]" /> เลือกสนามที่ต้องการสร้าง QR
              </label>
              <span className="text-[11px] text-gray-400 font-bold">
                {filteredCourts.length} สนาม
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสนาม หรือรหัส ID..."
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#fe6e00]/40 outline-none transition"
              />
            </div>

            {/* Sport Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SPORT_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setSportFilter(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                    sportFilter === f.value
                      ? 'bg-orange-50 text-[#fe6e00] border border-orange-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Court Dropdown */}
            <div>
              <select
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
              >
                {filteredCourts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card 2: Field Details & Verification */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider border-b border-gray-100 pb-2">
              ข้อมูลสนามและความปลอดภัย
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">ชื่อสนาม</span>
                <span className="font-extrabold text-gray-900">{selectedCourt?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">รหัสประจำสนาม</span>
                <span className="font-mono font-bold text-[#fe6e00] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                  {selectedCourt?.id || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">ประเภทกีฬา</span>
                <span className="font-bold text-gray-700">{selectedCourt?.sport_name || selectedCourt?.type || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">พิกัด GPS</span>
                <span className="font-mono text-[11px] text-gray-700 font-semibold">
                  {selectedCourt?.latitude || '-'}, {selectedCourt?.longitude || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/60">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> รัศมีเช็คอิน GPS
                </span>
                <span className="font-mono font-extrabold">30 เมตร</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCopyPayload}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'คัดลอกรหัส Token แล้ว!' : 'คัดลอก QR Payload Token'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPrintPage}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Printer size={13} /> พิมพ์ A4
                </button>
                <Link
                  to={`/admin/qr-print?court_id=${selectedCourtId}`}
                  target="_blank"
                  className="py-2.5 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                >
                  <Eye size={13} /> พรีวิวเต็มจอ
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Poster Studio Preview */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-5">
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#fe6e00]" /> ตัวอย่างโปสเตอร์ขนาดมาตรฐาน (A4 Preview)
            </span>
            <button
              onClick={handleOpenPrintPage}
              className="text-xs font-extrabold text-[#fe6e00] hover:underline flex items-center gap-1"
            >
              เปิดหน้าสั่งพิมพ์ <ExternalLink size={12} />
            </button>
          </div>

          {/* Mini Poster Replica */}
          <div
            onClick={handleOpenPrintPage}
            title="คลิกเพื่อเปิดหน้าพิมพ์ A4 ฉบับจริง"
            className="cursor-pointer hover:scale-[1.01] transition-transform duration-300 rounded-2xl overflow-hidden shadow-xl"
            style={{
              width: 330,
              height: 470,
              position: 'relative',
              background: 'linear-gradient(135deg, #ff4500 0%, #fe6e00 50%, #ffa500 100%)',
              fontFamily: "'Prompt', sans-serif",
            }}
          >
            {/* Glossy light effect */}
            <div style={{
              position: 'absolute', width: '130%', height: 90, top: -20, left: 40,
              background: 'rgba(255,255,255,0.12)', transform: 'rotate(-45deg)',
            }} />

            {/* Poster Header */}
            <div style={{ textAlign: 'center', color: 'white', paddingTop: 20, position: 'relative', zIndex: 1 }}>
              <img
                src="/kku-logo.png"
                alt="Logo"
                style={{ width: 50, height: 'auto', opacity: 0.98, margin: '0 auto 6px auto', display: 'block' }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/official_logo.png'; }}
              />
              <div style={{ color: '#0d2956', fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
                KKU SportPass
              </div>
              <div style={{ color: '#0d2956', fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                สแกน QR Code หน้าสนามเพื่อเช็คอิน
              </div>
            </div>

            {/* QR Card Container */}
            <div style={{
              width: 260, height: 260,
              background: 'white',
              margin: '14px auto 0',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              position: 'relative', zIndex: 1,
            }}>
              {qrPayload ? (
                <QRCodeSVG value={qrPayload} size={210} level="H" ref={qrSvgRef} />
              ) : (
                <div style={{ width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>
                  กำลังโหลด QR...
                </div>
              )}
            </div>

            {/* Poster Bottom Card */}
            <div style={{
              width: 260, height: 86,
              margin: '12px auto 0',
              background: 'white',
              borderRadius: 14,
              position: 'relative', zIndex: 1,
              boxShadow: '0 8px 20px rgba(0,0,0,0.10)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {/* SportPass Round Emblem */}
              <img
                src="/KKU_SportPass.svg"
                alt="Logo"
                style={{
                  position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                  top: -20, width: 40, height: 40, objectFit: 'contain',
                  background: 'white', borderRadius: '50%', padding: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/KKU_SportPass.png'; }}
              />

              <div style={{ color: '#0d2956', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                  {selectedCourt?.name || '[ชื่อสนาม]'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fe6e00', marginTop: 2 }}>
                  รหัสสนาม : {selectedCourt?.id || '...'}
                </div>
                <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                  ต้องอยู่ห่างจากสนามไม่เกิน 30 ม.
                </div>
              </div>

              {/* Decorative KKU Silo Shape */}
              <div style={{ display: 'flex', gap: 6, opacity: 0.7 }}>
                <div style={{
                  width: 20, height: 46,
                  background: 'linear-gradient(to top, rgba(254,110,0,0.3), rgba(254,110,0,0.6))',
                  clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
                }} />
                <div style={{
                  width: 20, height: 52,
                  background: 'linear-gradient(to top, rgba(254,110,0,0.4), rgba(254,110,0,0.7))',
                  clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
                }} />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-4 text-center">
            💡 คลิกที่โปสเตอร์ หรือกดปุ่ม <strong>"พิมพ์ / บันทึกโปสเตอร์ A4"</strong> เพื่อเปิดหน้าต่างสั่งพิมพ์ขนาดจริง
          </p>
        </div>
      </div>
    </div>
  );
}
