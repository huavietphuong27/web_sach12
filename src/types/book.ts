export type BookCategory = 'all' | 'vietnam' | 'world';

export type BookStyle = 'subtle' | 'realistic' | 'philosophical' | 'nostalgic';

export interface Book {
  id: string;
  title: string;
  originalTitle?: string;
  author: string;
  translator?: string;
  genre: string;
  category: 'vietnam' | 'world';
  publishYear: number;
  pages: number;
  publisher: string;
  description: string;
  curatorNote: string;
  quote: string;
  readingGoals: string[];
  style: BookStyle;
  coverPalette: {
    bg: string;
    spine: string;
    text: string;
    accent: string;
  };
  isFeatured?: boolean;
  isbn?: string;
  coverUrl?: string;
  infoLink?: string;
  rating?: number;
  ratingsCount?: number;
}

export interface ReadingGoal {
  id: string;
  title: string;
  description: string;
  examplePrompt: string;
  suggestedStyles: BookStyle[];
}

export interface QuickFilterTag {
  type: 'author' | 'publisher' | 'year';
  value: string | number;
  label: string;
}

export interface FilterState {
  searchQuery: string;
  genre: string;
  category: BookCategory;
  length: 'all' | 'short' | 'medium' | 'long';
  sortBy: 'featured' | 'title' | 'pages-asc' | 'pages-desc' | 'year';
  tagFilter?: QuickFilterTag | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedBookIds?: string[];
}
