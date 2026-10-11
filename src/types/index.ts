export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface VaderResult {
  compound: number;
  pos: number;
  neu: number;
  neg: number;
  label: SentimentLabel;
}

export interface HuggingFaceResult {
  label: SentimentLabel;
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
  deviceUsed: 'webgpu' | 'wasm' | 'simulated';
}

export type ThemeType =
  | 'Delivery'
  | 'Product Quality'
  | 'Customer Service'
  | 'Price/Value'
  | 'Website/App Experience'
  | 'Returns/Refunds';

export interface MatchedTheme {
  theme: ThemeType;
  keywords: string[];
}

export interface SentenceAnalysis {
  sentence: string;
  vader: VaderResult;
  huggingFace?: HuggingFaceResult | null;
  finalSentiment: SentimentLabel;
  needsReview: boolean;
}

export interface AnalysisItem {
  id: string;
  text: string;
  rawText: string;
  timestamp: number;
  starRating?: number; // 1 to 5
  date?: string;
  vader: VaderResult;
  huggingFace?: HuggingFaceResult | null;
  finalSentiment: SentimentLabel;
  needsReview: boolean; // Engines disagree
  chosenEngine: 'both_agreed' | 'huggingface_confident' | 'vader_fallback' | 'vader_only';
  themes: ThemeType[];
  themeDetails: MatchedTheme[];
  source: 'manual' | 'paste' | 'ocr' | 'csv' | 'example';
  explanation?: string;
  sentenceBreakdown?: SentenceAnalysis[];
  isSentence?: boolean;
}

export type PipelineStep =
  | 'idle'
  | 'intake'
  | 'ocr'
  | 'vader'
  | 'huggingface'
  | 'themes'
  | 'reconciler'
  | 'completed'
  | 'error';

export interface ModelLoadingState {
  status: 'unloaded' | 'loading' | 'ready' | 'error';
  progress: number; // 0 to 100
  statusText: string;
  device?: 'webgpu' | 'wasm' | 'error';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  content?: string;
  type: 'text' | 'item_result' | 'ocr_checklist' | 'csv_batch_result' | 'report' | 'suggestion_prompt';
  item?: AnalysisItem;
  items?: AnalysisItem[];
  reportContent?: string;
  chips?: string[];
}

export interface FilterState {
  sentiment: 'all' | SentimentLabel;
  theme: 'all' | ThemeType;
  disagreementsOnly: boolean;
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'most_negative' | 'most_positive' | 'disagreements_first';
  selectedWord?: string;
}
