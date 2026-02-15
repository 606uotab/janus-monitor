import React, { useState, useEffect, useRef } from 'react';

// ── St. Jude theme decorations (DARK — Cypherpunk Minimal) ──
// Hommage à Jude Milhon, pionnière cypherpunk
// Verre émeraude sombre, portraits, PGP watermark, citations, hex/binaire

// Portrait mugshot — coin bas-droit
export const StJudePortrait = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
    <style>{`
      @keyframes sj-breathe {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.45; }
      }
    `}</style>
    <img
      src="/Judemugshot.jpg"
      alt=""
      className="absolute"
      style={{
        bottom: 24,
        right: 24,
        width: 220,
        height: 'auto',
        borderRadius: 14,
        filter: 'grayscale(0.5) sepia(0.1) brightness(1.0) hue-rotate(90deg)',
        animation: 'sj-breathe 8s ease-in-out infinite',
        opacity: 0.4,
        border: '1px solid rgba(80,200,120,0.2)',
      }}
    />
  </div>
);

// CypherJude banner — par-dessus le header, zIndex élevé
export const StJudeBanner = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
    <style>{`
      @keyframes sj-banner-glow {
        0%, 100% { opacity: 0.40; filter: brightness(0.95); }
        50% { opacity: 0.55; filter: brightness(1.1); }
      }
    `}</style>
    <img
      src="/cyphejude.png"
      alt=""
      className="absolute"
      style={{
        top: 0,
        left: 0,
        width: 380,
        height: 'auto',
        borderRadius: '0 0 12px 0',
        animation: 'sj-banner-glow 10s ease-in-out infinite',
        opacity: 0.45,
      }}
    />
  </div>
);

// PGP watermark + hex + binaire — scrolling
const PGP_BLOCK = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: St.Jude 1.0

mQENBGJ0d3UBCAC8pK3L2f7a9Xz5Q
7A3B 89F2 C4E1 D078 5B6A  2F91 8E4C 0D73 A5B2 F168
E92D 4A7F 1B83 C605 9D24  F7A0 6E51 B398 2C4D 8F17
0xDEADBEEF 0xCAFEBABE 0xC0DEC0DE 0xFEEDFACE
-----END PGP PUBLIC KEY BLOCK-----

0x43 79 70 68 65 72 70 75 6E 6B 73  // "Cypherpunks"
0x77 72 69 74 65 20 63 6F 64 65 2E  // "write code."
01000111 01101001 01110010 01101100 01110011  // "Girls"
01101110 01100101 01100101 01100100  // "need"
01101101 01101111 01100100 01100101 01101101 01110011  // "modems"

Fingerprint: 4F2A 8D91 C3E7 0B56 1DA8  9F74 2E60 B5C3 7A19 D4F2

-----BEGIN PGP SIGNATURE-----
iQEzBAABCAAdFiEEKdq5lJvP8Y2f
mJ3K4bWxRtOzMHEFAmJ0d3UACgkQ
4bWxRtOzMHH8Lwf+N2q5pV8mKr6Z
=St.Jude
-----END PGP SIGNATURE-----

0x4A 75 64 65 20 4D 69 6C 68 6F 6E  // "Jude Milhon"
0x53 74 2E 20 4A 75 64 65  // "St. Jude"
01010000 01110010 01101001 01110110 01100001 01100011 01111001  // "Privacy"
01101001 01110011 00100000 01101110 01101111 01110100  // "is not"
01110011 01100101 01100011 01110010 01100101 01100011 01111001  // "secrecy"

pub  4096R/A5B2F168 2024-02-15
     Key fingerprint = 7A3B 89F2 C4E1 D078 5B6A
uid  Jude Milhon (St. Jude) <stjude@cypherpunk.org>
sub  4096R/2C4D8F17 2024-02-15

0xFF 0x00 0xBE 0xEF 0xCA 0xFE 0xBA 0xBE 0xDE 0xAD
01001000 01100001 01100011 01101011  // "Hack"
01110100 01101000 01100101  // "the"
01110000 01101100 01100001 01101110 01100101 01110100  // "planet"

0x49 27 6D 20 61 20 66 75 74 75 72 65 2D 68 61 63 6B 65 72  // "I'm a future-hacker"
01000111 01101001 01110110 01100101  // "Give"
01110101 01110011  // "us"
01100010 01100001 01101110 01100100 01110111 01101001 01100100 01110100 01101000  // "bandwidth"

-----BEGIN PGP PUBLIC KEY BLOCK-----
9D24 F7A0 6E51 B398  2C4D 8F17 0A83 E5C2
B7F1 4A28 D093 6E5C  1FA7 90B4 3D82 C6E9
mQENBGJ0d3UBCAC8pK3L2f7a9Xz5Q
E92D 4A7F 1B83 C605  hash: SHA512
Trust: ultimate

0x63 79 70 68 65 72 70 75 6E 6B 73 20 77 72 69 74 65 20 63 6F 64 65
01100011 01111001 01110000 01101000 01100101 01110010 01110000 01110101 01101110 01101011 01110011
-----END PGP PUBLIC KEY BLOCK-----`;

export const StJudePGPWatermark = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <style>{`
      @keyframes sj-scroll {
        0% { transform: translateY(0) rotate(-5deg); }
        100% { transform: translateY(-50%) rotate(-5deg); }
      }
    `}</style>
    <div style={{
      position: 'absolute',
      top: '-20%',
      left: '-5%',
      right: '-5%',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 11,
      lineHeight: '1.8em',
      color: '#50c878',
      opacity: 0.14,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      animation: 'sj-scroll 120s linear infinite',
      userSelect: 'none',
    }}>
      {`${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}\n\n${PGP_BLOCK}`}
    </div>
  </div>
);

// Quotes — citations iconiques de Jude Milhon
// Chaque citation change de position à chaque cycle (fade out → reposition → fade in)

const POSITIONS = [
  { top: '6%', left: '5%' },   { top: '8%', left: '48%' },   { top: '12%', left: '25%' },
  { top: '18%', left: '3%' },  { top: '20%', left: '52%' },  { top: '26%', left: '8%' },
  { top: '30%', left: '45%' }, { top: '36%', left: '4%' },   { top: '40%', left: '50%' },
  { top: '46%', left: '3%' },  { top: '50%', left: '48%' },  { top: '56%', left: '6%' },
  { top: '60%', left: '46%' }, { top: '66%', left: '4%' },   { top: '70%', left: '52%' },
  { top: '76%', left: '5%' },  { top: '80%', left: '48%' },  { top: '86%', left: '6%' },
  { top: '90%', left: '44%' }, { top: '14%', left: '58%' },  { top: '34%', left: '56%' },
];

const QUOTE_TEXTS = [
  { text: '"Cypherpunks write code."', size: 26 },
  { text: '"Girls need modems!"', size: 23 },
  { text: '"Privacy is not secrecy."', size: 24 },
  { text: '"Hacking is the clever\ncircumvention of imposed limits."', size: 18 },
  { text: '"I\'m a future-hacker;\nI\'m trying to get root access\nto the future."', size: 17 },
  { text: '"Give us bandwidth or kill us!"', size: 20 },
  { text: '"You guys are just\na bunch of cypherpunks."', size: 16 },
  // hex, binaire, octal nerd
  { text: '0x48 61 63 6B 20 74 68 65\n20 70 6C 61 6E 65 74', size: 11, mono: true },
  { text: '01001000 01100001 01100011\n01101011 00100000 01110100\n01101000 01100101 00100000\n01110000 01101100 01100001\n01101110 01100101 01110100', size: 10, mono: true },
  { text: '0x47 69 72 6C 73 20 6E 65\n65 64 20 6D 6F 64 65 6D\n73 21', size: 10, mono: true },
  // "cypherpunk" en hex, binaire, octal
  { text: '0x63 79 70 68 65 72\n70 75 6E 6B', size: 12, mono: true },
  { text: '01100011 01111001 01110000\n01101000 01100101 01110010\n01110000 01110101 01101110\n01101011', size: 10, mono: true },
  { text: '0o143 171 160 150\n145 162 160 165 156 153', size: 11, mono: true },
];

// Single floating quote — manages its own fade + reposition cycle
const FloatingQuote = ({ text, size, mono, index }) => {
  const [pos, setPos] = useState(POSITIONS[(index * 7 + 3) % POSITIONS.length]);
  const [visible, setVisible] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const pick = () => POSITIONS[Math.floor(Math.random() * POSITIONS.length)];

    (async () => {
      await delay(index * 2500); // stagger start
      while (mounted.current) {
        setVisible(true);
        await delay(8000);          // hold visible
        if (!mounted.current) break;
        setVisible(false);
        await delay(1500);          // fade out transition
        if (!mounted.current) break;
        setPos(pick());             // reposition while invisible
        await delay(1500);          // pause before next
      }
    })();

    return () => { mounted.current = false; };
  }, [index]);

  const targetOpacity = mono ? 0.45 : 0.92;

  return (
    <div style={{
      position: 'absolute',
      top: pos.top,
      left: pos.left,
      transition: 'opacity 1.5s ease-in-out',
      opacity: visible ? targetOpacity : 0,
      fontFamily: mono ? '"Courier New", Courier, monospace' : 'Georgia, "Times New Roman", serif',
      fontStyle: mono ? 'normal' : 'italic',
      fontSize: size,
      color: '#50c878',
      maxWidth: '42vw',
      userSelect: 'none',
      letterSpacing: mono ? '0.05em' : '0.02em',
      whiteSpace: 'pre-line',
      textShadow: mono ? 'none' : '0 0 20px rgba(80,200,120,0.3)',
    }}>
      {text}
    </div>
  );
};

export const StJudeQuotes = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
    {QUOTE_TEXTS.map((q, i) => (
      <FloatingQuote key={i} index={i} text={q.text} size={q.size} mono={q.mono} />
    ))}
  </div>
);
