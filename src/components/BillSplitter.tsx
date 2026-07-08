import React, { useState, useEffect } from 'react';
import { Bill, Member, Venue } from '../types';
import { Plus, Trash, Users, Calculator, Gift, Sparkles, Store, CreditCard, ChevronRight, Camera } from 'lucide-react';
import ReceiptScanner from './ReceiptScanner';

interface BillSplitterProps {
  venues: Venue[];
  onAddVenue: (venue: Omit<Venue, 'id' | 'visitsCount'>) => Venue;
  onSaveBill: (bill: Omit<Bill, 'id'>) => void;
  activeCreatorName: string;
  contacts: Record<string, { phone?: string; messenger?: string }>;
}

const COMMON_MEMBERS_PRESETS = [
  'Tuấn Anh (Bạn)',
  'Minh Quân',
  'Thanh Trúc',
  'Hồng Vân',
  'Vũ Hoàng',
  'Hải Đăng',
  'Bảo Lâm',
  'Ngọc Mai'
];

export default function BillSplitter({ venues, onAddVenue, onSaveBill, activeCreatorName, contacts }: BillSplitterProps) {
  const presetNames = Object.keys(contacts).length > 0 
    ? Object.keys(contacts) 
    : COMMON_MEMBERS_PRESETS;
  // Input states
  const [rawAmount, setRawAmount] = useState<number>(0);
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [useTipPercent, setUseTipPercent] = useState<boolean>(true);
  const [additionalFee, setAdditionalFee] = useState<number>(0); // e.g. VAT
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  
  // Venue States
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [showNewVenueForm, setShowNewVenueForm] = useState<boolean>(false);
  const [newVenueName, setNewVenueName] = useState<string>('');
  const [newVenueAddress, setNewVenueAddress] = useState<string>('');
  const [newVenueNotes, setNewVenueNotes] = useState<string>('');

  // Members lists
  const [members, setMembers] = useState<Member[]>([
    { name: activeCreatorName, initialPaid: 0, finalShare: 0, hasPaidDebt: true, percentage: 100 }
  ]);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'unequal'>('equal');

  // Success indicator
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  
  // AI Receipt scanner states
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scannedReceiptImage, setScannedReceiptImage] = useState<string | undefined>(undefined);

  // Helper function to distribute percentages as evenly as imaginable
  const autoDistributePercentages = (currentMembers: Member[]): Member[] => {
    if (currentMembers.length === 0) return currentMembers;
    const basePercent = Math.floor(100 / currentMembers.length);
    const remainder = 100 - basePercent * currentMembers.length;
    return currentMembers.map((m, idx) => {
      const pct = idx === 0 ? basePercent + remainder : basePercent;
      return {
        ...m,
        percentage: pct,
        finalShare: Math.round((totalAmount * pct) / 100)
      };
    });
  };

  const handleScanComplete = (data: { venueName: string; totalAmount: number; note: string; imageBase64?: string }) => {
    if (data.totalAmount > 0) {
      setRawAmount(data.totalAmount);
    }
    
    if (data.note) {
      setNote(data.note);
    }

    if (data.imageBase64) {
      setScannedReceiptImage(data.imageBase64);
    }

    if (data.venueName) {
      const lowerName = data.venueName.toLowerCase();
      const matched = venues.find(v => 
        v.name.toLowerCase().includes(lowerName) || 
        lowerName.includes(v.name.toLowerCase())
      );
      
      if (matched) {
        setSelectedVenueId(matched.id);
      } else {
        const added = onAddVenue({
          name: data.venueName,
          address: 'Nhận diện tự động từ máy ảnh 📸',
          notes: 'Quét chuẩn xác 10/10',
          rating: 4.5
        });
        setSelectedVenueId(added.id);
      }
    }
    
    setShowScanner(false);
  };

  // Synchronize tip percent and raw tip amount
  useEffect(() => {
    if (useTipPercent) {
      setTipAmount((rawAmount * tipPercent) / 100);
    } else {
      if (rawAmount > 0) {
        setTipPercent(Math.round((tipAmount / rawAmount) * 100));
      } else {
        setTipPercent(0);
      }
    }
  }, [rawAmount, tipPercent, tipAmount, useTipPercent]);

  // Recalculate bill summary totals
  const totalAmount = Math.max(0, rawAmount + tipAmount + additionalFee - discountAmount);

  // Recalculate equal shares or prepare unequal template
  useEffect(() => {
    if (members.length === 0) return;
    
    if (splitType === 'equal') {
      const perCapitaShare = totalAmount / members.length;
      setMembers(prev => prev.map(m => ({
        ...m,
        finalShare: Math.round(perCapitaShare)
      })));
    } else if (splitType === 'percentage') {
      setMembers(prev => prev.map(m => {
        const pct = m.percentage !== undefined ? m.percentage : 0;
        return {
          ...m,
          percentage: pct,
          finalShare: Math.round((totalAmount * pct) / 100)
        };
      }));
    }
  }, [totalAmount, splitType, members.length]);

  const handleAddMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("Người này đã có trong danh sách nhóm!");
      return;
    }
    const isSelf = trimmed === activeCreatorName;
    const newMember: Member = { name: trimmed, initialPaid: 0, finalShare: 0, hasPaidDebt: isSelf, percentage: 0 };
    
    if (splitType === 'percentage') {
      setMembers(prev => autoDistributePercentages([...prev, newMember]));
    } else {
      // Divide equally if standard equal mode, otherwise append normally
      setMembers([...members, newMember]);
    }
    setNewMemberName('');
  };

  const handleTogglePresetMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existingIndex = members.findIndex(m => m.name.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex > -1) {
      if (members.length <= 1) {
        alert("Cuộc nhậu phải có ít nhất 1 người tham gia gánh vác chứ!");
        return;
      }
      const filtered = members.filter((_, i) => i !== existingIndex);
      if (splitType === 'percentage') {
        setMembers(autoDistributePercentages(filtered));
      } else {
        setMembers(filtered);
      }
    } else {
      const isSelf = trimmed.toLowerCase() === activeCreatorName.toLowerCase();
      const newMember: Member = { name: trimmed, initialPaid: 0, finalShare: 0, hasPaidDebt: isSelf, percentage: 0 };
      const updated = [...members, newMember];
      if (splitType === 'percentage') {
        setMembers(autoDistributePercentages(updated));
      } else {
        setMembers(updated);
      }
    }
  };

  const handleRemoveMember = (index: number) => {
    if (members.length <= 1) {
      alert("Cuộc nhậu phải có ít nhất 1 người tham gia gánh vác chứ!");
      return;
    }
    const filtered = members.filter((_, i) => i !== index);
    if (splitType === 'percentage') {
      setMembers(autoDistributePercentages(filtered));
    } else {
      setMembers(filtered);
    }
  };

  const handleInitialPaidChange = (index: number, val: number) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, initialPaid: val } : m));
  };

  const handleCustomShareChange = (index: number, val: number) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, finalShare: val } : m));
  };

  const handlePercentageChange = (index: number, val: number) => {
    const pct = Math.max(0, Math.min(100, val));
    setMembers(prev => prev.map((m, i) => {
      if (i === index) {
        return {
          ...m,
          percentage: pct,
          finalShare: Math.round((totalAmount * pct) / 100)
        };
      }
      return m;
    }));
  };

  // Helper calculation validators
  const sumInitialPaid = members.reduce((acc, m) => acc + m.initialPaid, 0);
  const sumFinalShare = members.reduce((acc, m) => acc + m.finalShare, 0);
  const sumPercentages = members.reduce((acc, m) => acc + (m.percentage || 0), 0);
  const discrepancyPaid = totalAmount - sumInitialPaid;
  const discrepancyShare = totalAmount - sumFinalShare;

  const handleCreateVenueInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim()) return;
    
    const added = onAddVenue({
      name: newVenueName,
      address: newVenueAddress,
      notes: newVenueNotes,
      rating: 4.0
    });
    
    setSelectedVenueId(added.id);
    setShowNewVenueForm(false);
    setNewVenueName('');
    setNewVenueAddress('');
    setNewVenueNotes('');
  };

  const handleQuickSplit = () => {
    // Collect all unique predefined members (activeUser + clean presets)
    const uniqueNames: string[] = [activeCreatorName];
    
    presetNames.forEach(presetName => {
      // Clean any "(Bạn)" or extra markers to avoid duplications
      const cleanedPreset = presetName.replace(/\s*\(Bạn\)\s*/gi, '').trim();
      const cleanedActive = activeCreatorName.replace(/\s*\(Bạn\)\s*/gi, '').trim();
      
      const isDuplicate = uniqueNames.some(
        name => name.toLowerCase() === cleanedPreset.toLowerCase() || 
                cleanedActive.toLowerCase() === cleanedPreset.toLowerCase()
      );
      
      if (!isDuplicate) {
        uniqueNames.push(cleanedPreset);
      }
    });

    const perCapita = Math.round(totalAmount / uniqueNames.length);

    setMembers(uniqueNames.map(name => {
      const isSelf = name.toLowerCase() === activeCreatorName.toLowerCase();
      return {
        name,
        // Host typically pays the full dining bill upfront, others owe debt
        initialPaid: isSelf ? totalAmount : 0,
        finalShare: perCapita,
        hasPaidDebt: isSelf
      };
    }));
    setSplitType('equal');
  };

  const handleSaveForm = () => {
    if (rawAmount <= 0) {
      alert("Hãy nhập số tiền hóa đơn hợp lệ (> 0đ) trước khi lưu!");
      return;
    }

    if (members.length === 0) {
      alert("Hãy điền ít nhất một người tham gia cuộc nhậu!");
      return;
    }

    // Check custom paid discrepancy
    if (Math.abs(discrepancyPaid) > 100) {
      alert(`Tổng số tiền các thành viên đã thanh toán trên bàn ăn (đã đưa cho quán) là ${sumInitialPaid.toLocaleString('vi-VN')}đ, nhưng tổng hóa đơn thực tế là ${totalAmount.toLocaleString('vi-VN')}đ.\n\nVui lòng điều chỉnh ai là người đã chi trả cho khớp!`);
      return;
    }

    if (splitType === 'unequal' && Math.abs(discrepancyShare) > 100) {
      alert(`Bạn chọn chia tùy chỉnh nhưng tổng tiền đóng góp của mọi người (${sumFinalShare.toLocaleString('vi-VN')}đ) chưa khớp với tổng hóa đơn phải trả (${totalAmount.toLocaleString('vi-VN')}đ).\n\nMức chênh lệch hiện tại: ${discrepancyShare.toLocaleString('vi-VN')}đ.`);
      return;
    }

    if (splitType === 'percentage' && sumPercentages !== 100) {
      alert(`Tổng tỷ lệ phần trăm hiện tại là ${sumPercentages}%. Để chia tiền theo %, tổng tỷ lệ phần trăm của tất cả chiến hữu phải bằng đúng 100%!`);
      return;
    }

    let finalProcessedMembers = [...members];
    if (splitType === 'percentage') {
      const calculatedSum = finalProcessedMembers.reduce((acc, m) => acc + m.finalShare, 0);
      const moneyDiff = totalAmount - calculatedSum;
      if (moneyDiff !== 0 && finalProcessedMembers.length > 0) {
        // Adjust host or first member to match exact money amount
        finalProcessedMembers[0] = {
          ...finalProcessedMembers[0],
          finalShare: finalProcessedMembers[0].finalShare + moneyDiff
        };
      }
    }

    const matchedVenue = venues.find(v => v.id === selectedVenueId);

    const billData: Omit<Bill, 'id'> = {
      venueId: selectedVenueId || 'unknown',
      venueName: matchedVenue ? matchedVenue.name : 'Quá nhậu vỉa hè / Không rõ',
      date: new Date().toISOString(),
      rawAmount,
      tipPercent,
      tipAmount,
      additionalFee,
      discountAmount,
      totalAmount,
      splitType,
      note,
      members: finalProcessedMembers.map(m => {
        // Creditors are marked paid, and debtors start as unpaid unless they paid their full debt initial share
        const isSelf = m.name === activeCreatorName;
        const owes = m.finalShare - m.initialPaid;
        return {
          ...m,
          hasPaidDebt: owes <= 0 || isSelf
        };
      }),
      receiptImage: scannedReceiptImage
    };

    onSaveBill(billData);
    setSavedSuccess(true);
    
    // Clear inputs smoothly
    setRawAmount(0);
    setTipPercent(0);
    setTipAmount(0);
    setAdditionalFee(0);
    setDiscountAmount(0);
    setNote('');
    setSelectedVenueId('');
    setScannedReceiptImage(undefined);
    
    // Reset members of choice
    setMembers([{ name: activeCreatorName, initialPaid: 0, finalShare: 0, hasPaidDebt: true }]);

    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  // Preset shortcut amounts
  const presetAmounts = [200000, 500000, 1000000, 2000000, 3500000];

  return (
    <div className="space-y-6" id="bill-splitter-section">
      {savedSuccess && (
        <div id="alert-save-success" className="bg-emerald-400 border-4 border-slate-900 text-slate-900 px-5 py-4 rounded-3xl shadow-md flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-slate-900" />
            <span className="text-sm font-black">
              YÊU CẦU ĐÃ LƯU! Hóa đơn cuộc nhậu đã được chia đều & lưu lịch sử thành công sòng phẳng!
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input Details */}
        <div className="lg:col-span-7 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-6">
          <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-7 bg-orange-500 rounded-full inline-block"></span>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <Calculator className="w-6 h-6 text-orange-500" />
                  Điền Tiền Hóa Đơn
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-500">Thiết lập chi tiết hóa đơn, cước bổ sung và tích vào quán quen.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center gap-2 bg-slate-950 text-white font-extrabold text-[11px] uppercase tracking-wide px-4 py-3 rounded-2xl hover:bg-orange-600 hover:text-slate-950 hover:-translate-y-0.5 border-2 border-slate-950 cursor-pointer shadow-md transition-all shrink-0 animate-pulse"
            >
              <Camera className="w-4 h-4 text-orange-400" />
              <span>Quét Hóa Đơn AI 🤖</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* Scanned Image Proof Banner */}
            {scannedReceiptImage && (
              <div id="attached-receipt-proof" className="bg-orange-50 border-3 border-orange-500 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3 animate-slideIn">
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <img 
                      src={scannedReceiptImage} 
                      className="w-12 h-12 object-cover rounded-xl border-2 border-slate-900 shadow-xs" 
                      referrerPolicy="no-referrer"
                      alt="Receipt Proof" 
                    />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      🧾 Đã đính biên lai làm bằng chứng!
                    </span>
                    <span className="text-[10px] text-slate-500 font-extrabold block mt-0.5 leading-snug">
                      Ảnh chụp này sẽ lưu vào lịch sử làm bằng chứng đóng góp sòng phẳng.
                    </span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setScannedReceiptImage(undefined)}
                  className="text-[9px] font-black text-slate-50 bg-red-600 hover:bg-red-700 border-2 border-slate-900 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  GỠ KHỎI BILL
                </button>
              </div>
            )}

            {/* Raw amount with beautiful slider/shortcuts */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Số tiền mồi nước tại bàn (VND) <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={rawAmount || ''}
                  onChange={(e) => setRawAmount(Number(e.target.value))}
                  className="w-full text-2xl font-black bg-yellow-50/50 border-3 border-slate-900 focus:border-orange-500 focus:bg-white rounded-2xl py-4 pl-5 pr-12 text-slate-900 tracking-wide transition-all focus:outline-hidden"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">đ</span>
              </div>
              
              {/* Preset quick values */}
              <div className="flex flex-wrap gap-2 pt-1">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRawAmount(amt)}
                    className="px-3.5 py-2 text-xs font-black bg-yellow-100 hover:bg-orange-400 hover:text-white text-slate-800 border-2 border-slate-900 rounded-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    +{amt.toLocaleString('vi-VN')} đ
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Venue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-orange-500" />
                  Chọn Quán Quen Tủ
                </label>
                <button
                  type="button" 
                  onClick={() => setShowNewVenueForm(!showNewVenueForm)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-extrabold cursor-pointer underline decoration-wavy decoration-orange-300"
                >
                  {showNewVenueForm ? 'Hủy thêm quán' : '⚡ Tạo nhanh quán ngon'}
                </button>
              </div>

              {showNewVenueForm ? (
                <form onSubmit={handleCreateVenueInline} className="bg-yellow-50/80 border-3 border-slate-900 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black text-orange-600 uppercase tracking-wider flex items-center gap-1">📍 Thêm địa bàn ăn uống mới</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tên quán..."
                      required
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                      className="text-xs bg-white border-2 border-slate-900 outline-hidden focus:border-orange-500 p-2 rounded-xl font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Địa chỉ..."
                      value={newVenueAddress}
                      onChange={(e) => setNewVenueAddress(e.target.value)}
                      className="text-xs bg-white border-2 border-slate-900 outline-hidden focus:border-orange-500 p-2 rounded-xl font-bold"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Món đinh (ví dụ: Chân gà quái thú 10 điểm)..."
                    value={newVenueNotes}
                    onChange={(e) => setNewVenueNotes(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-slate-900 outline-hidden focus:border-orange-500 p-2 rounded-xl font-bold"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-orange-500 border border-slate-900 transition-colors"
                    >
                      Tạo & Chọn Luôn
                    </button>
                  </div>
                </form>
              ) : (
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full bg-yellow-50/20 border-3 border-slate-900 outline-hidden focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-slate-800 text-xs font-black transition-all"
                >
                  <option value="">-- Click chọn quán trong danh sách quán quen của nhóm --</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      🍻 {venue.name} ({venue.address || 'Vỉa hè dạo'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* TIP AND EXTRA CHARGE SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* Tip Input */}
              <div className="border-3 border-slate-900 rounded-[20px] p-4 bg-orange-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Tiền Bo / Tip</span>
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-400">
                    <button
                      type="button"
                      onClick={() => setUseTipPercent(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-colors ${useTipPercent ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseTipPercent(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-colors ${!useTipPercent ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      đ
                    </button>
                  </div>
                </div>

                {useTipPercent ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="5"
                        value={tipPercent}
                        onChange={(e) => setTipPercent(Number(e.target.value))}
                        className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-xs font-black text-slate-900 w-10 text-right bg-white px-1.5 py-0.5 rounded border border-slate-350">{tipPercent}%</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">Quy đổi: +{tipAmount.toLocaleString('vi-VN')} đ</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Nhập mốc tiền bo..."
                      value={tipAmount || ''}
                      onChange={(e) => setTipAmount(Number(e.target.value))}
                      className="w-full text-xs font-bold bg-white border-2 border-slate-900 focus:border-orange-500 rounded-xl p-2.5 pr-6"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">đ</span>
                  </div>
                )}
              </div>

              {/* VAT & Fees */}
              <div className="border-3 border-slate-900 rounded-[20px] p-4 bg-teal-50/50 space-y-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">VAT / Phụ Thu (Khăn, Đá)</span>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    value={additionalFee || ''}
                    onChange={(e) => setAdditionalFee(Number(e.target.value))}
                    className="w-full text-xs font-bold bg-white border-2 border-slate-900 focus:border-teal-500 rounded-xl p-2.5 pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">đ</span>
                </div>
                
                {/* 10% auto button */}
                <button
                  type="button"
                  onClick={() => setAdditionalFee(Math.round(rawAmount * 0.1))}
                  className="w-full text-[10px] text-center bg-white hover:bg-teal-400 hover:text-white border-2 border-slate-900 py-1.5 rounded-xl text-slate-800 font-extrabold transition-all"
                >
                  Tự động tính thêm 10% VAT
                </button>
              </div>

            </div>

            {/* Voucher discount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-3 border-slate-900 rounded-[20px] p-4 bg-yellow-50/40 space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                  <Gift className="w-4 h-4 text-orange-500 animate-bounce" />
                  Mã Giảm Giá / Voucher (VND)
                </span>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Nhập tiền được giảm..."
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full text-xs bg-white border-2 border-slate-900 focus:border-orange-500 rounded-xl p-2.5 pr-6 font-bold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">đ</span>
                </div>
              </div>

              <div className="border-3 border-slate-900 rounded-[20px] p-4 bg-slate-50 space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">Nhãn / Ghi chú buổi nhậu</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Sinh nhật Cu Tý, Tết Đoan Ngọ..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-900 focus:border-slate-800 rounded-xl p-2.5 font-bold"
                />
              </div>
            </div>

            {/* GRAND TOTAL BOARD DESIGN - NEO BRUTALIST VIBRANT YELLOW/ORANGE */}
            <div className="bg-orange-500 text-slate-900 rounded-[24px] border-4 border-slate-900 p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-white font-black block uppercase tracking-wider mb-1">Cộng Tổng Tiền Toàn Bill</span>
                <span className="text-3xl font-black tracking-tight text-white drop-shadow-[2px_2px_0px_rgba(15,23,42,0.8)]">
                  {totalAmount.toLocaleString('vi-VN')} <span className="text-lg">VND</span>
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-900 font-extrabold space-y-1 bg-yellow-100 p-3 rounded-2xl border-2 border-slate-900 w-full sm:w-auto">
                <div>Gốc nước: {rawAmount.toLocaleString('vi-VN')} đ</div>
                <div className="text-orange-600">Tip & Phụ phí: +{(tipAmount + additionalFee).toLocaleString('vi-VN')} đ</div>
                <div className="text-emerald-600">Giảm trừ voucher: -{discountAmount.toLocaleString('vi-VN')} đ</div>
              </div>
            </div>

          </div>
        </div>
        
        {/* RIGHT COLUMN: Member Setup & Contribution split */}
        <div className="lg:col-span-5 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-7 bg-teal-500 rounded-full inline-block"></span>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <Users className="w-6 h-6 text-teal-500" />
                  Chiến Hữu Vào Cuộc
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-500">Cộng thêm người và điều chỉnh số mồi nước họ đã đóng góp.</p>
            </div>

            {/* Quick Split Board */}
            <div id="quick-split-board" className="bg-orange-50 border-3 border-orange-500 p-4.5 rounded-3xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600 animate-pulse" />
                  <span className="text-xs font-black text-orange-950 uppercase tracking-wider">⚡ Chia Nhanh Nhóm Bạn Thân (Quick Split)</span>
                </div>
                <span className="bg-orange-200 text-orange-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-orange-400">Có sẵn {presetNames.length + 1} người</span>
              </div>
              <p className="text-[10px] font-extrabold text-orange-800 leading-relaxed">
                Tự động điền nhanh tất cả các chiến hữu trong nhóm cố định và chia đều số tiền {totalAmount.toLocaleString('vi-VN')} đ tăm tắp (Host gánh thanh toán trước tại quán).
              </p>
              <button
                type="button"
                onClick={handleQuickSplit}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider py-3 px-4 border-2 border-slate-900 rounded-2xl hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-white" />
                <span>Chia Đều Cả Nhóm Ngay 🍻</span>
              </button>
            </div>

            {/* Quick Presets for Members */}
            <div className="bg-yellow-50/50 border-3 border-slate-900 p-4 rounded-3xl space-y-2.5">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">⭐ Gọi nhanh từ danh bạ:</span>
              <div className="flex flex-wrap gap-1.5">
                {presetNames.map((name) => {
                  const alreadyChosen = members.some(m => m.name.toLowerCase() === name.toLowerCase());
                  return (
                    <button
                      key={name}
                      onClick={() => handleTogglePresetMember(name)}
                      type="button"
                      className={`text-[10px] px-3 py-1.5 rounded-xl font-black border-2 transition-transform cursor-pointer ${
                        alreadyChosen
                          ? 'bg-teal-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5'
                          : 'bg-white hover:bg-orange-100 text-slate-800 border-slate-900 hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                    >
                      {alreadyChosen ? '✓' : '+'} {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Strategy Choice */}
            <div className="grid grid-cols-3 gap-1.5 bg-yellow-105 bg-yellow-100 border-2 border-slate-900 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`text-[10px] sm:text-xs py-2 text-center font-black rounded-xl cursor-pointer transition-all ${splitType === 'equal' ? 'bg-orange-500 text-white shadow-xs border border-transparent' : 'text-slate-700 hover:bg-yellow-50/50'}`}
              >
                Chia Đều
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitType('percentage');
                  setMembers(prev => autoDistributePercentages(prev));
                }}
                className={`text-[10px] sm:text-xs py-2 text-center font-black rounded-xl cursor-pointer transition-all ${splitType === 'percentage' ? 'bg-orange-500 text-white shadow-xs border border-transparent' : 'text-slate-700 hover:bg-yellow-50/50'}`}
              >
                Tỷ lệ %
              </button>
              <button
                type="button"
                onClick={() => setSplitType('unequal')}
                className={`text-[10px] sm:text-xs py-2 text-center font-black rounded-xl cursor-pointer transition-all ${splitType === 'unequal' ? 'bg-orange-500 text-white shadow-xs border border-transparent' : 'text-slate-700 hover:bg-yellow-50/50'}`}
              >
                Nhập tay tiền
              </button>
            </div>

            {/* Add Custom Member Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: Anh Tám, Chị Tư..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember(newMemberName)}
                className="flex-1 text-xs bg-slate-50 border-2 border-slate-900 outline-hidden focus:border-orange-500 rounded-xl p-3 text-slate-900 font-extrabold"
              />
              <button
                onClick={() => handleAddMember(newMemberName)}
                className="px-4 py-2 bg-slate-900 hover:bg-teal-500 text-white rounded-xl text-xs font-black border-2 border-slate-900 hover:-translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>

            {/* List of current session members */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {members.map((member, index) => {
                const owes = member.finalShare - member.initialPaid;
                return (
                  <div key={member.name} className="bg-yellow-50/10 border-2 border-slate-900 rounded-2xl p-4.5 space-y-3 relative shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1">👤 {member.name}</span>
                      {member.name !== activeCreatorName && (
                        <button
                          onClick={() => handleRemoveMember(index)}
                          className="text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Initial Paid Amount */}
                      <div>
                        <label className="text-[10px] text-slate-500 font-black block mb-1 uppercase">Đã trả trước tại bàn (đ)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={member.initialPaid || ''}
                          onChange={(e) => handleInitialPaidChange(index, Number(e.target.value))}
                          className="w-full text-xs bg-white border-2 border-slate-900 outline-hidden focus:border-orange-500 p-2 rounded-xl text-slate-900 font-black"
                        />
                      </div>

                      {/* Final Due Amount / Percentage custom interface */}
                      {splitType === 'percentage' ? (
                        <div>
                          <label className="text-[10px] text-slate-500 font-black block mb-1 uppercase flex justify-between items-center">
                            <span>Tỷ lệ gánh (%)</span>
                            <span className="text-[11px] text-orange-600 font-black">{member.finalShare.toLocaleString('vi-VN')} đ</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative w-18 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={member.percentage !== undefined ? member.percentage : 0}
                                onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                                className="w-full text-xs bg-white border-2 border-orange-500 outline-hidden focus:border-orange-600 p-2 text-center text-slate-900 font-black rounded-xl pr-5"
                              />
                              <span className="absolute right-1 px-1.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500 pointer-events-none">%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={member.percentage !== undefined ? member.percentage : 0}
                              onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[10px] text-slate-500 font-black block mb-1 uppercase">
                            {splitType === 'equal' ? 'Trách nhiệm gánh (đ)' : 'Nhập tay số cần gánh'}
                          </label>
                          <input
                            type="number"
                            readOnly={splitType === 'equal'}
                            value={member.finalShare || ''}
                            onChange={(e) => handleCustomShareChange(index, Number(e.target.value))}
                            className={`w-full text-xs p-2 rounded-xl text-slate-900 font-black ${
                              splitType === 'equal' 
                                ? 'bg-slate-150 text-slate-450 border-2 border-slate-200 cursor-not-allowed text-center'
                                : 'bg-white border-2 border-orange-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-250 text-[10px] font-bold">
                      <span className="text-slate-500">Cân đối ví tiền:</span>
                      {owes > 0 ? (
                        <span className="font-extrabold text-red-600">Cần đóng: +{owes.toLocaleString('vi-VN')} đ</span>
                      ) : owes < 0 ? (
                        <span className="font-extrabold text-teal-600">Trả lại dư: -{Math.abs(owes).toLocaleString('vi-VN')} đ</span>
                      ) : (
                        <span className="font-extrabold text-[#111827]">Đã về mốc 0đ (Hòa)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation indicators */}
          <div className="pt-4 border-t-2 border-slate-100 space-y-3">
            {splitType === 'percentage' && sumPercentages !== 100 && (
              <div className="text-[11px] bg-red-100 text-red-950 p-3.5 rounded-2xl border-2 border-red-350 font-extrabold space-y-2">
                <div>
                  ⚠️ Tổng tỷ lệ phần trăm phân chi đang là <strong className="text-red-650 font-black text-xs">{sumPercentages}%</strong>. Cần điều chỉnh về đúng <strong className="text-teal-600 font-black text-xs">100%</strong> (Lệch {100 - sumPercentages}%).
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMembers(prev => autoDistributePercentages(prev));
                  }}
                  className="w-full bg-slate-900 hover:bg-orange-600 text-white hover:text-slate-900 text-[10px] py-1.5 px-3 rounded-xl border-2 border-slate-950 font-black uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
                >
                  🪄 Click Phân bổ đều % cho khớp tự động
                </button>
              </div>
            )}

            {splitType === 'unequal' && Math.abs(discrepancyShare) > 1 && (
              <div className="text-[11px] bg-red-100 text-red-800 p-3 rounded-2xl border-2 border-red-300 font-bold">
                ⚠️ Số tiền nhập thủ công bị chênh lệch so với hóa đơn tổng:{' '}
                <strong>{discrepancyShare.toLocaleString('vi-VN')}đ</strong>. Hãy phân chia lại cho đều.
              </div>
            )}

            {Math.abs(discrepancyPaid) > 1 && (
              <div className="text-[11px] bg-orange-100 text-orange-950 p-3 rounded-2xl border-2 border-orange-300 font-bold">
                ⚠️ Tổng hóa đơn là {totalAmount.toLocaleString('vi-VN')}đ nhưng tổng tiền mọi người chi tại chỗ mới là{' '}
                {sumInitialPaid.toLocaleString('vi-VN')}đ. Hãy điền ai là người thanh toán thực tế (hoặc tích Host trả trước).
              </div>
            )}

            <button
              onClick={handleSaveForm}
              className="w-full bg-slate-900 hover:bg-orange-500 text-white hover:text-slate-900 rounded-2xl py-4 text-xs font-black tracking-wider uppercase shadow-[4px_4px_0px_0px_rgba(251,146,60,0.8)] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:translate-y-0.5"
            >
              <CreditCard className="w-4 h-4" /> Lưu & Hoàn Tất Cuộc Nhậu
            </button>
          </div>
        </div>

      </div>

      {showScanner && (
        <ReceiptScanner 
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
