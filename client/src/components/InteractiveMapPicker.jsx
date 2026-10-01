import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, MapPin, LocateFixed, Clipboard, Check, Search, 
  Layers, AlertCircle, Compass, X, Sparkles 
} from 'lucide-react';

// KKU Landmarks
const KKU_LANDMARKS = [
  { name: 'ศูนย์กีฬา 50 ปี มข.', lat: 16.4429, lng: 102.8252 },
  { name: 'สระว่ายน้ำ 50 ปี มข.', lat: 16.4422, lng: 102.8255 },
  { name: 'สนามกีฬากลาง มข. (ฟุตบอล/ลู่วิ่ง)', lat: 16.4448, lng: 102.8260 },
  { name: 'อาคารพลศึกษา 1', lat: 16.4435, lng: 102.8240 },
  { name: 'อาคารพลศึกษา 2 (ยิมเนเซียม)', lat: 16.4440, lng: 102.8235 },
  { name: 'สนามเทนนิส มข.', lat: 16.4418, lng: 102.8268 },
  { name: 'สนามยิงธนู มข.', lat: 16.4455, lng: 102.8275 },
  { name: 'ศูนย์ประชุมกาญจนาภิเษก', lat: 16.4526, lng: 102.8197 },
];

// Parser function for any coordinates format or Google Maps URLs
export function parseCoordinates(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();

  // 1. Google Maps @lat,lng e.g. https://www.google.com/maps/@16.4429,102.8252,17z
  const urlAtMatch = cleaned.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlAtMatch) {
    return { lat: parseFloat(urlAtMatch[1]), lng: parseFloat(urlAtMatch[2]) };
  }

  // 2. Google Maps URL ?q=lat,lng or ll=lat,lng
  const urlQMatch = cleaned.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlQMatch) {
    return { lat: parseFloat(urlQMatch[1]), lng: parseFloat(urlQMatch[2]) };
  }

  // 3. Decimal lat, lng (e.g. "16.443, 102.8253" or "16.443 102.8253")
  const decimalMatch = cleaned.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 4. DMS format e.g. 16°26'34.4"N 102°49'31.1"E
  const dmsRegex = /(\d+)°(\d+)'([\d.]+)"?([NS])[,\s]+(\d+)°(\d+)'([\d.]+)"?([EW])/i;
  const dmsMatch = cleaned.match(dmsRegex);
  if (dmsMatch) {
    let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10)/60 + parseFloat(dmsMatch[3])/3600;
    if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
    let lng = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10)/60 + parseFloat(dmsMatch[7])/3600;
    if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  }

  return null;
}

// Custom modern SVG Pin
const createCustomPinIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; transform: translate(-18px, -36px);">
        <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
          <path fill="#fe6e00" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="3" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

export default function InteractiveMapPicker({ lat, lng, onConfirm, onClose }) {
  const [currentLat, setCurrentLat] = useState(parseFloat(lat) || 16.4429);
  const [currentLng, setCurrentLng] = useState(parseFloat(lng) || 102.8252);
  const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'
  const [searchQuery, setSearchQuery] = useState('');
  const [smartInput, setSmartInput] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);
  const [locating, setLocating] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentLat || 16.4429;
    const initialLng = currentLng || 102.8252;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: true,
    });

    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(streetUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Draggable Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createCustomPinIcon(),
      draggable: true,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const nLat = Number(pos.lat.toFixed(6));
      const nLng = Number(pos.lng.toFixed(6));
      setCurrentLat(nLat);
      setCurrentLng(nLng);
      showToast(`เลื่อนหมุดไปยัง: ${nLat}, ${nLng}`);
    });

    // Click anywhere on map to move marker & get coordinates
    map.on('click', (e) => {
      const nLat = Number(e.latlng.lat.toFixed(6));
      const nLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([nLat, nLng]);
      setCurrentLat(nLat);
      setCurrentLng(nLng);
      showToast(`ปักหมุดที่: ${nLat}, ${nLng}`);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map type (street vs satellite)
  const toggleMapType = (type) => {
    setMapType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (type === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }
      ).addTo(mapInstanceRef.current);
    }
  };

  // Move marker & map to specific lat/lng
  const moveToCoordinates = (nLat, nLng, zoom = 17) => {
    setCurrentLat(nLat);
    setCurrentLng(nLng);
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([nLat, nLng]);
      mapInstanceRef.current.flyTo([nLat, nLng], zoom, { duration: 1.2 });
    }
  };

  // 1. One-click Paste from Clipboard
  const handleAutoPasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast('เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ดอัตโนมัติ กรุณาวางข้อความในช่องด้านล่างแทน', 'error');
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        showToast('คลิปบอร์ดว่างเปล่า กรุณาคัดลอกพิกัดจาก Google Maps ก่อน', 'error');
        return;
      }

      const parsed = parseCoordinates(clipText);
      if (parsed) {
        moveToCoordinates(parsed.lat, parsed.lng, 18);
        setSmartInput(clipText.trim());
        showToast(`✨ ดึงพิกัดอัตโนมัติสำเร็จ: ${parsed.lat}, ${parsed.lng}`);
      } else {
        showToast(`ไม่พบพิกัดในคลิปบอร์ด: "${clipText.substring(0, 35)}..."`, 'error');
      }
    } catch (err) {
      showToast('กรุณากดอนุญาตการเข้าถึงคลิปบอร์ด หรือวางในช่องด้านล่าง', 'error');
    }
  };

  // 2. Smart Input Change / Paste
  const handleSmartInputChange = (val) => {
    setSmartInput(val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      moveToCoordinates(parsed.lat, parsed.lng, 18);
      showToast(`✨ แยกพิกัดอัตโนมัติสำเร็จ: ${parsed.lat}, ${parsed.lng}`);
    }
  };

  // 3. Current GPS Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('อุปกรณ์ไม่รองรับการดึงพิกัด Geolocation', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nLat = Number(pos.coords.latitude.toFixed(6));
        const nLng = Number(pos.coords.longitude.toFixed(6));
        moveToCoordinates(nLat, nLng, 18);
        setLocating(false);
        showToast(`📍 ดึงพิกัด GPS สำเร็จ: ${nLat}, ${nLng}`);
      },
      (err) => {
        setLocating(false);
        showToast('ไม่สามารถดึงตำแหน่งได้: ' + err.message, 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 4. Search Place
  const handleSearchPlace = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    // First check local KKU landmarks
    const foundLocal = KKU_LANDMARKS.find(lm => 
      lm.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (foundLocal) {
      moveToCoordinates(foundLocal.lat, foundLocal.lng, 18);
      showToast(`🎯 พบสถานที่: ${foundLocal.name}`);
      return;
    }

    try {
      // Query OpenStreetMap Nominatim bounded to KKU area
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' ขอนแก่น')}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const nLat = Number(parseFloat(data[0].lat).toFixed(6));
        const nLng = Number(parseFloat(data[0].lon).toFixed(6));
        moveToCoordinates(nLat, nLng, 18);
        showToast(`🎯 พบ: ${data[0].display_name.split(',')[0]}`);
      } else {
        showToast('ไม่พบสถานที่ดังกล่าว ลองพิมพ์คำค้นอื่น เช่น "ศูนย์กีฬา มข."', 'error');
      }
    } catch (err) {
      showToast('ค้นหาสถานที่ล้มเหลว', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#fe6e00] flex items-center justify-center font-black">
              <Navigation size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                ปักหมุดตำแหน่งสนามกีฬา มข.
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  ดึงพิกัดอัตโนมัติ
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                คลิกบนแผนที่เพื่อปักหมุด ลากหมุด หรือกดปุ่มดึงพิกัดจากคลิปบอร์ด
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200/70 space-y-3">
          {/* Top row: Auto-paste button + GPS + Smart Input */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* 1. Main Auto-Paste Button */}
            <button
              type="button"
              onClick={handleAutoPasteFromClipboard}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#fe6e00] to-[#ff8c33] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/25 hover:opacity-95 active:scale-95 transition"
              title="อ่านข้อความหรือพิกัดที่คัดลอกไว้ในคลิปบอร์ดทันที"
            >
              <Clipboard size={15} />
              <span>ดึงพิกัดจากคลิปบอร์ดอัตโนมัติ</span>
              <Sparkles size={13} className="text-amber-200" />
            </button>

            {/* 2. GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              <LocateFixed size={14} className={locating ? 'animate-spin text-emerald-600' : ''} />
              <span>{locating ? 'กำลังดึง...' : 'ตำแหน่งปัจจุบัน (GPS)'}</span>
            </button>

            {/* 3. Smart paste input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={smartInput}
                onChange={e => handleSmartInputChange(e.target.value)}
                placeholder="หรือคลิกขวา Paste พิกัด / ลิงก์ Maps ที่นี่..."
                className="w-full pl-3.5 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono placeholder:font-sans placeholder:text-gray-400 focus:ring-2 focus:ring-[#fe6e00]/40 outline-none"
              />
              {smartInput && (
                <button
                  type="button"
                  onClick={() => setSmartInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Quick KKU Landmarks Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-extrabold text-gray-500 whitespace-nowrap flex items-center gap-1 mr-1">
              <Compass size={12} className="text-[#fe6e00]" /> จุดสำคัญ มข.:
            </span>
            {KKU_LANDMARKS.map(lm => (
              <button
                key={lm.name}
                type="button"
                onClick={() => {
                  moveToCoordinates(lm.lat, lm.lng, 18);
                  showToast(`เลือก: ${lm.name}`);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap transition ${
                  Math.abs(currentLat - lm.lat) < 0.0001 && Math.abs(currentLng - lm.lng) < 0.0001
                    ? 'bg-orange-100 border-[#fe6e00] text-[#fe6e00]'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {lm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="relative flex-1 bg-gray-100 min-h-[380px] sm:min-h-[440px]">
          {/* Leaflet container */}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

          {/* Map Controls Overlay (Top Right: Map View Switcher) */}
          <div className="absolute top-3 right-3 z-[10] flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-md border border-gray-200/80">
            <button
              type="button"
              onClick={() => toggleMapType('street')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mapType === 'street'
                  ? 'bg-[#fe6e00] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers size={12} /> แผนที่ถนน
            </button>
            <button
              type="button"
              onClick={() => toggleMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mapType === 'satellite'
                  ? 'bg-[#fe6e00] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🛰️ ดาวเทียม
            </button>
          </div>

          {/* Search place overlay (Top Left) */}
          <form
            onSubmit={handleSearchPlace}
            className="absolute top-3 left-3 z-[10] flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/80 overflow-hidden w-64 max-w-[calc(100%-140px)]"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสถานที่ใน มข..."
              className="px-3 py-1.5 text-xs text-gray-800 bg-transparent outline-none flex-1"
            />
            <button
              type="submit"
              className="p-2 text-gray-500 hover:text-[#fe6e00] transition"
              title="ค้นหา"
            >
              <Search size={14} />
            </button>
          </form>

          {/* Tip Banner (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-[10] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-[11px] text-gray-700 font-medium hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>คลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง หรือลากหมุดเพื่อปรับพิกัด</span>
          </div>

          {/* Toast Notification */}
          {alertMsg && (
            <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[20] px-4 py-2 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transition-all animate-bounce ${
              alertMsg.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {alertMsg.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
              <span>{alertMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer: Precise Coordinates Display + Confirm */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Latitude</span>
              <span className="text-sm font-mono font-black text-gray-900">{currentLat.toFixed(6)}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Longitude</span>
              <span className="text-sm font-mono font-black text-gray-900">{currentLng.toFixed(6)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onConfirm(currentLat, currentLng)}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#fe6e00] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 hover:bg-[#e06100] transition flex items-center justify-center gap-1.5"
            >
              <Check size={15} /> ยืนยันพิกัดนี้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
