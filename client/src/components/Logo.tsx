import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-base' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${icon} rounded-xl bg-gradient-to-br from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] flex items-center justify-center shadow-md`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3/5 h-3/5 text-white">
          <path
            d="M12 3C7.58 3 4 6.58 4 11v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7c0-4.42-3.58-8-8-8z"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M7 11h10v1.5a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V11z"
            fill="currentColor"
          />
          <circle cx="12" cy="7" r="1.5" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <span className={`font-bold ${text} tracking-tight`}>
          <span className="text-foreground">南坎极速</span>
          <span className="text-primary">外卖</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
