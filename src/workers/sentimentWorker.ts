import { env, pipeline } from '@huggingface/transformers';

// Configure transformers.js for client environment
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'Xenova/twitter-roberta-base-sentiment-latest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let classifierPromise: Promise<any> | null = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';

async function getClassifier(onProgress: (data: unknown) => void) {
  if (classifierPromise) {
    return classifierPromise;
  }

  classifierPromise = (async () => {
    // Check WebGPU support
    let useWebGPU = false;
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as unknown as { gpu?: unknown }).gpu) {
        useWebGPU = true;
      }
    } catch {
      useWebGPU = false;
    }

    if (useWebGPU) {
      try {
        currentDevice = 'webgpu';
        return await pipeline('sentiment-analysis', MODEL_ID, {
          device: 'webgpu',
          dtype: 'q8',
          progress_callback: onProgress,
        });
      } catch (err) {
        console.warn('WebGPU failed for sentiment model, falling back to WASM:', err);
      }
    }

    currentDevice = 'wasm';
    return await pipeline('sentiment-analysis', MODEL_ID, {
      device: 'wasm',
      progress_callback: onProgress,
    });
  })();

  return classifierPromise;
}

function normalizeLabel(rawLabel: string): 'positive' | 'neutral' | 'negative' {
  const lower = rawLabel.toLowerCase();
  if (lower.includes('pos') || lower === 'label_2') return 'positive';
  if (lower.includes('neg') || lower === 'label_0') return 'negative';
  return 'neutral';
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  if (type === 'init') {
    try {
      await getClassifier((progressData) => {
        self.postMessage({ type: 'progress', payload: progressData });
      });
      self.postMessage({
        id,
        type: 'init_success',
        payload: { device: currentDevice },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      classifierPromise = null;
      self.postMessage({
        id,
        type: 'init_error',
        payload: { error: errorMsg },
      });
    }
    return;
  }

  if (type === 'classify_single') {
    const { text } = payload;
    try {
      const classifier = await getClassifier((progressData) => {
        self.postMessage({ type: 'progress', payload: progressData });
      });

      // Request all 3 label scores with top_k: 3
      const rawResults = await classifier(text, { top_k: 3 });
      const resultsArray = Array.isArray(rawResults)
        ? (Array.isArray(rawResults[0]) ? rawResults[0] : rawResults)
        : [rawResults];

      const probs = {
        positive: 0.33,
        neutral: 0.34,
        negative: 0.33,
      };

      let topLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
      let maxScore = -1;

      for (const item of resultsArray) {
        if (!item || typeof item !== 'object') continue;
        const norm = normalizeLabel(String(item.label));
        const score = Number(item.score) || 0;
        probs[norm] = score;
        if (score > maxScore) {
          maxScore = score;
          topLabel = norm;
        }
      }

      // Normalize so sum equals 1.0
      const sum = probs.positive + probs.neutral + probs.negative;
      if (sum > 0) {
        probs.positive = Number((probs.positive / sum).toFixed(4));
        probs.neutral = Number((probs.neutral / sum).toFixed(4));
        probs.negative = Number((probs.negative / sum).toFixed(4));
      }

      self.postMessage({
        id,
        type: 'classify_success',
        payload: {
          label: topLabel,
          probabilities: probs,
          deviceUsed: currentDevice,
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        id,
        type: 'classify_error',
        payload: { error: errorMsg },
      });
    }
  }
};
