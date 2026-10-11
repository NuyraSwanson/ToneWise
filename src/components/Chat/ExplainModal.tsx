import React from 'react';
import { AnalysisItem } from '../../types';
import { X, HelpCircle, AlertTriangle, CheckCircle, Scale, Tag } from 'lucide-react';
import { THEME_DEFINITIONS } from '../../utils/themes';

interface ExplainModalProps {
  item: AnalysisItem | null;
  onClose: () => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-[#2EE6A6] bg-[#2EE6A6]/10 border-[#2EE6A6]/30';
      case 'negative':
        return 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/30';
      default:
        return 'text-[#FFC145] bg-[#FFC145]/10 border-[#FFC145]/30';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#140E3D] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#7C5CFF]/20 text-[#A78BFA] border border-[#7C5CFF]/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white font-outfit">
                Decision & Sentiment Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Transparent template explanation calculated from real model numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Review text quote */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/10">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Review Input (Trimmed to 1,000 characters)
            </span>
            <p className="text-slate-200 italic font-serif text-base leading-relaxed">
              "{item.text}"
            </p>
          </div>

          {/* Outcome Verdict */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 gap-3">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Final Reconciled Label:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold border ${getSentimentColor(
                  item.finalSentiment
                )}`}
              >
                {item.finalSentiment === 'positive' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : item.finalSentiment === 'negative' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <HelpCircle className="w-4 h-4" />
                )}
                {item.finalSentiment.toUpperCase()}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block mb-0.5">Engine Agreement:</span>
              {item.needsReview ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Engines Disagree (Flagged)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#2EE6A6]/15 text-[#2EE6A6] border border-[#2EE6A6]/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Engines Agree
                </span>
              )}
            </div>
          </div>

          {/* Engine Dual Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* VADER Box */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">1. VADER Engine</span>
                <span className="text-xs font-mono text-slate-400">Rule-based Lexicon</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Compound Score:</span>
                  <span className="font-mono font-semibold text-white">
                    {item.vader.compound > 0 ? '+' : ''}
                    {item.vader.compound}
                  </span>
                </div>
                {/* Compound Visual Bar (-1 to +1) */}
                <div className="w-full bg-slate-800 rounded-full h-2 relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-slate-500 w-0.5 left-1/2"
                    title="Neutral midpoint (0.0)"
                  />
                  <div
                    className={`h-full ${
                      item.vader.compound >= 0.05
                        ? 'bg-[#2EE6A6]'
                        : item.vader.compound <= -0.05
                        ? 'bg-[#FF4D6D]'
                        : 'bg-[#FFC145]'
                    }`}
                    style={{
                      width: `${Math.abs(item.vader.compound) * 50}%`,
                      marginLeft: item.vader.compound >= 0 ? '50%' : `${50 - Math.abs(item.vader.compound) * 50}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Threshold: ≥ +0.05 (Pos), ≤ -0.05 (Neg), else Neu.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[11px]">
                <div className="p-1 rounded bg-[#2EE6A6]/10 text-[#2EE6A6]">
                  Pos: {(item.vader.pos * 100).toFixed(0)}%
                </div>
                <div className="p-1 rounded bg-[#FFC145]/10 text-[#FFC145]">
                  Neu: {(item.vader.neu * 100).toFixed(0)}%
                </div>
                <div className="p-1 rounded bg-[#FF4D6D]/10 text-[#FF4D6D]">
                  Neg: {(item.vader.neg * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* RoBERTa Box */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>2. 🤗 Hugging Face RoBERTa</span>
                </span>
                <span className="text-xs font-mono text-[#22D3EE]">
                  {item.huggingFace ? item.huggingFace.deviceUsed.toUpperCase() : 'Unavailable'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Model: Xenova/twitter-roberta-base-sentiment-latest
              </p>

              {item.huggingFace ? (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Positive:</span>
                      <span className="font-mono text-[#2EE6A6]">
                        {(item.huggingFace.probabilities.positive * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#2EE6A6] h-full"
                        style={{ width: `${item.huggingFace.probabilities.positive * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Neutral:</span>
                      <span className="font-mono text-[#FFC145]">
                        {(item.huggingFace.probabilities.neutral * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#FFC145] h-full"
                        style={{ width: `${item.huggingFace.probabilities.neutral * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Negative:</span>
                      <span className="font-mono text-[#FF4D6D]">
                        {(item.huggingFace.probabilities.negative * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#FF4D6D] h-full"
                        style={{ width: `${item.huggingFace.probabilities.negative * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">
                  RoBERTa was not queried for this item (VADER-only mode or offline fallback active).
                </p>
              )}
            </div>
          </div>

          {/* Reconciler Explanation Prose */}
          <div className="p-4 rounded-xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 space-y-2">
            <span className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider block">
              Step 6 Reconciler Logic Applied
            </span>
            <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {item.explanation ||
                (item.needsReview
                  ? `Engines diverged: VADER determined ${item.vader.label} while RoBERTa calculated ${item.huggingFace?.label || 'N/A'}. Because RoBERTa confidence is ${
                      item.huggingFace ? `${((item.huggingFace.probabilities[item.huggingFace.label]) * 100).toFixed(1)}%` : '0%'
                    }, the reconciler assigned final label to ${item.finalSentiment} and flagged it for human review.`
                  : `Both engines concurred on ${item.finalSentiment.toUpperCase()}. No reconciliation ambiguity detected.`)}
            </p>
          </div>

          {/* Theme Keyword Evidence */}
          <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Tag className="w-3.5 h-3.5" />
              <span>Theme Prefix Matches (Step 5)</span>
            </div>
            {item.themeDetails && item.themeDetails.length > 0 ? (
              <div className="space-y-1.5">
                {item.themeDetails.map((td) => (
                  <div key={td.theme} className="flex items-center gap-2 text-xs">
                    <span
                      className="px-2 py-0.5 rounded font-medium text-white text-[11px]"
                      style={{ backgroundColor: `${THEME_DEFINITIONS[td.theme].color}33`, borderColor: THEME_DEFINITIONS[td.theme].color }}
                    >
                      {td.theme}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      triggered by beginnings: {td.keywords.map((k) => `"${k}"`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                None of the 6 monitored themes (Delivery, Quality, Service, Price, App, Returns) matched keyword beginnings in this text.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
