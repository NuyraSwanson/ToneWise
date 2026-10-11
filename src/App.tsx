/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AnalysisItem,
  ChatMessage,
  FilterState,
  ModelLoadingState,
  PipelineStep,
  ThemeType,
  VisualExpression,
} from './types';
import { sentimentService } from './services/sentimentService';
import { processImageOcr } from './services/ocrService';
import {
  processFullImage,
  analyzeVisualExpression,
  readFileAsDataUrl,
  generateSampleScreenshotDataUrl,
  generateSampleExpressionDataUrl,
} from './services/imageAnalysisService';
import { parseCsvFile, exportReviewsToCsv, CsvParsedData } from './utils/csv';
import { generateMarkdownReport } from './utils/reportGenerator';
import { ALL_THEMES } from './utils/themes';
import { Header } from './components/Header';
import { ChatView } from './components/Chat/ChatView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ExplainModal } from './components/Chat/ExplainModal';
import { OcrChecklistModal } from './components/Chat/OcrChecklistModal';
import { CsvMapperModal } from './components/Chat/CsvMapperModal';
import { MessageSquare, BarChart3, ShieldCheck, X, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'tonewise_reviews_v1';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome_1',
  sender: 'assistant',
  timestamp: Date.now(),
  content: `Welcome to Tonewise. I'm your in-browser sentiment analysis engine.

I analyze reviews, comments, individual sentences, and visual expressions using dual engines:
1. Rule-based VADER lexicon
2. 🤗 Hugging Face RoBERTa transformer (quantized locally in-browser via WebGPU/WASM)

Everything runs on your device with 100% privacy. What would you like to analyze?`,
  type: 'text',
  chips: [
    'Try sample sentences',
    'Try review examples',
    'Sample Screenshot',
    'Sample Expression 😊',
    'Sample Expression 😠',
  ],
};

const SAMPLE_SENTENCES = [
  'I love this!!',
  "I still don't have my order",
  'The build quality feels remarkably sturdy and premium.',
  'Terrible customer service, they hung up the call immediately.',
  'Average experience, nothing special but it works as intended.',
  'Customer support refunded my ticket within five minutes of asking.',
];

const SAMPLE_REVIEWS = [
  'I love this!! The fabric is soft and the fit is perfect.',
  "I still don't have my order, it has been two weeks with no update.",
  'Great price for what you get, but delivery took forever to arrive.',
  'Customer service was rude and refused my refund request when the box arrived damaged.',
  'The app checkout crashed twice, but customer support fixed it quickly.',
  'Decent product, acceptable quality for the price paid.',
];

export default function App() {
  // Reviews state (persisted to localStorage)
  const [items, setItems] = useState<AnalysisItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [items]);

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);

  // Pipeline execution state
  const [currentStep, setCurrentStep] = useState<PipelineStep>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasOcrStep, setHasOcrStep] = useState(false);

  // Model & Settings state
  const [modelState, setModelState] = useState<ModelLoadingState>(sentimentService.getModelLoadingState());
  const [vaderOnly, setVaderOnly] = useState<boolean>(sentimentService.isVaderOnly());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Mobile navigation tab: 'chat' | 'dashboard'
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');

  // Filter state for dashboard
  const [filterState, setFilterState] = useState<FilterState>({
    sentiment: 'all',
    theme: 'all',
    disagreementsOnly: false,
    searchQuery: '',
    sortBy: 'newest',
  });

  // Modals state
  const [explainItem, setExplainItem] = useState<AnalysisItem | null>(null);
  const [ocrModalState, setOcrModalState] = useState<{
    comments: string[];
    imageUrl: string;
    visualExpression?: VisualExpression;
  } | null>(null);
  const [csvMapper, setCsvMapper] = useState<{ csvData: CsvParsedData; filename: string } | null>(null);

  // CSV Batch execution state
  const [csvBatchProgress, setCsvBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelBatchRef = useRef<boolean>(false);

  // Subscribe to model progress updates
  useEffect(() => {
    const unsubscribe = sentimentService.subscribeProgress((state) => {
      setModelState(state);
    });
    return unsubscribe;
  }, []);

  // Theme effect: toggle 'dark' class on HTML root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Append new item to store and chat
  const handleItemAnalyzed = useCallback((newItem: AnalysisItem) => {
    setItems((prev) => [newItem, ...prev]);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_res_${newItem.id}`,
        sender: 'assistant',
        timestamp: Date.now(),
        type: 'item_result',
        item: newItem,
      },
    ]);
  }, []);

  // Helper to add assistant conversational message
  const sendAssistantMessage = useCallback(
    (text: string, chips?: string[], reportContent?: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sender: 'assistant',
          timestamp: Date.now(),
          content: text,
          type: reportContent ? 'report' : 'text',
          reportContent,
          chips,
        },
      ]);
    },
    []
  );

  // Core single review / sentence analysis handler
  const analyzeSingleText = useCallback(
    async (text: string, source: AnalysisItem['source'] = 'manual', isSentence?: boolean) => {
      setIsAnalyzing(true);
      setCurrentStep('intake');
      try {
        const item = await sentimentService.analyzeText(
          text,
          { source, isSentence },
          (step) => setCurrentStep(step)
        );
        handleItemAnalyzed(item);
      } catch (err) {
        console.error('Analysis error:', err);
        sendAssistantMessage('An error occurred while analyzing the text. Please try again.');
      } finally {
        setIsAnalyzing(false);
        setCurrentStep('idle');
      }
    },
    [handleItemAnalyzed, sendAssistantMessage]
  );

  // Multi-line review analysis
  const analyzeMultipleLines = useCallback(
    async (lines: string[]) => {
      setIsAnalyzing(true);
      sendAssistantMessage(`Processing ${lines.length} reviews sequentially...`);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        try {
          const item = await sentimentService.analyzeText(
            line,
            { source: 'paste' },
            (step) => setCurrentStep(step)
          );
          handleItemAnalyzed(item);
        } catch (e) {
          console.warn(`Line ${i} failed:`, e);
        }
      }

      setIsAnalyzing(false);
      setCurrentStep('idle');
      sendAssistantMessage(
        `Finished analyzing ${lines.length} reviews. Check the updated dashboard on the right!`,
        ['summary', 'main complaints', 'what people like', 'report']
      );
    },
    [handleItemAnalyzed, sendAssistantMessage]
  );

  // Rule-based Intent Processor
  const processUserIntent = useCallback(
    async (rawInput: string, isSentenceMode?: boolean) => {
      const input = rawInput.trim();
      if (!input) return;

      // Add user message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_user_${Date.now()}`,
          sender: 'user',
          timestamp: Date.now(),
          content: input,
          type: 'text',
        },
      ]);

      const lower = input.toLowerCase();

      // Intent 1: "summary"
      if (/^(summary|overview|stats|give me a summary)/i.test(lower)) {
        if (items.length === 0) {
          sendAssistantMessage(
            "No reviews analyzed yet. Paste a review or click 'Try an example' to get started!",
            ['Try an example', 'Paste reviews']
          );
          return;
        }

        const total = items.length;
        const pos = items.filter((i) => i.finalSentiment === 'positive').length;
        const neu = items.filter((i) => i.finalSentiment === 'neutral').length;
        const neg = items.filter((i) => i.finalSentiment === 'negative').length;
        const withBoth = items.filter((i) => i.huggingFace);
        const agreement = withBoth.filter((i) => !i.needsReview).length;
        const agreePct = withBoth.length > 0 ? ((agreement / withBoth.length) * 100).toFixed(0) : '100';

        const summaryText = `📊 Session Sentiment Summary:
• Total Reviews: ${total}
• Positive (Mint): ${pos} (${((pos / total) * 100).toFixed(1)}%)
• Neutral (Amber): ${neu} (${((neu / total) * 100).toFixed(1)}%)
• Negative (Coral): ${neg} (${((neg / total) * 100).toFixed(1)}%)
• Dual Engine Agreement: ${agreePct}% (${agreement}/${withBoth.length} consensus)

Overall Tone Verdict: ${
          pos > neg
            ? 'Predominantly Positive.'
            : neg > pos
            ? 'Predominantly Critical friction.'
            : 'Balanced tone distribution.'
        }`;

        sendAssistantMessage(summaryText, ['main complaints', 'what people like', 'report', 'do engines agree']);
        return;
      }

      // Intent 2: "main complaints"
      if (/^(main complaints|complaints|top complaints|problems|issues)/i.test(lower)) {
        const negItems = items.filter((i) => i.finalSentiment === 'negative');
        if (negItems.length === 0) {
          sendAssistantMessage(
            'No negative items found in the current dataset! All analyzed comments are neutral or positive.',
            ['summary', 'what people like']
          );
          return;
        }

        const counts: Record<string, number> = {};
        for (const it of negItems) {
          for (const th of it.themes) {
            counts[th] = (counts[th] || 0) + 1;
          }
        }

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
          sendAssistantMessage(
            `Found ${negItems.length} negative comments, but none tagged the 6 specific operational themes. You can click 'show negative' to inspect them.`,
            ['show negative', 'summary']
          );
          return;
        }

        const complaintsText = `⚠️ Primary Complaint Drivers (${negItems.length} negative items):
${sorted.map(([th, c], idx) => `${idx + 1}. ${th}: ${c} complaints`).join('\n')}

Click 'show negative' to filter the dashboard by these critical reviews.`;

        sendAssistantMessage(complaintsText, ['show negative', 'what people like', 'report']);
        return;
      }

      // Intent 3: "what people like"
      if (/^(what people like|what do people like|praises|positives|strengths|likes)/i.test(lower)) {
        const posItems = items.filter((i) => i.finalSentiment === 'positive');
        if (posItems.length === 0) {
          sendAssistantMessage('No positive reviews recorded yet.', ['summary', 'Try an example']);
          return;
        }

        const counts: Record<string, number> = {};
        for (const it of posItems) {
          for (const th of it.themes) {
            counts[th] = (counts[th] || 0) + 1;
          }
        }

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const praiseText = `✨ Top Praised Attributes (${posItems.length} positive items):
${
  sorted.length > 0
    ? sorted.map(([th, c], idx) => `${idx + 1}. ${th}: ${c} praises`).join('\n')
    : 'Positive comments express general enthusiasm without specific theme keywords.'
}

Click 'show positive' to view only praised reviews.`;

        sendAssistantMessage(praiseText, ['show positive', 'main complaints', 'report']);
        return;
      }

      // Intent 4: "do engines agree"
      if (/^(do engines agree|engine agreement|consensus|disagreements|engine agreement)/i.test(lower)) {
        const withBoth = items.filter((i) => i.huggingFace);
        if (withBoth.length === 0) {
          sendAssistantMessage(
            'Reviews were processed in VADER-only mode, so dual-engine comparison is not applicable.',
            ['summary', 'Try an example']
          );
          return;
        }

        const consensus = withBoth.filter((i) => !i.needsReview).length;
        const disagreements = withBoth.filter((i) => i.needsReview).length;
        const pct = ((consensus / withBoth.length) * 100).toFixed(1);

        const agreeMsg = `🤝 Engine Agreement Analysis:
• VADER and RoBERTa agreed on: ${consensus} of ${withBoth.length} reviews (${pct}%)
• Divergent reviews flagged for human review: ${disagreements}

When engines differ, the reconciler assigns the label to RoBERTa if its confidence is ≥ 70%, otherwise defaulting to VADER.`;

        sendAssistantMessage(agreeMsg, [
          disagreements > 0 ? 'show disagreements' : 'summary',
          'main complaints',
          'report',
        ]);
        return;
      }

      // Intent 5: "show [sentiment]" or "show [theme]" or "show disagreements"
      if (lower.startsWith('show ') || lower === 'filter negative' || lower === 'filter positive') {
        let matched = false;

        if (lower.includes('negative')) {
          setFilterState((prev) => ({ ...prev, sentiment: 'negative' }));
          setActiveTab('dashboard');
          sendAssistantMessage('Filtered dashboard to show Negative reviews.', ['Clear filters', 'summary']);
          matched = true;
        } else if (lower.includes('positive')) {
          setFilterState((prev) => ({ ...prev, sentiment: 'positive' }));
          setActiveTab('dashboard');
          sendAssistantMessage('Filtered dashboard to show Positive reviews.', ['Clear filters', 'summary']);
          matched = true;
        } else if (lower.includes('neutral')) {
          setFilterState((prev) => ({ ...prev, sentiment: 'neutral' }));
          setActiveTab('dashboard');
          sendAssistantMessage('Filtered dashboard to show Neutral reviews.', ['Clear filters', 'summary']);
          matched = true;
        } else if (lower.includes('disagree') || lower.includes('mismatch')) {
          setFilterState((prev) => ({ ...prev, disagreementsOnly: true }));
          setActiveTab('dashboard');
          sendAssistantMessage('Filtered dashboard to show reviews where engines disagreed.', ['Clear filters', 'summary']);
          matched = true;
        } else {
          // Check for theme
          for (const th of ALL_THEMES) {
            if (lower.includes(th.toLowerCase())) {
              setFilterState((prev) => ({ ...prev, theme: th }));
              setActiveTab('dashboard');
              sendAssistantMessage(`Filtered dashboard for theme: ${th}.`, ['Clear filters', 'summary']);
              matched = true;
              break;
            }
          }
        }

        if (matched) return;
      }

      // Intent 6: "clear filters"
      if (lower === 'clear filters' || lower === 'reset filters') {
        setFilterState({
          sentiment: 'all',
          theme: 'all',
          disagreementsOnly: false,
          searchQuery: '',
          sortBy: 'newest',
        });
        sendAssistantMessage('Dashboard filters cleared.', ['summary', 'main complaints']);
        return;
      }

      // Intent 7: "report"
      if (/^(report|generate report|insights report|markdown report|export report)/i.test(lower)) {
        if (items.length === 0) {
          sendAssistantMessage('Analyze some reviews first before generating an insights report.', [
            'Try an example',
          ]);
          return;
        }
        const reportMd = generateMarkdownReport(items);
        sendAssistantMessage(
          'Here is your executive Tonewise sentiment insights report. You can copy the markdown or download it directly:',
          ['Download CSV', 'summary'],
          reportMd
        );
        return;
      }

      // Intent 8: "clear"
      if (/^(clear|clear all|reset|clear session)$/i.test(lower)) {
        setItems([]);
        localStorage.removeItem(STORAGE_KEY);
        setMessages([INITIAL_WELCOME_MESSAGE]);
        return;
      }

      // Intent 9: "try an example"
      if (/^(try an example|example|sample|load examples)/i.test(lower)) {
        await handleLoadExamples();
        return;
      }

      // Default fallback: Treat input as a review to analyze!
      // If text looks like a question or command that wasn't recognized, we can give a friendly prompt
      if (lower.startsWith('how ') || lower.startsWith('what ') || lower.startsWith('who ') || lower.startsWith('why ')) {
        sendAssistantMessage(
          `I didn't recognize that command. I'm a deterministic review analyzer. Try sending:
• Any review comment to analyze
• "summary" — overall sentiment stats
• "main complaints" — top themes in negative reviews
• "what people like" — top praised themes
• "do engines agree" — consensus stats
• "show negative" or "show [theme]" — filter dashboard
• "report" — full Markdown report`,
          ['summary', 'main complaints', 'what people like', 'report', 'Try an example']
        );
        return;
      }

      // Analyze the raw text as a comment or individual sentence
      await analyzeSingleText(input, 'manual', isSentenceMode);
    },
    [items, analyzeSingleText, sendAssistantMessage]
  );

  // Load sample dataset
  const handleLoadExamples = async () => {
    setIsAnalyzing(true);
    sendAssistantMessage('Loading 6 representative review examples...');

    for (const text of SAMPLE_REVIEWS) {
      try {
        const item = await sentimentService.analyzeText(
          text,
          { source: 'example' },
          (step) => setCurrentStep(step)
        );
        handleItemAnalyzed(item);
      } catch (err) {
        console.warn('Sample item failed:', err);
      }
    }

    setIsAnalyzing(false);
    setCurrentStep('idle');
    sendAssistantMessage(
      'Loaded 6 examples with diverse sentiment and themes! Try typing "summary" or explore the charts on the right.',
      ['summary', 'main complaints', 'what people like', 'report']
    );
  };

  // Load sample sentences dataset
  const handleLoadSentences = async () => {
    setIsAnalyzing(true);
    sendAssistantMessage('Analyzing 6 representative sentences with VADER + 🤗 Hugging Face RoBERTa...');

    for (const text of SAMPLE_SENTENCES) {
      try {
        const item = await sentimentService.analyzeText(
          text,
          { source: 'example' },
          (step) => setCurrentStep(step)
        );
        handleItemAnalyzed(item);
      } catch (err) {
        console.warn('Sample sentence failed:', err);
      }
    }

    setIsAnalyzing(false);
    setCurrentStep('idle');
    sendAssistantMessage(
      'Analyzed 6 sample sentences! Notice how "I love this!!" is confirmed positive by both engines, and "I still don\'t have my order" flags an engine divergence for human review.',
      ['summary', 'do engines agree', 'report']
    );
  };

  // Auto-preload Hugging Face model on mount
  useEffect(() => {
    if (!vaderOnly) {
      sentimentService.preloadModel().catch((e) => {
        console.warn('Initial background Hugging Face preload notice:', e);
      });
    }
  }, [vaderOnly]);

  // Analyze standalone visual expression from image
  const analyzeVisualExpressionItem = async (
    imageUrl: string,
    expression: VisualExpression
  ) => {
    let vaderCompound = 0;
    if (expression.sentiment === 'positive') vaderCompound = 0.72;
    else if (expression.sentiment === 'negative') vaderCompound = -0.68;

    const item: AnalysisItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: `[Visual Expression: ${expression.label} ${expression.emoji}] ${expression.summary}`,
      rawText: expression.summary,
      timestamp: Date.now(),
      vader: {
        compound: vaderCompound,
        pos: expression.probabilities.joy,
        neu: expression.probabilities.neutral,
        neg: expression.probabilities.anger + expression.probabilities.sadness,
        label: expression.sentiment,
      },
      huggingFace: {
        label: expression.sentiment,
        probabilities: {
          positive: expression.probabilities.joy + expression.probabilities.surprise * 0.5,
          neutral: expression.probabilities.neutral + expression.probabilities.surprise * 0.5,
          negative: expression.probabilities.anger + expression.probabilities.sadness,
        },
        deviceUsed: 'wasm',
      },
      finalSentiment: expression.sentiment,
      needsReview: false,
      chosenEngine: 'both_agreed',
      themes: expression.sentiment === 'negative' ? ['Customer Service'] : ['Product Quality'],
      themeDetails: [],
      source: 'ocr',
      imageUrl,
      visualExpression: expression,
      explanation: `Analyzed visual facial expression and emotional tone: ${expression.label} ${expression.emoji} (${(expression.confidence * 100).toFixed(0)}% confidence). ${expression.summary}`,
    };

    handleItemAnalyzed(item);
    sendAssistantMessage(
      `🖼️ Analyzed image: Detected visual expression **${expression.label}** ${expression.emoji} with ${(expression.confidence * 100).toFixed(0)}% confidence (${expression.sentiment.toUpperCase()} tone). View the result card above and updated dashboard!`,
      ['summary', 'main complaints', 'what people like']
    );
  };

  // Sample screenshot trigger
  const handleSampleScreenshot = async () => {
    setIsAnalyzing(true);
    setCurrentStep('ocr');
    setHasOcrStep(true);
    sendAssistantMessage('Scanning sample review screenshot with OCR (3 customer review comments)...');

    try {
      const dataUrl = generateSampleScreenshotDataUrl();
      const comments = [
        'I love this!! The fabric is remarkably soft and delivery was super fast.',
        "I still don't have my order after two weeks and support refused my refund request.",
        'The build quality feels okay, but the app crashed twice during checkout.',
      ];
      setIsAnalyzing(false);
      setCurrentStep('idle');
      setOcrModalState({
        comments,
        imageUrl: dataUrl,
      });
    } catch (e) {
      console.warn('Sample screenshot failed:', e);
      setIsAnalyzing(false);
      setCurrentStep('idle');
    }
  };

  // Sample facial expression trigger
  const handleSampleExpression = async (type: 'happy' | 'frustrated') => {
    setIsAnalyzing(true);
    sendAssistantMessage(
      `Analyzing sample ${type === 'happy' ? 'joyful 😊' : 'frustrated 😠'} facial expression...`
    );

    try {
      const dataUrl = generateSampleExpressionDataUrl(type);
      const expr = await analyzeVisualExpression(dataUrl);
      setIsAnalyzing(false);
      await analyzeVisualExpressionItem(dataUrl, expr);
    } catch (e) {
      console.warn('Sample expression failed:', e);
      setIsAnalyzing(false);
    }
  };

  // Image attach (Multimodal: Visual Facial Expressions + Text OCR)
  const handleAttachImage = async (file: File) => {
    setIsAnalyzing(true);
    setCurrentStep('ocr');
    setHasOcrStep(true);
    sendAssistantMessage(`Processing image "${file.name}" for facial expressions, visual emotion & text...`);

    try {
      const result = await processFullImage(file);
      setIsAnalyzing(false);
      setCurrentStep('idle');

      if (result.hasText) {
        // Image contains readable review text / captions
        setOcrModalState({
          comments: result.extractedComments,
          imageUrl: result.dataUrl,
          visualExpression: result.expression,
        });
      } else {
        // Image is a facial expression, reaction photo, portrait, meme, or avatar
        await analyzeVisualExpressionItem(result.dataUrl, result.expression);
      }
    } catch (err) {
      console.warn('Full image analysis error, falling back to visual expression:', err);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const expr = await analyzeVisualExpression(dataUrl);
        await analyzeVisualExpressionItem(dataUrl, expr);
      } catch (fallbackErr) {
        setIsAnalyzing(false);
        setCurrentStep('idle');
        console.error('All image processors failed:', fallbackErr);
        sendAssistantMessage('Could not read this image file. Please try another image format (PNG, JPG, WEBP).');
      }
    }
  };

  // OCR Checklist confirmed
  const handleOcrConfirm = async (selected: string[]) => {
    const savedModal = ocrModalState;
    setOcrModalState(null);
    sendAssistantMessage(`Analyzing ${selected.length} extracted comments...`);
    setIsAnalyzing(true);

    for (const comment of selected) {
      try {
        const item = await sentimentService.analyzeText(
          comment,
          { source: 'ocr' },
          (step) => setCurrentStep(step)
        );
        // Attach image context if present
        if (savedModal?.imageUrl) {
          item.imageUrl = savedModal.imageUrl;
          item.visualExpression = savedModal.visualExpression;
        }
        handleItemAnalyzed(item);
      } catch (e) {
        console.warn('OCR item analysis failed:', e);
      }
    }

    setIsAnalyzing(false);
    setCurrentStep('idle');
    setHasOcrStep(false);
    sendAssistantMessage(
      `Analyzed ${selected.length} comments from image! Dashboard is updated.`,
      ['summary', 'main complaints', 'report']
    );
  };

  // CSV attach
  const handleAttachCsv = async (file: File) => {
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.headers.length === 0) {
        sendAssistantMessage('CSV file appears empty or invalid.');
        return;
      }
      setCsvMapper({ csvData: parsed, filename: file.name });
    } catch (err) {
      console.error('CSV parse error:', err);
      sendAssistantMessage('Failed to parse CSV file. Ensure it is a valid comma-separated file.');
    }
  };

  // CSV Mapping Confirmed & Batch execution
  const handleCsvConfirm = async (mapping: { textCol: string; ratingCol?: string; dateCol?: string }) => {
    if (!csvMapper) return;
    const { rows } = csvMapper.csvData;
    const { textCol, ratingCol, dateCol } = mapping;
    setCsvMapper(null);

    const totalToProcess = Math.min(2000, rows.length);
    cancelBatchRef.current = false;
    setCsvBatchProgress({ current: 0, total: totalToProcess });
    setIsAnalyzing(true);
    sendAssistantMessage(
      `Starting batch analysis of ${totalToProcess} rows. First 300 rows use RoBERTa + VADER; remaining rows use high-speed VADER.`
    );

    const wasVaderOnly = sentimentService.isVaderOnly();

    for (let i = 0; i < totalToProcess; i++) {
      if (cancelBatchRef.current) {
        sendAssistantMessage(`CSV batch processing cancelled at row ${i} of ${totalToProcess}.`);
        break;
      }

      const row = rows[i];
      const text = row[textCol];
      if (!text || !text.trim()) continue;

      let starRating: number | undefined;
      if (ratingCol && row[ratingCol]) {
        const parsedStar = parseFloat(row[ratingCol]);
        if (!isNaN(parsedStar)) starRating = parsedStar;
      }

      const date = dateCol ? row[dateCol] : undefined;

      // Spec rule: Run RoBERTa on first 300 rows, VADER only for rows > 300
      if (i >= 300 && !wasVaderOnly) {
        sentimentService.setVaderOnly(true);
      }

      try {
        const item = await sentimentService.analyzeText(text, {
          source: 'csv',
          starRating,
          date,
        });
        setItems((prev) => [item, ...prev]);
        setCsvBatchProgress({ current: i + 1, total: totalToProcess });
      } catch (e) {
        console.warn(`Row ${i} failed:`, e);
      }
    }

    // Restore user vaderOnly setting
    sentimentService.setVaderOnly(wasVaderOnly);

    setIsAnalyzing(false);
    setCurrentStep('idle');
    setCsvBatchProgress(null);
    sendAssistantMessage(
      `Batch complete! Analyzed ${totalToProcess} rows from CSV. View the populated dashboard.`,
      ['summary', 'main complaints', 'what people like', 'report', 'Export CSV']
    );
  };

  // Quick chip click handler
  const handleChipClick = (chip: string) => {
    if (chip === 'Try sample sentences') {
      handleLoadSentences();
    } else if (chip === 'Try review examples' || chip === 'Try an example') {
      handleLoadExamples();
    } else if (chip === 'Sample Screenshot') {
      handleSampleScreenshot();
    } else if (chip === 'Sample Expression 😊') {
      handleSampleExpression('happy');
    } else if (chip === 'Sample Expression 😠') {
      handleSampleExpression('frustrated');
    } else if (chip === 'Preload Hugging Face') {
      sendAssistantMessage('Pre-warming 🤗 Hugging Face RoBERTa model in Web Worker...');
      sentimentService.preloadModel().then(() => {
        sendAssistantMessage('🤗 Hugging Face RoBERTa is ready in browser memory!');
      }).catch((e) => {
        sendAssistantMessage(`Notice: Hugging Face model status: ${e.message}. VADER engine remains active.`);
      });
    } else if (chip === 'Paste reviews') {
      sendAssistantMessage('Paste your review, comment, or individual sentences in the text composer below:');
    } else if (chip === 'Upload a screenshot') {
      handleSampleScreenshot();
    } else if (chip === 'Export CSV') {
      exportReviewsToCsv(items);
    } else if (chip === 'Clear filters') {
      setFilterState({
        sentiment: 'all',
        theme: 'all',
        disagreementsOnly: false,
        searchQuery: '',
        sortBy: 'newest',
      });
    } else {
      processUserIntent(chip);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0B2E] text-slate-100 overflow-hidden font-sans selection:bg-[#7C5CFF]/30">
      {/* Top Header */}
      <Header
        isAnalyzing={isAnalyzing}
        modelState={modelState}
        vaderOnly={vaderOnly}
        onToggleVaderOnly={(val) => {
          setVaderOnly(val);
          sentimentService.setVaderOnly(val);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        onClearSession={() => {
          setItems([]);
          localStorage.removeItem(STORAGE_KEY);
          setMessages([INITIAL_WELCOME_MESSAGE]);
          setFilterState({
            sentiment: 'all',
            theme: 'all',
            disagreementsOnly: false,
            searchQuery: '',
            sortBy: 'newest',
          });
        }}
        onExportCsv={() => exportReviewsToCsv(items)}
        itemCount={items.length}
        onPreloadModel={() => sentimentService.preloadModel()}
      />

      {/* CSV Batch Progress Banner (with Cancel option) */}
      {csvBatchProgress && (
        <div className="bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] text-white px-4 py-2 flex items-center justify-between text-xs z-20 shadow-md">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              Analyzing CSV Batch: <strong>{csvBatchProgress.current}</strong> of{' '}
              <strong>{csvBatchProgress.total}</strong> rows (
              {Math.round((csvBatchProgress.current / csvBatchProgress.total) * 100)}%)
            </span>
          </div>
          <button
            onClick={() => {
              cancelBatchRef.current = true;
            }}
            className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 text-white font-semibold flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Batch</span>
          </button>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-white/10 bg-black/30">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-[#7C5CFF] text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat ({messages.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-[#22D3EE] text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard ({items.length})</span>
        </button>
      </div>

      {/* Main Split Layout: Desktop = Left Chat / Right Dashboard */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Chat Assistant */}
        <section
          className={`w-full md:w-[48%] lg:w-[45%] xl:w-[42%] h-full shrink-0 ${
            activeTab === 'chat' ? 'flex flex-col' : 'hidden md:flex flex-col'
          }`}
        >
          <ChatView
            messages={messages}
            currentStep={currentStep}
            isAnalyzing={isAnalyzing}
            onSendMessage={processUserIntent}
            onAttachImage={handleAttachImage}
            onAttachCsv={handleAttachCsv}
            onAnalyzeMultipleLines={analyzeMultipleLines}
            onSampleScreenshot={handleSampleScreenshot}
            onSampleExpression={handleSampleExpression}
            onExplainItem={(item) => setExplainItem(item)}
            onChipClick={handleChipClick}
            hasOcrStep={hasOcrStep}
          />
        </section>

        {/* Right Column: Live Analytics Dashboard */}
        <section
          className={`flex-1 h-full overflow-hidden bg-gradient-to-br from-[#0F0B2E] via-[#140E3D] to-[#0A0722] ${
            activeTab === 'dashboard' ? 'block' : 'hidden md:block'
          }`}
        >
          <DashboardView
            items={items}
            filterState={filterState}
            onUpdateFilters={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
            onResetFilters={() =>
              setFilterState({
                sentiment: 'all',
                theme: 'all',
                disagreementsOnly: false,
                searchQuery: '',
                sortBy: 'newest',
              })
            }
            onExplainItem={(item) => setExplainItem(item)}
            onLoadExamples={handleLoadExamples}
          />
        </section>
      </main>

      {/* Mandatory Privacy Footer */}
      <footer className="border-t border-white/10 bg-black/40 px-4 py-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2EE6A6]" />
        <span>
          Your text and images stay on your device. The sentiment model is downloaded once and cached.
        </span>
      </footer>

      {/* Modals */}
      {explainItem && (
        <ExplainModal
          item={explainItem}
          onClose={() => setExplainItem(null)}
        />
      )}

      {ocrModalState && (
        <OcrChecklistModal
          initialComments={ocrModalState.comments}
          imageUrl={ocrModalState.imageUrl}
          visualExpression={ocrModalState.visualExpression}
          onConfirm={handleOcrConfirm}
          onAnalyzeExpressionOnly={() => {
            if (ocrModalState.visualExpression) {
              analyzeVisualExpressionItem(
                ocrModalState.imageUrl,
                ocrModalState.visualExpression
              );
              setOcrModalState(null);
            }
          }}
          onCancel={() => setOcrModalState(null)}
        />
      )}

      {csvMapper && (
        <CsvMapperModal
          csvData={csvMapper.csvData}
          filename={csvMapper.filename}
          onConfirm={handleCsvConfirm}
          onCancel={() => setCsvMapper(null)}
        />
      )}
    </div>
  );
}
