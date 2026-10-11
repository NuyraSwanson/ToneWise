import { AnalysisItem } from '../types';

export interface CloudWord {
  text: string;
  count: number;
  negativeCount: number;
  negativeRatio: number; // 0 to 1
  color: string;
  fontSize: number;
  x: number;
  y: number;
}

const COMMON_STOPWORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
  'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
  'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
  'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
  'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been',
  'has', 'had', 'were', 'am', 'did', 'does', 'doing', 'having', 'should', 'got', 'very', 'too',
  'more', 'much', 'still', 'off', 'down', 'here', 'why', 'where', 'while', 'under', 'again', 'further',
  'dont', 'cant', 'wont', 'ive', 'im', 'theyre', 'wasnt', 'isnt', 'arent', 'didnt', 'doesnt',
]);

export function computeWordCloud(
  items: AnalysisItem[],
  width = 500,
  height = 340
): CloudWord[] {
  if (items.length === 0) return [];

  const wordCounts: Record<string, { count: number; negativeCount: number }> = {};

  for (const item of items) {
    const isNegative = item.finalSentiment === 'negative';
    const textWords = item.text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !COMMON_STOPWORDS.has(w));

    // Count once or by frequency in item
    const seenInItem = new Set<string>();
    for (const w of textWords) {
      if (!wordCounts[w]) {
        wordCounts[w] = { count: 0, negativeCount: 0 };
      }
      wordCounts[w].count += 1;
      if (isNegative && !seenInItem.has(w)) {
        wordCounts[w].negativeCount += 1;
        seenInItem.add(w);
      }
    }
  }

  // Filter words used 2+ times, top 60
  const candidateWords = Object.entries(wordCounts)
    .filter(([_, stats]) => stats.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 60);

  if (candidateWords.length === 0) {
    // If very few items, relax count requirement to 1
    const relaxed = Object.entries(wordCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30);
    return positionWords(relaxed, width, height);
  }

  return positionWords(candidateWords, width, height);
}

function positionWords(
  entries: [string, { count: number; negativeCount: number }][],
  width: number,
  height: number
): CloudWord[] {
  if (entries.length === 0) return [];

  const maxCount = Math.max(...entries.map(([_, s]) => s.count), 1);
  const minCount = Math.min(...entries.map(([_, s]) => s.count), 1);

  const centerX = width / 2;
  const centerY = height / 2;

  const result: CloudWord[] = [];
  const placedRects: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const [word, stats] = entries[i];
    const negativeRatio = stats.count > 0 ? stats.negativeCount / stats.count : 0;

    // Font size scaling (13px to 32px)
    const normalized = maxCount > minCount ? (stats.count - minCount) / (maxCount - minCount) : 0.5;
    const fontSize = Math.round(13 + normalized * 19);

    // Color based on how often word appears in negative items
    // Negative coral #FF4D6D, Neutral amber #FFC145, Positive mint #2EE6A6
    let color = '#2EE6A6'; // mint default
    if (negativeRatio >= 0.55) {
      color = '#FF4D6D'; // coral
    } else if (negativeRatio >= 0.25) {
      color = '#FFC145'; // amber
    }

    // Estimate width & height
    const estW = word.length * (fontSize * 0.62) + 12;
    const estH = fontSize + 8;

    // Spiral placement
    let placedX = centerX;
    let placedY = centerY;
    let step = 0;
    const maxSteps = 400;
    const spiralA = 2;
    const spiralB = 3.5;

    let hasCollision = true;

    while (hasCollision && step < maxSteps) {
      const theta = step * 0.45;
      const r = spiralA + spiralB * theta;
      const x = centerX + r * Math.cos(theta) - estW / 2;
      const y = centerY + r * Math.sin(theta) * 0.65 - estH / 2;

      // Check collision with already placed rectangles
      const collides = placedRects.some((rect) => {
        return (
          x < rect.x + rect.w &&
          x + estW > rect.x &&
          y < rect.y + rect.h &&
          y + estH > rect.y
        );
      });

      if (!collides) {
        placedX = x + estW / 2;
        placedY = y + estH / 2;
        placedRects.push({ x, y, w: estW, h: estH });
        hasCollision = false;
        break;
      }
      step++;
    }

    if (hasCollision) {
      // Fallback grid placement if spiral runs out of steps
      const fallbackAngle = (i / entries.length) * 2 * Math.PI;
      const fallbackR = 120 + (i % 3) * 30;
      placedX = centerX + fallbackR * Math.cos(fallbackAngle);
      placedY = centerY + fallbackR * Math.sin(fallbackAngle) * 0.65;
    }

    result.push({
      text: word,
      count: stats.count,
      negativeCount: stats.negativeCount,
      negativeRatio,
      color,
      fontSize,
      x: placedX,
      y: placedY,
    });
  }

  return result;
}
