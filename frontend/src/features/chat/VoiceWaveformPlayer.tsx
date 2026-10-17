import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCheck } from 'lucide-react';

interface VoiceWaveformPlayerProps {
  duration?: string;
  timestamp?: string;
  isOutgoing?: boolean;
}

export const VoiceWaveformPlayer: React.FC<VoiceWaveformPlayerProps> = ({
  duration = '2:19',
  timestamp = '10:41 am',
  isOutgoing = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState(0);

  // 32 simulated audio waveform bars with varying heights matching reference design
  const barHeights = [
    8, 14, 18, 12, 24, 16, 28, 20, 14, 22, 16, 26, 32, 18, 22, 14, 28, 20,
    12, 24, 30, 16, 22, 14, 18, 26, 20, 12, 16, 22, 14, 8,
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveBar((prev) => (prev + 1) % barHeights.length);
      }, 120);
    }
    return () => clearInterval(timer);
  }, [isPlaying, barHeights.length]);

  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} my-2`}>
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full shadow-md bg-[#111111] text-white border border-black/10 dark:bg-[#141C18]">
        {/* Circular Play / Pause Button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Tạm dừng ghi âm' : 'Phát tin nhắn thoại'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#111111] transition-transform hover:scale-105 active:scale-95 shadow-sm"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Audio Waveform Bars */}
        <div className="flex items-center gap-[2.5px] h-8 px-1">
          {barHeights.map((h, idx) => {
            const isPassed = idx <= activeBar && isPlaying;
            return (
              <span
                key={idx}
                style={{ height: `${h}px` }}
                className={`w-[2px] rounded-full transition-all duration-100 ${
                  isPassed ? 'bg-[#10B981]' : 'bg-white/80'
                }`}
              />
            );
          })}
        </div>

        {/* Duration text & green tick */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <span className="font-mono text-xs font-semibold text-white/90">
            {duration}
          </span>
          {isOutgoing && <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />}
        </div>
      </div>

      {/* Timestamp below the waveform */}
      <div className="flex items-center gap-1.5 mt-1 px-2 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
        <span>{timestamp}</span>
      </div>
    </div>
  );
};
