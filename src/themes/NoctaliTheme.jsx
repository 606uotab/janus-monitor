import React from 'react';

// ── Noctali theme decorations ──
// Images: place noctali-dark.png, noctali-moon.png, noctali-white.png in public/

// Plasma crescent moon — realistic with craters, whiter
export const NoctaliMoon = () => (
  <div className="fixed pointer-events-none" style={{ top: 40, left: 10, zIndex: 20 }}>
    <style>{`
      @keyframes moon-breathe {
        0%,100% { filter: drop-shadow(0 0 8px rgba(240,242,250,0.3)) drop-shadow(0 0 25px rgba(220,225,240,0.12)); }
        50% { filter: drop-shadow(0 0 15px rgba(248,250,255,0.5)) drop-shadow(0 0 40px rgba(220,225,240,0.2)); }
      }
      @keyframes moon-sparkle { 0%,100% { opacity:0; transform:scale(0.3); } 50% { opacity:1; transform:scale(1.3); } }
    `}</style>
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none"
      style={{ animation: 'moon-breathe 6s ease-in-out infinite' }}>
      <defs>
        <radialGradient id="moonSurf" cx="40%" cy="36%" r="52%">
          <stop offset="0%" stopColor="#fcfcff" />
          <stop offset="20%" stopColor="#eef0f8" />
          <stop offset="45%" stopColor="#dce0ee" />
          <stop offset="70%" stopColor="#b8bdd0" />
          <stop offset="100%" stopColor="#9098ac" />
        </radialGradient>
        <filter id="softM"><feGaussianBlur stdDeviation="0.5" /></filter>
      </defs>
      {/* Crescent mask — no background circle */}
      <mask id="cMask">
        <rect width="150" height="150" fill="white" />
        <circle cx="92" cy="58" r="43" fill="black" />
      </mask>
      {/* Moon surface */}
      <circle cx="68" cy="68" r="45" fill="url(#moonSurf)" mask="url(#cMask)" filter="url(#softM)" />
      {/* Craters — subtle dark circles with rim highlights */}
      <circle cx="46" cy="52" r="6" fill="#a8aec0" opacity="0.3" mask="url(#cMask)" />
      <circle cx="46" cy="52" r="6" stroke="#c8ccd8" strokeWidth="0.5" fill="none" opacity="0.25" mask="url(#cMask)" />
      <circle cx="40" cy="72" r="4.5" fill="#a0a8bc" opacity="0.25" mask="url(#cMask)" />
      <circle cx="40" cy="72" r="4.5" stroke="#c0c4d4" strokeWidth="0.4" fill="none" opacity="0.2" mask="url(#cMask)" />
      <circle cx="54" cy="84" r="3" fill="#a8b0c0" opacity="0.2" mask="url(#cMask)" />
      <circle cx="34" cy="88" r="2.5" fill="#a0a8b8" opacity="0.2" mask="url(#cMask)" />
      <circle cx="50" cy="66" r="2.5" fill="#a4aab8" opacity="0.22" mask="url(#cMask)" />
      <circle cx="36" cy="60" r="4" fill="#a8aec4" opacity="0.2" mask="url(#cMask)" />
      <circle cx="36" cy="60" r="4" stroke="#c4c8d8" strokeWidth="0.4" fill="none" opacity="0.18" mask="url(#cMask)" />
      <circle cx="28" cy="78" r="2" fill="#a0a8b8" opacity="0.18" mask="url(#cMask)" />
      {/* Bright limb highlight */}
      <circle cx="68" cy="68" r="44.5" stroke="#f0f2fc" strokeWidth="0.5" fill="none" mask="url(#cMask)" opacity="0.5" />
    </svg>
    {/* Sparkle pixels */}
    {[
      {x:-12,y:-18,s:3.5,d:0},{x:135,y:-8,s:3,d:.7},{x:-18,y:65,s:3,d:1.4},{x:140,y:88,s:3.5,d:.3},
      {x:8,y:140,s:3,d:2},{x:118,y:135,s:3,d:1},{x:68,y:-22,s:3,d:2.8},{x:145,y:40,s:3,d:1.6},
      {x:-22,y:108,s:3.5,d:.5},{x:78,y:145,s:3,d:2.4},{x:-8,y:28,s:3,d:3.2},{x:128,y:118,s:3,d:.1},
    ].map((sp,i) => (
      <div key={i} className="absolute rounded-full" style={{
        left:sp.x,top:sp.y,width:sp.s,height:sp.s,
        backgroundColor: i % 4 === 0 ? '#F4D995' : '#dde2f0',
        boxShadow: i % 4 === 0 ? '0 0 5px #F4D995' : '0 0 4px rgba(220,225,240,0.5)',
        animation:`moon-sparkle ${1.8+(i%3)*0.5}s ease-in-out ${sp.d}s infinite`,
      }} />
    ))}
  </div>
);

// Real Noctali illustrations (from public/ folder)
export const NoctaliImages = () => (
  <>
    {/* Bottom-left: standing Noctali on dark bg */}
    <img src="/noctali-dark.png" alt="" className="fixed pointer-events-none"
      style={{ left: 10, bottom: 20, width: 200, height: 200, objectFit: 'contain', opacity: 0.7, zIndex: 20 }} />
    {/* Header area: standing Noctali — next to title */}
    <img src="/noctali-white.png" alt="" className="fixed pointer-events-none"
      style={{ right: 110, top: 22, width: 100, height: 100, objectFit: 'contain', opacity: 0.6, zIndex: 20,
        filter: 'brightness(0.7) contrast(1.1)', mixBlendMode: 'lighten' }} />
  </>
);

// Animated twinkling stars — Milky Way effect
export const NoctaliStarfield = () => {
  const stars = [];
  for (let i = 0; i < 120; i++) {
    const x = ((i * 137.508) % 100);
    const y = ((i * 97.31 + 23) % 100);
    const size = (i % 7 === 0) ? 3.5 : (i % 5 === 0) ? 2.5 : (i % 3 === 0) ? 2 : 1.2;
    const delay = (i * 0.31) % 6;
    const dur = 2.5 + (i % 4);
    const isGold = i % 5 === 0;
    stars.push({ x, y, size, delay, dur, isGold });
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <style>{`
        @keyframes noctali-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }
      `}</style>
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            backgroundColor: s.isGold ? '#F4D995' : '#8090c0',
            boxShadow: s.isGold ? '0 0 4px #F4D995' : (s.size > 2 ? '0 0 3px #8090c0' : 'none'),
            animation: `noctali-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
      ))}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, transparent 25%, rgba(100,120,200,0.04) 40%, rgba(244,217,149,0.02) 50%, rgba(100,120,200,0.04) 60%, transparent 75%)',
      }} />
    </div>
  );
};
