export function Logo({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const ink = tone === "light" ? "text-white" : "text-brand-ink";
  return (
    <span className={`inline-flex flex-col leading-[0.85] font-semibold tracking-tight ${ink} ${className}`} aria-label="Educ-Connect">
      <span className="inline-flex items-center text-2xl">
        educ
        <svg className="ml-0.5 h-[0.6em] w-[1.5em]" viewBox="0 0 60 24" aria-hidden="true">
          <defs>
            <linearGradient id="educConnectWave" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fe8160" />
              <stop offset="1" stopColor="#374c9c" />
            </linearGradient>
          </defs>
          <path d="M2 14 C10 2 18 2 24 12 S38 22 44 12 S54 4 58 10" fill="none" stroke="url(#educConnectWave)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-2xl">connect</span>
    </span>
  );
}
