import React, { useState } from 'react';
import { Bill } from '../types';
import { Calendar, Search, FileDown, TrendingUp, DollarSign, Users, Store, Trash, ChevronDown, ChevronUp, Archive, Inbox, Filter, Clock, HelpCircle, X, PieChart, Sparkles, Brain, Coins, AlertTriangle, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateShareableBillUrl } from '../utils/shareLink';

interface HistoryAndReportsProps {
  bills: Bill[];
  onDeleteBill: (id: string) => void;
  onArchiveBill: (id: string, isArchived: boolean) => void;
}

export default function HistoryAndReports({ bills, onDeleteBill, onArchiveBill }: HistoryAndReportsProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // format "YYYY-MM" or "all"
  const [timeFilterType, setTimeFilterType] = useState<string>('all'); // 'all' | 'week' | 'month' | 'last-month' | 'specific-month'
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');

  // AI Budget Predictor States
  const [predicting, setPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predictAiProvider, setPredictAiProvider] = useState<'gemini' | 'deepseek'>(() => (localStorage.getItem('predict_ai_provider') as 'gemini' | 'deepseek') || 'gemini');

  const handlePredictBudget = async () => {
    setPredicting(true);
    setPredictionError(null);
    try {
      const response = await fetch('/api/predict-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills, provider: predictAiProvider })
      });
      const resData = await response.json();
      if (resData.success) {
        setPredictionResult(resData.data);
      } else {
        setPredictionError(resData.error || "Không thể tính toán ngân sách từ máy chủ.");
      }
    } catch (err: any) {
      setPredictionError(err.message || "Lỗi kết nối mạng khi tải dự toán ngân sách.");
    } finally {
      setPredicting(false);
    }
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (message: string, onConfirm: () => void, title: string = "Xác nhận") => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // Helpers to test dates
  const getIsThisCalendarWeek = (dateStr: string) => {
    try {
      const billDate = new Date(dateStr);
      const now = new Date();
      
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - distanceToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return billDate >= startOfWeek && billDate <= endOfWeek;
    } catch (e) {
      return false;
    }
  };

  const getIsThisCalendarMonth = (dateStr: string) => {
    try {
      const billDate = new Date(dateStr);
      const now = new Date();
      return billDate.getFullYear() === now.getFullYear() && billDate.getMonth() === now.getMonth();
    } catch (e) {
      return false;
    }
  };

  const getIsLastCalendarMonth = (dateStr: string) => {
    try {
      const billDate = new Date(dateStr);
      const now = new Date();
      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth() - 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      return billDate.getFullYear() === targetYear && billDate.getMonth() === targetMonth;
    } catch (e) {
      return false;
    }
  };

  // Group bills into selectable months for the filter dropdown based on active archive filter
  const availableMonths = React.useMemo(() => Array.from(new Set(
    bills
      .filter(b => archiveFilter === 'archived' ? !!b.isArchived : !b.isArchived)
      .map(b => {
        const d = new Date(b.date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      })
      .filter((m): m is string => Boolean(m))
  )).sort((a, b) => b.localeCompare(a)), [bills, archiveFilter]); // Newest month first

  // Filter logic
  const filteredBills = React.useMemo(() => bills.filter(bill => {
    // Archive classification check
    const isBillArchived = !!bill.isArchived;
    const matchesArchive = archiveFilter === 'archived' ? isBillArchived : !isBillArchived;
    if (!matchesArchive) return false;

    // Search match
    const matchesSearch = 
      bill.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.note && bill.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      bill.members.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Time filter logic
    if (timeFilterType === 'all') {
      return true;
    } else if (timeFilterType === 'week') {
      return getIsThisCalendarWeek(bill.date);
    } else if (timeFilterType === 'month') {
      return getIsThisCalendarMonth(bill.date);
    } else if (timeFilterType === 'last-month') {
      return getIsLastCalendarMonth(bill.date);
    } else if (timeFilterType === 'specific-month') {
      if (selectedMonth === 'all') return true;
      const billMonth = bill.date.substring(0, 7); // "YYYY-MM"
      return billMonth === selectedMonth;
    }

    return true;
  }), [bills, archiveFilter, searchTerm, timeFilterType, selectedMonth]);

  // Toggle accordion expand
  const toggleExpand = (id: string) => {
    setExpandedBillId(expandedBillId === id ? null : id);
  };

  // Calculations for dynamic reports
  const totalSpendInPeriod = React.useMemo(() => filteredBills.reduce((acc, b) => acc + b.totalAmount, 0), [filteredBills]);
  const totalBillsCount = filteredBills.length;
  const avgBillInPeriod = React.useMemo(() => totalBillsCount > 0 ? Math.round(totalSpendInPeriod / totalBillsCount) : 0, [totalSpendInPeriod, totalBillsCount]);

  // Expenditures grouped by Venue
  const venueReport = React.useMemo(() => {
    const report: { [name: string]: number } = {};
    filteredBills.forEach(b => {
      report[b.venueName] = (report[b.venueName] || 0) + b.totalAmount;
    });
    return report;
  }, [filteredBills]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (filteredBills.length === 0) {
      toast.error("Không có dữ liệu hóa đơn nào trong khoảng thời gian đã chọn để xuất báo cáo!");
      return;
    }

    // UTF-8 BOM to display Vietnamese accents correctly in MS Excel
    let csvContent = '\uFEFF';
    
    // Header Info
    csvContent += `BÁO CÁO CHI TIẾT CHI PHÍ CUỘC NHẬU\n`;
    csvContent += `Thời gian báo cáo: ${selectedMonth === 'all' ? 'Tất cả các tháng' : `Tháng ${selectedMonth}`}\n`;
    csvContent += `Tổng cộng chi:; ${totalSpendInPeriod.toLocaleString('vi-VN')} đ\n`;
    csvContent += `Số cuộc họp mặt:; ${totalBillsCount} cuộc nhậu\n`;
    csvContent += `Chi trung bình mỗi cuộc nhậu:; ${avgBillInPeriod.toLocaleString('vi-VN')} đ\n\n`;

    // Table Header
    csvContent += `Mã hóa đơn;Ngày nhậu;Thời gian;Địa điểm;Tổng hóa đơn (đ);Tiền mồi gốc (đ);Tiền Tip (đ);Thuế/VAT (đ.v);Voucher giảm (đ);Người trả chính;Thành viên tham gia;Mô tả cuộc vui\n`;

    filteredBills.forEach((bill) => {
      const bDate = new Date(bill.date);
      const friendlyDate = `${bDate.getDate()}/${bDate.getMonth() + 1}/${bDate.getFullYear()}`;
      const friendlyTime = `${String(bDate.getHours()).padStart(2, '0')}:${String(bDate.getMinutes()).padStart(2, '0')}`;
      
      const host = bill.members.find(m => m.initialPaid > m.finalShare)?.name || 'Nhiều người đóng';
      const membersStr = bill.members.map(m => `${m.name} (${m.finalShare.toLocaleString('vi-VN')}đ)`).join(' | ');
      const cleanNote = (bill.note || '').replace(/;/g, ',');

      csvContent += `${bill.id};${friendlyDate};${friendlyTime};${bill.venueName.replace(/;/g, ',')};${bill.totalAmount};${bill.rawAmount};${bill.tipAmount};${bill.additionalFee};${bill.discountAmount};${host};${membersStr};${cleanNote}\n`;
    });

    // Download linkage
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-nhau-${selectedMonth === 'all' ? 'tong-hop' : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share a bill detail
  const handleShareBill = async (bill: Bill) => {
    const dateObj = new Date(bill.date);
    const friendlyDate = `${dateObj.getDate()} Thg ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;
    const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    const shareUrl = await generateShareableBillUrl(bill);

    let text = `🍻 Hóa đơn: ${bill.venueName}\n`;
    text += `📅 Ngày: ${friendlyDate} lúc ${formattedTime}\n`;
    text += `💰 Tổng bill: ${bill.totalAmount.toLocaleString('vi-VN')} đ\n\n`;
    text += `👥 Chi tiết chia:\n`;
    
    bill.members.forEach(m => {
      const diff = m.finalShare - m.initialPaid;
      text += `- ${m.name}: Chịu ${m.finalShare.toLocaleString('vi-VN')} đ `;
      if (m.penaltyAmount && m.penaltyAmount > 0) {
        text += `(Bao gồm ${m.penaltyAmount.toLocaleString('vi-VN')}đ phạt) `;
      }
      text += `(Đã chi ${m.initialPaid.toLocaleString('vi-VN')} đ) `;
      if (diff > 0) {
        text += `👉 Còn Nợ ${diff.toLocaleString('vi-VN')} đ\n`;
      } else if (diff < 0) {
        text += `👉 Nhận lại ${Math.abs(diff).toLocaleString('vi-VN')} đ\n`;
      } else {
        text += `👉 Vừa đủ\n`;
      }
    });

    if (bill.note) {
      text += `\n📝 Ghi chú: ${bill.note}`;
    }
    
    text += `\n\n🔗 Xem chi tiết trực tiếp trên web:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chia sẻ hóa đơn ${bill.venueName}`,
          text: text
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Sao chép thành công vào bộ nhớ tạm. Hãy dán gửi bạn bè!");
      } catch (err) {
        toast.error("Không thể sao chép. Hãy thử lại!");
      }
    }
  };

  // Direct copy of the web viewing link
  const handleCopyBillLink = async (bill: Bill) => {
    try {
      const shareUrl = await generateShareableBillUrl(bill);
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép Link Web xem hóa đơn! 🔗");
    } catch (err) {
      toast.error("Không thể sao chép link.");
    }
  };

  // Generate dynamic chart data for month-by-month spend comparison
  const last6MonthsData = (() => {
    const monthlyMap: { [monthStr: string]: number } = {};
    const monthsKeys: string[] = [];

    // Initialize past 6 months
    const tempDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
      monthsKeys.push(key);
    }

    // Fill from bills matching current archive filter
    bills
      .filter(b => archiveFilter === 'archived' ? !!b.isArchived : !b.isArchived)
      .forEach(b => {
        const bMonth = b.date.substring(0, 7); // YYYY-MM
        if (monthlyMap[bMonth] !== undefined) {
          monthlyMap[bMonth] += b.totalAmount;
        }
      });

    return monthsKeys.map(key => {
      const [year, month] = key.split('-');
      return {
        label: `Thg ${parseInt(month)}`,
        fullLabel: `Tháng ${parseInt(month)}/${year}`,
        amount: monthlyMap[key],
        key
      };
    });
  })();

  const maxMonthlyAmount = Math.max(...last6MonthsData.map(d => d.amount), 100000);

  // ==========================================
  // VENUE AND SPOT ANALYSIS (PIE CHART DATA)
  // ==========================================
  const PIE_COLORS = [
    '#F97316', // Orange-500 (Màu bia vàng)
    '#EC4899', // Pink-500 (Nướng cay rực rỡ)
    '#3B82F6', // Blue-500 (Độc chiêu hải sản)
    '#10B981', // Emerald-500 (Rau thanh mát)
    '#8B5CF6', // Violet-500 (Rượu ngon hảo hạng)
    '#EAB308', // Yellow-500 (Hấp sả thơm cay)
    '#EF4444'  // Red-500 (Lẩu thái siêu cay)
  ];

  const pieData = Object.entries(venueReport)
    .map(([name, amount]) => ({ name, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount);

  const totalPieAmount = pieData.reduce((sum, item) => sum + item.amount, 0);
  
  let processedPieData: Array<{ name: string; amount: number; percentage: number; color: string }> = [];

  if (pieData.length > 0) {
    if (pieData.length <= 4) {
      processedPieData = pieData.map((item, idx) => ({
        name: item.name,
        amount: item.amount,
        percentage: totalPieAmount > 0 ? (item.amount / totalPieAmount) * 100 : 0,
        color: PIE_COLORS[idx % PIE_COLORS.length]
      }));
    } else {
      const top3 = pieData.slice(0, 3);
      const otherAmount = pieData.slice(3).reduce((sum, item) => sum + item.amount, 0);
      
      processedPieData = top3.map((item, idx) => ({
        name: item.name,
        amount: item.amount,
        percentage: totalPieAmount > 0 ? (item.amount / totalPieAmount) * 100 : 0,
        color: PIE_COLORS[idx % PIE_COLORS.length]
      }));
      
      processedPieData.push({
        name: 'Địa điểm khác',
        amount: otherAmount,
        percentage: totalPieAmount > 0 ? (otherAmount / totalPieAmount) * 100 : 0,
        color: '#64748B' // Slate-500
      });
    }
  }

  // Parameters for SVG Donut
  const radius = 25;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~157.08
  let accumulatedAngle = -90; // Start at top 12 o'clock

  return (
    <div className="space-y-6" id="history-reports-section">
      
      {/* EXPENDITURE CHARTS GRID (COLUMN + PIE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FIELD A: SƠ ĐỒ CHI PHÍ 6 THÁNG QUA */}
        <div className="lg:col-span-7 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-7 bg-orange-500 rounded-full inline-block"></span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                  Sơ Đồ Chi Phí Nhậu 6 Tháng Qua
                </h3>
              </div>
            </div>

            {/* Dynamic Pure SVG-Tailwind Chart Element */}
            <div className="pt-4">
              <div className="grid grid-cols-6 gap-2 md:gap-4 h-48 items-end border-b-4 border-slate-900 pb-1">
                {last6MonthsData.map((data) => {
                  const heightPercent = `${(data.amount / maxMonthlyAmount) * 100}%`;
                  const isSelected = timeFilterType === 'specific-month' && selectedMonth === data.key;
                  return (
                    <div 
                      key={data.key} 
                      className="flex flex-col items-center group cursor-pointer"
                      onClick={() => {
                        setTimeFilterType('specific-month');
                        setSelectedMonth(data.key);
                      }}
                    >
                      <div className="w-full relative flex justify-center">
                        {/* Tooltip on Hover */}
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg font-black border-2 border-slate-800 shadow-md transition-all z-10 whitespace-nowrap animate-slideIn">
                          {data.amount.toLocaleString('vi-VN')}đ
                        </div>
                        {/* Visual Bar Accent */}
                        <div 
                          style={{ height: heightPercent }} 
                          className={`w-10 md:w-16 rounded-t-lg transition-all duration-500 border-2 border-b-0 border-slate-900 ${
                            isSelected 
                              ? 'bg-orange-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
                              : 'bg-yellow-101 bg-yellow-100 group-hover:bg-yellow-200'
                          }`}
                        />
                      </div>
                      <span className={`text-xs mt-2 font-black tracking-wide ${isSelected ? 'text-orange-600 font-extrabold underline decoration-2' : 'text-slate-500'}`}>
                        {data.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-500 pt-3 border-t border-slate-100 mt-2 font-semibold">
            <span>💡 Bấm chọn từng cột mốc để lọc dữ liệu cuộc nhậu</span>
            <button 
              onClick={() => {
                setTimeFilterType('all');
                setSelectedMonth('all');
              }}
              className="text-orange-605 text-orange-600 hover:text-orange-700 font-black underline decoration-dashed cursor-pointer text-left sm:text-right"
              id="clear-filter-btn"
            >
              Xem tất cả thời gian
            </button>
          </div>
        </div>

        {/* FIELD B: BIỂU ĐỒ TRÒN TỶ LỆ THEO ĐỊA ĐIỂM (PIE CHART) */}
        <div className="lg:col-span-5 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-7 bg-purple-500 rounded-full inline-block"></span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <PieChart className="w-6 h-6 text-purple-500" />
                  Cơ Cấu Địa Điểm Ăn Nhậu
                </h3>
              </div>
            </div>

            {totalPieAmount > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-5">
                {/* Real Pure SVG Donut Chart */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -scale-x-100">
                    {/* Ring Border Outer */}
                    <circle cx="50" cy="50" r={radius + strokeWidth / 2} fill="transparent" stroke="#0F172A" strokeWidth="2" />
                    {/* Ring Border Inner */}
                    <circle cx="50" cy="50" r={radius - strokeWidth / 2} fill="transparent" stroke="#0F172A" strokeWidth="2" />
                    
                    {/* Donut Segments */}
                    {processedPieData.map((data, idx) => {
                      const percentage = data.percentage;
                      const strokeLength = (percentage / 100) * circumference;
                      const strokeDashArray = `${strokeLength} ${circumference}`;
                      const currentAngle = accumulatedAngle;
                      accumulatedAngle += (percentage / 100) * 360;

                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke={data.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDashArray}
                          strokeDashoffset={0}
                          transform={`rotate(${currentAngle} 50 50)`}
                          strokeLinecap="butt"
                          className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                          id={`donut-segment-${idx}`}
                        >
                          <title>{data.name}: {data.amount.toLocaleString('vi-VN')} đ ({percentage.toFixed(1)}%)</title>
                        </circle>
                      );
                    })}
                  </svg>
                  
                  {/* Center Text displaying location counts */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-black uppercase text-slate-400 leading-none">Tổng cộng</span>
                    <span className="text-sm font-black text-slate-900 font-mono mt-0.5">
                      {processedPieData.length} nơi
                    </span>
                  </div>
                </div>

                {/* Color Legend list */}
                <div className="flex-1 space-y-2 w-full">
                  {processedPieData.map((data, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-xs border-b border-dashed border-slate-100 pb-1.5 last:border-0" id={`pie-legend-${idx}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          style={{ backgroundColor: data.color }} 
                          className="w-2.5 h-2.5 rounded-full border border-slate-900 shrink-0 inline-block" 
                        />
                        <span className="font-extrabold text-slate-800 text-sm truncate" title={data.name}>
                          {data.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-mono text-xs font-black text-slate-500">
                        <span className="text-slate-900 font-bold block">{data.amount.toLocaleString('vi-VN')}đ</span>
                        <span className="bg-slate-100 text-xs px-1 py-0.2 rounded-sm border border-slate-200">{data.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-44">
                <div className="bg-purple-50 p-3 rounded-2xl border-2 border-dashed border-purple-200 text-purple-400">
                  <PieChart className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700">Chưa có quán nhậu nào được lọc</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                    Gầy độ hoặc đổi bộ lọc thời gian để phân tích các quán ăn được chi nhiều tiền nhất cực kỳ trực quan!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 italic text-center font-semibold pt-3 border-t border-slate-100 mt-2">
            📊 Phân bổ chi tiêu phản ánh theo các địa điểm trong mốc thời gian đang lọc.
          </div>
        </div>

      </div>

      {/* AI WEEKEND BUDGET PREDICTOR MODULE */}
      <div className="bg-slate-50 dark:bg-slate-950 border-4 border-slate-900 rounded-[32px] p-6 space-y-4 shadow-lg relative overflow-hidden">
        {/* Decorative badge */}
        <div className="absolute top-0 right-0 bg-orange-500 text-slate-950 font-black text-xs uppercase px-4 py-1.5 rounded-bl-2xl border-l-2 border-b-2 border-slate-900 tracking-wider">
          AI Smart Predictor
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-500 animate-pulse" />
              Dự Báo Ngân Sách Cuối Tuần Tới
            </h3>
            <p className="text-xs text-slate-500 font-bold leading-tight">
              Sử dụng AI phân tích thói quen tiêu dùng lịch sử để lập kế hoạch chi tiêu an toàn cho tuần mới.
            </p>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border-2 border-slate-900 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPredictAiProvider('gemini');
                localStorage.setItem('predict_ai_provider', 'gemini');
              }}
              className={`px-3 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                predictAiProvider === 'gemini'
                  ? 'bg-orange-500 text-slate-950 border-slate-900 font-extrabold'
                  : 'bg-transparent text-slate-505 border-transparent hover:bg-slate-100'
              }`}
            >
              🚀 Gemini
            </button>
            <button
              type="button"
              onClick={() => {
                setPredictAiProvider('deepseek');
                localStorage.setItem('predict_ai_provider', 'deepseek');
              }}
              className={`px-3 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                predictAiProvider === 'deepseek'
                  ? 'bg-indigo-650 text-white border-slate-900 font-extrabold'
                  : 'bg-transparent text-slate-505 border-transparent hover:bg-slate-100'
              }`}
            >
              🧠 DeepSeek
            </button>
          </div>
        </div>

        {/* Content Section */}
        {!predictionResult ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 rounded-full border-2 border-slate-900 flex items-center justify-center text-orange-500 shadow-sm">
              <Coins className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-sm font-black text-slate-800 dark:text-white">Chưa khởi tạo dự đoán tuần tới</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-bold">
                Bấm nút bên dưới để hệ thống quét toàn bộ lịch sử chi tiêu từ {bills.length} cuộc nhậu đã qua, từ đó ước tính tần suất và đưa ra ngân sách phù hợp cho cuối tuần tới!
              </p>
            </div>
            <button
              onClick={handlePredictBudget}
              disabled={predicting}
              className={`relative py-3 px-8 text-xs font-black rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer text-slate-950 flex items-center gap-2 ${
                predicting ? 'bg-slate-100 opacity-80' : 'bg-orange-500 hover:bg-orange-450'
              }`}
            >
              {predicting ? (
                <>
                  <Brain className="w-4 h-4 animate-spin text-slate-900" />
                  Đang phân tích thói quen ăn nhậu...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  Tính toán và phân bổ ngân sách
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            {/* KPI GRID OF BUDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Expected Sessions */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="p-3 bg-purple-105 bg-purple-100 dark:bg-purple-950/40 text-purple-600 rounded-xl border border-slate-900">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block font-bold">Dự kiến phát sinh</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    {predictionResult.prediction.expectedSessions} Cuộc Nhậu
                  </span>
                </div>
              </div>

              {/* Card 2: Suggested Safety Budget */}
              <div className="bg-orange-50/50 dark:bg-orange-950/20 border-2 border-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="p-3 bg-orange-500 text-slate-950 rounded-xl border border-slate-900">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-orange-850 dark:text-orange-400 uppercase tracking-wider block font-bold">Ngân sách thoải mái</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    {predictionResult.prediction.suggestedBudget.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Card 3: Suggested Saving Budget */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="p-3 bg-emerald-505 bg-emerald-500 text-slate-950 rounded-xl border border-slate-900">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-850 dark:text-emerald-400 uppercase tracking-wider block font-bold">Mức thắt lưng buộc bụng</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    {predictionResult.prediction.savingBudget.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis & Explanations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-2.5 h-5 bg-orange-500 rounded-full inline-block"></span>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Hành Vi & Tần Suất Chi Tiêu</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-bold">
                  {predictionResult.summary.frequencyAnalysis}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono text-slate-400 font-black">
                  <div>TỔNG CHI GẦN ĐÂY: <span className="text-slate-900 dark:text-white">{predictionResult.summary.totalSpent.toLocaleString('vi-VN')}đ</span></div>
                  <div>TRUNG BÌNH/CUỘC: <span className="text-slate-900 dark:text-white">{predictionResult.summary.averageBill.toLocaleString('vi-VN')}đ</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-2.5 h-5 bg-purple-500 rounded-full inline-block"></span>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Cơ Sở Tính Ngân Sách</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-bold">
                  {predictionResult.prediction.explanation}
                </p>
              </div>
            </div>

            {/* Tips & Recommendations */}
            <div className="bg-orange-50/20 dark:bg-orange-950/5 border-2 border-slate-900 rounded-[24px] p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-orange-205 border-orange-200 dark:border-orange-900 pb-2">
                <Brain className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Bí Quyết Tiết Kiệm & Gợi Ý Thức Ăn Tuần Tới</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider block font-bold">💡 LỜI KHUYÊN KIỂM SOÁT HẦU BAO:</span>
                  <ul className="space-y-2">
                    {predictionResult.tips.map((tip: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 font-bold leading-relaxed">
                        <span className="bg-orange-500 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center font-mono text-xs shrink-0 font-black border border-slate-900 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-orange-200 dark:border-orange-900 pt-3 md:pt-0 md:pl-4">
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block font-bold">🍽️ KHUYÊN CHỌN GU ĂN NHẬU:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                    {predictionResult.styleRecommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Warn or action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span>Mẹo nhỏ: Hãy cập nhật đầy đủ hóa đơn liên tục để AI phân tích hành vi sát sườn nhất.</span>
              </div>
              <button
                onClick={handlePredictBudget}
                disabled={predicting}
                className="text-sm font-black text-orange-600 hover:text-orange-700 underline decoration-dashed cursor-pointer flex items-center gap-1 self-start sm:self-auto"
              >
                {predicting ? "Đang tính toán..." : "🔄 Cập nhật dự báo theo hóa đơn mới"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FILTER CONTROLS & THREE-WAY STAT BANNER */}
      <div className="bg-yellow-50/20 border-4 border-slate-900 rounded-[32px] p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
        {/* KPI: Spend */}
        <div className="p-3.5 bg-white border-2 border-slate-900 rounded-2xl shadow-sm text-center">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">THỜI KỲ TỔNG CHI</span>
          <span className="text-xl font-black text-slate-900 block mt-1">
            {totalSpendInPeriod.toLocaleString('vi-VN')} đ
          </span>
        </div>
        {/* KPI: Meetings count */}
        <div className="p-3.5 bg-white border-2 border-slate-900 rounded-2xl shadow-sm text-center">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">SỐ CUỘC GẦY ĐỘ</span>
          <span className="text-xl font-black text-slate-900 block mt-1">
            {totalBillsCount} cuộc nhậu
          </span>
        </div>
        {/* KPI: Average spending */}
        <div className="p-3.5 bg-white border-2 border-slate-900 rounded-2xl shadow-sm text-center">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">PHÍ TRUNG BÌNH</span>
          <span className="text-xl font-black text-slate-900 block mt-1">
            {avgBillInPeriod.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Indicator for current time filter */}
        <div className="p-1 space-y-1">
          <label className="text-xs font-black text-slate-600 uppercase tracking-wide">Thời Gian Đang Lọc</label>
          <div className="w-full text-xs font-black bg-white border-2 border-slate-900 p-2.5 rounded-xl text-slate-800 flex items-center justify-between shadow-xs">
            <span className="text-orange-600 truncate mr-1">
              {timeFilterType === 'all' && 'Tất cả thời gian'}
              {timeFilterType === 'week' && 'Tuần này'}
              {timeFilterType === 'month' && 'Tháng này'}
              {timeFilterType === 'last-month' && 'Tháng trước'}
              {timeFilterType === 'specific-month' && (selectedMonth === 'all' ? 'Tất cả các tháng' : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`)}
            </span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-black border border-slate-200 shrink-0">
              {totalBillsCount} độ
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH AND BILL DETAILS CONTAINER */}
      <div className="bg-white border-4 border-slate-900 rounded-[32px] p-6 space-y-5 shadow-lg">
        {/* TAB CHOOSER: HOẠT ĐỘNG / LƯU TRỮ */}
        <div className="flex flex-wrap gap-3 border-b-2 border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => {
              setArchiveFilter('active');
              setTimeFilterType('all');
              setSelectedMonth('all');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 ${
              archiveFilter === 'active'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-4 h-4" /> Hoạt động ({bills.filter(b => !b.isArchived).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setArchiveFilter('archived');
              setTimeFilterType('all');
              setSelectedMonth('all');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 ${
              archiveFilter === 'archived'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-50 text-slate-705 hover:bg-slate-100'
            }`}
          >
            <Archive className="w-4 h-4" /> Kho Lưu Trữ ({bills.filter(b => b.isArchived).length})
          </button>
        </div>

        {/* QUICK TIME FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 p-3 rounded-[20px] border-2 border-slate-900 shadow-5xs">
          <span className="text-xs uppercase font-black text-slate-500 px-1 flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-orange-500" /> Bộ lọc thời gian:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: '📅 Tất cả' },
              { id: 'week', label: '📆 Tuần này' },
              { id: 'month', label: '📅 Tháng này' },
              { id: 'last-month', label: '🗓️ Tháng trước' },
              { id: 'specific-month', label: '🔍 Chọn tháng...' }
            ].map(opt => {
              const isActive = timeFilterType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTimeFilterType(opt.id);
                    if (opt.id !== 'specific-month') {
                      setSelectedMonth('all');
                    } else if (selectedMonth === 'all' && availableMonths.length > 0) {
                      setSelectedMonth(availableMonths[0]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-black border-2 border-slate-900 transition-all cursor-pointer shadow-5xs active:translate-y-0.5 ${
                    isActive 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          
          {/* Render Month Dropdown when "specific-month" is active */}
          {timeFilterType === 'specific-month' && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l-2 border-slate-200 animate-slideIn">
              <span className="text-xs font-black text-slate-400">Chọn:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm font-black bg-white border-2 border-slate-900 px-2.5 py-1.5 rounded-xl text-slate-800 focus:border-orange-500 outline-hidden cursor-pointer"
              >
                <option value="all">Tất cả các tháng</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>Tháng {month.split('-')[1]} - Năm {month.split('-')[0]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-slate-100">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm theo quán nhậu, người tham gia hoặc ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-yellow-50/15 border-2 border-slate-900 pl-9 pr-4 py-3 rounded-2xl outline-hidden focus:border-orange-500 text-slate-900 font-extrabold"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-slate-900 hover:bg-orange-500 text-white hover:text-slate-900 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 border-2 border-slate-900 transition-all hover:scale-[1.01] active:translate-y-0.5 cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Xuất File Chi Tiết (.CSV)
          </button>
        </div>

        {/* BILL ROWS */}
        <div className="space-y-4">
          {filteredBills.length === 0 ? (
            <div className="text-center py-16 bg-yellow-50/10 rounded-[28px] border-3 border-dashed border-slate-300">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <span className="text-xs text-slate-500 font-black uppercase tracking-wide block">Chưa Tìm Thấy Cuộc Nhậu Nào!</span>
            </div>
          ) : (
            <AnimatePresence>
              {filteredBills.map((bill, index) => {
              const isExpanded = expandedBillId === bill.id;
              const dateObj = new Date(bill.date);
              const formattedDate = `${dateObj.getDate()} Thg ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;
              const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              
              // Find creditor (who paid at table)
              const hosts = bill.members.filter(m => m.initialPaid > m.finalShare);
              const hostName = hosts.length > 0 ? hosts.map(h => h.name).join(', ') : 'Thành viên chia tại bàn';

              return (
                <motion.div 
                  key={bill.id} 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                  whileHover={{ y: -4 }}
                  className={`border-3 border-slate-900 rounded-[24px] overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-orange-50/15 shadow-sm' : 'bg-slate-50/30'}`}
                >
                  {/* Collapsible Trigger Row */}
                  <div 
                    onClick={() => toggleExpand(bill.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-yellow-50/20"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-orange-100 text-orange-600 p-2.5 rounded-xl border-2 border-slate-900 self-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 line-clamp-1">🍻 {bill.venueName}</h4>
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 mt-1">
                          <span>{formattedDate} lúc {formattedTime}</span>
                          <span>•</span>
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md font-black max-w-[120px] truncate">
                            Bởi: {hostName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-auto">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-extrabold block">TỔNG HÓA ĐƠN</span>
                        <span className="text-sm font-black text-slate-900 bg-yellow-105 bg-yellow-100 border-2 border-slate-900 px-2.5 py-0.5 rounded-lg inline-block shadow-sm">
                          {bill.totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-900" /> : <ChevronDown className="w-5 h-5 text-slate-900" />}
                    </div>
                  </div>

                  {/* Expanded Breakdown Accordion Body */}
                  {isExpanded && (
                    <div className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-900 dark:border-slate-700 px-5 py-5 space-y-4 animate-slideIn">
                      {/* Financial statistics detail logs */}
                      <details className="group">
                        <summary className="text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer list-none flex items-center gap-2 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                          <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                          Xem chi tiết phụ phí (Tip, VAT, Voucher)
                        </summary>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center text-xs pb-4 pt-3 border-b border-dashed border-slate-200 dark:border-slate-700 mt-2">
                          <div className="p-2.5 bg-yellow-50/30 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Mồi Gốc</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block mt-0.5">{bill.rawAmount.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className="p-2.5 bg-yellow-50/30 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Tiền Tip</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block mt-0.5">{bill.tipAmount.toLocaleString('vi-VN')} đ ({bill.tipPercent}%)</span>
                          </div>
                          <div className="p-2.5 bg-yellow-50/30 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">VAT & Khác</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block mt-0.5">{bill.additionalFee.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className="p-2.5 bg-orange-50/30 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl">
                            <span className="text-orange-650 dark:text-orange-400 block font-bold uppercase tracking-wider">Voucher Đã Giảm</span>
                            <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm block mt-0.5">-{bill.discountAmount.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      </details>

                      {bill.note && (
                        <div className="p-3 bg-yellow-50/40 text-slate-700 rounded-xl text-sm font-extrabold border-2 border-slate-900">
                          🌟 Ghi chú cuộc nhậu: &ldquo;{bill.note}&rdquo;
                        </div>
                      )}

                      {bill.receiptImage && (
                        <div className="p-3.5 bg-orange-50/30 border-2 border-orange-100 rounded-2xl flex flex-col sm:flex-row items-center gap-4.5 shadow-2xs">
                          <div 
                            onClick={() => setActiveZoomImage(bill.receiptImage || null)}
                            className="relative group shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 cursor-pointer shadow-sm bg-white dark:bg-slate-800"
                          >
                            <img 
                              src={bill.receiptImage} 
                              className="w-full h-full object-cover transition-all group-hover:scale-105" 
                              referrerPolicy="no-referrer"
                              alt="Bằng chứng hóa đơn" 
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white font-black text-xs uppercase tracking-wider text-center p-1">
                              🔍 Click Phóng To
                            </div>
                          </div>
                          <div className="space-y-1 text-center sm:text-left">
                            <span className="text-xs font-black text-orange-950 block">🧾 ĐÃ ĐÍNH BIÊN LAI LÀM BẰNG CHỨNG</span>
                            <span className="text-xs text-slate-500 font-extrabold block leading-relaxed">
                              Đã lưu ảnh chụp hóa đơn gốc đối chiếu sòng phẳng. Click vào ô hình để phóng to kiểm tra bảng thanh toán chi tiết các món mồi!
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Members sub-contributions list */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Chi tiết phần chia của từng chiến hữu:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {bill.members.map((member) => {
                            const diff = member.finalShare - member.initialPaid;
                            return (
                              <div key={member.name} className="flex justify-between items-center text-xs p-3 bg-slate-50/50 border-2 border-slate-900 rounded-xl">
                                <div className="space-y-0.5">
                                  <span className="font-black text-slate-900 block">👤 {member.name}</span>
                                  <span className="text-xs text-slate-400 font-bold block">
                                    Đã chi: {member.initialPaid.toLocaleString('vi-VN')}đ | Phải chịu: {member.finalShare.toLocaleString('vi-VN')}đ
                                  </span>
                                </div>
                                <div className="text-right">
                                  {diff > 0 ? (
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-black border-2 ${member.hasPaidDebt ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                                      {member.hasPaidDebt ? 'Đã sờ xong' : `Nợ: ${diff.toLocaleString('vi-VN')} đ`}
                                    </span>
                                  ) : diff < 0 ? (
                                    <span className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-800 border-2 border-amber-300">
                                      Nhận lại: {Math.abs(diff).toLocaleString('vi-VN')} đ
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-200 font-black border-2 border-slate-350 dark:border-slate-600">
                                      Hòa tiền
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action buttons inside item */}
                      <div className="flex justify-end pt-3 border-t-2 border-dashed border-slate-100 flex-wrap gap-y-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyBillLink(bill);
                          }}
                          className="mr-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer bg-indigo-100/30 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-2 border-indigo-300 dark:border-indigo-700 p-3 px-4 rounded-xl transition-all"
                          title="Sao chép link web để gửi bạn bè mở xem hóa đơn trực tiếp"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">Sao chép Link Web</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareBill(bill);
                          }}
                          className="mr-3 text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 cursor-pointer bg-blue-100/30 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-2 border-blue-300 dark:border-blue-700 p-3 px-4 rounded-xl transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Chia sẻ tin nhắn</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveBill(bill.id, !bill.isArchived);
                          }}
                          className={`mr-3 text-xs font-black flex items-center gap-1.5 cursor-pointer p-3 px-4 rounded-xl transition-all border-2 ${
                            bill.isArchived
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/30 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                              : 'text-amber-600 dark:text-amber-400 bg-amber-100/30 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                          }`}
                        >
                          {bill.isArchived ? (
                            <>
                              <Inbox className="w-4 h-4" />
                              <span className="hidden sm:inline">Khôi phục</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-4 h-4" />
                              <span className="hidden sm:inline">Lưu trữ</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerConfirm(
                              "Bạn thật sự muốn xóa vĩnh viễn hóa đơn cuộc nhậu này ra khỏi lịch sử?",
                              () => onDeleteBill(bill.id),
                              "Xóa vĩnh viễn"
                            );
                          }}
                          className="text-xs font-black text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1.5 cursor-pointer bg-red-100/30 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border-2 border-red-300 dark:border-red-700 p-3 px-4 rounded-xl transition-all"
                        >
                          <Trash className="w-4 h-4" /> Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Enlarged Receipt Image Lightbox Zoom Modal */}
      {activeZoomImage && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all"
          onClick={() => setActiveZoomImage(null)}
        >
          <div 
            className="bg-white border-4 border-slate-900 rounded-[32px] p-5 max-w-md w-full relative space-y-4 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2.5">
              <span className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                🧾 BẰNG CHỨNG HÓA ĐƠN GỐC
              </span>
              <button 
                type="button"
                onClick={() => setActiveZoomImage(null)}
                className="text-xs font-black text-slate-50 bg-red-600 hover:bg-red-700 border-2 border-slate-900 px-2.5 py-1.5 rounded-xl cursor-pointer"
              >
                ĐÓNG ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh] border-2 border-slate-900 rounded-2xl bg-slate-100 flex items-center justify-center p-2">
              <img 
                src={activeZoomImage} 
                className="max-w-full max-h-full object-contain rounded-lg rounded-b-none" 
                referrerPolicy="no-referrer"
                alt="Enlarged Receipt" 
              />
            </div>
            <p className="text-xs text-center font-extrabold text-slate-500 leading-relaxed pt-1.5 border-t border-dashed border-slate-200">
              💡 Mẹo: Ảnh biên lai được đính kèm để làm bằng chứng sòng phẳng, minh bạch nhằm loại bỏ mọi hiểu lầm sau cuộc vui!
            </p>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white dark:bg-slate-900 border-4 border-slate-950 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              {/* Header/Banner decorative style */}
              <div className="bg-orange-400 border-b-4 border-slate-950 p-4 flex items-center justify-between text-slate-950">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-slate-950" />
                  <h3 className="font-black text-xs uppercase tracking-tight">{confirmDialog.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-full bg-white/45 hover:bg-white/60 p-1 cursor-pointer transition-all border border-slate-950"
                  title="Đóng hộp thoại"
                >
                  <X className="w-4 h-4 text-slate-950" />
                </button>
              </div>

              {/* Main content body */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed text-center">
                  {confirmDialog.message}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-5xs transition-all active:translate-y-0.5 cursor-pointer text-center"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={confirmDialog.onConfirm}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-5xs transition-all active:translate-y-0.5 cursor-pointer text-center"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
