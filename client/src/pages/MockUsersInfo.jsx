import React from 'react';
import { motion } from 'framer-motion';
import { Users, KeyRound, ShieldCheck, Copy, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockUsers = [
  { role: 'Admin (แอดมิน)', email: 'admin@mock.com', password: 'password123', desc: 'สามารถเข้าถึงหน้า Admin Dashboard เพื่อจัดการสนามและดูข้อมูลทั้งหมด' },
  { role: 'Student (นักศึกษา)', email: 'student@mock.com', password: 'password123', desc: 'ผู้ใช้ทั่วไป (บัญชีนักศึกษา) จองสนามได้ปกติ' },
  { role: 'Staff (บุคลากร)', email: 'staff@mock.com', password: 'password123', desc: 'ผู้ใช้ทั่วไป (บัญชีบุคลากร) จองสนามได้ปกติ' },
  { role: 'Outsider (บุคคลภายนอก)', email: 'outsider@mock.com', password: 'password123', desc: 'ผู้ใช้ทั่วไป (บุคคลภายนอก) จองสนามได้ แต่อาจมีเรทราคาต่างกันในบางสนาม' }
];

export default function MockUsersInfo() {
  const navigate = useNavigate();

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('คัดลอก ' + text + ' แล้ว!');
  };

  return (
    <div className="p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl">
              <Users size={28} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">บัญชีทดสอบระบบ</h1>
          </div>
          <p className="text-gray-500">ข้อมูลบัญชีผู้ใช้จำลองสำหรับใช้ล็อกอินและทดสอบระบบในสิทธิ์ต่างๆ</p>
        </motion.div>

        <div className="space-y-4">
          {mockUsers.map((user, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {user.email.includes('admin') ? <ShieldCheck size={18} className="text-amber-500" /> : <Users size={18} className="text-brand-500" />}
                  <h2 className="text-lg font-extrabold text-gray-900">{user.role}</h2>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{user.desc}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-xs font-bold text-gray-400">Email</span>
                    <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <span className="flex-1 text-sm font-semibold text-gray-800">{user.email}</span>
                      <button onClick={() => handleCopy(user.email)} className="text-gray-400 hover:text-brand-600 p-1">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-xs font-bold text-gray-400">Password</span>
                    <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <KeyRound size={14} className="text-gray-400 mr-2" />
                      <span className="flex-1 text-sm font-semibold text-gray-800">{user.password}</span>
                      <button onClick={() => handleCopy(user.password)} className="text-gray-400 hover:text-brand-600 p-1">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
