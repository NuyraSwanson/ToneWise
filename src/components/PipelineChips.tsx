import React from 'react';
import { PipelineStep } from '../types';
import { Check, Loader2 } from 'lucide-react';

interface PipelineChipsProps {
  currentStep: PipelineStep;
  hasOcr?: boolean;
}

const STEPS: { key: PipelineStep; label: string; short: string }[] = [
  { key: 'intake', label: '1. Intake (1000ch)', short: 'Intake' },
  { key: 'ocr', label: '2. OCR & Split', short: 'OCR' },
  { key: 'vader', label: '3. VADER Lexicon', short: 'VADER' },
  { key: 'huggingface', label: '4. RoBERTa Model', short: 'RoBERTa' },
  { key: 'themes', label: '5. Six Themes', short: 'Themes' },
  { key: 'reconciler', label: '6. Reconciler', short: 'Reconcile' },
];

export const PipelineChips: React.FC<PipelineChipsProps> = ({ currentStep, hasOcr = false }) => {
  if (currentStep === 'idle') return null;

  const getStepIndex = (step: PipelineStep): number => {
    switch (step) {
      case 'intake': return 0;
      case 'ocr': return 1;
      case 'vader': return 2;
      case 'huggingface': return 3;
      case 'themes': return 4;
      case 'reconciler': return 5;
      case 'completed': return 6;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 overflow-x-auto py-1 px-2.5 rounded-lg bg-black/20 border border-white/10 text-xs backdrop-blur-md transition-all shadow-inner"
    >
      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap mr-1">
        Pipeline:
      </span>
      {STEPS.map((s, idx) => {
        if (s.key === 'ocr' && !hasOcr && currentIndex > 1) {
          return null; // Skip OCR chip if not an image intake
        }

        const isCompleted = currentIndex > idx;
        const isActive = currentIndex === idx;

        let badgeStyle = 'bg-white/5 text-slate-400 border-white/5';
        if (isCompleted) {
          badgeStyle = 'bg-[#2EE6A6]/10 text-[#2EE6A6] border-[#2EE6A6]/30';
        } else if (isActive) {
          badgeStyle = 'bg-[#7C5CFF]/20 text-[#22D3EE] border-[#7C5CFF]/50 shadow-sm animate-pulse';
        }

        return (
          <div
            key={s.key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all whitespace-nowrap ${badgeStyle}`}
          >
            {isCompleted ? (
              <Check className="w-3 h-3 text-[#2EE6A6]" />
            ) : isActive ? (
              <Loader2 className="w-3 h-3 text-[#22D3EE] animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            )}
            <span>{s.short}</span>
          </div>
        );
      })}
    </div>
  );
};
