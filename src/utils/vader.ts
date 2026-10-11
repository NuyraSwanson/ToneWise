import vader from 'vader-sentiment';
import { SentimentLabel, VaderResult } from '../types';

export function analyzeWithVader(text: string): VaderResult {
  try {
    const analyzer =
      vader?.SentimentIntensityAnalyzer ||
      (vader as unknown as { default?: { SentimentIntensityAnalyzer?: typeof vader.SentimentIntensityAnalyzer } })
        ?.default?.SentimentIntensityAnalyzer;

    if (!analyzer || typeof analyzer.polarity_scores !== 'function') {
      throw new Error('VADER SentimentIntensityAnalyzer not found');
    }

    const scores = analyzer.polarity_scores(text);
    const compound = Number(scores.compound.toFixed(4));
    const pos = Number(scores.pos.toFixed(4));
    const neu = Number(scores.neu.toFixed(4));
    const neg = Number(scores.neg.toFixed(4));

    // Spec: compound >= 0.05 positive, <= -0.05 negative, else neutral
    let label: SentimentLabel = 'neutral';
    if (compound >= 0.05) {
      label = 'positive';
    } else if (compound <= -0.05) {
      label = 'negative';
    }

    return {
      compound,
      pos,
      neu,
      neg,
      label,
    };
  } catch (err) {
    console.warn('VADER analysis fallback:', err);
    // Fallback heuristic if bundler has issues
    return fallbackVader(text);
  }
}

// Resilient fallback in case of module bundle quirks in certain browsers
function fallbackVader(text: string): VaderResult {
  const lower = text.toLowerCase();
  const positiveWords = ['love', 'great', 'awesome', 'excellent', 'amazing', 'good', 'best', 'super', 'happy', 'fast', 'smooth', 'perfect', 'flawless', 'friendly', 'helpful', 'worth', 'fantastic'];
  const negativeWords = ['terrible', 'horrible', 'awful', 'bad', 'worst', 'broken', 'late', 'delayed', 'useless', 'garbage', 'trash', 'scam', 'poor', 'disappointed', 'complaint', 'hate', 'waste', 'slow'];

  let posMatches = 0;
  let negMatches = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) posMatches++;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) negMatches++;
  }

  const diff = posMatches - negMatches;
  let compound = 0;
  if (diff > 0) compound = Math.min(0.9, 0.2 + diff * 0.2);
  else if (diff < 0) compound = Math.max(-0.9, -0.2 + diff * 0.2);

  let label: SentimentLabel = 'neutral';
  if (compound >= 0.05) label = 'positive';
  else if (compound <= -0.05) label = 'negative';

  return {
    compound: Number(compound.toFixed(4)),
    pos: posMatches > 0 ? 0.6 : 0.1,
    neu: 0.3,
    neg: negMatches > 0 ? 0.6 : 0.1,
    label,
  };
}
