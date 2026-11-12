import React from 'react';
import {
  BookOpen,
  Compass,
  Globe,
  Library,
  Sparkles,
  ArrowRight,
  Code2,
  Palette,
  Layers,
  MessageCircle,
  Quote,
  BrainCircuit,
} from 'lucide-react';

interface AboutViewProps {
  onNavigate?: (route: string) => void;
}

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Phân tích ý định & tâm trạng',
    description:
      'Chia sẻ bất kỳ suy nghĩ, câu nói, áp lực cuộc sống, mục tiêu công việc hay định hướng công nghệ – AI sẽ thấu hiểu và gợi ý sách chuẩn xác.',
  },
  {
    icon: Compass,
    title: 'Tìm sách theo mục tiêu',
    description:
      'Hệ thống mục tiêu đa chiều: Phát triển kỹ năng, Lãnh đạo kinh doanh, Chữa lành nội tâm, Trí tuệ AI & Công nghệ tương lai.',
  },
  {
    icon: Library,
    title: 'Thư viện thông minh',
    description:
      'Kho sách trực quan với bộ lọc nhanh theo tác giả, nhà xuất bản, phân loại và số trang, trình bày chuẩn phong cách tối giản hiện đại.',
  },
  {
    icon: Globe,
    title: 'Khám phá dữ liệu thời gian thực',
    description:
      'Tra cứu hàng triệu đầu sách trực tiếp từ Google Books API theo mọi chủ đề công nghệ, kinh tế, tâm lý và kỹ năng.',
  },
  {
    icon: MessageCircle,
    title: 'Trợ lý BookMind AI đồng hành',
    description:
      'Khung chat AI thông minh luôn túc trực mọi lúc mọi nơi trên giao diện, phân tích sâu và giải thích lý do gợi ý từng cuốn sách.',
  },
  {
    icon: BookOpen,
    title: 'Trang tác phẩm chuyên sâu',
    description:
      'Trình bày chi tiết bối cảnh, thông tin ấn bản, góc nhìn biên tập và kết nối trực tiếp đến bản đọc thử trên Google Books.',
  },
];

const TECHNOLOGIES = [
  {
    name: 'React 19 & TypeScript',
    role: 'Xây dựng giao diện hiệu năng cao, quản lý state điều hướng linh hoạt và chặt chẽ về dữ liệu.',
  },
  {
    name: 'Gemini AI & Multi-Domain Engine',
    role: 'Hạt nhân AI phân tích sắc thái ngôn từ, trích xuất nhu cầu người đọc và đề xuất sách chính xác.',
  },
  {
    name: 'Vite',
    role: 'Máy chủ phát triển tốc độ cao với Hot Module Replacement tức thì không cần khởi động lại.',
  },
  {
    name: 'Tailwind CSS v4 (Slate & Indigo)',
    role: 'Bảng màu hiện đại, tương phản sắc nét, tạo cảm giác sang trọng và tập trung tối đa cho người đọc.',
  },
  {
    name: 'Google Books API',
    role: 'Nguồn cấp dữ liệu sách phong phú mọi lĩnh vực từ xuất bản Việt Nam đến tri thức toàn cầu.',
  },
];

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-14 md:space-y-18">
      {/* 1. Giới thiệu chung */}
      <section className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Về nền tảng BookMind AI</span>
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Trợ lý AI thấu hiểu mọi suy nghĩ, đồng hành chọn sách chuẩn xác
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          BookMind AI là nền tảng gợi ý sách thông minh đa lĩnh vực. Bất kể bạn đang gặp khó khăn trong công việc, 
          cần nâng cấp kỹ năng lãnh đạo, tìm kiếm góc nhìn về công nghệ mới, hay đơn giản muốn tìm một cuốn sách chữa lành,
          chỉ cần nói ra suy nghĩ của bạn bằng lời văn tự nhiên nhất.
        </p>
        <p className="text-base text-slate-600 leading-relaxed">
          Thay vì tìm kiếm từ khóa khô khan, AI sẽ phân tích tâm lý, bối cảnh và mục tiêu thực tế của bạn để chọn lọc 
          những cuốn sách mang tính ứng dụng cao nhất từ kho tri thức phong phú.
        </p>
      </section>

      {/* 2. Mục tiêu */}
      <section>
        <div className="border-t border-slate-200 pt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Giá Trị Cốt Lõi</p>
              <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Ba cam kết từ BookMind AI
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <div className="space-y-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-sans text-3xl font-extrabold text-indigo-600 block">01.</span>
              <h3 className="font-sans text-base font-bold text-slate-900">Thấu hiểu ngữ cảnh</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Không chỉ gợi ý theo từ khóa, hệ thống phân tích sâu cảm xúc, thách thức đời thực và nhu cầu phát triển của người đọc.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-sans text-3xl font-extrabold text-indigo-600 block">02.</span>
              <h3 className="font-sans text-base font-bold text-slate-900">Đa dạng mọi lĩnh vực</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Từ Kinh doanh, Khởi nghiệp, Công nghệ, AI, Tâm lý học, Kỹ năng lãnh đạo đến Nghệ thuật sống và Văn học kinh điển.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-sans text-3xl font-extrabold text-indigo-600 block">03.</span>
              <h3 className="font-sans text-base font-bold text-slate-900">Trải nghiệm hiện đại & tinh tế</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bảng màu Slate & Indigo sang trọng, đọc mượt mà, tốc độ phản hồi thời gian thực và kết nối trực tiếp nguồn đọc chính thống.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tính năng */}
      <section>
        <div className="border-t border-slate-200 pt-12">
          <div className="max-w-2xl mb-8 space-y-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Tính Năng Nổi Bật</p>
            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900">
              Mọi công cụ bạn cần để tìm sách
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-sans text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Công nghệ sử dụng */}
      <section>
        <div className="border-t border-slate-200 pt-12">
          <div className="max-w-2xl mb-8 space-y-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Công Nghệ Xây Dựng</p>
            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900">
              Kiến trúc hiện đại, linh hoạt
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Ứng dụng web hiện đại tối ưu hóa trải nghiệm mượt mà, phản hồi lập tức không độ trễ.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <ul className="divide-y divide-slate-100">
              {TECHNOLOGIES.map((tech) => (
                <li
                  key={tech.name}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4"
                >
                  <span className="flex items-center gap-2 sm:w-64 shrink-0 font-semibold text-slate-900">
                    <Code2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    {tech.name}
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed">{tech.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Số liệu tuyển tập */}
      <section>
        <div className="border-t border-slate-200 pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <p className="font-sans text-2xl sm:text-3xl font-extrabold text-indigo-600">Google Books</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Dữ liệu trực tuyến toàn cầu</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <p className="font-sans text-2xl sm:text-3xl font-extrabold text-indigo-600">Mọi Lĩnh Vực</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Kinh doanh, AI, Tâm lý, Kỹ năng</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <p className="font-sans text-2xl sm:text-3xl font-extrabold text-indigo-600">AI Advisor</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Phân tích ý định tự nhiên</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <p className="font-sans text-2xl sm:text-3xl font-extrabold text-indigo-600">100%</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Miễn phí trải nghiệm</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Trích dẫn & CTA */}
      <section>
        <div className="border-t border-slate-200 pt-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Quote className="w-6 h-6" />
            </div>
            <p className="font-serif italic text-xl sm:text-2xl font-semibold text-slate-800 leading-relaxed text-balance">
              “Một cuốn sách hay đọc đúng lúc có thể định hình lại tư duy và mở ra bước ngoặt mới cho cuộc đời bạn.”
            </p>
            <p className="text-sm font-semibold text-slate-500">— BookMind AI</p>

            {onNavigate && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('advisor')}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Nói chuyện với AI gợi ý sách</span>
                </button>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Library className="w-4 h-4 text-slate-600" />
                  <span>Khám phá thư viện</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                Slate #0F172A · Indigo #4F46E5
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Giao diện tinh gọn, tập trung trải nghiệm
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
