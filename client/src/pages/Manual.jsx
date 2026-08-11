import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export default function Manual() {
  const manuals = [
    { id: 1, src: '/img/1.png', alt: 'คู่มือหน้า 1', title: 'ขั้นตอนที่ 1' },
    { id: 2, src: '/img/2.png', alt: 'คู่มือหน้า 2', title: 'ขั้นตอนที่ 2' },
    { id: 3, src: '/img/3.png', alt: 'คู่มือหน้า 3', title: 'ขั้นตอนที่ 3' },
    { id: 4, src: '/img/4.png', alt: 'คู่มือหน้า 4', title: 'ขั้นตอนที่ 4' },
    { id: 5, src: '/img/5.png', alt: 'คู่มือหน้า 5', title: 'ขั้นตอนที่ 5' },
    { id: 6, src: '/img/6.png', alt: 'คู่มือหน้า 6', title: 'ขั้นตอนที่ 6' },
    { id: 7, src: '/img/7.png', alt: 'คู่มือหน้า 7', title: 'ขั้นตอนที่ 7' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 pt-12 pb-16 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-lg mx-auto flex items-center justify-between text-white">
          <div>
            <h1 className="text-3xl font-bold mb-2">คู่มือการใช้งาน</h1>
            <p className="text-brand-50 opacity-90 text-sm">การจองสนามกีฬา KKU SportPass</p>
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 rotate-3">
            <BookOpen size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Manual Content */}
      <div className="max-w-lg mx-auto px-4 -mt-8 relative z-20">
        <div className="space-y-6">
          {manuals.map((manual, index) => (
            <motion.div
              key={manual.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
              className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 p-2 group"
            >
              <div className="bg-brand-50 px-4 py-2 rounded-t-2xl mb-2 flex justify-center">
                <span className="font-bold text-brand-700">{manual.title}</span>
              </div>
              <div className="overflow-hidden rounded-2xl relative">
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none rounded-2xl"></div>
                <img 
                  src={manual.src} 
                  alt={manual.alt} 
                  className="w-full h-auto object-contain transform group-hover:scale-[1.02] transition-transform duration-500 ease-in-out" 
                  loading="lazy"
                />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-10 bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm"
        >
          <h4 className="font-bold text-gray-800 mb-2">หากมีข้อสงสัยเพิ่มเติม</h4>
          <p className="text-gray-500 text-sm">สามารถติดต่อสอบถามเจ้าหน้าที่ประจำสนามได้ทันที</p>
        </motion.div>
      </div>
    </div>
  );
}
