import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Smile, Code2, Palette, Database, Users2, ArrowLeft, Quote, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const TEAM_MEMBERS = [
  {
    name: 'นายชิณท์ณภัทร ใจมะณา',
    nickname: 'นุ๊ก',
    role: 'Project Manager / Business Analyst',
    icon: Users2,
    initials: 'ชจ',
    img: '/img/chji.png'
  },
  {
    name: 'นายชิษณุพงศ์ ปะทะวัง',
    nickname: 'ฟิล์ม',
    role: 'Project Manager / Business Analyst',
    icon: Users2,
    initials: 'ชป',
    img: '/img/1.png'
  },
  {
    name: 'นายเทวารักษ์ สมสาร์',
    nickname: 'ปิ๋ง',
    role: 'Technical Developer',
    icon: Code2,
    initials: 'ทส',
    img: '/img/2.png'
  },
  {
    name: 'นายภูวนัตถ์ สมภารสิงห์',
    nickname: 'นนท์',
    role: 'Technical Developer',
    icon: Code2,
    initials: 'ภส',
    img: '/img/3.png'
  },
  {
    name: 'นางสาวนันท์ชพร ปานอินทร์',
    nickname: 'เนย',
    role: 'UX/UI',
    icon: Palette,
    initials: 'นป',
    img: '/img/4.png'
  },
  {
    name: 'นางสาวชนินาถ พิลาแดง',
    nickname: 'เชอร์รี่',
    role: 'UX/UI',
    icon: Palette,
    initials: 'ชพ',
    img: '/img/5.png'
  },
  {
    name: 'นางสาวสุภิชญา ชินเกตุ',
    nickname: 'วิว',
    role: 'Data Specialist',
    icon: Database,
    initials: 'สช',
    img: '/img/6.png'
  },
  {
    name: 'นางสาวปภัสสร ลือยศ',
    nickname: 'ไข่ปิ้ง',
    role: 'Data Specialist',
    icon: Database,
    initials: 'ปล',
    img: '/img/7.png'
  }
];

export default function About() {
  const [selectedMember, setSelectedMember] = useState(null);

  return (
    <div className="bg-[#fcf7f0] min-h-screen text-[#2c1f14] font-sans pb-16">
      {/* Top Navbar */}
      <nav className="bg-[#fcf7f0]/90 backdrop-blur-md fixed w-full z-50 border-b border-orange-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center gap-3">
              <img src="/KKU_SportPass.svg" alt="KKU SportPass Logo" className="h-10 w-auto drop-shadow" onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }} />
              <span className="font-extrabold text-2xl tracking-tight text-brand-900">KKU SportPass</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition">
                <ArrowLeft size={16} /> หน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fef3e8] via-[#fce7d7] to-[#fcd4bd] text-brand-900 pt-32 pb-16 border-b border-orange-200 text-center px-4">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-orange-200 text-brand-700 font-bold text-xs mb-4 shadow-sm">
            <Users size={16} /> ผู้ศึกษา และพัฒนา
          </motion.div>
          <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl font-black text-brand-900 tracking-tight">
            เกี่ยวกับ <span className="text-brand-600">KKU SportPass</span>
          </motion.h1>
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6 bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-orange-200/60 shadow-sm text-left relative">
            <Quote className="text-brand-300 absolute top-4 left-4 -z-0" size={32} />
            <p className="text-xs md:text-sm text-gray-700 font-medium leading-relaxed relative z-10 pl-6">
              ระบบจองสนามกีฬามหาวิทยาลัยขอนแก่น (KKU SportPass) พัฒนาขึ้นในรายวิชา <span className="font-bold text-brand-700">CP321007 Design Thinking for Information Technology</span> หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศและนวัตกรรมอัจฉริยะ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น โดยมีวัตถุประสงค์เพื่อศึกษาความต้องการและออกแบบประสบการณ์การใช้งาน ที่สอดคล้องกับพฤติกรรมของนักศึกษาและบุคลากรภายในมหาวิทยาลัย
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Grid Section */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-extrabold text-brand-900">ผู้ศึกษา และพัฒนา (Research & Development Team)</h2>
          <p className="text-sm text-brand-700 font-semibold mt-1">KKU SportPass</p>
        </div>

        {/* 2 per row for large images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12">
          {TEAM_MEMBERS.map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedMember(member)}
              className="bg-white rounded-3xl p-6 border border-orange-100 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer group hover:-translate-y-1.5"
            >
              <div className="relative w-48 h-60 rounded-2xl overflow-hidden mb-5 bg-gradient-to-br from-brand-100 to-brand-200 border-2 border-orange-200 flex items-center justify-center shadow-lg">
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center font-black text-3xl text-brand-700 bg-orange-100">
                  {member.initials}
                </div>
              </div>

              <h3 className="font-extrabold text-gray-900 text-base">{member.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold mt-1.5">
                <Smile size={15} /> ชื่อเล่น : <span className="text-gray-800 font-black">{member.nickname}</span>
              </div>

              <div className="mt-4 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-gray-800 flex items-center gap-2">
                <member.icon size={15} className="text-brand-600" />
                <span>{member.role}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Lightbox Modal for Member Preview */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md text-center relative border border-orange-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMember(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition">
              <X size={18} />
            </button>
            <div className="w-56 h-72 rounded-2xl mx-auto overflow-hidden mb-4 shadow-xl border-4 border-brand-500">
              <img src={selectedMember.img} alt={selectedMember.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="font-extrabold text-gray-900 text-lg">{selectedMember.name}</h3>
            <p className="text-sm font-bold text-brand-600 mt-1">ชื่อเล่น : {selectedMember.nickname}</p>
            <p className="text-xs text-gray-500 font-semibold mt-2">{selectedMember.role}</p>
          </motion.div>
        </div>
      )}

      {/* Course Info & Credit Footer */}
      <footer className="bg-white border-t border-orange-200 mt-12 py-10">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <img src="/KKU_SportPass.svg" alt="KKU SportPass Logo" className="h-12 w-auto mx-auto" onError={(e) => { e.target.onerror=null; e.target.src="/KKU_SportPass.png"; }} />
          <p className="text-xs text-gray-700 font-bold">&copy; 2026 KKU SportPass — มหาวิทยาลัยขอนแก่น</p>
          <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-100 max-w-2xl mx-auto text-[11px] text-gray-600 leading-relaxed font-medium">
            <Info size={16} className="text-brand-600 mx-auto mb-1" />
            ใช้เพื่อศึกษาในรายวิชา CP321007 Design Thinking for Information Technology (การคิดเชิงออกแบบสำหรับเทคโนโลยีสารสนเทศ) <br />
            หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศและนวัตกรรมอัจฉริยะ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
          </div>
        </div>
      </footer>
    </div>
  );
}
