import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Phone, 
  MessageSquare, 
  UserPlus, 
  AlertCircle,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactManagerProps {
  contacts: Record<string, { phone?: string; messenger?: string }>;
  onSaveContact: (name: string, phone: string, messenger: string) => Promise<void>;
  onDeleteContact: (name: string) => Promise<void>;
  currentUser?: any;
}

export default function ContactManager({ contacts, onSaveContact, onDeleteContact, currentUser }: ContactManagerProps) {
  // Input states for Add/Edit Form
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [messenger, setMessenger] = useState<string>('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Edit mode states
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState<string>('');
  const [editMessenger, setEditMessenger] = useState<string>('');

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      onConfirm
    });
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Tên liên hệ không được để trống.');
      return;
    }

    // Check if name contains "(Bạn)" or is host
    if (cleanName.toLowerCase().includes('(bạn)')) {
      setErrorMsg('Tên liên hệ không được chứa ký hiệu "(Bạn)" dành riêng cho người tạo.');
      return;
    }

    // Check unique name case insensitive
    const nameExists = Object.keys(contacts).some(
      (k) => k.toLowerCase() === cleanName.toLowerCase()
    );
    if (nameExists) {
      setErrorMsg(`Chiến hữu "${cleanName}" đã tồn tại trong danh bạ.`);
      return;
    }

    try {
      await onSaveContact(cleanName, phone.trim(), messenger.trim());
      setSuccessMsg(`✓ Đã thêm "${cleanName}" vào danh bạ.`);
      setName('');
      setPhone('');
      setMessenger('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi thêm liên hệ.');
    }
  };

  const handleStartEdit = (contactName: string) => {
    setEditingName(contactName);
    setEditPhone(contacts[contactName]?.phone || '');
    setEditMessenger(contacts[contactName]?.messenger || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingName(null);
    setErrorMsg(null);
  };

  const handleUpdateContact = async (contactName: string) => {
    setErrorMsg(null);
    try {
      await onSaveContact(contactName, editPhone.trim(), editMessenger.trim());
      setSuccessMsg(`✓ Đã cập nhật thông tin của "${contactName}".`);
      setEditingName(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật liên hệ.');
    }
  };

  const handleDelete = (contactName: string) => {
    triggerConfirm(
      `Bạn có chắc chắn muốn xóa "${contactName}" khỏi danh bạ? Mọi thông tin SĐT và Messenger của người này sẽ bị mất.`,
      async () => {
        try {
          await onDeleteContact(contactName);
          setSuccessMsg(`✓ Đã xóa "${contactName}" khỏi danh bạ.`);
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
          setErrorMsg(err.message || 'Lỗi xóa liên hệ.');
        }
      },
      "Xóa Liên Hệ"
    );
  };

  // Filtered contacts list
  const filteredContacts = React.useMemo(() => Object.entries(contacts).filter(([contactName]) => 
    contactName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  ), [contacts, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Tab Banner */}
      <div className="bg-white border-4 border-slate-900 rounded-[32px] p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <Users className="w-7 h-7 text-indigo-500" />
            Danh Bạ Chiến Hữu
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
            Quản lý danh sách bạn bè thường xuyên đi nhậu. Đồng bộ hóa SĐT và Messenger để đòi nợ 1 chạm siêu nhanh!
          </p>
        </div>
        {currentUser && (
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border-2 border-emerald-300 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Đã kết nối Cloud Sync
          </span>
        )}
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border-4 border-emerald-500 rounded-2xl p-4 text-emerald-950 font-black text-xs shadow-sm flex items-center gap-2.5"
        >
          <span>🎉</span> {successMsg}
        </motion.div>
      )}

      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-4 border-red-500 rounded-2xl p-4 text-red-950 font-black text-xs shadow-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> {errorMsg}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Add Contact Form */}
        <div className="lg:col-span-4 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 h-fit space-y-5">
          <div className="space-y-1.5 border-b-2 border-dashed border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-6 bg-indigo-400 rounded-full inline-block"></span>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                Thêm Chiến Hữu
              </h2>
            </div>
            <p className="text-[11px] font-bold text-slate-500">Tạo thông tin của bạn bè để gọi chọn nhanh khi chia hóa đơn.</p>
          </div>

          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">
                Tên Chiến Hữu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tên ví dụ: Minh Quân..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-50 border-2 border-slate-900 p-3 rounded-xl text-slate-900 font-extrabold focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">
                Số Điện Thoại Zalo
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 0988888888..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs bg-slate-50 border-2 border-slate-900 p-3 rounded-xl font-mono text-slate-900 font-extrabold focus:border-indigo-500 outline-hidden"
              />
              <p className="text-[9px] font-bold text-slate-400">Dùng để mở chat Zalo đòi nợ trực tiếp.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wide">
                Messenger Username
              </label>
              <input
                type="text"
                placeholder="Ví dụ: quan.minh.99..."
                value={messenger}
                onChange={(e) => setMessenger(e.target.value)}
                className="w-full text-xs bg-slate-50 border-2 border-slate-900 p-3 rounded-xl text-slate-900 font-extrabold focus:border-indigo-500 outline-hidden"
              />
              <p className="text-[9px] font-bold text-slate-400">Username của link m.me/username chat Facebook.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl py-3 text-xs font-black border-2 border-slate-900 hover:-translate-y-0.5 shadow-sm transition-all cursor-pointer"
            >
              Lưu Vào Danh Bạ
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Contacts List */}
        <div className="lg:col-span-8 bg-white border-4 border-slate-900 rounded-[32px] shadow-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-dashed border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
              Danh sách ({filteredContacts.length})
            </h2>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm chiến hữu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-extrabold bg-slate-50 border-2 border-slate-900 rounded-xl outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-805 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <p className="text-xs font-black text-slate-400">Không tìm thấy chiến hữu nào.</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Hãy nhập thông tin ở cột trái để thêm mới danh bạ nhậu!</p>
              </div>
            ) : (
              filteredContacts.map(([contactName, data]) => {
                const isEditing = editingName === contactName;
                return (
                  <div 
                    key={contactName}
                    className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 transition-colors"
                  >
                    {isEditing ? (
                      // Inline editing form
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="text-xs font-black text-slate-900 self-center">
                          👤 {contactName}
                        </div>
                        <input
                          type="text"
                          placeholder="Số điện thoại Zalo"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="text-[11px] font-bold bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-hidden"
                        />
                        <input
                          type="text"
                          placeholder="Messenger Username"
                          value={editMessenger}
                          onChange={(e) => setEditMessenger(e.target.value)}
                          className="text-[11px] font-bold bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-hidden"
                        />
                      </div>
                    ) : (
                      // Plain text presentation
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          👤 {contactName}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {data.phone ? (
                            <span className="text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> Zalo: {data.phone}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              Chưa cấu hình SĐT
                            </span>
                          )}
                          {data.messenger ? (
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" /> Messenger: {data.messenger}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              Chưa cấu hình Messenger
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2 justify-end shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateContact(contactName)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-xl border-2 border-slate-900 cursor-pointer shadow-3xs hover:-translate-y-0.5 transition-all"
                            title="Lưu cập nhật"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-xl border-2 border-slate-900 cursor-pointer shadow-3xs hover:-translate-y-0.5 transition-all"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(contactName)}
                            className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 p-2 rounded-xl border-2 border-slate-900 cursor-pointer shadow-3xs hover:-translate-y-0.5 transition-all"
                            title="Sửa thông tin liên hệ"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contactName)}
                            className="bg-white hover:bg-red-50 text-slate-750 hover:text-red-600 p-2 rounded-xl border-2 border-slate-900 cursor-pointer shadow-3xs hover:-translate-y-0.5 transition-all"
                            title="Xóa khỏi danh bạ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center gap-2 border-b-2 border-dashed border-slate-100 pb-3">
                <span className="text-xl">💡</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{confirmDialog.title}</h3>
              </div>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-5xs transition-transform active:translate-y-0.5 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="bg-red-500 hover:bg-red-655 hover:bg-red-600 text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-5xs transition-transform active:translate-y-0.5 cursor-pointer"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
