import React, { useState } from 'react';
import { 
  auth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  FirebaseUser,
  signInWithGoogle
} from '../lib/firebase';
import { Mail, Lock, User, Sparkles, AlertCircle, X, ShieldAlert, Check, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthModalProps {
  currentUser: FirebaseUser | null;
  onClose: () => void;
  onSuccess: (user: FirebaseUser, displayName: string) => void;
}

export default function AuthModal({ currentUser, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error('Vui lòng nhập họ và tên!');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu phải dài từ 6 ký tự trở lên!');
        }

        // Create user
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          email.trim(), 
          password
        );
        
        // Update user profile
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        
        setSuccessMsg(`Chào mừng ${displayName.trim()} đến với bàn nhậu! 🍻`);
        setTimeout(() => {
          onSuccess(userCredential.user, displayName.trim());
          onClose();
        }, 1500);

      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        
        const nameToUse = userCredential.user.displayName || email.split('@')[0];
        setSuccessMsg(`Đã đăng nhập thành công. Chào mừng trở lại, ${nameToUse}! 🥂`);
        setTimeout(() => {
          onSuccess(userCredential.user, nameToUse);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      if (err.code === 'auth/email-already-in-use') errMsg = 'Email này đã được đăng ký!';
      if (err.code === 'auth/invalid-credential') errMsg = 'Sai email hoặc mật khẩu!';
      if (err.code === 'auth/weak-password') errMsg = 'Mật khẩu quá yếu!';
      if (err.code === 'auth/too-many-requests') errMsg = 'Nhập sai quá nhiều lần. Vui lòng thử lại sau!';
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      const nameToUse = user.displayName || user.email?.split('@')[0] || 'Chiến hữu';
      setSuccessMsg(`Chào mừng bạng ${nameToUse} đã tham gia bàn nhậu thành công! 🍻`);
      setTimeout(() => {
        onSuccess(user, nameToUse);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* Frame Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-md border-4 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-2xl p-6 md:p-8 overflow-hidden z-10 text-slate-800 dark:text-slate-100"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-900/10 dark:border-slate-700 cursor-pointer"
        >
          <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        </button>

        {/* Top header accent decoration */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex w-12 h-12 rounded-full bg-orange-100 border-2 border-slate-900 dark:border-orange-500 items-center justify-center mb-1 text-2xl">
            🍻
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {isSignUp ? 'Đăng ký sòng phẳng' : 'Chào mừng đồng nhậu'}
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isSignUp 
              ? 'Tạo tài khoản để đồng bộ hóa hóa đơn lên đám mây' 
              : 'Đăng nhập để chia tiền và đòi nợ trực tuyến tức thì'}
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-xl p-3 flex items-start gap-2.5 text-xs font-black text-red-650 animate-bounce">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-650 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Notification Banner */}
        {successMsg && (
          <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-3 flex items-start gap-2.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Họ và tên hoặc biệt danh</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tiến Lộc, Bảo Nam..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-black rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-orange-500 outline-hidden transition-colors text-slate-950 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Địa chỉ Email</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="lapke_hoadon@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-black rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-orange-500 outline-hidden transition-colors text-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mật khẩu bảo mật</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-black rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-orange-500 outline-hidden transition-colors text-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Form Action Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-slate-950 disabled:text-slate-500 font-black text-xs uppercase tracking-wide py-3 px-6 rounded-2xl border-2 border-slate-950 transition-all hover:-translate-y-0.5 cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isSignUp ? 'Đăng ký ngay' : 'Đăng nhập bàn nhậu'}
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-slate-300 dark:border-slate-705"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3.5 text-[10px] font-black tracking-widest text-slate-400">Hoặc tiếp cận nhanh bằng</span>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-950/90 text-slate-900 dark:text-slate-150 font-black text-xs uppercase tracking-wide py-3 px-6 rounded-2xl border-2 border-slate-950 dark:border-slate-700 transition-all hover:-translate-y-0.5 cursor-pointer shadow-5xs flex items-center justify-center gap-2.5"
        >
          <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.9 3.02C6.29 7.55 8.92 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.11 2.73-2.37 3.58l3.69 2.85c2.15-1.98 3.39-4.89 3.39-8.53z"
            />
            <path
              fill="#FBBC05"
              d="M5.38 14.44c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.48 6.82C.53 8.73 0 10.83 0 13s.53 4.27 1.48 6.18l3.9-3.74z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.85c-1.02.68-2.33 1.09-4.24 1.09-3.08 0-5.71-2.51-6.62-5.58l-3.9 3.02C3.37 20.32 7.35 23 12 23z"
            />
          </svg>
          <span>Đăng nhập với Google</span>
        </button>

        {/* Toggle between modes section */}
        <div className="mt-5 pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
            {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản nhậu lẻ?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
              className="ml-1 text-orange-500 hover:text-orange-600 font-black underline cursor-pointer"
            >
              {isSignUp ? 'Đăng nhập ở đây' : 'Tạo tài khoản mới'}
            </button>
          </p>

          <button
            onClick={onClose}
            className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-extrabold underline block mx-auto cursor-pointer"
          >
            Hoặc tiếp tục sử dụng Ngoại tuyến (Offline Guest)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
