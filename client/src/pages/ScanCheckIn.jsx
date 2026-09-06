import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { QrCode, MapPin, CheckCircle2, AlertCircle, RefreshCw, Camera, X, WifiOff } from 'lucide-react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { useLanguage } from '../context/LanguageContext';

export default function ScanCheckIn() {
  const { t } = useLanguage();
  // ---- State ----
  const [coords, setCoords] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [qrPayload, setQrPayload] = useState('');

  // ---- Refs ----
  const coordsRef = useRef(null);
  const scannerRef = useRef(null);
  const isMounted = useRef(true);

  // ---- GPS ----
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError('อุปกรณ์ของคุณไม่รองรับ GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMounted.current) return;
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(newCoords);
        coordsRef.current = newCoords;
        setError('');
      },
      (err) => {
        if (!isMounted.current) return;
        console.warn('GPS error:', err);
        if (err.code === 1) {
          setPermissionDenied(true);
          setError('กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS ในเว็บเบราว์เซอร์');
        } else {
          setError('ไม่สามารถรับตำแหน่ง GPS ได้ กรุณาลองใหม่');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    fetchLocation();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ---- Scanner ----
  const startScanner = async () => {
    // ตรวจสอบสิทธิ์กล้องก่อน
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      setCameraError('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้อง');
      return;
    }

    setCameraError('');
    setError('');
    setIsScanning(true); // Unhide the reader element first

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          onScanSuccess,
          () => {
            // ignore (no QR in frame)
          }
        );
      } catch (err) {
        console.error(err);
        setCameraError('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง');
        setIsScanning(false);
      }
    }, 100);
  };

  const onScanSuccess = async (decodedText) => {
    // หยุดสแกนทันที
    await stopScanner();

    setQrPayload(decodedText);
    setLoading(true);
    setError('');

    try {
      const payload = {
        qr_payload: decodedText,
        lat: coordsRef.current?.lat ?? null,
        lng: coordsRef.current?.lng ?? null,
      };

      const res = await axios.post('/api/checkin', payload);

      if (res.data?.success) {
        setResult(res.data);
      } else {
        setError(res.data?.message || 'เช็คอินไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการเช็คอิน';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        // ไม่ทำ destroy เพื่อให้สามารถเริ่มใหม่ได้
      } catch {
        // ignore
      }
    }
    setIsScanning(false);
  };

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  // ---- Reset ----
  const handleReset = () => {
    setResult(null);
    setError('');
    setQrPayload('');
    // ปิดกล้องถ้าค้าง
    if (isScanning) {
      stopScanner();
    }
  };

  // ---- Render ----
  return (
    <div className="max-w-lg mx-auto px-4 py-6 w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">{t('scan_title', 'เช็คอินเข้าใช้งาน')}</h2>
        <p className="text-xs text-gray-500 mt-1">{t('scan_subtitle', 'สแกน QR Code หน้าสนาม พร้อมยืนยันตำแหน่งพิกัด GPS')}</p>
      </motion.div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        {result ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-3" />
            <h4 className="font-extrabold text-lg">{t('scan_success_title', 'เช็คอินสำเร็จ!')}</h4>
            {result.distance_m !== undefined && (
              <p className="text-sm font-semibold mt-1">ระยะห่างจากสนาม: {result.distance_m} เมตร</p>
            )}
            {result.field_name && (
              <p className="text-xs text-emerald-700 mt-1">สนาม: {result.field_name}</p>
            )}
            <button
              onClick={handleReset}
              className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              {t('btn_search', 'สแกนอีกครั้ง')}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-sm border border-brand-100">
                <QrCode size={28} />
              </div>
              <h3 className="font-extrabold text-gray-900 text-sm">QR Code + GPS Verification</h3>
            </div>

            {/* Error messages */}
            {(error || cameraError) && (
              <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold border border-red-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="flex-1">{error || cameraError}</p>
              </div>
            )}

            {permissionDenied && (
              <div className="mb-4 bg-amber-50 text-amber-700 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold border border-amber-200">
                <WifiOff size={18} className="shrink-0 mt-0.5" />
                <p className="flex-1">
                  ไม่อนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิด Location Service และรีเฟรชหน้าเว็บ
                </p>
              </div>
            )}

            {/* Scanner area */}
            <div className="mb-6 relative">
              <div
                className={`bg-gray-50 border-2 border-dashed ${isScanning ? 'border-brand-300 bg-black/5' : 'border-gray-300'
                  } rounded-3xl overflow-hidden relative transition-all duration-300 min-h-[280px]`}
              >
                <div
                  id="reader"
                  className={`w-full ${isScanning ? 'block' : 'hidden'} [&>video]:w-full [&>video]:h-auto [&>video]:object-cover`}
                />

                {!isScanning && (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-4 min-h-[280px]">
                    <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center text-gray-400 mb-4">
                      <Camera size={28} />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1">{t('scan_btn_start', 'เปิดกล้องสแกน')}</h4>
                    <p className="text-xs text-gray-500 mb-5">{t('scan_subtitle', 'กรุณาเปิดกล้องเพื่อสแกน QR Code')}</p>
                    <button
                      onClick={startScanner}
                      className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Camera size={18} />
                      {t('scan_btn_start', 'เปิดกล้องสแกน')}
                    </button>
                  </div>
                )}

                {isScanning && (
                  <button
                    onClick={stopScanner}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors z-50"
                    title={t('scan_btn_stop', 'ปิดกล้อง')}
                  >
                    <X size={20} />
                  </button>
                )}

                {loading && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3 shadow-md" />
                    <p className="text-sm font-bold text-brand-800 animate-pulse">{t('bookings_action_loading', 'กำลังตรวจสอบข้อมูล...')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* GPS info */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2.5">
                <MapPin size={18} className="text-brand-600" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{t('scan_gps_status', 'สถานะ GPS')}</p>
                  <span className="text-xs font-bold text-gray-700">
                    {coords
                      ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} (${t('scan_gps_ready', 'พร้อมระบุตำแหน่ง')})`
                      : permissionDenied
                        ? '⚠️ ไม่อนุญาต'
                        : t('scan_gps_waiting', 'กำลังดึงพิกัด GPS...')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLocation}
                className="p-2.5 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition shadow-sm"
                title="ดึงตำแหน่งอีกครั้ง"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* QR payload debug (optional) */}
            {qrPayload && (
              <div className="mt-3 text-[10px] text-gray-400 break-all bg-gray-50 p-2 rounded-lg border border-gray-200">
                QR: {qrPayload}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}