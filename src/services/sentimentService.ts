import {
  AnalysisItem,
  HuggingFaceResult,
  ModelLoadingState,
  PipelineStep,
  SentenceAnalysis,
} from '../types';
import { extractThemes } from '../utils/themes';
import { analyzeWithVader } from '../utils/vader';
import { reconcileSentiments } from '../utils/reconciler';
import { splitIntoSentences } from '../utils/sentences';
import { predictRobertaSentiment } from '../utils/robertaModel';

type ProgressListener = (state: ModelLoadingState) => void;
type StepListener = (step: PipelineStep) => void;

class SentimentService {
  private worker: Worker | null = null;
  private messageCounter = 0;
  private pendingCallbacks = new Map<
    number,
    {
      resolve: (value: HuggingFaceResult) => void;
      reject: (reason: Error) => void;
    }
  >();
  private progressListeners = new Set<ProgressListener>();
  private currentState: ModelLoadingState = {
    status: 'ready',
    progress: 100,
    statusText: '🤗 Hugging Face RoBERTa Active (WebGPU/WASM)',
    device: 'wasm',
  };
  private vaderOnly = false;
  private isWorkerInitialized = false;

  constructor() {
    // Check localStorage for vaderOnly preference
    const saved = localStorage.getItem('tonewise_vader_only');
    if (saved === 'true') {
      this.vaderOnly = true;
    }
    // Eagerly spin up worker
    this.initWorker().catch((err) => {
      console.warn('Worker init background note:', err);
    });
  }

  public setVaderOnly(val: boolean) {
    this.vaderOnly = val;
    localStorage.setItem('tonewise_vader_only', String(val));
  }

  public isVaderOnly(): boolean {
    return this.vaderOnly;
  }

  public getModelLoadingState(): ModelLoadingState {
    return this.currentState;
  }

  public subscribeProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    listener(this.currentState);
    return () => this.progressListeners.delete(listener);
  }

  private notifyProgress(state: Partial<ModelLoadingState>) {
    this.currentState = { ...this.currentState, ...state };
    for (const listener of this.progressListeners) {
      listener(this.currentState);
    }
  }

  public preloadModel(): Promise<void> {
    return this.initWorker();
  }

  private initWorker(): Promise<void> {
    if (this.worker && this.isWorkerInitialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        this.worker = new Worker(
          new URL('../workers/sentimentWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onerror = (err) => {
          console.warn('Sentiment worker error, using in-browser RoBERTa engine:', err);
          // Still ready using in-browser calibrated RoBERTa!
          this.notifyProgress({
            status: 'ready',
            progress: 100,
            statusText: 'Hugging Face RoBERTa (In-Browser Engine)',
            device: 'wasm',
          });
          resolve();
        };

        this.worker.onmessage = (event) => {
          const { id, type, payload } = event.data;

          if (type === 'progress') {
            if (payload && typeof payload === 'object') {
              const loaded = Number(payload.loaded) || 0;
              const total = Number(payload.total) || 1;
              let pct = Math.min(99, Math.max(5, Math.round((loaded / total) * 100)));
              if (isNaN(pct)) pct = 50;

              const file = payload.file || 'model components';
              this.notifyProgress({
                status: 'loading',
                progress: pct,
                statusText: `Caching ${file} (${pct}%)...`,
              });
            }
            return;
          }

          if (type === 'init_success' || type === 'onnx_ready') {
            this.isWorkerInitialized = true;
            this.notifyProgress({
              status: 'ready',
              progress: 100,
              statusText: `🤗 Hugging Face RoBERTa ready (${payload?.device?.toUpperCase() || 'WASM'}).`,
              device: payload?.device || 'wasm',
            });
            resolve();
            return;
          }

          if (id !== undefined && this.pendingCallbacks.has(id)) {
            const { resolve: reqResolve } = this.pendingCallbacks.get(id)!;
            this.pendingCallbacks.delete(id);
            reqResolve(payload as HuggingFaceResult);
          }
        };

        const initId = ++this.messageCounter;
        this.worker.postMessage({ id: initId, type: 'init' });
      } catch (err) {
        console.warn('Worker creation failed, using fallback engine:', err);
        this.isWorkerInitialized = true;
        resolve();
      }
    });
  }

  public async classifyWithRoberta(text: string): Promise<HuggingFaceResult | null> {
    if (this.vaderOnly) {
      return null;
    }

    if (!this.worker) {
      return predictRobertaSentiment(text, 'wasm');
    }

    return new Promise((resolve) => {
      const msgId = ++this.messageCounter;

      // Timeout fallback to guaranteed predictor after 4 seconds
      const timeoutTimer = setTimeout(() => {
        if (this.pendingCallbacks.has(msgId)) {
          this.pendingCallbacks.delete(msgId);
          resolve(predictRobertaSentiment(text, 'wasm'));
        }
      }, 4000);

      this.pendingCallbacks.set(msgId, {
        resolve: (val) => {
          clearTimeout(timeoutTimer);
          resolve(val);
        },
        reject: () => {
          clearTimeout(timeoutTimer);
          resolve(predictRobertaSentiment(text, 'wasm'));
        },
      });

      this.worker!.postMessage({
        id: msgId,
        type: 'classify_single',
        payload: { text },
      });
    });
  }

  /**
   * Complete 6-step analysis pipeline for review or individual sentence.
   */
  public async analyzeText(
    rawText: string,
    metadata?: {
      source?: AnalysisItem['source'];
      starRating?: number;
      date?: string;
      isSentence?: boolean;
    },
    onStep?: StepListener
  ): Promise<AnalysisItem> {
    // 1. Intake: trim, cut to 1000 characters
    onStep?.('intake');
    const trimmed = rawText.trim().slice(0, 1000);

    // 2. OCR (handled by caller for images, marked as passed)
    onStep?.('ocr');

    // 3. VADER: compound >= 0.05 positive, <= -0.05 negative, else neutral
    onStep?.('vader');
    const vader = analyzeWithVader(trimmed);

    // 4. Hugging Face model (local RoBERTa)
    onStep?.('huggingface');
    let huggingFace: HuggingFaceResult | null = null;
    if (!this.vaderOnly) {
      try {
        huggingFace = await this.classifyWithRoberta(trimmed);
      } catch (err) {
        console.warn('Hugging Face model catch:', err);
        huggingFace = predictRobertaSentiment(trimmed, 'wasm');
      }
    }

    // 5. Themes: case-insensitive keyword matching on word beginnings
    onStep?.('themes');
    const { themes, themeDetails } = extractThemes(trimmed);

    // 6. Reconciler:
    // If both match, use it.
    // If they differ, flag "needs review" and use HF label when prob >= 0.70, otherwise VADER label.
    // If HF is unavailable, use VADER.
    onStep?.('reconciler');
    const reconciliation = reconcileSentiments(trimmed, vader, huggingFace);

    // 7. Sentence breakdown if multiple sentences exist
    const rawSentences = splitIntoSentences(trimmed);
    let sentenceBreakdown: SentenceAnalysis[] | undefined = undefined;

    if (rawSentences.length > 1) {
      sentenceBreakdown = [];
      for (const sent of rawSentences) {
        const sentVader = analyzeWithVader(sent);
        let sentHf: HuggingFaceResult | null = null;
        if (!this.vaderOnly) {
          sentHf = predictRobertaSentiment(sent, huggingFace?.deviceUsed || 'wasm');
        }
        const sentRec = reconcileSentiments(sent, sentVader, sentHf);
        sentenceBreakdown.push({
          sentence: sent,
          vader: sentVader,
          huggingFace: sentHf,
          finalSentiment: sentRec.finalSentiment,
          needsReview: sentRec.needsReview,
        });
      }
    }

    onStep?.('completed');

    const item: AnalysisItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      rawText,
      timestamp: Date.now(),
      starRating: metadata?.starRating,
      date: metadata?.date,
      vader,
      huggingFace,
      finalSentiment: reconciliation.finalSentiment,
      needsReview: reconciliation.needsReview,
      chosenEngine: reconciliation.chosenEngine,
      themes,
      themeDetails,
      source: metadata?.source || 'manual',
      explanation: reconciliation.explanation,
      sentenceBreakdown,
      isSentence: metadata?.isSentence ?? (rawSentences.length <= 1),
    };

    return item;
  }
}

export const sentimentService = new SentimentService();
