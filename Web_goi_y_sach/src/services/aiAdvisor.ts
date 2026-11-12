// AI Book Advisor — Cố vấn sách thông minh thế hệ mới (Gemini 3.8 Flash + Multi-Model Fallback Free Tier):
//   1. Multi-Model Waterfall (100% Free Tier): gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-2.5-pro
//   2. System Instruction + OpenAPI Response Schema: ép chuẩn cấu trúc JSON 100%, không lỗi parse
//   3. Multi-turn Conversation Memory: ghi nhớ mạch hội thoại nhiều lượt liên tiếp
//   4. Cá nhân hóa theo Tủ sách yêu thích (localStorage): hiểu gu đọc & tránh gợi ý trùng sách đã lưu
//   5. Real-time SSE Streaming (streamGenerateContent): phản hồi chữ chạy mượt mà theo thời gian thực
import { Book } from '../types/book';
import { fetchLiveBooks, AdvisorBook } from './googleBooks';

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
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-pro',
] as const;

const FAVORITES_STORAGE_KEY = 'websach-favorites-v1';

export function hasGeminiKey(): boolean {
  return Boolean(KEY && KEY.length > 10 && !KEY.includes('PASTE'));
}

export const EXACT_BOOK_RECOMMENDER_PROMPT = `# NHIỆM VỤ CỐT LÕI CỦA BẠN
Bạn là **BookMind AI** — một người bạn tri kỷ thông thái, tinh tế và am hiểu sâu sắc về sách. Khi người dùng chia sẻ bất kỳ câu nói, tâm sự, hoàn cảnh hay mục tiêu nào:
1. Lắng nghe sâu từng chi tiết và bối cảnh thực tế trong lời người dùng nói (kể cả ẩn ý hay nỗi niềm chưa nói hết).
2. Kết nối mạch trò chuyện trước đó (nếu có) và gu đọc từ Tủ sách yêu thích của người dùng để tư vấn tự nhiên, liền mạch.
3. Chọn ra **3 cuốn sách xuất sắc, có thật và khớp nhất** với hoàn cảnh đó (ưu tiên tránh lặp lại sách người dùng đã lưu trong Tủ sách yêu thích trừ khi họ hỏi trực tiếp).
4. Với mỗi cuốn sách, giải thích cụ thể và chân thành **vì sao cuốn sách đó khớp với chính câu nói/vấn đề của người dùng**, kèm theo lời khuyên thực tế dễ áp dụng ngay.

# QUY TẮC TRÌNH BÀY KHI TRẢ LỜI TRỰC TIẾP BẰNG MARKDOWN
- Không mở đầu sáo rỗng, đi thẳng vào danh sách 3 cuốn sách.
- Trình bày đúng cấu trúc sau cho mỗi cuốn sách:

### 1. [Tên Sách] – [Tên Tác Giả]
- **Chấm điểm độ khớp:** [Số điểm]/10
- **Chi tiết trong lời bạn nói:** "[Trích dẫn lại cụm từ/ý quan trọng trong lời chat của người dùng]"
- **Vì sao cuốn sách này dành riêng cho bạn:**
  - **Giải quyết trực tiếp:** [Chỉ rõ chương/ý tưởng hoặc phương pháp cốt lõi trong sách xử lý đúng chi tiết vừa trích dẫn ở trên]
  - **Giá trị thực tế nhận được:** [Bài học/hành động cụ thể người dùng áp dụng được ngay sau khi đọc]

---

### 2. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*

---

### 3. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*`;

/**
 * Schema JSON chuẩn OpenAPI 3.0 cho Bước 1 (decideSearch)
 */
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

/**
 * Schema JSON chuẩn OpenAPI 3.0 cho Bước 2 (composeTurn)
 */
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

/**
 * Đọc danh sách sách người dùng đã lưu trong Tủ sách yêu thích (localStorage)
 * để cá nhân hóa gợi ý và tránh gợi ý trùng sách đã có.
 */
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
    return `\n[Hồ sơ cá nhân hóa - Sách người dùng đã lưu yêu thích: ${summaries.join('; ')}. Hãy thấu hiểu gu đọc này và ưu tiên gợi ý những đầu sách MỚI chưa nằm trong danh sách đã lưu.]`;
  } catch {
    return '';
  }
}

/**
 * Trích xuất tóm tắt hội thoại gần nhất từ advisorStore để AI nhớ ngữ cảnh đa lượt
 */
function getRecentAdvisorContext(): string {
  const history = savedMessages.filter((m) => m.id !== 'welcome');
  // Bỏ phần tử cuối nếu đó chính là tin nhắn user vừa gửi vào store
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

  return `\n[Lịch sử trò chuyện gần đây để giữ mạch ngữ cảnh:\n${lines.join('\n')}]`;
}

/**
 * Trích xuất phần text trả lời thực tế từ candidate của Gemini,
 * tự động bỏ qua các part suy nghĩ nội bộ (`thought: true`) của dòng model Thinking.
 */
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

/**
 * Gọi hệ thống đa mô hình Gemini Free Tier (gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-2.5-pro)
 * kết hợp System Instruction, Structured Output Schema và Exponential Backoff + Jitter.
 */
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
    temperature: expectJson ? 0.45 : 0.65,
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

        // Nếu gặp 429 (Rate Limit) hoặc 500/503: thử backoff rồi chuyển sang model Free Tier tiếp theo
        if (res.status === 429 || res.status >= 500) {
          if (attempt < maxRetriesPerModel) {
            attempt++;
            const jitter = Math.floor(Math.random() * 250);
            const delayMs = Math.pow(2, attempt) * 500 + jitter;
            console.warn(
              `[GeminiAdvisor] ${modelName} gặp HTTP ${res.status}, thử lại ${attempt}/${maxRetriesPerModel} sau ${delayMs}ms...`
            );
            await wait(delayMs);
            continue;
          }
          console.warn(
            `[GeminiAdvisor] Chuyển tiếp từ ${modelName} sang mô hình Free Tier dự phòng tiếp theo...`
          );
          break;
        }

        // Nếu model không khả dụng (404/400), chuyển ngay sang model tiếp theo trong chuỗi
        lastError = new Error(`Gemini ${modelName} HTTP ${res.status}`);
        break;
      } catch (err: unknown) {
        lastError = err;
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

// Bước 1: phân tích ý định sâu sắc có kèm ngữ cảnh hội thoại & tủ sách yêu thích
async function decideSearch(userText: string): Promise<{
  searchQuery: string;
  alternateQuery?: string;
  categoryFilter?: string;
  isTrending: boolean;
  analysis: string;
  followUpQuestion: string;
  followUpSuggestions: string[];
}> {
  const contextBlock = `${getRecentAdvisorContext()}${getFavoritesContextSummary()}`;

  const prompt = `Người dùng nói: "${userText}"${contextBlock}

Hãy phân tích kỹ nút thắt cốt lõi và chọn từ khóa giải pháp tiếng Việt chuẩn xác nhất để truy vấn Google Books.
Trả về JSON theo đúng cấu trúc yêu cầu:
- coreProblem: 1 câu phân tích nút thắt cốt lõi thực sự của người dùng
- searchQuery: Từ khóa tiếng Việt giải pháp tối ưu cho Google Books (2-4 từ, vd: "kỹ năng lãnh đạo", "quản trị cảm xúc", "nghệ thuật giao tiếp")
- alternateQuery: Từ khóa giải pháp thay thế nếu từ khóa chính ít sách
- categoryFilter: thể loại tiếng Anh chuẩn Google nếu phù hợp (Psychology, Self-Help, Business, Fiction, Technology) hoặc null
- isTrending: true nếu người dùng hỏi sách hay nhất/bán chạy/xu hướng/nên đọc, ngược lại false
- analysis: 2-3 câu đồng cảm ấm áp, thấu hiểu tình cảnh của người bạn và dẫn dắt giải pháp
- followUpQuestion: câu hỏi gợi mở 2 nhánh A/B ngắn gọn
- followUpSuggestions: 3 gợi ý câu hỏi ngắn (dưới 8 từ) đào sâu vấn đề và cách hành động`;

  const raw = await callGemini(prompt, {
    expectJson: true,
    responseSchema: DECIDE_SEARCH_SCHEMA,
  });
  const j = parseJson(raw) || {};

  const followUpSuggestions: string[] = Array.isArray(j.followUpSuggestions)
    ? j.followUpSuggestions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
    : [
        'Kế hoạch áp dụng từng bước',
        'Cách giải quyết mâu thuẫn này',
        'Sách rèn luyện tâm lý vững vàng',
      ];

  return {
    searchQuery: String(j.searchQuery || userText).slice(0, 120),
    alternateQuery: j.alternateQuery ? String(j.alternateQuery).slice(0, 120) : undefined,
    categoryFilter:
      j.categoryFilter && j.categoryFilter !== 'null' ? String(j.categoryFilter) : undefined,
    isTrending: Boolean(j.isTrending),
    analysis: String(j.analysis || ''),
    followUpQuestion: String(j.followUpQuestion || ''),
    followUpSuggestions,
  };
}

// Bước 2: nhận danh sách sách → soạn analysis + matchReason chi tiết dạng bạn bè
async function composeTurn(
  userText: string,
  plan: { analysis: string; followUpQuestion: string; followUpSuggestions: string[] },
  books: AdvisorBook[],
  isFallback: boolean,
  errorCode?: string
): Promise<AdvisorTurn> {
  const compact = books.map((b) => ({
    id: b.id,
    title: b.title,
    authors: b.authors,
    category: b.category,
    rating: b.rating,
    description: b.description.slice(0, 220),
  }));

  const contextBlock = `${getRecentAdvisorContext()}${getFavoritesContextSummary()}`;

  const prompt = `Người dùng nói: "${userText}".
Ghi chú phân tích ban đầu: "${plan.analysis || '(không có)'}".${contextBlock}

Danh sách sách lấy được từ hệ thống (ưu tiên chọn trong đây cuốn thực sự giải quyết nút thắt cốt lõi):
${JSON.stringify(compact, null, 1)}

Nhiệm vụ của bạn:
1. Chọn từ 1 đến 3 cuốn sách (lý tưởng nhất là 2 cuốn) thực sự giải quyết đúng trăn trở sâu xa của người bạn. Nếu có cuốn không phù hợp chủ đề thực sự, hãy loại bỏ.
2. Với mỗi cuốn sách được chọn, viết "matchReason" chi tiết, đầy đặn theo đúng 2 phần:
   - **Chia sẻ từ người bạn:** Viết 3-5 câu chi tiết, chỉ rõ cuốn sách này sẽ tháo gỡ khó khăn của bạn ra sao.
   - **Lời khuyên thực tế cho bạn:** Viết 2-3 câu hướng dẫn áp dụng ngay hoặc chỉ rõ chương sách nên đọc trước tiên.`;

  const raw = await callGemini(prompt, {
    expectJson: true,
    responseSchema: COMPOSE_TURN_SCHEMA,
  });
  const j = parseJson(raw) || {};
  const byId = new Map(books.map((b) => [b.id, b]));
  const picked: AdvisorBook[] = [];

  if (Array.isArray(j.recommendedBooks)) {
    for (const r of j.recommendedBooks as Array<Record<string, unknown>>) {
      const base = byId.get(String(r.id || ''));
      if (!base) continue;
      picked.push({ ...base, matchReason: String(r.matchReason || base.matchReason || '') });
    }
  }

  // Nếu Gemini không parse được hoặc danh sách rỗng, lấy 2 cuốn đầu kèm lời nhắn ấm áp
  const list = picked.length
    ? picked
    : books.slice(0, 2).map((b) => ({
        ...b,
        matchReason:
          b.matchReason ||
          `**Chia sẻ từ người bạn:** Mình chọn cuốn sách này cho bạn vì tác giả đúc kết nhiều kinh nghiệm thực tế rất sát với những gì bạn đang đối mặt: "${userText.slice(0, 60)}". Tác phẩm sẽ giúp bạn bình tâm nhìn nhận lại vấn đề và tìm ra lối đi nhẹ nhàng hơn.\n\n**Lời khuyên thực tế cho bạn:** Tối nay bạn có thể bắt đầu với chương đầu tiên hoặc phần mục lục, chọn ngay chủ đề làm bạn trăn trở nhất để đọc trước.`,
      }));

  const followUpSuggestions: string[] = Array.isArray(j.followUpSuggestions)
    ? j.followUpSuggestions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
    : plan.followUpSuggestions;

  return {
    systemAlert: isFallback ? alertFor(errorCode) : null,
    analysis: String(j.analysis || plan.analysis || ''),
    recommendedBooks: list,
    followUpQuestion: String(j.followUpQuestion || plan.followUpQuestion || ''),
    followUpSuggestions,
  };
}

// Bộ dựng cục bộ khi Gemini bị lỗi (offline / hết quota)
function localTurn(
  userText: string,
  books: AdvisorBook[],
  isFallback: boolean,
  errorCode?: string
): AdvisorTurn {
  const picked = books.slice(0, 2).map((b) => ({
    ...b,
    matchReason: `**Chia sẻ từ người bạn:** Mình cảm nhận được những băn khoăn và trăn trở trong chia sẻ của bạn: "${userText.slice(0, 70)}". Cuốn sách này như một người bạn đồng hành dày dạn kinh nghiệm, mang đến cho bạn góc nhìn tỉnh táo và những phương pháp gỡ rối từng nút thắt một cách bền vững.\n\n**Lời khuyên thực tế cho bạn:** Hãy dành khoảng 20 phút mỗi tối trong không gian yên tĩnh để đọc và ghi chú lại 1 hành động nhỏ bạn có thể áp dụng ngay vào ngày mai.`,
  }));

  const dynamicSuggestions = [
    `Cách áp dụng thực tế giải pháp này`,
    `Phương pháp rèn luyện tâm lý vững vàng`,
    `Kế hoạch hành động từng bước`,
  ];

  return {
    systemAlert: isFallback ? alertFor(errorCode) : null,
    analysis:
      'Mình đã lắng nghe và cảm nhận sâu sắc những gì bạn đang trải qua. Dưới đây là những cuốn sách tâm đắc và thiết thực nhất mình chọn riêng cho bạn lúc này.',
    recommendedBooks: picked,
    followUpQuestion:
      'Bạn muốn tìm hiểu thêm về hướng tháo gỡ tâm lý hay phương pháp hành động cụ thể hơn?',
    followUpSuggestions: dynamicSuggestions,
  };
}

/** Hàm chính: nhận câu người dùng → phân tích sâu → lấy sách Google Books → trả về lượt tư vấn hoàn chỉnh */
export async function askAdvisor(userText: string): Promise<AdvisorTurn> {
  try {
    const plan = await decideSearch(userText);
    let result = await fetchLiveBooks(plan.searchQuery, plan.categoryFilter, plan.isTrending);

    // Nếu từ khóa đầu cho quá ít sách mà có alternateQuery thì thử thêm
    if (result.books.length < 2 && plan.alternateQuery) {
      try {
        const altResult = await fetchLiveBooks(plan.alternateQuery, plan.categoryFilter);
        if (altResult.books.length > 0) {
          const existingIds = new Set(result.books.map((b) => b.id));
          const more = altResult.books.filter((b) => !existingIds.has(b.id));
          result = { ...result, books: [...result.books, ...more] };
        }
      } catch {
        /* giữ kết quả hiện tại */
      }
    }

    if (!result.books.length) return localTurn(userText, [], true, result.errorCode);
    return await composeTurn(userText, plan, result.books, result.isFallback, result.errorCode);
  } catch {
    // Gemini lỗi: vẫn lấy sách thật từ Google Books rồi dựng cục bộ với văn phong bạn bè
    try {
      const result = await fetchLiveBooks(userText);
      return localTurn(userText, result.books, result.isFallback, result.errorCode);
    } catch {
      return localTurn(userText, [], true, 'UNKNOWN');
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

function buildRecommendationFromReply(replyText: string, books: Book[]): GeminiRecommendation {
  const suggestedTitles = extractTitlesFromMarkdown(replyText);

  const suggestedBookIds = books
    .filter((b) =>
      suggestedTitles.some(
        (t) =>
          t &&
          (b.title.toLowerCase().includes(t.toLowerCase()) ||
            t.toLowerCase().includes(b.title.toLowerCase()))
      )
    )
    .map((b) => b.id);

  const followUpSuggestions =
    suggestedTitles.length >= 2
      ? [
          `Tìm hiểu thêm: ${suggestedTitles[0]}`,
          `Tìm hiểu thêm: ${suggestedTitles[1]}`,
          'Kế hoạch áp dụng vào thực tế',
        ]
      : ['Giải pháp áp dụng ngay', 'Cách tháo gỡ hoàn cảnh này', 'Góc nhìn mở rộng'];

  return {
    replyText,
    suggestedBookIds,
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
  if (!hasGeminiKey()) {
    throw new Error('Thiếu Gemini API key');
  }

  const catalogPreview = books
    .slice(0, 18)
    .map((b) => `- ${b.title} – ${b.author} (${b.genre})`)
    .join('\n');

  const prompt = `Lời chat của người dùng: "${userText}"${getFavoritesContextSummary()}
${
  catalogPreview
    ? `\n[Danh sách sách hiện có trên kệ hệ thống (ưu tiên chọn nếu thật sự khớp, hoặc chọn sách nổi tiếng có thật ngoài đời):\n${catalogPreview}]`
    : ''
}`;

  const rawText = await callGemini(prompt, {
    expectJson: false,
    systemInstruction: EXACT_BOOK_RECOMMENDER_PROMPT,
    historyContents: buildFloatingChatHistory(chatHistory),
  });

  return buildRecommendationFromReply(rawText.trim(), books);
}

/**
 * Phản hồi Streaming theo thời gian thực (SSE) cho khung chat nổi:
 * - Gọi `:streamGenerateContent?alt=sse` trên chuỗi model Free Tier (`gemini-3.8-flash` -> `gemini-3.5-flash-lite`)
 * - Cập nhật từng cụm từ ngay khi AI đang viết qua callback `onChunk`
 * - Tự động fallback sang `generateWithGemini` nếu trình duyệt/mạng chặn stream
 */
export async function generateWithGeminiStream(
  userText: string,
  books: Book[],
  onChunk: (partialText: string) => void,
  chatHistory?: Array<{ sender: 'user' | 'assistant'; text: string }>
): Promise<GeminiRecommendation> {
  if (!hasGeminiKey() || !KEY) {
    throw new Error('Thiếu Gemini API key');
  }

  const catalogPreview = books
    .slice(0, 18)
    .map((b) => `- ${b.title} – ${b.author} (${b.genre})`)
    .join('\n');

  const prompt = `Lời chat của người dùng: "${userText}"${getFavoritesContextSummary()}
${
  catalogPreview
    ? `\n[Danh sách sách hiện có trên kệ hệ thống (ưu tiên chọn nếu thật sự khớp, hoặc chọn sách nổi tiếng có thật ngoài đời):\n${catalogPreview}]`
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
            temperature: 0.65,
          },
        }),
      });

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
        return buildRecommendationFromReply(accumulated.trim(), books);
      }
    } catch {
      // Thử model tiếp theo trong chuỗi Free Tier
    }
  }

  // Fallback về chế độ gọi chuẩn nếu SSE stream không khả dụng
  const finalResult = await generateWithGemini(userText, books, chatHistory);
  onChunk(finalResult.replyText);
  return finalResult;
}
