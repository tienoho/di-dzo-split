import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  AlertCircle, 
  Check, 
  Sparkles, 
  RefreshCw, 
  FileImage, 
  Tv 
} from 'lucide-react';

interface ReceiptScannerProps {
  onScanComplete: (data: { venueName: string; totalAmount: number; note: string; imageBase64?: string }) => void;
  onClose: () => void;
}

export default function ReceiptScanner({ onScanComplete, onClose }: ReceiptScannerProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineWarning, setIsOfflineWarning] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'deepseek'>(() => (localStorage.getItem('receipt_ai_provider') as 'gemini' | 'deepseek') || 'gemini');

  // States for verification / editing after scan
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [scannedVenueName, setScannedVenueName] = useState<string>('');
  const [scannedTotalAmount, setScannedTotalAmount] = useState<number>(0);
  const [scannedNote, setScannedNote] = useState<string>('');
  const [scannedImageBase64, setScannedImageBase64] = useState<string>('');

  // Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      stopCamera(); // clean active first
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Could not launch camera: ', err);
      setCameraError('Không khởi động được camera. Vui lòng cấp quyền hoặc chuyển sang tải ảnh lên.');
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleModeChange = (newMode: 'upload' | 'camera') => {
    setMode(newMode);
    if (newMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Convert File to Base64 String
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Compress and downscale base64 image
  const compressImage = (dataUrl: string, maxWidth = 1000, maxHeight = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(dataUrl); // Return fallback original on err
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      
      // Local preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Drag & drop file handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setErrorMsg(null);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setErrorMsg('Vui lòng chỉ kéo thả tệp hình ảnh (.jpg, .png, etc)!');
      }
    }
  };

  // Live snapshot from Camera canvas
  const handleCaptureSnapshot = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setPreviewUrl(dataUrl);
          
          // Stop stream once taken
          stopCamera();
        }
      } catch (err) {
        console.error('Snapshot failed', err);
        setErrorMsg('Không thể chụp được khung hình. Hãy thử chọn thiết bị khác.');
      }
    }
  };

  // Trích xuất hóa đơn qua server-side endpoint
  const handleAnalyzeReceipt = async () => {
    if (!previewUrl) return;
    setScanning(true);
    setErrorMsg(null);
    setIsOfflineWarning(false);

    try {
      let base64Image = previewUrl;

      // If previewUrl is a objectURL from file input, obtain raw base64
      if (previewUrl.startsWith('blob:')) {
        if (selectedFile) {
          base64Image = await fileToBase64(selectedFile);
        } else {
          throw new Error('Không thể đọc dữ liệu tệp đính kèm.');
        }
      }

      // Proactively compress the image to be friendly layout size & payload limits
      if (base64Image.startsWith('data:')) {
        try {
          base64Image = await compressImage(base64Image);
        } catch (compressErr) {
          console.warn('Compression failed, using fallback:', compressErr);
        }
      }

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, provider: aiProvider })
      });

      const result = await response.json();

      if (result.success && result.data) {
        setIsOfflineWarning(!!result.isMock);
        setScannedVenueName(result.data.venueName || '');
        setScannedTotalAmount(result.data.totalAmount || 0);
        setScannedNote(result.data.note || 'Hóa đơn quét tự động');
        setScannedImageBase64(base64Image);
        setIsReviewMode(true);
      } else {
        throw new Error(result.error || 'Gemini không trích xuất được số tiền.');
      }
    } catch (err: any) {
      console.error('Scan request failed:', err);
      setErrorMsg(err.message || 'Hệ thống quét ảnh gặp lỗi hoặc mất tín hiệu kết nối.');
    } finally {
      setScanning(false);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setErrorMsg(null);
    setIsReviewMode(false);
    setScannedVenueName('');
    setScannedTotalAmount(0);
    setScannedNote('');
    setScannedImageBase64('');
    if (mode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-slate-950 border-b-4 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-bounce text-slate-900" />
            <div>
              <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                {isReviewMode ? "Xác Nhận Hóa Đơn AI 🧾" : "Quét Hóa Đơn AI 🤖"}
              </h3>
              <p className="text-[10px] font-bold text-orange-100">
                {isReviewMode ? "Kiểm tra và sửa đổi con số chính xác" : "Sử dụng camera / ảnh chụp của bạn"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 px-1.5 bg-slate-950/20 hover:bg-slate-950/40 rounded-full text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-400 p-3 rounded-2xl flex items-start gap-2 text-xs text-red-750 font-bold">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cameraError && (
            <div className="bg-amber-50 dark:bg-amber-950/25 border-2 border-amber-400 p-2.5 rounded-xl text-[11px] text-amber-800 dark:text-amber-350 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {isReviewMode ? (
            /* --- REVIEW MODE LAYOUT (SIDE-BY-SIDE / STACKED BENTO) --- */
            <div className="space-y-4 animate-scaleIn">
              {isOfflineWarning ? (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col gap-1 text-[11px] text-amber-900 font-bold">
                  <span className="flex items-center gap-1.5 text-xs text-amber-950 font-black">
                    ⚠️ Chế độ ngoại tuyến (Offline Backups)
                  </span>
                  <span>Máy chủ chưa liên kết API hoặc hết hạn mức. Hệ thống đã tự động điền nháp các thông số giả lập. Vui lòng đối chiếu với ảnh hóa đơn của bạn và chỉnh sửa chính xác số tổng tiền!</span>
                </div>
              ) : (
                <div className="p-3 bg-teal-50 border-2 border-teal-300 rounded-2xl flex flex-col gap-1 text-[11px] text-teal-900 font-bold">
                  <span className="flex items-center gap-1.5 text-xs text-teal-950 font-black">
                     Trích xuất dữ liệu hóa đơn thành công!
                  </span>
                  <span>Vui lòng kiểm tra lại số tiền một lần nữa nếu cần và xác nhận để điền trực tiếp vào hóa đơn.</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* original receipt photo preview */}
                <div className="border-2 border-slate-900 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 self-start">
                    Ảnh Biên Lai Bạn Đã Tải:
                  </span>
                  <div className="relative group max-h-[160px] overflow-hidden rounded-xl border border-slate-300 shadow-xs flex items-center justify-center p-1 bg-white">
                    <img 
                      src={scannedImageBase64} 
                      className="max-h-[150px] object-contain rounded-lg transition-transform hover:scale-130 cursor-zoom-in" 
                      referrerPolicy="no-referrer"
                      alt="Hóa đơn đã tải" 
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1.5 font-bold">💡 Di chuột / click giữ vào ảnh để nhìn rõ con chữ hơn</span>
                </div>

                {/* Form fields */}
                <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-900 rounded-2xl p-4">
                  {/* Venue Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tên Quán Nhậu / Địa Điểm:</label>
                    <input 
                      type="text" 
                      value={scannedVenueName}
                      onChange={(e) => setScannedVenueName(e.target.value)}
                      placeholder="Không tìm thấy tên quán trên hóa đơn (Nhập thủ công nếu muốn)"
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]" 
                    />
                  </div>

                  {/* Total Amount Input with high visibility */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tổng số tiền cần chia (VND):</label>
                      <span className="text-xs text-orange-600 font-extrabold px-1.5 py-0.5 bg-orange-50 rounded-lg border border-orange-200">
                        {(Number(scannedTotalAmount) || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <input 
                      type="number" 
                      value={scannedTotalAmount || ''}
                      onChange={(e) => setScannedTotalAmount(Number(e.target.value))}
                      placeholder="Nhập số tiền thực tế trên hóa đơn"
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]" 
                    />
                  </div>

                  {/* Note text field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Ghi chú tóm tắt món ăn:</label>
                    <textarea 
                      rows={2}
                      value={scannedNote}
                      onChange={(e) => setScannedNote(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]" 
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t-2 border-dashed border-slate-200 dark:border-slate-850">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 border-2 border-slate-900 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  ↺ CHỌN ẢNH KHÁC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onScanComplete({
                      venueName: scannedVenueName,
                      totalAmount: scannedTotalAmount,
                      note: scannedNote,
                      imageBase64: scannedImageBase64
                    });
                  }}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-white border-2 border-slate-900 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Check className="w-4 h-4" /> ĐỒNG Ý & SỬ DỤNG CO CO 🍻
                </button>
              </div>
            </div>
          ) : (
            /* --- STANDARD SELECTION MODE --- */
            <>
              {/* Tab buttons to toggle mode unless already captured */}
              {!previewUrl && (
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border-2 border-slate-900">
                  <button
                    type="button"
                    onClick={() => handleModeChange('upload')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      mode === 'upload' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Thư viện ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('camera')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      mode === 'camera' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Chụp ảnh bàn nhậu
                  </button>
                </div>
              )}

              {/* AI Engine Choice selector */}
              <div className="bg-orange-50/50 dark:bg-orange-950/20 p-3.5 rounded-2xl border-2 border-slate-900 space-y-2 shadow-inner">
                <span className="text-[10px] font-black text-orange-850 dark:text-orange-400 block uppercase tracking-wider">
                  🤖 ĐỘNG CƠ CÔNG NGHỆ AI TRÍCH XUẤT HÓA ĐƠN:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('gemini');
                      localStorage.setItem('receipt_ai_provider', 'gemini');
                    }}
                    className={`py-2 px-3 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      aiProvider === 'gemini'
                        ? 'bg-orange-500 text-slate-950 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    🚀 Gemini 3.5 Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('deepseek');
                      localStorage.setItem('receipt_ai_provider', 'deepseek');
                    }}
                    className={`py-2 px-3 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      aiProvider === 'deepseek'
                        ? 'bg-indigo-650 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    🧠 DeepSeek Hybrid
                  </button>
                </div>
                <p className="text-[9px] text-slate-450 dark:text-slate-405 font-bold leading-tight">
                  {aiProvider === 'gemini' 
                    ? "Sử dụng Gemini Vision để nhận diện hình ảnh trực tiếp nhanh nhất." 
                    : "Sử dụng Gemini trích xuất chữ thô kết hợp sức mạnh phân tích & tính toán toán học vượt trội của DeepSeek."}
                </p>
              </div>

              {/* PREVIEW CONTAINER OR VIEWFINDER */}
              <div className="bg-slate-50 dark:bg-slate-950 border-3 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-2 min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden">
                {previewUrl ? (
                  // Image Preview
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img 
                      src={previewUrl} 
                      alt="Receipt Preview" 
                      className="max-h-[300px] object-contain rounded-xl border border-slate-300 shadow-xs"
                    />
                    
                    {scanning && (
                      <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white space-y-3">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <div className="text-center space-y-1">
                          <span className="text-sm font-black text-orange-400 block animate-pulse">🤖 Đang xử lý bóc tách hóa đơn...</span>
                          <p className="text-[10px] text-slate-300">Đang quét tổng tiền và thông tin cửa hàng</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : mode === 'camera' ? (
                  // Live camera view
                  <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover scale-x-[-1]" 
                      playsInline
                    />
                    {!cameraActive && (
                      <div className="absolute text-center text-xs font-bold text-slate-400 space-y-3">
                        <Tv className="w-8 h-8 mx-auto animate-pulse" />
                        <span>Đang tải ống kính camera...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Upload Area Box with Drag & Drop or Click selector
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="text-center p-8 space-y-3 w-full cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-all"
                    onClick={() => document.getElementById('receipt-image-uploader')?.click()}
                  >
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/30 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                      <FileImage className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Kéo tệp ảnh vào đây hoặc nhấp chuột</span>
                      <p className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG, WEBP từ hóa đơn điện thoại hoặc máy ảnh</p>
                    </div>
                    <input 
                      id="receipt-image-uploader"
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* VIEW CONTROLS */}
              <div className="flex gap-3 justify-end">
                {previewUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      disabled={scanning}
                      className="px-4 py-2.5 border-2 border-slate-900 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer"
                    >
                      Chọn Lại Ảnh / Chụp Lại
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzeReceipt}
                      disabled={scanning}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 border-2 border-slate-900 shadow-md text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Bắt Đầu Quét AI
                    </button>
                  </>
                ) : (
                  mode === 'camera' && cameraActive && (
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="w-full bg-slate-900 text-white hover:bg-orange-500 border-2 border-slate-900 hover:text-slate-950 py-3.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Camera className="w-4 h-4" /> Bấm Chụp Ngay 📸
                    </button>
                  )
                )}
              </div>
            </>
          )}

        </div>

        {/* Info label and footer */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t-2 border-dashed border-slate-200 dark:border-slate-850 text-center text-[10px] text-slate-400">
          Tip: Đảm bảo góc chụp thẳng đứng, chữ rõ ràng và đủ ánh sáng để Gemini trích xuất tổng tiền chuẩn xác nhất!
        </div>
      </div>
    </div>
  );
}
