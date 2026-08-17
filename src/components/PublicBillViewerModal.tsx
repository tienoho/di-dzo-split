import React, { useState } from 'react';
import { Bill, Member } from '../types';
import { 
  X, 
  Calendar, 
  Store, 
  Users, 
  DollarSign, 
  QrCode, 
  Share2, 
  Copy, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  Clock, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ReceiptText,
  CreditCard,
  Building2,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface PublicBillViewerModalProps {
  bill: Bill;
  onClose: () => void;
}

const bankCodeMap: Record<string, string> = {
  mbbank: 'MB',
  vcb: 'VCB',
  tcb: 'TCB',
  acb: 'ACB',
  bidv: 'BIDV',
  vietinbank: 'CTG',
  vpb: 'VPB',
  tpbank: 'TPB',
  vib: 'VIB',
  hdbank: 'HDB',
  sacombank: 'STB'
};

export default function PublicBillViewerModal({ bill, onClose }: PublicBillViewerModalProps) {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [selectedMemberForQR, setSelectedMemberForQR] = useState<Member | null>(null);

  // Bank settings from localStorage for VietQR calculation if available
  const bankName = localStorage.getItem('nhau_bank_name') || 'mbbank';
  const bankNo = localStorage.getItem('nhau_bank_no') || '';
  const bankAccountName = localStorage.getItem('nhau_bank_account_name') || '';

  const dateObj = new Date(bill.date);
  const friendlyDate = !isNaN(dateObj.getTime()) 
    ? `${dateObj.getDate()} Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`
    : 'Gần đây';
  const friendlyTime = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
    : '';

  // Primary payer/host identification
  const primaryPayer = bill.members.find(m => m.initialPaid > m.finalShare) || bill.members[0];

  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Đã sao chép Link xem hóa đơn vào bộ nhớ tạm! 🔗");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      toast.error("Không thể sao chép link.");
    }
  };

  const handleShareText = async () => {
    let text = `🍻 HÓA ĐƠN CUỘC NHẬU: ${bill.venueName}\n`;
    text += `📅 Thời gian: ${friendlyDate} ${friendlyTime ? `lúc ${friendlyTime}` : ''}\n`;
    text += `💰 Tổng hóa đơn: ${bill.totalAmount.toLocaleString('vi-VN')} đ\n\n`;
    text += `👥 CHI TIẾT CHIA TIỀN TỪNG NGƯỜI:\n`;
    
    bill.members.forEach(m => {
      const diff = m.finalShare - m.initialPaid;
      text += `- ${m.name}: Gánh ${m.finalShare.toLocaleString('vi-VN')} đ `;
      if (m.penaltyAmount && m.penaltyAmount > 0) {
        text += `(Phạt ${m.penaltyAmount.toLocaleString('vi-VN')}đ) `;
      }
      if (diff > 0) {
        text += `👉 Cần chuyển: ${diff.toLocaleString('vi-VN')} đ\n`;
      } else if (diff < 0) {
        text += `👉 Nhận lại: ${Math.abs(diff).toLocaleString('vi-VN')} đ\n`;
      } else {
        text += `👉 Đã thanh toán đủ\n`;
      }
    });

    text += `\n🔗 Link xem chi tiết trực tiếp trên web:\n${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hóa đơn ${bill.venueName}`,
          text: text
        });
      } catch (err) {
        console.log("Share dismissed");
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(true);
        toast.success("Đã copy toàn bộ nội dung chi tiết hóa đơn! 📋");
        setTimeout(() => setCopiedText(false), 2500);
      } catch (err) {
        toast.error("Không thể sao chép.");
      }
    }
  };

  // Generate VietQR URL for a specific member
  const getMemberVietQRUrl = (member: Member) => {
    const diff = member.finalShare - member.initialPaid;
    if (diff <= 0) return '';
    const formattedAmount = Math.round(diff);
    const debtorTag = removeVietnameseTones(member.name);
    const venueTag = removeVietnameseTones(bill.venueName.substring(0, 8));
    const memo = `${debtorTag} tra tien ${venueTag}`.trim();
    const mappedBankCode = bankCodeMap[bankName.toLowerCase()] || bankName;
    return `https://img.vietqr.io/image/${mappedBankCode}-${bankNo}-compact2.png?amount=${formattedAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(bankAccountName)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] max-w-3xl w-full shadow-2xl overflow-hidden my-auto"
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 p-5 sm:p-6 border-b-4 border-slate-900 dark:border-slate-800 text-slate-950 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-slate-100 text-slate-900 rounded-full border-2 border-slate-900 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5 font-black" />
          </button>

          <div className="flex items-center gap-2 bg-slate-950/20 w-fit px-3 py-1 rounded-full border border-white/20 mb-2">
            <ReceiptText className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">HÓA ĐƠN XEM TRỰC TIẾP</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 flex items-center gap-2 leading-tight">
            🍻 {bill.venueName}
          </h2>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs font-bold text-slate-900/90">
            <span className="flex items-center gap-1 bg-white/40 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              {friendlyDate} {friendlyTime && `• ${friendlyTime}`}
            </span>
            {primaryPayer && (
              <span className="flex items-center gap-1 bg-white/40 px-2.5 py-1 rounded-lg">
                <Users className="w-3.5 h-3.5" />
                Chủ chi: <strong>{primaryPayer.name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-orange-50 dark:bg-slate-800/90 border-2 border-orange-200 dark:border-slate-700 p-3 rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 block">Tổng Hóa Đơn</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {bill.totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Tiền Mồi Gốc</span>
              <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
                {(bill.rawAmount || bill.totalAmount).toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Tip & Thuế Phí</span>
              <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
                {((bill.tipAmount || 0) + (bill.additionalFee || 0)).toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Số Thành Viên</span>
              <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
                {bill.members.length} người
              </span>
            </div>
          </div>

          {bill.note && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/50 p-3.5 rounded-2xl text-xs font-bold text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <span className="text-base shrink-0">📝</span>
              <p className="leading-relaxed"><strong className="text-amber-950 dark:text-amber-100">Ghi chú:</strong> {bill.note}</p>
            </div>
          )}

          {/* DETAILED MEMBERS BREAKDOWN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" /> Bảng phân bổ chi phí chi tiết
              </h3>
              <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                Sòng phẳng từng đồng
              </span>
            </div>

            {/* DESKTOP TABLE VIEW (sm and up) */}
            <div className="hidden sm:block border-2 border-slate-900 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Thành viên</th>
                    <th className="p-3">Phần gánh</th>
                    <th className="p-3">Đã chi tại bàn</th>
                    <th className="p-3 text-right">Trạng thái / Cần chuyển</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-bold">
                  {bill.members.map((member, idx) => {
                    const diff = member.finalShare - member.initialPaid;
                    const isDebtor = diff > 0;
                    const isCreditor = diff < 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-orange-100 dark:bg-slate-800 rounded-full border border-orange-300 dark:border-slate-600 flex items-center justify-center font-black text-orange-600 dark:text-orange-400 text-xs shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 dark:text-white block">{member.name}</span>
                              {member.penaltyAmount && member.penaltyAmount > 0 ? (
                                <span className="text-[10px] font-black text-red-500 block">
                                  ⚠️ Phạt: +{member.penaltyAmount.toLocaleString('vi-VN')}đ
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-black text-slate-800 dark:text-slate-200">
                          {member.finalShare.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {member.initialPaid.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="p-3 text-right">
                          {isDebtor ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-xl text-xs font-black">
                                <TrendingDown className="w-3 h-3" /> Cần ck {diff.toLocaleString('vi-VN')}đ
                              </span>
                              {bankNo && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberForQR(member)}
                                  className="text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
                                  title="Mở mã VietQR chuyển khoản nhanh"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> Quét QR
                                </button>
                              )}
                            </div>
                          ) : isCreditor ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-xs font-black">
                              <TrendingUp className="w-3 h-3" /> Nhận lại {Math.abs(diff).toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-black">
                              <Check className="w-3 h-3 text-emerald-500" /> Đã đủ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD LIST VIEW (sm and below) */}
            <div className="block sm:hidden space-y-2.5">
              {bill.members.map((member, idx) => {
                const diff = member.finalShare - member.initialPaid;
                const isDebtor = diff > 0;
                const isCreditor = diff < 0;

                return (
                  <div 
                    key={idx} 
                    className="bg-white dark:bg-slate-800/90 border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-100 dark:bg-slate-700 rounded-full border border-orange-300 dark:border-slate-600 flex items-center justify-center font-black text-orange-600 dark:text-orange-400 text-xs shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 dark:text-white text-xs block">{member.name}</span>
                          {member.penaltyAmount && member.penaltyAmount > 0 ? (
                            <span className="text-[10px] font-black text-red-500">
                              Phạt: +{member.penaltyAmount.toLocaleString('vi-VN')}đ
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {isDebtor ? (
                        <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2.5 py-0.5 rounded-lg">
                          Cần ck {diff.toLocaleString('vi-VN')}đ
                        </span>
                      ) : isCreditor ? (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg">
                          Nhận lại {Math.abs(diff).toLocaleString('vi-VN')}đ
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500" /> Đã đủ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1 border-t border-dashed border-slate-100 dark:border-slate-700">
                      <span>Phần gánh: <strong className="text-slate-800 dark:text-slate-200 font-black">{member.finalShare.toLocaleString('vi-VN')}đ</strong></span>
                      <span>Đã chi: <strong className="text-slate-800 dark:text-slate-200">{member.initialPaid.toLocaleString('vi-VN')}đ</strong></span>
                    </div>

                    {isDebtor && bankNo && (
                      <button
                        type="button"
                        onClick={() => setSelectedMemberForQR(member)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-2xs cursor-pointer mt-1"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Quét mã VietQR chuyển khoản
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ATTACHED RECEIPT IMAGE PREVIEW */}
          {bill.receiptImage && (
            <div className="space-y-2 border-t-2 border-dashed border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                📸 Ảnh chụp hóa đơn gốc đối chứng
              </h4>
              <div 
                onClick={() => setActiveZoomImage(bill.receiptImage || null)}
                className="relative group cursor-zoom-in rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 max-h-44 sm:max-h-48 bg-slate-950"
              >
                <img 
                  src={bill.receiptImage} 
                  alt="Hóa đơn thanh toán" 
                  className="w-full h-44 sm:h-48 object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                  <span className="text-[11px] font-black text-white bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1">
                    🔍 Nhấp để phóng to hóa đơn
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SHARING & ACTION BUTTONS */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 p-3.5 sm:p-4 rounded-2xl space-y-2.5">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 block">
              Chia sẻ nhanh hóa đơn
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-5xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Đã sao chép Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-500" />
                    <span>Sao chép Link xem Bill</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareText}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2.5 px-3 rounded-xl border-2 border-slate-900 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-5xs cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Gửi qua Zalo / Messenger</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-400">
            <span>🍻 Tạo bởi Dzô! Split - Chia tiền sòng phẳng</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 font-black text-xs px-6 py-2.5 rounded-xl border-2 border-slate-900 transition-transform active:scale-95 cursor-pointer text-center"
            >
              Đóng & Vào tạo Bill mới ✨
            </button>
          </div>
        </div>
      </motion.div>

      {/* POPUP VIETQR FOR SELECTED MEMBER */}
      <AnimatePresence>
        {selectedMemberForQR && (
          <div 
            onClick={() => setSelectedMemberForQR(null)}
            className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[28px] max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedMemberForQR(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-900 flex items-center justify-center font-black"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 block">THANH TOÁN SÒNG PHẲNG 💸</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedMemberForQR.name}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  Số tiền cần chuyển: <strong className="text-red-500 font-black text-sm">{(selectedMemberForQR.finalShare - selectedMemberForQR.initialPaid).toLocaleString('vi-VN')} đ</strong>
                </p>
              </div>

              {bankNo && (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 inline-block shadow-inner">
                    <img 
                      src={getMemberVietQRUrl(selectedMemberForQR)} 
                      alt="Mã QR thanh toán VietQR" 
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-left text-xs font-bold space-y-1">
                    <p className="text-slate-700 dark:text-slate-300">🏦 Ngân hàng: <strong>{bankCodeMap[bankName.toLowerCase()] || bankName.toUpperCase()}</strong></p>
                    <p className="text-slate-700 dark:text-slate-300">💳 Số TK: <strong>{bankNo}</strong></p>
                    {bankAccountName && <p className="text-slate-700 dark:text-slate-300">👤 Chủ TK: <strong>{bankAccountName.toUpperCase()}</strong></p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(bankNo);
                      toast.success("Đã copy Số tài khoản!");
                    }}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs py-2.5 rounded-xl border-2 border-slate-900 cursor-pointer"
                  >
                    📋 Sao chép Số Tài Khoản
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SIZE ZOOM IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {activeZoomImage && (
          <div 
            onClick={() => setActiveZoomImage(null)}
            className="fixed inset-0 z-60 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <button 
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white text-slate-950 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
            >
              <X className="w-6 h-6 font-black" />
            </button>
            <img 
              src={activeZoomImage} 
              alt="Hóa đơn phóng to" 
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl border-4 border-white/20 shadow-2xl" 
            />
            <p className="text-white text-xs font-bold mt-3">Nhấp bất kỳ đâu để đóng ảnh phóng to</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
