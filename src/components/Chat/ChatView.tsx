import React, { useRef, useEffect } from 'react';
import { AnalysisItem, ChatMessage, PipelineStep } from '../../types';
import { MessageCard } from './MessageCard';
import { Composer } from './Composer';
import { PipelineChips } from '../PipelineChips';
import { Sparkles, MessageSquare, Terminal } from 'lucide-react';

interface ChatViewProps {
  messages: ChatMessage[];
  currentStep: PipelineStep;
  isAnalyzing: boolean;
  onSendMessage: (text: string) => void;
  onAttachImage: (file: File) => void;
  onAttachCsv: (file: File) => void;
  onAnalyzeMultipleLines: (lines: string[]) => void;
  onExplainItem: (item: AnalysisItem) => void;
  onChipClick: (chip: string) => void;
  hasOcrStep?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  currentStep,
  isAnalyzing,
  onSendMessage,
  onAttachImage,
  onAttachCsv,
  onAnalyzeMultipleLines,
  onExplainItem,
  onChipClick,
  hasOcrStep = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message or step change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStep]);

  return (
    <div className="flex flex-col h-full bg-[#0F0B2E]/50 border-r border-white/10 relative overflow-hidden">
      {/* Chat Header Sub-bar */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#7C5CFF]" />
          <span className="font-semibold text-slate-300">Tone Assistant</span>
          <span>·</span>
          <span className="text-[11px] text-slate-500">Deterministic rule-based intent engine</span>
        </div>
        {/* Pipeline Chips */}
        <PipelineChips currentStep={currentStep} hasOcr={hasOcrStep} />
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 scroll-smooth"
      >
        {messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            onExplainItem={onExplainItem}
            onChipClick={onChipClick}
          />
        ))}

        {isAnalyzing && currentStep !== 'idle' && (
          <div className="flex justify-start mb-4 animate-pulse">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-ping" />
              <span>Analyzing tone, polarity, and themes...</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer Container */}
      <Composer
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        onAttachCsv={onAttachCsv}
        onAnalyzeMultipleLines={onAnalyzeMultipleLines}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
};
