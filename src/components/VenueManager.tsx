import React, { useState, useEffect } from 'react';
import { Venue } from '../types';
import { 
  Store, 
  MapPin, 
  Notebook, 
  Star, 
  Plus, 
  Trash, 
  Search, 
  Award, 
  Share2, 
  MessageSquare, 
  User, 
  Calendar, 
  Download, 
  ChevronRight, 
  AlertCircle,
  Clock,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import { 
  fetchPublicVenuesFromCloud, 
  shareVenueToCommunityCloud, 
  fetchPublicVenueReviewsFromCloud, 
  addPublicVenueReviewCloud,
  PublicVenue,
  PublicVenueReview
} from '../lib/firebase';

interface VenueManagerProps {
  venues: Venue[];
  onAddVenue: (venue: Omit<Venue, 'id' | 'visitsCount'>) => Venue;
  onDeleteVenue: (id: string) => void;
  currentUser: any;
  activeCreatorName: string;
}

export default function VenueManager({ 
  venues, 
  onAddVenue, 
  onDeleteVenue, 
  currentUser, 
  activeCreatorName 
}: VenueManagerProps) {
  // Navigation: 'local' (Quán tủ cá nhân) | 'community' (Dzô Quán tủ cộng đồng)
  const [managerTab, setManagerTab] = useState<'local' | 'community'>('community');
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [localFilter, setLocalFilter] = useState<'all' | 'high-rated' | 'most-visited' | 'unvisited'>('all');
  
  // New private venue input state
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rating, setRating] = useState<number>(5);

  // Community state
  const [publicVenues, setPublicVenues] = useState<PublicVenue[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [publicFetchError, setPublicFetchError] = useState<string | null>(null);
  const [sharingLoadingId, setSharingLoadingId] = useState<string | null>(null);
  const [communitySearchTerm, setCommunitySearchTerm] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review states per venue
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);
  const [venueReviews, setVenueReviews] = useState<{ [key: string]: PublicVenueReview[] }>({});
  const [loadingReviewsId, setLoadingReviewsId] = useState<string | null>(null);
  
  // Add review form state
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState<string>('');
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);

  // Load public shared venues from firestore
  const loadPublicVenues = async () => {
    setIsLoadingPublic(true);
    setPublicFetchError(null);
    try {
      const liveShared = await fetchPublicVenuesFromCloud();
      setPublicVenues(liveShared);
    } catch (e: any) {
      console.error('Failed to load public venues:', e);
      setPublicFetchError(e?.message || String(e));
    } finally {
      setIsLoadingPublic(false);
    }
  };

  // Trigger loading when tab changes
  useEffect(() => {
    if (managerTab === 'community') {
      loadPublicVenues();
    }
  }, [managerTab]);

  const handleSubmitPrivateVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddVenue({
      name,
      address,
      notes,
      rating
    });

    setName('');
    setAddress('');
    setNotes('');
    setRating(5);
    
    setSuccessMessage('Đã thêm Quán Quen Tủ cá nhân thành công! 🎉');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Share a personal venue to the public "Dzô Quán tủ" community
  const handleShareToCommunity = async (v: Venue) => {
    if (!currentUser) {
      alert('Vui lòng Đăng nhập mây ☁️ ở góc trên bên phải để có thể chia sẻ quán lên cộng đồng!');
      return;
    }
    
    setSharingLoadingId(v.id);
    try {
      await shareVenueToCommunityCloud(
        {
          name: v.name,
          address: v.address,
          notes: v.notes || 'Quán quen vô cùng đắc địa, mồi ngon chuẩn vị!',
          rating: v.rating || 5
        },
        currentUser.uid,
        activeCreatorName || currentUser.displayName || currentUser.email || 'Bợm nhậu ẩn danh'
      );
      
      setSuccessMessage(`Đã chia sẻ thành công quán "${v.name}" lên cộng đồng Dzô Quán tủ! 🍻`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e) {
      console.error('Failed to share venue:', e);
      alert('Có lỗi xảy ra khi chia sẻ lên cộng đồng. Vui lòng thử lại!');
    } finally {
      setSharingLoadingId(null);
    }
  };

  // Expand and load reviews for a public venue
  const handleToggleExpandVenue = async (venueId: string) => {
    if (expandedVenueId === venueId) {
      setExpandedVenueId(null);
      return;
    }
    
    setExpandedVenueId(venueId);
    setNewReviewRating(5);
    setNewReviewComment('');
    
    // Check if we need to load reviews
    if (!venueReviews[venueId]) {
      setLoadingReviewsId(venueId);
      try {
        const reviewsList = await fetchPublicVenueReviewsFromCloud(venueId);
        setVenueReviews(prev => ({ ...prev, [venueId]: reviewsList }));
      } catch (err) {
        console.error('Error loading reviews:', err);
      } finally {
        setLoadingReviewsId(null);
      }
    }
  };

  // Submit new review & comment
  const handleSubmitReview = async (venueId: string) => {
    if (!currentUser) {
      alert('Vui lòng Đăng nhập mây ☁️ ở góc trên bên phải để có thể đánh giá và bình luận!');
      return;
    }
    if (!newReviewComment.trim()) {
      alert('Vui lòng nhập lời nhận xét của bạn về quán ăn này!');
      return;
    }

    setSubmittingReviewId(venueId);
    try {
      const userDisplayName = activeCreatorName || currentUser.displayName || currentUser.email || 'Bợm nhậu ẩn danh';
      const createdReview = await addPublicVenueReviewCloud(
        venueId,
        newReviewRating,
        newReviewComment.trim(),
        currentUser.uid,
        userDisplayName
      );

      // Append review instantly to list
      setVenueReviews(prev => ({
        ...prev,
        [venueId]: [createdReview, ...(prev[venueId] || [])]
      }));

      // Flush local review form
      setNewReviewComment('');
      setNewReviewRating(5);

      // Reload public venues info to reflect updated rates
      await loadPublicVenues();
      setSuccessMessage('Cảm ơn bạn đã đóng góp đánh giá cho cộng đồng! ⭐');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error posting review:', err);
      alert('Có lỗi xảy ra khi lưu đánh giá. Vui lòng kiểm tra lại!');
    } finally {
      setSubmittingReviewId(null);
    }
  };

  // Save community venue down into personal saved list
  const handleImportVenue = (pub: PublicVenue) => {
    onAddVenue({
      name: pub.name,
      address: pub.address,
      notes: pub.notes || `Lấy từ Dzô Quán tủ cộng đồng, được chia sẻ bởi ${pub.sharedByName}.`,
      rating: pub.rating
    });
    setSuccessMessage(`Đã lấy quán "${pub.name}" thành công về danh sách Quán Quen Tủ cá nhân của bạn! 📥`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const filteredLocalVenues = venues.filter(v => {
    // 1. Text search match
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (v.address && v.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Specific filter match
    if (localFilter === 'high-rated') {
      return (v.rating || 5) >= 4.8;
    }
    if (localFilter === 'most-visited') {
      return (v.visitsCount || 0) > 0;
    }
    if (localFilter === 'unvisited') {
      return (v.visitsCount || 0) === 0;
    }

    return true;
  });

  const filteredCommunityVenues = publicVenues.filter(v => 
    v.name.toLowerCase().includes(communitySearchTerm.toLowerCase()) || 
    v.address.toLowerCase().includes(communitySearchTerm.toLowerCase()) ||
    v.sharedByName.toLowerCase().includes(communitySearchTerm.toLowerCase())
  );

  // Personal most visited place
  const mostVisited = venues.length > 0 
    ? [...venues].sort((a, b) => b.visitsCount - a.visitsCount)[0] 
    : null;

  return (
    <div className="space-y-6" id="venue-manager-section">
      
      {/* Alert toast notification */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white border-2 border-slate-700 rounded-2xl p-4 py-3 shadow-2xl z-50 flex items-center gap-2 max-w-sm animate-slideIn">
          <ThumbsUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs font-bold">{successMessage}</p>
        </div>
      )}

      {/* Primary Section Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-6 bg-pink-500 rounded-full inline-block"></span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-pink-500" />
              Dzô Quán tủ cộng đồng 🍻
            </h2>
          </div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Nơi giao lưu, chia sẻ và chấm điểm các tụ điểm ăn chơi đẳng cấp cùng anh em bợm nhậu khắp đất nước.
          </p>
        </div>

        {/* Outer Tabs selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setManagerTab('community')}
            className={`px-4 py-2 cursor-pointer transition-all rounded-xl text-xs font-black flex items-center gap-1.5 ${
              managerTab === 'community'
                ? 'bg-pink-550 bg-pink-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kênh Đọc Quán Tủ (Mọi Người)</span>
          </button>
          
          <button
            onClick={() => setManagerTab('local')}
            className={`px-4 py-2 cursor-pointer transition-all rounded-xl text-xs font-black flex items-center gap-1.5 ${
              managerTab === 'local'
                ? 'bg-orange-550 bg-orange-550 bg-orange-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Tự Điểm Cá Nhân ({venues.length})</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: QUÁN CỘNG ĐỒNG (DZÔ QUÁN TỦ COMMUNITY FEED) */}
      {managerTab === 'community' && (
        <div className="space-y-6">
          {/* Top Info Banner for Guests */}
          {!currentUser && (
            <div className="bg-orange-50 border-4 border-dashed border-orange-500 rounded-[28px] p-4.5 flex items-start gap-4">
              <div className="bg-orange-500 text-white p-2.5 rounded-2xl flex-shrink-0 shadow-sm">
                <AlertCircle className="w-5 h-5 text-slate-900" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider">MẸO KHÁM PHÁ CỘNG ĐỒNG</span>
                <p className="text-xs font-black text-slate-800 leading-relaxed">
                  Bạn đang xem với tư cách khách khứa chưa đăng nhập. Bạn có thể thả ga xem địa bàn và đánh giá, nhưng hãy nhấn <span className="underline cursor-pointer text-orange-600" onClick={() => document.getElementById('venue-manager-section')?.scrollIntoView({ behavior: 'smooth' })}>Đăng nhập mây ☁️</span> để bắt đầu chia sẻ quán quen ruột của bản thân và gửi bình luận đắc sòng nhất!
                </p>
              </div>
            </div>
          )}

          {/* Search Community Venue bar */}
          <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[28px] p-4 shadow-md flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Nhập tên quán ăn ngon, địa bàn, tỉnh thành, hoặc tên người chia sẻ để tìm nhanh..."
              value={communitySearchTerm}
              onChange={(e) => setCommunitySearchTerm(e.target.value)}
              className="w-full text-xs font-black bg-transparent border-none outline-hidden text-slate-950 dark:text-slate-100 placeholder:text-slate-400"
            />
            {communitySearchTerm && (
              <button
                onClick={() => setCommunitySearchTerm('')}
                className="text-xs font-extrabold text-slate-400 hover:text-slate-950 dark:hover:text-white cursor-pointer px-1"
              >
                Xóa lọc
              </button>
            )}
          </div>

          {/* Public venues Grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingPublic ? (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px]">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang kết nối sóng mây, tải danh bạ quán tủ cộng đồng...</p>
              </div>
            ) : publicFetchError ? (
              <div className="col-span-full text-center py-16 bg-rose-50 dark:bg-rose-950/20 border-4 border-rose-500 rounded-[32px] p-6 space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">Không thể kết nối cơ sở dữ liệu mây</h3>
                  <p className="text-xs font-extrabold text-rose-700 dark:text-rose-300 max-w-lg mx-auto leading-relaxed">
                    Đồng bộ hóa cộng đồng đang bị gián đoạn do chậm trễ thiết lập quyền Firestore trên Cloud hoặc trình duyệt bị ngắt kết nối.
                  </p>
                  <span className="inline-block mt-2 font-mono text-xs text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-rose-200 dark:border-rose-950">
                    {publicFetchError}
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={loadPublicVenues}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs border-2 border-slate-900 rounded-xl cursor-pointer transition-all shadow-sm shadow-rose-200 dark:shadow-rose-950/30"
                  >
                    Thử quét lại dữ liệu 🔄
                  </button>
                </div>
              </div>
            ) : filteredCommunityVenues.length === 0 ? (
              <div className="col-span-full text-center py-24 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] border-dashed border-slate-300">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Chưa tìm thấy quán tủ nào</h3>
                <p className="text-xs font-extrabold text-slate-400 mt-1 max-w-md mx-auto">
                  Hãy là người tiên phong chia sẻ quán quen đỉnh chóp của bản thân cho cộng đồng bằng cách nhấn tab &ldquo;Tự Điểm Cá Nhân&rdquo; và click chia sẻ!
                </p>
              </div>
            ) : (
              filteredCommunityVenues.map((pub) => {
                const isExpanded = expandedVenueId === pub.id;
                const reviews = venueReviews[pub.id] || [];
                const reviewsLoading = loadingReviewsId === pub.id;
                
                return (
                  <div 
                    key={pub.id} 
                    className="bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-5 shadow-md flex flex-col justify-between space-y-4 hover:shadow-xl transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
                        <div>
                          <span className="text-[9px] uppercase font-black text-pink-500 tracking-wider">🏠 Dzô Quán tủ cộng đồng</span>
                          <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">🍢 {pub.name}</h3>
                        </div>
                        
                        <button
                          onClick={() => handleImportVenue(pub)}
                          className="flex items-center gap-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-[10px] uppercase border-2 border-slate-950 px-2.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all active:translate-y-0.5"
                          title="Lưu quán ngon này về danh sách local của riêng bạn để sài khi lập hóa đơn"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Lưu về</span>
                        </button>
                      </div>

                      <p className="text-xs font-bold text-slate-655 text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                        {pub.address || 'Chưa định vị cụ thể'}
                      </p>

                      <div className="bg-pink-50/20 dark:bg-pink-950/20 rounded-2xl p-3 border-2 border-slate-900 dark:border-slate-800">
                        <span className="text-[8px] uppercase font-black text-slate-400 dark:text-slate-500 block">Lời giới thiệu/Độc chiêu của quán:</span>
                        <p className="text-xs font-bold text-slate-855 text-slate-800 dark:text-slate-200 italic mt-1 leading-relaxed">
                          &ldquo; {pub.notes || 'Ấn tượng đầu tiên: Mồi nhướng cực hợp lý, giá cả siêu mềm!'} &rdquo;
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[10px] font-black pt-1">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-slate-700 dark:text-slate-300 text-xs">{pub.rating.toFixed(1)} / 5 ({pub.ratingsCount} đánh giá)</span>
                        </div>
                        <div className="h-3 w-0.5 bg-slate-300 hidden sm:block" />
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          👤 Trình làng bởi: <span className="text-slate-900 dark:text-white underline">{pub.sharedByName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive ratings and reviews drawer panel */}
                    <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-3">
                      <button
                        onClick={() => handleToggleExpandVenue(pub.id)}
                        className="w-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 p-2.5 rounded-2xl text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4 text-pink-500 animate-pulse" />
                          {isExpanded ? 'Đóng mục bình tán' : `Xem bình phẩm & đánh giá của đồng nhậu (${pub.ratingsCount})`}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-4 animate-slideIn">
                          
                          {/* Add a review Form section */}
                          <div className="bg-yellow-50/15 dark:bg-slate-950/20 border-2 border-slate-900 dark:border-slate-700 p-3.5 rounded-2xl space-y-3">
                            <span className="text-[10px] uppercase font-black text-slate-800 dark:text-slate-200 block">Thêm bình phẩm + chấm điểm:</span>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Chấm sao:</span>
                              <div className="flex items-center bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-705 p-1 px-2 rounded-xl">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setNewReviewRating(s)}
                                    className="p-0.5 cursor-pointer focus:outline-hidden"
                                  >
                                    <Star className={`w-4.5 h-4.5 ${s <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="relative">
                              <textarea
                                placeholder={currentUser ? "Nhập lời nhận xét chân thực của bạn tại đây..." : "Hãy Đăng nhập để chia sẻ lời nhận xét chân chất!"}
                                disabled={!currentUser}
                                value={newReviewComment}
                                onChange={(e) => setNewReviewComment(e.target.value)}
                                rows={2}
                                className="w-full text-xs font-medium border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 outline-hidden focus:border-pink-500 disabled:opacity-50"
                              />
                            </div>

                            <button
                              onClick={() => handleSubmitReview(pub.id)}
                              disabled={submittingReviewId === pub.id || !currentUser}
                              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-pink-500 dark:hover:bg-pink-600 hover:text-white text-white border-2 border-slate-950 px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-1"
                            >
                              {submittingReviewId === pub.id ? 'Đang gửi...' : 'Gửi Đóng Góp ✍️'}
                            </button>
                          </div>

                          {/* Reviews List output */}
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {reviewsLoading ? (
                              <p className="text-center text-[10px] text-slate-400 uppercase font-black py-4">Đang xúc xắc tìm bình luận...</p>
                            ) : reviews.length === 0 ? (
                              <p className="text-center text-xs text-slate-400 font-bold py-4">Chưa có bình luận nào. Hãy khai lộc bằng bài bình phán đầu tiên!</p>
                            ) : (
                              reviews.map((rev) => (
                                <div key={rev.id} className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 p-3 rounded-2xl space-y-1.5 shadow-5xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      👤 {rev.authorName}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                      <span className="text-[10px] font-black">{rev.rating}</span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs font-bold leading-normal text-slate-755 text-slate-700 dark:text-slate-355 italic">&ldquo; {rev.comment} &rdquo;</p>
                                  
                                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(rev.createdAt).toLocaleDateString('vi', {day:'numeric', month:'short', year:'numeric'})}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: QUÁN CÁ CỦA TÔI (MY SAVED LIST) */}
      {managerTab === 'local' && (
        <div className="space-y-6">
          {/* PROMINENT SEARCH, QUICK FILTER & STATS BANNER */}
          <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-6 shadow-lg space-y-4 animate-slideIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-orange-500 tracking-wider">🎯 TRÌNH TRA CỨU & BỘ LỌC THÔNG MINH</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Bộ Sưu Tập Quán Quen Tủ cá nhân ({venues.length})
                </h3>
              </div>
              
              {/* Highlight Stats of saved venues */}
              <div className="flex items-center gap-4 bg-orange-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 px-4 py-2 rounded-2xl text-xs font-black">
                <div className="text-slate-950 dark:text-white">
                  🏆 Hay đi nhất: <span className="text-orange-600 font-extrabold">{mostVisited ? mostVisited.name : 'Chưa có'}</span>
                  {mostVisited && <span className="text-[10px] text-slate-400 font-bold ml-1">({mostVisited.visitsCount} lần)</span>}
                </div>
              </div>
            </div>

            {/* Input & Filters element */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Main big Search input */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-850 border-3 border-slate-900 dark:border-slate-705 p-3.5 rounded-2xl flex items-center gap-2.5">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Tra cứu nhanh quán ruột theo tên quán, địa chỉ hoặc món ăn đặc biệt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs font-black bg-transparent border-none outline-hidden text-slate-950 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer underline shrink-0"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>

              {/* Interactive Quick buttons selector */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLocalFilter('all')}
                  className={`px-3 py-2 text-[11px] font-black cursor-pointer rounded-xl transition-all border-2 ${
                    localFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-700 dark:border-slate-600'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  Tất cả ({venues.length})
                </button>
                
                <button
                  type="button"
                  onClick={() => setLocalFilter('high-rated')}
                  className={`px-3 py-2 text-[11px] font-black cursor-pointer rounded-xl transition-all border-2 flex items-center gap-1 ${
                    localFilter === 'high-rated'
                      ? 'bg-amber-500 text-slate-950 border-slate-950 dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  Chuẩn 5★ ({venues.filter(v => (v.rating || 5) >= 4.8).length})
                </button>

                <button
                  type="button"
                  onClick={() => setLocalFilter('most-visited')}
                  className={`px-3 py-2 text-[11px] font-black cursor-pointer rounded-xl transition-all border-2 flex items-center gap-1 ${
                    localFilter === 'most-visited'
                      ? 'bg-orange-500 text-white border-slate-950 dark:bg-orange-500'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  🍺 Đã nhậu ({venues.filter(v => (v.visitsCount || 0) > 0).length})
                </button>

                <button
                  type="button"
                  onClick={() => setLocalFilter('unvisited')}
                  className={`px-3 py-2 text-[11px] font-black cursor-pointer rounded-xl transition-all border-2 flex items-center gap-1 ${
                    localFilter === 'unvisited'
                      ? 'bg-teal-500 text-slate-950 border-slate-950 dark:bg-teal-500 dark:text-slate-950'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  🧊 Mới ghim ({venues.filter(v => (v.visitsCount || 0) === 0).length})
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add personal favorite venue form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] shadow-lg p-6 h-fit space-y-5">
              <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-7 bg-orange-500 rounded-full inline-block"></span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <Store className="w-5 h-5 text-orange-500" />
                    Đăng Ký Quán Riêng
                  </h2>
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Ghim các tụ điểm quán bia, lẩu nướng yêu thích nhất để làm lịch sử chia tiền siêu tốc.
                </p>
              </div>

              <form onSubmit={handleSubmitPrivateVenue} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-755 text-slate-700 dark:text-slate-300 block uppercase tracking-wide">
                    Tên quán ăn / Thức uống <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Bia Hơi Lan Béo - Hoàng Hoa Thám"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-extrabold bg-slate-50 dark:bg-slate-850 border-2 border-slate-900 dark:border-slate-705 focus:border-orange-500 rounded-xl p-3 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-755 text-slate-700 dark:text-slate-300 block uppercase tracking-wide">
                    Địa chỉ hoặc vị trí
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Số 24 ngõ 39 Phạm Ngọc Thạch, Đống Đa"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-850 border-2 border-slate-900 dark:border-slate-705 focus:border-orange-500 rounded-xl p-3 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-755 text-slate-700 dark:text-slate-300 block uppercase tracking-wide">
                    Món Độc Bản Nhất / Điểm Cộng
                  </label>
                  <textarea
                    placeholder="Ví dụ: Có món giò heo giả cầy nhâm nhi chuẩn bài, dồi sụn cực thơm ngon..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-850 border-2 border-slate-900 dark:border-slate-705 focus:border-orange-500 rounded-xl p-3 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-755 text-slate-700 dark:text-slate-300 block uppercase tracking-wide">
                    Mức độ sướng / Hài lòng
                  </label>
                  <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-850 p-2 border-2 border-slate-900 dark:border-slate-700 rounded-xl w-fit">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 focus:outline-hidden cursor-pointer transition-transform hover:scale-125"
                      >
                        <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-orange-500 hover:text-slate-950 text-white rounded-2xl py-3.5 text-xs font-black border-2 border-slate-900 dark:border-slate-700 cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:translate-y-0.5 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-orange-400" /> Save private spot 📝
                </button>
              </form>
            </div>

            {/* List existing personal places */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                  Danh Sách Quán Đã Lưu ({filteredLocalVenues.length})
                </h3>
                {searchTerm && (
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900 font-extrabold font-mono">
                    Đang tìm kiếm...
                  </span>
                )}
              </div>

              {/* personal favorite venues render cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredLocalVenues.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-slate-50/15 rounded-[28px] border-3 border-dashed border-slate-300 dark:border-slate-700">
                  <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-wide block">
                    Không tìm thấy quán đã lưu nào khớp!
                  </span>
                </div>
              ) : (
                filteredLocalVenues.map((v) => (
                  <div 
                    key={v.id} 
                    className="bg-slate-50/20 dark:bg-slate-850/50 border-3 border-slate-900 dark:border-slate-800 rounded-[24px] p-4 flex flex-col justify-between space-y-3 shadow-3xs hover:-translate-y-0.5 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">🍺 {v.name}</h4>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Share to Dzô Quán tủ Button */}
                          <button
                            onClick={() => handleShareToCommunity(v)}
                            disabled={sharingLoadingId === v.id}
                            className="bg-pink-100 hover:bg-pink-200 dark:bg-pink-950/40 dark:hover:bg-pink-905 p-1.5 rounded-lg border border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400 cursor-pointer transition-all flex items-center justify-center"
                            title="Chia sẻ lên Dzô Quán Tủ cộng đồng để bợm nhậu bốn phương cùng thưởng lãm và đánh giá!"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteVenue(v.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 cursor-pointer transition-all flex items-center justify-center bg-white dark:bg-slate-800"
                            title="Xóa địa điểm này khỏi hồ sơ cá nhân"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-start gap-1 line-clamp-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                        {v.address || 'Chưa định địa chỉ cụ thể'}
                      </p>

                      {v.notes && (
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 p-2.5 rounded-xl italic leading-relaxed">
                          &ldquo; {v.notes} &rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 text-[10px] font-black">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-slate-700 dark:text-slate-350">{v.rating ? v.rating.toFixed(1) : '5.0'} / 5.0</span>
                      </div>
                      <span className="text-orange-700 bg-orange-100 border border-orange-300 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-400 px-2.5 py-0.5 rounded-md">
                        {v.visitsCount} cuộc nhậu
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      )}

    </div>
  );
}
