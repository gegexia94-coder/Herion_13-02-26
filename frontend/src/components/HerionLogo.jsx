export function HerionMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-testid="herion-mark"
    >
      <rect width="40" height="40" rx="10" fill="#1E2430" />
      <path
        d="M12 10L12 30"
        stroke="url(#h-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M28 10L28 30"
        stroke="url(#h-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M12 20L28 20"
        stroke="url(#h-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="10" r="2" fill="#C4D9FF" />
      <circle cx="28" cy="10" r="2" fill="#C5BAFF" />
      <circle cx="12" cy="30" r="2" fill="#C5BAFF" />
      <circle cx="28" cy="30" r="2" fill="#C4D9FF" />
      <defs>
        <linearGradient id="h-grad" x1="12" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4D9FF" />
          <stop offset="1" stopColor="#C5BAFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HerionMarkLight({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-testid="herion-mark-light"
    >
      <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.1" />
      <path d="M12 10L12 30" stroke="url(#h-grad-l)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 10L28 30" stroke="url(#h-grad-l)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 20L28 20" stroke="url(#h-grad-l)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="2" fill="#C4D9FF" />
      <circle cx="28" cy="10" r="2" fill="#C5BAFF" />
      <circle cx="12" cy="30" r="2" fill="#C5BAFF" />
      <circle cx="28" cy="30" r="2" fill="#C4D9FF" />
      <defs>
        <linearGradient id="h-grad-l" x1="12" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4D9FF" />
          <stop offset="1" stopColor="#C5BAFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
