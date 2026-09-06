import { useRef } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ReceiptModal({ receipt, onClose }) {
  const { t } = useLanguage();
  const printRef = useRef();

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = Number(receipt.amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls (Not printed) */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-gray-700">{t('receipt_title', 'ใบเสร็จรับเงินอิเล็กทรอนิกส์')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Printer size={14} />
              {t('btn_print_receipt', 'พิมพ์ใบเสร็จ')}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div ref={printRef} className="p-6 md:p-8 overflow-y-auto space-y-6 text-gray-800 font-sans print:p-0">
          {/* Header */}
          <div className="text-center pb-5 border-b border-gray-200">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <img src="/KKU_SportPass.png" alt="KKU SportPass" className="w-10 h-10 rounded-lg object-contain" />
              <div className="text-left">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900 leading-tight">KKU SportPass</h2>
                <p className="text-[11px] text-gray-500 font-medium">{t('receipt_sub', 'สำนักการกีฬา มหาวิทยาลัยขอนแก่น')}</p>
              </div>
            </div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-wide mt-2">{t('receipt_title', 'ใบเสร็จรับเงินอิเล็กทรอนิกส์')}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">E-RECEIPT / OFFICIAL TAX INVOICE</p>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-500 block">{t('receipt_no', 'เลขที่ใบเสร็จ')}:</span>
              <span className="font-mono font-bold text-gray-900 text-sm">{receipt.receipt_no}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">{t('receipt_date', 'วันที่ชำระเงิน')}:</span>
              <span className="font-semibold text-gray-900">
                {receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('th-TH') : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{t('receipt_ref', 'รหัสอ้างอิงธุรกรรม')}:</span>
              <span className="font-mono text-gray-700 text-[11px]">{receipt.transaction_ref}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">{t('receipt_method', 'ช่องทางชำระเงิน')}:</span>
              <span className="font-semibold text-brand-700 capitalize">{receipt.payment_method || 'PromptPay QR'}</span>
            </div>
          </div>

          {/* Payer & Booking Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">{t('receipt_payer', 'ผู้ชำระเงิน')}:</span>
              <span className="font-semibold text-gray-900">{receipt.user_name} ({receipt.user_email})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">{t('label_facility', 'สนามกีฬา')}:</span>
              <span className="font-semibold text-gray-900">{receipt.court_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">{t('label_date', 'วันที่ใช้งาน')}:</span>
              <span className="font-semibold text-gray-900">{receipt.booking_date} ({receipt.start_time?.substring(0, 5)} - {receipt.end_time?.substring(0, 5)} น.)</span>
            </div>
            {receipt.booking_code && (
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{t('label_booking_code', 'รหัสการจอง')}:</span>
                <span className="font-mono font-bold text-brand-600">{receipt.booking_code}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-2.5">รายการ (Item Description)</th>
                  <th className="p-2.5 text-right">จำนวนเงิน ({t('receipt_baht', 'บาท')})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2.5">
                    <p className="font-semibold text-gray-800">ค่าบำรุงรักษาสนามกีฬา ({receipt.court_name})</p>
                    <p className="text-[11px] text-gray-500">รอบเวลา {receipt.start_time?.substring(0, 5)} - {receipt.end_time?.substring(0, 5)} น.</p>
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold">{amount.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-brand-50/50 border-t border-gray-200">
                <tr>
                  <td className="p-3 font-bold text-gray-900">{t('receipt_amount', 'ยอดชำระสุทธิ')} (Total Net Amount)</td>
                  <td className="p-3 text-right font-mono font-extrabold text-base text-brand-700">{amount.toFixed(2)} ฿</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status Badge & Legal Note */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">สถานะ: ชำระเงินเรียบร้อยแล้ว (Payment Completed)</p>
              <p className="text-[10px] text-emerald-700">ตรวจสอบและรับรองความถูกต้องโดยระบบ KKU SportPass</p>
            </div>
          </div>

          <div className="text-center pt-2 pb-1 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 leading-relaxed flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-gray-400" />
              {t('receipt_official_seal', 'เอกสารนี้ออกโดยระบบอัตโนมัติ มีผลสมบูรณ์ตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
