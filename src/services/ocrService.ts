import Tesseract from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

/**
 * Preprocesses an image on canvas to boost OCR accuracy and speed on screenshots:
 * - Rescales if needed
 * - Converts to grayscale
 * - Enhances contrast
 */
export async function preprocessImageForOcr(imageSource: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    if (imageSource.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Bound dimensions between 600px and 1600px for optimal OCR recognition
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Grayscale & contrast enhancement
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Simple contrast stretch
          const enhanced = gray > 140 ? Math.min(255, gray * 1.15) : Math.max(0, gray * 0.85);
          d[i] = enhanced;
          d[i + 1] = enhanced;
          d[i + 2] = enhanced;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Preprocessing error, using original source:', e);
        resolve(imageSource);
      }
    };
    img.onerror = () => resolve(imageSource);
    img.src = imageSource;
  });
}

export async function processImageOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<string[]> {
  try {
    let sourceForOcr = imageSource;
    if (typeof imageSource === 'string') {
      sourceForOcr = await preprocessImageForOcr(imageSource);
    }

    const ret = await Tesseract.recognize(sourceForOcr, 'eng', {
      logger: (m) => {
        if (onProgress && m && typeof m === 'object') {
          const progress = typeof m.progress === 'number' ? m.progress : 0;
          const status = typeof m.status === 'string' ? m.status : 'Scanning text...';
          onProgress({ status, progress });
        }
      },
    });

    const fullText = ret?.data?.text || '';
    const comments = splitIntoComments(fullText);
    return comments;
  } catch (error) {
    console.warn('Tesseract OCR error:', error);
    return [];
  }
}

/**
 * Splits raw OCR text into discrete comments/reviews/sentences.
 * Handles common screenshot patterns: double newlines, bullet lists,
 * numbered reviews, quote blocks, and multi-line breaks.
 */
export function splitIntoComments(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Try splitting by explicit multi-newline blocks (typical separation in UI reviews)
  const paragraphBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 5);

  if (paragraphBlocks.length > 1) {
    const cleaned = cleanCommentArray(paragraphBlocks);
    if (cleaned.length > 0) return cleaned;
  }

  // 2. Try splitting by numbered items or bullet points (e.g. "1.", "2.", "•", "- ")
  const lineSplits = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const detectedItems: string[] = [];
  let currentBuffer: string[] = [];

  const itemStartRegex = /^(\d+[\.\)]|[-•*]|\"|“)/;

  for (const line of lineSplits) {
    if (itemStartRegex.test(line) && currentBuffer.length > 0) {
      detectedItems.push(currentBuffer.join(' '));
      currentBuffer = [line.replace(/^(\d+[\.\)]|[-•*])\s*/, '')];
    } else {
      currentBuffer.push(line);
    }
  }

  if (currentBuffer.length > 0) {
    detectedItems.push(currentBuffer.join(' '));
  }

  if (detectedItems.length > 1) {
    const cleaned = cleanCommentArray(detectedItems);
    if (cleaned.length > 0) return cleaned;
  }

  // 3. Substantive lines split
  if (lineSplits.length >= 2) {
    const cleaned = cleanCommentArray(lineSplits);
    if (cleaned.length > 0) return cleaned;
  }

  const single = cleanCommentArray([normalized.trim()]);
  return single.length > 0 ? single : [normalized.trim()];
}

function cleanCommentArray(candidates: string[]): string[] {
  return candidates
    .map((c) =>
      c
        .replace(/^[•\-\*\d\.\)\s]+/, '') // strip leading list markers
        .replace(/\s+/g, ' ') // collapse multi-spaces
        .trim()
    )
    .filter(
      (c) =>
        c.length >= 5 &&
        !/^(like|reply|share|translate|ago|helpful|report|verified purchase|read more)$/i.test(c)
    );
}
