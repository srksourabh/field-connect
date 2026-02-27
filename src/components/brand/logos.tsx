import Image from "next/image";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function UdsHrLogo({ size = 36, showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="6" fill="#137fec" />
        {/* Bold U letterform */}
        <path
          d="M7.5 8h5v10c0 2.2 1.8 4 4 4s4-1.8 4-4V8h5v10c0 4.4-3.6 8-8 8h-2c-4.4 0-8-3.6-8-8V8z"
          fill="white"
        />
        {/* Pixel grid accent in the curve */}
        <rect x="12" y="21" width="2" height="2" rx="0.3" fill="rgba(255,255,255,0.5)" />
        <rect x="15" y="21" width="2" height="2" rx="0.3" fill="rgba(255,255,255,0.4)" />
        <rect x="18" y="21" width="2" height="2" rx="0.3" fill="rgba(255,255,255,0.5)" />
        <rect x="13.5" y="24" width="2" height="2" rx="0.3" fill="rgba(255,255,255,0.3)" />
        <rect x="16.5" y="24" width="2" height="2" rx="0.3" fill="rgba(255,255,255,0.3)" />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          UDS <span className="text-primary">HR</span>
        </span>
      )}
    </div>
  );
}

export function FieldConnectLogo({ size = 36, showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="6" fill="#137fec" />
        {/* Location pin */}
        <path
          d="M16 6c-4.4 0-8 3.6-8 8 0 6 8 14 8 14s8-8 8-14c0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"
          fill="white"
        />
        {/* Signal arcs */}
        <path
          d="M24 8c2 2 3 5 3 8"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M26 6c2.5 2.5 4 6 4 10"
          stroke="white"
          strokeWidth="1.2"
          fill="none"
          opacity="0.35"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          Field <span className="text-primary">Connect</span>
        </span>
      )}
    </div>
  );
}

export function PosBuddyLogo({ size = 36, showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brands/posbuddy-icon.png"
        alt="POSBuddy"
        width={size}
        height={size}
        className="rounded-lg"
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          POS<span className="text-primary">Buddy</span>
        </span>
      )}
    </div>
  );
}
