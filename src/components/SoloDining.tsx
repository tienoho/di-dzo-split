import React, { useState, useEffect } from 'react';
import { Venue, Bill, SoloMeal } from '../types';
import { 
  PiggyBank, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Calendar, 
  Percent, 
  Info, 
  Sparkles, 
  Calculator, 
  Utensils, 
  Wine, 
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Coins,
  MapPin,
  Flame,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import {
  fetchSoloMealsFromCloud,
  saveSoloMealToCloud,
  deleteSoloMealFromCloud,
  saveSoloBudgetToCloud,
  fetchSoloBudgetFromCloud
} from '../lib/firebase';

interface SoloDiningProps {
  venues: Venue[];
  currentUser: any;
  activeCreatorName: string;
  bills: Bill[];
}

export default function SoloDining({ venues, currentUser, activeCreatorName, bills }: SoloDiningProps) {
  // Solo state
  const [soloMeals, setSoloMeals] = useState<SoloMeal[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const cached = localStorage.getItem('nhau_solo_budget');
    return cached ? parseInt(cached, 10) : 3000000; // default 3 million VND
  });
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [showBudgetForm, setShowBudgetForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [forecastPersona, setForecastPersona] = useState<'eco' | 'balanced' | 'generous'>('balanced');

  // New meal inputs
  const [mealName, setMealName] = useState<string>('');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [customVenueName, setCustomVenueName] = useState<string>('');
  const [useCustomVenue, setUseCustomVenue] = useState<boolean>(false);
  const [mealDate, setMealDate] = useState<string>(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  });
  const [rawAmount, setRawAmount] = useState<number>(0);
  const [drinkAmount, setDrinkAmount] = useState<number>(0);
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  
  // Alerts / Success feedbacks
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Load initial solo meals & budget settings
  useEffect(() => {
    const loadSoloData = async () => {
      setLoading(true);
      if (currentUser) {
        try {
          const cloudMeals = await fetchSoloMealsFromCloud(currentUser.uid);
          setSoloMeals(cloudMeals);
          const cloudBudget = await fetchSoloBudgetFromCloud(currentUser.uid);
          if (cloudBudget !== null) {
            setMonthlyBudget(cloudBudget);
            setBudgetInput(String(cloudBudget));
          } else {
            setBudgetInput(String(monthlyBudget));
          }
        } catch (e) {
          console.error("Failed to fetch cloud solo dining data, falling back to local:", e);
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
      setLoading(false);
    };

    const loadLocalData = () => {
      const cachedMeals = localStorage.getItem('nhau_solo_meals');
      if (cachedMeals) {
        try {
          setSoloMeals(JSON.parse(cachedMeals));
        } catch (e) {
          console.error(e);
        }
      }
      const cachedBudget = localStorage.getItem('nhau_solo_budget');
      if (cachedBudget) {
        setMonthlyBudget(parseInt(cachedBudget, 10));
        setBudgetInput(cachedBudget);
      } else {
        setBudgetInput(String(monthlyBudget));
      }
    };

    loadSoloData();
  }, [currentUser]);

  // Sync to local storage if not logged in
  const persistMeals = async (updatedMeals: SoloMeal[]) => {
    setSoloMeals(updatedMeals);
    if (!currentUser) {
      localStorage.setItem('nhau_solo_meals', JSON.stringify(updatedMeals));
    }
  };

  const handleSaveBudget = async () => {
    const limit = parseInt(budgetInput, 10);
    if (isNaN(limit) || limit < 0) return;
    
    setMonthlyBudget(limit);
    setShowBudgetForm(false);
    
    localStorage.setItem('nhau_solo_budget', String(limit));
    if (currentUser) {
      try {
        await saveSoloBudgetToCloud(currentUser.uid, limit);
      } catch (e) {
        console.error("Cloud Budget Save Error:", e);
      }
    }

    setSuccessMsg("Cập nhật ngân sách ăn uống thành công! 🎉");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) {
      alert("Hãy nhập tên bữa ăn (ví dụ: Ăn trưa văn phòng, Đi ăn phở sáng...)!");
      return;
    }

    const venueNameUsed = useCustomVenue 
      ? customVenueName.trim() 
      : (venues.find(v => v.id === selectedVenueId)?.name || 'Ăn tại nhà / Khác');

    const total = rawAmount + drinkAmount + otherAmount;

    if (total <= 0) {
      alert("Tổng chi phí bữa ăn phải lớn hơn 0đ!");
      return;
    }

    const newMeal: SoloMeal = {
      id: 'solo-' + Date.now(),
      name: mealName.trim(),
      venueName: venueNameUsed || 'Tự túc',
      date: mealDate,
      rawAmount,
      drinkAmount,
      otherAmount,
      totalAmount: total,
      note: note.trim() || undefined
    };

    const updated = [newMeal, ...soloMeals];
    await persistMeals(updated);

    if (currentUser) {
      try {
        await saveSoloMealToCloud(currentUser.uid, newMeal);
      } catch (e) {
        console.error("Cloud Solo Meal Save Error:", e);
      }
    }

    setSuccessMsg(`Đã ghi nhận bữa ăn solo: ${total.toLocaleString('vi-VN')} đ! 🍽️`);
    setTimeout(() => setSuccessMsg(null), 3000);

    // Clear form
    setMealName('');
    setSelectedVenueId('');
    setCustomVenueName('');
    setRawAmount(0);
    setDrinkAmount(0);
    setOtherAmount(0);
    setNote('');
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá bữa ăn solo này khỏi lịch sử chi tiêu?")) return;

    const filtered = soloMeals.filter(m => m.id !== mealId);
    await persistMeals(filtered);

    if (currentUser) {
      try {
        await deleteSoloMealFromCloud(currentUser.uid, mealId);
      } catch (e) {
        console.error("Cloud Solo Meal Delete Error:", e);
      }
    }

    setSuccessMsg("Đã xoá thành công bữa ăn!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Helper calculation details
  const getBudgetStatus = (percentage: number) => {
    if (percentage < 70) return { label: 'Thong thả mồi 🟢', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' };
    if (percentage <= 100) return { label: 'Bắt đầu rén 🟡', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200' };
    return { label: 'Chạm đáy chén 🔴 (Vượt hạn mức)', color: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200' };
  };

  // Current month stats (relative to meal date setting)
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter meals & calculate spending
  const currentMonthMeals = React.useMemo(() => soloMeals.filter(m => m.date.startsWith(currentYearMonth)), [soloMeals, currentYearMonth]);
  const currentMonthSoloTotal = React.useMemo(() => currentMonthMeals.reduce((acc, m) => acc + m.totalAmount, 0), [currentMonthMeals]);
  const currentMonthSoloDrinks = React.useMemo(() => currentMonthMeals.reduce((acc, m) => acc + m.drinkAmount, 0), [currentMonthMeals]);

  // Group party spending shared portion
  // Look at bills in the current month where the current user name or (Bạn) is in bill members
  // Sum finalShare
  const currentMonthGroupTotal = React.useMemo(() => bills
    .filter(b => b.date.startsWith(currentYearMonth) && !b.isArchived)
    .reduce((sum, bill) => {
      const userMember = bill.members.find(m => {
        const cleanName = m.name.toLowerCase().trim();
        const cleanActive = activeCreatorName.toLowerCase().trim();
        return cleanName.includes(cleanActive) || 
               cleanActive.includes(cleanName) ||
               cleanName.includes('(bạn)') || 
               cleanName.includes('bạn');
      });
      return sum + (userMember ? userMember.finalShare : 0);
    }, 0), [bills, currentYearMonth, activeCreatorName]);

  const overallSpentThisMonth = currentMonthSoloTotal + currentMonthGroupTotal;
  const budgetPercentage = monthlyBudget > 0 ? (currentMonthSoloTotal / monthlyBudget) * 100 : 0;
  const remainingBudget = monthlyBudget - currentMonthSoloTotal;
  
  const averageSoloMealCost = currentMonthMeals.length > 0 ? currentMonthSoloTotal / currentMonthMeals.length : 0;

  // Preset quick fill amounts for solo meal form
  const applyPresetMeal = (type: 'com-tam' | 'an-choi' | 'nhau-solo') => {
    if (type === 'com-tam') {
      setMealName('Cơm tấm sườn bì chả 🍛');
      setRawAmount(45000);
      setDrinkAmount(15000);
      setOtherAmount(5000); // khăn lạnh, trà sâm dứa
      setNote('Dinh dưỡng bữa trưa cực chuẩn');
    } else if (type === 'an-choi') {
      setMealName('Thức ăn xế sương sương 🍟');
      setRawAmount(35000);
      setDrinkAmount(12000);
      setOtherAmount(0);
      setNote('Ăn nhẹ buổi chiều giải mỏi');
    } else if (type === 'nhau-solo') {
      setMealName('Nhậu solo tự thưởng cuối tuần 🍺');
      setRawAmount(150000);
      setDrinkAmount(80000); // 4 chai bia bén
      setOtherAmount(20000);
      setNote('Cơm thiu, mồi bén, chill một mình');
    }
  };

  // List of all unique months for filter
  const uniqueMonths: string[] = React.useMemo(() => Array.from(new Set<string>(soloMeals.map(m => m.date.substring(0, 7)))).sort().reverse(), [soloMeals]);

  // Filtered meals to display
  const displayedMeals = React.useMemo(() => soloMeals.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.venueName && m.venueName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (m.note && m.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMonth = monthFilter === 'all' || m.date.startsWith(monthFilter);
    return matchSearch && matchMonth;
  }), [soloMeals, searchTerm, monthFilter]);

  const budgetStatsStyle = getBudgetStatus(budgetPercentage);

  // ==========================================
  // SPENDING FORECAST & PREDICTIVE ANALYTICS
  // ==========================================
  // Summing up expenses by year-month ("YYYY-MM")
  const monthlyTotals: { [key: string]: number } = {};
  soloMeals.forEach(meal => {
    if (meal.date && meal.date.length >= 7) {
      const ym = meal.date.substring(0, 7);
      monthlyTotals[ym] = (monthlyTotals[ym] || 0) + meal.totalAmount;
    }
  });

  // Persona multipliers
  const personaMultipliers = {
    eco: 0.85,     // Squeeze belt / Thắt lưng buộc bụng
    balanced: 1.05, // Normal average + small buffer / An toàn đề xuất
    generous: 1.25, // Splurge mode / Chiều chuộng bản thân
  };

  // Generate historical data + the next month forecast
  const chartData: Array<{ monthStr: string; label: string; amount: number; isForecast: boolean }> = [];
  
  for (let i = 3; i >= 0; i--) {
    const historicalDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const yyyy = historicalDate.getFullYear();
    const mm = String(historicalDate.getMonth() + 1).padStart(2, '0');
    const ymStr = `${yyyy}-${mm}`;
    const amount = monthlyTotals[ymStr] || 0;
    chartData.push({
      monthStr: ymStr,
      label: `T.${mm}/${yyyy}`,
      amount,
      isForecast: false,
    });
  }

  // Calculate moving average of any months with non-zero spending
  const pastNonZeroSpending = chartData.filter(d => d.amount > 0);
  let averageHistoricSpent = 0;
  if (pastNonZeroSpending.length > 0) {
    averageHistoricSpent = pastNonZeroSpending.reduce((sum, d) => sum + d.amount, 0) / pastNonZeroSpending.length;
  } else {
    // default to 75% of current setting if no records yet
    averageHistoricSpent = monthlyBudget > 0 ? monthlyBudget * 0.75 : 2000000;
  }

  // Predicted budget amount for next month
  const predictedAmountRaw = averageHistoricSpent * personaMultipliers[forecastPersona];
  // Round to nearest 50,000đ for professional human display
  const predictedBudget = Math.max(100000, Math.round(predictedAmountRaw / 50000) * 50000);

  // Add the forecasted next month element to the chart dataset
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextYyyy = nextMonthDate.getFullYear();
  const nextMm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
  
  chartData.push({
    monthStr: `${nextYyyy}-${nextMm}`,
    label: `Dự báo T.${nextMm}`,
    amount: predictedBudget,
    isForecast: true,
  });

  // Max value to scale heights properly
  const maxChartVal = Math.max(...chartData.map(d => d.amount), 100000);

  return (
    <div className="space-y-6" id="solo-dining-section">
      {successMsg && (
        <div className="bg-emerald-400 border-4 border-slate-900 text-slate-900 px-5 py-4 rounded-3xl shadow-md flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-slate-900" />
            <span className="text-sm font-black">{successMsg}</span>
          </div>
        </div>
      )}

      {/* DASHBOARD CARD & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BUDGET STATUS CARD */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-800 rounded-[32px] p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-dashed border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-7 bg-amber-500 rounded-full inline-block"></span>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <PiggyBank className="w-6 h-6 text-amber-500" />
                  Ngân Sách Ăn Uống Solo
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Tháng {today.getMonth() + 1}/{today.getFullYear()} thảnh thơi kiểm soát hầu bao cá nhân
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBudgetForm(!showBudgetForm)}
                className="bg-yellow-100 hover:bg-yellow-200 border-2 border-slate-900 dark:border-slate-700 text-slate-900 text-xs font-black px-4 py-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              >
                {showBudgetForm ? "Mở Xem" : "Đổi Hạn Mức"}
              </button>
            </div>
          </div>

          {/* Budget Setting Input Form Drawer */}
          {showBudgetForm && (
            <div className="bg-amber-50 dark:bg-slate-800 border-2 border-dashed border-amber-300 dark:border-slate-600 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-black text-slate-700 dark:text-amber-400 uppercase tracking-wider block">
                Ngân sách ăn một mình tối đa trong tháng (VND)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -current-y -translate-y-1/2 text-xs font-black text-slate-400">₫</span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="Ví dụ: 3000000"
                    className="w-full bg-white dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-black outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl border-2 border-slate-950 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  Lưu Lại
                </button>
              </div>
            </div>
          )}

          {/* BUDGET VISUAL PROGRESS */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Đã chi mồi solo</span>
                <span className="text-3xl font-black text-slate-900 dark:text-amber-400">
                  {currentMonthSoloTotal.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
                  / Hạn mức: {monthlyBudget.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Trạng thái hầu bao</span>
                <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border-2 ${budgetStatsStyle.color} mt-1.5 inline-block`}>
                  {budgetStatsStyle.label}
                </span>
              </div>
            </div>

            {/* PROGRESS GAUGE BAR */}
            <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-slate-900 dark:border-slate-700 relative p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPercentage < 70 
                    ? 'bg-emerald-400' 
                    : budgetPercentage <= 100 
                      ? 'bg-amber-400' 
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, budgetPercentage)}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800">
                {budgetPercentage.toFixed(1)}%
              </div>
            </div>

            {/* REMAINING STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[8px] uppercase font-black text-slate-400 block tracking-widest">Ví còn khả dụng</span>
                <span className={`text-sm font-black block mt-0.5 ${remainingBudget < 0 ? 'text-red-500' : 'text-slate-700 dark:text-white'}`}>
                  {remainingBudget.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[8px] uppercase font-black text-slate-400 block tracking-widest">Tổng bữa Solo</span>
                <span className="text-sm font-black text-slate-700 dark:text-white block mt-0.5">
                  {currentMonthMeals.length} bữa ăn
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[8px] uppercase font-black text-slate-400 block tracking-widest">Tiền ăn TB / Bữa</span>
                <span className="text-sm font-black text-slate-700 dark:text-white block mt-0.5">
                  {Math.round(averageSoloMealCost).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[8px] uppercase font-black text-slate-400 block tracking-widest">Đồ uống / Bia bọt</span>
                <span className="text-sm font-black text-amber-500 block mt-0.5">
                  {currentMonthSoloDrinks.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS COMPARISON SIDE PANEL */}
        <div className="lg:col-span-4 bg-slate-900 border-4 border-slate-950 p-6 rounded-[32px] text-white flex flex-col justify-between shadow-md min-h-[300px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Tổng hợp chi tiêu tháng này
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Cá nhân (Solo 食)</span>
                <div className="text-2xl font-black text-amber-300">
                  {currentMonthSoloTotal.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                  Chiếm {overallSpentThisMonth > 0 ? ((currentMonthSoloTotal / overallSpentThisMonth) * 100).toFixed(0) : 0}% ngân quỹ ăn uống
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Đóng góp quây chung (Group 🍻)</span>
                <div className="text-2xl font-black text-teal-300">
                  {currentMonthGroupTotal.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                  Chiếm {overallSpentThisMonth > 0 ? ((currentMonthGroupTotal / overallSpentThisMonth) * 100).toFixed(0) : 0}% ngân quỹ từ các bữa tiệc chung
                </div>
              </div>

              <div className="border-t-2 border-dashed border-slate-800 pt-3">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Tổng chi dạ dày tháng {today.getMonth() + 1}</span>
                <div className="text-3xl font-black text-emerald-400">
                  {overallSpentThisMonth.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-850 mt-4 text-[10px] text-slate-300 font-bold leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Hóa đơn nhóm được tách biệt khỏi ngân quỹ Solo để bảo vệ hầu bao ăn uống hàng ngày độc lập của bạn khỏi các bữa tiệc bất thình lình!
            </p>
          </div>
        </div>

      </div>

      {/* SPENDING FORECAST & PREDICTIVE BUDGET SUGGESTIONS */}
      <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-850 rounded-[32px] p-6 shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dashed border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl border-2 border-slate-950 dark:border-slate-855 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                Dự báo Chi tiêu & Đề xuất Ngân sách Tháng Sau
                <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-900">
                  AI ENGINE TỰ ĐỘNG 🔮
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Phân tích xu hướng mồi màng thực tế các tháng trước để tiến hành tối ưu hóa hầu bao thảnh thơi.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* LEFT COLUMN: GORGEOUS DYNAMIC SVG CHART */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-955 border-2 border-slate-900 dark:border-slate-800 rounded-2xl p-4 space-y-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Biểu đồ dự báo xu hướng chi tiêu</span>
            
            <div className="relative pt-6 pb-2 px-1">
              {/* Dynamic SVG with bar handles */}
              <div className="flex items-end justify-between h-44 gap-2 sm:gap-4 border-b-2 border-slate-900 dark:border-slate-700 pb-1">
                {chartData.map((item, idx) => {
                  const barHeight = Math.max(10, (item.amount / maxChartVal) * 120); // max 120px height
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                      {/* Floating hover indicator */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md border border-slate-700 pointer-events-none whitespace-nowrap z-10 shadow-md">
                        {item.amount.toLocaleString('vi-VN')} đ
                      </div>

                      {/* Bar values - always readable */}
                      <span className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 mb-1 font-mono shrink-0">
                        {item.amount > 0 ? `${(item.amount / 1000).toFixed(0)}k` : "0đ"}
                      </span>

                      {/* Bar Column body */}
                      <div
                        style={{ height: `${barHeight}px` }}
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          item.isForecast
                            ? 'bg-gradient-to-t from-orange-400 to-amber-300 border-2 border-slate-900 dark:border-slate-700 border-dashed animate-pulse'
                            : 'bg-emerald-400 dark:bg-emerald-600 border-2 border-slate-900 dark:border-slate-800'
                        } hover:scale-x-105 hover:-translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}
                      ></div>

                      {/* Bubble status badge for tomorrow prediction */}
                      {item.isForecast && (
                        <span className="absolute -top-4 right-1 bg-amber-500 text-[7px] text-slate-950 font-black px-1.5 py-0.5 rounded-full border border-slate-955 scale-90 sm:scale-100">
                          PRO 🔮
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Labels Row */}
              <div className="flex justify-between gap-2 sm:gap-4 pt-2.5">
                {chartData.map((item, idx) => (
                  <span
                    key={idx}
                    className={`flex-1 text-center text-[10px] font-black shrink-0 ${
                      item.isForecast ? 'text-amber-500 font-extrabold animate-pulse' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1.5 justify-center">
              <span className="w-2.5 h-2.5 bg-emerald-400 border border-slate-900 rounded-sm"></span>
              <span>Chi tiêu thực</span>
              <span className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 border-dashed rounded-sm ml-3"></span>
              <span>Đề xuất tháng tới (Dự báo AI)</span>
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILED INSIGHT & PERSONA TOGGLES */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-5">
            <div className="bg-slate-900 text-white border-2 border-slate-950 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Cấu hình phong cách chi tiêu
                </span>
              </div>

              {/* Persona selector tabs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setForecastPersona('eco')}
                  className={`py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    forecastPersona === 'eco'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📉 Tiết Kiệm
                </button>
                <button
                  type="button"
                  onClick={() => setForecastPersona('balanced')}
                  className={`py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    forecastPersona === 'balanced'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚖️ Đề Xuất
                </button>
                <button
                  type="button"
                  onClick={() => setForecastPersona('generous')}
                  className={`py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    forecastPersona === 'generous'
                      ? 'bg-orange-500 text-slate-900 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🍺 Thỏa Sức
                </button>
              </div>

              {/* Persona description */}
              <div className="text-xs space-y-2.5 leading-relaxed text-slate-300">
                {forecastPersona === 'eco' && (
                  <p>
                    🌿 <b>Chế độ thắt lưng buộc bụng:</b> Đề xuất giảm 15% so với mức trung bình trước để thúc đẩy thói quen nấu nướng tại gia và hạn chế tuyệt đối đi la cà đơn lẻ.
                  </p>
                )}
                {forecastPersona === 'balanced' && (
                  <p>
                    ⚖️ <b>Chế độ cân bằng đề xuất:</b> Duy trì mức chi tiêu thực tế ổn định hàng ngày của bạn, cộng thêm 5% phòng ngừa dao động giá cả thị trường.
                  </p>
                )}
                {forecastPersona === 'generous' && (
                  <p>
                    🔥 <b>Chế độ thoái mái mồi bén:</b> Tăng 25% ngân quỹ mồi nước, phù hợp cho những tháng đặc biệt có nhiều dịp cá nhân muốn tự thưởng hoặc chiêu đãi bản thân linh đình!
                  </p>
                )}

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-750 flex justify-between items-center gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-450 block tracking-wider">Hạn mức đề xuất</span>
                    <span className="text-lg font-black text-emerald-400">{predictedBudget.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMonthlyBudget(predictedBudget);
                      setBudgetInput(String(predictedBudget));
                      localStorage.setItem('nhau_solo_budget', String(predictedBudget));
                      if (currentUser) {
                        try {
                          await saveSoloBudgetToCloud(currentUser.uid, predictedBudget);
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      setSuccessMsg(`Đã thiết lập ngân sách tháng tới thành công: ${predictedBudget.toLocaleString('vi-VN')} đ! 🎯`);
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }}
                    className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-[10px] font-black px-4 py-2.5 rounded-xl border border-slate-950 cursor-pointer shadow-md flex items-center gap-1 shrink-0 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>Lên Luôn 🎯</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-slate-800 rounded-2xl p-4 text-[10px] font-bold leading-relaxed text-slate-700 dark:text-slate-400 flex items-start gap-2.5">
              <Calculator className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p>
                <b>Phương pháp tính toán:</b> Hệ thống tính số trung bình cộng di động của tổng chi tiêu các tháng gần nhất, sau đó nhân với chỉ số hành vi mục tiêu của bạn để tìm điểm cân bằng tài chính tốt nhất.
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LOG SOLO MEAL FORM */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-800 rounded-[32px] p-6 shadow-md space-y-6">
          <div className="space-y-1.5 border-b pb-4 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-6 bg-orange-600 rounded-full inline-block"></span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Utensils className="w-5 h-5 text-orange-500" />
                Ghi bữa ăn Solo mới
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Tính toán chi tiết các món ăn mồi nước cá nhân tiện theo dõi.</p>
          </div>

          {/* Presets buttons */}
          <div className="space-y-2">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Bơm đồ mẫu nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPresetMeal('com-tam')}
                className="bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-300 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-transparent dark:border-slate-700"
              >
                🍛 Cơm tấm (65k)
              </button>
              <button
                type="button"
                onClick={() => applyPresetMeal('an-choi')}
                className="bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-300 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-transparent dark:border-slate-700"
              >
                🍟 Ăn vặt chiều (47k)
              </button>
              <button
                type="button"
                onClick={() => applyPresetMeal('nhau-solo')}
                className="bg-amber-100 dark:bg-amber-950/20 hover:bg-amber-250 text-amber-900 overflow-hidden text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-amber-200"
              >
                🍺 Nhậu Solo (250k)
              </button>
            </div>
          </div>

          <form onSubmit={handleAddMeal} className="space-y-4">
            {/* Meal Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Tên bữa ăn / Mô tả <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="VD: Cơm trưa văn phòng, Phở bò sáng..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-500"
              />
            </div>

            {/* Date Picker */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Ngày ăn <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-black outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Venue Toggle & inputs */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider">Quán quen tủ hay viết tay?</span>
                <button
                  type="button"
                  onClick={() => setUseCustomVenue(!useCustomVenue)}
                  className="bg-slate-200 dark:bg-slate-855 text-slate-800 dark:text-slate-300 text-[9px] font-black px-2 py-1 rounded-sm border border-slate-900"
                >
                  {useCustomVenue ? "Chọn quán quen" : "Điền thủ công"}
                </button>
              </div>

              {useCustomVenue ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block">Tên quán ăn / địa điểm viết tay</label>
                  <input
                    type="text"
                    value={customVenueName}
                    onChange={(e) => setCustomVenueName(e.target.value)}
                    placeholder="Nhập địa điểm chi tiết (VD: Cơm Tấm Cali...)"
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-black outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block">Chọn quán tủ đã lưu</label>
                  {venues.length > 0 ? (
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-black outline-none"
                    >
                      <option value="">-- Ăn tự túc / Ở nhà / Khác --</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-semibold italic">Bạn chưa lưu quán tủ quen nào, có thể bấm "Điền thủ công"!</p>
                  )}
                </div>
              )}
            </div>

            {/* Financial cost breakdown sections */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase block leading-none">
                  Đồ Ăn / Mồi (đ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rawAmount === 0 ? '' : rawAmount}
                  onChange={(e) => setRawAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0 đ"
                  className="w-full bg-slate-50 dark:bg-slate-955 border-2 border-slate-900 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-black outline-none focus:border-amber-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase block leading-none">
                  Nước / Bia / Trà (đ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={drinkAmount === 0 ? '' : drinkAmount}
                  onChange={(e) => setDrinkAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0 đ"
                  className="w-full bg-slate-50 dark:bg-slate-955 border-2 border-slate-900 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-black outline-none focus:border-amber-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase block leading-none">
                  Ship / Gửi Xe (đ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherAmount === 0 ? '' : otherAmount}
                  onChange={(e) => setOtherAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0 đ"
                  className="w-full bg-slate-50 dark:bg-slate-955 border-2 border-slate-900 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-black outline-none focus:border-amber-500 text-right"
                />
              </div>
            </div>

            {/* Note Input */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Ghi chú phụ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Không lấy hành, thanh toán bằng Momo..."
                className="w-full bg-slate-50 dark:bg-slate-955 border-2 border-slate-900 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            {/* Total visual preview block */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 flex items-center justify-between border-2 border-slate-950">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black block">Tổng chi bữa đơn</span>
                <span className="text-2xl font-black text-emerald-400">
                  {(rawAmount + drinkAmount + otherAmount).toLocaleString('vi-VN')} đ
                </span>
              </div>
              
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs uppercase px-5 py-3 rounded-xl border border-slate-950 cursor-pointer shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Ghi Nhận Solo</span>
              </button>
            </div>
          </form>
        </div>

        {/* STATS HISTORY & SPENDING BREAKDOWN LIST */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-800 rounded-[32px] p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-6 bg-purple-600 rounded-full inline-block"></span>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Lịch Sử Chi Solo</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Xem lại các bữa ăn cá nhân đã ghi nhận gần đây.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Month Selector Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-250 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer border-0 p-0"
                >
                  <option value="all">Tất cả tháng</option>
                  {uniqueMonths.map(m => (
                    <option key={m} value={m}>Tháng {m.substring(5)}/{m.substring(0, 4)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Search bar inside list */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -current-y -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm bữa ăn, vị trí hoặc ghi chú..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500"
            />
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs font-semibold animate-pulse">
              Đang tải nhật ký bữa ăn cá nhân... 📂
            </div>
          ) : displayedMeals.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-955 space-y-2">
              <span className="text-3xl">🏜️</span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Không tìm thấy bữa ăn Solo nào trong dòng thời gian!</p>
              <p className="text-[10px] text-slate-400 font-medium">Hãy dùng ô Ghi bữa ăn Solo mới bên trái để khởi động hành trình giữ dáng hầu bao cá nhân sòng phẳng.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
              {displayedMeals.map((meal) => {
                const parts = meal.date.split('-');
                const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : meal.date;
                
                return (
                  <div 
                    key={meal.id} 
                    className="group bg-slate-50 dark:bg-slate-955 hover:bg-yellow-50/40 dark:hover:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-100 dark:bg-amber-950/40 border border-orange-200 p-2.5 rounded-xl text-xs flex flex-col items-center justify-center font-bold text-orange-600 dark:text-amber-400 w-12 shrink-0">
                        <span className="text-[9.5px] uppercase font-black tracking-tighter leading-none">Ngày</span>
                        <span className="text-sm font-black mt-1 leading-none">{displayDate}</span>
                      </div>
                      
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">
                          {meal.name}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 font-extrabold">
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {meal.venueName}
                          </span>
                          
                          {meal.note && (
                            <span className="text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                              "{meal.note}"
                            </span>
                          )}
                        </div>

                        {/* Cost allocations breakdown */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-slate-400 font-extrabold pt-0.5">
                          <span>Mồi: {meal.rawAmount.toLocaleString('vi-VN')}đ</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>Nước: {meal.drinkAmount.toLocaleString('vi-VN')}đ</span>
                          {meal.otherAmount > 0 && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span>Hóa đơn lẻ khác: {meal.otherAmount.toLocaleString('vi-VN')}đ</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-2.5 sm:pt-0 border-slate-150">
                      <div className="text-left sm:text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono block">
                          {meal.totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">tổng một sòng</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all border border-transparent hover:border-red-200 cursor-pointer"
                        title="Xoá lịch sử bữa ăn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
