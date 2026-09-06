import { useState, useEffect } from 'react';
import { Megaphone, Cookie, Target } from 'lucide-react';
import axios from 'axios';

export default function AdminMarketing() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/tracking-stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#ffb74d] border-t-[#fe6e00] rounded-full animate-spin"></div>
      </div>
    );
  }

  const marketing = stats?.marketing || { total: 0, accepted: 0, declined: 0 };
  const acceptanceRate = marketing.total > 0 ? Math.round((marketing.accepted / marketing.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: '#423d38' }}>
            <Megaphone style={{ color: '#fe6e00' }} /> โฆษณาและการตลาด (Marketing)
          </h2>
          <p className="text-sm mt-1" style={{ color: '#797067' }}>
            สถิติการยอมรับคุกกี้เพื่อการโฆษณา (ข้อมูลจริงจากฐานข้อมูล)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cookie Consent Marketing */}
        <div className="p-6 rounded-[12px] shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e3e0dd' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-lg flex items-center gap-2" style={{ color: '#423d38' }}>
              <Cookie style={{ color: '#fe6e00' }} /> สถิติการอนุญาตโฆษณา
            </h3>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  strokeWidth="3"
                  stroke="rgba(254, 110, 0, 0.1)"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${acceptanceRate}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="#fe6e00"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black" style={{ color: '#423d38' }}>{acceptanceRate}%</span>
                <span className="text-xs font-bold" style={{ color: '#797067' }}>อนุญาตโฆษณา</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mt-8 w-full">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: '#797067' }}>ยอมรับ (Session)</div>
                <div className="text-2xl font-black" style={{ color: '#fe6e00' }}>{marketing.accepted.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: '#797067' }}>ปฏิเสธ (Session)</div>
                <div className="text-2xl font-black" style={{ color: '#423d38' }}>{marketing.declined.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Info Note */}
        <div className="p-6 rounded-[12px] shadow-sm border h-fit" style={{ backgroundColor: '#ffffff', borderColor: '#e3e0dd' }}>
          <h3 className="font-extrabold text-lg mb-6 flex items-center justify-between" style={{ color: '#423d38' }}>
            ข้อควรรู้เกี่ยวกับข้อมูล Marketing
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#dcfce7', color: '#016630' }}>REAL TIME</span>
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#797067' }}>
            ขณะนี้ระบบจัดเก็บเฉพาะ <strong>Consent หรือการยินยอมการใช้คุกกี้เพื่อการโฆษณา</strong> จากผู้ใช้งานจริงเท่านั้น 
            การเชื่อมต่อสถิติจริงเช่น Conversion, CPA, หรือ Click Through Rate จะต้องใช้การ Integrate ระบบร่วมกับ 
            <strong> Facebook Pixel</strong> หรือ <strong>Google Ads Tag</strong> ต่อไป
          </p>
          <div className="mt-4 p-4 rounded-lg flex gap-3" style={{ backgroundColor: '#f3f4f6' }}>
            <Target size={20} style={{ color: '#fe6e00' }} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold" style={{ color: '#423d38' }}>หากต้องการใช้งาน Marketing Tool เต็มรูปแบบ โปรดเพิ่มแท็กโฆษณาใน Source Code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
