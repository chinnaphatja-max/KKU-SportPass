import { motion } from 'framer-motion';
import { BookOpen, LogIn, CalendarDays, CheckCircle, QrCode, ScanLine } from 'lucide-react';

export default function Manual() {
  const steps = [
    {
      icon: <LogIn className="text-white" size={24} />,
      title: "1. เข้าสู่ระบบ",
      description: "เริ่มต้นด้วยการเข้าสู่ระบบผ่านบัญชี Google หรือ KKU SSONext เพื่อยืนยันตัวตน",
      color: "bg-blue-500",
      shadow: "shadow-blue-500/30"
    },
    {
      icon: <CalendarDays className="text-white" size={24} />,
      title: "2. เลือกสนามและเวลา",
      description: "ดูสนามที่ว่างในหน้าแรก เลือกวันที่และช่วงเวลาที่คุณต้องการจอง",
      color: "bg-brand-500",
      shadow: "shadow-brand-500/30"
    },
    {
      icon: <CheckCircle className="text-white" size={24} />,
      title: "3. ยืนยันการจอง",
      description: "ตรวจสอบรายละเอียดและกดยืนยัน ระบบจะบันทึกการจองของคุณทันที",
      color: "bg-green-500",
      shadow: "shadow-green-500/30"
    },
    {
      icon: <QrCode className="text-white" size={24} />,
      title: "4. รับ QR Code",
      description: "ไปที่เมนู 'การจองของฉัน' เพื่อดู QR Code ประจำรอบการจองของคุณ",
      color: "bg-purple-500",
      shadow: "shadow-purple-500/30"
    },
    {
      icon: <ScanLine className="text-white" size={24} />,
      title: "5. สแกนเข้าสนาม",
      description: "แสดง QR Code ให้เจ้าหน้าที่สแกน หรือใช้มือถือของคุณสแกนที่จุดเช็คอินเพื่อเข้าใช้งาน",
      color: "bg-rose-500",
      shadow: "shadow-rose-500/30"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 pt-12 pb-20 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-lg mx-auto flex items-center justify-between text-white">
          <div>
            <h1 className="text-3xl font-bold mb-2">คู่มือการใช้งาน</h1>
            <p className="text-brand-50 opacity-90 text-sm">ขั้นตอนการจองสนามกีฬาง่ายๆ ใน 5 ขั้นตอน</p>
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 rotate-3">
            <BookOpen size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Steps Container */}
      <div className="max-w-lg mx-auto px-6 -mt-10 relative z-20">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {/* Vertical line connecting steps */}
              {index !== steps.length - 1 && (
                <div className="absolute left-11 top-16 bottom-[-24px] w-0.5 bg-gray-100 z-0"></div>
              )}

              <div className={`w-12 h-12 rounded-2xl ${step.color} flex-shrink-0 flex items-center justify-center shadow-lg ${step.shadow} relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                {step.icon}
              </div>
              <div className="pt-1">
                <h3 className="font-bold text-gray-800 text-lg mb-1">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 bg-brand-50 rounded-2xl p-6 text-center border border-brand-100"
        >
          <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={24} />
          </div>
          <h4 className="font-bold text-brand-800 mb-2">พร้อมใช้งานแล้ว!</h4>
          <p className="text-brand-600/80 text-sm">คุณสามารถเริ่มต้นการจองสนามแรกของคุณได้เลยที่หน้าหลัก</p>
        </motion.div>
      </div>
    </div>
  );
}
