import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Smile,
  Frown,
  FileText,
  Type,
} from 'lucide-react';

interface ComposerProps {
  onSendMessage: (text: string, isSentence?: boolean) => void;
  onAttachImage: (file: File) => void;
  onAttachCsv: (file: File) => void;
  onAnalyzeMultipleLines: (lines: string[]) => void;
  onSampleScreenshot?: () => void;
  onSampleExpression?: (type: 'happy' | 'frustrated') => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

const QUICK_SENTENCES = [
  'I love this!!',
  "I still don't have my order",
  'The build quality feels remarkably sturdy and premium.',
  'Terrible customer service, they hung up the call immediately.',
  'Average experience, nothing special but it works as intended.',
];

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onAttachImage,
  onAttachCsv,
  onAnalyzeMultipleLines,
  onSampleScreenshot,
  onSampleExpression,
  isAnalyzing,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [multiLinePrompt, setMultiLinePrompt] = useState<{ lines: string[] } | null>(null);
  const [isSentenceMode, setIsSentenceMode] = useState(false);

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
      setMultiLinePrompt({ lines });
    } else if (lines.length === 1 && !isSentenceMode) {
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
    onSendMessage(text.trim(), isSentenceMode);
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

      {/* Mode Selector & Quick Chips Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-black/40 border border-white/10 text-[11px]">
          <button
            type="button"
            onClick={() => setIsSentenceMode(false)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
              !isSentenceMode
                ? 'bg-[#7C5CFF] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Review Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSentenceMode(true)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
              isSentenceMode
                ? 'bg-[#22D3EE] text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>Sentence Mode</span>
          </button>
        </div>

        {/* Quick sample prompt pill */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[55%] no-scrollbar">
          {QUICK_SENTENCES.slice(0, 2).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setText(s);
                textareaRef.current?.focus();
              }}
              className="text-[10px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[150px] transition-colors"
              title={s}
            >
              "{s}"
            </button>
          ))}
        </div>
      </div>

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
          Drop screenshot, photo, or CSV file here to analyse
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
            title="Attach Screenshot (OCR), Expression Photo, or CSV"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attach Menu Dropdown */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 w-64 bg-[#1A1448] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-fade-in text-xs">
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
                  <div className="font-semibold">Upload Image File</div>
                  <div className="text-[10px] text-slate-400">Screenshots (OCR) & Facial Expressions</div>
                </div>
              </button>

              {onSampleScreenshot && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    onSampleScreenshot();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left border-t border-white/5"
                >
                  <FileText className="w-4 h-4 text-[#2EE6A6]" />
                  <div>
                    <div className="font-semibold">Sample Screenshot (Reviews)</div>
                    <div className="text-[10px] text-slate-400">Test OCR text extraction checklist</div>
                  </div>
                </button>
              )}

              {onSampleExpression && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      onSampleExpression('happy');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left"
                  >
                    <Smile className="w-4 h-4 text-[#FFC145]" />
                    <div>
                      <div className="font-semibold">Sample Expression: Joy 😊</div>
                      <div className="text-[10px] text-slate-400">Test facial smile analysis & tone</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      onSampleExpression('frustrated');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left"
                  >
                    <Frown className="w-4 h-4 text-[#FF4D6D]" />
                    <div>
                      <div className="font-semibold">Sample Expression: Frustration 😠</div>
                      <div className="text-[10px] text-slate-400">Test anger/discontent tone detection</div>
                    </div>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  csvInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-[#7C5CFF]/30 transition-colors text-left border-t border-white/5"
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
          placeholder={
            isSentenceMode
              ? 'Type any sentence to analyze tone (e.g. "I love this!!", "The package never arrived")...'
              : 'Paste review, comment, or sentence (e.g. "I still don\'t have my order", "summary")...'
          }
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
          title="Send review or sentence to analyze (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-400">
        <span>
          Press <kbd className="font-mono bg-white/10 px-1 rounded text-[10px]">Enter</kbd> to analyze,{' '}
          <kbd className="font-mono bg-white/10 px-1 rounded text-[10px]">Shift+Enter</kbd> for newline
        </span>
        <span className="hidden sm:inline">Dual VADER + 🤗 Hugging Face RoBERTa</span>
      </div>
    </div>
  );
};
