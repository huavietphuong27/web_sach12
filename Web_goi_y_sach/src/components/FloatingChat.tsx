import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, X, Send, BookOpen, Sparkles, ChevronDown } from 'lucide-react';
import { Book, ChatMessage } from '../types/book';
import { generateAssistantResponse } from '../utils/bookRecommender';
import { generateWithGeminiStream } from '../services/aiAdvisor';

interface FloatingChatProps {
  books: Book[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectBook: (book: Book) => void;
  onOpenFullChat: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'Học kinh doanh & đầu tư cho người mới',
  'Kỷ luật & vượt qua sự trì hoãn',
  'Cân bằng cảm xúc & giảm stress',
];

function renderChatMarkdown(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    // Heading 3 (ví dụ: ### 1. Tên Sách – Tác Giả)
    .replace(/^###\s*(.+)$/gm, '<h4 class="text-xs sm:text-sm font-bold text-indigo-900 mt-3 mb-1.5 pt-1.5 border-t border-slate-200 first:border-0 first:mt-0 first:pt-0">$1</h4>')
    // Horizontal rule ---
    .replace(/^---$/gm, '<hr class="my-2.5 border-slate-200" />')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    // Italic *text*
    .replace(/\*([^*\n]+?)\*/g, '<em class="text-slate-700 italic">$1</em>')
    // Sub-bullets (thụt lề có - hoặc *)
    .replace(/^\s{2,}[-*]\s+(.+)$/gm, '<div class="pl-3 text-[11.5px] text-slate-600 my-0.5">• $1</div>')
    // Main bullets
    .replace(/^[-*]\s+(.+)$/gm, '<div class="pl-0.5 text-[12px] text-slate-800 my-1 leading-snug">• $1</div>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  books,
  isOpen,
  onToggle,
  onSelectBook,
  onOpenFullChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Chào bạn 👋 Mình là **BookMind AI**. Bạn đang muốn tìm sách thuộc chủ đề gì (kinh doanh, kỹ năng, tâm lý, công nghệ, chữa lành...) hay đang có tâm sự gì cứ nói với mình nhé!',
      timestamp: 'Vừa xong',
      suggestedBookIds: [],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const trimmed = (customText ?? inputText).trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Vừa xong',
    };

    const assistantMsgId = `a-${Date.now()}`;
    const priorHistory = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ sender: m.sender, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      let streamedStarted = false;
      const result = await generateWithGeminiStream(
        trimmed,
        books,
        (partialText) => {
          if (!streamedStarted) {
            streamedStarted = true;
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMsgId,
                sender: 'assistant',
                text: partialText,
                timestamp: 'Vừa xong',
                suggestedBookIds: [],
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, text: partialText } : m))
            );
          }
        },
        priorHistory
      );

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantMsgId);
        if (exists) {
          return prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: result.replyText,
                  suggestedBookIds: result.suggestedBookIds,
                }
              : m
          );
        }
        return [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: result.replyText,
            timestamp: 'Vừa xong',
            suggestedBookIds: result.suggestedBookIds,
          },
        ];
      });

      if (result.followUpSuggestions && result.followUpSuggestions.length > 0) {
        setQuickSuggestions(result.followUpSuggestions);
      }
    } catch {
      const fallback = generateAssistantResponse(trimmed, books);
      const suggestedBookIds = fallback.suggestedBooks.map((b) => b.id);
      setQuickSuggestions([
        'Giải pháp áp dụng ngay',
        'Kỹ năng thực chiến',
        'Kế hoạch hành động',
      ]);
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantMsgId);
        if (exists) {
          return prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, text: fallback.replyText, suggestedBookIds }
              : m
          );
        }
        return [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: fallback.replyText,
            timestamp: 'Vừa xong',
            suggestedBookIds,
          },
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <>
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Cửa sổ Gợi Ý Sách AI"
          className="fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[580px] h-[520px] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 flex flex-col z-40 overflow-hidden transition-all duration-200 animate-fade-in"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-indigo-100" />
              </span>
              <div>
                <h3 className="font-serif text-sm font-bold text-white">
                  BookMind <span className="text-indigo-400">AI</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Bạn muốn tìm sách hay giải pháp gì?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenFullChat}
                className="text-xs px-2.5 py-1.5 min-h-[36px] flex items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1 font-medium"
                title="Mở rộng sang trang tư vấn chuyên sâu"
              >
                Mở rộng
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
                aria-label="Thu nhỏ trợ lý chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const suggested = msg.suggestedBookIds
                ? books.filter((b) => msg.suggestedBookIds?.includes(b.id))
                : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isAssistant
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                        : 'bg-slate-900 text-white rounded-tr-xs'
                    }`}
                  >
                    {isAssistant ? (
                      <div dangerouslySetInnerHTML={{ __html: renderChatMarkdown(msg.text) }} />
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>

                  {/* Compact suggested book cards */}
                  {isAssistant && suggested.length > 0 && (
                    <div className="mt-2.5 w-full space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Sách gợi ý cho bạn:
                      </p>
                      {suggested.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => onSelectBook(b)}
                          className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 hover:border-indigo-500 transition-colors cursor-pointer group shadow-2xs min-h-[44px]"
                        >
                          <div
                            className="w-10 h-14 rounded-md shrink-0 overflow-hidden bg-slate-100 shadow-2xs relative flex items-center justify-center"
                          >
                            {b.coverUrl ? (
                              <>
                                <img
                                  src={b.coverUrl}
                                  alt=""
                                  aria-hidden="true"
                                  className="absolute inset-0 w-full h-full object-cover blur-xs opacity-25 scale-110 pointer-events-none"
                                />
                                <img
                                  src={b.coverUrl}
                                  alt={b.title}
                                  loading="lazy"
                                  className="relative max-w-full max-h-full object-contain p-0.5 z-10"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </>
                            ) : (
                              <span className="flex items-center justify-center h-full p-1 text-[9px] text-center font-bold text-slate-700">
                                {b.title.slice(0, 14)}..
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                              {b.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {b.author}
                            </p>
                            <p className="text-[10px] text-indigo-600 mt-0.5 truncate font-semibold">
                              {b.genre} · {b.publishYear}
                            </p>
                          </div>
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0 opacity-70 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-2.5 bg-white rounded-xl border border-slate-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse [animation-delay:0.4s]" />
                <span className="ml-1 text-xs">AI đang phân tích &amp; tìm sách...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (Tự động thay đổi linh hoạt theo câu hỏi của khách hàng) */}
          {quickSuggestions.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0 pl-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Gợi ý:
              </span>
              {quickSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleQuickPrompt(sug)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-600 text-slate-700 transition-colors shrink-0 whitespace-nowrap cursor-pointer text-xs font-medium disabled:opacity-50"
                  title={sug}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <label htmlFor="floating-chat-input" className="sr-only">
              Nhắn tin hỏi gợi ý sách
            </label>
            <input
              id="floating-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Bạn đang muốn tìm sách gì?..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4 text-indigo-300" />
            </button>
          </form>
        </aside>
      )}

      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-40">
        <button
          onClick={onToggle}
          className="relative group flex items-center justify-center w-14 h-14 min-h-[44px] min-w-[44px] rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Mở trợ lý chat AI"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquareText className="w-6 h-6 text-indigo-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                •
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
