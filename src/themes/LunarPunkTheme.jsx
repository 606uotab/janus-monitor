import React from 'react';

// ── Lunar Punk theme decorations ──
// Plasma sphere moon, purple desert dunes, ruined skyline, dome shelters

export const LunarPunkMoon = () => (
  <div className="fixed pointer-events-none" style={{ top: 0, left: 0, zIndex: 20, width: 220, height: 220 }}>
    <style>{`
      @keyframes lp-moon-breathe {
        0%,100% { filter: drop-shadow(0 0 30px rgba(160,190,255,0.6)) drop-shadow(0 0 70px rgba(109,143,248,0.4)) drop-shadow(0 0 110px rgba(140,90,248,0.2)); }
        50% { filter: drop-shadow(0 0 50px rgba(190,210,255,0.8)) drop-shadow(0 0 95px rgba(109,143,248,0.55)) drop-shadow(0 0 150px rgba(140,90,248,0.3)); }
      }
      @keyframes lp-sparkle { 0%,100% { opacity:0; transform:scale(0.2); } 50% { opacity:1; transform:scale(1.2); } }
      @keyframes lp-ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>
    <svg width="220" height="220" viewBox="0 0 220 220" fill="none"
      style={{ animation: 'lp-moon-breathe 8s ease-in-out infinite' }}>
      <defs>
        <radialGradient id="lpMsurf" cx="40%" cy="36%" r="52%">
          <stop offset="0%" stopColor="#f0f4ff" />
          <stop offset="15%" stopColor="#e0e8ff" />
          <stop offset="35%" stopColor="#c0d0f8" />
          <stop offset="55%" stopColor="#90a8e0" />
          <stop offset="75%" stopColor="#6878c0" />
          <stop offset="100%" stopColor="#4050a0" />
        </radialGradient>
        <radialGradient id="lpMglow" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="transparent" />
          <stop offset="65%" stopColor="#6d8ff8" stopOpacity="0.14" />
          <stop offset="85%" stopColor="#8c5af8" stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="lpSoft"><feGaussianBlur stdDeviation="0.7" /></filter>
      </defs>
      {/* Outer glow corona */}
      <circle cx="110" cy="105" r="95" fill="url(#lpMglow)" />
      {/* Plasma ring arcs */}
      <ellipse cx="110" cy="105" rx="58" ry="54" stroke="#c0d8ff" strokeWidth="0.6" fill="none" opacity="0.2" transform="rotate(-20 110 105)" />
      <ellipse cx="110" cy="105" rx="55" ry="50" stroke="#a8c0ff" strokeWidth="0.5" fill="none" opacity="0.14" transform="rotate(25 110 105)" />
      <ellipse cx="110" cy="105" rx="60" ry="52" stroke="#d0e0ff" strokeWidth="0.4" fill="none" opacity="0.1" transform="rotate(55 110 105)" />
      {/* Moon body */}
      <circle cx="110" cy="105" r="48" fill="url(#lpMsurf)" filter="url(#lpSoft)" />
      {/* Craters */}
      <circle cx="96" cy="95" r="7" fill="#7888b8" opacity="0.18" />
      <circle cx="96" cy="95" r="7" stroke="#a0b0d8" strokeWidth="0.5" fill="none" opacity="0.12" />
      <circle cx="120" cy="90" r="5.5" fill="#7080b0" opacity="0.15" />
      <circle cx="105" cy="115" r="6" fill="#7888b8" opacity="0.12" />
      <circle cx="88" cy="106" r="3.5" fill="#7888b0" opacity="0.12" />
      <circle cx="124" cy="108" r="3" fill="#7080a8" opacity="0.1" />
      <circle cx="92" cy="82" r="4.5" fill="#7888b8" opacity="0.14" />
      <circle cx="116" cy="118" r="2.5" fill="#7888b0" opacity="0.09" />
      {/* Dark maria patches */}
      <ellipse cx="102" cy="100" rx="14" ry="10" fill="#6878a8" opacity="0.08" />
      <ellipse cx="118" cy="97" rx="9" ry="7" fill="#6070a0" opacity="0.06" />
      {/* Bright limb */}
      <circle cx="110" cy="105" r="47.5" stroke="#e8f0ff" strokeWidth="0.9" fill="none" opacity="0.4" />
      {/* Inner glow ring */}
      <circle cx="110" cy="105" r="52" stroke="#6d8ff8" strokeWidth="0.5" fill="none" opacity="0.12" />
    </svg>
    {/* Sparkles around moon */}
    {[
      {x:5,y:8,s:2.5,d:0},{x:195,y:15,s:2,d:.5},{x:8,y:90,s:2,d:1.1},{x:200,y:85,s:2.5,d:.3},
      {x:30,y:185,s:2,d:1.6},{x:175,y:175,s:2,d:.7},{x:105,y:5,s:2.5,d:2},{x:210,y:140,s:2,d:1.3},
      {x:55,y:140,s:2,d:.2},{x:148,y:190,s:2,d:2.1},{x:15,y:50,s:2,d:2.5},{x:185,y:55,s:2,d:.8},
    ].map((sp,i) => (
      <div key={i} className="absolute rounded-full" style={{
        left:sp.x,top:sp.y,width:sp.s,height:sp.s,
        backgroundColor: i%3===0 ? '#c0b0f8' : i%3===1 ? '#80a8ff' : '#dce4ff',
        boxShadow: i%3===0 ? '0 0 5px #c0b0f8' : '0 0 4px rgba(128,168,255,0.6)',
        animation:`lp-sparkle ${1.4+(i%4)*0.4}s ease-in-out ${sp.d}s infinite`,
      }} />
    ))}
  </div>
);

export const LunarPunkDunes = () => (
  <div className="fixed inset-x-0 bottom-0 pointer-events-none" style={{ zIndex: 1, height: '55%' }}>
    <style>{`
      @keyframes lp-dune1 { 0%,100% { transform: translateX(0) scaleY(1); } 50% { transform: translateX(-8px) scaleY(1.02); } }
      @keyframes lp-dune2 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
      @keyframes lp-dune3 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-5px) scaleY(0.98); } }
      @keyframes lp-shimmer { 0%,100% { opacity: 0.03; } 50% { opacity: 0.09; } }
      @keyframes lp-door-glow { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
    `}</style>

    {/* ── Far mountain range + ruined skyline ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '100%' }}
      viewBox="0 0 1440 500" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="lpFarMt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151030" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0c0920" stopOpacity="0.98" />
        </linearGradient>
      </defs>
      {/* Left rocky mountains */}
      <path d="M0 250 L0 150 L40 120 L80 160 L120 90 L160 130 L200 100 L240 140 L280 180 L320 220 L360 250"
        fill="url(#lpFarMt)" opacity="0.7" />
      {/* Right mountain range + mesa */}
      <path d="M900 280 L960 230 L1020 200 L1060 180 L1100 200 L1100 180 L1140 190 L1180 170 L1200 200 L1240 220 L1300 240 L1360 250 L1440 260 L1440 500 L900 500Z"
        fill="url(#lpFarMt)" opacity="0.6" />
      {/* Ruined city skyline silhouette */}
      <g opacity="0.22" fill="#2a2860">
        {/* Tall spire */}
        <rect x="1080" y="140" width="5" height="80" />
        <rect x="1076" y="135" width="13" height="6" />
        <rect x="1079" y="120" width="7" height="18" />
        <polygon points="1082,112 1078,120 1087,120" />
        {/* Ruined tower cluster */}
        <rect x="1120" y="150" width="8" height="55" />
        <rect x="1132" y="160" width="6" height="45" />
        <rect x="1116" y="145" width="16" height="6" />
        {/* Broken dome */}
        <path d="M1170 205 Q1180 170 1200 172 Q1210 175 1215 205" strokeWidth="0" />
        {/* Antenna array */}
        <rect x="1250" y="165" width="3" height="60" />
        <rect x="1260" y="175" width="3" height="50" />
        <line x1="1251" y1="180" x2="1263" y2="190" stroke="#2a2860" strokeWidth="1.5" />
        <line x1="1251" y1="195" x2="1263" y2="205" stroke="#2a2860" strokeWidth="1.5" />
        {/* Collapsed structure */}
        <rect x="1310" y="190" width="12" height="40" />
        <path d="M1305 195 L1330 210" stroke="#2a2860" strokeWidth="2" />
        <rect x="1326" y="200" width="8" height="30" />
        {/* Far left ruins */}
        <rect x="380" y="210" width="6" height="40" />
        <rect x="390" y="220" width="4" height="30" />
        <path d="M420 250 Q430 220 445 222 Q455 225 460 250" />
      </g>
    </svg>

    {/* ── Dune layer 1 — far (purple mist) ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '90%', animation: 'lp-dune1 28s ease-in-out infinite' }}
      viewBox="0 0 1440 400" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="lpD1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1245" stopOpacity="0" />
          <stop offset="25%" stopColor="#1a1245" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0e0828" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path d="M0 220 Q120 160 240 200 Q360 240 480 180 Q600 120 720 170 Q840 220 960 160 Q1080 100 1200 155 Q1320 210 1440 165 L1440 400 L0 400Z" fill="url(#lpD1)" />
    </svg>

    {/* ── Dome shelters (Tatooine-style) ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '75%', zIndex: 2 }}
      viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="lpDome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#252050" />
          <stop offset="100%" stopColor="#181435" />
        </linearGradient>
      </defs>
      {/* Large dome */}
      <path d="M680 210 Q680 170 710 155 Q740 145 770 155 Q800 170 800 210Z" fill="url(#lpDome)" opacity="0.32" />
      <rect x="725" y="195" width="12" height="16" rx="2" fill="#6d8ff8" opacity="0.1" style={{ animation: 'lp-door-glow 4s ease-in-out infinite' }} />
      {/* Small dome */}
      <path d="M820 215 Q820 192 838 185 Q856 192 856 215Z" fill="url(#lpDome)" opacity="0.28" />
      <rect x="841" y="206" width="7" height="10" rx="1" fill="#8c5af8" opacity="0.08" style={{ animation: 'lp-door-glow 5s ease-in-out 1s infinite' }} />
      {/* Tiny dome far left */}
      <path d="M320 225 Q320 212 332 208 Q344 212 344 225Z" fill="#1e1a40" opacity="0.24" />
      {/* Antenna on large dome */}
      <rect x="738" y="145" width="2" height="14" fill="#252050" opacity="0.22" />
      <circle cx="739" cy="143" r="2" fill="#252050" opacity="0.18" />
    </svg>

    {/* ── Dune layer 2 — mid (rolling dunes) ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '70%', animation: 'lp-dune2 22s ease-in-out infinite' }}
      viewBox="0 0 1440 300" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="lpD2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151040" stopOpacity="0" />
          <stop offset="35%" stopColor="#151040" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0a0820" stopOpacity="0.98" />
        </linearGradient>
      </defs>
      <path d="M0 180 Q180 110 360 160 Q540 210 720 140 Q900 70 1080 130 Q1260 190 1440 145 L1440 300 L0 300Z" fill="url(#lpD2)" />
    </svg>

    {/* ── Dune layer 3 — near foreground (darkest) ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '45%', animation: 'lp-dune3 30s ease-in-out infinite' }}
      viewBox="0 0 1440 200" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="lpD3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0a22" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#08071a" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d="M0 100 Q200 40 400 80 Q600 120 800 60 Q1000 0 1200 50 Q1350 90 1440 65 L1440 200 L0 200Z" fill="url(#lpD3)" />
    </svg>

    {/* ── Foreground rocks / pebbles ── */}
    <svg className="absolute bottom-0 w-full" style={{ height: '20%', zIndex: 3 }}
      viewBox="0 0 1440 100" preserveAspectRatio="none" fill="none">
      <g fill="#0a0818" opacity="0.6">
        <ellipse cx="80" cy="75" rx="12" ry="6" />
        <ellipse cx="150" cy="82" rx="8" ry="4" />
        <ellipse cx="340" cy="70" rx="10" ry="5" />
        <ellipse cx="520" cy="85" rx="6" ry="3" />
        <ellipse cx="780" cy="78" rx="9" ry="4" />
        <ellipse cx="1050" cy="72" rx="11" ry="5" />
        <ellipse cx="1200" cy="80" rx="7" ry="3.5" />
        <ellipse cx="1380" cy="76" rx="10" ry="4.5" />
      </g>
    </svg>

    {/* Horizon atmospheric glow */}
    <div className="absolute w-full" style={{
      top: '15%', height: '6px',
      background: 'linear-gradient(90deg, transparent 3%, rgba(109,143,248,0.1) 15%, rgba(140,90,248,0.08) 50%, rgba(109,143,248,0.1) 85%, transparent 97%)',
    }} />

    {/* Sand shimmer */}
    <div className="absolute inset-0" style={{
      background: 'repeating-linear-gradient(135deg, transparent 0px, transparent 3px, rgba(109,143,248,0.035) 3px, rgba(109,143,248,0.035) 6px)',
      animation: 'lp-shimmer 8s ease-in-out infinite',
    }} />
  </div>
);

export const LunarPunkDust = () => {
  const particles = [];
  for (let i = 0; i < 90; i++) {
    const x = ((i * 137.508 + 42) % 100);
    const y = ((i * 97.31 + 11) % 100);
    const size = (i % 13 === 0) ? 3.5 : (i % 7 === 0) ? 2.5 : (i % 3 === 0) ? 1.8 : 1;
    const dur = 15 + (i % 11) * 4;
    const delay = (i * 0.7) % 12;
    const isPurple = i % 4 === 0;
    const isBright = i % 11 === 0;
    particles.push(
      <div key={i} className="absolute rounded-full" style={{
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        backgroundColor: isBright ? '#e0e8ff' : isPurple ? '#a880f0' : '#6080d0',
        opacity: isBright ? 0.65 : 0.2 + (i % 5) * 0.05,
        animation: `lp-float-${i % 3} ${dur}s ease-in-out ${delay}s infinite`,
        boxShadow: isBright ? `0 0 ${size*2}px rgba(160,190,255,0.4)` : 'none',
      }} />
    );
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      <style>{`
        @keyframes lp-float-0 { 0%,100% { transform: translateY(0) translateX(0); opacity:0.2; } 25% { opacity:0.4; } 50% { transform: translateY(-25px) translateX(12px); opacity:0.2; } 75% { opacity:0.35; } }
        @keyframes lp-float-1 { 0%,100% { transform: translateY(0) translateX(0); opacity:0.16; } 30% { opacity:0.35; } 50% { transform: translateY(-18px) translateX(-15px); opacity:0.16; } 80% { opacity:0.28; } }
        @keyframes lp-float-2 { 0%,100% { transform: translateY(0) translateX(0); opacity:0.14; } 40% { opacity:0.28; } 50% { transform: translateY(-30px) translateX(8px); opacity:0.14; } 70% { opacity:0.24; } }
      `}</style>
      {particles}
    </div>
  );
};
