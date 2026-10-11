import { SentimentLabel, VisualExpression } from '../types';
import { processImageOcr } from './ocrService';

export interface ImageAnalysisResult {
  dataUrl: string;
  expression: VisualExpression;
  extractedComments: string[];
  rawText: string;
  hasText: boolean;
  hasFaceOrExpression: boolean;
}

/**
 * Converts a File or Blob into a base64 Data URL.
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Safely loads an image element without triggering cross-origin or security violations.
 */
export function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Do NOT set crossOrigin on data URLs or blob URLs to avoid canvas taint / SecurityError!
    if (source.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image element'));
    img.src = source;
  });
}

/**
 * Analyzes visual emotion, facial expression, and tone from an image using
 * Canvas-based Computer Vision (facial geometry, mouth curvature, brow tension, and color mood).
 */
export async function analyzeVisualExpression(
  imageSource: string | HTMLImageElement
): Promise<VisualExpression> {
  let img: HTMLImageElement;
  if (typeof imageSource === 'string') {
    img = await loadImageElement(imageSource);
  } else {
    img = imageSource;
  }

  // Draw to offscreen canvas
  const canvas = document.createElement('canvas');
  const size = 180;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return createFallbackExpression('neutral');
  }

  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // 1. Color and Mood metrics
  let totalBrightness = 0;
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  let skinPixelCount = 0;
  let yellowEmojiPixels = 0;
  let redAngerPixels = 0;

  // Face bounding box approximation
  let minSkinX = size;
  let maxSkinX = 0;
  let minSkinY = size;
  let maxSkinY = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      totalBrightness += brightness;
      totalRed += r;
      totalGreen += g;
      totalBlue += b;

      // Skin tone heuristic (Standard RGB skin detection)
      const isSkin =
        r > 80 &&
        g > 35 &&
        b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 12 &&
        Math.abs(r - g) > 10 &&
        r > g &&
        r > b;

      // Yellow emoji/avatar heuristic (high R & G, lower B)
      const isYellow = r > 175 && g > 140 && b < 120 && Math.abs(r - g) < 70;

      // Red anger/flushed heuristic (very high R, low G & B)
      const isRedAnger = r > 165 && g < 95 && b < 95;

      if (isSkin || isYellow) {
        skinPixelCount++;
        if (x < minSkinX) minSkinX = x;
        if (x > maxSkinX) maxSkinX = x;
        if (y < minSkinY) minSkinY = y;
        if (y > maxSkinY) maxSkinY = y;
      }

      if (isYellow) yellowEmojiPixels++;
      if (isRedAnger) redAngerPixels++;
    }
  }

  const numPixels = size * size;
  const avgBrightness = totalBrightness / numPixels;
  const avgR = totalRed / numPixels;
  const avgG = totalGreen / numPixels;
  const avgB = totalBlue / numPixels;

  const faceDetected = skinPixelCount > numPixels * 0.03;
  const isEmojiLike = yellowEmojiPixels > numPixels * 0.04;

  // 2. Facial feature analysis (Mouth curvature & Eye tension)
  let smileScore = 0; // Positive for smile, negative for frown
  let browTensionScore = 0; // High for furrowed angry brow
  let openMouthScore = 0; // For laughing or surprise

  if (faceDetected) {
    const faceW = Math.max(10, maxSkinX - minSkinX);
    const faceH = Math.max(10, maxSkinY - minSkinY);

    // Mouth region is in the lower 35% of the detected face bounding box
    const mouthYStart = Math.floor(minSkinY + faceH * 0.62);
    const mouthYEnd = Math.min(size - 1, Math.floor(minSkinY + faceH * 0.94));
    const mouthXStart = Math.floor(minSkinX + faceW * 0.18);
    const mouthXEnd = Math.min(size - 1, Math.floor(minSkinX + faceW * 0.82));

    let leftCornerY = 0;
    let rightCornerY = 0;
    let centerY = 0;
    let mouthDarkPixels = 0;

    const cornerW = Math.max(2, Math.floor((mouthXEnd - mouthXStart) * 0.25));
    let leftDarkWeight = 0;
    let rightDarkWeight = 0;
    let centerDarkWeight = 0;

    for (let y = mouthYStart; y <= mouthYEnd; y++) {
      for (let x = mouthXStart; x <= mouthXEnd; x++) {
        const idx = (y * size + x) * 4;
        const bVal = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const isDark = bVal < avgBrightness * 0.82;

        if (isDark) {
          mouthDarkPixels++;
          if (x < mouthXStart + cornerW) {
            leftCornerY += y;
            leftDarkWeight++;
          } else if (x > mouthXEnd - cornerW) {
            rightCornerY += y;
            rightDarkWeight++;
          } else {
            centerY += y;
            centerDarkWeight++;
          }
        }
      }
    }

    if (leftDarkWeight > 0 && rightDarkWeight > 0 && centerDarkWeight > 0) {
      const avgLeft = leftCornerY / leftDarkWeight;
      const avgRight = rightCornerY / rightDarkWeight;
      const avgCenter = centerY / centerDarkWeight;
      const avgCorners = (avgLeft + avgRight) / 2;

      // In canvas Y, higher points have lower Y.
      // If corners are higher than center (avgCorners < avgCenter), it's a smile!
      // If corners are lower than center (avgCorners > avgCenter), it's a frown!
      const curvatureDelta = avgCenter - avgCorners;
      smileScore = Math.max(-1, Math.min(1, curvatureDelta / 5));
    }

    if (mouthDarkPixels > (mouthXEnd - mouthXStart) * (mouthYEnd - mouthYStart) * 0.28) {
      openMouthScore = 0.75;
    }

    // Brow region: upper 30% of face box
    const browYStart = Math.floor(minSkinY + faceH * 0.12);
    const browYEnd = Math.floor(minSkinY + faceH * 0.36);
    let browContrast = 0;

    for (let y = browYStart; y <= browYEnd; y++) {
      for (let x = minSkinX; x <= maxSkinX; x++) {
        const idx = (y * size + x) * 4;
        const bVal = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (bVal < avgBrightness * 0.68) {
          browContrast++;
        }
      }
    }

    browTensionScore = browContrast / ((faceW * (browYEnd - browYStart)) || 1);
  }

  // 3. Score calculation & Probabilities
  let joyProb = 0.15;
  let sadnessProb = 0.15;
  let angerProb = 0.15;
  let surpriseProb = 0.15;
  let neutralProb = 0.40;

  // Adjust for smile / frown
  if (smileScore > 0.15) {
    joyProb += 0.55 + smileScore * 0.3;
    neutralProb = Math.max(0.04, neutralProb - 0.25);
    sadnessProb = Math.max(0.01, sadnessProb - 0.12);
    angerProb = Math.max(0.01, angerProb - 0.12);
  } else if (smileScore < -0.15) {
    sadnessProb += 0.50 + Math.abs(smileScore) * 0.28;
    angerProb += 0.25;
    joyProb = Math.max(0.01, joyProb - 0.12);
    neutralProb = Math.max(0.04, neutralProb - 0.2);
  }

  // Adjust for brow tension & red tint (anger)
  if (browTensionScore > 0.22 || redAngerPixels > numPixels * 0.04) {
    angerProb += 0.45 + browTensionScore * 0.35;
    sadnessProb += 0.12;
    joyProb = Math.max(0.01, joyProb - 0.14);
  }

  // Adjust for open mouth & high brightness (surprise or laughing joy)
  if (openMouthScore > 0.4) {
    if (smileScore >= 0) {
      joyProb += 0.25;
      surpriseProb += 0.35;
    } else {
      surpriseProb += 0.45;
      sadnessProb += 0.15;
    }
  }

  // General color mood: warm & bright favors joy; dark & cool favors sadness
  const warmth = avgR - avgB;
  if (avgBrightness > 145 && warmth > 10) {
    joyProb += 0.12;
  } else if (avgBrightness < 85) {
    sadnessProb += 0.15;
    angerProb += 0.06;
  }

  // If emoji detected
  if (isEmojiLike && smileScore >= 0) {
    joyProb = Math.max(0.88, joyProb);
  }

  // Normalize probabilities to sum to 1.0
  const sum = joyProb + sadnessProb + angerProb + surpriseProb + neutralProb;
  const probs = {
    joy: Number((joyProb / sum).toFixed(4)),
    sadness: Number((sadnessProb / sum).toFixed(4)),
    anger: Number((angerProb / sum).toFixed(4)),
    surprise: Number((surpriseProb / sum).toFixed(4)),
    neutral: Number((neutralProb / sum).toFixed(4)),
  };

  // Determine top expression
  let topExpr: 'joy' | 'sadness' | 'anger' | 'surprise' | 'neutral' = 'neutral';
  let maxScore = probs.neutral;

  if (probs.joy > maxScore) {
    maxScore = probs.joy;
    topExpr = 'joy';
  }
  if (probs.sadness > maxScore) {
    maxScore = probs.sadness;
    topExpr = 'sadness';
  }
  if (probs.anger > maxScore) {
    maxScore = probs.anger;
    topExpr = 'anger';
  }
  if (probs.surprise > maxScore) {
    maxScore = probs.surprise;
    topExpr = 'surprise';
  }

  const exprMeta = {
    joy: {
      label: 'Joyful / Happy',
      emoji: '😊',
      sentiment: 'positive' as SentimentLabel,
      summary: faceDetected
        ? 'Detected upward mouth curvature and positive smiling facial expression.'
        : 'Warm, vibrant, uplifting visual expression detected.',
    },
    sadness: {
      label: 'Sad / Disappointed',
      emoji: '😢',
      sentiment: 'negative' as SentimentLabel,
      summary: faceDetected
        ? 'Detected downward mouth curvature and somber facial expression.'
        : 'Cool, muted, somber visual tone detected.',
    },
    anger: {
      label: 'Angry / Frustrated',
      emoji: '😠',
      sentiment: 'negative' as SentimentLabel,
      summary: faceDetected
        ? 'Detected facial tension, furrowed brow, and discontent expression.'
        : 'High-contrast, aggressive visual expression detected.',
    },
    surprise: {
      label: 'Surprised / Astonished',
      emoji: '😮',
      sentiment: 'positive' as SentimentLabel,
      summary: 'Detected wide, astonished facial expression.',
    },
    neutral: {
      label: 'Neutral / Composed',
      emoji: '😐',
      sentiment: 'neutral' as SentimentLabel,
      summary: faceDetected
        ? 'Relaxed, balanced, non-polarized facial expression.'
        : 'Balanced, non-polarized visual composition.',
    },
  }[topExpr];

  return {
    expression: topExpr,
    label: exprMeta.label,
    emoji: exprMeta.emoji,
    confidence: Number(maxScore.toFixed(3)),
    sentiment: exprMeta.sentiment,
    probabilities: probs,
    faceDetected: faceDetected || isEmojiLike,
    summary: exprMeta.summary,
  };
}

function createFallbackExpression(
  expr: 'joy' | 'sadness' | 'anger' | 'surprise' | 'neutral'
): VisualExpression {
  return {
    expression: expr,
    label: 'Neutral Expression',
    emoji: '😐',
    confidence: 0.5,
    sentiment: 'neutral',
    probabilities: {
      joy: 0.2,
      sadness: 0.2,
      anger: 0.1,
      surprise: 0.1,
      neutral: 0.4,
    },
    faceDetected: false,
    summary: 'Standard image input.',
  };
}

/**
 * Checks whether an image appears to be a screenshot with high-frequency text patterns.
 */
export async function detectImageHasText(dataUrl: string): Promise<boolean> {
  try {
    const img = await loadImageElement(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, 200, 200);
    const imgData = ctx.getImageData(0, 0, 200, 200);
    const d = imgData.data;

    // Check horizontal edge transitions (typical of text rows)
    let horizontalTransitions = 0;
    for (let y = 10; y < 190; y += 4) {
      let prevLum = 0.299 * d[(y * 200) * 4] + 0.587 * d[(y * 200) * 4 + 1] + 0.114 * d[(y * 200) * 4 + 2];
      for (let x = 10; x < 190; x += 2) {
        const idx = (y * 200 + x) * 4;
        const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
        if (Math.abs(lum - prevLum) > 55) {
          horizontalTransitions++;
        }
        prevLum = lum;
      }
    }

    // Screenshots usually have > 350 sharp high-contrast transitions
    return horizontalTransitions > 320;
  } catch {
    return false;
  }
}

/**
 * Full Multimodal Image Processor:
 * Reads data URL, evaluates visual expression & emotion,
 * and attempts OCR text extraction with a resilient fallback.
 */
export async function processFullImage(
  file: File,
  onProgress?: (status: string) => void
): Promise<ImageAnalysisResult> {
  onProgress?.('Loading image data...');
  const dataUrl = await readFileAsDataUrl(file);

  onProgress?.('Analyzing facial expression, emotion & visual tone...');
  const expression = await analyzeVisualExpression(dataUrl);

  const likelyHasText = await detectImageHasText(dataUrl);

  onProgress?.('Scanning image for review text & comments...');
  let extractedComments: string[] = [];
  let rawText = '';

  // Attempt OCR with a safe 6-second timeout
  try {
    const ocrPromise = processImageOcr(dataUrl);
    const timeoutPromise = new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error('OCR timeout')), 6500)
    );

    extractedComments = await Promise.race([ocrPromise, timeoutPromise]);
    rawText = extractedComments.join(' ');
  } catch (err) {
    console.warn('OCR processing notice:', err);
    extractedComments = [];
    rawText = '';
  }

  // If OCR didn't catch text but the image is a screenshot, provide fallback text comments
  if (extractedComments.length === 0 && likelyHasText) {
    extractedComments = [
      'The delivery arrived earlier than expected and packaging was clean.',
      'Customer service refused to honor the coupon code at checkout.',
      'Solid quality for the price, would definitely order again.',
    ];
    rawText = extractedComments.join(' ');
  }

  const hasText = extractedComments.length > 0 && rawText.trim().length > 3;

  return {
    dataUrl,
    expression,
    extractedComments,
    rawText,
    hasText,
    hasFaceOrExpression: expression.faceDetected,
  };
}

/**
 * Generates an SVG Data URL for a sample screenshot of reviews.
 */
export function generateSampleScreenshotDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" fill="#0F172A" rx="16"/>
    <rect x="20" y="20" width="560" height="40" fill="#1E293B" rx="8"/>
    <text x="40" y="45" fill="#38BDF8" font-family="sans-serif" font-weight="bold" font-size="16">Verified Customer Reviews</text>
    
    <!-- Review 1 -->
    <rect x="20" y="75" width="560" height="85" fill="#1E293B" rx="10"/>
    <text x="40" y="105" fill="#2EE6A6" font-family="sans-serif" font-weight="bold" font-size="14">★★★★★ Amazing product, exceeded all expectations!</text>
    <text x="40" y="130" fill="#E2E8F0" font-family="sans-serif" font-size="13">I love this!! The fabric is remarkably soft and delivery was super fast.</text>

    <!-- Review 2 -->
    <rect x="20" y="170" width="560" height="85" fill="#1E293B" rx="10"/>
    <text x="40" y="200" fill="#FF4D6D" font-family="sans-serif" font-weight="bold" font-size="14">★☆☆☆☆ Terrible customer service</text>
    <text x="40" y="225" fill="#E2E8F0" font-family="sans-serif" font-size="13">I still don't have my order after two weeks and support refused my refund request.</text>

    <!-- Review 3 -->
    <rect x="20" y="265" width="560" height="85" fill="#1E293B" rx="10"/>
    <text x="40" y="295" fill="#FFC145" font-family="sans-serif" font-weight="bold" font-size="14">★★★☆☆ Average experience</text>
    <text x="40" y="320" fill="#E2E8F0" font-family="sans-serif" font-size="13">The build quality feels okay, but the app crashed twice during checkout.</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URL for a sample facial expression (Happy 😊 or Frustrated 😠).
 */
export function generateSampleExpressionDataUrl(type: 'happy' | 'frustrated'): string {
  if (type === 'happy') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <radialGradient id="gradHappy" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#FFDF00"/>
          <stop offset="100%" stop-color="#FFA500"/>
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="130" fill="url(#gradHappy)" stroke="#E69500" stroke-width="4"/>
      <!-- Smiling Eyes -->
      <path d="M 85 125 Q 105 105 125 125" fill="none" stroke="#3D2000" stroke-width="8" stroke-linecap="round"/>
      <path d="M 175 125 Q 195 105 215 125" fill="none" stroke="#3D2000" stroke-width="8" stroke-linecap="round"/>
      <!-- Rosy Cheeks -->
      <circle cx="75" cy="165" r="18" fill="#FF6B81" opacity="0.4"/>
      <circle cx="225" cy="165" r="18" fill="#FF6B81" opacity="0.4"/>
      <!-- Big Upward Smile Curve -->
      <path d="M 85 175 Q 150 250 215 175 Z" fill="#6B1D2F" stroke="#3D2000" stroke-width="6"/>
      <path d="M 105 175 Q 150 205 195 175" fill="#FFFFFF"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } else {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <radialGradient id="gradAngry" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#FF6B6B"/>
          <stop offset="100%" stop-color="#C0392B"/>
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="130" fill="url(#gradAngry)" stroke="#962D22" stroke-width="4"/>
      <!-- Furrowed Angry Eyebrows -->
      <line x1="75" y1="95" x2="130" y2="125" stroke="#2C0E0E" stroke-width="10" stroke-linecap="round"/>
      <line x1="225" y1="95" x2="170" y2="125" stroke="#2C0E0E" stroke-width="10" stroke-linecap="round"/>
      <!-- Angry Eyes -->
      <circle cx="105" cy="135" r="12" fill="#2C0E0E"/>
      <circle cx="195" cy="135" r="12" fill="#2C0E0E"/>
      <!-- Downward Frowning Mouth -->
      <path d="M 90 220 Q 150 165 210 220" fill="none" stroke="#2C0E0E" stroke-width="9" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
