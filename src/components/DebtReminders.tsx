import React, { useState, useEffect } from 'react';
import { Debt, Bill } from '../types';
import { Bell, Copy, Check, MessageSquare, AlertCircle, Share2, DollarSign, CreditCard, Sparkles, CheckCheck, ExternalLink, QrCode, Smile, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebtRemindersProps {
  debts: Debt[];
  onMarkDebtAsPaid: (billId: string, debtorName: string) => void;
  activeCreatorName: string;
  currentUser?: any;
  contacts: Record<string, { phone?: string; messenger?: string }>;
  onSaveContact: (name: string, phone: string, messenger: string) => Promise<void>;
}

const STICKER_CATEGORIES = [
  {
    name: 'Cực Thân Thiện 🙏',
    items: ['🥺', '🙏', '😭', '💖', '🥰', '😍', '😘', '🥳', '😎', '😇', '❤️', '💕', '⭐', '✨', '🔥', '😻', '🤩', '🌸', '🎉']
  },
  {
    name: 'Độ Nhậu Bất Diệt 🍻',
    items: ['🍻', '🥂', '🍾', '🍺', '🍸', '🍷', '🍹', '🍗', '🍖', '🍤', '🍕', '🍟', '🍲', '🍢', '🍡', '🌮']
  },
  {
    name: 'Ting Ting Sòng Phẳng 💸',
    items: ['💸', '💰', '💳', '💵', '🪙', '🛎️', '💌', '📮', '⚡', '🚀', '🎯']
  },
  {
    name: 'ASCII Độc Lạ 💬',
    items: [
      '(づ｡◕‿‿◕｡)づ',
      '(🥺 o 🥺)✿',
      '┌( ಠ_ಠ)┘',
      '(づ￣ ³￣)づ',
      '＼(＾O＾)／',
      '(｡♥‿♥｡)',
      '(✿◠‿◠)',
      '٩(◕‿◕｡)۶',
      '(*^▽^*)'
    ]
  },
  {
    name: 'Năn Nỉ Ngọt Ngào 💬',
    items: [
      ' bạng iu ơi!',
      ' sòng phẳng cho thăng hoa nà!',
      ' đang tài chính cạn kiệt cứu đói dới! 😭',
      ' moah moah yêu thương ngập tràn!',
      ' chuyển khoản nhận ngay nghìn nụ hôn 💋',
      ' hôm nào làm cốc bia tiếp nha bạng hiền 🍺',
      ' tinh thần sòng phẳng muôn năm nha hihi!'
    ]
  }
];

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

export default function DebtReminders({ debts, onMarkDebtAsPaid, activeCreatorName, currentUser, contacts, onSaveContact }: DebtRemindersProps) {
  const defaultBank = 'mbbank';
  const defaultNo = '';
  const defaultAccountName = '';

  // Transfer Settings
  const [bankName, setBankName] = useState<string>(() => localStorage.getItem('nhau_bank_name') || defaultBank);
  const [bankNo, setBankNo] = useState<string>(() => localStorage.getItem('nhau_bank_no') || defaultNo);
  const [bankAccountName, setBankAccountName] = useState<string>(() => localStorage.getItem('nhau_bank_account_name') || defaultAccountName);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Periodic Browser Push Notification settings state
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => localStorage.getItem('nhau_push_enabled') !== 'false');
  const [pushInterval, setPushInterval] = useState<string>(() => localStorage.getItem('nhau_push_interval') || '24h');

  // FCM Real settings and client token status variables
  const [vapidKeyInput, setVapidKeyInput] = useState<string>(() => localStorage.getItem('nhau_fcm_vapid_key') || ((import.meta as any).env?.VITE_FCM_VAPID_KEY as string | undefined) || '');
  const [localFcmToken, setLocalFcmToken] = useState<string>(() => localStorage.getItem('nhau_my_fcm_token') || '');

  // Keep FCM settings synced with localStorage (handles dynamic auto-binding)
  useEffect(() => {
    const handleStorageChange = () => {
      setVapidKeyInput(localStorage.getItem('nhau_fcm_vapid_key') || '');
      setLocalFcmToken(localStorage.getItem('nhau_my_fcm_token') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    const intervalId = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // Custom modal-based confirmation dialog to bypass sandbox iframe bugs
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

  const handleTogglePush = (val: boolean) => {
    setPushEnabled(val);
    localStorage.setItem('nhau_push_enabled', String(val));
    window.dispatchEvent(new Event('storage')); // Trigger immediate sync
  };

  const handleIntervalChange = (val: string) => {
    setPushInterval(val);
    localStorage.setItem('nhau_push_interval', val);
    window.dispatchEvent(new Event('storage')); // Trigger immediate sync
  };

  const handleRequestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          alert("🎉 Cấp quyền thành công! Thông báo nhắc nợ sòng phẳng đã sẵn sàng phục vụ bạn khi cuộc vui trễ hạn quá 24h.");
        } else {
          alert("⚠️ Quyền thông báo bị thiết bị từ chối. Vui lòng kiểm tra và bật thủ công trong cài đặt trang web của trình duyệt.");
        }
      });
    } else {
      alert("❌ Trình duyệt hiện tại của bạn không hỗ trợ cơ chế Notification API.");
    }
  };

  const handleTestFCMRegister = async () => {
    if (!('Notification' in window)) {
      alert("Trình duyệt không hỗ trợ push notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("⚠️ Thiết bị chưa được cấp quyền thông báo. Vui lòng nhấp nút 'Cấp quyền thông báo đẩy' ở trên trước!");
      return;
    }

    try {
      const { getFirebaseMessaging, saveFCMTokenToCloud } = await import('../lib/firebase');
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        alert("⚠️ Trình duyệt/ngữ cảnh này không hỗ trợ Firebase Messaging (FCM). Hãy đảm bảo bạn đang mở rộng ứng dụng trên tab riêng và kết nối HTTPS.");
        return;
      }

      const vapidKey = vapidKeyInput.trim() || undefined;
      const { getToken } = await import('firebase/messaging');
      
      let token = '';
      try {
        if (vapidKey) {
          token = await getToken(messaging, { vapidKey });
        } else {
          token = await getToken(messaging);
        }
      } catch (err: any) {
        alert(`⚠️ Không tạo được Token FCM: ${err.message || err}\n\nLƯU Ý: Web Push yêu cầu VAPID Key của riêng dự án Firebase. Hãy tạo và dán khóa Public Key từ mục Cloud Messaging trong console của bạn.`);
        return;
      }

      if (token) {
        setLocalFcmToken(token);
        localStorage.setItem('nhau_my_fcm_token', token);
        if (activeCreatorName) {
          await saveFCMTokenToCloud(activeCreatorName, token);
          alert(`🎉 ĐĂNG KÝ FCM THÀNH CÔNG!\n\nThiết bị đã được liên kết với tên "${activeCreatorName}". Bất kỳ ai click Nhắc Đẩy sẽ gửi tin nhắn PUSH trực tiếp về máy bạn!`);
        } else {
          alert(`🎉 Đã tạo token thành công! Bạn hãy đặt tên ở thanh trên để lưu liên kết đám mây.`);
        }
      }
    } catch (e: any) {
      alert(`Lỗi đăng ký FCM: ${e.message || e}`);
    }
  };

  const handleSelfTestFCMNotification = async () => {
    if (!localFcmToken) {
      alert("Chưa có Token đăng ký.");
      return;
    }
    try {
      const response = await fetch('/api/send-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: [localFcmToken],
          title: "Bia ơi dứt khoát! 🍻",
          body: "Tính năng thông báo đẩy FCM thực tế hoạt động trơn tru 100%!"
        })
      });
      const data = await response.json();
      if (data.success) {
        if (data.isSimulated) {
          alert("🎉 ĐÃ MÔ PHỎNG: Ứng dụng chạy trên môi trường Sandbox cục bộ. Tin nhắn được máy chủ Firebase mô phỏng ghi nhận thành công!");
        } else {
          alert("🚀 THÀNH CÔNG: Thông báo đẩy FCM Real-Time đã được bắn trực tiếp về thiết bị của bạn!");
        }
      } else {
        alert(`Lỗi khi yêu cầu server gửi: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối API gửi push: ${err.message || err}`);
    }
  };

  // Active modal / Panel expansion
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Message customization & stickers template states
  const [customMessage, setCustomMessage] = useState<string>('');
  const [activeStyle, setActiveStyle] = useState<'friendly' | 'funny' | 'formal'>('friendly');
  const [activeStickerTab, setActiveStickerTab] = useState<number>(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Sync custom message with context or styles
  React.useEffect(() => {
    if (selectedDebt) {
      setCustomMessage(getReminderMessage(selectedDebt, activeStyle));
    } else {
      setCustomMessage('');
    }
  }, [selectedDebt?.id, activeStyle, bankName, bankNo, bankAccountName]);

  const handleInsertSticker = (sticker: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomMessage(prev => prev + sticker);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setCustomMessage(before + sticker + after);
    
    // Focus back and position cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + sticker.length, start + sticker.length);
    }, 50);
  };

  // Virtual Push Notification States
  const [pushNotificationText, setPushNotificationText] = useState<string | null>(null);

  const handleOpenZalo = (text: string, debt: Debt) => {
    if (!bankNo || !bankAccountName) {
      alert("⚠️ Vui lòng cấu hình Số tài khoản & Tên thụ hưởng của bạn trước khi gửi đòi nợ!");
      return;
    }
    // Copy text first so it's ready in clipboard
    navigator.clipboard.writeText(text);
    setCopiedNotification(`zalo-${debt.id}`);
    setTimeout(() => setCopiedNotification(null), 2500);

    const contactPhone = contacts[debt.debtorName]?.phone;
    if (contactPhone) {
      const cleaned = contactPhone.replace(/\D/g, '');
      const zaloUrl = `https://zalo.me/${cleaned}`;
      window.open(zaloUrl, '_blank', 'noopener,noreferrer');
      setPushNotificationText(`📬 Gửi Zalo: Đã COPY lời nhắc và mở khung chat Zalo trực tiếp với ${debt.debtorName} (${contactPhone})!`);
    } else {
      window.open('https://zalo.me/', '_blank', 'noopener,noreferrer');
      setPushNotificationText(`📬 Gửi Zalo: Đã COPY lời nhắc! Hãy dán (Ctrl+V) vào ô chat với ${debt.debtorName} trên Zalo.`);
    }
  };

  const handleOpenMessenger = (text: string, debt: Debt) => {
    if (!bankNo || !bankAccountName) {
      alert("⚠️ Vui lòng cấu hình Số tài khoản & Tên thụ hưởng của bạn trước khi gửi đòi nợ!");
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedNotification(`messenger-${debt.id}`);
    setTimeout(() => setCopiedNotification(null), 2500);

    const contactMessenger = contacts[debt.debtorName]?.messenger;
    if (contactMessenger) {
      const cleaned = contactMessenger.trim();
      const messengerUrl = `https://m.me/${cleaned}`;
      window.open(messengerUrl, '_blank', 'noopener,noreferrer');
      setPushNotificationText(`📬 Gửi Messenger: Đã COPY lời nhắc và mở Messenger chat trực tiếp với ${debt.debtorName} (${cleaned})!`);
    } else {
      window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer');
      setPushNotificationText(`📬 Gửi Messenger: Đã COPY lời nhắc! Hãy dán (Ctrl+V) vào ô chat với Messenger.`);
    }
  };

  const saveBankSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nhau_bank_name', bankName);
    localStorage.setItem('nhau_bank_no', bankNo);
    localStorage.setItem('nhau_bank_account_name', bankAccountName);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Trigger actual cloud or simulated mobile deep push notice
  const handleTriggerVirtualPush = async (debt: Debt) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    setPushNotificationText(`⏳ Đang tìm kiếm thiết bị của chiến hữu ${debt.debtorName} trên đám mây...`);

    try {
      const { getFCMTokensByUserName } = await import('../lib/firebase');
      const tokens = await getFCMTokensByUserName(debt.debtorName);

      if (tokens && tokens.length > 0) {
        const title = `⚠️ Nhắc Nợ: Cuộc Vui "${debt.venueName}"`;
        const body = `Chiến hữu ${activeCreatorName || 'Cầm Quỹ'} nhắc bạn thanh toán ${debt.amount.toLocaleString('vi-VN')}đ tiền nhậu còn thiếu. Click để thanh toán!`;

        const response = await fetch('/api/send-fcm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens,
            title,
            body,
            data: {
              billId: debt.billId,
              debtId: debt.id,
              type: 'debt_reminder'
            }
          })
        });

        const data = await response.json();
        if (data.success) {
          if (data.isSimulated) {
            setPushNotificationText(`📬 CHẾ ĐỘ GIẢ LẬP: Máy chủ đã ghi nợ tới ${debt.debtorName} (Tìm thấy ${tokens.length} thiết bị).`);
          } else {
            setPushNotificationText(`🚀 HOÀN THÀNH: Đã bắn 1 thông báo đẩy REAL-TIME cực dứt khoát tới ${tokens.length} thiết bị của chiến hữu ${debt.debtorName}!`);
          }
        } else {
          setPushNotificationText(`❌ Gửi PUSH lỗi trên server: ${data.error}`);
        }
      } else {
        setPushNotificationText(`📢 Thiết bị của ${debt.debtorName} chưa đăng ký PUSH. Nhắc đối phương bấm "Cấp quyền thông báo đẩy" ở cài đặt bên phải.`);
      }
    } catch (err: any) {
      console.error(err);
      setPushNotificationText(`❌ Không thể kết nối quét thiết bị: ${err.message || err}`);
    }

    setTimeout(() => {
      setPushNotificationText(null);
    }, 8500);
  };

  // Generate payment reminder messages
  const getReminderMessage = (debt: Debt, style: 'friendly' | 'formal' | 'funny') => {
    const dObj = new Date(debt.billDate);
    const friendlyDate = `${dObj.getDate()}/${dObj.getMonth() + 1}`;
    const amountStr = `${debt.amount.toLocaleString('vi-VN')}đ`;
    
    const formattedAmount = Math.round(debt.amount);
    const paymentMemo = `${debt.debtorName.replace(/\s+/g, '')} guitennhau ${debt.venueName.substring(0, 5).replace(/\s+/g, '')}`;
    const mappedBankCode = bankCodeMap[bankName] || bankName;
    const vietQrUrl = `https://img.vietqr.io/image/${mappedBankCode}-${bankNo}-compact2.png?amount=${formattedAmount}&addInfo=${encodeURIComponent(paymentMemo)}&accountName=${encodeURIComponent(bankAccountName)}`;

    if (style === 'friendly') {
      return `Alo ${debt.debtorName} yêu dấu ơi! Bữa nhậu bên ${debt.venueName} (${friendlyDate}) của anh em mình chia ra phần của bạng hết ${amountStr} nha.

Bạn quét mã VietQR để thanh toán cực nhanh dới:
🔗 Link thanh toán VietQR: ${vietQrUrl}

Hoặc ck truyền thống:
🏦 Ngân hàng: ${mappedBankCode.toUpperCase()}
💳 Số TK: ${bankNo}
👤 Chủ TK: ${bankAccountName.toUpperCase()}
📝 Nội dung: ${paymentMemo}

Cảm ơn bạng hiền cực kì nha! 🍻✨`;
    }
    
    if (style === 'funny') {
      return `⚠️ THƯ CẢNH BÁO NỢ CUỘC NHẬU ⚠️
Kính gửi chiến hữu ${debt.debtorName}, bộ phận tài chính quán báo bạn vẫn còn khoản đóng góp ${amountStr} cho độ ẩm ngày ${friendlyDate} ở quán ${debt.venueName}.

Nếu không chuyển khoản sớm, hình ảnh lúc "lên đỉnh đồi gục ngã" của bạn sẽ được phát tán khắp các nhóm chat! 😂

Quét mã VietQR chuyển khoản cứu vớt danh dự cực nhanh tại đây:
🔗 Link thanh toán VietQR: ${vietQrUrl}

Thông tin "vỡ nợ":
🏦 Ngân hàng: ${mappedBankCode.toUpperCase()}
💳 Số TK: ${bankNo}
👤 Tên tài khoản: ${bankAccountName.toUpperCase()}
📝 Nội dung: ${paymentMemo}`;
    }

    // Formal/standard
    return `Xin chào ${debt.debtorName}, mình gửi thông tin thanh toán tiền share hóa đơn ăn uống ngày ${friendlyDate} tại ${debt.venueName}.
Số tiền cần chuyển: ${amountStr}.

Đường dẫn thanh toán nhanh qua VietQR (tự động số tiền và nội dung):
🔗 Link thanh toán VietQR: ${vietQrUrl}

Thông tin tài khoản nhận chuyển khoản:
Ngân hàng: ${mappedBankCode.toUpperCase()}
Số tài khoản: ${bankNo}
Tên người nhận: ${bankAccountName}
Nội dung chuyển khoản: ${paymentMemo}

Xin chân thành cảm ơn!`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(type);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const shareViaWeb = (text: string, debt: Debt) => {
    if (!bankNo || !bankAccountName) {
      alert("⚠️ Vui lòng cấu hình Số tài khoản & Tên thụ hưởng của bạn trước khi chia sẻ!");
      return;
    }
    if (navigator.share) {
      navigator.share({
        title: 'Nhắc tiền nhậu nhẹt',
        text: text,
      }).catch(err => console.log(err));
    } else {
      // Fallback: Copy to clipboard and alert
      copyToClipboard(text, 'share');
      alert("Thiết bị của bạn không hỗ trợ Web Share API. Tin nhắn nhắc nợ đã được SAO CHÉP tự động vào bộ nhớ tạm để bạn tự dán gửi Zalo/Messenger!");
    }
  };

  return (
    <div className="space-y-6" id="debt-reminders-section">
      {/* VIRTUAL MOBILE PUSH NOTIFICATION INDICATORS */}
      {pushNotificationText && (
        <div id="virtual-push-banner" className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border-4 border-slate-900 z-50 flex items-start space-x-3 animate-slideIn">
          <div className="bg-orange-500 p-2.5 rounded-xl text-white self-center">
            <Bell className="w-5 h-5 animate-swing" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black tracking-widest text-orange-400 uppercase">THÔNG BÁO TỨ THÌ 📬</h4>
            <p className="text-[11px] text-slate-200 font-extrabold leading-relaxed">{pushNotificationText}</p>
          </div>
          <button 
            onClick={() => setPushNotificationText(null)}
            className="text-slate-400 hover:text-white text-xs font-black"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Banking profile Setup */}
        <div className="lg:col-span-4 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 h-fit space-y-5">
          <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-6 bg-teal-400 rounded-full inline-block"></span>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <CreditCard className="w-5 h-5 text-teal-500" />
                Thụ Hưởng Của Bạn
              </h2>
            </div>
            <p className="text-[11px] font-bold text-slate-500">Nhập đúng STK để app tự tải mã QR và mẫu điền tin nhắn đòi tiền cực nhạy!</p>
          </div>

          <form onSubmit={saveBankSettings} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">Ngân hàng thụ hưởng</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs font-black bg-yellow-50/30 border-2 border-slate-900 focus:border-orange-500 rounded-xl p-3 text-slate-800"
              >
                <option value="mbbank">MB Bank (Quân Đội)</option>
                <option value="vcb">Vietcombank (VCB)</option>
                <option value="tcb">Techcombank</option>
                <option value="acb">ACB (Á Châu)</option>
                <option value="bidv">BIDV</option>
                <option value="vietinbank">Vietinbank</option>
                <option value="vpb">VPBank</option>
                <option value="tpbank">TPBank</option>
                <option value="vib">VIB</option>
                <option value="hdbank">HDBank</option>
                <option value="sacombank">Sacombank</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">Số Tài Khoản (STK) <span className="text-orange-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Nhập số tài khoản..."
                value={bankNo}
                onChange={(e) => setBankNo(e.target.value)}
                className="w-full text-xs bg-yellow-50/30 border-2 border-slate-900 p-3 rounded-xl font-mono text-slate-900 font-extrabold focus:border-orange-500 outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">Tên Chủ Thẻ (VIẾT HOA KHÔNG DẤU) <span className="text-orange-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Ví dụ: NGUYEN VAN TUAN ANH"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                className="w-full text-xs bg-yellow-50/30 border-2 border-slate-900 p-3 rounded-xl text-slate-900 font-black focus:border-orange-500 outline-hidden"
              />
            </div>

            {settingsSaved && (
              <p className="text-[11px] text-teal-800 bg-teal-100 border-2 border-slate-900 p-2.5 rounded-xl text-center font-black">
                ✓ Thiết lập ví thụ hưởng đã được lưu!
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-orange-500 text-white hover:text-slate-900 rounded-2xl py-3 text-xs font-black border-2 border-slate-900 hover:-translate-y-0.5 shadow-sm transition-all cursor-pointer"
            >
              Cập Nhật Thẻ Chuyển Khoản
            </button>
          </form>

          {/* Automatic Reminder Setup Card */}
          <div className="bg-orange-50/40 border-2 border-slate-900 rounded-[24px] p-4.5 space-y-3.5 mt-4">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse animate-spin" />
              Nhắc Nợ Trình Duyệt Tự Động
            </h3>
            <p className="text-[10px] text-slate-500 font-extrabold leading-relaxed">
              Trình duyệt sẽ tự động phát thông báo đẩy (Push Notification) định kỳ khi có cuộc vui trễ hạn quá 24h chưa được thanh toán dứt điểm.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => handleTogglePush(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 border-slate-900 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-800">Bật nhắc nợ tự động đẩy</span>
              </label>

              {pushEnabled && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-550 block uppercase tracking-wide">Chu kỳ nhắc lặp lại</label>
                  <select
                    value={pushInterval}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    className="w-full text-xs font-black bg-white border-2 border-slate-900 rounded-xl p-2.5 text-slate-800 cursor-pointer"
                  >
                    <option value="24h">Lặp lại mỗi 24 giờ (Tiêu chuẩn)</option>
                    <option value="12h">Lặp lại mỗi 12 giờ</option>
                    <option value="1h">Lặp lại mỗi 1 giờ</option>
                    <option value="5m">Lặp lại mỗi 5 phút</option>
                    <option value="1m">Lặp lại mỗi 1 phút (⚡ Thử nghiệm ngay)</option>
                  </select>
                </div>
              )}

              {/* Browser Permission Request button */}
              <button
                type="button"
                onClick={handleRequestPermission}
                className="w-full bg-slate-100 hover:bg-orange-104/10 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-black py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-orange-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-orange-500" />
                <span>Cấp quyền thông báo đẩy</span>
              </button>

              {/* FCM Advanced VAPID settings */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <QrCode className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span>Cấu hình VAPID Key (FCM Đám Mây)</span>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                  Dán khóa <b>Public Key (VAPID)</b> lấy từ <i>Firebase Console &gt; Project Settings &gt; Cloud Messaging &gt; Web Configuration</i> để liên kết thiết bị đòi nợ thực tế:
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nhập VAPID Public key từ Firebase..."
                    value={vapidKeyInput}
                    onChange={(e) => {
                      setVapidKeyInput(e.target.value);
                      localStorage.setItem('nhau_fcm_vapid_key', e.target.value);
                    }}
                    className="flex-1 text-[10px] font-mono border border-slate-350 dark:border-slate-700 p-2 rounded-lg outline-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestFCMRegister}
                    className="bg-orange-500 hover:bg-orange-600 text-slate-950 text-[10px] font-black px-3 rounded-lg border border-slate-950 transition-all flex-shrink-0 cursor-pointer shadow-xs"
                  >
                    Liên Kết PUSH
                  </button>
                </div>
                {localFcmToken && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-900 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-black text-teal-700 dark:text-emerald-400">
                      <CheckCheck className="w-4 h-4 text-teal-500" />
                      <span>Thiết bị của bạn đã liên kết Cloud!</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {activeCreatorName ? `Tên nhận tin: ${activeCreatorName}` : "Chưa xác minh tên"}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${currentUser ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                        {currentUser ? 'Đã đăng nhập (Auth)' : 'Khách chơi (Guest)'}
                      </span>
                    </div>

                    <p className="text-[8px] font-mono whitespace-nowrap overflow-hidden text-slate-500 dark:text-slate-400 overflow-ellipsis">
                      Token: {localFcmToken}
                    </p>
                    <button
                      type="button"
                      onClick={handleSelfTestFCMNotification}
                      className="text-[9.5px] font-black text-teal-600 dark:text-teal-400 hover:text-teal-800 flex items-center gap-1 cursor-pointer bg-teal-100/40 dark:bg-teal-950/50 p-1 px-2 rounded-md transition-all self-start border border-teal-200 dark:border-teal-900"
                    >
                      <span>⚡ Test bấm phát PUSH về máy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Outstanding Balances List */}
        <div className="lg:col-span-8 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-6">
          
          {(!bankNo || !bankAccountName) && (
            <div className="bg-orange-50 border-4 border-orange-500 rounded-[28px] p-5 flex items-start gap-3.5 shadow-sm">
              <span className="text-2xl animate-pulse">⚠️</span>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide">Bạn Chưa Thiết Lập Tài Khoản Thụ Hưởng!</h3>
                <p className="text-xs font-bold text-orange-900 leading-relaxed">
                  Vui lòng bổ sung Ngân hàng, Số tài khoản (STK) và Tên thụ hưởng ở cột cài đặt bên trái để hệ thống tự động sinh mã thanh toán VietQR và nội dung chuyển khoản đòi nợ chuẩn xác.
                </p>
              </div>
            </div>
          )}
          
          {/* CATEGORY 1: USER'S PERSONAL OUTSTANDING DEBTS */}
          {(() => {
            const myDebts = debts.filter(d => d.debtorName.toLowerCase().trim() === activeCreatorName.toLowerCase().trim() && !d.isPaid);
            if (myDebts.length === 0) return null;
            return (
              <div className="bg-red-50 border-4 border-red-500 rounded-[28px] p-5 space-y-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚨</span>
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-wide">Bạn Có {myDebts.length} Khoản Nợ Chưa Trả!</h3>
                </div>
                <p className="text-xs font-bold text-red-700 leading-relaxed">Bộ máy nhắc nợ nhận diện bạn còn các hóa đơn chưa đóng sòng phẳng. Hãy chuyển khoản cho anh chủ bàn sớm nhé bạng hiền!</p>
                
                <div className="space-y-3">
                  {myDebts.map(debt => (
                    <div key={debt.id} className="bg-white border-2 border-red-500 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-xs font-black text-slate-900">💸 Bạn còn nợ {debt.creditorName}</span>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5 mt-1">Tại cuộc nhậu {debt.venueName} • {new Date(debt.billDate).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        <span className="text-xs font-black text-red-600 bg-red-105 bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl">
                          {debt.amount.toLocaleString('vi-VN')} đ
                        </span>
                        <button
                          onClick={() => {
                            triggerConfirm(
                              `Bạn đã chuyển khoản trả nợ thành công ${debt.amount.toLocaleString('vi-VN')}đ cho ${debt.creditorName} rồi đúng không?`,
                              () => onMarkDebtAsPaid(debt.billId, debt.debtorName),
                              "Xác nhận chuyển khoản"
                            );
                          }}
                          className="bg-red-500 hover:bg-emerald-500 text-white font-black text-[10px] px-3.5 py-2 rounded-xl border-2 border-slate-900 hover:text-white transition-colors cursor-pointer shadow-sm animate-pulse"
                        >
                          Đã CK Trả Xong
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* CATEGORY 2: DEBTS DEBTORS OWE THE USER */}
          {(() => {
            const otherDebts = debts.filter(d => d.debtorName.toLowerCase().trim() !== activeCreatorName.toLowerCase().trim());
            const sortedOtherDebts = [...otherDebts].sort((a, b) => {
              if (a.isPaid && !b.isPaid) return 1;
              if (!a.isPaid && b.isPaid) return -1;
              return 0;
            });

            return (
              <div className="space-y-4">
                <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-6 bg-orange-500 rounded-full inline-block"></span>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 flex flex-wrap items-center gap-2 tracking-tight">
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                      Chiến Hữu Của Bạn ({otherDebts.filter(d => !d.isPaid).length} Chưa Trả • {otherDebts.filter(d => d.isPaid).length} Đã Trả)
                    </h2>
                  </div>
                  <p className="text-xs font-bold text-slate-500">Danh sách các đồng chí nợ tiền từ độ nhậu. Thiết lập SĐT hoặc Facebook để mở chat đòi trực tiếp bằng Zalo/Messenger cực nhạy!</p>
                </div>

                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                  {sortedOtherDebts.length === 0 ? (
                    <div className="text-center py-16 bg-yellow-50/20 rounded-[28px] border-3 border-dashed border-slate-300">
                      <CheckCheck className="w-14 h-14 text-orange-500 mx-auto mb-3" />
                      <span className="text-xs text-slate-600 font-black block uppercase tracking-wide">Không Có Ai Nợ Bạn Cả! Tuyệt Vời!</span>
                      <span className="text-[11px] text-slate-400 font-extrabold mt-1 block">Mọi cuộc vui sòng phẳng, tinh thần đồng đội cực cao.</span>
                    </div>
                  ) : (
                    sortedOtherDebts.map((debt) => {
                      const isSelected = selectedDebt?.id === debt.id;
                      
                      const mappedBankCode = bankCodeMap[bankName] || bankName;
                      // Bank QR generator link from VietQR
                      const formattedAmount = Math.round(debt.amount);
                      const paymentMemo = `${debt.debtorName.replace(/\s+/g, '')} guitennhau ${debt.venueName.substring(0, 5).replace(/\s+/g, '')}`;
                      const vietQrUrl = `https://img.vietqr.io/image/${mappedBankCode}-${bankNo}-compact2.png?amount=${formattedAmount}&addInfo=${encodeURIComponent(paymentMemo)}&accountName=${encodeURIComponent(bankAccountName)}`;

                      return (
                        <div 
                          key={debt.id} 
                          className={`border-3 rounded-[24px] p-4.5 space-y-4 transition-all ${
                            debt.isPaid 
                              ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5 opacity-80' 
                              : `border-slate-900 ${isSelected ? 'bg-orange-50/30' : 'bg-yellow-50/15'}`
                          }`}
                        >
                          {/* Header profile row */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-sm font-black ${debt.isPaid ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-slate-550'}`}>👤 {debt.debtorName}</span>
                                {debt.isPaid ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Đã Trả Xong
                                  </span>
                                ) : (
                                  <span className="text-[11px] bg-orange-100 text-orange-600 border-2 border-orange-200 px-2.5 py-0.5 rounded-full font-black">
                                    {debt.amount.toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-slate-400 mt-1">
                                Sản phẩm tại <strong className="text-slate-705 text-slate-700">{debt.venueName}</strong> • {new Date(debt.billDate).toLocaleDateString('vi-VN')}
                              </p>
                              {/* Display filled contact indications */}
                              <div className="flex items-center gap-2 mt-1">
                                {contacts[debt.debtorName]?.phone && (
                                  <span className="text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                                    💬 Zalo: {contacts[debt.debtorName]?.phone}
                                  </span>
                                )}
                                {contacts[debt.debtorName]?.messenger && (
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                                    🔵 Messenger: {contacts[debt.debtorName]?.messenger}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                              {debt.isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerConfirm(
                                      `Hủy ghi nhận "Đã trả" của ${debt.debtorName} cho cuộc nhậu này?`,
                                      () => onMarkDebtAsPaid(debt.billId, debt.debtorName),
                                      "Báo chưa thanh toán"
                                    );
                                  }}
                                  className="bg-slate-200 hover:bg-rose-100 border-2 border-slate-900 text-slate-700 hover:text-rose-700 text-[10px] font-black px-3 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto text-center font-mono"
                                  title="Đặt lại thành chưa thanh toán"
                                >
                                  ↩️ Báo Chưa Trả
                                </button>
                              ) : (
                                <>
                                  {/* Mark paid */}
                                  <button
                                    onClick={() => {
                                      triggerConfirm(
                                        `Bạn xác nhận chiến hữu ${debt.debtorName} đã chuyển khoản thanh toán đủ ${debt.amount.toLocaleString('vi-VN')}đ chứ?`,
                                        () => onMarkDebtAsPaid(debt.billId, debt.debtorName),
                                        "Xác nhận Trả Xong"
                                      );
                                    }}
                                    className="bg-[#22c55e] hover:bg-[#16a34a] border-2 border-slate-900 text-white text-[10px] font-black px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto text-center"
                                  >
                                    <Check className="w-3.5 h-3.5 shrink-0" /> Trả Xong
                                  </button>

                                  {/* Quick Copier with VietQR */}
                                  <button
                                    onClick={() => {
                                      if (!bankNo || !bankAccountName) {
                                        alert("⚠️ Vui lòng cấu hình Số tài khoản & Tên thụ hưởng của bạn trước khi sao chép!");
                                        return;
                                      }
                                      const text = getReminderMessage(debt, 'friendly');
                                      copyToClipboard(text, `quick-copy-${debt.id}`);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-black px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto text-center"
                                    title="Sao chép nhanh lời nhắc nợ kèm mã QR sòng phẳng vào bộ nhớ tạm"
                                  >
                                    {copiedNotification === `quick-copy-${debt.id}` ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                        <span className="truncate">Đã copy!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Share2 className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                                        <span className="truncate">Copy Lời Nhắc</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Trigger virtual push notice */}
                                  <button
                                    onClick={() => handleTriggerVirtualPush(debt)}
                                    className="bg-amber-400 hover:bg-amber-500 border-2 border-slate-900 text-slate-900 text-[10px] font-black px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto text-center"
                                    title="Gửi thông báo đẩy giả lập đến điện thoại đối phương"
                                  >
                                    <Bell className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Nhắc Đẩy (Push)</span>
                                  </button>

                                  {/* Open customized message templates panel */}
                                  <button
                                    onClick={() => setSelectedDebt(isSelected ? null : debt)}
                                    className="bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-black px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto text-center"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-orange-400 shrink-0" /> <span className="truncate">Đòi Zalo / FB</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Account & VietQR Link banner */}
                          {!debt.isPaid && (
                            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-5xs text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-1 rounded-md animate-pulse">STK Thụ hưởng</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                  {mappedBankCode.toUpperCase()}:
                                </span>
                                <button
                                  onClick={() => {
                                    copyToClipboard(bankNo, `stk-${debt.id}`);
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-900 dark:border-slate-700 hover:border-amber-500 rounded-lg font-mono font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 transition-all cursor-pointer text-xs"
                                  title="Nhấp dứt khoát để SAO CHÉP số tài khoản này!"
                                >
                                  <span>{bankNo}</span>
                                  {copiedNotification === `stk-${debt.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-slate-450 text-slate-400 hover:text-slate-850 dark:hover:text-white" />
                                  )}
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                {/* Open QR Link */}
                                <a
                                  href={vietQrUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10.5px] uppercase border-2 border-slate-900 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all text-center"
                                  title="Nhấp để MỞ trang ảnh mã QR kèm số tiền đã pre-fill"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Mở VietQR</span>
                                </a>
                                
                                {/* Copy Link to clipboard */}
                                <button
                                  onClick={() => {
                                    copyToClipboard(vietQrUrl, `link-${debt.id}`);
                                  }}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-150 font-extrabold text-[10.5px] border-2 border-slate-900 dark:border-slate-705 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-5xs"
                                  title="Sao chép đường dẫn ảnh mã QR này để gửi nhanh khắp nơi!"
                                >
                                  {copiedNotification === `link-${debt.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Đã sao chép!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Copy Link QR</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Expandable template texts & QR code area */}
                          {isSelected && (
                            <div className="pt-4 border-t-3 border-dashed border-slate-900 grid grid-cols-1 md:grid-cols-12 gap-4.5 animate-slideIn">
                              
                              {/* CONTACT CONFIGURATION ROW */}
                              <div className="col-span-12 bg-white/80 dark:bg-slate-900/45 border-2 border-slate-900 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-5xs">
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <span className="text-xl">⚙️</span>
                                  <div>
                                    <h5 className="text-[11px] font-black text-slate-850">Liên kết nhanh</h5>
                                    <p className="text-[9px] text-slate-500 font-bold">Lưu thông tin liên hệ giúp nhảy thẳng tới ứng dụng nhắn tin đòi nợ!</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto">
                                  <input
                                    type="text"
                                    placeholder="SĐT Zalo (09...)"
                                    value={contacts[debt.debtorName]?.phone || ''}
                                    onChange={(e) => onSaveContact(debt.debtorName, e.target.value, contacts[debt.debtorName]?.messenger || '')}
                                    className="text-[10px] font-black bg-white border-2 border-slate-900 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-hidden w-full sm:w-36 text-slate-950 text-center sm:text-left shadow-2xs"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Messenger User"
                                    value={contacts[debt.debtorName]?.messenger || ''}
                                    onChange={(e) => onSaveContact(debt.debtorName, contacts[debt.debtorName]?.phone || '', e.target.value)}
                                    className="text-[10px] font-black bg-white border-2 border-slate-900 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-hidden w-full sm:w-36 text-slate-950 text-center sm:text-left shadow-2xs"
                                  />
                                </div>
                              </div>

                              {/* Text Message Templates Column */}
                              <div className="md:col-span-8 space-y-3.5">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">💬 PHÒNG SOẠN TIN ĐÒI NỢ THÂN THIỆN</span>
                                 
                                 <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-2 border-slate-900 rounded-2xl space-y-3 shadow-5xs">
                                   
                                   {/* Style Selector Tabs */}
                                   <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl border-2 border-slate-900 gap-1">
                                     {[
                                       { id: 'friendly', label: '🥺 Ngọt ngào' },
                                       { id: 'funny', label: '🤪 Hài hước' },
                                       { id: 'formal', label: '💼 Lịch sự' }
                                     ].map((styleOption) => (
                                       <button
                                         key={styleOption.id}
                                         type="button"
                                         onClick={() => setActiveStyle(styleOption.id as any)}
                                         className={`flex-1 text-center py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                           activeStyle === styleOption.id
                                             ? 'bg-orange-500 text-white border-2 border-slate-900 shadow-3xs'
                                             : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                                         }`}
                                       >
                                         {styleOption.label}
                                       </button>
                                     ))}
                                   </div>

                                   {/* Textarea Editor */}
                                   <div className="relative">
                                     <textarea
                                       ref={textareaRef}
                                       value={customMessage}
                                       onChange={(e) => setCustomMessage(e.target.value)}
                                       className="w-full text-xs font-extrabold p-3 bg-white dark:bg-slate-950 border-2 border-slate-900 rounded-xl focus:border-orange-500 outline-hidden h-36 resize-y font-sans text-slate-800 dark:text-slate-100 pr-10 shadow-inner"
                                       placeholder="Soạn lời nhắc nợ ngọt ngào vào đây..."
                                     />
                                     <div className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors pointer-events-none">
                                       <Smile className="w-5 h-5 text-orange-400 text-orange-500/80" />
                                     </div>
                                   </div>

                                   {/* Sticker & Emoji library section */}
                                   <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border-2 border-slate-900/40 space-y-2">
                                     <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-rose-600 dark:text-rose-450 border-b pb-1.5 border-slate-100 dark:border-slate-800">
                                       <span>🎨 Thư viện Sticker & Emoji nịnh bợ:</span>
                                     </div>
                                     
                                     {/* Sticker category buttons selection */}
                                     <div className="flex flex-wrap gap-1 border-b pb-1 border-slate-100 dark:border-slate-800">
                                       {STICKER_CATEGORIES.map((cat, idx) => (
                                         <button
                                           key={idx}
                                           type="button"
                                           onClick={() => setActiveStickerTab(idx)}
                                           className={`px-2 py-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                                             activeStickerTab === idx
                                               ? 'bg-rose-550 bg-rose-500 text-white border border-rose-600 shadow-4xs'
                                               : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                           }`}
                                         >
                                           {cat.name}
                                         </button>
                                       ))}
                                     </div>

                                     {/* Sticker items box */}
                                     <div className="max-h-24 overflow-y-auto p-1 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg flex flex-wrap gap-1.5">
                                       {STICKER_CATEGORIES[activeStickerTab].items.map((item, id) => (
                                         <button
                                           key={id}
                                           type="button"
                                           onClick={() => handleInsertSticker(item)}
                                           className="px-2.5 py-1 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-slate-800 hover:border-rose-400 hover:scale-105 active:scale-95 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-5xs"
                                           title="Nhấp để chèn thẳng vào tin nhắn!"
                                         >
                                           {item}
                                         </button>
                                       ))}
                                     </div>
                                   </div>

                                   {/* Action buttons */}
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                     <button
                                       type="button"
                                       onClick={() => {
                                         if (!bankNo || !bankAccountName) {
                                           alert("⚠️ Vui lòng cấu hình Số tài khoản & Tên thụ hưởng của bạn trước khi sao chép!");
                                           return;
                                         }
                                         copyToClipboard(customMessage, `custom-copy-${debt.id}`);
                                       }}
                                       className="text-[10px] font-black bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-xl border-2 border-slate-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center shadow-5xs active:translate-y-0.5"
                                     >
                                       {copiedNotification === `custom-copy-${debt.id}` ? (
                                         <>
                                           <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                           <span className="text-emerald-500 font-extrabold">Đã copy!</span>
                                         </>
                                       ) : (
                                         <>
                                           <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                           <span>Copy Tin nhắn</span>
                                         </>
                                       )}
                                     </button>

                                     <button
                                       type="button"
                                       onClick={() => handleOpenZalo(customMessage, debt)}
                                       className="text-[10px] font-black bg-teal-500 hover:bg-teal-600 text-white px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors border-2 border-slate-900 shadow-5xs active:translate-y-0.5 text-center"
                                       title="Gửi tin nhắn tuỳ chỉnh này qua Zalo"
                                     >
                                       💬 <span>Gửi qua Zalo</span>
                                     </button>

                                     <button
                                       type="button"
                                       onClick={() => handleOpenMessenger(customMessage, debt)}
                                       className="text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors border-2 border-slate-900 shadow-5xs active:translate-y-0.5 text-center"
                                       title="Gửi tin nhắn tuỳ chỉnh này qua Messenger"
                                     >
                                       🔵 <span>Gửi Messenger</span>
                                     </button>
                                   </div>

                                 </div>
                              </div>

                              {/* VietQR code column */}
                              <div className="md:col-span-4 bg-white/80 dark:bg-slate-900/45 p-4 border-2 border-slate-900 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-5xs text-center">
                                <span className="text-[10px] font-black text-slate-800 text-center uppercase tracking-wide">QUÉT QR VIETQR SÒNG PHẲNG 💸</span>
                                
                                {(!bankNo || !bankAccountName) ? (
                                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-red-300 rounded-xl bg-red-50 text-red-700 min-h-[144px]">
                                    <AlertCircle className="w-8 h-8 mb-2 animate-bounce text-red-500" />
                                    <span className="text-[10px] font-black uppercase text-red-900">Thiếu Thông Tin</span>
                                    <p className="text-[9px] font-bold mt-1 text-red-600 leading-relaxed">
                                      Vui lòng nhập Số Tài Khoản và Tên thụ hưởng ở ô cài đặt để hiển thị mã QR.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="bg-white p-2.5 rounded-xl border-3 border-slate-900 shadow-md">
                                      <img 
                                        src={vietQrUrl} 
                                        alt="VietQR Bank Transfer" 
                                        className="w-32 h-32 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(paymentMemo);
                                        }}
                                      />
                                    </div>
                                    
                                    <span className="text-[10px] text-slate-500 font-bold text-center leading-relaxed">
                                      Gửi ảnh QR này để đối phương tự điền số tiền <strong className="text-slate-900">{debt.amount.toLocaleString('vi-VN')} đ</strong> và chính xác thông tin thụ hưởng của bạn.
                                    </span>
                                  </>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>

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
