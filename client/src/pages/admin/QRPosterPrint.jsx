import { useState, useEffect, useRef, forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import axios from 'axios';

export default function QRPosterPrint() {
  const [searchParams] = useSearchParams();
  const courtId = searchParams.get('court_id');
  const [court, setCourt] = useState(null);
  const [qrPayload, setQrPayload] = useState('');
  const [loading, setLoading] = useState(true);
  const posterRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courtsRes, tokenRes] = await Promise.all([
          axios.get('/api/admin/courts'),
          axios.get(`/api/qrToken?court_id=${courtId}`)
        ]);
        const found = (courtsRes.data || []).find(c => c.id === courtId);
        setCourt(found || { id: courtId, name: courtId });
        setQrPayload(tokenRes.data.qr_payload || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (courtId) {
      fetchData();
    }
  }, [courtId]);

  const handlePrint = () => window.print();

  const handleSavePNG = async () => {
    const poster = posterRef.current;
    if (!poster) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(poster, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `QR_Poster_${court?.name || courtId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Control Bar — hidden on print */}
      <div className="print-hide bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/qr" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-extrabold text-gray-900 text-sm">โปสเตอร์ QR Code — {court?.name || '-'}</h1>
              <p className="text-[11px] text-gray-400 font-medium">ขนาดพอดี A4</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSavePNG} className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition">
              <Download size={14} /> บันทึก PNG
            </button>
            <button onClick={handlePrint} className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
              <Printer size={14} /> พิมพ์
            </button>
          </div>
        </div>
      </div>

      {/* Screen preview — centered with scale fitting */}
      <div className="print-hide min-h-screen bg-gray-100 flex items-center justify-center py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ width: '210mm', height: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
          <PosterA4 ref={posterRef} court={court} courtId={courtId} qrPayload={qrPayload} />
        </div>
      </div>

      {/* Print-only: fills exact single A4 page */}
      <div className="print-only">
        <PosterA4 court={court} courtId={courtId} qrPayload={qrPayload} />
      </div>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .print-only { display: block !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </>
  );
}

/* ─── Exact A4 Poster (210mm × 297mm) ─── */
const PosterA4 = forwardRef(function PosterA4({ court, courtId, qrPayload }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: '210mm',
        height: '297mm',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ff3f3f 0%, #ff7045 45%, #e98043 100%)',
        fontFamily: "'Prompt', 'Noto Sans Thai', sans-serif",
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        pageBreakAfter: 'avoid',
      }}
    >
      {/* ─ Decorative diagonal stripes ─ */}
      <div style={{ position: 'absolute', width: '130%', height: 200, top: -50, left: 140, background: 'rgba(255,255,255,0.10)', transform: 'rotate(-45deg)' }} />
      <div style={{ position: 'absolute', width: '130%', height: 170, bottom: -50, right: -200, background: 'rgba(255,255,255,0.08)', transform: 'rotate(-45deg)' }} />

      {/* ─ Header ─ */}
      <div style={{ textAlign: 'center', color: 'white', paddingTop: '36px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Official KKU Logo (1. official logo 2022-19.png) centered */}
        <img
          src="/kku-logo.png"
          alt="Khon Kaen University Logo"
          style={{ width: 125, height: 'auto', opacity: 0.98, marginBottom: 12, display: 'block', margin: '0 auto 12px auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
          onError={(e) => { e.target.onerror = null; e.target.src = '/official_logo.png'; }}
        />
        <div style={{ color: '#0d2956', fontSize: 58, fontWeight: 700, marginTop: 4, lineHeight: 1 }}>KKU SportPass</div>
        <div style={{ color: '#0d2956', fontSize: 30, fontWeight: 600, marginTop: 6 }}>สแกน QR Code หน้าสนามเพื่อเช็คอิน</div>
      </div>

      {/* ─ QR Card ─ */}
      <div style={{
        width: '560px', height: '560px',
        background: 'white',
        margin: '30px auto 0',
        borderRadius: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 18px 45px rgba(0,0,0,0.15), inset 0 0 25px rgba(255,180,180,0.35)',
        position: 'relative', zIndex: 1,
      }}>
        {qrPayload ? (
          <QRCodeSVG value={qrPayload} size={450} level="H" />
        ) : (
          <div style={{ width: 450, height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 18 }}>
            กำลังสร้าง QR Code...
          </div>
        )}
      </div>

      {/* ─ Bottom Card ─ */}
      <div style={{
        width: '560px', height: '180px',
        margin: '26px auto 0',
        background: 'white',
        borderRadius: 25,
        position: 'relative', zIndex: 1,
        boxShadow: '0 18px 40px rgba(0,0,0,0.12), inset 0 0 22px rgba(255,180,180,0.30)',
      }}>
        {/* SportPass logo badge */}
        <img
          src="/KKU_SportPass.svg"
          alt="SportPass Logo"
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            top: -46, width: 95, height: 95, objectFit: 'contain',
            background: 'white', borderRadius: '50%', padding: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
          onError={(e) => { e.target.onerror = null; e.target.src = '/KKU_SportPass.png'; }}
        />

        {/* Court Info */}
        <div style={{ position: 'absolute', left: 30, bottom: 26, color: '#0d2956' }}>
          <h2 style={{ fontSize: 34, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>{court?.name || '[ชื่อสนาม]'}</h2>
          <p style={{ fontSize: 28, fontWeight: 500, margin: 0, marginTop: 4 }}>รหัสสนาม : {courtId || '...'}</p>
        </div>

        {/* Decorative towers */}
        <div style={{ position: 'absolute', right: 45, bottom: 20, display: 'flex', gap: 20 }}>
          <div style={{
            width: 48, height: 112,
            background: 'linear-gradient(to top, rgba(255,170,150,0.25), rgba(255,170,150,0.55))',
            clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
          }} />
          <div style={{
            width: 48, height: 124,
            background: 'linear-gradient(to top, rgba(255,170,150,0.25), rgba(255,170,150,0.55))',
            clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0 100%, 0 12%)',
          }} />
        </div>
      </div>
    </div>
  );
});
