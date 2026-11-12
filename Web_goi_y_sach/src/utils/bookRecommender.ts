import { Book, FilterState, BookStyle } from '../types/book';

export interface RecommendationCriteria {
  query?: string;
  goalId?: string;
  preferredLength?: 'all' | 'short' | 'medium' | 'long';
  style?: BookStyle | 'all';
}

export interface ScoredBook {
  book: Book;
  score: number;
  matchReasons: string[];
}

export interface UserIntentAnalysis {
  domainId: string;
  domainLabel: string;
  coreTopic: string;
  searchQuery: string;
  alternateQuery: string;
  categoryFilter?: string;
  mustMatchTerms: string[];
  forbiddenTerms: string[];
  analysisText: string;
  actionAdvice: string;
  followUpQuestion: string;
  followUpSuggestions: string[];
}

export function normalizeVietnamese(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Kiểm tra từ hoặc cụm từ nguyên vẹn (whole-word/phrase boundary),
 * tuyệt đối không bắt nhầm chuỗi con (ví dụ: "ai" trong "tai chinh", hay "bi" trong "bi quyet").
 */
export function containsWholePhrase(normalizedHaystack: string, normalizedNeedle: string): boolean {
  const cleanNeedle = normalizeVietnamese(normalizedNeedle);
  if (!cleanNeedle) return false;
  const escaped = cleanNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  return regex.test(normalizedHaystack);
}

/**
 * Chuẩn hóa các lỗi gõ phổ biến trong tiếng Việt khi chat nhanh:
 * - "mảng al", "về al", "học al", "con al", "công nghệ al" -> "ai" (Trí tuệ nhân tạo)
 */
export function normalizeChatTypos(rawText: string): string {
  let norm = normalizeVietnamese(rawText);
  // Người dùng rất hay gõ chữ "al" (chữ L thường) thay vì "AI" (chữ I hoa)
  norm = norm.replace(
    /\b(mang|ve|hoc|lam|nganh|cong nghe|ung dung|phat trien|tim hieu|con|cai|he thong)\s+al\b/g,
    '$1 ai'
  );
  norm = norm.replace(/\bal\s+(agent|chatbot|hoc may|cong nghe|tuong lai)\b/g, 'ai $1');
  if (norm === 'al') norm = 'ai';
  return norm;
}

interface IntentDomainRule {
  id: string;
  label: string;
  categoryFilter?: string;
  /** Các cụm từ đặc trưng (ưu tiên cụm dài và từ khóa chuyên ngành) */
  highPriorityPhrases: string[];
  /** Các từ đơn hoặc cụm ngắn bổ trợ */
  keywords: string[];
  /** Từ khóa chuẩn xác nhất để gọi Google Books API */
  searchQuery: string;
  alternateQuery: string;
  /** Các từ khóa phải xuất hiện trong sách để được chấm điểm khớp chủ đề cao */
  mustMatchTerms: string[];
  /** Các từ khóa lệch chủ đề cần bị trừ điểm nặng (tránh gợi ý râu ông nọ cắm cằm bà kia) */
  forbiddenTerms: string[];
  buildAnalysis: (userText: string) => string;
  actionAdvice: string;
  followUpQuestion: string;
  followUpSuggestions: string[];
}

const INTENT_DOMAINS: IntentDomainRule[] = [
  {
    id: 'health',
    label: 'Sức khỏe, Y học & Chăm sóc cơ thể',
    categoryFilter: 'Health',
    highPriorityPhrases: [
      'bi benh',
      'dang benh',
      'mac benh',
      'chua benh',
      'phong benh',
      'suc khoe',
      'cham soc suc khoe',
      'dinh duong',
      'mat ngu',
      'dau dau',
      'dau da day',
      'ung thu',
      'tieu duong',
      'huyet ap',
      'tim mach',
      'mien dich',
      'suy nhuoc co the',
      'phuc hoi suc khoe',
      'song khoe',
      'y hoc',
      'co the khoe manh',
      'an uong lanh manh',
      'nhanimoto',
      'enzim',
      'duong sinh',
    ],
    keywords: ['benh', 'om', 'dau', 'khoe', 'thuoc', 'bac si', 'co the', 'giac ngu', 'vitamin', 'an chay'],
    searchQuery: 'chăm sóc sức khỏe dinh dưỡng y học',
    alternateQuery: 'phục hồi sức khỏe tự chữa lành cơ thể',
    mustMatchTerms: [
      'suc khoe',
      'dinh duong',
      'y hoc',
      'benh',
      'co the',
      'giac ngu',
      'mien dich',
      'song khoe',
      'bac si',
      'an uong',
      'chua lanh',
      'enzyme',
      'duong sinh',
    ],
    forbiddenTerms: [
      'tai chinh',
      'chung khoan',
      'khoi nghiep',
      'bat dong san',
      'lam giau',
      'marketing',
      'ban hang',
      'quan tri doanh nghiep',
    ],
    buildAnalysis: (userText) =>
      `Mình rất chia sẻ khi nghe bạn nhắc đến tình trạng sức khỏe qua lời nhắn: "${userText}". Khi cơ thể đang mệt mỏi hoặc gặp vấn đề sức khỏe, điều quan trọng nhất là hiểu đúng cơ chế tự phục hồi của cơ thể, chế độ dinh dưỡng khoa học và lối sống dưỡng sinh. Mình đã lọc riêng những cuốn sách y học thường thức & chăm sóc sức khỏe thiết thực nhất cho bạn.`,
    actionAdvice:
      'Bạn nên đọc chậm từng chương liên quan trực tiếp đến triệu chứng hoặc chế độ ăn uống, giấc ngủ hiện tại; kết hợp ghi chú lại các thói quen sinh hoạt lành mạnh để áp dụng song song với chỉ dẫn của bác sĩ.',
    followUpQuestion:
      'Bạn muốn ưu tiên tìm sách về chế độ dinh dưỡng tự nhiên phục hồi cơ thể hay sách y học chăm sóc giấc ngủ và hệ miễn dịch?',
    followUpSuggestions: [
      'Sách dinh dưỡng phục hồi cơ thể',
      'Cách tăng cường hệ miễn dịch tự nhiên',
      'Chăm sóc giấc ngủ và giảm mệt mỏi',
    ],
  },
  {
    id: 'ai_tech',
    label: 'Trí tuệ nhân tạo (AI) & Công nghệ',
    categoryFilter: 'Technology',
    highPriorityPhrases: [
      'tri tue nhan tao',
      'mang ai',
      've ai',
      'hoc ai',
      'cong nghe ai',
      'ung dung ai',
      'phat trien ai',
      'tim hieu ai',
      'machine learning',
      'deep learning',
      'hoc may',
      'hoc sau',
      'du lieu lon',
      'big data',
      'data science',
      'khoa hoc du lieu',
      'chatgpt',
      'generative ai',
      'ky nguyen ai',
      'tuong lai ai',
      'chuyen doi so',
      'robot',
      'tu dong hoa',
    ],
    keywords: ['ai', 'algorithm', 'thuat toan', 'neural'],
    searchQuery: 'trí tuệ nhân tạo AI công nghệ',
    alternateQuery: 'kỷ nguyên trí tuệ nhân tạo tương lai công nghệ',
    mustMatchTerms: [
      'tri tue nhan tao',
      'ai',
      'cong nghe',
      'du lieu',
      'hoc may',
      'so hoa',
      'thuat toan',
      'may tinh',
      'ky thuat so',
      'tuong lai',
      'robot',
      'chatgpt',
    ],
    forbiddenTerms: [
      'bat dong san',
      'nuoi day con',
      'nau an',
      'tieu thuyet tinh cam',
    ],
    buildAnalysis: (userText) =>
      `Bám sát mong muốn phát triển về mảng Trí tuệ nhân tạo (AI) trong chia sẻ của bạn: "${userText}", mình đã loại bỏ hoàn toàn các sách kinh doanh/khởi nghiệp chung chung để chọn đúng những tác phẩm chuyên sâu về Trí tuệ nhân tạo (AI), tư duy dữ liệu và cách làm chủ công nghệ trong kỷ nguyên mới.`,
    actionAdvice:
      'Hãy bắt đầu từ các chương phân tích bản chất hoạt động của AI và các tình huống ứng dụng thực tế vào công việc, sau đó thực hành áp dụng ngay công cụ AI vào dự án cá nhân của bạn.',
    followUpQuestion:
      'Bạn muốn đi sâu vào ứng dụng AI thực chiến trong công việc hay tìm hiểu nền tảng thuật toán, học máy (Machine Learning) và tương lai của AI?',
    followUpSuggestions: [
      'Sách ứng dụng AI vào công việc',
      'Nền tảng Machine Learning & Dữ liệu',
      'Tương lai loài người trong kỷ nguyên AI',
    ],
  },
  {
    id: 'programming_it',
    label: 'Lập trình, Phần mềm & Khoa học máy tính',
    categoryFilter: 'Computers',
    highPriorityPhrases: [
      'lap trinh',
      'hoc code',
      'viet code',
      'ky su phan mem',
      'phat trien phan mem',
      'khoa hoc may tinh',
      'cau truc du lieu',
      'clean code',
      'thiet ke he thong',
      'an ninh mang',
      'bao mat',
      'lap trinh web',
      'nganh it',
      'cong nghe thong tin',
    ],
    keywords: ['code', 'coder', 'developer', 'phan mem', 'python', 'javascript', 'java', 'backend', 'frontend'],
    searchQuery: 'lập trình phần mềm công nghệ thông tin',
    alternateQuery: 'khoa học máy tính thuật toán lập trình viên',
    mustMatchTerms: [
      'lap trinh',
      'phan mem',
      'may tinh',
      'code',
      'thuat toan',
      'he thong',
      'cong nghe thong tin',
      'du lieu',
      'mang',
    ],
    forbiddenTerms: ['tinh yeu', 'nau an', 'duong sinh'],
    buildAnalysis: (userText) =>
      `Với mục tiêu phát triển kỹ năng lập trình và công nghệ phần mềm mà bạn chia sẻ: "${userText}", mình đã chọn lọc những đầu sách nền tảng tư duy kỹ sư phần mềm, cấu trúc mã nguồn sạch và kiến trúc hệ thống sát nhất với lộ trình của bạn.`,
    actionAdvice:
      'Khi đọc sách công nghệ & lập trình, bạn nên vừa đọc vừa mở IDE thực hành viết lại các ví dụ mẫu và áp dụng quy tắc thiết kế vào project thực tế.',
    followUpQuestion:
      'Bạn đang muốn nâng cấp tư duy viết code sạch (Clean Code / Architecture) hay học thuật toán và kỹ năng giải quyết bài toán hệ thống?',
    followUpSuggestions: [
      'Tư duy Clean Code & kiến trúc phần mềm',
      'Thuật toán và cấu trúc dữ liệu',
      'Lộ trình phát triển sự nghiệp IT',
    ],
  },
  {
    id: 'healing_psychology',
    label: 'Tâm lý học, Chữa lành & Cân bằng cảm xúc',
    categoryFilter: 'Psychology',
    highPriorityPhrases: [
      'chua lanh',
      'tram cam',
      'lo au',
      'kiet suc',
      'burnout',
      'mat phuong huong',
      'ton thuong',
      'ap luc cuoc song',
      'cang thang',
      'co don',
      'buon chan',
      'tam ly hoc',
      'cam xuc',
      'binh yen',
      'vuot qua khung hoang',
      'nhay cam',
      'tu ti',
      'noi dau',
    ],
    keywords: ['stress', 'buon', 'khoc', 'met moi', 'tam ly', 'chan nan', 'lac long', 'an nhien', 'thau hieu'],
    searchQuery: 'tâm lý học chữa lành cảm xúc bình yên',
    alternateQuery: 'vượt qua căng thẳng thấu hiểu bản thân tâm lý',
    mustMatchTerms: [
      'tam ly',
      'chua lanh',
      'cam xuc',
      'binh yen',
      'hanh phuc',
      'noi tam',
      'thau hieu',
      'cang thang',
      'yeu thuong',
      'an nhien',
    ],
    forbiddenTerms: ['chung khoan', 'khoi nghiep', 'ke toan', 'bat dong san', 'marketing'],
    buildAnalysis: (userText) =>
      `Lắng nghe những tâm sự của bạn trong câu: "${userText}", mình hiểu bạn đang cần một khoảng lặng an toàn để vỗ về tâm trí và tháo gỡ những nút thắt cảm xúc bên trong. Dưới đây là những cuốn sách tâm lý & chữa lành sâu sắc, dịu dàng nhất dành cho bạn lúc này.`,
    actionAdvice:
      'Đừng ép bản thân phải đọc thật nhanh. Mỗi tối hãy đọc từ 10–15 trang trong không gian yên tĩnh và viết ra giấy những suy nghĩ đang làm bạn nặng lòng.',
    followUpQuestion:
      'Bạn muốn nghiêng về sách vỗ về cảm xúc nhẹ nhàng hay sách tâm lý học phân tích nguyên nhân gốc rễ của tổn thương và lo âu?',
    followUpSuggestions: [
      'Sách xoa dịu lo âu & kiệt sức',
      'Tâm lý học thấu hiểu đứa trẻ bên trong',
      'Phương pháp tìm lại bình yên nội tại',
    ],
  },
  {
    id: 'finance_investing',
    label: 'Tài chính cá nhân & Đầu tư',
    categoryFilter: 'Business',
    highPriorityPhrases: [
      'tai chinh ca nhan',
      'quan ly tai chinh',
      'quan ly chi tieu',
      'dau tu chung khoan',
      'co phieu',
      'bat dong san',
      'tu do tai chinh',
      'tiet kiem tien',
      'no nan',
      'lam giau',
      'dong tien',
      'ilai kep',
      'quy dau tu',
    ],
    keywords: ['tai chinh', 'dau tu', 'chung khoan', 'tien bac', 'tiet kiem', 'co tuc'],
    searchQuery: 'quản lý tài chính cá nhân đầu tư',
    alternateQuery: 'tư duy tài chính thịnh vượng đầu tư thông minh',
    mustMatchTerms: ['tai chinh', 'dau tu', 'tien', 'chung khoan', 'tiet kiem', 'gia san', 'lam giau', 'kinh te'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Dựa trên nhu cầu về quản lý tài chính và đầu tư bạn vừa nêu: "${userText}", mình đã chọn ra những cuốn sách kinh điển giúp xây dựng tư duy quản lý dòng tiền, kiểm soát rủi ro và tích lũy tài sản bền vững.`,
    actionAdvice:
      'Hãy bắt đầu bằng việc lập bảng theo dõi thu chi cá nhân và áp dụng ngay nguyên tắc phân bổ ngân sách từ chương đầu của sách trong tháng này.',
    followUpQuestion:
      'Bạn muốn ưu tiên học cách quản lý tài chính cá nhân căn bản hay đi sâu vào phân tích đầu tư sinh lời?',
    followUpSuggestions: [
      'Quản lý chi tiêu & thoát nợ',
      'Đầu tư chứng khoán cho người mới',
      'Tâm lý học về tiền bạc',
    ],
  },
  {
    id: 'business_startup',
    label: 'Khởi nghiệp, Kinh doanh & Quản trị',
    categoryFilter: 'Business',
    highPriorityPhrases: [
      'khoi nghiep',
      'mo cong ty',
      'kinh doanh',
      'ban hang',
      'chien luoc kinh doanh',
      'quan tri doanh nghiep',
      'thuong hieu',
      'mo quan',
      'buon ban',
      'khach hang',
    ],
    keywords: ['startup', 'marketing', 'sales', 'doanh nghiep', 'ceo', 'loi nhuan'],
    searchQuery: 'khởi nghiệp kinh doanh chiến lược quản trị',
    alternateQuery: 'marketing bán hàng phát triển doanh nghiệp',
    mustMatchTerms: ['kinh doanh', 'khoi nghiep', 'doanh nghiep', 'ban hang', 'marketing', 'quan tri', 'chien luoc', 'khach hang'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Từ mong muốn về kinh doanh và khởi nghiệp trong lời nhắn của bạn: "${userText}", mình gợi ý những cuốn sách thực chiến nhất về xây dựng mô hình kinh doanh tinh gọn, thấu hiểu khách hàng và vận hành doanh nghiệp hiệu quả.`,
    actionAdvice:
      'Hãy đối chiếu trực tiếp mô hình sản phẩm/dịch vụ bạn đang ấp ủ với các khung thử nghiệm thị trường (MVP) trong sách để tránh lãng phí nguồn lực.',
    followUpQuestion:
      'Bạn đang cần sách về tìm kiếm ý tưởng & khởi nghiệp tinh gọn hay sách về Marketing, bán hàng và mở rộng quy mô?',
    followUpSuggestions: [
      'Khởi nghiệp tinh gọn ít vốn',
      'Nghệ thuật bán hàng & Marketing',
      'Quản trị đội ngũ & vận hành',
    ],
  },
  {
    id: 'discipline_productivity',
    label: 'Kỷ luật, Thói quen & Hiệu suất làm việc',
    categoryFilter: 'Self-Help',
    highPriorityPhrases: [
      'tri hoan',
      'luoi bieng',
      'ky luat',
      'thoi quen',
      'quan ly thoi gian',
      'mat tap trung',
      'nang suat',
      'hieu suat',
      'muc tieu',
      'thay doi ban than',
      'day som',
    ],
    keywords: ['tap trung', 'cham chi', 'ke hoach', 'atomic habits', 'deep work'],
    searchQuery: 'kỷ luật tự giác thói quen hiệu suất',
    alternateQuery: 'vượt qua sự trì hoãn quản lý thời gian tập trung',
    mustMatchTerms: ['ky luat', 'thoi quen', 'tap trung', 'thoi gian', 'hieu suat', 'muc tieu', 'tri hoan', 'nang suat'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Bám sát vấn đề rèn luyện kỷ luật và vượt qua sự trì hoãn bạn chia sẻ: "${userText}", mình chọn cho bạn những cuốn sách đi sâu vào cơ chế thần kinh của thói quen, giúp bạn thay đổi từ những hành động nhỏ nhất mỗi ngày mà không bị quá tải.`,
    actionAdvice:
      'Hãy áp dụng ngay "Quy tắc 2 phút" trong sách: chia nhỏ việc bạn đang trì hoãn thành một bước khởi đầu chỉ mất 2 phút để bộ não bắt đầu vào guồng.',
    followUpQuestion:
      'Bạn muốn tập trung xóa bỏ thói quen xấu/trì hoãn hay rèn kỹ năng làm việc sâu (Deep Work) không xao nhãng?',
    followUpSuggestions: [
      'Cách trị dứt điểm bệnh trì hoãn',
      'Phương pháp rèn sự tập trung sâu',
      'Xây dựng kỷ luật bền vững mỗi ngày',
    ],
  },
  {
    id: 'communication_leadership',
    label: 'Giao tiếp, Thuyết phục & Lãnh đạo',
    categoryFilter: 'Self-Help',
    highPriorityPhrases: [
      'giao tiep',
      'kheo an noi',
      'thuyet trinh',
      'dam phan',
      'thuyet phuc',
      'lanh dao',
      'ung xu',
      'moi quan he',
      'dac nhan tam',
      'ngai giao tiep',
      'huong noi',
      'quan ly nhan su',
    ],
    keywords: ['an noi', 'noi chuyen', 'ket noi', 'ngoai giao', 'doi nhan xu the'],
    searchQuery: 'nghệ thuật giao tiếp ứng xử thuyết phục',
    alternateQuery: 'kỹ năng lãnh đạo đàm phán xây dựng mối quan hệ',
    mustMatchTerms: ['giao tiep', 'ung xu', 'thuyet phuc', 'lanh dao', 'noi chuyen', 'quan he', 'dam phan', 'lang nghe'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Với mong muốn cải thiện kỹ năng giao tiếp và kết nối con người qua chia sẻ: "${userText}", mình chọn lọc những cuốn sách giúp bạn vừa biết lắng nghe thấu cảm, vừa diễn đạt sắc bén và tạo dựng uy tín chân thành.`,
    actionAdvice:
      'Mỗi ngày hãy chọn 1 kỹ thuật lắng nghe hoặc đặt câu hỏi mở trong sách để thực hành ngay trong cuộc trò chuyện với đồng nghiệp hoặc bạn bè.',
    followUpQuestion:
      'Bạn muốn cải thiện sự tự tin khi nói chuyện hàng ngày hay kỹ năng đàm phán, thuyết phục và dẫn dắt đội nhóm?',
    followUpSuggestions: [
      'Giao tiếp tự tin cho người hướng nội',
      'Nghệ thuật thuyết phục & đàm phán',
      'Kỹ năng lãnh đạo truyền cảm hứng',
    ],
  },
  {
    id: 'love_family',
    label: 'Tình yêu, Hôn nhân & Gia đình',
    categoryFilter: 'Family',
    highPriorityPhrases: [
      'tinh yeu',
      'that tinh',
      'chia tay',
      'hon nhan',
      'vo chong',
      'gia dinh',
      'nuoi day con',
      'cha me',
      'con cai',
      'hen ho',
      'nguoi yeu',
    ],
    keywords: ['yeu', 'cuoi', 'con tre'],
    searchQuery: 'tâm lý tình yêu hôn nhân gia đình',
    alternateQuery: 'nghệ thuật yêu thương nuôi dạy con hạnh phúc',
    mustMatchTerms: ['tinh yeu', 'hon nhan', 'gia dinh', 'yeu', 'vo chong', 'cha me', 'con cai', 'hanh phuc'],
    forbiddenTerms: ['chung khoan', 'lap trinh', 'thuat toan'],
    buildAnalysis: (userText) =>
      `Qua tâm sự của bạn về chuyện tình cảm và gia đình: "${userText}", mình chọn những cuốn sách thấu hiểu tâm lý gắn bó, ngôn ngữ yêu thương và cách hóa giải xung đột để xây dựng mối quan hệ bền vững, bình yên.`,
    actionAdvice:
      'Hãy đọc với tâm thế chiêm nghiệm để hiểu rõ nhu cầu cảm xúc của chính mình trước khi mong cầu hoặc đối thoại với đối phương.',
    followUpQuestion:
      'Bạn muốn tìm sách chữa lành sau tổn thương tình cảm hay sách xây dựng sự thấu hiểu trong tình yêu & gia đình?',
    followUpSuggestions: [
      'Chữa lành sau chia tay & tổn thương',
      'Thấu hiểu tâm lý trong tình yêu',
      'Gắn kết hạnh phúc gia đình',
    ],
  },
  {
    id: 'philosophy_thinking',
    label: 'Triết học, Tư duy phản biện & Nhân sinh',
    categoryFilter: 'Philosophy',
    highPriorityPhrases: [
      'tu duy phan bien',
      'triet hoc',
      'triet ly song',
      'khac ky',
      'stoic',
      'phat giao',
      'thien dinh',
      'y nghia cuoc song',
      'nhan sinh quan',
      'tu duy logic',
      'tam linh',
      'tinh thuc',
    ],
    keywords: ['triet', 'phan bien', 'logic', 'nhan sinh', 'chan ly', 'tinh thuc', 'thien'],
    searchQuery: 'tư duy phản biện triết học nhân sinh',
    alternateQuery: 'triết lý sống khắc kỷ tỉnh thức',
    mustMatchTerms: ['tu duy', 'triet', 'phan bien', 'logic', 'nhan sinh', 'khac ky', 'tinh thuc', 'cuoc song'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Từ trăn trở về tư duy và chiều sâu triết lý trong câu hỏi của bạn: "${userText}", mình gợi ý những tác phẩm kinh điển giúp rèn luyện tư duy phản biện sắc bén, nhìn thấu bản chất sự việc và giữ tâm thế vững vàng trước biến động.`,
    actionAdvice:
      'Sau mỗi chương, hãy dừng lại tự đặt câu hỏi phản biện hoặc đối chiếu với một quyết định thực tế bạn đang phân vân.',
    followUpQuestion:
      'Bạn muốn nghiêng về rèn luyện tư duy logic/phản biện sắc bén hay triết lý sống an nhiên, khắc kỷ?',
    followUpSuggestions: [
      'Rèn luyện tư duy phản biện & logic',
      'Triết lý Khắc kỷ (Stoicism) thực hành',
      'Chiêm nghiệm nhân sinh & tỉnh thức',
    ],
  },
  {
    id: 'literature_fiction',
    label: 'Văn học, Tiểu thuyết & Truyện',
    categoryFilter: 'Fiction',
    highPriorityPhrases: [
      'tieu thuyet',
      'van hoc',
      'truyen ngan',
      'trinh tham',
      'gia tuong',
      'van hoc viet nam',
      'van hoc kinh dien',
      'sach truyen',
    ],
    keywords: ['truyen', 'tho', 'tan van', 'but ky'],
    searchQuery: 'tiểu thuyết văn học kinh điển hay nhất',
    alternateQuery: 'văn học việt nam truyện ngắn đặc sắc',
    mustMatchTerms: ['tieu thuyet', 'van hoc', 'truyen', 'tac pham', 'nha van', 'cau chuyen'],
    forbiddenTerms: ['ke toan', 'lap trinh'],
    buildAnalysis: (userText) =>
      `Dựa trên mong muốn thưởng thức văn học và những câu chuyện giàu cảm xúc của bạn: "${userText}", mình chọn lọc những tác phẩm văn học & tiểu thuyết đặc sắc, có chiều sâu nghệ thuật và dư âm lắng đọng.`,
    actionAdvice:
      'Hãy thả lỏng tâm trí và đắm mình vào nhịp điệu câu chữ cũng như số phận nhân vật để cảm nhận trọn vẹn thông điệp nhân văn của tác phẩm.',
    followUpQuestion:
      'Bạn thích tiểu thuyết giàu chất chiêm nghiệm nhân sinh hay truyện trinh thám, kỳ ảo cuốn hút?',
    followUpSuggestions: [
      'Tiểu thuyết kinh điển giàu triết lý',
      'Văn học chữa lành nhẹ nhàng',
      'Truyện trinh thám & kịch tính',
    ],
  },
  {
    id: 'history_culture',
    label: 'Lịch sử, Văn hóa & Văn minh nhân loại',
    categoryFilter: 'History',
    highPriorityPhrases: [
      'lich su',
      'van hoa',
      'van minh nhan loai',
      'lich su viet nam',
      'lich su the gioi',
      'chien tranh',
      'trieu dai',
      'co dai',
    ],
    keywords: ['su hoc', 'khao co', 'dan toc', 'sapiens'],
    searchQuery: 'lịch sử văn minh nhân loại văn hóa',
    alternateQuery: 'lịch sử việt nam và thế giới',
    mustMatchTerms: ['lich su', 'van hoa', 'van minh', 'the gioi', 'viet nam', 'thoi dai', 'nhan loai'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Với niềm yêu thích tìm hiểu lịch sử và văn hóa qua lời nhắn: "${userText}", mình chọn những công trình sử học & khảo cứu hấp dẫn, giúp kết nối quá khứ với bức tranh thế giới hiện đại.`,
    actionAdvice:
      'Khi đọc sách lịch sử, bạn có thể theo dõi theo trục thời gian và đặt câu hỏi "Nguyên nhân nào dẫn đến bước ngoặt này?" để nhớ rất lâu.',
    followUpQuestion:
      'Bạn muốn đọc về lịch sử Việt Nam hay tiến trình lịch sử – văn minh thế giới?',
    followUpSuggestions: [
      'Lịch sử văn minh nhân loại',
      'Lịch sử & văn hóa Việt Nam',
      'Những bước ngoặt thay đổi thế giới',
    ],
  },
  {
    id: 'learning_language',
    label: 'Phương pháp Học tập, Ghi nhớ & Ngoại ngữ',
    categoryFilter: 'Education',
    highPriorityPhrases: [
      'phuong phap hoc',
      'cach hoc nhanh',
      'luyen tri nho',
      'hoc tieng anh',
      'ngoai ngu',
      'tu hoc',
      'on thi',
      'doc sach nhanh',
      'so do tu duy',
    ],
    keywords: ['tri nho', 'tieng anh', 'ielts', 'hoc tap', 'ghi nho'],
    searchQuery: 'phương pháp tự học siêu trí nhớ hiệu quả',
    alternateQuery: 'kỹ năng học tập ghi nhớ ngoại ngữ',
    mustMatchTerms: ['hoc', 'tri nho', 'ghi nho', 'ngoai ngu', 'tieng anh', 'kien thuc', 'tu duy'],
    forbiddenTerms: [],
    buildAnalysis: (userText) =>
      `Bám sát mục tiêu nâng cao khả năng tự học và ghi nhớ của bạn: "${userText}", mình đã chọn những cuốn sách giải mã khoa học não bộ về việc học, giúp bạn tiếp thu kiến thức mới nhanh và nhớ lâu gấp nhiều lần.`,
    actionAdvice:
      'Hãy áp dụng ngay phương pháp Active Recall (Chủ động gợi nhớ) và Spaced Repetition (Lặp lại ngắt quãng) được hướng dẫn trong sách vào môn học hiện tại.',
    followUpQuestion:
      'Bạn muốn ưu tiên rèn kỹ năng siêu trí nhớ & đọc nhanh hay phương pháp tự học ngoại ngữ/chuyên môn?',
    followUpSuggestions: [
      'Phương pháp tự học đỉnh cao',
      'Rèn luyện trí nhớ & não bộ',
      'Kỹ năng đọc sách hiệu quả',
    ],
  },
];

/**
 * Các từ đệm hội thoại tiếng Việt cần loại bỏ khi trích xuất chủ đề cốt lõi
 * để tránh việc câu "tui muốn phát triển thêm về mảng al" bị bắt nhầm chữ "phát triển" thành sách Khởi nghiệp/Self-help!
 */
const CONVERSATIONAL_STOP_PHRASES = [
  'tui muon phat trien them ve mang',
  'toi muon phat trien them ve mang',
  'minh muon phat trien them ve mang',
  'muon phat trien them ve mang',
  'phat trien them ve mang',
  'phat trien ve mang',
  'tim hieu them ve mang',
  'tim hieu ve mang',
  'tui muon tim sach ve',
  'toi muon tim sach ve',
  'minh muon tim sach ve',
  'goi y cho tui sach ve',
  'goi y cho minh sach ve',
  'gioi thieu cho tui sach',
  'gioi thieu sach ve',
  'cho tui hoi sach nao',
  'cho minh hoi sach nao',
  'tui dang bi',
  'toi dang bi',
  'minh dang bi',
  'tui bi',
  'toi bi',
  'minh bi',
  'tui muon',
  'toi muon',
  'minh muon',
  'lam sao de',
  'cach de',
];

const STOP_WORDS = new Set([
  'tui',
  'toi',
  'minh',
  'ban',
  'em',
  'anh',
  'chi',
  'muon',
  'can',
  'tim',
  'sach',
  'cuon',
  'nao',
  've',
  'mang',
  'linh',
  'vuc',
  'chu',
  'de',
  'them',
  'hon',
  'cho',
  'nguoi',
  'moi',
  'bat',
  'dau',
  'lam',
  'sao',
  'de',
  'co',
  'nhung',
  'hay',
  'nhat',
  'giup',
  'voi',
  'khi',
  'thi',
  'lai',
  'dang',
  'rat',
  'qua',
  'nhieu',
  'mot',
  'vai',
  'goi',
  'y',
  'gioi',
  'thieu',
]);

/**
 * Phân tích sâu ý định người dùng từ câu chat tự nhiên:
 * - Xử lý lỗi gõ ("mảng al" -> AI, "bị bệnh" -> Sức khỏe & Y học)
 * - Chấm điểm khớp cụm từ nguyên vẹn (whole-phrase matching) trên 13 miền chuyên sâu
 * - Nếu ngoài 13 miền, bóc tách chính xác cụm danh từ chủ đề cốt lõi để tìm trực tiếp trên Google Books
 */
export function analyzeUserIntent(userText: string): UserIntentAnalysis {
  const norm = normalizeChatTypos(userText);

  let bestDomain: IntentDomainRule | null = null;
  let bestScore = 0;

  for (const domain of INTENT_DOMAINS) {
    let score = 0;
    for (const phrase of domain.highPriorityPhrases) {
      if (containsWholePhrase(norm, phrase)) {
        // Cụm từ dài và cụ thể được cộng điểm rất cao
        score += 45 + phrase.split(' ').length * 10;
      }
    }
    for (const kw of domain.keywords) {
      if (containsWholePhrase(norm, kw)) {
        score += 22;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  if (bestDomain && bestScore >= 20) {
    return {
      domainId: bestDomain.id,
      domainLabel: bestDomain.label,
      coreTopic: bestDomain.label,
      searchQuery: bestDomain.searchQuery,
      alternateQuery: bestDomain.alternateQuery,
      categoryFilter: bestDomain.categoryFilter,
      mustMatchTerms: bestDomain.mustMatchTerms,
      forbiddenTerms: bestDomain.forbiddenTerms,
      analysisText: bestDomain.buildAnalysis(userText),
      actionAdvice: bestDomain.actionAdvice,
      followUpQuestion: bestDomain.followUpQuestion,
      followUpSuggestions: bestDomain.followUpSuggestions,
    };
  }

  // Trường hợp người dùng hỏi một chủ đề cụ thể tự do (vd: "nấu ăn", "nhiếp ảnh", "cờ vua", "kiến trúc"...)
  let cleaned = norm;
  for (const filler of CONVERSATIONAL_STOP_PHRASES) {
    cleaned = cleaned.replace(filler, ' ');
  }
  const coreWords = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const extractedTopic = coreWords.length > 0 ? coreWords.slice(0, 6).join(' ') : userText.trim();
  const cleanSearchQuery = `sách ${extractedTopic}`.slice(0, 100);

  return {
    domainId: 'custom',
    domainLabel: `Chủ đề: ${userText.slice(0, 45)}`,
    coreTopic: extractedTopic,
    searchQuery: cleanSearchQuery,
    alternateQuery: extractedTopic,
    mustMatchTerms: coreWords,
    forbiddenTerms: [],
    analysisText: `Mình đã phân tích kỹ mong muốn của bạn về "${userText}" và tìm kiếm trực tiếp các đầu sách chuyên biệt bám sát đúng chủ đề này.`,
    actionAdvice:
      'Bạn hãy xem phần mục lục và lời giới thiệu của từng cuốn bên dưới để chọn ra cuốn có văn phong và độ sâu phù hợp nhất với mục tiêu hiện tại.',
    followUpQuestion: `Bạn muốn tìm sách nhập môn dễ đọc hay sách chuyên sâu về "${extractedTopic}"?`,
    followUpSuggestions: [
      `Sách nhập môn dễ hiểu về ${extractedTopic.slice(0, 20)}`,
      `Sách thực hành chuyên sâu`,
      `Tác phẩm nổi bật nhất cùng chủ đề`,
    ],
  };
}

/**
 * Chấm điểm và lọc danh sách sách (Book hoặc AdvisorBook) bám sát tuyệt đối vào UserIntentAnalysis:
 * - Cộng điểm lớn cho sách chứa từ khóa bắt buộc (`mustMatchTerms`) ngay trên tiêu đề, thể loại, mô tả
 * - Trừ điểm nặng hoặc loại bỏ sách chứa từ khóa lệch chủ đề (`forbiddenTerms`)
 */
export function scoreBookAgainstIntent(
  book: { title: string; author?: string; authors?: string; genre?: string; category?: string; description?: string; rating?: number },
  intent: UserIntentAnalysis,
  rawUserText: string
): number {
  const normTitle = normalizeChatTypos(book.title || '');
  const normGenre = normalizeChatTypos(`${book.genre || ''} ${book.category || ''}`);
  const normDesc = normalizeChatTypos(book.description || '');

  let score = 0;

  // 1. Kiểm tra từ khóa cấm (lệch chủ đề: vd hỏi Bệnh/AI mà sách lại là Tài chính/Khởi nghiệp)
  for (const forbidden of intent.forbiddenTerms) {
    if (containsWholePhrase(normTitle, forbidden) || containsWholePhrase(normGenre, forbidden)) {
      score -= 80;
    } else if (containsWholePhrase(normDesc, forbidden)) {
      score -= 35;
    }
  }

  // 2. Kiểm tra từ khóa bắt buộc của miền chủ đề
  let domainHits = 0;
  for (const term of intent.mustMatchTerms) {
    if (containsWholePhrase(normTitle, term)) {
      score += 45;
      domainHits++;
    } else if (containsWholePhrase(normGenre, term)) {
      score += 30;
      domainHits++;
    } else if (containsWholePhrase(normDesc, term)) {
      score += 18;
      domainHits++;
    }
  }

  // 3. Kiểm tra khớp trực tiếp với các từ cốt lõi trong câu hỏi của người dùng
  const userCoreWords = normalizeChatTypos(rawUserText)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && w !== 'phat' && w !== 'trien');

  for (const w of userCoreWords) {
    if (containsWholePhrase(normTitle, w)) {
      score += 25;
      domainHits++;
    } else if (containsWholePhrase(normDesc, w)) {
      score += 10;
      domainHits++;
    }
  }

  // Nếu không khớp bất kỳ từ khóa nào của chủ đề thì không cộng điểm rating ảo
  if (domainHits === 0) {
    return score - 20;
  }

  if (book.rating && book.rating >= 4.5) {
    score += 5;
  }

  return score;
}

export function filterAndSortBooks(books: Book[], filters: FilterState): Book[] {
  const normQuery = normalizeVietnamese(filters.searchQuery || '');

  const filtered = books.filter((book) => {
    // Search query match
    if (normQuery) {
      const matchTitle = normalizeVietnamese(book.title).includes(normQuery);
      const matchAuthor = normalizeVietnamese(book.author).includes(normQuery);
      const matchTranslator = book.translator && normalizeVietnamese(book.translator).includes(normQuery);
      const matchGenre = normalizeVietnamese(book.genre).includes(normQuery);
      const matchPub = normalizeVietnamese(book.publisher).includes(normQuery);
      const matchDesc = normalizeVietnamese(book.description).includes(normQuery);
      if (!matchTitle && !matchAuthor && !matchTranslator && !matchGenre && !matchPub && !matchDesc) {
        return false;
      }
    }

    // Category match
    if (filters.category !== 'all' && book.category !== filters.category) {
      return false;
    }

    // Genre match
    if (filters.genre !== 'all' && book.genre !== filters.genre) {
      return false;
    }

    // Length match
    if (filters.length !== 'all') {
      if (book.pages <= 0) return false;
      if (filters.length === 'short' && book.pages > 200) return false;
      if (filters.length === 'medium' && (book.pages <= 200 || book.pages > 400)) return false;
      if (filters.length === 'long' && book.pages <= 400) return false;
    }

    // Tag filter match (author, publisher, year)
    if (filters.tagFilter) {
      if (filters.tagFilter.type === 'author') {
        const targetAuthor = normalizeVietnamese(String(filters.tagFilter.value));
        if (!normalizeVietnamese(book.author).includes(targetAuthor)) {
          return false;
        }
      } else if (filters.tagFilter.type === 'publisher') {
        const targetPub = normalizeVietnamese(String(filters.tagFilter.value));
        if (!normalizeVietnamese(book.publisher).includes(targetPub)) {
          return false;
        }
      } else if (filters.tagFilter.type === 'year') {
        if (book.publishYear !== Number(filters.tagFilter.value)) {
          return false;
        }
      }
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'title':
        return a.title.localeCompare(b.title, 'vi');
      case 'pages-asc':
        return (a.pages || 9999) - (b.pages || 9999);
      case 'pages-desc':
        return (b.pages || 0) - (a.pages || 0);
      case 'year':
        return b.publishYear - a.publishYear;
      case 'featured':
      default:
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title, 'vi');
    }
  });
}

const GOAL_KEYWORDS: Record<string, string[]> = {
  skills: ['ky luat', 'thoi quen', 'hieu suat', 'thoi gian', 'tap trung', 'tri hoan', 'phat trien ban than', 'ky nang', 'tu hoc'],
  business: ['kinh doanh', 'khoi nghiep', 'tai chinh', 'dau tu', 'tien', 'quan tri', 'chien luoc', 'marketing', 'lam giau'],
  healing: ['tam ly', 'chua lanh', 'cam xuc', 'binh yen', 'cang thang', 'stress', 'ap luc', 'buoc cham', 'trai tim', 'hanh phuc', 'suc khoe'],
  tech: ['cong nghe', 'tri tue nhan tao', 'ai', 'tuong lai', 'khoa hoc', 'so hoa', 'du lieu', 'may tinh', 'lap trinh', 'phan mem'],
  communication: ['giao tiep', 'lanh dao', 'ung xu', 'thuyet phuc', 'quan he', 'dac nhan tam', 'quan ly', 'ket noi'],
  wisdom: ['triet', 'tu duy', 'phan bien', 'logic', 'y nghia', 'khai minh', 'nhan sinh', 'quyet dinh'],
};

export function recommendByGoal(books: Book[], criteria: RecommendationCriteria): ScoredBook[] {
  const rawQuery = criteria.query || '';
  const normQuery = normalizeChatTypos(rawQuery);
  const intent = rawQuery.trim() ? analyzeUserIntent(rawQuery) : null;

  const hasAnyFilter =
    Boolean(normQuery) ||
    Boolean(criteria.goalId) ||
    Boolean(criteria.preferredLength && criteria.preferredLength !== 'all') ||
    Boolean(criteria.style && criteria.style !== 'all');

  const scored: ScoredBook[] = books.map((book) => {
    let score = hasAnyFilter ? 0 : 10;
    const matchReasons: string[] = [];
    const normAll = normalizeChatTypos(
      `${book.title} ${book.author} ${book.genre} ${book.description} ${book.curatorNote} ${book.quote} ${book.readingGoals.join(' ')}`
    );

    // Length matching
    if (criteria.preferredLength && criteria.preferredLength !== 'all') {
      if (criteria.preferredLength === 'short' && book.pages > 0 && book.pages <= 200) {
        score += 25;
        matchReasons.push('Độ dài tinh gọn, đọc nhanh');
      } else if (criteria.preferredLength === 'medium' && book.pages > 200 && book.pages <= 400) {
        score += 25;
        matchReasons.push('Độ dày trang tiêu chuẩn');
      } else if (criteria.preferredLength === 'long' && book.pages > 400) {
        score += 25;
        matchReasons.push('Nội dung chuyên sâu, dày dặn');
      }
    }

    // Style matching
    if (criteria.style && criteria.style !== 'all') {
      if (book.style === criteria.style) {
        score += 30;
        matchReasons.push('Đúng phong cách tiếp cận bạn chọn');
      }
    }

    // Goal matching (both style and domain keywords using whole-phrase boundary)
    if (criteria.goalId) {
      const goalToStyle: Record<string, BookStyle[]> = {
        skills: ['realistic', 'nostalgic'],
        business: ['realistic'],
        healing: ['subtle', 'nostalgic'],
        tech: ['philosophical', 'realistic'],
        communication: ['subtle', 'realistic'],
        wisdom: ['philosophical', 'nostalgic'],
      };
      const goalToLabel: Record<string, string> = {
        skills: 'Phù hợp mục tiêu phát triển bản thân & kỷ luật',
        business: 'Phù hợp mục tiêu kinh doanh & tài chính',
        healing: 'Phù hợp mục tiêu tâm lý & chữa lành',
        tech: 'Phù hợp mục tiêu công nghệ & tương lai AI',
        communication: 'Phù hợp mục tiêu giao tiếp & lãnh đạo',
        wisdom: 'Phù hợp mục tiêu triết lý & tư duy phản biện',
      };

      const targetStyles = goalToStyle[criteria.goalId] || [];
      if (targetStyles.includes(book.style)) {
        score += 15;
      }

      const kws = GOAL_KEYWORDS[criteria.goalId] || [];
      let kwHits = 0;
      for (const kw of kws) {
        if (containsWholePhrase(normAll, kw)) kwHits++;
      }
      if (kwHits > 0) {
        score += 30 + Math.min(35, kwHits * 12);
        matchReasons.unshift(goalToLabel[criteria.goalId] || 'Phù hợp mục tiêu đọc sách');
      } else if (targetStyles.includes(book.style)) {
        matchReasons.push(goalToLabel[criteria.goalId] || 'Phù hợp mục tiêu đọc sách');
      }
    }

    // Deep Intent & Query relevance (chống bắt nhầm từ con như "ai" trong "tài chính" hay "bị" trong "bí quyết")
    if (intent) {
      const intentScore = scoreBookAgainstIntent(book, intent, rawQuery);
      score += intentScore;
      if (intentScore >= 25) {
        matchReasons.unshift(`Khớp trực tiếp chủ đề: ${intent.domainLabel}`);
      }
    }

    if (!hasAnyFilter) {
      if (book.isFeatured) score += 8;
      if (book.rating && book.rating >= 4.7) score += 5;
    }

    return {
      book,
      score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['Tác phẩm nổi bật được đề xuất'],
    };
  });

  const matched = scored
    .filter((item) => (hasAnyFilter ? item.score >= 20 : item.score > 0))
    .sort((a, b) => b.score - a.score || (b.book.rating || 0) - (a.book.rating || 0));

  return matched;
}

export function formatReadingTime(pages: number): string {
  if (!pages || pages <= 0) {
    return 'Đang cập nhật số trang';
  }
  const estHours = Math.max(1, Math.round(pages / 45));
  return `${pages} trang · ~${estHours} giờ đọc`;
}

/**
 * Xây dựng câu trả lời chi tiết, bám sát từng chữ trong lời chat của người dùng
 * và giải thích rõ vì sao từng cuốn sách giải quyết đúng mong muốn đó.
 */
export function generateAssistantResponse(
  userText: string,
  allBooks: Book[]
): { replyText: string; suggestedBooks: Book[]; followUpSuggestions: string[] } {
  const intent = analyzeUserIntent(userText);
  const scored = recommendByGoal(allBooks, { query: userText });
  const picked = scored.slice(0, 3).map((s) => s.book);

  if (picked.length === 0) {
    return {
      replyText: `${intent.analysisText}\n\nHiện tại kệ sách cục bộ chưa có sẵn đầu sách thuộc nhóm **${intent.domainLabel}**. Bạn hãy thử bấm gợi ý bên dưới hoặc mở rộng sang trang **Cố vấn AI chuyên sâu** để hệ thống truy vấn trực tiếp toàn bộ kho Google Books nhé!`,
      suggestedBooks: [],
      followUpSuggestions: intent.followUpSuggestions,
    };
  }

  const sections = picked.map((b, idx) => {
    const rawDesc =
      b.description ||
      b.curatorNote ||
      `Tác phẩm chuyên sâu thuộc chủ đề ${intent.domainLabel}, cung cấp kiến thức và giải pháp thực tế.`;
    return `### ${idx + 1}. ${b.title} – ${b.author}
- **Chấm điểm độ khớp:** ${Math.min(9.9, (9.4 - idx * 0.2)).toFixed(1)}/10 (${intent.domainLabel})
- **Chi tiết trong lời bạn nói:** "${userText}"
- **Vì sao cuốn sách này dành riêng cho bạn:**
  - **Giải quyết trực tiếp:** ${rawDesc.slice(0, 260)}${rawDesc.length > 260 ? '...' : ''}
  - **Giá trị thực tế nhận được:** ${intent.actionAdvice}`;
  });

  const fullReply = `${intent.analysisText}\n\n${sections.join('\n\n---\n\n')}\n\n---\n💡 **Gợi mở tiếp theo:** *${intent.followUpQuestion}*`;

  return {
    replyText: fullReply,
    suggestedBooks: picked,
    followUpSuggestions: intent.followUpSuggestions,
  };
}

export function getRelatedBooksByAttribute(
  books: Book[],
  criteria: { type: 'author' | 'publisher' | 'year'; value: string | number; excludeBookId?: string }
): Book[] {
  return books.filter((b) => {
    if (criteria.excludeBookId && b.id === criteria.excludeBookId) return false;
    if (criteria.type === 'author') {
      return normalizeVietnamese(b.author).includes(normalizeVietnamese(String(criteria.value)));
    }
    if (criteria.type === 'publisher') {
      return normalizeVietnamese(b.publisher).includes(normalizeVietnamese(String(criteria.value)));
    }
    if (criteria.type === 'year') {
      return b.publishYear === Number(criteria.value);
    }
    return false;
  });
}

/**
 * Tạo các truy vấn tìm kiếm sách liên quan trực tiếp trên Google Books
 * dựa trên nội dung, chủ đề, thể loại và tác giả của cuốn sách đang xem.
 */
export function buildRelatedBookSearchQueries(targetBook: Book): {
  topicQuery: string;
  authorQuery?: string;
  intent: UserIntentAnalysis;
} {
  const combinedSource = `${targetBook.title} ${targetBook.genre} ${(targetBook.description || '').slice(0, 220)}`;
  const intent = analyzeUserIntent(combinedSource);

  const topicQuery =
    intent.domainId !== 'custom'
      ? intent.searchQuery
      : `${targetBook.genre} ${targetBook.title.split(/\s+/).slice(0, 4).join(' ')}`.trim();

  const cleanAuthor = (targetBook.author || '').split(',')[0].trim();
  const isGenericAuthor =
    !cleanAuthor || /nhiều tác giả|không rõ|unknown|đang cập nhật/i.test(cleanAuthor);

  return {
    topicQuery,
    authorQuery: isGenericAuthor ? undefined : cleanAuthor,
    intent,
  };
}

/**
 * Chấm điểm và gợi ý các cuốn sách có nội dung liên quan mật thiết nhất
 * với cuốn sách người dùng đang xem (`targetBook`).
 */
export function getRelatedBooksByContent(
  targetBook: Book,
  candidateBooks: Book[],
  limit = 8
): Book[] {
  const { intent } = buildRelatedBookSearchQueries(targetBook);
  const normTargetTitle = normalizeVietnamese(targetBook.title);
  const normTargetGenre = normalizeVietnamese(targetBook.genre);
  const normTargetAuthor = normalizeVietnamese(targetBook.author);
  const targetGoals = new Set((targetBook.readingGoals || []).map((g) => normalizeVietnamese(g)));

  // Trích xuất các từ khóa cốt lõi từ tiêu đề và thể loại của sách đang xem
  const titleKeywords = normTargetTitle
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const scored: Array<{ book: Book; score: number }> = [];
  const seenTitles = new Set<string>([normTargetTitle]);

  for (const b of candidateBooks) {
    if (b.id === targetBook.id) continue;
    const normTitle = normalizeVietnamese(b.title);
    if (!normTitle || seenTitles.has(normTitle)) continue;

    const normGenre = normalizeVietnamese(b.genre);
    const normDesc = normalizeVietnamese(b.description || '');
    const normAuthor = normalizeVietnamese(b.author || '');

    let score = 0;

    // 1. Điểm khớp miền chủ đề sâu (cộng lớn nếu cùng miền, trừ nặng nếu dính từ khóa cấm lệch chủ đề)
    score += scoreBookAgainstIntent(b, intent, `${targetBook.title} ${targetBook.genre}`);

    // 2. Cùng thể loại chính xác (`genre`)
    if (normGenre && normGenre === normTargetGenre) {
      score += 40;
    } else if (normGenre && normTargetGenre && (normGenre.includes(normTargetGenre) || normTargetGenre.includes(normGenre))) {
      score += 22;
    }

    // 3. Cùng mục tiêu đọc (`readingGoals`)
    for (const g of b.readingGoals || []) {
      if (targetGoals.has(normalizeVietnamese(g))) {
        score += 18;
      }
    }

    // 4. Trùng từ khóa cốt lõi trong tiêu đề/mô tả
    let kwMatches = 0;
    for (const kw of titleKeywords) {
      if (containsWholePhrase(normTitle, kw)) {
        score += 20;
        kwMatches++;
      } else if (containsWholePhrase(normDesc, kw)) {
        score += 8;
        kwMatches++;
      }
    }

    // 5. Cùng tác giả
    if (
      normAuthor &&
      normTargetAuthor &&
      !/nhieu tac gia|khong ro/.test(normTargetAuthor) &&
      (normAuthor.includes(normTargetAuthor) || normTargetAuthor.includes(normAuthor))
    ) {
      score += 28;
    }

    // 6. Cùng phong cách viết (`style`) khi đã có điểm liên quan nội dung
    if (b.style === targetBook.style && (score > 0 || kwMatches > 0)) {
      score += 10;
    }

    seenTitles.add(normTitle);
    scored.push({ book: b, score });
  }

  scored.sort((a, b) => b.score - a.score || (b.book.rating || 0) - (a.book.rating || 0));

  const highConfidence = scored.filter((item) => item.score >= 15).map((item) => item.book);
  if (highConfidence.length >= 4) {
    return highConfidence.slice(0, limit);
  }
  return scored.filter((item) => item.score > -10).slice(0, limit).map((item) => item.book);
}
