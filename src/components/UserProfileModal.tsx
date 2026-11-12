import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../services/authService';
import { Book } from '../types/book';
import {
  X,
  User,
  History,
  FileText,
  Star,
  Settings,
  Download,
  LogOut,
  Trash2,
  Check,
  Calendar,
  Bookmark,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface UserProfileModalProps {
  onSelectBookById?: (bookId: string) => void;
  allBooks?: Book[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  onSelectBookById,
  allBooks = [],
}) => {
  const {
    currentUser,
    isProfileModalOpen,
    closeProfileModal,
    logout,
    updateProfile,
    clearHistory,
    deleteBookNote,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'history' | 'notes' | 'profile' | 'export'>('history');

  // State chỉnh sửa profile
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || 'avatar-1');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditAvatar(currentUser.avatar);
      setEditBio(currentUser.bio || '');
    }
  }, [currentUser, isProfileModalOpen]);

  if (!isProfileModalOpen || !currentUser) return null;

  const currentAvatarMeta =
    AVATAR_OPTIONS.find((a) => a.id === currentUser.avatar) || AVATAR_OPTIONS[0];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: editName.trim(),
      avatar: editAvatar,
      bio: editBio.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportData = () => {
    const dataToExport = {
      version: 'BookMind-v2',
      exportedAt: new Date().toISOString(),
      user: currentUser,
    };
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmind_data_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const notesList = Object.values(currentUser.notes || {});
  const ratingsList = Object.entries(currentUser.ratings || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Profile Bar */}
        <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={closeProfileModal}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${currentAvatarMeta.bg} text-white flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-4 ring-white/10 shrink-0`}
            >
              <span>{currentAvatarMeta.icon}</span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                  {currentUser.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  Độc Giả Thân Thiết
                </span>
              </div>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
              {currentUser.bio && (
                <p className="text-xs text-slate-300 italic max-w-md pt-0.5">{currentUser.bio}</p>
              )}
            </div>

            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer self-center sm:self-start shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* User Quick Stats */}
          <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 block">Sách yêu thích</span>
              <span className="text-sm font-extrabold text-pink-400 tabular-nums">
                {currentUser.favorites.length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 block">Đã xem gần đây</span>
              <span className="text-sm font-extrabold text-indigo-300 tabular-nums">
                {currentUser.history?.length || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 block">Đã đánh giá</span>
              <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                {ratingsList.length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 block">Ghi chú đã lưu</span>
              <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                {notesList.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto text-xs font-semibold no-scrollbar">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử Đọc ({currentUser.history?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ghi Chú &amp; Đánh Giá ({notesList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài Đặt Hồ Sơ</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao Lưu Dữ Liệu</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Các cuốn sách bạn đã mở xem gần đây
                </span>
                {currentUser.history && currentUser.history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa toàn bộ lịch sử</span>
                  </button>
                )}
              </div>

              {currentUser.history && currentUser.history.length > 0 ? (
                <div className="space-y-2">
                  {currentUser.history.map((h, idx) => (
                    <div
                      key={`${h.bookId}-${idx}`}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-500 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4
                            onClick={() => {
                              if (onSelectBookById) {
                                onSelectBookById(h.bookId);
                                closeProfileModal();
                              }
                            }}
                            className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 cursor-pointer transition-colors"
                          >
                            {h.bookTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {h.bookAuthor} · <span className="text-indigo-600">{h.genre}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(h.viewedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {new Date(h.viewedAt).toLocaleDateString('vi-VN')}
                        </span>
                        {onSelectBookById && (
                          <button
                            onClick={() => {
                              onSelectBookById(h.bookId);
                              closeProfileModal();
                            }}
                            className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                          >
                            Xem lại →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">Chưa có lịch sử đọc sách.</p>
                  <p className="text-[11px] text-slate-400">
                    Khi bạn mở xem chi tiết các cuốn sách, hệ thống sẽ tự động lưu lại tại đây!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOTES & RATINGS */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Ratings overview */}
              {ratingsList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Đánh giá sao của bạn ({ratingsList.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ratingsList.map(([bId, rScore]) => {
                      const bookObj = allBooks.find((b) => b.id === bId);
                      const title = bookObj?.title || bId;
                      return (
                        <div
                          key={`rate-${bId}`}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-800 truncate mr-2">
                            {title}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0 text-amber-500 text-xs font-bold">
                            <span>{rScore}</span>
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Trích dẫn &amp; Ghi chú cá nhân ({notesList.length})
                </span>

                {notesList.length > 0 ? (
                  <div className="space-y-3">
                    {notesList.map((note) => (
                      <div
                        key={note.bookId}
                        className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{note.bookTitle}</span>
                          </h4>
                          <button
                            onClick={() => deleteBookNote(note.bookId)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Xóa ghi chú này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-indigo-300">
                          {note.content}
                        </p>
                        <span className="text-[10px] text-slate-400 block text-right">
                          Cập nhật lúc: {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">Chưa có ghi chú nào được lưu.</p>
                    <p className="text-[11px] text-slate-400">
                      Vào bất kỳ trang chi tiết sách nào để ghi lại những trích dẫn và bài học tâm đắc của bạn!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Cập nhật thông tin hồ sơ thành công!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn ảnh đại diện Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((av) => {
                    const isChosen = editAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setEditAvatar(av.id)}
                        className={`aspect-square rounded-xl ${av.bg} text-white flex items-center justify-center text-xl transition-all cursor-pointer relative ${
                          isChosen
                            ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-sm'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={av.label}
                      >
                        <span>{av.icon}</span>
                        {isChosen && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold border border-white">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giới thiệu ngắn (Bio)
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Chia sẻ về sở thích đọc sách hoặc mục tiêu của bạn..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Lưu Thay Đổi</span>
              </button>
            </form>
          )}

          {/* TAB 4: EXPORT & BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Quyền Riêng Tư &amp; Sở Hữu Dữ Liệu 100%</span>
                </h4>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Toàn bộ dữ liệu của bạn gồm: danh sách sách yêu thích ({currentUser.favorites.length}), lịch sử đọc ({currentUser.history?.length || 0}), ghi chú ({notesList.length}) và điểm đánh giá sao ({ratingsList.length}) đều được lưu trữ trực tiếp trên thiết bị của bạn.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Tải về bản sao lưu dữ liệu cá nhân
                  </h4>
                  <p className="text-xs text-slate-500">
                    Xuất file JSON chuẩn có thể dùng để lưu trữ lâu dài hoặc nạp lại khi đổi máy.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Tải File JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
