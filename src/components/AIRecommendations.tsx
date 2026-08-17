import React, { useState } from 'react';
import { Venue } from '../types';
import toast from 'react-hot-toast';
import { 
  Sparkles, 
  MapPin, 
  Search, 
  Star, 
  Plus, 
  Check, 
  Utensils, 
  TrendingUp, 
  Compass, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';

interface AIRecommendationsProps {
  savedVenues: Venue[];
  onAddVenue: (venue: Omit<Venue, 'id' | 'visitsCount'>) => Venue;
}

interface RecommendedVenue {
  name: string;
  address: string;
  rating: number;
  highlights: string;
  priceRange: string;
  sourceUrl: string;
}

const PRESET_DISTRICTS = [
  { id: 'cau-giay', label: 'Cầu Giấy, HN', query: 'Quận Cầu Giấy, Hà Nội' },
  { id: 'hoan-kiem', label: 'Hoàn Kiếm, HN', query: 'Quận Hoàn Kiếm, Hà Nội' },
  { id: 'dong-da', label: 'Đống Đa, HN', query: 'Quận Đống Đa, Hà Nội' },
  { id: 'tay-ho', label: 'Tây Hồ, HN', query: 'Quận Tây Hồ, Hà Nội' },
  { id: 'q1-hcm', label: 'Quận 1, HCM', query: 'Quận 1, TP. Hồ Chí Minh' },
  { id: 'q3-hcm', label: 'Quận 3, HCM', query: 'Quận 3, TP. Hồ Chí Minh' },
  { id: 'binh-thanh', label: 'Bình Thạnh, HCM', query: 'Quận Bình Thạnh, TP. Hồ Chí Minh' }
];

const CATEGORIES = [
  { id: 'bia-hoi', label: 'Bia hơi & Mồi bén', icon: '🍺' },
  { id: 'lau-nuong', label: 'Lẩu & Đồ nướng', icon: '🍢' },
  { id: 'hai-san', label: 'Hải sản tươi sống', icon: '🦀' },
  { id: 'quan-oc', label: 'Ốc & Ăn vặt', icon: '🐚' },
  { id: 'pub-chill', label: 'Pub & Bar chill', icon: '🍸' },
  { id: 'all', label: 'Tất cả món nhậu', icon: '🍽️' }
];

export default function AIRecommendations({ savedVenues, onAddVenue }: AIRecommendationsProps) {
  const [locationInput, setLocationInput] = useState<string>('Cầu Giấy, Hà Nội');
  const [selectedCategory, setSelectedCategory] = useState<string>('bia-hoi');
  const [useSavedVenuesPreference, setUseSavedVenuesPreference] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendedVenue[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSystemMocked, setIsSystemMocked] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [aiProvider, setAiProvider] = useState<'gemini' | 'deepseek'>(() => (localStorage.getItem('recommendation_ai_provider') as 'gemini' | 'deepseek') || 'gemini');

  // Get highly-rated saved venues to showcase the personalization
  const highRatedSaved = savedVenues.filter(v => (v.rating || 0) >= 4);

  const fetchRecommendations = async (customQuery?: string) => {
    setLoading(true);
    setErrorMsg(null);
    setRecommendations([]);

    const queryLocation = customQuery !== undefined ? customQuery : locationInput;

    const categoryText = CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Ẩm thực nhậu';

    // Prepare saved venues list for context matching
    const sampleSaved = useSavedVenuesPreference 
      ? highRatedSaved.map(v => ({ name: v.name, rating: v.rating }))
      : [];

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: queryLocation,
          category: categoryText,
          savedVenues: sampleSaved,
          provider: aiProvider
        })
      });

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi (${response.status}). Vui lòng thử lại sau.`);
      }

      const data = await response.json();

      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
        setIsSystemMocked(!!data.isMock);
      } else {
        throw new Error(data.error || 'Máy chủ trả về kết quả rỗng.');
      }
    } catch (err: any) {
      console.error('Failure fetching recommendations client-side:', err);
      setErrorMsg(err.message || 'Không thể liên hệ dịch vụ AI để tìm quán nhậu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (query: string) => {
    setLocationInput(query);
    setGpsActive(false);
    fetchRecommendations(query);
  };

  const handleSaveToMyVenues = (rec: RecommendedVenue, index: number) => {
    try {
      onAddVenue({
        name: rec.name,
        address: rec.address,
        rating: Math.round(rec.rating) || 5,
        notes: `🤖 Gợi ý chuẩn AI: ${rec.highlights} (${rec.priceRange})`
      });

      // Mark as saved
      setSavedStatus(prev => ({ ...prev, [index]: true }));
    } catch (e) {
      console.error('Error adding venue from recommendation', e);
    }
  };

  // Attempt to fetch approximate HTML5 geolocation coordinates
  const handleGPSLocationLookup = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ Geolocation tự động.');
      return;
    }

    setLoading(true);
    setGpsActive(false);
    
    // Use maximumAccuracy and sensible timeouts for high fidelity geolocation
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setLocationInput(coordsStr);
        setGpsActive(true);
        // Dispatch instant recommendation lookup with actual GPS coordinates
        fetchRecommendations(coordsStr);
      },
      (error) => {
        console.warn('Geolocation lookup denied/failed:', error);
        toast.error('Không lấy được tọa độ GPS. Vui lòng cấp quyền vị trí hoặc nhập địa chỉ thủ công.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6" id="ai-recs-dashboard">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 border-4 border-slate-900 rounded-[32px] p-6 text-slate-950 shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 bg-slate-950/20 w-fit px-3 py-1.5 rounded-full border border-white/20">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white leading-none">CỦNG CỐ BỞI GOOGLE SEARCH GROUNDING AI</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              Gợi Ý Quán Nhậu AI Thực Tế 🍻
            </h2>
            <p className="text-xs font-bold text-orange-100 max-w-xl">
              Hệ thống tìm kiếm thông tin thời gian thực qua Google Search API để tổng hợp, chọn lọc các tụ điểm nhậu uy tín, lẩu ngon, có bãi rộng phù hợp nhất cho anh em.
            </p>
          </div>
          <div className="text-center md:text-right bg-slate-950/15 border-2 border-dashed border-white/30 rounded-2xl p-4 flex-shrink-0">
            <span className="text-2xl font-black text-white block">AI Search Engine</span>
            <span className="text-[9px] font-black text-orange-200 uppercase tracking-widest">Thời gian thực cực bén</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FILTERS AND CONTROLS */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-6 shadow-lg h-fit space-y-5">
          <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-orange-550" />
              Cấu hình vị trí & nhu cầu
            </h3>
            <p className="text-xs font-bold text-slate-505 text-slate-500">Giới hạn khu vực để AI nhặt quán chuẩn quanh bạn.</p>
          </div>

          <div className="space-y-4">
            {/* Location Query input */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-700 dark:text-slate-350 block uppercase tracking-wider">
                📍 Nhắm mục tiêu vị trí cụ thể
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: Cầu Giấy, Hà Nội hoặc Quận 3, HCM"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setGpsActive(false);
                  }}
                  className={`w-full text-xs font-black bg-yellow-50/10 dark:bg-slate-950/30 border-2 p-3.5 pl-10 rounded-xl text-slate-900 dark:text-white outline-none focus:border-orange-500 ${
                    gpsActive ? 'border-rose-500 ring-2 ring-rose-300 dark:ring-rose-950' : 'border-slate-900'
                  }`}
                />
                <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${gpsActive ? 'text-rose-500' : 'text-slate-400'}`} />
              </div>

              {/* Glowing High Quality GPS Controls */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGPSLocationLookup}
                  disabled={loading}
                  className={`w-full text-xs font-black uppercase tracking-wider py-3 px-4.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    gpsActive 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200 dark:shadow-rose-950/35 animate-pulse'
                      : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-850 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-slate-800'
                  }`}
                >
                  <span className={`relative flex h-2 w-2 ${gpsActive ? 'inline-block' : 'hidden'}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>📍 {gpsActive ? 'Đang bật định vị GPS của bạn' : 'Quét địa phận & tìm quán quanh tôi với GPS'}</span>
                </button>
                {gpsActive && (
                  <div className="text-[10.5px] font-extrabold text-rose-550 dark:text-rose-400 flex items-center gap-1 justify-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-200 dark:border-rose-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Đã cập nhật toạ độ hiện tại: <span className="font-mono text-xs text-rose-600 dark:text-rose-300 underline">{locationInput}</span>
                  </div>
                )}
              </div>
            </div>

            {/* QUICK PRESETS CHIPS */}
            <div className="space-y-2">
              <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Khu vực nhậu phổ biến:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_DISTRICTS.map((district) => (
                  <button
                    key={district.id}
                    type="button"
                    onClick={() => handlePresetClick(district.query)}
                    className="text-[11px] font-bold px-2.5 py-1.5 bg-slate-100 hover:bg-orange-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 hover:text-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    {district.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CUISINE EXCELLENT CATEGORIES */}
            <div className="space-y-2">
              <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-300 block uppercase tracking-wider">Lựa chọn gu mồi màng:</span>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 text-xs text-left font-extrabold rounded-xl border-2 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-650 dark:text-slate-350'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SYNERGY WITH SAVED VENUES PREFERENCES */}
            {highRatedSaved.length > 0 && (
              <div className="bg-yellow-50/40 dark:bg-slate-950/30 p-3 border-2 border-dashed border-yellow-250 dark:border-slate-800 rounded-2xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSavedVenuesPreference}
                    onChange={(e) => setUseSavedVenuesPreference(e.target.checked)}
                    className="mt-1 accent-orange-500 cursor-pointer h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Tối ưu hóa theo gu người dùng ⭐</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Tham khảo dữ liệu {highRatedSaved.length} quán tủ bạn đã đánh giá cao để tìm quán mới đồng điệu phong cách.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* AI MODEL SELECTOR FOR RECOMMENDATIONS */}
            <div className="bg-orange-50/50 dark:bg-orange-950/20 p-3.5 rounded-2xl border-2 border-slate-900 space-y-1.5">
              <span className="text-[10px] font-black text-orange-850 dark:text-orange-400 block uppercase tracking-wider">
                🤖 ĐỘNG CƠ TRUY VẤN & TÌM TỤ ĐIỂM:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('gemini');
                    localStorage.setItem('recommendation_ai_provider', 'gemini');
                  }}
                  className={`py-1.5 px-2 text-[11px] font-black rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    aiProvider === 'gemini'
                      ? 'bg-orange-500 text-slate-950 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  🚀 Gemini AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('deepseek');
                    localStorage.setItem('recommendation_ai_provider', 'deepseek');
                  }}
                  className={`py-1.5 px-2 text-[11px] font-black rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    aiProvider === 'deepseek'
                      ? 'bg-indigo-650 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  🧠 DeepSeek
                </button>
              </div>
            </div>

            {/* FIND HOT SPOTS CTA */}
            <button
              onClick={() => fetchRecommendations()}
              disabled={loading || !locationInput.trim()}
              className="w-full bg-slate-900 dark:bg-orange-550 hover:bg-orange-500 hover:text-slate-950 text-white rounded-2xl py-4 text-xs font-black border-2 border-slate-950 cursor-pointer shadow-md transition-all hover:scale-[1.01] active:translate-y-0.5 flex items-center justify-center gap-2"
              style={{ backgroundColor: selectedCategory === 'all' ? '#1e293b' : undefined }}
            >
              <Search className="w-4 h-4" />
              {loading ? 'Đang truy lùng địa điểm nhậu...' : 'Tìm tụ điểm bằng Google Search'}
            </button>
          </div>
        </div>

        {/* RESULTS FEED VIEWPORT */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-6 shadow-lg min-h-[400px] flex flex-col">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/30 border-3 border-red-500 rounded-2xl p-4 flex items-start gap-3 my-auto">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-black text-red-800 dark:text-red-300 block">Có lỗi xảy ra khi truy vấn dữ liệu nhậu</span>
                <p className="text-[11px] font-bold text-red-650 dark:text-red-450 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="my-auto text-center py-16 space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                {/* Visual pulsating search waves */}
                <span className="absolute top-0 left-0 w-20 h-20 border-4 border-dashed border-orange-500 rounded-full animate-spin"></span>
                <span className="absolute top-2.5 left-2.5 w-15 h-15 bg-yellow-105 rounded-full flex items-center justify-center font-bold text-3xl animate-pulse">🍻</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 dark:text-white">Đang tổng hợp dữ liệu Google Search...</h4>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono animate-pulse">
                  {selectedCategory === 'bia-hoi' ? '🍺 Tìm nguồn mồi ngon bia bọt chất lượng tốt...' : '🍢 Đang bới tìm quán chuẩn vị mồi sòng phẳng...'}
                </p>
              </div>
            </div>
          )}

          {!loading && !errorMsg && recommendations.length === 0 && (
            <div className="my-auto text-center py-16 space-y-4">
              <Compass className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto animate-bounce" />
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Sẵn sàng định vị quán tủ</h4>
                <p className="text-xs font-bold text-slate-500 leading-normal">
                  Điền địa phương mong muốn và click nút để kích hoạt Gemini truy xuất thông tin địa chỉ từ những cuộc thảo luận, review thời gian thực gần đây nhất.
                </p>
              </div>
            </div>
          )}

          {!loading && !errorMsg && recommendations.length > 0 && (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              {/* Warnings and notices */}
              {isSystemMocked && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 text-slate-800 dark:text-amber-200 p-3 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] leading-tight font-bold">
                    <span className="text-xs font-black block">Chế độ Ngoại Tuyến (Offline Backups):</span>
                    {errorMsg || 'Chưa nhận diện API key trên môi trường này. Hệ thống hiển thị các quán mồi bén chất lượng cao thịnh hành thuộc kho lưu trữ dự phòng của chúng tôi.'}
                  </div>
                </div>
              )}

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/25 px-3 py-1 rounded-full border border-rose-200">
                    Tìm thấy {recommendations.length} tụ điểm cực khét
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-black font-mono">Grounding Level: High</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {recommendations.map((rec, idx) => (
                    <div 
                      key={idx} 
                      className="bg-yellow-50/15 dark:bg-slate-950/25 border-3 border-slate-900 dark:border-slate-800 rounded-[24px] p-4 flex flex-col sm:flex-row items-stretch gap-4 hover:-translate-y-0.5 transition-all shadow-sm"
                    >
                      <div className="flex-1 space-y-2.5 text-left">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-920 dark:text-orange-300 leading-tight">🍢 {rec.name}</h4>
                            <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] font-black text-amber-600 dark:text-amber-350">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{rec.rating ? rec.rating.toFixed(1) : '4.5'}</span>
                            </div>
                          </div>
                          
                          <p className="text-[11px] leading-tight font-bold text-slate-500 dark:text-slate-450 flex items-start gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span>{rec.address}</span>
                          </p>
                        </div>

                        {rec.highlights && (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl">
                            <span className="text-[9px] font-black uppercase text-orange-500 block leading-none mb-0.5">Mồi đặc trưng / Điểm cộng:</span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-normal italic">
                              &ldquo;{rec.highlights}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] font-black">
                          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200">
                            💰 {rec.priceRange || 'Giá cả hợp lý'}
                          </span>
                        </div>
                      </div>

                      <div className="sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-4 flex sm:flex-col justify-end sm:justify-center gap-2 flex-shrink-0 min-w-[130px]">
                        <a 
                          href={rec.sourceUrl || "https://www.google.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-[10.5px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 p-2.5 rounded-xl border border-slate-350 dark:border-slate-700 flex-1 sm:flex-initial text-center cursor-pointer"
                        >
                          Xem Bản Đồ <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {savedStatus[idx] ? (
                          <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-black text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 p-2 rounded-xl flex-1 sm:flex-initial">
                            <Check className="w-3.5 h-3.5" /> Thể Quán Tủ!
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSaveToMyVenues(rec, idx)}
                            className="flex items-center justify-center gap-1.5 text-[10.5px] font-black text-slate-950 bg-orange-500 hover:bg-orange-600 p-2 rounded-xl border-2 border-slate-950 shadow-sm cursor-pointer flex-1 sm:flex-initial"
                          >
                            <Plus className="w-3.5 h-3.5" /> Lưu Vào Quán Tủ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
                Lưu ý: Mọi đánh giá phản hồi mang tính khách quan từ kết quả tìm kiếm Google Search và được phân tích qua mô hình AI tốt nhất.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
