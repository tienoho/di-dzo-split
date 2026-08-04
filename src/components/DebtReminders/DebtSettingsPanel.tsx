import React from 'react';
import { CreditCard, Sparkles } from 'lucide-react';

interface DebtSettingsPanelProps {
  bankName: string;
  setBankName: (val: string) => void;
  bankNo: string;
  setBankNo: (val: string) => void;
  bankAccountName: string;
  setBankAccountName: (val: string) => void;
  saveBankSettings: (e: React.FormEvent) => void;
  settingsSaved: boolean;
  pushEnabled: boolean;
  handleTogglePush: (val: boolean) => void;
  pushInterval: string;
  handleIntervalChange: (val: string) => void;
  vapidKeyInput: string;
  setVapidKeyInput: (val: string) => void;
  handleTestFCMRegister: () => void;
  handleSelfTestFCMNotification: () => void;
}

export default function DebtSettingsPanel({
  bankName, setBankName,
  bankNo, setBankNo,
  bankAccountName, setBankAccountName,
  saveBankSettings, settingsSaved,
  pushEnabled, handleTogglePush,
  pushInterval, handleIntervalChange,
  vapidKeyInput, setVapidKeyInput,
  handleTestFCMRegister, handleSelfTestFCMNotification
}: DebtSettingsPanelProps) {
  return (
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
            className="w-full text-xs bg-yellow-50/30 border-2 border-slate-900 p-3 rounded-xl font-mono text-slate-900 font-extrabold focus:border-orange-500 outline-none"
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
            className="w-full text-xs bg-yellow-50/30 border-2 border-slate-900 p-3 rounded-xl text-slate-900 font-black focus:border-orange-500 outline-none"
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
        </div>
      </div>

      {/* FCM Test Box */}
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-[24px] p-4 space-y-3 mt-4">
        <h4 className="text-[11px] font-black text-indigo-900 flex items-center gap-1 uppercase tracking-wider">
          🚀 Liên kết Firebase PUSH
        </h4>
        <p className="text-[10px] text-indigo-700 font-extrabold leading-relaxed">
          App tự động đăng ký token khi bạn điền "Người Tổ Chức". Bạn cũng có thể thiết lập khóa riêng để thử nghiệm.
        </p>
        <div className="space-y-2">
          <input 
            type="text" 
            placeholder="Nhập FCM VAPID Key của bạn..."
            value={vapidKeyInput}
            onChange={(e) => setVapidKeyInput(e.target.value)}
            className="w-full text-[10px] p-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-600 bg-white/70 font-mono text-indigo-900"
          />
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleTestFCMRegister}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black py-2 px-2 rounded-xl border border-indigo-800"
            >
              🔄 Đăng ký Token
            </button>
            <button 
              onClick={handleSelfTestFCMNotification}
              className="bg-indigo-200 hover:bg-indigo-300 text-indigo-900 text-[10px] font-black py-2 px-2 rounded-xl border border-indigo-400"
            >
              📲 Test Bắn Nợ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
