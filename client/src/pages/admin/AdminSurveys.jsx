import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Users, Star, Activity, Calendar } from 'lucide-react';

export default function AdminSurveys() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const res = await axios.get(`/api/admin/surveys/stats?${params.toString()}`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch survey stats:', err);
      setError('ไม่สามารถดึงข้อมูลสรุปผลได้');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const renderProgressBar = (label, value) => {
    const numValue = parseFloat(value) || 0;
    const percentage = (numValue / 5) * 100;
    const color = numValue >= 4 ? '#10b981' : numValue >= 3 ? '#fe6e00' : '#ef4444';
    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-extrabold" style={{ color }}>{numValue.toFixed(2)}<span className="text-gray-400 font-normal text-xs">/5</span></span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%`, background: `linear-gradient(to right, #fe6e00, ${color})` }}
          />
        </div>
      </div>
    );
  };

  const renderStatsCard = (title, data) => {
    const items = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
    const total = items.reduce((s, [, v]) => s + v, 0);
    return (
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">{title}</h3>
        <div className="space-y-2.5">
          {items.map(([key, count]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate mr-2">{key}</span>
                <span className="text-xs font-bold text-gray-700">{count} ({total > 0 ? ((count / total) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: '#fe6e00' }}
                />
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-gray-400">ไม่มีข้อมูล</p>}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!stats) return null;

  const { total, averages, demographics } = stats;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header + Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <BarChart size={24} className="text-[#fe6e00]" /> รายงานความพึงพอใจ
          </h2>
          <p className="text-xs text-gray-500 mt-1">ผลการประเมินจากผู้ใช้งานระบบ KKU SportPass</p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
            <Calendar size={13} className="text-[#fe6e00] shrink-0" />
            <span className="text-xs font-bold text-gray-500">จาก</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
            <Calendar size={13} className="text-[#fe6e00] shrink-0" />
            <span className="text-xs font-bold text-gray-500">ถึง</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 transition"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl p-6 text-white shadow-lg flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #fe6e00, #e85d00)' }}>
          <div>
            <p className="text-orange-100 text-sm font-medium mb-1">ผู้ตอบแบบสอบถาม</p>
            <h2 className="text-4xl font-black">{total} <span className="text-xl font-normal">คน</span></h2>
            {(dateFrom || dateTo) && (
              <p className="text-orange-200 text-xs mt-1">ตามช่วงเวลาที่กรอง</p>
            )}
          </div>
          <Users size={48} className="text-white/20" />
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">คะแนนภาพรวม</p>
            <h2 className="text-3xl font-black text-gray-800">
              {parseFloat(averages.overall || 0).toFixed(2)}
              <span className="text-lg text-gray-400 font-normal"> / 5</span>
            </h2>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500">
            <Star size={24} fill="currentColor" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">การแก้ปัญหาคิว</p>
            <h2 className="text-3xl font-black text-gray-800">
              {parseFloat(averages.prob_queue || 0).toFixed(2)}
              <span className="text-lg text-gray-400 font-normal"> / 5</span>
            </h2>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center font-extrabold text-sm">1</div>
            <h2 className="text-base font-extrabold text-gray-800">ด้าน UX/UI Design</h2>
          </div>
          {renderProgressBar('ความทันสมัย สะอาดตา ดูเป็นมิตร', averages.ux_modern)}
          {renderProgressBar('ตัวอักษรอ่านง่าย และการใช้สี', averages.ux_clarity)}
          {renderProgressBar('การจัดวางเมนูและการ์ด', averages.ux_nav)}
          {renderProgressBar('การแจ้งเตือน (Feedback) ของระบบ', averages.ux_feedback)}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center font-extrabold text-sm">2</div>
            <h2 className="text-base font-extrabold text-gray-800">ด้าน Functional Usability</h2>
          </div>
          {renderProgressBar('การดูตารางเวลาแบบเรียลไทม์', averages.func_status)}
          {renderProgressBar('ขั้นตอนการจองคิวที่ง่าย', averages.func_booking)}
          {renderProgressBar('การสแกน QR Code และ GPS', averages.func_checkin)}
          {renderProgressBar('ความชัดเจนของหน้าคู่มือ', averages.func_manual)}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center font-extrabold text-sm">3</div>
            <h2 className="text-base font-extrabold text-gray-800">ด้าน Performance & Security</h2>
          </div>
          {renderProgressBar('ความรวดเร็วในการโหลดข้อมูล', averages.perf_speed)}
          {renderProgressBar('ความแม่นยำของระบบ GPS', averages.perf_gps)}
          {renderProgressBar('ความปลอดภัยของข้อมูลส่วนตัว', averages.perf_security)}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center font-extrabold text-sm">4</div>
            <h2 className="text-base font-extrabold text-gray-800">ด้าน Benefits & Problem Solving</h2>
          </div>
          {renderProgressBar('ช่วยลดปัญหาการเสียเวลาและค่าเดินทาง', averages.prob_time)}
          {renderProgressBar('ช่วยแก้ไขปัญหาการต่อคิว', averages.prob_queue)}
          {renderProgressBar('ช่วยให้วางแผนการเล่นกีฬาได้ดีขึ้น', averages.prob_plan)}
          {renderProgressBar('ยกระดับการให้บริการสนามกีฬา มข.', averages.overall)}
        </div>
      </div>

      {/* Demographics */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart size={22} className="text-[#fe6e00]" /> ข้อมูลประชากรศาสตร์ (Demographics)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {renderStatsCard('สถานภาพผู้ใช้งาน', demographics.roles)}
          {renderStatsCard('ความถี่ในการใช้งาน', demographics.frequencies)}
          {renderStatsCard('ประเภทกีฬาที่ใช้บริการ', demographics.sports)}
          {renderStatsCard('ช่วงอายุ', demographics.ages)}
        </div>
      </div>
    </div>
  );
}
