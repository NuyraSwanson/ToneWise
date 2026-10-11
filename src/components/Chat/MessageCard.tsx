import React, { useState } from 'react';
import { AnalysisItem, ChatMessage } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Scale,
  Copy,
  Check,
  Download,
  Tag,
  Sparkles,
} from 'lucide-react';
import { THEME_DEFINITIONS } from '../../utils/themes';

interface MessageCardProps {
  message: ChatMessage;
  onExplainItem: (item: AnalysisItem) => void;
  onChipClick?: (chip: string) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onExplainItem,
  onChipClick,
}) => {
  const [copied, setCopied] = useState(false);

  // User chat message
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#7C5CFF] to-[#6366F1] text-white px-4 py-2.5 shadow-md text-xs sm:text-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <span className="text-[10px] text-white/60 block text-right mt-1 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // Result card for an analysed item
  if (message.type === 'item_result' && message.item) {
    const item = message.item;
    const finalSent = item.finalSentiment;

    const sentimentBadgeClass = {
      positive: 'bg-[#2EE6A6]/15 text-[#2EE6A6] border-[#2EE6A6]/30',
      neutral: 'bg-[#FFC145]/15 text-[#FFC145] border-[#FFC145]/30',
      negative: 'bg-[#FF4D6D]/15 text-[#FF4D6D] border-[#FF4D6D]/30',
    }[finalSent];

    return (
      <div className="flex justify-start mb-4 animate-fade-in w-full">
        <div className="w-full max-w-[95%] sm:max-w-[90%] rounded-2xl bg-white/5 border border-white/10 p-4 shadow-xl space-y-3.5 backdrop-blur-md">
          {/* Top Row: Final Label + Agreement + Explain */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border tracking-wide ${sentimentBadgeClass}`}
              >
                {finalSent === 'positive' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {finalSent === 'neutral' && <HelpCircle className="w-3.5 h-3.5" />}
                {finalSent === 'negative' && <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{finalSent.toUpperCase()}</span>
              </span>

              {item.starRating && (
                <span className="text-xs text-amber-400 font-mono flex items-center gap-0.5">
                  ★ {item.starRating}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.needsReview ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FF4D6D]/20 text-[#FF4D6D] border border-[#FF4D6D]/30 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Engines Disagree
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#2EE6A6]/10 text-[#2EE6A6] border border-[#2EE6A6]/20">
                  <Check className="w-3 h-3" />
                  Consensus
                </span>
              )}

              <button
                onClick={() => onExplainItem(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95"
                title="View full explanation from model numbers"
              >
                <Scale className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Explain</span>
              </button>
            </div>
          </div>

          {/* Engines Disagree Banner if flagged */}
          {item.needsReview && (
            <div className="p-2.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 text-xs text-[#FF859A] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF4D6D]" />
                <span>
                  VADER predicted <strong>{item.vader.label.toUpperCase()}</strong>, while RoBERTa
                  predicted{' '}
                  <strong>{item.huggingFace?.label.toUpperCase() || 'N/A'}</strong>. Flagged as Needs Review.
                </span>
              </div>
            </div>
          )}

          {/* Attached Image & Visual Expression Card */}
          {item.imageUrl && (
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-black/40 border border-white/10">
              <img
                src={item.imageUrl}
                alt="Analyzed source"
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/20 shrink-0 shadow-md"
              />
              <div className="space-y-1 text-xs flex-1">
                {item.visualExpression ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-white flex-wrap">
                      <span className="text-base">{item.visualExpression.emoji}</span>
                      <span>Visual Expression: {item.visualExpression.label}</span>
                      <span className="text-[10px] font-mono text-[#2EE6A6] bg-[#2EE6A6]/10 px-1.5 py-0.5 rounded border border-[#2EE6A6]/30">
                        {(item.visualExpression.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {item.visualExpression.summary}
                    </p>
                    {/* Visual expression probability strip */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-400 flex-wrap">
                      <span>Joy: {(item.visualExpression.probabilities.joy * 100).toFixed(0)}%</span>
                      <span>·</span>
                      <span>Neutral: {(item.visualExpression.probabilities.neutral * 100).toFixed(0)}%</span>
                      <span>·</span>
                      <span>Sadness: {(item.visualExpression.probabilities.sadness * 100).toFixed(0)}%</span>
                      <span>·</span>
                      <span>Anger: {(item.visualExpression.probabilities.anger * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Image Attached</span>
                )}
              </div>
            </div>
          )}

          {/* Review / Sentence Text */}
          <p className="text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
            "{item.text}"
          </p>

          {/* Side-by-Side Engine Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* VADER mini bar */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">VADER Compound</span>
                <span className="font-mono font-bold text-white">
                  {item.vader.compound > 0 ? '+' : ''}
                  {item.vader.compound} ({item.vader.label})
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 relative overflow-hidden">
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
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>+{(item.vader.pos * 100).toFixed(0)}% Pos</span>
                <span>~{(item.vader.neu * 100).toFixed(0)}% Neu</span>
                <span>-{(item.vader.neg * 100).toFixed(0)}% Neg</span>
              </div>
            </div>

            {/* Hugging Face RoBERTa mini bar */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <span>🤗 Hugging Face</span>
                  <span className="text-[10px] text-slate-400 font-mono">RoBERTa</span>
                </span>
                {item.huggingFace ? (
                  <span className="font-mono font-bold text-[#22D3EE]">
                    {item.huggingFace.label} (
                    {(item.huggingFace.probabilities[item.huggingFace.label] * 100).toFixed(0)}%)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Bypassed / VADER-only</span>
                )}
              </div>
              {item.huggingFace ? (
                <>
                  <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="bg-[#2EE6A6]"
                      style={{ width: `${item.huggingFace.probabilities.positive * 100}%` }}
                      title={`Positive: ${(item.huggingFace.probabilities.positive * 100).toFixed(1)}%`}
                    />
                    <div
                      className="bg-[#FFC145]"
                      style={{ width: `${item.huggingFace.probabilities.neutral * 100}%` }}
                      title={`Neutral: ${(item.huggingFace.probabilities.neutral * 100).toFixed(1)}%`}
                    />
                    <div
                      className="bg-[#FF4D6D]"
                      style={{ width: `${item.huggingFace.probabilities.negative * 100}%` }}
                      title={`Negative: ${(item.huggingFace.probabilities.negative * 100).toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span className="text-[#2EE6A6]">
                      Pos: {(item.huggingFace.probabilities.positive * 100).toFixed(0)}%
                    </span>
                    <span className="text-[#FFC145]">
                      Neu: {(item.huggingFace.probabilities.neutral * 100).toFixed(0)}%
                    </span>
                    <span className="text-[#FF4D6D]">
                      Neg: {(item.huggingFace.probabilities.negative * 100).toFixed(0)}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-500 py-1">
                  Evaluated with rule-based VADER only.
                </div>
              )}
            </div>
          </div>

          {/* Sentence-by-Sentence Breakdown if present */}
          {item.sentenceBreakdown && item.sentenceBreakdown.length > 1 && (
            <div className="pt-1 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  Sentence-by-Sentence Tone Flow ({item.sentenceBreakdown.length} sentences):
                </span>
              </div>
              <div className="space-y-1.5">
                {item.sentenceBreakdown.map((s, idx) => {
                  const sColor = {
                    positive: 'text-[#2EE6A6] bg-[#2EE6A6]/10 border-[#2EE6A6]/20',
                    neutral: 'text-[#FFC145] bg-[#FFC145]/10 border-[#FFC145]/20',
                    negative: 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20',
                  }[s.finalSentiment];

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-black/20 border border-white/5 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Sentence {idx + 1}:
                        </span>
                        <p className="text-slate-200 text-[11px] leading-relaxed">
                          "{s.sentence}"
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${sColor}`}
                        >
                          {s.finalSentiment}
                        </span>
                        {s.needsReview && (
                          <span
                            className="text-[9px] text-[#FF4D6D] bg-[#FF4D6D]/20 px-1 py-0.5 rounded font-mono"
                            title="Engines disagreed on this sentence"
                          >
                            Diverged
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Theme Chips */}
          {item.themes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Tag className="w-3 h-3 text-slate-400 shrink-0" />
              {item.themes.map((theme) => {
                const color = THEME_DEFINITIONS[theme]?.color || '#7C5CFF';
                return (
                  <span
                    key={theme}
                    className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border text-white"
                    style={{
                      backgroundColor: `${color}20`,
                      borderColor: `${color}40`,
                    }}
                  >
                    {theme}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Report message type
  if (message.type === 'report' && message.reportContent) {
    const handleCopyReport = () => {
      navigator.clipboard.writeText(message.reportContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadReport = () => {
      const blob = new Blob([message.reportContent || ''], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tonewise_report_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="flex justify-start mb-4 animate-fade-in w-full">
        <div className="w-full max-w-[95%] sm:max-w-[90%] rounded-2xl bg-white/5 border border-white/10 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              <h4 className="text-sm font-semibold text-white font-outfit">
                Tonewise Insights Report
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2EE6A6]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto text-xs text-slate-300 font-mono bg-black/40 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed select-text">
            {message.reportContent}
          </div>
        </div>
      </div>
    );
  }

  // Assistant standard conversational reply
  return (
    <div className="flex justify-start mb-4 animate-fade-in w-full">
      <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-bl-sm bg-white/5 border border-white/10 text-slate-200 px-4 py-3 shadow-lg text-xs sm:text-sm space-y-2">
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {/* Suggestion Chips */}
        {message.chips && message.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {message.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => onChipClick?.(chip)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/10 hover:bg-[#7C5CFF]/30 text-white border border-white/15 hover:border-[#7C5CFF]/50 transition-all active:scale-95 text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
