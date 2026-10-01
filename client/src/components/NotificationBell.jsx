import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Clock, Ticket, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'เมื่อสักครู่';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
}

function getNotificationIcon(type) {
  switch (type) {
    case 'WAITLIST_PROMOTED':
      return <Ticket size={16} className="text-emerald-500" />;
    case 'BOOKING_TIMEOUT_CANCELLED':
      return <Clock size={16} className="text-amber-500" />;
    default:
      return <Bell size={16} className="text-brand-500" />;
  }
}

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications/unread-count');
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Ignore if session expired
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications?limit=25');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(`/api/notifications/${notif.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (notif.link) {
        setOpen(false);
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="แจ้งเตือน"
        className="relative w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition focus:outline-none"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white font-bold text-xs rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-base text-gray-900">การแจ้งเตือน</h4>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-extrabold rounded-full">
                  ใหม่ {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <CheckCheck size={15} /> อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">
                กำลังโหลดการแจ้งเตือน...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 font-medium">
                ไม่มีการแจ้งเตือนใหม่
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={(e) => handleMarkAsRead(notif, e)}
                  className={`p-3.5 hover:bg-gray-50/80 cursor-pointer transition flex items-start gap-3 ${
                    !notif.is_read ? 'bg-orange-50/40' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-bold truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
