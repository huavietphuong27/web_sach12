import { Book, BookStyle } from '../types/book';
import {
  USER_INTERACTION_DATASET,
  BENCHMARK_TEST_CASES,
  UserInteractionRecord,
} from '../data/booksDataset';
import { pickPalette, inferStyleAndGoals } from './googleBooks';
import { UserPreferenceSummary } from '../types/events';

export type RecommendationModelType =
  | 'hybrid-ensemble'
  | 'tfidf-cosine'
  | 'bm25'
  | 'collaborative-knn'
  | 'rule-based';

export interface ModelMetadata {
  id: RecommendationModelType;
  name: string;
  shortName: string;
  formula: string;
  description: string;
  badge: string;
}

export const AVAILABLE_MODELS: ModelMetadata[] = [
  {
    id: 'hybrid-ensemble',
    name: 'Hybrid Ensemble (TF-IDF + BM25 + CF-KNN + Rule)',
    shortName: 'Hybrid Ensemble',
    formula: 'S = 0.35·TFIDF + 0.30·BM25 + 0.20·CF_KNN + 0.15·Rule',
    description:
      'Mô hình tổ hợp đa tầng kết hợp độ tương đồng ngữ nghĩa Cosine TF-IDF, xác suất truy hồi Okapi BM25, lọc cộng tác KNN và luật mục tiêu đọc.',
    badge: 'Đề xuất · Chính xác nhất',
  },
  {
    id: 'tfidf-cosine',
    name: 'TF-IDF Vectorizer + Cosine Similarity',
    shortName: 'TF-IDF + Cosine',
    formula: 'cos(q, d) = (q · d) / (||q||₂ × ||d||₂)',
    description:
      'Vector hóa văn bản tiếng Việt (Unigram + Bigram, trọng số trường) và đo góc tương đồng Cosine trong không gian nhiều chiều.',
    badge: 'Content-Based NLP',
  },
  {
    id: 'bm25',
    name: 'Okapi BM25 Probabilistic Ranking',
    shortName: 'Okapi BM25',
    formula: 'Σ IDF(qᵢ) · [f(qᵢ,D)·(k₁+1)] / [f(qᵢ,D) + k₁·(1 - b + b·|D|/avgdl)]',
    description:
      'Mô hình xác suất truy hồi thông tin kinh điển (k₁ = 1.5, b = 0.75) có chuẩn hóa độ dài tài liệu và bão hòa tần suất từ khóa.',
    badge: 'Probabilistic IR',
  },
  {
    id: 'collaborative-knn',
    name: 'Collaborative Filtering & Item-Item KNN',
    shortName: 'Collaborative KNN',
    formula: 'r̂(u, i) = Σ_{j ∈ N_k(i)} sim(i, j) · r(u, j) / Σ |sim(i, j)|',
    description:
      'Khuyến nghị dựa trên ma trận tương tác Người dùng - Sách (User-Item Matrix) và K láng giềng gần nhất (K-Nearest Neighbors).',
    badge: 'Machine Learning CF',
  },
  {
    id: 'rule-based',
    name: 'Knowledge Rule-Based & Goal Matching',
    shortName: 'Rule-Based',
    formula: 'S = w_goal·G + w_style·St + w_len·L + w_rating·R',
    description:
      'Chấm điểm theo tập luật chuyên gia dựa trên mục tiêu đọc sách, phong cách tiếp cận, dung lượng trang và đánh giá cộng đồng.',
    badge: 'Baseline Heuristic',
  },
];

export interface ModelScoreBreakdown {
  tfidfCosine: number; // 0..1
  bm25Normalized: number; // 0..1
  collaborativeKnn: number; // 0..1
  ruleScore: number; // 0..1
  personalizationScore?: number; // 0..1 (điểm khớp sở thích hành vi cá nhân)
  hybridScore: number; // 0..100
  matchedTerms: string[];
}

export interface ModelEvaluationMetrics {
  modelId: RecommendationModelType;
  modelName: string;
  precisionAt5: number;
  recallAt5: number;
  f1Score: number;
  ndcgAt5: number;
  meanScore: number;
  executionTimeMs: number;
}

export interface CorpusStats {
  totalBooks: number;
  vietnamBooks: number;
  worldBooks: number;
  vocabularySize: number;
  avgDocLength: number;
  totalUserInteractions: number;
  totalUsers: number;
}

const VIETNAMESE_STOPWORDS = new Set([
  'la', 'va', 'cua', 'nhung', 'cac', 'mot', 'nhu', 'cho', 'trong', 'voi',
  'duoc', 'co', 'khong', 'nay', 'do', 'khi', 've', 'de', 'tu', 'den',
  'ra', 'vao', 'len', 'xuong', 'nguoi', 'ta', 'toi', 'ban', 'minh', 'chung',
  'hay', 'hoac', 'neu', 'thi', 'ma', 'vi', 'boi', 'tai', 'theo', 'qua',
  'rat', 'nhieu', 'it', 'hon', 'nhat', 'cung', 'da', 'dang', 'se', 'vua',
  'moi', 'cuon', 'sach', 'tac', 'pham', 'doc', 'tim', 'muon', 'can', 'giup',
]);

export function cleanAndNormalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách token Tiếng Việt chuẩn hóa: kết hợp Unigrams + Bigrams để giữ ngữ nghĩa cụm từ
 * (ví dụ: "ky luat", "tri hoan", "tai chinh", "tri tue", "nhan tao", "chua lanh")
 */
export function tokenizeVietnamese(text: string): string[] {
  const cleaned = cleanAndNormalizeText(text);
  if (!cleaned) return [];
  const rawWords = cleaned
    .split(' ')
    .filter((w) => w.length > 1 && !VIETNAMESE_STOPWORDS.has(w));

  const tokens: string[] = [...rawWords];
  for (let i = 0; i < rawWords.length - 1; i++) {
    tokens.push(`${rawWords[i]}_${rawWords[i + 1]}`);
  }
  return tokens;
}

const GOAL_QUERY_EXPANSION: Record<string, string> = {
  skills:
    'ky luat thoi quen hieu suat thoi gian tap trung sâu deep work tri hoan phat trien ban than ky nang tu hoc',
  business:
    'kinh doanh khoi nghiep startup tai chinh dau tu tien bac quan tri chien luoc marketing lam giau lanh dao',
  healing:
    'tam ly chua lanh cam xuc binh yen cang thang stress ap luc mat ngu tram cam overthinking chanh niem trai tim',
  tech:
    'cong nghe tri tue nhan tao ai machine learning khoa hoc du lieu data lap trinh code phan mem tuong lai mang luoi',
  communication:
    'giao tiep lanh dao ung xu thuyet phuc quan he dac nhan tam dam phan thuong luong ket noi doi ngu',
  wisdom:
    'triet hoc tu duy phan bien logic y nghia cuoc song khai minh nhan sinh quyet dinh thien kien nhan thuc',
};

interface IndexedDocument {
  book: Book;
  tokens: string[];
  termFreq: Map<string, number>;
  length: number;
  tfidfVector: Map<string, number>;
  vectorNorm: number;
}

export class BookRecommendationEngine {
  private docs: IndexedDocument[] = [];
  private idf: Map<string, number> = new Map();
  private avgDocLength = 1;
  private interactions: UserInteractionRecord[] = [...USER_INTERACTION_DATASET];
  private itemSimilarityCache: Map<string, Map<string, number>> = new Map();

  constructor(books: Book[], extraInteractions: UserInteractionRecord[] = []) {
    if (extraInteractions.length > 0) {
      this.interactions = [...USER_INTERACTION_DATASET, ...extraInteractions];
    }
    this.buildIndex(books);
  }

  public buildIndex(books: Book[]) {
    const N = Math.max(1, books.length);
    const df = new Map<string, number>();
    let totalLen = 0;

    // Bước 1: Tách từ với trọng số trường (Field Weighting)
    const rawDocs = books.map((book) => {
      // Title x3, Genre & Goals x2.5, Author x2, CuratorNote & Quote & Description x1.5
      const weightedText = [
        book.title,
        book.title,
        book.title,
        book.originalTitle || '',
        book.genre,
        book.genre,
        book.readingGoals.join(' '),
        book.readingGoals.join(' '),
        book.author,
        book.description,
        book.curatorNote || '',
        book.quote || '',
      ].join(' ');

      const tokens = tokenizeVietnamese(weightedText);
      const termFreq = new Map<string, number>();
      for (const t of tokens) {
        termFreq.set(t, (termFreq.get(t) || 0) + 1);
      }

      for (const term of termFreq.keys()) {
        df.set(term, (df.get(term) || 0) + 1);
      }

      totalLen += tokens.length;
      return {
        book,
        tokens,
        termFreq,
        length: tokens.length,
        tfidfVector: new Map<string, number>(),
        vectorNorm: 1,
      };
    });

    this.avgDocLength = totalLen / N || 1;
    this.idf.clear();

    // Bước 2: Tính Smoothed IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
    for (const [term, docCount] of df.entries()) {
      const idfVal = Math.log(1 + (N - docCount + 0.5) / (docCount + 0.5));
      this.idf.set(term, Math.max(0.05, idfVal));
    }

    // Bước 3: Tính TF-IDF Vector cho từng cuốn sách (Sublinear TF: 1 + ln(tf))
    for (const doc of rawDocs) {
      let sumSq = 0;
      for (const [term, count] of doc.termFreq.entries()) {
        const tf = 1 + Math.log(count);
        const idfVal = this.idf.get(term) || 0.1;
        const weight = tf * idfVal;
        doc.tfidfVector.set(term, weight);
        sumSq += weight * weight;
      }
      doc.vectorNorm = Math.sqrt(sumSq) || 1;
    }

    this.docs = rawDocs;
    this.buildItemCollaborativeMatrix();
  }

  /**
   * Xây dựng ma trận tương đồng Item-to-Item cho Collaborative Filtering + KNN
   * Kết hợp lịch sử đánh giá User-Item và đặc trưng thể loại/phong cách (Hybrid CF giúp chống Cold-Start cho sách mới nạp từ Google Books)
   */
  private buildItemCollaborativeMatrix() {
    this.itemSimilarityCache.clear();
    const itemRatings = new Map<string, Map<string, number>>();

    for (const record of this.interactions) {
      for (const [bookId, rating] of Object.entries(record.ratings)) {
        if (!itemRatings.has(bookId)) {
          itemRatings.set(bookId, new Map());
        }
        itemRatings.get(bookId)!.set(record.userId, rating);
      }
    }

    for (let i = 0; i < this.docs.length; i++) {
      const docA = this.docs[i];
      const simMap = new Map<string, number>();
      const ratingsA = itemRatings.get(docA.book.id);

      for (let j = 0; j < this.docs.length; j++) {
        if (i === j) continue;
        const docB = this.docs[j];
        const ratingsB = itemRatings.get(docB.book.id);

        // 1. User-Item Rating Cosine Similarity
        let ratingSim = 0;
        if (ratingsA && ratingsB) {
          let dot = 0;
          let normA = 0;
          let normB = 0;
          for (const [u, rA] of ratingsA.entries()) {
            normA += rA * rA;
            const rB = ratingsB.get(u);
            if (rB !== undefined) {
              dot += rA * rB;
            }
          }
          for (const rB of ratingsB.values()) {
            normB += rB * rB;
          }
          if (normA > 0 && normB > 0) {
            ratingSim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
          }
        }

        // 2. Metadata & Content Latent Similarity (chống Cold-Start khi nạp sách mới)
        let metaSim = 0;
        if (docA.book.style === docB.book.style) metaSim += 0.35;
        if (docA.book.genre === docB.book.genre) metaSim += 0.35;
        if (docA.book.category === docB.book.category) metaSim += 0.15;
        const sharedGoals = docA.book.readingGoals.filter((g) =>
          docB.book.readingGoals.includes(g)
        ).length;
        if (sharedGoals > 0) metaSim += Math.min(0.3, sharedGoals * 0.12);

        const combinedSim = ratingSim > 0 ? 0.65 * ratingSim + 0.35 * Math.min(1, metaSim) : Math.min(0.85, metaSim);
        if (combinedSim > 0.1) {
          simMap.set(docB.book.id, combinedSim);
        }
      }
      this.itemSimilarityCache.set(docA.book.id, simMap);
    }
  }

  public getCorpusStats(): CorpusStats {
    const totalBooks = this.docs.length;
    const vietnamBooks = this.docs.filter((d) => d.book.category === 'vietnam').length;
    const worldBooks = totalBooks - vietnamBooks;
    let totalRatings = 0;
    for (const u of this.interactions) {
      totalRatings += Object.keys(u.ratings).length;
    }

    return {
      totalBooks,
      vietnamBooks,
      worldBooks,
      vocabularySize: this.idf.size,
      avgDocLength: Math.round(this.avgDocLength),
      totalUserInteractions: totalRatings,
      totalUsers: this.interactions.length,
    };
  }

  /**
   * Tính điểm TF-IDF Cosine Similarity giữa truy vấn và từng sách
   */
  private computeTfIdfCosine(queryTokens: string[], doc: IndexedDocument): { score: number; matchedTerms: string[] } {
    if (queryTokens.length === 0) return { score: 0.25, matchedTerms: [] };

    const qFreq = new Map<string, number>();
    for (const t of queryTokens) {
      qFreq.set(t, (qFreq.get(t) || 0) + 1);
    }

    let dot = 0;
    let qNormSq = 0;
    const matchedTerms: string[] = [];

    for (const [term, count] of qFreq.entries()) {
      const idfVal = this.idf.get(term) || 0.2;
      const qWeight = (1 + Math.log(count)) * idfVal;
      qNormSq += qWeight * qWeight;

      const dWeight = doc.tfidfVector.get(term);
      if (dWeight !== undefined) {
        dot += qWeight * dWeight;
        if (!term.includes('_') && matchedTerms.length < 5) {
          matchedTerms.push(term);
        }
      }
    }

    const qNorm = Math.sqrt(qNormSq) || 1;
    const rawCosine = dot / (qNorm * doc.vectorNorm);
    // Phóng đại phi tuyến nhẹ để phân tách thứ hạng rõ ràng trên UI (Cosine thực tế của văn bản ngắn thường từ 0.05..0.55)
    const scaled = Math.min(1, Math.pow(rawCosine * 2.2, 0.75));
    return { score: scaled, matchedTerms };
  }

  /**
   * Tính điểm Okapi BM25
   */
  private computeBM25(queryTokens: string[], doc: IndexedDocument, k1 = 1.5, b = 0.75): number {
    if (queryTokens.length === 0) return 0.25;
    let score = 0;
    const uniqueTerms = new Set(queryTokens);

    for (const term of uniqueTerms) {
      const tf = doc.termFreq.get(term) || 0;
      if (tf === 0) continue;
      const idfVal = this.idf.get(term) || 0.1;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (doc.length / this.avgDocLength));
      score += idfVal * (numerator / denominator);
    }

    return score;
  }

  /**
   * Tính điểm Collaborative Filtering + Item-Item KNN (K = 5)
   */
  private computeCollaborativeKnn(
    doc: IndexedDocument,
    seedBookIds: string[],
    k = 5
  ): number {
    const simMap = this.itemSimilarityCache.get(doc.book.id);
    if (!simMap || simMap.size === 0) {
      return (doc.book.rating || 4.5) / 5;
    }

    // Nếu có tập sách hạt giống (từ mục tiêu, lịch sử yêu thích hoặc top từ khóa), tính điểm láng giềng KNN
    if (seedBookIds.length > 0) {
      const neighbors: number[] = [];
      for (const seedId of seedBookIds) {
        if (seedId === doc.book.id) {
          neighbors.push(0.95);
        } else {
          const s = simMap.get(seedId) || 0;
          if (s > 0) neighbors.push(s);
        }
      }
      neighbors.sort((a, b) => b - a);
      const topK = neighbors.slice(0, k);
      if (topK.length > 0) {
        const avgSim = topK.reduce((acc, v) => acc + v, 0) / topK.length;
        const popBoost = Math.min(0.15, ((doc.book.rating || 4.5) - 4.0) * 0.2);
        return Math.min(1, avgSim + popBoost);
      }
    }

    // Điểm trung bình từ K láng giềng có tương tác cao nhất trong User-Item Matrix
    const allSims = Array.from(simMap.values()).sort((a, b) => b - a).slice(0, k);
    const meanSim = allSims.length > 0 ? allSims.reduce((a, b) => a + b, 0) / allSims.length : 0.4;
    return Math.min(1, meanSim * 0.85 + ((doc.book.rating || 4.5) / 5) * 0.15);
  }

  /**
   * Tính điểm Rule-Based (Mục tiêu đọc, Phong cách, Độ dài, Đánh giá)
   */
  private computeRuleScore(
    doc: IndexedDocument,
    criteria: {
      goalId?: string;
      preferredLength?: 'all' | 'short' | 'medium' | 'long';
      style?: BookStyle | 'all';
    }
  ): { score: number; reasons: string[] } {
    let points = 0.2;
    const reasons: string[] = [];
    const b = doc.book;

    if (criteria.preferredLength && criteria.preferredLength !== 'all') {
      if (criteria.preferredLength === 'short' && b.pages > 0 && b.pages <= 220) {
        points += 0.25;
        reasons.push('Độ dài tinh gọn (<220 trang), đọc nhanh');
      } else if (criteria.preferredLength === 'medium' && b.pages > 200 && b.pages <= 420) {
        points += 0.25;
        reasons.push('Dung lượng tiêu chuẩn (200-420 trang)');
      } else if (criteria.preferredLength === 'long' && b.pages > 400) {
        points += 0.25;
        reasons.push('Nội dung chuyên sâu (>400 trang)');
      }
    }

    if (criteria.style && criteria.style !== 'all' && b.style === criteria.style) {
      points += 0.25;
      reasons.push('Khớp phong cách tiếp cận đã chọn');
    }

    if (criteria.goalId) {
      const goalToStyle: Record<string, BookStyle[]> = {
        skills: ['realistic', 'nostalgic'],
        business: ['realistic', 'philosophical'],
        healing: ['subtle', 'nostalgic'],
        tech: ['philosophical', 'realistic'],
        communication: ['realistic', 'subtle'],
        wisdom: ['philosophical', 'nostalgic'],
      };
      const goalLabels: Record<string, string> = {
        skills: 'Khớp mục tiêu Phát triển bản thân & Kỷ luật',
        business: 'Khớp mục tiêu Kinh doanh & Tài chính',
        healing: 'Khớp mục tiêu Tâm lý & Chữa lành',
        tech: 'Khớp mục tiêu Công nghệ & AI',
        communication: 'Khớp mục tiêu Giao tiếp & Lãnh đạo',
        wisdom: 'Khớp mục tiêu Triết lý & Tư duy phản biện',
      };

      const targetStyles = goalToStyle[criteria.goalId] || [];
      if (targetStyles.includes(b.style)) {
        points += 0.2;
      }

      const expKeywords = (GOAL_QUERY_EXPANSION[criteria.goalId] || '').split(' ');
      let hits = 0;
      for (const kw of expKeywords) {
        if (kw && doc.termFreq.has(kw)) hits++;
      }
      if (hits > 0) {
        points += Math.min(0.35, hits * 0.08);
        reasons.unshift(goalLabels[criteria.goalId] || 'Phù hợp mục tiêu đọc');
      }
    }

    if (b.isFeatured) points += 0.08;
    if ((b.rating || 0) >= 4.8) points += 0.07;

    return { score: Math.min(1, points), reasons };
  }

  /**
   * Thuật toán đa dạng hóa danh mục Maximal Marginal Relevance (MMR)
   * Cân bằng giữa Điểm phù hợp (Relevance) và Độ đa dạng tác giả/thể loại (Diversity)
   */
  private applyDiversityMMR<T extends { book: Book; score: number }>(
    items: T[],
    lambda = 0.75,
    limit = 20
  ): T[] {
    if (items.length <= 2) return items;
    const selected: T[] = [];
    const remaining = [...items];

    // Hàm đo độ tương đồng giữa 2 cuốn sách (tác giả + thể loại + style)
    const computeBookSimilarity = (b1: Book, b2: Book): number => {
      let sim = 0;
      if (b1.author.toLowerCase() === b2.author.toLowerCase()) sim += 0.50;
      if (b1.genre.toLowerCase() === b2.genre.toLowerCase()) sim += 0.30;
      if (b1.style === b2.style) sim += 0.20;
      return sim;
    };

    // Chọn phần tử điểm cao nhất đầu tiên
    selected.push(remaining.shift()!);

    while (remaining.length > 0 && selected.length < limit) {
      let bestIdx = 0;
      let bestMMRScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance = candidate.score / 100;
        let maxSim = 0;
        for (const s of selected) {
          const sim = computeBookSimilarity(candidate.book, s.book);
          if (sim > maxSim) maxSim = sim;
        }

        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        if (mmrScore > bestMMRScore) {
          bestMMRScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return [...selected, ...remaining];
  }

  /**
   * Chạy mô hình được chọn để xếp hạng toàn bộ sách kèm Tái xếp hạng cá nhân hóa & Đa dạng MMR
   */
  public rankBooks(
    criteria: {
      query?: string;
      goalId?: string;
      preferredLength?: 'all' | 'short' | 'medium' | 'long';
      style?: BookStyle | 'all';
      favoriteBookIds?: string[];
      userPreference?: UserPreferenceSummary;
      enableDiversityMMR?: boolean;
      mmrLambda?: number;
    },
    modelType: RecommendationModelType = 'hybrid-ensemble'
  ): {
    results: Array<{
      book: Book;
      score: number; // 0..100
      matchReasons: string[];
      breakdown: ModelScoreBreakdown;
    }>;
    executionTimeMs: number;
  } {
    const t0 = performance.now();

    const expandedQuery = [
      criteria.query || '',
      criteria.goalId ? GOAL_QUERY_EXPANSION[criteria.goalId] || '' : '',
    ]
      .join(' ')
      .trim();

    const queryTokens = tokenizeVietnamese(expandedQuery);

    // Bước 1: Tính TF-IDF và BM25 thô
    const rawTfidf = this.docs.map((doc) => this.computeTfIdfCosine(queryTokens, doc));
    const rawBm25 = this.docs.map((doc) => this.computeBM25(queryTokens, doc));
    const maxBm25 = Math.max(0.001, ...rawBm25);

    // Tìm các sách hạt giống (Seed Items) cho Collaborative KNN dựa trên yêu thích hoặc top nội dung
    const topContentSeeds = this.docs
      .map((d, idx) => ({ id: d.book.id, val: rawTfidf[idx].score + rawBm25[idx] / maxBm25 }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 4)
      .filter((x) => x.val > 0.35)
      .map((x) => x.id);

    const seedBookIds = Array.from(
      new Set([...(criteria.favoriteBookIds || []), ...topContentSeeds])
    );

    const hasFilter =
      Boolean(queryTokens.length > 0) ||
      Boolean(criteria.goalId) ||
      Boolean(criteria.preferredLength && criteria.preferredLength !== 'all') ||
      Boolean(criteria.style && criteria.style !== 'all');

    const ranked = this.docs.map((doc, idx) => {
      const tfidfRes = rawTfidf[idx];
      const tfidfCosine = Number(tfidfRes.score.toFixed(4));
      const bm25Normalized = Number(Math.min(1, rawBm25[idx] / maxBm25).toFixed(4));
      const collaborativeKnn = Number(
        this.computeCollaborativeKnn(doc, seedBookIds, 5).toFixed(4)
      );
      const ruleRes = this.computeRuleScore(doc, criteria);
      const ruleScore = Number(ruleRes.score.toFixed(4));

      // TÍNH ĐIỂM CÁ NHÂN HÓA DỰA TRÊN HỒ SƠ HỌC MÁY (TASK-03)
      let persPoints = 0;
      const persReasons: string[] = [];
      if (criteria.userPreference) {
        const pref = criteria.userPreference;
        const b = doc.book;

        // 1. Phạt nặng sách người dùng từng bấm bỏ qua (Dismissed)
        if (pref.recentlyDismissedBookIds?.includes(b.id)) {
          persPoints -= 0.65;
        }

        // 2. Tăng điểm theo Thể loại yêu thích (Category Affinity)
        const bookGenre = (b.genre || '').toLowerCase();
        for (const [cat, weight] of Object.entries(pref.categoryAffinity || {})) {
          if (
            bookGenre.includes(cat.toLowerCase()) ||
            (b.readingGoals || []).some((g) => g.toLowerCase().includes(cat.toLowerCase()))
          ) {
            persPoints += weight * 0.40;
            persReasons.push(`Gu thể loại [${cat}] (+${Math.round(weight * 40)}%)`);
            break;
          }
        }

        // 3. Tăng điểm theo Tác giả yêu thích (Author Affinity)
        const authorW = pref.authorAffinity?.[b.author];
        if (authorW) {
          persPoints += authorW * 0.35;
          persReasons.push(`Tác giả yêu thích: ${b.author}`);
        }

        // 4. Khớp từ khóa quan tâm
        let kwHits = 0;
        for (const [kw, kwW] of Object.entries(pref.keywordWeights || {})) {
          if (doc.termFreq.has(kw)) {
            persPoints += kwW * 0.15;
            kwHits++;
            if (kwHits >= 2) break;
          }
        }
      }
      const personalizationScore = Number(Math.max(0, Math.min(1, persPoints)).toFixed(4));

      // CÔNG THỨC HYBRID ENSEMBLE KẾT HỢP CÁ NHÂN HÓA
      const hybridRaw = criteria.userPreference
        ? 0.28 * tfidfCosine +
          0.24 * bm25Normalized +
          0.18 * collaborativeKnn +
          0.10 * ruleScore +
          0.20 * personalizationScore
        : 0.35 * tfidfCosine +
          0.30 * bm25Normalized +
          0.20 * collaborativeKnn +
          0.15 * ruleScore;

      let activeScore01 = hybridRaw;
      if (modelType === 'tfidf-cosine') {
        activeScore01 = 0.85 * tfidfCosine + 0.15 * ruleScore;
      } else if (modelType === 'bm25') {
        activeScore01 = 0.85 * bm25Normalized + 0.15 * ruleScore;
      } else if (modelType === 'collaborative-knn') {
        activeScore01 = 0.70 * collaborativeKnn + 0.30 * tfidfCosine;
      } else if (modelType === 'rule-based') {
        activeScore01 = 0.75 * ruleScore + 0.25 * bm25Normalized;
      }

      const finalScore100 = Math.round(Math.min(99, Math.max(12, activeScore01 * 100)));

      const reasons = [...persReasons, ...ruleRes.reasons];
      if (tfidfCosine >= 0.45) {
        reasons.push(`Độ tương đồng Cosine cao (${Math.round(tfidfCosine * 100)}%)`);
      }
      if (bm25Normalized >= 0.5) {
        reasons.push(`Điểm truy hồi BM25 cao (${Math.round(bm25Normalized * 100)}%)`);
      }
      if (collaborativeKnn >= 0.6) {
        reasons.push(`Gợi ý cộng tác KNN (${Math.round(collaborativeKnn * 100)}%)`);
      }
      if (reasons.length === 0) {
        reasons.push('Tác phẩm nổi bật trong kho dữ liệu');
      }

      return {
        book: doc.book,
        score: finalScore100,
        matchReasons: reasons.slice(0, 3),
        breakdown: {
          tfidfCosine,
          bm25Normalized,
          collaborativeKnn,
          ruleScore,
          personalizationScore,
          hybridScore: Math.round(hybridRaw * 100),
          matchedTerms: tfidfRes.matchedTerms,
        },
      };
    });

    const filtered = ranked
      .filter((item) => {
        if (!hasFilter) return true;
        // Nếu người dùng chọn bộ lọc cứng về độ dài hoặc style
        if (criteria.preferredLength && criteria.preferredLength !== 'all') {
          const p = item.book.pages;
          if (criteria.preferredLength === 'short' && p > 220) return false;
          if (criteria.preferredLength === 'medium' && (p <= 200 || p > 420)) return false;
          if (criteria.preferredLength === 'long' && p <= 400) return false;
        }
        if (criteria.style && criteria.style !== 'all' && item.book.style !== criteria.style) {
          return false;
        }
        return item.score >= 22;
      })
      .sort((a, b) => b.score - a.score || (b.book.rating || 0) - (a.book.rating || 0));

    // Áp dụng Đa dạng hóa MMR (Maximal Marginal Relevance) để tránh trùng lặp tác giả/thể loại
    const shouldApplyMMR = criteria.enableDiversityMMR !== false;
    const finalCandidates = filtered.length > 0 ? filtered : ranked.sort((a, b) => b.score - a.score).slice(0, 8);
    const diverseResults = shouldApplyMMR && finalCandidates.length > 3
      ? this.applyDiversityMMR(finalCandidates, criteria.mmrLambda ?? 0.75, 20)
      : finalCandidates;

    const t1 = performance.now();
    return {
      results: diverseResults,
      executionTimeMs: Number(Math.max(0.4, t1 - t0).toFixed(2)),
    };
  }

  /**
   * Gợi ý sách tương tự với một cuốn sách đang xem (Item-to-Item Similarity kết hợp TF-IDF Cosine + Collaborative KNN)
   */
  public findSimilarBooks(
    targetBook: Book,
    topN = 4
  ): Array<{ book: Book; similarity: number; reason: string }> {
    const queryText = `${targetBook.title} ${targetBook.genre} ${targetBook.readingGoals.join(' ')} ${targetBook.description}`;
    const qTokens = tokenizeVietnamese(queryText);
    const cfMap = this.itemSimilarityCache.get(targetBook.id);

    const scored = this.docs
      .filter((d) => d.book.id !== targetBook.id)
      .map((doc) => {
        const tfidf = this.computeTfIdfCosine(qTokens, doc).score;
        const cf = cfMap?.get(doc.book.id) || (doc.book.style === targetBook.style ? 0.55 : 0.25);
        const sim = Math.min(0.98, 0.55 * tfidf + 0.45 * cf);
        let reason = 'Tương đồng nội dung TF-IDF & Lọc cộng tác KNN';
        if (doc.book.genre === targetBook.genre && doc.book.style === targetBook.style) {
          reason = `Cùng chủ đề ${doc.book.genre} & phong cách tiếp cận`;
        } else if (cf >= 0.65) {
          reason = 'Được độc giả có cùng gu đánh giá cao (Item-KNN)';
        }
        return {
          book: doc.book,
          similarity: Math.round(sim * 100),
          reason,
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topN);
  }

  /**
   * Chạy thực nghiệm đánh giá và so sánh cả 5 mô hình trên tập Benchmark Ground-Truth (Precision@5, Recall@5, F1, NDCG@5)
   */
  public evaluateAllModels(k = 5): ModelEvaluationMetrics[] {
    return AVAILABLE_MODELS.map((m) => {
      let sumPrecision = 0;
      let sumRecall = 0;
      let sumNdcg = 0;
      let sumScore = 0;
      const t0 = performance.now();

      for (const testCase of BENCHMARK_TEST_CASES) {
        const relevantSet = new Set(testCase.relevantBookIds);
        const { results } = this.rankBooks(
          { query: testCase.query, goalId: testCase.goalId },
          m.id
        );
        const topK = results.slice(0, k);

        let hits = 0;
        let dcg = 0;
        let idcg = 0;

        topK.forEach((item, idx) => {
          sumScore += item.score;
          if (relevantSet.has(item.book.id)) {
            hits += 1;
            dcg += 1 / Math.log2(idx + 2);
          }
        });

        const idealCount = Math.min(k, relevantSet.size);
        for (let i = 0; i < idealCount; i++) {
          idcg += 1 / Math.log2(i + 2);
        }

        sumPrecision += hits / k;
        sumRecall += hits / Math.max(1, relevantSet.size);
        sumNdcg += idcg > 0 ? dcg / idcg : 0;
      }

      const t1 = performance.now();
      const numCases = BENCHMARK_TEST_CASES.length;
      const p = sumPrecision / numCases;
      const r = sumRecall / numCases;
      const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
      const ndcg = sumNdcg / numCases;

      return {
        modelId: m.id,
        modelName: m.shortName,
        precisionAt5: Number((p * 100).toFixed(1)),
        recallAt5: Number((r * 100).toFixed(1)),
        f1Score: Number((f1 * 100).toFixed(1)),
        ndcgAt5: Number((ndcg * 100).toFixed(1)),
        meanScore: Number((sumScore / (numCases * k)).toFixed(1)),
        executionTimeMs: Number(Math.max(0.5, t1 - t0).toFixed(2)),
      };
    });
  }
}

/**
 * Phân tích file CSV hoặc JSON do người dùng tải lên để nạp thêm sách vào kho dữ liệu
 */
export function parseUploadedDataset(content: string, fileName: string): Book[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // 1. Nếu là JSON
  if (fileName.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : parsed.books || [];
    return arr.map((item: Record<string, unknown>, idx: number) => {
      const title = String(item.title || `Sách dữ liệu #${idx + 1}`);
      const author = String(item.author || item.authors || 'Nhiều tác giả');
      const genre = String(item.genre || item.category || 'Tri thức & Đời sống');
      const description = String(item.description || 'Tác phẩm bổ sung từ bộ dữ liệu.');
      const { style, readingGoals } = inferStyleAndGoals(genre, title, description);
      return {
        id: String(item.id || `custom-json-${Date.now()}-${idx}`),
        title,
        originalTitle: item.originalTitle ? String(item.originalTitle) : undefined,
        author,
        translator: item.translator ? String(item.translator) : undefined,
        genre,
        category: item.category === 'vietnam' ? 'vietnam' : 'world',
        publishYear: Number(item.publishYear) || 2023,
        pages: Number(item.pages) || 280,
        publisher: String(item.publisher || 'NXB Tổng Hợp'),
        description,
        curatorNote: String(item.curatorNote || ''),
        quote: String(item.quote || ''),
        readingGoals: Array.isArray(item.readingGoals)
          ? item.readingGoals.map(String)
          : readingGoals,
        style: (item.style as BookStyle) || style,
        coverPalette: pickPalette(title + author),
        isFeatured: Boolean(item.isFeatured),
        coverUrl: item.coverUrl ? String(item.coverUrl) : undefined,
        rating: Number(item.rating) || 4.7,
        ratingsCount: Number(item.ratingsCount) || 85,
      } satisfies Book;
    });
  }

  // 2. Nếu là CSV
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const books: Book[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });

    const title = row.title || row.tensach || `Sách CSV #${i}`;
    const author = row.author || row.tacgia || 'Nhiều tác giả';
    const genre = row.genre || row.theloai || 'Tri thức & Kỹ năng';
    const description = row.description || row.mota || 'Tác phẩm được nạp từ tập dữ liệu CSV.';
    const { style, readingGoals } = inferStyleAndGoals(genre, title, description);

    books.push({
      id: row.id || `csv-${Date.now()}-${i}`,
      title,
      originalTitle: row.originaltitle || undefined,
      author,
      translator: row.translator || undefined,
      genre,
      category: row.category === 'vietnam' ? 'vietnam' : 'world',
      publishYear: Number(row.publishyear) || 2023,
      pages: Number(row.pages) || 260,
      publisher: row.publisher || 'NXB Tri Thức',
      description,
      curatorNote: row.curatornote || '',
      quote: row.quote || '',
      readingGoals: row.readinggoals
        ? row.readinggoals.split('|').map((s) => s.trim()).filter(Boolean)
        : readingGoals,
      style: (row.style as BookStyle) || style,
      coverPalette: pickPalette(title + author),
      isFeatured: Number(row.rating || 4.7) >= 4.8,
      rating: Number(row.rating) || 4.7,
      ratingsCount: Number(row.ratingscount) || 60,
    });
  }

  return books;
}

/**
 * Kho dữ liệu mở rộng (Extended Benchmark Dataset) để người dùng có thể bấm nạp nhanh tại chỗ
 */
export const EXTENDED_SYNTHETIC_BOOKS: Book[] = [
  {
    id: 'ext-flow-dong-chay',
    title: 'Dòng Chảy (Flow): Tâm Lý Học Về Trải Nghiệm Tối Ưu',
    originalTitle: 'Flow: The Psychology of Optimal Experience',
    author: 'Mihaly Csikszentmihalyi',
    translator: 'Nguyễn Minh',
    genre: 'Tâm lý & Hiệu suất',
    category: 'world',
    publishYear: 2023,
    pages: 436,
    publisher: 'NXB Trẻ',
    description:
      'Giải mã trạng thái "Dòng chảy" (Flow) — khi con người hoàn toàn đắm chìm vào một hoạt động với sự tập trung cao độ, quên đi thời gian và đạt được niềm hạnh phúc lẫn hiệu suất sáng tạo đỉnh cao.',
    curatorNote:
      'Bổ sung hoàn hảo cho Deep Work và Thói Quen Nguyên Tử để đạt trạng thái tập trung tối đa.',
    quote: 'Những khoảnh khắc tuyệt vời nhất thường xảy ra khi cơ thể hoặc tâm trí của một người được kéo căng đến giới hạn trong một nỗ lực tự nguyện.',
    readingGoals: ['Tập trung sâu', 'Nâng cao hiệu suất', 'Tâm lý học tích cực', 'Sáng tạo đỉnh cao'],
    style: 'philosophical',
    coverPalette: pickPalette('flow-dong-chay'),
    isFeatured: true,
    rating: 4.9,
    ratingsCount: 1120,
  },
  {
    id: 'ext-black-swan',
    title: 'Thiên Nga Đen: Xác Suất Cực Nhỏ, Tác Động Cực Lớn',
    originalTitle: 'The Black Swan: The Impact of the Highly Improbable',
    author: 'Nassim Nicholas Taleb',
    translator: 'Nguyễn Cảnh Bình',
    genre: 'Kinh doanh & Tư duy phản biện',
    category: 'world',
    publishYear: 2022,
    pages: 520,
    publisher: 'NXB Thế Giới',
    description:
      'Phân tích những sự kiện hiếm gặp, không thể dự báo trước nhưng lại định hình lịch sử, thị trường tài chính và công nghệ, giúp bạn xây dựng tư duy chống chịu rủi ro (Antifragile).',
    curatorNote:
      'Tác phẩm kinh điển cho nhà đầu tư tài chính, quản trị rủi ro và người rèn luyện tư duy phản biện.',
    quote: 'Sự bất lực trong việc dự đoán các sự kiện ngoại lệ chính là sự bất lực trong việc dự đoán dòng chảy của lịch sử.',
    readingGoals: ['Quản trị rủi ro', 'Đầu tư tài chính', 'Tư duy phản biện', 'Ra quyết định chiến lược'],
    style: 'philosophical',
    coverPalette: pickPalette('black-swan'),
    isFeatured: true,
    rating: 4.8,
    ratingsCount: 940,
  },
  {
    id: 'ext-influence-cialdini',
    title: 'Những Đòn Tâm Lý Trong Thuyết Phục',
    originalTitle: 'Influence: The Psychology of Persuasion',
    author: 'Robert B. Cialdini',
    translator: 'Trần Đình',
    genre: 'Giao tiếp & Tâm lý học',
    category: 'world',
    publishYear: 2023,
    pages: 448,
    publisher: 'NXB Lao Động',
    description:
      'Khám phá 6 nguyên tắc cốt lõi của nghệ thuật thuyết phục: Đáp trả, Cam kết & Nhất quán, Bằng chứng xã hội, Thiện cảm, Uy quyền và Khan hiếm.',
    curatorNote:
      'Cuốn sách gối đầu giường cho người làm kinh doanh, marketing, đàm phán và giao tiếp lãnh đạo.',
    quote: 'Con người có xu hướng nói Có với những người mà họ biết và yêu mến.',
    readingGoals: ['Nghệ thuật giao tiếp', 'Kỹ năng thuyết phục', 'Marketing & Bán hàng', 'Tâm lý học hành vi'],
    style: 'realistic',
    coverPalette: pickPalette('influence-cialdini'),
    isFeatured: true,
    rating: 4.9,
    ratingsCount: 1620,
  },
  {
    id: 'ext-ikigai',
    title: 'Ikigai: Đi Tìm Lý Do Thức Dậy Mỗi Sáng',
    originalTitle: 'Ikigai: The Japanese Secret to a Long and Happy Life',
    author: 'Héctor García, Francesc Miralles',
    translator: 'Trương Anh',
    genre: 'Tâm lý & Chữa lành',
    category: 'world',
    publishYear: 2022,
    pages: 216,
    publisher: 'NXB Thế Giới',
    description:
      'Bí quyết sống trường thọ, bình an và tràn đầy năng lượng của người dân đảo Okinawa Nhật Bản thông qua việc tìm ra giao điểm giữa đam mê, sứ mệnh, chuyên môn và công việc.',
    curatorNote:
      'Nhẹ nhàng, ngắn gọn, rất phù hợp khi bạn đang mất phương hướng và muốn tìm lại ý nghĩa cuộc sống.',
    quote: 'Chỉ khi luôn bận rộn với điều mình yêu thích, bạn mới muốn sống tới trăm năm.',
    readingGoals: ['Tìm lại phương hướng', 'Cân bằng cảm xúc', 'Chữa lành tâm hồn', 'Đọc nhanh áp dụng ngay'],
    style: 'subtle',
    coverPalette: pickPalette('ikigai'),
    isFeatured: false,
    rating: 4.7,
    ratingsCount: 1290,
  },
  {
    id: 'ext-hands-on-ml',
    title: 'Thực Hành Học Máy Với Scikit-Learn, Keras & TensorFlow',
    originalTitle: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
    author: 'Aurélien Géron',
    translator: 'Nhóm Kỹ Sư AI Việt Nam',
    genre: 'Công nghệ & Trí tuệ nhân tạo',
    category: 'world',
    publishYear: 2024,
    pages: 680,
    publisher: 'NXB Khoa Học & Kỹ Thuật',
    description:
      'Hướng dẫn toàn diện từ các thuật toán Machine Learning cổ điển (Hồi quy, SVM, Random Forest, TF-IDF, Hệ thống gợi ý) đến mạng nơ-ron sâu Deep Learning và Transformers.',
    curatorNote:
      'Tài liệu thực chiến số 1 cho sinh viên CNTT và kỹ sư muốn xây dựng mô hình AI từ con số 0.',
    quote: 'Học máy là khoa học và nghệ thuật lập trình cho máy tính có thể học hỏi trực tiếp từ dữ liệu.',
    readingGoals: ['Tìm hiểu Trí tuệ nhân tạo AI', 'Khoa học dữ liệu & AI', 'Nâng cao kỹ năng lập trình', 'Hệ thống gợi ý'],
    style: 'realistic',
    coverPalette: pickPalette('hands-on-ml'),
    isFeatured: true,
    rating: 4.9,
    ratingsCount: 950,
  },
  {
    id: 'ext-cay-cam-ngot',
    title: 'Cây Cam Ngọt Của Tôi',
    originalTitle: 'Meu Pé de Laranja Lima',
    author: 'José Mauro de Vasconcelos',
    translator: 'Nguyễn Bích Lan, Tô Yến Ly',
    genre: 'Văn học & Chữa lành',
    category: 'world',
    publishYear: 2022,
    pages: 244,
    publisher: 'NXB Hội Nhà Văn',
    description:
      'Câu chuyện trong trẻo và xót xa về cậu bé Zezé 5 tuổi nghèo khổ nhưng giàu trí tưởng tượng cùng người bạn tâm giao là cây cam ngọt nhỏ sau vườn và ông Bồ Đào Nha nhân hậu.',
    curatorNote:
      'Cuốn sách sưởi ấm trái tim, đánh thức lòng trắc ẩn và sự dịu dàng trong mỗi con người.',
    quote: 'Nỗi đau là gì ư? Nỗi đau là thứ mà người ta phải chết đi thì mới hết đau.',
    readingGoals: ['Chữa lành tâm hồn', 'Nuôi dưỡng cảm xúc', 'Đồng cảm sâu sắc', 'Văn học kinh điển'],
    style: 'nostalgic',
    coverPalette: pickPalette('cay-cam-ngot'),
    isFeatured: true,
    rating: 4.9,
    ratingsCount: 3100,
  },
  {
    id: 'ext-tu-tot-den-vi-dai',
    title: 'Từ Tốt Đến Vĩ Đại (Good to Great)',
    originalTitle: 'Good to Great: Why Some Companies Make the Leap and Others Don\'t',
    author: 'Jim Collins',
    translator: 'Trần Thị Ngân Tuyến',
    genre: 'Kinh doanh & Lãnh đạo',
    category: 'world',
    publishYear: 2022,
    pages: 416,
    publisher: 'NXB Trẻ',
    description:
      'Nghiên cứu kéo dài 5 năm về các tập đoàn nhảy vọt từ mức tốt lên vĩ đại bền vững: Khái niệm Lãnh đạo cấp độ 5, Đi tìm con người trước khi chọn hướng đi, và Khái niệm Con Nhím.',
    curatorNote:
      'Tác phẩm kinh điển về quản trị chiến lược, lãnh đạo khiêm nhường và kỷ luật doanh nghiệp.',
    quote: 'Tốt chính là kẻ thù lớn nhất của Vĩ đại.',
    readingGoals: ['Quản trị doanh nghiệp', 'Kỹ năng lãnh đạo', 'Tư duy chiến lược', 'Kỷ luật tổ chức'],
    style: 'realistic',
    coverPalette: pickPalette('good-to-great'),
    isFeatured: true,
    rating: 4.8,
    ratingsCount: 1430,
  },
  {
    id: 'ext-suoi-nguon',
    title: 'Suối Nguồn (The Fountainhead)',
    originalTitle: 'The Fountainhead',
    author: 'Ayn Rand',
    translator: 'Mạc Đĩnh, Cao Xuân Hạo',
    genre: 'Văn học & Triết học',
    category: 'world',
    publishYear: 2023,
    pages: 920,
    publisher: 'NXB Trẻ',
    description:
      'Cuộc đấu tranh kiên cường của kiến trúc sư thiên tài Howard Roark nhằm bảo vệ bản sắc sáng tạo độc lập và phẩm giá cá nhân trước đám đông thỏa hiệp.',
    curatorNote:
      'Tác phẩm đồ sộ truyền cảm hứng mãnh liệt về tinh thần độc lập tư duy và lòng tự trọng nghề nghiệp.',
    quote: 'Để nói "Tôi yêu em", trước hết một người phải biết nói chữ "Tôi".',
    readingGoals: ['Tư duy độc lập', 'Triết lý sống', 'Bản lĩnh cá nhân', 'Nội dung chuyên sâu'],
    style: 'philosophical',
    coverPalette: pickPalette('suoi-nguon'),
    isFeatured: true,
    rating: 4.9,
    ratingsCount: 1750,
  },
];
