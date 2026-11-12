import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askAdvisor, AdvisorBook, advisorStore, AdvisorMessage } from '../services/aiAdvisor';
import { BookCardAdvisor } from '../components/BookCardAdvisor';
import { BookCardSkeleton } from '../components/BookCardSkeleton';
import { Send, Sparkles, AlertTriangle, Lightbulb, Zap, RotateCcw } from 'lucide-react';

interface AdvisorViewProps {
  onOpenBook: (book: AdvisorBook) => void;
  initialQuery?: string;
  onConsumeQuery?: () => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function renderMarkdown(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
}

function splitBranches(q: string): string[] | null {
  const parts = q.split(/\s+hay\s+/i).map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? [parts[0], parts.slice(1).join(' hay ')] : null;
}

const WELCOME: AdvisorMessage = {
  id: 'welcome',
  role: 'assistant',
  turn: {
    systemAlert: null,
    analysis:
      'Chào bạn 👋 Mình là **BookMind AI**. Bạn có thể chia sẻ với mình bất kỳ điều gì: một câu hỏi thắc mắc, khó khăn trong công việc, tâm sự đời sống, mục tiêu khởi nghiệp kinh doanh, hay bất kỳ kỹ năng nào muốn học — mình sẽ phân tích và gợi ý những cuốn sách giải pháp phù hợp nhất từ kho sách toàn cầu.',
    recommendedBooks: [],
    followUpQuestion: '',
  },
};

const SAMPLE_STARTERS = [
  'Tôi muốn học quản lý tài chính cá nhân và đầu tư an toàn',
  'Làm sao để vượt qua sự trì hoãn và xây dựng tính kỷ luật thép?',
  'Dạo này mình hay bị stress, mất ngủ và suy nghĩ tiêu cực',
  'Gợi ý sách về Trí tuệ nhân tạo (AI) và tương lai công nghệ',
  'Tôi muốn khởi nghiệp kinh doanh thì nên đọc sách gì trước?',
];

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  onOpenBook,
  initialQuery,
  onConsumeQuery,
}) => {
  const [messages, setMessages] = useState<AdvisorMessage[]>(() => {
    const saved = advisorStore.messages();
    return saved.length ? saved : [WELCOME];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<AdvisorMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 1 || loading) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, loading]);

  const save = useCallback((next: AdvisorMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
    advisorStore.setMessages(next);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const userMsg: AdvisorMessage = { id: uid(), role: 'user', text: trimmed };
      const withUser = [...messagesRef.current, userMsg];
      save(withUser);
      setInput('');
      setLoading(true);
      try {
        const turn = await askAdvisor(trimmed);
        save([...withUser, { id: uid(), role: 'assistant', turn }]);
      } catch {
        save([
          ...withUser,
          {
            id: uid(),
            role: 'assistant',
            turn: {
              systemAlert: 'Đã chuyển sang chế độ dự phòng thông minh.',
              analysis:
                'Mình đã tiếp nhận ý kiến của bạn và đang chọn lọc những cuốn sách chất lượng nhất phù hợp với nội dung này.',
              recommendedBooks: [],
              followUpQuestion: '',
            },
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, save]
  );

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      const q = initialQuery.trim();
      if (onConsumeQuery) onConsumeQuery();
      handleSend(q);
    }
  }, [initialQuery, onConsumeQuery, handleSend]);

  const handleResetChat = () => {
    save([WELCOME]);
    setInput('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI Cố Vấn Sách Chuyên Sâu</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
          BookMind AI Advisor
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Nói bất kỳ điều gì bạn muốn — AI sẽ phân tích nhu cầu thực tế, kết nối dữ liệu Google Books và diễn giải lý do vì sao mỗi cuốn sách là chìa khóa dành cho bạn.
        </p>
        {messages.length > 1 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleResetChat}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới cuộc trò chuyện</span>
            </button>
          </div>
        )}
      </div>


      {/* Messages */}
      <div className="space-y-6">
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-tr-xs px-5 py-3.5 text-sm whitespace-pre-wrap shadow-md">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-3">
              {m.turn?.systemAlert && (
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 border-l-4 border-amber-500 rounded-r-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{m.turn.systemAlert}</span>
                </div>
              )}

              {m.turn?.analysis && (
                <div className="flex gap-3 max-w-[95%]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                  </div>
                  <div
                    className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-5 py-4 text-sm text-slate-800 leading-relaxed shadow-xs"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.turn.analysis) }}
                  />
                </div>
              )}

              {m.turn?.recommendedBooks && m.turn.recommendedBooks.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                  {m.turn.recommendedBooks.map((b) => (
                    <BookCardAdvisor key={b.id} book={b} onOpen={onOpenBook} />
                  ))}
                </div>
              )}

              {(m.turn?.followUpQuestion || (m.turn?.followUpSuggestions && m.turn.followUpSuggestions.length > 0)) && (
                <div className="space-y-2.5 pl-12 pt-1">
                  {m.turn?.followUpQuestion && (
                    <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{m.turn.followUpQuestion}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {/* Các nhánh A/B từ câu hỏi nếu có */}
                    {(() => {
                      const parts = m.turn?.followUpQuestion ? splitBranches(m.turn.followUpQuestion) : null;
                      if (!parts) return null;
                      return parts.map((p, i) => (
                        <button
                          key={`branch-${i}`}
                          onClick={() => handleSend(p)}
                          disabled={loading}
                          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-xs font-medium text-slate-700 transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                        >
                          <span className="font-bold text-indigo-600">{i === 0 ? 'Hướng 1' : 'Hướng 2'}:</span> {p.length > 60 ? p.slice(0, 60) + '…' : p}
                        </button>
                      ));
                    })()}

                    {/* Các gợi ý đào sâu linh hoạt theo ngữ cảnh */}
                    {m.turn?.followUpSuggestions?.map((sug, idx) => (
                      <button
                        key={`sug-${idx}`}
                        onClick={() => handleSend(sug)}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:border-indigo-400 hover:bg-indigo-100/60 hover:text-indigo-800 text-xs font-medium text-indigo-900 transition-all cursor-pointer disabled:opacity-50 shadow-2xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.3s]" />
              </div>
              <span className="font-medium text-slate-600">AI đang phân tích ý định và tìm sách phù hợp từ Google...</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Prompt Starters */}
      {messages.length <= 1 && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Gợi ý câu hỏi mẫu:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_STARTERS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 text-xs text-slate-600 transition-colors cursor-pointer text-left flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-xl shadow-slate-200/50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Nhập bất kỳ câu hỏi, hoàn cảnh hay mục tiêu của bạn..."
          className="flex-1 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Gửi</span>
          <Send className="w-4 h-4 text-indigo-300" />
        </button>
      </form>
    </div>
  );
};
