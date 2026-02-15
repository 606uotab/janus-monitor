import React from 'react';
import solarpunkBg from '../assets/solarpunk_bg.jpg';

// ── Solarpunk theme decorations (LIGHT) ──
// Full-screen background image + animated golden pollen overlay

// Background layer — the JPEG solarpunk landscape
export const SolarpunkBackground = () => (
  <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
    <div className="absolute inset-0" style={{
      backgroundImage: `url(${solarpunkBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundRepeat: 'no-repeat',
    }} />
    {/* Soft vignette to focus content area */}
    <div className="absolute inset-0" style={{
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(232,241,222,0.5) 100%)',
    }} />
  </div>
);

// Floating pollen / golden dust particles — animated overlay
export const SolarpunkPollen = () => {
  const particles = [];
  for (let i = 0; i < 45; i++) {
    const x = ((i * 137.508 + 42) % 100);
    const y = ((i * 97.31 + 17) % 100);
    const size = (i % 7 === 0) ? 3.5 : (i % 5 === 0) ? 2.8 : (i % 3 === 0) ? 2 : 1.3;
    const delay = (i * 0.41) % 8;
    const dur = 22 + (i % 7) * 5;
    const animIdx = i % 3;
    const isGold = i % 3 === 0;
    const isLeaf = i % 5 === 0;
    particles.push({ x, y, size, delay, dur, animIdx, isGold, isLeaf });
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      <style>{`
        @keyframes sp-pollen-0 {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          12% { opacity: 0.6; }
          50% { transform: translateY(-30vh) translateX(10px); opacity: 0.4; }
          88% { opacity: 0.55; }
          100% { transform: translateY(-65vh) translateX(-6px); opacity: 0; }
        }
        @keyframes sp-pollen-1 {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.5; }
          50% { transform: translateY(-25vh) translateX(-12px); opacity: 0.35; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-55vh) translateX(5px); opacity: 0; }
        }
        @keyframes sp-pollen-2 {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          18% { opacity: 0.45; }
          50% { transform: translateY(-35vh) translateX(15px); opacity: 0.3; }
          82% { opacity: 0.5; }
          100% { transform: translateY(-70vh) translateX(-10px); opacity: 0; }
        }
      `}</style>
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          backgroundColor: p.isGold ? '#c89820' : p.isLeaf ? '#5a9a40' : '#b0a040',
          boxShadow: p.isGold ? `0 0 ${p.size + 4}px rgba(200,152,32,0.5)` : 'none',
          animation: `sp-pollen-${p.animIdx} ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
};
