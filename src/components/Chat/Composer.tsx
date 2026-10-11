import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

interface ComposerProps {
  onSendMessage: (text: string) => void;
  onAttachImage: (file: File) => void;
  onAttachCsv: (file: File) => void;
  onAnalyzeMultipleLines: (lines: string[]) => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onAttachImage,
  onAttachCsv,
  onAnalyzeMultipleLines,
  isAnalyzing,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [multiLinePrompt, setMultiLinePrompt] = useState<{ lines: string[] } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle image or multi-line / multi-sentence paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Check for image files in clipboard
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            onAttachImage(file);
            return;
          }
        }
      }
    }

    // 2. Check for multi-line or multi-sentence paste
    const pastedText = e.clipboardData?.getData('text/plain') || '';
    const lines = pastedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length >= 2) {
      // Offer choice to analyze lines separately
      setMultiLinePrompt({ lines });
    } else if (lines.length === 1) {
      // Check if the single block has multiple punctuation-separated sentences
      const sentenceParts = pastedText.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 4);
      if (sentenceParts.length >= 2) {
        setMultiLinePrompt({ lines: sentenceParts });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isAnalyzing || disabled) return;
    onSendMessage(text.trim());
    setText('');
    setMultiLinePrompt(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onAttachImage(file);
      } else if (file.name.endsWith('.csv') || file.type.includes('csv')) {
        onAttachCsv(file);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative p-3 bg-[#0F0B2E]/95 dark:bg-[#0F0B2E]/95 light:bg-white/95 border-t border-white/10 backdrop-blur-md transition-all ${
        isDraggingOver ? 'ring-2 ring-[#7C5CFF] bg-[#7C5CFF]/10' : ''
      }`}
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onAttachImage(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onAttachCsv(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Multi-line Paste Prompt Banner */}
      {multiLinePrompt && (
        <div className="mb-2 p-3 rounded-xl bg-gradient-to-r from-[#7C5CFF]/20 to-[#22D3EE]/20 border border-[#7C5CFF]/40 flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-white">
            <Layers className="w-4 h-4 text-[#22D3EE]" />
            <span>
              Detected <strong className="font-mono">{multiLinePrompt.lines.length} items / sentences</strong>.
              Analyse each separately?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onAnalyzeMultipleLines(multiLinePrompt.lines);
                setMultiLinePrompt(null);
                setText('');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4AE8] text-white font-semibold transition-all shadow-sm active:scale-95"
            >
              Analyse Separately
            </button>
            <button
              onClick={() => setMultiLinePrompt(null)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            >
              As Whole Text
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-[#7C5CFF]/30 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-[#22D3EE] text-white text-sm font-semibold pointer-events-none">
          Drop screenshot or CSV file here to analyse
        </div>
      )}

      {/* Composer Container */}
      <div className="flex items-end gap-2 bg-white/5 border border-white/10 focus-within:border-[#7C5CFF]/70 rounded-2xl p-2 transition-all shadow-inner">
        {/* Attach Button */}
        <div className="relative" ref={attachMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachMenu((prev) => !prev)}
            disabled={isAnalyzing}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Attach Screenshot (OCR) or CSV file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attach Menu Dropdown */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 w-52 bg-[#1A1448] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  imageInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left"
              >
                <ImageIcon className="w-4 h-4 text-[#22D3EE]" />
                <div>
                  <div className="font-semibold">Screenshot (OCR)</div>
                  <div className="text-[10px] text-slate-400">Extracts review text</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  csvInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#2EE6A6]" />
                <div>
                  <div className="font-semibold">CSV Dataset</div>
                  <div className="text-[10px] text-slate-400">Up to 2,000 rows</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isAnalyzing || disabled}
          placeholder="Paste review, comment, or individual sentences (e.g. 'I love this!', 'summary')..."
          rows={1}
          className="flex-1 max-h-32 min-h-[38px] bg-transparent text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none resize-none py-2 px-1 leading-relaxed"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isAnalyzing || disabled}
          className={`p-2 rounded-xl transition-all ${
            text.trim() && !isAnalyzing
              ? 'bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white shadow-md active:scale-95'
              : 'text-slate-600 bg-white/5 cursor-not-allowed'
          }`}
          title="Send review or command (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-400">
        <span>Press <kbd className="font-mono bg-white/10 px-1 rounded text-[10px]">Enter</kbd> to analyze, <kbd className="font-mono bg-white/10 px-1 rounded text-[10px]">Shift+Enter</kbd> for new line</span>
        <span>Drag & drop image or CSV anytime</span>
      </div>
    </div>
  );
};
