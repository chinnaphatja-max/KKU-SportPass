import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, Cookie, Activity, CalendarCheck, CheckCircle2, Flame, Moon, Sparkles, Filter, Clock } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('heatmap'); // Default to the newly requested Heatmap view!
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState('30');
  const [courtsList, setCourtsList] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const [resStats, resHeatmap, resCourts] = await Promise.all([
        axios.get('/api/admin/tracking-stats'),
        axios.get(`/api/admin/utilization-heatmap?range_days=${rangeDays}${selectedCourt ? `&court_id=${selectedCourt}` : ''}`),
        axios.get('/api/courts')
      ]);
      setStats(resStats.data);
      setHeatmapData(resHeatmap.data);
      setCourtsList(resCourts.data?.courts || []);
    } catch (err) {
      console.error('Failed to fetch tracking stats:', err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays, selectedCourt]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-9 h-9 border-4 border-[#ffb74d] border-t-[#fe6e00] rounded-full animate-spin"></div>
      </div>
    );
  }

  const analytics = stats?.analytics || { total: 0, accepted: 0, declined: 0 };
  const usersStats = stats?.users || { total: 0, admin: 0, normal: 0 };
  const bookingsStats = stats?.bookings || { total: 0, completed: 0, missed: 0, active: 0 };
  const popularCourts = stats?.popularCourts || [];
  const rawBrowsers = stats?.rawBrowsers || [];

  // Convert raw user_agent into basic browser names
  const browserMap = {};
  rawBrowsers.forEach(b => {
    const ua = b.user_agent.toLowerCase();
    let name = 'Others';
    if (ua.includes('chrome')) name = 'Chrome';
    else if (ua.includes('safari')) name = 'Safari';
    else if (ua.includes('firefox')) name = 'Firefox';
    else if (ua.includes('edge')) name = 'Edge';
    browserMap[name] = (browserMap[name] || 0) + parseInt(b.count, 10);
  });

  const totalBrowsers = Object.values(browserMap).reduce((a, b) => a + b, 0) || 1;
  const browsers = Object.entries(browserMap).map(([name, count]) => ({
    name,
    users: count,
    percent: Math.round((count / totalBrowsers) * 100)
  })).sort((a, b) => b.users - a.users);

  const acceptanceRate = analytics.total > 0 ? Math.round((analytics.accepted / analytics.total) * 100) : 0;
  const completionRate = bookingsStats.total > 0 ? Math.round((bookingsStats.completed / bookingsStats.total) * 100) : 0;

  // Heatmap helpers
  const matrix = heatmapData?.matrix || [];
  const hours = heatmapData?.hours || [];
  const peakSlots = heatmapData?.peakSlots || [];
  const quietSlots = heatmapData?.quietSlots || [];
  const recommendation = heatmapData?.recommendation;

  const getCellColor = (intensity) => {
    if (intensity === 0) return 'bg-gray-100 text-gray-400 border-gray-200/50 hover:border-gray-400';
    if (intensity <= 25) return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:border-emerald-500';
    if (intensity <= 50) return 'bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-500 font-semibold';
    if (intensity <= 75) return 'bg-orange-300 text-orange-950 border-orange-400 hover:border-orange-600 font-bold';
    return 'bg-red-500 text-white border-red-600 hover:border-red-700 font-extrabold shadow-sm animate-pulse';
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2 text-gray-900">
            <BarChart2 style={{ color: '#fe6e00' }} /> {t('heatmap_title', 'วิเคราะห์ความหนาแน่นและการใช้งาน (Utilization Heatmap)')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('heatmap_subtitle', 'วิเคราะห์ช่วงเวลาที่มีการใช้งานหนาแน่นเพื่อการจัดสรรบุคลากรและเจ้าหน้าที่ดูแลสนาม')}
          </p>
        </div>

        <div className="inline-flex bg-gray-200/70 p-1 rounded-xl border border-gray-300/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'heatmap'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔥 Heatmap ความหนาแน่น
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 ภาพรวมระบบ
          </button>
        </div>
      </div>

      {activeTab === 'heatmap' ? (
        /* TAB: UTILIZATION HEATMAP */
        <div className="space-y-6">
          {/* Top Filter Controls */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Filter size={14} /> ช่วงเวลา:
              </span>
              <select
                value={rangeDays}
                onChange={(e) => setRangeDays(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="7">7 วันย้อนหลัง (Last 7 Days)</option>
                <option value="30">30 วันย้อนหลัง (Last 30 Days)</option>
                <option value="90">90 วันย้อนหลัง (Last Quarter)</option>
              </select>

              <span className="text-xs font-bold text-gray-500 ml-2">สนาม:</span>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500 max-w-xs truncate"
              >
                <option value="">ทุกสนามรวมกัน (All Facilities)</option>
                {courtsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
              <span>ความหนาแน่น:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" title="0%"></span>
                <span>0%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" title="1-25%"></span>
                <span>ต่ำ</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" title="26-50%"></span>
                <span>ปานกลาง</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-300 border border-orange-400" title="51-75%"></span>
                <span>สูง</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500 border border-red-600" title="76-100%"></span>
                <span className="text-red-600 font-bold">หนาแน่นที่สุด (Peak)</span>
              </div>
            </div>
          </div>

          {/* AI Staffing Recommendation Banner */}
          {recommendation && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {t('heatmap_staff_recommendation', 'ข้อเสนอแนะการจัดสรรบุคลากร (Staff Scheduling Insight)')}
                </h4>
                <p className="text-xs text-amber-950 font-medium mt-0.5 leading-relaxed">
                  {recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Key Metrics: Peak & Quiet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Flame size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('heatmap_peak_hours', 'ช่วงเวลาเร่งด่วนที่สุด (Peak Hours)')}</span>
                <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                  {peakSlots[0] ? `วัน${peakSlots[0].dayNameTh} ${peakSlots[0].hourStr} น.` : 'ไม่มีข้อมูล'}
                </h3>
                <p className="text-xs text-red-500 font-semibold mt-0.5">
                  {peakSlots[0] ? `${peakSlots[0].count} รายการ (ระดับความหนาแน่น ${peakSlots[0].intensity}%)` : '-'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Moon size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('heatmap_quiet_hours', 'ช่วงเวลาใช้งานเบาบาง (Quiet Hours)')}</span>
                <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                  {quietSlots[0] ? `วัน${quietSlots[0].dayNameTh} ${quietSlots[0].hourStr} น.` : 'ไม่มีข้อมูล'}
                </h3>
                <p className="text-xs text-blue-500 font-semibold mt-0.5">
                  {quietSlots[0] ? `เฉลี่ย ${quietSlots[0].count} การจอง (เหมาะสำหรับงานซ่อมบำรุง)` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Heatmap Grid Table */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-brand-600" /> ตารางความหนาแน่น 7 วัน × 16 ช่วงเวลา (06:00 - 21:00 น.)
              </h3>
              {hoveredSlot && (
                <div className="text-xs font-semibold px-3 py-1 bg-brand-50 text-brand-800 border border-brand-200 rounded-lg animate-fade-in">
                  วัน{hoveredSlot.dayNameTh} {hoveredSlot.hourStr} น. : <strong>{hoveredSlot.count} รายการ</strong> ({hoveredSlot.intensity}%)
                </div>
              )}
            </div>

            <div className="overflow-x-auto pb-2">
              <table className="w-full border-collapse min-w-[750px]">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-bold text-gray-400 uppercase w-20 sticky left-0 bg-white">วัน</th>
                    {hours.map(h => (
                      <th key={h} className="p-1.5 text-center text-[10px] font-bold text-gray-400">
                        {String(h).padStart(2, '0')}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.dow} className="border-t border-gray-100">
                      <td className="p-2 text-xs font-bold text-gray-700 sticky left-0 bg-white z-10">
                        {row.dayNameTh}
                      </td>
                      {row.slots.map((slot) => {
                        const cellColor = getCellColor(slot.intensity);
                        return (
                          <td key={slot.hour} className="p-1 text-center">
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredSlot(slot)}
                              onMouseLeave={() => setHoveredSlot(null)}
                              className={`w-8 h-8 rounded-lg text-[10px] border transition-all flex items-center justify-center mx-auto cursor-pointer ${cellColor}`}
                              aria-label={`วัน${slot.dayNameTh} ${slot.hourStr} น. ${slot.count} รายการ`}
                            >
                              {slot.count > 0 ? slot.count : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-gray-400 mt-3 text-right">
              * ข้อมูลคำนวณจากการจองที่สำเร็จและการเช็คอินในรอบ {rangeDays} วันย้อนหลัง
            </p>
          </div>
        </div>
      ) : (
        /* TAB: SYSTEM OVERVIEW (ORIGINAL ANALYTICS CARDS) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl shadow-sm border bg-white border-gray-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">ผู้ใช้งานระบบ</p>
                  <h3 className="text-3xl font-black text-gray-900">{usersStats.total.toLocaleString()}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
                <span className="text-gray-500">ผู้ใช้ทั่วไป: <strong className="text-gray-800">{usersStats.normal}</strong></span>
                <span className="text-gray-500">แอดมิน: <strong className="text-gray-800">{usersStats.admin}</strong></span>
              </div>
            </div>

            <div className="p-5 rounded-2xl shadow-sm border bg-white border-gray-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">รายการจองทั้งหมด</p>
                  <h3 className="text-3xl font-black text-gray-900">{bookingsStats.total.toLocaleString()}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                  <CalendarCheck size={20} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
                <span className="text-gray-500">กำลังจอง: <strong className="text-gray-800">{bookingsStats.active}</strong></span>
                <span className="text-emerald-700">เช็คอินแล้ว: <strong>{bookingsStats.completed}</strong></span>
              </div>
            </div>

            <div className="p-5 rounded-2xl shadow-sm border bg-white border-gray-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">อัตราเช็คอินสำเร็จ</p>
                  <h3 className="text-3xl font-black text-gray-900">{completionRate}%</h3>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex text-xs">
                <span className="text-red-500">ไม่มาตามนัด (Missed): <strong>{bookingsStats.missed}</strong> รายการ</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl shadow-sm border bg-white border-gray-200 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">อัตรายอมรับคุกกี้</p>
                  <h3 className="text-3xl font-black text-gray-900">{acceptanceRate}%</h3>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                  <Cookie size={20} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
                <span className="text-gray-500">ตอบรับ: <strong className="text-gray-800">{analytics.accepted}</strong></span>
                <span className="text-gray-500">ปฏิเสธ: <strong className="text-gray-800">{analytics.declined}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl shadow-sm border bg-white border-gray-200 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-base flex items-center gap-2 text-gray-900">
                  <Activity style={{ color: '#fe6e00' }} /> สนามยอดนิยม (Top 5)
                </h3>
              </div>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {popularCourts.length > 0 ? popularCourts.map((court, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border bg-gray-50 border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gray-800 text-white">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-gray-800 text-sm">{court.name}</span>
                    </div>
                    <span className="font-semibold text-brand-600 text-xs">{court.booking_count} การจอง</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-xs text-gray-400">ยังไม่มีข้อมูลการจองสนาม</div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl shadow-sm border bg-white border-gray-200">
              <h3 className="font-extrabold text-base mb-6 text-gray-900">เบราว์เซอร์จากผู้เข้าชม (Session)</h3>
              {browsers.length > 0 ? (
                <div className="space-y-4">
                  {browsers.map((b, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700">
                        <span>{b.name}</span>
                        <span>{b.percent}% ({b.users.toLocaleString()} Session)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all bg-brand-500" style={{ width: `${b.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-center py-12 text-gray-400">ยังไม่มีข้อมูลการเข้าชม</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
