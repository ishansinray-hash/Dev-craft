import React from "react";

interface OrderKaroLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export const OrderKaroLogo: React.FC<OrderKaroLogoProps> = ({
  className = "",
  size = "md",
  showText = true,
}) => {
  const iconDimensions = {
    sm: { width: 34, height: 20 },
    md: { width: 44, height: 26 },
    lg: { width: 60, height: 34 },
    xl: { width: 90, height: 50 },
  }[size];

  const textClasses = {
    sm: "text-base tracking-tight",
    md: "text-lg tracking-tight",
    lg: "text-2xl tracking-tight",
    xl: "text-3xl tracking-tight",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic 3D "OK" Vector Emblem */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="0 0 500 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_2px_8px_rgba(234,88,12,0.35)] transition-transform duration-200 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="okGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>

          <linearGradient id="okGradArrow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>

          <linearGradient id="okGradBoxTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <linearGradient id="okGradBoxSide" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>

          <linearGradient id="okGradBoxFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="okGradStem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>

        {/* Speed Motion Trails */}
        <g fill="#EA580C" opacity="0.95">
          <rect x="75" y="108" width="28" height="7" rx="3.5" />
          <rect x="90" y="125" width="24" height="7" rx="3.5" />
          <rect x="68" y="142" width="38" height="7" rx="3.5" />
          <circle cx="85" cy="94" r="3.5" />
        </g>

        {/* "O" Loop Outer Body */}
        <path
          d="M 230,65 C 295,65 345,105 345,155 C 345,205 285,225 215,225 C 145,225 110,185 110,140 C 110,95 160,65 230,65 Z"
          fill="none"
          stroke="url(#okGradOrange)"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* "K" Vertical Stem */}
        <path
          d="M 255,60 L 285,60 L 265,225 L 235,225 Z"
          fill="url(#okGradStem)"
        />

        {/* "K" Lower Leg */}
        <path
          d="M 270,145 L 350,225 L 320,225 L 255,160 Z"
          fill="url(#okGradOrange)"
        />

        {/* "K" Upper Ascending 3D Arrow */}
        <path
          d="M 125,175 C 190,225 270,205 345,100 L 375,55 L 340,65 L 335,80 C 275,155 200,180 145,150 Z"
          fill="url(#okGradArrow)"
        />
        <path
          d="M 330,60 L 400,32 L 370,105 L 352,78 L 330,88 Z"
          fill="url(#okGradArrow)"
        />

        {/* Delivery Box with Verified Tick */}
        <g transform="translate(100, 85)">
          {/* Top Face */}
          <polygon points="50,0 95,20 50,38 5,18" fill="url(#okGradBoxTop)" />
          <polygon points="45,2 55,6 55,36 45,32" fill="#FFFFFF" opacity="0.6" />
          
          {/* Right Face */}
          <polygon points="95,20 95,72 50,92 50,38" fill="url(#okGradBoxSide)" />
          {/* Front Face */}
          <polygon points="5,18 50,38 50,92 5,72" fill="url(#okGradBoxFront)" />
          <polygon points="23,26 31,29 31,84 23,80" fill="#FFFFFF" opacity="0.4" />

          {/* White Checkmark Badge */}
          <g transform="translate(18, 42)">
            <rect x="0" y="0" width="34" height="34" rx="6" fill="#FFFFFF" opacity="0.95" />
            <path
              d="M 7,17 L 14,24 L 27,9"
              fill="none"
              stroke="#EA580C"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>

      {/* Brand Wordmark Typography */}
      {showText && (
        <div className="flex items-baseline font-bold font-['Outfit'] leading-none">
          <span className={`text-white ${textClasses}`}>Order</span>
          <span className={`text-orange-500 ${textClasses}`}>Karo</span>
        </div>
      )}
    </div>
  );
};
