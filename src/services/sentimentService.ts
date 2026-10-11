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

type ProgressListener = (state: ModelLoadingState) => void;
type StepListener = (step: PipelineStep) => void;

class SentimentService {
  private worker: Worker | null = null;
  private workerSupported = true;
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
    status: 'unloaded',
    progress: 0,
    statusText: 'Model not initialized',
  };
  private vaderOnly = false;
  private isInitializing = false;

  constructor() {
    // Check localStorage for vaderOnly preference
    const saved = localStorage.getItem('tonewise_vader_only');
    if (saved === 'true') {
      this.vaderOnly = true;
    }
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
    if (this.worker && this.currentState.status === 'ready') {
      return Promise.resolve();
    }
    if (this.isInitializing) {
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.currentState.status === 'ready') {
            clearInterval(check);
            resolve();
          } else if (this.currentState.status === 'error') {
            clearInterval(check);
            reject(new Error(this.currentState.statusText));
          }
        }, 100);
      });
    }

    this.isInitializing = true;
    this.notifyProgress({
      status: 'loading',
      progress: 5,
      statusText: 'Initializing worker & checking WebGPU/WASM runtime...',
    });

    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/sentimentWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onerror = (err) => {
          console.warn('Sentiment worker error:', err);
          this.isInitializing = false;
          this.notifyProgress({
            status: 'error',
            statusText: 'Worker failed to load. Continuing with VADER lexicon.',
          });
          reject(err);
        };

        this.worker.onmessage = (event) => {
          const { id, type, payload } = event.data;

          if (type === 'progress') {
            // HF download progress payload
            if (payload && typeof payload === 'object') {
              const loaded = Number(payload.loaded) || 0;
              const total = Number(payload.total) || 1;
              let pct = Math.min(99, Math.max(5, Math.round((loaded / total) * 100)));
              if (isNaN(pct)) pct = 50;

              const file = payload.file || 'model components';
              this.notifyProgress({
                status: 'loading',
                progress: pct,
                statusText: `Downloading ${file} (${pct}%)...`,
              });
            }
            return;
          }

          if (type === 'init_success') {
            this.isInitializing = false;
            this.notifyProgress({
              status: 'ready',
              progress: 100,
              statusText: `Model ready (${payload.device?.toUpperCase() || 'WASM'}).`,
              device: payload.device,
            });
            resolve();
            return;
          }

          if (type === 'init_error') {
            this.isInitializing = false;
            this.notifyProgress({
              status: 'error',
              progress: 0,
              statusText: 'Could not download model. VADER mode active.',
            });
            reject(new Error(payload.error));
            return;
          }

          if (id !== undefined && this.pendingCallbacks.has(id)) {
            const { resolve: reqResolve, reject: reqReject } = this.pendingCallbacks.get(id)!;
            this.pendingCallbacks.delete(id);

            if (type === 'classify_success') {
              reqResolve(payload as HuggingFaceResult);
            } else if (type === 'classify_error') {
              reqReject(new Error(payload.error));
            }
          }
        };

        const initId = ++this.messageCounter;
        this.worker.postMessage({ id: initId, type: 'init' });
      } catch (err: unknown) {
        this.isInitializing = false;
        this.workerSupported = false;
        const msg = err instanceof Error ? err.message : String(err);
        this.notifyProgress({
          status: 'error',
          statusText: 'Web Workers not supported. Using VADER mode.',
        });
        reject(new Error(msg));
      }
    });
  }

  public async classifyWithRoberta(text: string): Promise<HuggingFaceResult | null> {
    if (this.vaderOnly) {
      return null;
    }

    try {
      if (!this.worker || this.currentState.status !== 'ready') {
        await this.initWorker();
      }
    } catch (e) {
      console.warn('Model initialization failed; falling back to VADER:', e);
      return null;
    }

    if (!this.worker || this.currentState.status !== 'ready') {
      return null;
    }

    return new Promise((resolve, reject) => {
      const msgId = ++this.messageCounter;
      this.pendingCallbacks.set(msgId, { resolve, reject });
      this.worker!.postMessage({
        id: msgId,
        type: 'classify_single',
        payload: { text },
      });

      // 30s timeout per item
      setTimeout(() => {
        if (this.pendingCallbacks.has(msgId)) {
          this.pendingCallbacks.delete(msgId);
          reject(new Error('Classification timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Complete 6-step analysis pipeline for a review text.
   */
  public async analyzeText(
    rawText: string,
    metadata?: {
      source?: AnalysisItem['source'];
      starRating?: number;
      date?: string;
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

    // 4. Hugging Face model (local)
    onStep?.('huggingface');
    let huggingFace: HuggingFaceResult | null = null;
    if (!this.vaderOnly) {
      try {
        huggingFace = await this.classifyWithRoberta(trimmed);
      } catch (err) {
        console.warn('Hugging Face model skipped or errored:', err);
        huggingFace = null;
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
        if (huggingFace && !this.vaderOnly && rawSentences.length <= 6) {
          try {
            sentHf = await this.classifyWithRoberta(sent);
          } catch {
            sentHf = null;
          }
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
      isSentence: (metadata as { isSentence?: boolean })?.isSentence ?? (rawSentences.length <= 1),
    };

    return item;
  }
}

export const sentimentService = new SentimentService();
