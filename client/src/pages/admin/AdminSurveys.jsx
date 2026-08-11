import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Users, Star, Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSurveys() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/surveys/stats');
      setStats(res.data);
    } catch (err) {
      setError('ไม่สามารถดึงข้อมูลสรุปผลได้');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  const { total, averages, demographics } = stats;

  const renderProgressBar = (label, value) => {
    const numValue = parseFloat(value) || 0;
    const percentage = (numValue / 5) * 100;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-bold text-brand-600">{numValue.toFixed(2)}/5</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-brand-500 h-2.5 rounded-full transition-all duration-1000" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const renderStatsCard = (title, data) => {
    const items = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
    return (
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-3">
          {items.map(([key, count]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate mr-2">{key}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-gray-100 text-gray-700 py-1 px-2 rounded-lg">{count}</span>
                <span className="text-xs text-gray-400 w-8 text-right">{((count / total) * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 bg-white rounded-xl hover:bg-gray-50 border border-gray-100 shadow-sm">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">รายงานความพึงพอใจ</h1>
          <p className="text-sm text-gray-500">ผลการประเมินจากผู้ใช้งานระบบ KKU SportPass</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
          <div>
            <p className="text-brand-100 text-sm font-medium mb-1">ผู้ตอบแบบสอบถามทั้งหมด</p>
            <h2 className="text-4xl font-bold">{total} <span className="text-lg font-normal">คน</span></h2>
          </div>
          <Users size={48} className="text-white/20" />
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">คะแนนภาพรวม (Overall)</p>
            <h2 className="text-3xl font-bold text-gray-800">
              {parseFloat(averages.overall || 0).toFixed(2)} <span className="text-lg text-gray-400 font-normal">/ 5</span>
            </h2>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500">
            <Star size={24} fill="currentColor" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">การแก้ปัญหาเวลา/คิว</p>
            <h2 className="text-3xl font-bold text-gray-800">
              {parseFloat(averages.prob_queue || 0).toFixed(2)} <span className="text-lg text-gray-400 font-normal">/ 5</span>
            </h2>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* UX/UI Design */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">1</div>
            <h2 className="text-lg font-bold text-gray-800">ด้าน UX/UI Design</h2>
          </div>
          {renderProgressBar('ความทันสมัย สะอาดตา ดูเป็นมิตร', averages.ux_modern)}
          {renderProgressBar('ตัวอักษรอ่านง่าย และการใช้สี', averages.ux_clarity)}
          {renderProgressBar('การจัดวางเมนูและการ์ด', averages.ux_nav)}
          {renderProgressBar('การแจ้งเตือน (Feedback) ของระบบ', averages.ux_feedback)}
        </div>

        {/* Functional Usability */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">2</div>
            <h2 className="text-lg font-bold text-gray-800">ด้าน Functional Usability</h2>
          </div>
          {renderProgressBar('การดูตารางเวลาแบบเรียลไทม์', averages.func_status)}
          {renderProgressBar('ขั้นตอนการจองคิวที่ง่าย', averages.func_booking)}
          {renderProgressBar('การสแกน QR Code และ GPS', averages.func_checkin)}
          {renderProgressBar('ความชัดเจนของหน้าคู่มือ', averages.func_manual)}
        </div>

        {/* Performance & Security */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">3</div>
            <h2 className="text-lg font-bold text-gray-800">ด้าน Performance & Security</h2>
          </div>
          {renderProgressBar('ความรวดเร็วในการโหลดข้อมูล', averages.perf_speed)}
          {renderProgressBar('ความแม่นยำของระบบ GPS', averages.perf_gps)}
          {renderProgressBar('ความปลอดภัยของข้อมูลส่วนตัว', averages.perf_security)}
        </div>

        {/* Benefits & Problem Solving */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">4</div>
            <h2 className="text-lg font-bold text-gray-800">ด้าน Benefits & Problem Solving</h2>
          </div>
          {renderProgressBar('ช่วยลดปัญหาการเสียเวลาและค่าเดินทาง', averages.prob_time)}
          {renderProgressBar('ช่วยแก้ไขปัญหาการต่อคิว', averages.prob_queue)}
          {renderProgressBar('ช่วยให้วางแผนการเล่นกีฬาได้ดีขึ้น', averages.prob_plan)}
          {renderProgressBar('ยกระดับการให้บริการสนามกีฬา มข.', averages.overall)}
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart size={24} className="text-brand-500" /> ข้อมูลประชากรศาสตร์ (Demographics)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderStatsCard('สถานภาพผู้ใช้งาน', demographics.roles)}
        {renderStatsCard('ความถี่ในการใช้งาน', demographics.frequencies)}
        {renderStatsCard('ประเภทกีฬาที่ใช้บริการ', demographics.sports)}
        {renderStatsCard('ช่วงอายุ', demographics.ages)}
      </div>

    </div>
  );
}
