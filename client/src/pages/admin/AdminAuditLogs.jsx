import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw, Clock, User, FileText, Database } from 'lucide-react';
import axios from 'axios';
import { formatThaiDate } from '../../utils/date';

const ACTION_COLORS = {
  MANUAL_CHECKIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ADMIN_CANCEL_BOOKING: 'bg-red-50 text-red-700 border-red-200',
  USER_CANCEL_BOOKING: 'bg-gray-100 text-gray-700 border-gray-200',
  CREATE_CLOSURE: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE_CLOSURE: 'bg-rose-50 text-rose-700 border-rose-200',
  CREATE_COURT: 'bg-blue-50 text-blue-700 border-blue-200',
  UPDATE_COURT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELETE_COURT: 'bg-red-50 text-red-700 border-red-200',
  UPDATE_SETTINGS: 'bg-purple-50 text-purple-700 border-purple-200',
  CREATE_ADMIN_USER: 'bg-teal-50 text-teal-700 border-teal-200',
  DELETE_ADMIN_USER: 'bg-red-50 text-red-700 border-red-200'
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (targetType) params.append('target_type', targetType);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '100');

      const res = await axios.get(`/api/admin/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [action, targetType, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const parseDetails = (detailsStr) => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return detailsStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-[#fe6e00]" /> บันทึกประวัติการทำงาน (Audit Trail)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ตรวจสอบย้อนหลังทุกการกระทำสำคัญ เช่น การเช็คอินแทน การยกเลิก การปิดสนาม และการเปลี่ยนแปลงข้อมูล
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        {/* Action Filter */}
        <div className="w-full lg:w-56">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50 bg-white"
          >
            <option value="">ทุกการกระทำ (All Actions)</option>
            <option value="MANUAL_CHECKIN">MANUAL_CHECKIN (เช็คอินแทน)</option>
            <option value="ADMIN_CANCEL_BOOKING">ADMIN_CANCEL_BOOKING (จนท.ยกเลิก)</option>
            <option value="USER_CANCEL_BOOKING">USER_CANCEL_BOOKING (ผู้ใช้ยกเลิก)</option>
            <option value="CREATE_CLOSURE">CREATE_CLOSURE (ปิดสนาม)</option>
            <option value="DELETE_CLOSURE">DELETE_CLOSURE (ยกเลิกปิดสนาม)</option>
            <option value="CREATE_COURT">CREATE_COURT (เพิ่มสนาม)</option>
            <option value="UPDATE_COURT">UPDATE_COURT (แก้ไขสนาม)</option>
            <option value="UPDATE_SETTINGS">UPDATE_SETTINGS (แก้ไขการตั้งค่า)</option>
          </select>
        </div>

        {/* Target Type Filter */}
        <div className="w-full lg:w-44">
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50 bg-white"
          >
            <option value="">ทุกประเภทเป้าหมาย</option>
            <option value="booking">booking (การจอง)</option>
            <option value="closure">closure (การปิดสนาม)</option>
            <option value="court">court (สนาม)</option>
            <option value="settings">settings (การตั้งค่า)</option>
            <option value="user">user (ผู้ใช้งาน)</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="ค้นหาผู้กระทำ, เหตุผล หรือเป้าหมาย..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 pl-9 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#fe6e00]/50"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs font-semibold animate-pulse">
            กำลังโหลดบันทึกประวัติการทำงาน...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Filter size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-600">ไม่พบบันทึกประวัติการทำงาน</p>
            <p className="text-xs text-gray-400 mt-1">ลองปรับเปลี่ยนตัวกรองหรือการค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-4">ผู้กระทำ</th>
                  <th className="py-3 px-4">การกระทำ (Action)</th>
                  <th className="py-3 px-4">เป้าหมาย (Target)</th>
                  <th className="py-3 px-4">เหตุผล / คำอธิบาย</th>
                  <th className="py-3 px-4">รายละเอียดเพิ่มเติม</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const badgeColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 border-gray-200';
                  const detailsObj = parseDetails(log.details);

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          {log.created_at ? formatThaiDate(log.created_at.split('T')[0], true) : '-'}
                        </span>
                        <span className="text-[10px] text-gray-400 pl-3.5">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('th-TH') : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400" />
                          <div>
                            <p className="font-bold text-gray-900">{log.actor_name || 'System'}</p>
                            <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-semibold">
                              {log.actor_role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          <Database size={10} className="text-gray-400" />
                          {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 max-w-xs">
                        {log.reason ? (
                          <span className="flex items-start gap-1">
                            <FileText size={12} className="text-gray-400 mt-0.5 shrink-0" />
                            <span>{log.reason}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate text-[11px] font-mono">
                        {detailsObj ? (
                          typeof detailsObj === 'object' ? (
                            <pre className="text-[10px] bg-gray-50 p-1 rounded border border-gray-100 max-w-xs overflow-x-auto">
                              {JSON.stringify(detailsObj, null, 1)}
                            </pre>
                          ) : (
                            detailsObj
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-400 font-mono text-[10px] whitespace-nowrap">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
