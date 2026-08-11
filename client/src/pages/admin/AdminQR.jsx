import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, QrCode, ExternalLink, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function AdminQR() {
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    if (selectedCourtId) {
      fetchToken();
    }
  }, [selectedCourtId]);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/courts');
      setCourts(res.data || []);
      if (res.data.length > 0) {
        setSelectedCourtId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchToken = async () => {
    try {
      const res = await axios.get(`/api/qrToken?court_id=${selectedCourtId}`);
      setQrPayload(res.data.qr_payload || '');
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCourt = courts.find((c) => c.id === selectedCourtId) || courts[0];

  const handleOpenPrintPage = () => {
    window.open(`/admin/qr-print?court_id=${selectedCourtId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
          <QrCode size={20} className="text-brand-600" /> สร้างโปสเตอร์ QR Code ประจำสนาม
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">สร้างโปสเตอร์พิมพ์ติดหน้าสนามสำหรับสแกนเช็คอินก่อนเข้าเล่นกีฬา</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Controls */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกสนาม</label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-1.5 font-medium">
            <p><span className="font-bold text-gray-900">สนาม:</span> {selectedCourt?.name || '-'}</p>
            <p><span className="font-bold text-gray-900">ประเภท:</span> {selectedCourt?.sport_name || selectedCourt?.type || '-'}</p>
            <p><span className="font-bold text-gray-900">พิกัด GPS:</span> {selectedCourt?.latitude || '-'}, {selectedCourt?.longitude || '-'}</p>
            <p><span className="font-bold text-gray-900">รัศมีเช็คอิน:</span> 30 เมตร</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleOpenPrintPage}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition active:scale-[0.98]"
            >
              <ExternalLink size={15} /> เปิดหน้าพิมพ์ / บันทึกโปสเตอร์
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenPrintPage}
                className="py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Printer size={14} /> พิมพ์
              </button>
              <Link
                to={`/admin/qr-print?court_id=${selectedCourtId}`}
                target="_blank"
                className="py-2.5 bg-white border-2 border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Eye size={14} /> ดูตัวอย่าง
              </Link>
            </div>
          </div>
        </div>

        {/* Poster Preview Area (mini preview) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center">
          <p className="text-xs text-gray-400 font-bold mb-4">ตัวอย่างโปสเตอร์ (ย่อ)</p>

          {/* Mini poster preview */}
          <div
            className="cursor-pointer hover:shadow-2xl transition-shadow duration-300 rounded-2xl overflow-hidden"
            onClick={handleOpenPrintPage}
            title="คลิกเพื่อเปิดหน้าพิมพ์"
            style={{
              width: 320,
              height: 455,
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #ff3f3f 0%, #ff7045 45%, #e98043 100%)',
              fontFamily: "'Prompt', sans-serif",
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            {/* Decorative stripe */}
            <div style={{
              position: 'absolute', width: '120%', height: 80, top: -18, left: 53,
              background: 'rgba(255,255,255,0.10)', transform: 'rotate(-45deg)',
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', color: 'white', paddingTop: 18, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src="/kku-logo.png"
                alt="Logo"
                style={{ width: 55, height: 'auto', opacity: 0.98, marginBottom: 6, display: 'block', margin: '0 auto 6px auto' }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/official_logo.png'; }}
              />
              <div style={{ color: '#0d2956', fontSize: 26, fontWeight: 700, marginTop: 2 }}>KKU SportPass</div>
              <div style={{ color: '#0d2956', fontSize: 13, fontWeight: 600, marginTop: 2 }}>สแกน QR Code หน้าสนามเพื่อเช็คอิน</div>
            </div>

            {/* QR Card */}
            <div style={{
              width: 258, height: 258,
              background: 'white',
              margin: '14px auto 0',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              position: 'relative', zIndex: 1,
            }}>
              {qrPayload ? (
                <QRCodeSVG value={qrPayload} size={204} level="H" />
              ) : (
                <div style={{ width: 204, height: 204, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12 }}>
                  กำลังสร้าง QR...
                </div>
              )}
            </div>

            {/* Bottom Card */}
            <div style={{
              width: 258, height: 82,
              margin: '12px auto 0',
              background: 'white',
              borderRadius: 12,
              position: 'relative', zIndex: 1,
              boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
            }}>
              {/* SportPass badge */}
              <img
                src="/KKU_SportPass.svg"
                alt="Logo"
                style={{
                  position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                  top: -21, width: 44, height: 44, objectFit: 'contain',
                  background: 'white', borderRadius: '50%', padding: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/KKU_SportPass.png'; }}
              />
              <div style={{ position: 'absolute', left: 14, bottom: 12, color: '#0d2956' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedCourt?.name || '[ชื่อสนาม]'}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>รหัสสนาม : {selectedCourt?.id || '...'}</div>
              </div>
              {/* Mini towers */}
              <div style={{ position: 'absolute', right: 22, bottom: 9, display: 'flex', gap: 10 }}>
                <div style={{
                  width: 23, height: 52,
                  background: 'linear-gradient(to top, rgba(255,170,150,0.25), rgba(255,170,150,0.55))',
                  clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
                }} />
                <div style={{
                  width: 23, height: 58,
                  background: 'linear-gradient(to top, rgba(255,170,150,0.25), rgba(255,170,150,0.55))',
                  clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
                }} />
              </div>
            </div>
          </div>

          {/* QR Payload */}
          <textarea
            readOnly
            value={qrPayload}
            className="mt-6 w-full max-w-sm h-16 bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] font-mono text-gray-500"
          />
        </div>
      </div>
    </div>
  );
}
