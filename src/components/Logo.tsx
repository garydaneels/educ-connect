export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icône casquette 3D */}
      <svg width="28" height="26" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="lTopFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa"/>
            <stop offset="35%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#c2410c"/>
          </linearGradient>
          <linearGradient id="lLeftFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9a3412"/>
            <stop offset="100%" stopColor="#6c2509"/>
          </linearGradient>
          <linearGradient id="lRightFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c2d12"/>
            <stop offset="100%" stopColor="#431407"/>
          </linearGradient>
          <linearGradient id="lCapTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc"/>
            <stop offset="55%" stopColor="#0284c7"/>
            <stop offset="100%" stopColor="#0c4a6e"/>
          </linearGradient>
          <linearGradient id="lCapSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0369a1"/>
            <stop offset="100%" stopColor="#082f49"/>
          </linearGradient>
          <radialGradient id="lShine" cx="28%" cy="18%" r="62%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <filter id="lShadow" x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.28)"/>
          </filter>
        </defs>

        {/* Corps de la casquette — côté visible */}
        <path d="M2,19.5 Q2,23.5 14,23.5 Q26,23.5 26,19.5 L26,16.5 Q14,18 2,16.5 Z" fill="url(#lCapSide)"/>
        {/* Corps — ellipse du dessus */}
        <ellipse cx="14" cy="16.5" rx="12" ry="2.2" fill="url(#lCapTop)"/>
        <ellipse cx="14" cy="16.5" rx="12" ry="2.2" fill="url(#lShine)"/>

        {/* Mortier — épaisseur gauche */}
        <polygon points="2,11 2,14 14,16.5 14,13.5" fill="url(#lLeftFace)"/>
        {/* Mortier — épaisseur droite */}
        <polygon points="26,11 26,14 14,16.5 14,13.5" fill="url(#lRightFace)"/>
        {/* Mortier — face dessus (losange) */}
        <polygon points="14,4 26,11 14,18 2,11" fill="url(#lTopFace)" filter="url(#lShadow)"/>
        <polygon points="14,4 26,11 14,18 2,11" fill="url(#lShine)"/>

        {/* Gland — cordon */}
        <path d="M26,11 Q29.5,12.5 28.5,17" stroke="#fbbf24" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        {/* Gland — boule */}
        <circle cx="28" cy="17.5" r="2.2" fill="#f59e0b"/>
        <circle cx="27.2" cy="16.7" r="0.9" fill="white" opacity="0.5"/>
      </svg>

      {/* Texte */}
      <span className="text-xl font-bold text-orange-600 leading-none">Educ</span>
      <span className="text-xl font-light text-sky-700 leading-none -ml-1">Connect</span>
    </span>
  );
}
