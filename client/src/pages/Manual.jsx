import { motion } from 'framer-motion';
import { BookOpen, LogIn, CalendarDays, CheckCircle, QrCode, MapPin, Clock, ArrowRight, ShieldCheck, Ticket, ScanLine } from 'lucide-react';

export default function Manual() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 pt-12 pb-20 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-lg mx-auto flex items-center justify-between text-white">
          <div>
            <h1 className="text-3xl font-bold mb-2">คู่มือการใช้งาน</h1>
            <p className="text-brand-50 opacity-90 text-sm">อธิบายขั้นตอนการจองแบบละเอียด</p>
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 rotate-3">
            <BookOpen size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Manual Content */}
      <div className="max-w-lg mx-auto px-4 -mt-10 relative z-20 space-y-8">
        
        {/* Step 1 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="font-bold text-lg">1</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">เข้าสู่ระบบ (Login)</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            เริ่มต้นใช้งานโดยการเข้าสู่ระบบ คุณสามารถเลือกใช้บัญชี <span className="font-semibold text-gray-700">Google</span> หรือบัญชี <span className="font-semibold text-gray-700">KKU SSONext</span> เพื่อยืนยันตัวตนได้อย่างปลอดภัย
          </p>
          {/* CSS Illustration */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl shadow-sm">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
              <span className="text-sm font-semibold text-gray-700">Login with Google</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl shadow-sm shadow-brand-500/20">
              <ShieldCheck size={18} />
              <span className="text-sm font-semibold">KKU SSONext</span>
            </div>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="font-bold text-lg">2</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">เลือกสนามที่ต้องการ</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            ที่หน้าหลัก (Dashboard) คุณจะเห็นรายชื่อสนามกีฬาต่างๆ พร้อมสถานะว่าเปิดให้บริการหรือไม่ ให้กดเลือกสนามที่คุณต้องการจอง
          </p>
          {/* CSS Illustration */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex gap-4 overflow-hidden">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm min-w-[140px] flex-shrink-0">
              <div className="w-full h-20 bg-orange-100 rounded-lg mb-2 flex items-center justify-center text-orange-500">
                <MapPin size={24} />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 w-12 bg-green-100 rounded"></div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm min-w-[140px] flex-shrink-0 opacity-50">
              <div className="w-full h-20 bg-blue-100 rounded-lg mb-2 flex items-center justify-center text-blue-500">
                <MapPin size={24} />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 w-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="font-bold text-lg">3</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">เลือกวันและเวลา</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            เลื่อนดูวันที่ต้องการ และเลือกช่วงเวลาที่ว่าง (สีขาวหรือสีเขียว) หากช่วงเวลาไหนเป็นสีเทาหรือมีคนจองแล้วจะไม่สามารถเลือกได้ เมื่อเลือกเสร็จให้กดยืนยันการจอง
          </p>
          {/* CSS Illustration */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex gap-2 mb-3">
              <div className="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm">วันนี้</div>
              <div className="px-3 py-1.5 bg-white text-gray-500 text-xs font-bold rounded-lg border border-gray-200">พรุ่งนี้</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border-2 border-brand-500 text-brand-600 p-2 rounded-xl flex justify-between items-center shadow-sm">
                <span className="text-sm font-bold">16:00</span>
                <CheckCircle size={14} className="text-brand-500" />
              </div>
              <div className="bg-gray-100 text-gray-400 border border-gray-200 p-2 rounded-xl flex justify-between items-center opacity-70">
                <span className="text-sm font-bold">17:00</span>
                <span className="text-[10px]">เต็มแล้ว</span>
              </div>
            </div>
            <div className="mt-3 bg-brand-600 text-white text-center py-2 rounded-xl font-bold text-sm shadow-md shadow-brand-500/30">
              ยืนยันการจอง
            </div>
          </div>
        </motion.div>

        {/* Step 4 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <span className="font-bold text-lg">4</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">สแกนเช็คอินเข้าสนาม</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            เมื่อถึงเวลาที่จองไว้ ให้ไปที่เมนู <span className="font-bold text-rose-500">"สแกน"</span> ในแอปพลิเคชัน แล้วนำมือถือไปสแกน <span className="font-bold text-gray-700">QR Code</span> ที่แปะอยู่หน้าสนามกีฬาเพื่อเช็คอินเข้าใช้งานได้เลย!
          </p>
          {/* CSS Illustration */}
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-rose-500 rounded-xl shadow-md shadow-rose-500/30 flex items-center justify-center text-white relative z-10">
              <div className="absolute inset-0 bg-rose-400 rounded-xl animate-ping opacity-75"></div>
              <ScanLine size={24} />
            </div>
            <ArrowRight size={20} className="text-rose-300" />
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-800 p-1">
              <QrCode size={36} />
              <span className="text-[8px] font-bold mt-1 text-gray-400">ป้ายหน้าสนาม</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
