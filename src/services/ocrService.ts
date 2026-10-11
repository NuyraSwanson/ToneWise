import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

export async function processImageOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<string[]> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m && typeof m === 'object') {
        const progress = typeof m.progress === 'number' ? m.progress : 0;
        const status = typeof m.status === 'string' ? m.status : 'Processing image...';
        onProgress({ status, progress });
      }
    },
  });

  try {
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const fullText = ret.data.text || '';
    return splitIntoComments(fullText);
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

/**
 * Splits raw OCR text into discrete comments/reviews.
 * Handles common screenshot patterns: double newlines, bullet lists,
 * numbered reviews, quote blocks, and multi-line breaks.
 */
export function splitIntoComments(rawText: string): string[] {
  if (!rawText.trim()) return [];

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Try splitting by explicit multi-newline blocks (typical separation in UI reviews)
  const paragraphBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 5);

  if (paragraphBlocks.length > 1) {
    return cleanCommentArray(paragraphBlocks);
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
    return cleanCommentArray(detectedItems);
  }

  // 3. If still single, check for lines separated by user patterns or sentences
  if (lineSplits.length >= 3) {
    return cleanCommentArray(lineSplits);
  }

  return [normalized.trim()];
}

function cleanCommentArray(candidates: string[]): string[] {
  return candidates
    .map((c) =>
      c
        .replace(/^[•\-\*\d\.\)\s]+/, '') // strip leading list markers
        .replace(/\s+/g, ' ') // collapse multi-spaces
        .trim()
    )
    .filter((c) => c.length >= 4 && !/^(like|reply|share|translate|ago|helpful|report)$/i.test(c));
}
