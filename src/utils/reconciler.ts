import { HuggingFaceResult, SentimentLabel, VaderResult } from '../types';

export interface ReconciliationResult {
  finalSentiment: SentimentLabel;
  needsReview: boolean;
  chosenEngine: 'both_agreed' | 'huggingface_confident' | 'vader_fallback' | 'vader_only';
  explanation: string;
}

export function reconcileSentiments(
  text: string,
  vader: VaderResult,
  huggingFace?: HuggingFaceResult | null
): ReconciliationResult {
  if (!huggingFace) {
    const vaderCompoundPct = (vader.compound * 100).toFixed(1);
    const explanation = `Analyzed using VADER rule-based lexicon. VADER computed a compound score of ${vader.compound > 0 ? '+' : ''}${vader.compound} (${vaderCompoundPct}% polarity). Since compound ${
      vader.compound >= 0.05
        ? '≥ +0.05'
        : vader.compound <= -0.05
        ? '≤ -0.05'
        : 'is between -0.05 and +0.05'
    }, the text is classified as ${vader.label}. (Transformer model was skipped or unavailable).`;

    return {
      finalSentiment: vader.label,
      needsReview: false,
      chosenEngine: 'vader_only',
      explanation,
    };
  }

  const vLabel = vader.label;
  const hLabel = huggingFace.label;
  const hMaxProb = huggingFace.probabilities[hLabel];
  const hMaxProbPct = (hMaxProb * 100).toFixed(1);

  // 1. Both agree
  if (vLabel === hLabel) {
    const explanation = `Both engines reached a consensus on ${vLabel.toUpperCase()}.
• VADER compound score: ${vader.compound > 0 ? '+' : ''}${vader.compound} (Pos: ${(vader.pos * 100).toFixed(0)}%, Neu: ${(vader.neu * 100).toFixed(0)}%, Neg: ${(vader.neg * 100).toFixed(0)}%).
• RoBERTa Transformer confidence: ${hMaxProbPct}% for ${hLabel} (Probabilities: Pos ${(huggingFace.probabilities.positive * 100).toFixed(1)}%, Neu ${(huggingFace.probabilities.neutral * 100).toFixed(1)}%, Neg ${(huggingFace.probabilities.negative * 100).toFixed(1)}%).
Confidence is high and verified across both lexical and deep learning pipelines.`;

    return {
      finalSentiment: vLabel,
      needsReview: false,
      chosenEngine: 'both_agreed',
      explanation,
    };
  }

  // 2. Engines Disagree
  const isRobertaHighConfidence = hMaxProb >= 0.70;

  if (isRobertaHighConfidence) {
    const explanation = `Engines disagreed on sentiment: VADER predicted ${vLabel.toUpperCase()} (compound ${vader.compound > 0 ? '+' : ''}${vader.compound}), while RoBERTa predicted ${hLabel.toUpperCase()} with ${hMaxProbPct}% confidence.
• Reason for divergence: VADER looks for polar vocabulary (such as "great", "bad"), whereas RoBERTa's contextual attention captures syntactic context, sarcasm, and real-world implications (e.g. phrases like "still haven't received", "where is it").
• Reconciler rule: Because RoBERTa's confidence (${hMaxProbPct}%) is ≥ 70%, the Transformer's contextual decision (${hLabel.toUpperCase()}) was chosen. Flagged as "Needs Review".`;

    return {
      finalSentiment: hLabel,
      needsReview: true,
      chosenEngine: 'huggingface_confident',
      explanation,
    };
  } else {
    const explanation = `Engines disagreed on sentiment: VADER predicted ${vLabel.toUpperCase()} (compound ${vader.compound > 0 ? '+' : ''}${vader.compound}), while RoBERTa predicted ${hLabel.toUpperCase()} with ${hMaxProbPct}% confidence.
• Reconciler rule: Because RoBERTa's confidence (${hMaxProbPct}%) did not reach the 70% threshold, the system defaulted to VADER's rule-based score (${vLabel.toUpperCase()}). Flagged as "Needs Review".`;

    return {
      finalSentiment: vLabel,
      needsReview: true,
      chosenEngine: 'vader_fallback',
      explanation,
    };
  }
}
