import React from 'react';

interface RunningTextProps {
  text: string;
  maxLength?: number;
  maxWidthClass?: string;
  className?: string;
  speed?: number; // seconds per cycle
}

export const RunningText: React.FC<RunningTextProps> = ({
  text,
  maxLength = 14,
  maxWidthClass = 'max-w-[120px] sm:max-w-[150px] md:max-w-[180px]',
  className = '',
  speed
}) => {
  const isLong = text.length > maxLength;

  if (!isLong) {
    return (
      <div
        className={`truncate whitespace-nowrap ${className}`}
        title={text}
      >
        {text}
      </div>
    );
  }

  // Calculate dynamic duration based on text length if speed not specified
  const duration = speed || Math.max(6, Math.min(14, text.length * 0.45));

  return (
    <div
      className={`overflow-hidden relative ${maxWidthClass} group cursor-default`}
      title={`${text}`}
    >
      <div
        className="inline-flex whitespace-nowrap animate-running-text group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        <span className={`pr-6 shrink-0 ${className}`}>
          {text}
        </span>
        <span className={`pr-6 shrink-0 ${className}`}>
          {text}
        </span>
      </div>
    </div>
  );
};

