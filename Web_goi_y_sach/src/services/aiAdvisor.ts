// AI Book Advisor — mô hình ngôn ngữ đóng vai trò người bạn cố vấn sách thông minh:
//   Bước 1: Phân tích sâu tâm lý & bản chất vấn đề (dù câu hỏi phức tạp) → { searchQuery, alternateQuery, categoryFilter, analysis, followUpQuestion, followUpSuggestions }
//   Bước 2: Đối soát danh sách sách → chọn đúng sách giải quyết triệt để vấn đề, viết lý do như người bạn tâm tình + lời khuyên hành động chi tiết.
// Nếu Gemini lỗi (thiếu key / mất mạng / 429) → dùng bộ phân tích dự phòng thông minh.
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
const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export function hasGeminiKey(): boolean {
  return Boolean(KEY && KEY.length > 10 && !KEY.includes('PASTE'));
}

export const EXACT_BOOK_RECOMMENDER_PROMPT = `# NHIỆM VỤ DUY NHẤT CỦA BẠN
Bạn là một Hệ thống Gợi ý Sách Chính xác Tuyệt đối. Nhiệm vụ của bạn là đọc lời chat của người dùng và trả về NGAY LẬP TỨC danh sách 3 cuốn sách khớp hoàn toàn với những chi tiết, hoàn cảnh và cảm xúc có trong lời chat đó.

# QUY TẮC CẤM (BẮT BUỘC TUÂN THỦ)
1. TUYỆT ĐỐI KHÔNG chào hỏi, không dẫn nhập (Ví dụ: Cấm viết "Chào bạn", "Mình hiểu cảm giác của bạn", "Dưới đây là 3 cuốn sách...").
2. TUYỆT ĐỐI KHÔNG viết lời kết, không chúc tụng, không đặt câu hỏi ngược lại ở cuối bài.
3. TUYỆT ĐỐI KHÔNG gợi ý sách chung chung, sáo rỗng (như Đắc Nhân Tâm, Nhà Giả Kim) nếu chúng không khớp trực tiếp với chi tiết cụ thể trong lời chat.
4. TUYỆT ĐỐI KHÔNG bịa ra tên sách hoặc tình tiết không có thật. Chỉ chọn sách có thật 100%, đúng tên tác giả.
5. Bắt đầu câu trả lời ngay bằng cuốn sách số 1.

# QUY TẮC CHỌN SÁCH BÁM SÁT LỜI CHAT
Trước khi đưa ra kết quả, hãy ngầm tách từng từ khóa, sự việc, bối cảnh (ví dụ: thất nghiệp, cãi nhau với người yêu, mưa đêm, áp lực tiền bạc, chán nản...) và cảm xúc trong lời chat của người dùng. Chọn ra đúng 3 cuốn sách:
- Cuốn 1: Có cốt truyện, nhân vật hoặc bối cảnh đời thực GIỐNG HỆT hoàn cảnh trong lời chat.
- Cuốn 2: Phân tích và giải quyết trực diện vấn đề hoặc cảm xúc mà người dùng đang nhắc tới.
- Cuốn 3: Mở ra một góc nhìn mới hoặc lối thoát cho đúng tình huống trong lời chat.

# ĐỊNH DẠNG TRẢ LỜI BẮT BUỘC (CHỈ TRẢ VỀ ĐÚNG KHUNG NÀY)

### 1. [Tên Sách] – [Tên Tác Giả]
* **Thể loại & Tình trạng:** [Thể loại chi tiết] | [Đã xuất bản tiếng Việt / Sách tiếng Anh]
* **Đối chiếu trực tiếp với lời chat của bạn:**
  - *Chi tiết bạn nhắc đến:* "[Trích dẫn lại chính xác từ ngữ/chi tiết/cảm xúc trong lời chat của người dùng]"
  - *Điểm khớp hoàn toàn trong sách:* [Giải thích cụ thể vì sao cuốn sách này khớp 100% với chi tiết vừa trích dẫn ở trên. Nhân vật hay nội dung sách có điểm gì giống hệt hoàn cảnh của người dùng?]
* **Nội dung chi tiết của sách:** [Tóm tắt sâu sắc cốt truyện hoặc hệ thống luận điểm chính của sách trong khoảng 150-200 chữ. Nêu rõ bối cảnh, nhân vật và vấn đề trung tâm, không viết chung chung].
* **Tình tiết / Trích dẫn đắt giá nhất:** [Mô tả 1 cảnh cụ thể trong sách, 1 hoàn cảnh của nhân vật, hoặc 1 câu trích dẫn có thật trong sách chạm đúng vào câu chuyện người dùng vừa nói].
* **Giá trị nhận được sau khi đọc:** [Cuốn sách này giải quyết được gì cho đúng trạng thái hiện tại của người dùng?].

---

### 2. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*

---

### 3. [Tên Sách] – [Tên Tác Giả]
*(Trình bày đầy đủ các mục giống hệt cuốn 1)*`;

/**
 * Tiện ích chờ thời gian mili-giây
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gọi Google Gemini 2.0 Flash với cơ chế Exponential Backoff & Jitter:
 * - Tự động thử lại tối đa 3 lần khi gặp HTTP 429 (Rate Limit) hoặc HTTP 503 (Overloaded)
 * - Tăng thời gian chờ theo lũy tiến: 800ms -> 1600ms -> 3200ms (+ random jitter)
 */
async function callGemini(prompt: string, expectJson = true, maxRetries = 2): Promise<string> {
  if (!KEY) throw new Error('NO_KEY');
  const generationConfig: Record<string, unknown> = { temperature: 0.6 };
  if (expectJson) {
    generationConfig.responseMimeType = 'application/json';
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      // Xử lý mã lỗi Rate Limit 429 hoặc Server 500/503: thử lại với backoff
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        attempt++;
        const jitter = Math.floor(Math.random() * 300);
        const delayMs = Math.pow(2, attempt) * 600 + jitter;
        console.warn(`[GeminiAdvisor] Gặp mã HTTP ${res.status}, đang thử lại lần ${attempt}/${maxRetries} sau ${delayMs}ms...`);
        await wait(delayMs);
        continue;
      }

      throw new Error(`Gemini HTTP ${res.status}`);
    } catch (err: unknown) {
      if (attempt < maxRetries && (err as Error)?.message?.includes('fetch')) {
        attempt++;
        await wait(Math.pow(2, attempt) * 500);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Gemini API Max Retries Exceeded');
}

function parseJson(raw: string): Record<string, unknown> | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const alertFor = (code?: string) =>
  '⚠️ Không kết nối được trực tiếp tới Google Books nên mình đang dùng kho sách tuyển chọn dự phòng.' +
  (code ? ` (mã: ${code})` : '');

// Bước 1: phân tích ý định sâu sắc
async function decideSearch(userText: string): Promise<{
  searchQuery: string;
  alternateQuery?: string;
  categoryFilter?: string;
  isTrending: boolean;
  analysis: string;
  followUpQuestion: string;
  followUpSuggestions: string[];
}> {
  const prompt = `${EXACT_BOOK_RECOMMENDER_PROMPT}

Người dùng nói: "${userText}"

Hãy phân tích kỹ nút thắt cốt lõi và chọn từ khóa giải pháp tiếng Việt chuẩn xác nhất để truy vấn Google Books.
Trả về DUY NHẤT một JSON đúng cấu trúc (không kèm chữ nào khác ngoài JSON):
{
  "coreProblem": "1 câu phân tích nút thắt cốt lõi thực sự của người dùng",
  "searchQuery": "Từ khóa tiếng Việt giải pháp tối ưu cho Google Books (2-4 từ, vd: 'kỹ năng lãnh đạo', 'quản trị cảm xúc', 'nghệ thuật giao tiếp')",
  "alternateQuery": "Từ khóa giải pháp thay thế nếu từ khóa chính ít sách",
  "categoryFilter": "thể loại tiếng Anh chuẩn Google nếu phù hợp (Psychology, Self-Help, Business, Fiction, Technology) hoặc null",
  "isTrending": true nếu người dùng hỏi sách hay nhất/bán chạy/xu hướng/nên đọc, ngược lại false,
  "analysis": "2-3 câu đồng cảm ấm áp, thấu hiểu tình cảnh của người bạn và dẫn dắt giải pháp",
  "followUpQuestion": "câu hỏi gợi mở 2 nhánh A/B ngắn gọn (vd: Bạn muốn tập trung vào kỹ năng xử lý tình huống ngay hay rèn luyện tâm lý đường dài?)",
  "followUpSuggestions": [
    "Gợi ý câu hỏi ngắn 1 (dưới 8 từ, đào sâu vấn đề)",
    "Gợi ý câu hỏi ngắn 2 (dưới 8 từ, về cách hành động)",
    "Gợi ý câu hỏi ngắn 3 (dưới 8 từ, về giải pháp khác)"
  ]
}`;

  const raw = await callGemini(prompt);
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
    categoryFilter: j.categoryFilter ? String(j.categoryFilter) : undefined,
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

  const prompt = `${EXACT_BOOK_RECOMMENDER_PROMPT}

Người dùng nói: "${userText}".
Ghi chú phân tích ban đầu: "${plan.analysis || '(không có)'}".

Danh sách sách lấy được từ hệ thống (ưu tiên chọn trong đây cuốn thực sự giải quyết nút thắt cốt lõi):
${JSON.stringify(compact, null, 1)}

Nhiệm vụ của bạn:
1. Chọn từ 1 đến 3 cuốn sách (lý tưởng nhất là 2 cuốn) thực sự giải quyết đúng trăn trở sâu xa của người bạn. Nếu có cuốn không phù hợp chủ đề thực sự, hãy loại bỏ.
2. Với mỗi cuốn sách được chọn, viết "matchReason" chi tiết, đầy đặn theo đúng 2 phần:
   - **Chia sẻ từ người bạn:** Viết 3-5 câu chi tiết, chỉ rõ cuốn sách này sẽ tháo gỡ khó khăn của bạn ra sao.
   - **Lời khuyên thực tế cho bạn:** Viết 2-3 câu hướng dẫn áp dụng ngay hoặc chỉ rõ chương sách nên đọc trước tiên.

Trả về DUY NHẤT một JSON đúng cấu trúc:
{
  "analysis": "2-3 câu ấm áp, thấu cảm sâu sắc như một người bạn tri kỷ chia sẻ tâm tư và dẫn vào sách gợi ý.",
  "recommendedBooks": [
    {
      "id": "đúng id trong danh sách trên",
      "matchReason": "**Chia sẻ từ người bạn:** [3-5 câu giải thích chân thành, cụ thể tại sao cuốn này giải quyết nút thắt của bạn]\\n\\n**Lời khuyên thực tế cho bạn:** [2-3 câu lời khuyên hành động dễ làm ngay hôm nay hoặc chương sách cần đọc]"
    }
  ],
  "followUpQuestion": "câu hỏi gợi mở 2 nhánh A/B ngắn gọn",
  "followUpSuggestions": [
    "Câu hỏi gợi ý 1 liên quan mật thiết",
    "Câu hỏi gợi ý 2",
    "Câu hỏi gợi ý 3"
  ]
}`;

  const raw = await callGemini(prompt);
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

/** Gợi ý sách chuẩn xác tuyệt đối bám sát từng chi tiết lời chat người dùng */
export async function generateWithGemini(
  userText: string,
  books: Book[]
): Promise<GeminiRecommendation> {
  if (!hasGeminiKey()) {
    throw new Error('Thiếu Gemini API key');
  }

  const prompt = `${EXACT_BOOK_RECOMMENDER_PROMPT}

---
Lời chat của người dùng: "${userText}"`;

  // Gọi Gemini trả về trực tiếp Markdown (không ép JSON để bắt đầu ngay lập tức bằng ### 1.)
  const rawText = await callGemini(prompt, false);
  const replyText = rawText.trim();

  // Trích xuất tên các cuốn sách được gợi ý
  const suggestedTitles = extractTitlesFromMarkdown(replyText);

  // Đối chiếu với danh sách sách hiện có trong hệ thống
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

  // Sinh các nút gợi ý đào sâu năng động cho giao diện
  const followUpSuggestions =
    suggestedTitles.length >= 2
      ? [
          `Tìm hiểu thêm: ${suggestedTitles[0]}`,
          `Tìm hiểu thêm: ${suggestedTitles[1]}`,
          'Kế hoạch áp dụng vào thực tế',
        ]
      : [
          'Giải pháp áp dụng ngay',
          'Cách tháo gỡ hoàn cảnh này',
          'Góc nhìn mở rộng',
        ];

  return {
    replyText,
    suggestedBookIds,
    followUpSuggestions,
  };
}
