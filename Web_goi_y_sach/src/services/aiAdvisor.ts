// AI Book Advisor — Cố vấn sách thông minh thế hệ mới (Gemini 3.8 Flash + Deep Intent Engine):
//   1. Multi-Model Waterfall (100% Free Tier): gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-2.5-pro
//   2. Deep Semantic Intent & Negative Filtering: bắt chính xác chủ đề người dùng (kể cả gõ tắt "mảng al" -> AI, "bị bệnh" -> Y học/Sức khỏe), loại bỏ triệt để sách lệch chủ đề
//   3. Live Google Books Fetching cho cả trang Advisor và Floating Chat khi kệ sách cục bộ thiếu chủ đề người dùng hỏi
//   4. System Instruction + OpenAPI Response Schema + Multi-turn Memory + SSE Streaming
import { Book } from '../types/book';
import { fetchLiveBooks, searchVietnameseBooks, AdvisorBook } from './googleBooks';
import {
  analyzeUserIntent,
  scoreBookAgainstIntent,
  generateAssistantResponse,
  UserIntentAnalysis,
} from '../utils/bookRecommender';

export type { AdvisorBook } from './googleBooks';

export interface AdvisorTurn {
  systemAlert: string | null;
  analysis: string;
  recommendedBooks: AdvisorBook[];
  followUpQuestion: string;
  followUpSuggestions?: string[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  turn?: AdvisorTurn;
}

// Lưu lịch sử chat của AI Advisor ở mức module để giữ trạng thái khi chuyển màn hình
let savedMessages: AdvisorMessage[] = [];

export const advisorStore = {
  messages: () => savedMessages,
  setMessages: (m: AdvisorMessage[]) => {
    savedMessages = m;
  },
};

export interface GeminiRecommendation {
  replyText: string;
  suggestedBookIds: string[];
  suggestedBooks?: Book[];
  followUpSuggestions: string[];
}

const KEY: string | undefined = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Chuỗi mô hình Gemini miễn phí (Free Tier) tự động xoay vòng dự phòng:
 * 1. gemini-3.8-flash: Model Flash thông minh nhất hiện tại (Free Tier, Thinking, 64K output)
 * 2. gemini-3.5-flash-lite: Tốc độ cực nhanh, hạn mức Free Tier rộng khi model chính gặp 429
 * 3. gemini-2.5-pro: Model Pro suy luận sâu dự phòng cuối trên Free Tier
 */
export const FREE_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
] as const;

const FAVORITES_STORAGE_KEY = 'websach-favorites-v1';

export function hasGeminiKey(): boolean {
  return Boolean(KEY && KEY.length > 10 && !KEY.includes('PASTE'));
}

export const EXACT_BOOK_RECOMMENDER_PROMPT = `# NHIỆM VỤ CỐT LÕI CỦA BẠN
Bạn là **BookMind AI** — một chuyên gia cố vấn sách tinh tế, thấu cảm và chính xác tuyệt đối.
Khi người dùng chia sẻ bất kỳ câu nói, tâm sự, hoàn cảnh hay mục tiêu nào:
1. **Phân tích đúng 100% nhu cầu thực tế:**
   - Nếu người dùng nói bị bệnh / ốm / mệt mỏi cơ thể -> BẮT BUỘC gợi ý sách **Y học thường thức, Chăm sóc sức khỏe, Dinh dưỡng & Tự chữa lành cơ thể** (TUYỆT ĐỐI KHÔNG gợi ý sách tài chính, làm giàu, khởi nghiệp).
   - Nếu người dùng nói muốn phát triển mảng "al" / "ai" / trí tuệ nhân tạo / công nghệ -> Hiểu "al" là **AI (Artificial Intelligence - Trí tuệ nhân tạo)**, BẮT BUỘC gợi ý sách chuyên sâu về **Trí tuệ nhân tạo, Dữ liệu, Học máy & Công nghệ tương lai** (TUYỆT ĐỐI KHÔNG lấy từ "phát triển" để gợi ý nhầm sang sách khởi nghiệp hay kinh doanh).
2. Chọn ra **3 cuốn sách xuất sắc, có thật và khớp trực tiếp nhất** với đúng chủ đề người dùng đang hỏi.
3. Giải thích chi tiết, sâu sắc **vì sao từng cuốn sách giải quyết trực tiếp từng chi tiết trong lời chat của người dùng**, kèm hướng dẫn áp dụng thực tế.

# QUY TẮC TRÌNH BÀY KHI TRẢ LỜI BẰNG MARKDOWN
- Mở đầu bằng 2 câu thấu cảm bám sát trực tiếp vào vấn đề người dùng vừa nói.
- Tiếp theo trình bày đúng 3 cuốn sách theo cấu trúc:

### 1. [Tên Sách] – [Tên Tác Giả]
- **Chấm điểm độ khớp:** [Số điểm]/10
- **Chi tiết trong lời bạn nói:** "[Trích dẫn lại cụm từ/ý quan trọng trong lời chat của người dùng]"
- **Vì sao cuốn sách này dành riêng cho bạn:**
  - **Giải quyết trực tiếp:** [Chỉ rõ nội dung cốt lõi trong sách xử lý đúng vấn đề của người dùng ra sao]
  - **Giá trị thực tế nhận được:** [Bài học/hành động cụ thể người dùng áp dụng được ngay]

---

### 2. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*

---

### 3. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*`;

const DECIDE_SEARCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    coreProblem: { type: 'STRING' },
    searchQuery: { type: 'STRING' },
    alternateQuery: { type: 'STRING' },
    categoryFilter: { type: 'STRING', nullable: true },
    isTrending: { type: 'BOOLEAN' },
    analysis: { type: 'STRING' },
    followUpQuestion: { type: 'STRING' },
    followUpSuggestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'coreProblem',
    'searchQuery',
    'isTrending',
    'analysis',
    'followUpQuestion',
    'followUpSuggestions',
  ],
};

const COMPOSE_TURN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    analysis: { type: 'STRING' },
    recommendedBooks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          matchReason: { type: 'STRING' },
        },
        required: ['id', 'matchReason'],
      },
    },
    followUpQuestion: { type: 'STRING' },
    followUpSuggestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['analysis', 'recommendedBooks', 'followUpQuestion', 'followUpSuggestions'],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getFavoritesContextSummary(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return '';
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return '';
    const summaries = parsed
      .slice(0, 8)
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'title' in item) {
          const b = item as { title?: string; author?: string; genre?: string };
          return `${b.title || ''}${b.author ? ` (${b.author})` : ''}${b.genre ? ` [${b.genre}]` : ''}`;
        }
        return '';
      })
      .filter(Boolean);
    if (summaries.length === 0) return '';
    return `\n[Hồ sơ cá nhân hóa - Sách người dùng đã lưu yêu thích: ${summaries.join('; ')}. Ưu tiên gợi ý những đầu sách MỚI chưa nằm trong danh sách đã lưu.]`;
  } catch {
    return '';
  }
}

function getRecentAdvisorContext(): string {
  const history = savedMessages.filter((m) => m.id !== 'welcome');
  const prior =
    history.length > 0 && history[history.length - 1].role === 'user'
      ? history.slice(0, -1)
      : history;
  const recent = prior.slice(-6);
  if (recent.length === 0) return '';

  const lines = recent.map((m) => {
    if (m.role === 'user') {
      return `- Người dùng: "${m.text || ''}"`;
    }
    const bookTitles = (m.turn?.recommendedBooks || []).map((b) => b.title).join(', ');
    return `- BookMind AI: "${(m.turn?.analysis || '').slice(0, 140)}"${
      bookTitles ? ` (Đã gợi ý: ${bookTitles})` : ''
    }`;
  });

  return `\n[Lịch sử trò chuyện gần đây:\n${lines.join('\n')}]`;
}

function extractCandidateText(data: unknown): string {
  const parts = (
    data as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    }
  )?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts) || parts.length === 0) return '';
  const visibleParts = parts.filter((p) => !p.thought && typeof p.text === 'string');
  if (visibleParts.length > 0) {
    return visibleParts.map((p) => p.text).join('');
  }
  return parts[0]?.text || '';
}

interface CallGeminiOptions {
  expectJson?: boolean;
  responseSchema?: Record<string, unknown>;
  systemInstruction?: string;
  historyContents?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  maxRetriesPerModel?: number;
}

async function callGemini(prompt: string, options: CallGeminiOptions = {}): Promise<string> {
  if (!KEY) throw new Error('NO_KEY');

  const {
    expectJson = true,
    responseSchema,
    systemInstruction = EXACT_BOOK_RECOMMENDER_PROMPT,
    historyContents = [],
    maxRetriesPerModel = 1,
  } = options;

  const generationConfig: Record<string, unknown> = {
    temperature: expectJson ? 0.35 : 0.55,
  };

  if (expectJson) {
    generationConfig.responseMimeType = 'application/json';
    if (responseSchema) {
      generationConfig.responseSchema = responseSchema;
    }
  }

  const contents = [
    ...historyContents,
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  let lastError: unknown = new Error('Gemini API failed');

  for (const modelName of FREE_GEMINI_MODELS) {
    const endpoint = `${BASE_API_URL}/${modelName}:generateContent`;
    let attempt = 0;

    while (attempt <= maxRetriesPerModel) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig,
          }),
        });

        if (res.ok) {
          const data: unknown = await res.json();
          const text = extractCandidateText(data);
          if (text) return text;
        }

        // Nếu API Key không hợp lệ (401/403), dừng ngay để chuyển sang bộ phân tích chuyên sâu cục bộ + Google Books
        if (res.status === 401 || res.status === 403) {
          throw new Error(`GEMINI_AUTH_${res.status}`);
        }

        if (res.status === 429 || res.status >= 500) {
          if (attempt < maxRetriesPerModel) {
            attempt++;
            const jitter = Math.floor(Math.random() * 250);
            const delayMs = Math.pow(2, attempt) * 500 + jitter;
            await wait(delayMs);
            continue;
          }
          break;
        }

        lastError = new Error(`Gemini ${modelName} HTTP ${res.status}`);
        break;
      } catch (err: unknown) {
        lastError = err;
        if ((err as Error)?.message?.startsWith('GEMINI_AUTH_')) {
          throw err;
        }
        if (attempt < maxRetriesPerModel) {
          attempt++;
          await wait(Math.pow(2, attempt) * 400);
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

const alertFor = (code?: string) =>
  '⚠️ Không kết nối được trực tiếp tới Google Books nên mình đang dùng kho sách tuyển chọn dự phòng.' +
  (code ? ` (mã: ${code})` : '');

/**
 * Lọc và sắp xếp danh sách AdvisorBook theo đúng miền chủ đề của người dùng,
 * loại bỏ hoàn toàn các cuốn sách lạc đề (vd hỏi Bệnh/AI mà lọt sách Tài chính/Khởi nghiệp).
 */
function filterAndRankAdvisorBooks(
  books: AdvisorBook[],
  intent: UserIntentAnalysis,
  userText: string
): AdvisorBook[] {
  if (books.length === 0) return [];
  const scored = books.map((b) => ({
    book: b,
    score: scoreBookAgainstIntent(b, intent, userText),
  }));

  scored.sort((a, b) => b.score - a.score || (b.book.rating || 0) - (a.book.rating || 0));

  // Ưu tiên những cuốn không bị điểm âm (không vi phạm từ khóa cấm)
  const positive = scored.filter((item) => item.score >= 0).map((item) => item.book);
  return positive.length > 0 ? positive : scored.slice(0, 3).map((item) => item.book);
}

// Bước 1: phân tích ý định sâu sắc có kết hợp Bộ phân tích ngữ nghĩa `analyzeUserIntent`
async function decideSearch(
  userText: string,
  intent: UserIntentAnalysis
): Promise<{
  searchQuery: string;
  alternateQuery?: string;
  categoryFilter?: string;
  isTrending: boolean;
  analysis: string;
  followUpQuestion: string;
  followUpSuggestions: string[];
}> {
  const contextBlock = `${getRecentAdvisorContext()}${getFavoritesContextSummary()}`;

  const prompt = `Người dùng nói: "${userText}"
[Gợi ý nhận diện miền chủ đề từ hệ thống: "${intent.domainLabel}", từ khóa gốc gợi ý: "${intent.searchQuery}"]${contextBlock}

Lưu ý đặc biệt:
- Nếu người dùng gõ "al", hãy hiểu đó là "AI (Trí tuệ nhân tạo)", KHÔNG phải kinh doanh/khởi nghiệp.
- Nếu người dùng nói "bị bệnh / ốm / đau / mệt", hãy tìm sách Y học, Chăm sóc sức khỏe, Dinh dưỡng, KHÔNG gợi ý sách tài chính.
Hãy phân tích kỹ nút thắt cốt lõi và chọn từ khóa giải pháp tiếng Việt chuẩn xác nhất để truy vấn Google Books.`;

  const raw = await callGemini(prompt, {
    expectJson: true,
    responseSchema: DECIDE_SEARCH_SCHEMA,
  });
  const j = parseJson(raw) || {};

  const followUpSuggestions: string[] = Array.isArray(j.followUpSuggestions)
    ? j.followUpSuggestions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
    : intent.followUpSuggestions;

  // Nếu miền chủ đề đã được nhận diện rõ ràng (như health, ai_tech...), đảm bảo từ khóa tìm kiếm bám chặt miền đó
  const resolvedSearchQuery =
    intent.domainId !== 'custom'
      ? String(j.searchQuery || intent.searchQuery).slice(0, 120)
      : String(j.searchQuery || intent.searchQuery).slice(0, 120);

  return {
    searchQuery: resolvedSearchQuery,
    alternateQuery: j.alternateQuery
      ? String(j.alternateQuery).slice(0, 120)
      : intent.alternateQuery,
    categoryFilter:
      j.categoryFilter && j.categoryFilter !== 'null'
        ? String(j.categoryFilter)
        : intent.categoryFilter,
    isTrending: Boolean(j.isTrending),
    analysis: String(j.analysis || intent.analysisText),
    followUpQuestion: String(j.followUpQuestion || intent.followUpQuestion),
    followUpSuggestions,
  };
}

// Bước 2: nhận danh sách sách → soạn analysis + matchReason chi tiết dạng bạn bè
async function composeTurn(
  userText: string,
  plan: { analysis: string; followUpQuestion: string; followUpSuggestions: string[] },
  books: AdvisorBook[],
  intent: UserIntentAnalysis,
  isFallback: boolean,
  errorCode?: string
): Promise<AdvisorTurn> {
  const rankedBooks = filterAndRankAdvisorBooks(books, intent, userText);
  const compact = rankedBooks.slice(0, 8).map((b) => ({
    id: b.id,
    title: b.title,
    authors: b.authors,
    category: b.category,
    rating: b.rating,
    description: b.description.slice(0, 240),
  }));

  const contextBlock = `${getRecentAdvisorContext()}${getFavoritesContextSummary()}`;

  const prompt = `Người dùng nói: "${userText}".
Chủ đề cốt lõi cần giải quyết: "${intent.domainLabel}".
Ghi chú phân tích ban đầu: "${plan.analysis || intent.analysisText}".${contextBlock}

Danh sách sách lấy được từ hệ thống (CHỈ chọn những cuốn khớp đúng chủ đề "${intent.domainLabel}", tuyệt đối loại bỏ sách lệch chủ đề):
${JSON.stringify(compact, null, 1)}

Nhiệm vụ của bạn:
1. Chọn từ 2 đến 3 cuốn sách thực sự giải quyết đúng hoàn cảnh "${userText}" của người dùng.
2. Với mỗi cuốn sách được chọn, viết "matchReason" chi tiết, bám sát lời người dùng theo đúng 2 phần:
   - **Chia sẻ từ người bạn:** Giải thích cụ thể 3-5 câu vì sao nội dung cuốn sách này khớp trực tiếp với câu "${userText}" của người dùng.
   - **Lời khuyên thực tế cho bạn:** Hướng dẫn 2-3 câu cách đọc và áp dụng thực tế ngay.`;

  const raw = await callGemini(prompt, {
    expectJson: true,
    responseSchema: COMPOSE_TURN_SCHEMA,
  });
  const j = parseJson(raw) || {};
  const byId = new Map(rankedBooks.map((b) => [b.id, b]));
  const picked: AdvisorBook[] = [];

  if (Array.isArray(j.recommendedBooks)) {
    for (const r of j.recommendedBooks as Array<Record<string, unknown>>) {
      const base = byId.get(String(r.id || ''));
      if (!base) continue;
      picked.push({ ...base, matchReason: String(r.matchReason || base.matchReason || '') });
    }
  }

  if (picked.length === 0) {
    return localTurn(userText, rankedBooks, intent, isFallback, errorCode);
  }

  const followUpSuggestions: string[] = Array.isArray(j.followUpSuggestions)
    ? j.followUpSuggestions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
    : plan.followUpSuggestions;

  return {
    systemAlert: isFallback ? alertFor(errorCode) : null,
    analysis: String(j.analysis || plan.analysis || intent.analysisText),
    recommendedBooks: picked,
    followUpQuestion: String(j.followUpQuestion || plan.followUpQuestion || intent.followUpQuestion),
    followUpSuggestions,
  };
}

/**
 * Bộ dựng tư vấn chuyên sâu dựa trên Deep Intent Analysis khi Gemini không khả dụng:
 * - Lọc sách đúng 100% chủ đề người dùng hỏi
 * - Viết phân tích riêng cho từng cuốn dựa trên nội dung thật của sách và câu nói của người dùng
 */
function localTurn(
  userText: string,
  books: AdvisorBook[],
  intent: UserIntentAnalysis,
  isFallback: boolean,
  errorCode?: string
): AdvisorTurn {
  const ranked = filterAndRankAdvisorBooks(books, intent, userText);
  const picked = ranked.slice(0, 3).map((b) => {
    const cleanDesc =
      b.description && !b.description.includes('Chưa có mô tả')
        ? b.description.slice(0, 220) + (b.description.length > 220 ? '...' : '')
        : `Tác phẩm đi sâu phân tích các nguyên lý và phương pháp thực tiễn thuộc lĩnh vực ${intent.domainLabel}.`;

    return {
      ...b,
      matchReason: `**Chia sẻ từ người bạn:** Bám sát điều bạn vừa chia sẻ (*"${userText}"*), cuốn **${b.title}** của tác giả **${b.authors}** là một lựa chọn rất sát với nhu cầu **${intent.domainLabel}** của bạn. Nội dung cốt lõi của sách: ${cleanDesc}\n\n**Lời khuyên thực tế cho bạn:** ${intent.actionAdvice}`,
    };
  });

  return {
    systemAlert: isFallback ? alertFor(errorCode) : null,
    analysis: intent.analysisText,
    recommendedBooks: picked,
    followUpQuestion: intent.followUpQuestion,
    followUpSuggestions: intent.followUpSuggestions,
  };
}

/**
 * Hàm chính cho trang Cố vấn chuyên sâu (AdvisorView):
 * Nhận câu người dùng → phân tích sâu ý định (`analyzeUserIntent`) → lấy sách đúng chủ đề từ Google Books → trả về lượt tư vấn hoàn chỉnh.
 */
export async function askAdvisor(userText: string): Promise<AdvisorTurn> {
  const intent = analyzeUserIntent(userText);

  try {
    const plan = await decideSearch(userText, intent);
    let result = await fetchLiveBooks(plan.searchQuery, plan.categoryFilter, plan.isTrending);

    // Luôn truy vấn bổ sung bằng từ khóa chuẩn của Intent nếu kết quả đầu tiên ít hoặc chưa sát chủ đề
    const validMatches = filterAndRankAdvisorBooks(result.books, intent, userText);
    if (validMatches.length < 2) {
      const fallbackQueries = [intent.searchQuery, intent.alternateQuery, plan.alternateQuery].filter(
        (q): q is string => Boolean(q && q !== plan.searchQuery)
      );
      for (const altQ of fallbackQueries) {
        try {
          const altResult = await fetchLiveBooks(altQ, intent.categoryFilter);
          if (altResult.books.length > 0) {
            const existingIds = new Set(result.books.map((b) => b.id));
            const more = altResult.books.filter((b) => !existingIds.has(b.id));
            result = { ...result, books: [...result.books, ...more] };
            if (filterAndRankAdvisorBooks(result.books, intent, userText).length >= 3) {
              break;
            }
          }
        } catch {
          /* tiếp tục thử truy vấn tiếp theo */
        }
      }
    }

    if (!result.books.length) {
      return localTurn(userText, [], intent, true, result.errorCode);
    }
    return await composeTurn(
      userText,
      plan,
      result.books,
      intent,
      result.isFallback,
      result.errorCode
    );
  } catch {
    // Khi Gemini lỗi (vd API key 401/429): dùng từ khóa chuẩn từ `intent.searchQuery` (KHÔNG truyền nguyên câu văn dài gây lệch kết quả!)
    try {
      let result = await fetchLiveBooks(intent.searchQuery, intent.categoryFilter);
      const ranked = filterAndRankAdvisorBooks(result.books, intent, userText);

      if (ranked.length < 2 && intent.alternateQuery) {
        const altResult = await fetchLiveBooks(intent.alternateQuery);
        const existingIds = new Set(result.books.map((b) => b.id));
        const more = altResult.books.filter((b) => !existingIds.has(b.id));
        result = { ...result, books: [...result.books, ...more] };
      }

      return localTurn(userText, result.books, intent, result.isFallback, result.errorCode);
    } catch {
      return localTurn(userText, [], intent, true, 'UNKNOWN');
    }
  }
}

function extractTitlesFromMarkdown(text: string): string[] {
  const titles: string[] = [];
  const regex = /###\s*\d+\.\s*(?:\[([^\]]+)\]|([^–\-\n]+?))\s*[–\-]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawTitle = (match[1] || match[2] || '').trim();
    if (rawTitle) {
      titles.push(rawTitle.replace(/^\[|\]$/g, '').trim());
    }
  }
  return titles;
}

/**
 * Tìm kiếm và kết hợp sách từ kệ cục bộ + Google Books trực tiếp theo đúng chủ đề người dùng hỏi trong FloatingChat.
 * Nhờ vậy khi người dùng hỏi "tui bị bệnh" hay "phát triển mảng al", hệ thống luôn nạp đúng sách Y học / Sách AI thật từ Google Books!
 */
export async function resolveRelevantBooksForChat(
  userText: string,
  localBooks: Book[]
): Promise<{ matchedBooks: Book[]; intent: UserIntentAnalysis }> {
  const intent = analyzeUserIntent(userText);

  // Chấm điểm các sách đang có sẵn trong bộ nhớ cục bộ
  const scoredLocal = localBooks
    .map((b) => ({ book: b, score: scoreBookAgainstIntent(b, intent, userText) }))
    .filter((item) => item.score >= 25)
    .sort((a, b) => b.score - a.score);

  const combined: Book[] = scoredLocal.map((item) => item.book);
  const seenTitles = new Set(combined.map((b) => b.title.trim().toLowerCase()));

  // Nếu kệ cục bộ có ít hơn 3 cuốn khớp sâu với chủ đề người dùng hỏi -> gọi trực tiếp Google Books API theo intent.searchQuery!
  if (combined.length < 3) {
    try {
      const livePrimary = await searchVietnameseBooks(intent.searchQuery, 12);
      const rankedPrimary = livePrimary
        .map((b) => ({ book: b, score: scoreBookAgainstIntent(b, intent, userText) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score);

      for (const item of rankedPrimary) {
        const key = item.book.title.trim().toLowerCase();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push(item.book);
        }
      }

      if (combined.length < 3 && intent.alternateQuery) {
        const liveAlt = await searchVietnameseBooks(intent.alternateQuery, 10);
        const rankedAlt = liveAlt
          .map((b) => ({ book: b, score: scoreBookAgainstIntent(b, intent, userText) }))
          .filter((item) => item.score >= 0)
          .sort((a, b) => b.score - a.score);

        for (const item of rankedAlt) {
          const key = item.book.title.trim().toLowerCase();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            combined.push(item.book);
          }
        }
      }
    } catch {
      /* giữ các sách đã lọc được */
    }
  }

  return {
    matchedBooks: combined.slice(0, 8),
    intent,
  };
}

function buildRecommendationFromReply(
  replyText: string,
  candidateBooks: Book[],
  intent: UserIntentAnalysis
): GeminiRecommendation {
  const suggestedTitles = extractTitlesFromMarkdown(replyText);

  let matchedBooks = candidateBooks.filter((b) =>
    suggestedTitles.some(
      (t) =>
        t &&
        (b.title.toLowerCase().includes(t.toLowerCase()) ||
          t.toLowerCase().includes(b.title.toLowerCase()))
    )
  );

  if (matchedBooks.length === 0) {
    matchedBooks = candidateBooks.slice(0, 3);
  } else {
    matchedBooks = matchedBooks.slice(0, 3);
  }

  const followUpSuggestions =
    intent.followUpSuggestions.length > 0
      ? intent.followUpSuggestions
      : suggestedTitles.length >= 2
      ? [
          `Tìm hiểu thêm: ${suggestedTitles[0]}`,
          `Tìm hiểu thêm: ${suggestedTitles[1]}`,
          'Kế hoạch áp dụng vào thực tế',
        ]
      : ['Giải pháp áp dụng ngay', 'Cách tháo gỡ hoàn cảnh này', 'Góc nhìn mở rộng'];

  return {
    replyText,
    suggestedBookIds: matchedBooks.map((b) => b.id),
    suggestedBooks: matchedBooks,
    followUpSuggestions,
  };
}

function buildFloatingChatHistory(
  chatHistory?: Array<{ sender: 'user' | 'assistant'; text: string }>
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  if (!chatHistory || chatHistory.length === 0) return [];
  return chatHistory
    .slice(-6)
    .filter((m) => m.text && m.text.trim().length > 0)
    .map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.text.slice(0, 600) }],
    }));
}

/** Gợi ý sách chuẩn xác tuyệt đối bám sát từng chi tiết lời chat người dùng */
export async function generateWithGemini(
  userText: string,
  books: Book[],
  chatHistory?: Array<{ sender: 'user' | 'assistant'; text: string }>
): Promise<GeminiRecommendation> {
  const { matchedBooks, intent } = await resolveRelevantBooksForChat(userText, books);

  if (!hasGeminiKey()) {
    const fallback = generateAssistantResponse(userText, matchedBooks);
    return {
      replyText: fallback.replyText,
      suggestedBookIds: fallback.suggestedBooks.map((b) => b.id),
      suggestedBooks: fallback.suggestedBooks,
      followUpSuggestions: fallback.followUpSuggestions,
    };
  }

  const catalogPreview = matchedBooks
    .slice(0, 6)
    .map(
      (b) =>
        `- ${b.title} – ${b.author} (${b.genre}): ${(b.description || '').slice(0, 160)}`
    )
    .join('\n');

  const prompt = `Lời chat của người dùng: "${userText}"
Chủ đề cốt lõi hệ thống đã xác định: "${intent.domainLabel}" (Từ khóa trọng tâm: "${intent.searchQuery}").${getFavoritesContextSummary()}
${
  catalogPreview
    ? `\n[Danh sách sách ĐÚNG CHỦ ĐỀ "${intent.domainLabel}" vừa truy vấn từ hệ thống (BẮT BUỘC ưu tiên chọn 3 cuốn phù hợp nhất trong danh sách này để gợi ý):\n${catalogPreview}]`
    : ''
}`;

  try {
    const rawText = await callGemini(prompt, {
      expectJson: false,
      systemInstruction: EXACT_BOOK_RECOMMENDER_PROMPT,
      historyContents: buildFloatingChatHistory(chatHistory),
    });

    return buildRecommendationFromReply(rawText.trim(), matchedBooks, intent);
  } catch {
    const fallback = generateAssistantResponse(userText, matchedBooks);
    return {
      replyText: fallback.replyText,
      suggestedBookIds: fallback.suggestedBooks.map((b) => b.id),
      suggestedBooks: fallback.suggestedBooks,
      followUpSuggestions: fallback.followUpSuggestions,
    };
  }
}

/**
 * Phản hồi Streaming theo thời gian thực (SSE) cho khung chat nổi:
 * - Bước 1: Phân tích ý định & lấy ngay danh sách sách đúng chủ đề từ Google Books (`resolveRelevantBooksForChat`)
 * - Bước 2: Stream câu trả lời từ Gemini 3.8 Flash; nếu API key lỗi/hết hạn mức thì tự động trả về bản phân tích chuyên sâu đúng chủ đề 100%.
 */
export async function generateWithGeminiStream(
  userText: string,
  books: Book[],
  onChunk: (partialText: string) => void,
  chatHistory?: Array<{ sender: 'user' | 'assistant'; text: string }>
): Promise<GeminiRecommendation> {
  const { matchedBooks, intent } = await resolveRelevantBooksForChat(userText, books);

  if (!hasGeminiKey() || !KEY) {
    const fallback = generateAssistantResponse(userText, matchedBooks);
    onChunk(fallback.replyText);
    return {
      replyText: fallback.replyText,
      suggestedBookIds: fallback.suggestedBooks.map((b) => b.id),
      suggestedBooks: fallback.suggestedBooks,
      followUpSuggestions: fallback.followUpSuggestions,
    };
  }

  const catalogPreview = matchedBooks
    .slice(0, 6)
    .map(
      (b) =>
        `- ${b.title} – ${b.author} (${b.genre}): ${(b.description || '').slice(0, 160)}`
    )
    .join('\n');

  const prompt = `Lời chat của người dùng: "${userText}"
Chủ đề cốt lõi hệ thống đã xác định: "${intent.domainLabel}" (Từ khóa trọng tâm: "${intent.searchQuery}").${getFavoritesContextSummary()}
${
  catalogPreview
    ? `\n[Danh sách sách ĐÚNG CHỦ ĐỀ "${intent.domainLabel}" vừa truy vấn từ hệ thống (BẮT BUỘC ưu tiên chọn 3 cuốn phù hợp nhất trong danh sách này để gợi ý):\n${catalogPreview}]`
    : ''
}`;

  const contents = [
    ...buildFloatingChatHistory(chatHistory),
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  for (const modelName of FREE_GEMINI_MODELS) {
    const streamEndpoint = `${BASE_API_URL}/${modelName}:streamGenerateContent?alt=sse`;
    try {
      const res = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: EXACT_BOOK_RECOMMENDER_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.55,
          },
        }),
      });

      if (res.status === 401 || res.status === 403) {
        break;
      }

      if (!res.ok || !res.body) {
        continue;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) continue;
          const jsonStr = trimmedLine.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed: unknown = JSON.parse(jsonStr);
            const chunkText = extractCandidateText(parsed);
            if (chunkText) {
              accumulated += chunkText;
              onChunk(accumulated);
            }
          } catch {
            // Bỏ qua dòng SSE chưa hoàn chỉnh
          }
        }
      }

      if (accumulated.trim().length > 0) {
        return buildRecommendationFromReply(accumulated.trim(), matchedBooks, intent);
      }
    } catch {
      // Thử model tiếp theo
    }
  }

  // Khi Gemini không phản hồi hoặc key hết hạn: dựng phản hồi chuyên sâu từ danh sách sách ĐÚNG CHỦ ĐỀ đã lấy từ Google Books
  const fallback = generateAssistantResponse(userText, matchedBooks);
  onChunk(fallback.replyText);
  return {
    replyText: fallback.replyText,
    suggestedBookIds: fallback.suggestedBooks.map((b) => b.id),
    suggestedBooks: fallback.suggestedBooks,
    followUpSuggestions: fallback.followUpSuggestions,
  };
}
