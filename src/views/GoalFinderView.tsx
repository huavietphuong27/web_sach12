import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book, ReadingGoal, BookStyle } from '../types/book';
import { READING_GOALS } from '../data/content';
import { ScoredBook } from '../utils/bookRecommender';
import {
  AVAILABLE_MODELS,
  BookRecommendationEngine,
  RecommendationModelType,
  ModelEvaluationMetrics,
  parseUploadedDataset,
  EXTENDED_SYNTHETIC_BOOKS,
} from '../services/recommendationModels';
import { fetchExtraDatasetBatch, EXTRA_QUERY_BATCHES } from '../services/googleBooks';
import { BookRowGrid } from '../components/BookRowGrid';
import {
  Sparkles,
  RotateCcw,
  Target,
  Cpu,
  Database,
  Upload,
  BarChart3,
  PlusCircle,
  Download,
  CheckCircle2,
  Loader2,
  Layers,
} from 'lucide-react';

interface GoalFinderViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  initialGoal?: ReadingGoal | null;
  initialQuery?: string;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  onAppendBooks?: (newBooks: Book[]) => number;
  favoriteBookIds?: string[];
}

export const GoalFinderView: React.FC<GoalFinderViewProps> = ({
  books,
  onSelectBook,
  initialGoal = null,
  initialQuery = '',
  onFilterByAttribute,
  onAppendBooks,
  favoriteBookIds = [],
}) => {
  const [goalQuery, setGoalQuery] = useState(initialQuery || (initialGoal?.examplePrompt ?? ''));
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoal?.id || '');
  const [preferredLength, setPreferredLength] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [selectedStyle, setSelectedStyle] = useState<BookStyle | 'all'>('all');
  const [selectedModel, setSelectedModel] = useState<RecommendationModelType>('hybrid-ensemble');

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScoredBook[]>([]);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(1.2);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(true);

  // State nạp thêm dữ liệu
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [dataStatusMsg, setDataStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo Engine mô hình học máy trên tập sách hiện tại
  const engine = useMemo(() => new BookRecommendationEngine(books), [books]);
  const corpusStats = useMemo(() => engine.getCorpusStats(), [engine]);
  const benchmarkMetrics: ModelEvaluationMetrics[] = useMemo(
    () => engine.evaluateAllModels(5),
    [engine]
  );

  const activeModelMeta =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const runRecommendation = (
    query: string,
    goalId: string,
    length: 'all' | 'short' | 'medium' | 'long',
    style: BookStyle | 'all',
    modelType: RecommendationModelType = selectedModel
  ) => {
    setIsLoading(true);

    setTimeout(() => {
      const { results: ranked, executionTimeMs: timeMs } = engine.rankBooks(
        {
          query,
          goalId: goalId || undefined,
          preferredLength: length,
          style,
          favoriteBookIds,
        },
        modelType
      );
      setResults(ranked);
      setExecutionTimeMs(timeMs);
      setIsLoading(false);
    }, 120);
  };

  useEffect(() => {
    const q = initialQuery || (initialGoal?.examplePrompt ?? goalQuery);
    const gId = initialGoal?.id || selectedGoalId;
    runRecommendation(q, gId, preferredLength, selectedStyle, selectedModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGoal, initialQuery, books]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runRecommendation(goalQuery, selectedGoalId, preferredLength, selectedStyle, selectedModel);
  };

  const handleReset = () => {
    setGoalQuery('');
    setSelectedGoalId('');
    setPreferredLength('all');
    setSelectedStyle('all');
    setSelectedModel('hybrid-ensemble');
    runRecommendation('', '', 'all', 'all', 'hybrid-ensemble');
  };

  const handleSelectGoalPill = (goal: ReadingGoal) => {
    const isSame = selectedGoalId === goal.id;
    const newGoalId = isSame ? '' : goal.id;
    setSelectedGoalId(newGoalId);
    const nextQuery = isSame ? '' : goal.examplePrompt;
    setGoalQuery(nextQuery);
    runRecommendation(nextQuery, newGoalId, preferredLength, selectedStyle, selectedModel);
  };

  const handleSelectModel = (modelId: RecommendationModelType) => {
    setSelectedModel(modelId);
    runRecommendation(goalQuery, selectedGoalId, preferredLength, selectedStyle, modelId);
  };

  // 1. Nạp thêm dữ liệu trực tuyến từ Google Books theo gói chủ đề mở rộng
  const handleFetchMoreGoogleBooks = async () => {
    if (isFetchingData || !onAppendBooks) return;
    setIsFetchingData(true);
    setDataStatusMsg(null);
    try {
      const { batchLabel, addedBooks } = await fetchExtraDatasetBatch(batchIndex, 16);
      const count = onAppendBooks(addedBooks);
      setBatchIndex((prev) => prev + 1);
      setDataStatusMsg(
        count > 0
          ? `Đã nạp thành công +${count} đầu sách mới từ "${batchLabel}" và huấn luyện lại ma trận TF-IDF / BM25 / KNN!`
          : `Đã quét "${batchLabel}" (các đầu sách đã có trong kho dữ liệu hiện tại). Hãy thử bấm lần nữa để quét gói tiếp theo!`
      );
    } catch {
      setDataStatusMsg('Không thể kết nối Google Books lúc này, vui lòng thử nạp gói Dataset nội bộ.');
    } finally {
      setIsFetchingData(false);
    }
  };

  // 2. Nạp nhanh gói Dataset Thực Nghiệm Mở Rộng (+8 sách chuẩn)
  const handleLoadExtendedDataset = () => {
    if (!onAppendBooks) return;
    const count = onAppendBooks(EXTENDED_SYNTHETIC_BOOKS);
    setDataStatusMsg(
      count > 0
        ? `Đã nạp thêm +${count} đầu sách kinh điển vào tập dữ liệu và cập nhật lại vector TF-IDF (${corpusStats.vocabularySize} chiều)!`
        : 'Gói Dataset Thực Nghiệm Mở Rộng đã được nạp đầy đủ vào hệ thống.'
    );
  };

  // 3. Tải lên file CSV / JSON tùy chỉnh
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAppendBooks) return;
    try {
      const text = await file.text();
      const parsedBooks = parseUploadedDataset(text, file.name);
      if (parsedBooks.length > 0) {
        const count = onAppendBooks(parsedBooks);
        setDataStatusMsg(
          `Đã đọc ${parsedBooks.length} bản ghi từ file "${file.name}" (thêm mới +${count} sách) và huấn luyện lại các model!`
        );
      } else {
        setDataStatusMsg(`File "${file.name}" không có bản ghi hợp lệ.`);
      }
    } catch {
      setDataStatusMsg(`Lỗi định dạng khi đọc file "${file.name}". Vui lòng kiểm tra cấu trúc CSV/JSON.`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resultBooks = results.map((r) => r.book);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* 1. Header & Title */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Target className="w-4 h-4 text-indigo-600" />
          <span>Hệ thống Đa Mô Hình Gợi Ý Sách &amp; Thực Nghiệm Dữ Liệu</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Tìm Sách Theo Mục Tiêu &amp; Mô Hình AI/ML
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Chạy trực tiếp 5 mô hình gợi ý sách (<strong>Hybrid Ensemble</strong>,{' '}
          <strong>TF-IDF Cosine Similarity</strong>, <strong>Okapi BM25</strong>,{' '}
          <strong>Collaborative Filtering KNN</strong>, <strong>Rule-Based</strong>) và nạp thêm dữ liệu để đối sánh độ chính xác.
        </p>
      </div>

      {/* 2. Trung tâm Quản lý Dữ liệu & Huấn luyện Model (Chạy thêm dữ liệu + Chạy thêm model) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Trạng thái Tập dữ liệu &amp; Vector hóa Thời gian thực</span>
            </div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
              Kho Dữ Liệu Huấn Luyện &amp; Kiểm Thử Mô Hình
            </h2>
          </div>

          {/* Nút thao tác nạp thêm dữ liệu */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleFetchMoreGoogleBooks}
              disabled={isFetchingData}
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isFetchingData ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              <span>
                Chạy thêm dữ liệu Google Books ({EXTRA_QUERY_BATCHES[batchIndex % EXTRA_QUERY_BATCHES.length].label.split(':')[0]})
              </span>
            </button>

            <button
              type="button"
              onClick={handleLoadExtendedDataset}
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              <span>+ Nạp Dataset Mở Rộng (8 sách chuẩn)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nhập file CSV / JSON</span>
            </button>

            <a
              href="/dataset/books_dataset.csv"
              download="books_dataset.csv"
              className="px-3 py-2 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              title="Tải về bộ dữ liệu mẫu chuẩn CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Dataset CSV mẫu</span>
            </a>
          </div>
        </div>

        {/* Thông báo khi nạp dữ liệu thành công */}
        {dataStatusMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dataStatusMsg}</span>
          </div>
        )}

        {/* Chỉ số thống kê Corpus */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">Tổng số đầu sách</span>
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">
              {corpusStats.totalBooks} cuốn
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">Không gian TF-IDF</span>
            <span className="text-lg font-extrabold text-indigo-600 tabular-nums">
              {corpusStats.vocabularySize.toLocaleString('vi-VN')} chiều
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">Độ dài TB (BM25 avgdl)</span>
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">
              {corpusStats.avgDocLength} tokens
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">Ma trận User-Item CF</span>
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">
              {corpusStats.totalUserInteractions} ratings
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">Phân bố Việt / Quốc tế</span>
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">
              {corpusStats.vietnamBooks} / {corpusStats.worldBooks}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-[11px] text-indigo-700 font-medium block">Thời gian chạy Model</span>
            <span className="text-lg font-extrabold text-indigo-700 tabular-nums">
              {executionTimeMs} ms
            </span>
          </div>
        </div>

        {/* Bảng Thực Nghiệm & So Sánh 5 Mô Hình (Benchmark Evaluation Table) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => setShowBenchmark((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>
                {showBenchmark ? 'Ẩn' : 'Hiện'} Bảng Đánh Giá Thực Nghiệm 5 Mô Hình (Precision@5, Recall@5, F1, NDCG@5)
              </span>
            </button>
            <span className="text-[11px] text-slate-500">
              Nhấp vào tên mô hình trong bảng để chuyển đổi trực tiếp
            </span>
          </div>

          {showBenchmark && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-2.5 px-3.5 font-semibold">Mô hình Gợi ý (Recommendation Model)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Precision@5</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Recall@5</th>
                    <th className="py-2.5 px-3 font-semibold text-right">F1-Score</th>
                    <th className="py-2.5 px-3 font-semibold text-right">NDCG@5</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Điểm TB</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {benchmarkMetrics.map((m) => {
                    const isSelected = m.modelId === selectedModel;
                    return (
                      <tr
                        key={m.modelId}
                        onClick={() => handleSelectModel(m.modelId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/90 font-semibold text-indigo-950'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          />
                          <span>{m.modelName}</span>
                          {m.modelId === 'hybrid-ensemble' && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 font-bold">
                              Tốt nhất
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{m.precisionAt5}%</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{m.recallAt5}%</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-indigo-700">
                          {m.f1Score}%
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{m.ndcgAt5}%</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{m.meanScore}/100</td>
                        <td className="py-2.5 px-3.5 text-right tabular-nums text-slate-500">
                          {m.executionTimeMs} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Chọn Mô Hình & Nhập Mục Tiêu Đọc Sách */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Selector 5 Mô hình */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>Chọn Thuật Toán / Mô Hình Chạy Gợi Ý (5 Models)</span>
            </label>
            <code className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
              Công thức: {activeModelMeta.formula}
            </code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {AVAILABLE_MODELS.map((model) => {
              const active = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelectModel(model.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200 hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        active
                          ? 'bg-indigo-500/30 text-indigo-200'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {model.badge}
                    </span>
                  </div>
                  <p className="font-bold text-xs sm:text-sm leading-snug mt-1">
                    {model.shortName}
                  </p>
                  <p
                    className={`text-[11px] line-clamp-2 leading-normal ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {model.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form mục tiêu & bộ lọc */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-slate-200">
          <div>
            <label
              htmlFor="goal-query-input"
              className="block font-serif text-base font-bold text-slate-900 mb-2"
            >
              Mục tiêu hoặc hoàn cảnh cụ thể của bạn
            </label>
            <div className="relative">
              <input
                id="goal-query-input"
                type="text"
                value={goalQuery}
                onChange={(e) => setGoalQuery(e.target.value)}
                placeholder="Ví dụ: Tôi muốn rèn luyện tính kỷ luật, học đầu tư tài chính, tìm hiểu AI hay chữa lành..."
                className="w-full px-4 py-3 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Quick Goals selector */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Chọn nhanh chủ đề mục tiêu
            </span>
            <div className="flex flex-wrap gap-2">
              {READING_GOALS.map((goal) => {
                const isActive = selectedGoalId === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleSelectGoalPill(goal)}
                    className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                    }`}
                  >
                    {goal.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters row: Length & Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label
                htmlFor="goal-length-filter"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
              >
                Dung lượng sách mong muốn
              </label>
              <select
                id="goal-length-filter"
                value={preferredLength}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'short' | 'medium' | 'long';
                  setPreferredLength(val);
                  runRecommendation(goalQuery, selectedGoalId, val, selectedStyle, selectedModel);
                }}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 cursor-pointer"
              >
                <option value="all">Mọi độ dài</option>
                <option value="short">Ngắn gọn (Dưới 220 trang - đọc nhanh)</option>
                <option value="medium">Vừa phải (200 - 420 trang - tiêu chuẩn)</option>
                <option value="long">Dày dặn (Trên 400 trang - chuyên sâu)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="goal-style-filter"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
              >
                Phong cách tiếp cận
              </label>
              <select
                id="goal-style-filter"
                value={selectedStyle}
                onChange={(e) => {
                  const val = e.target.value as BookStyle | 'all';
                  setSelectedStyle(val);
                  runRecommendation(goalQuery, selectedGoalId, preferredLength, val, selectedModel);
                }}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 cursor-pointer"
              >
                <option value="all">Tất cả phong cách</option>
                <option value="realistic">Thực chiến, rõ ràng, áp dụng ngay</option>
                <option value="subtle">Nhẹ nhàng, thấu cảm, tinh tế</option>
                <option value="philosophical">Hàn lâm, triết luận, tư duy sâu</option>
                <option value="nostalgic">Truyền cảm hứng &amp; sâu lắng</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="text-xs text-slate-500">
              Mô hình <strong className="text-indigo-700">{activeModelMeta.shortName}</strong> đã chấm điểm và xếp hạng{' '}
              <span className="font-bold text-sm text-slate-900">{results.length}</span> cuốn sách phù hợp
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span>Chạy Model Gợi Ý</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4. Bảng Phân Rã Điểm Số Từng Model Cho Top Kết Quả */}
      {results.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Giải thích Mô hình (Explainable AI Scoring)
              </span>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Bảng Điểm Chi Tiết Top 6 Sách Theo Từng Thuật Toán
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowScoreBreakdown((prev) => !prev)}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              {showScoreBreakdown ? 'Thu gọn bảng điểm' : 'Mở rộng bảng điểm'}
            </button>
          </div>

          {showScoreBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {results.slice(0, 6).map((item, idx) => {
                const bd = item.breakdown;
                return (
                  <div
                    key={item.book.id}
                    onClick={() => onSelectBook(item.book)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 transition-all cursor-pointer bg-slate-50/50 hover:bg-white space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-indigo-600">
                          Hạng #{idx + 1} · {item.book.genre}
                        </span>
                        <h4 className="font-serif font-bold text-sm text-slate-900 truncate">
                          {item.book.title}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">{item.book.author}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs shrink-0 tabular-nums">
                        {item.score}%
                      </span>
                    </div>

                    {bd && (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-200/80">
                        <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200/60">
                          <span className="text-slate-500">TF-IDF Cosine:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {Math.round(bd.tfidfCosine * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200/60">
                          <span className="text-slate-500">Okapi BM25:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {Math.round(bd.bm25Normalized * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200/60">
                          <span className="text-slate-500">CF-KNN:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {Math.round(bd.collaborativeKnn * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200/60">
                          <span className="text-slate-500">Rule Score:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {Math.round(bd.ruleScore * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-indigo-700 font-medium line-clamp-1">
                      ✓ {item.matchReasons.join(' · ')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. Results Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
            Danh Sách Tác Phẩm Đề Xuất ({resultBooks.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">
              Đang chạy mô hình {activeModelMeta.shortName} trên {books.length} cuốn sách...
            </p>
          </div>
        ) : resultBooks.length > 0 ? (
          <BookRowGrid
            books={resultBooks}
            onSelectBook={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
          />
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
            <p className="text-base font-serif font-bold text-slate-900">
              Không tìm thấy cuốn sách nào khớp hoàn toàn
            </p>
            <p className="text-xs text-slate-500">
              Hãy thử rút ngắn từ khóa hoặc chọn phong cách tiếp cận khác để xem nhiều gợi ý hơn.
            </p>
            <button
              onClick={handleReset}
              className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Xem toàn bộ danh sách
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
