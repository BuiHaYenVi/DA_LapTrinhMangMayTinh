/**
 * Bộ Sticker động (Animated) & tĩnh (Static) phong cách Discord
 * Tích hợp đồ họa SVG hoạt họa mượt mà, hỗ trợ 100% offline không cần tải ảnh ngoài.
 */

export interface StickerItem {
  id: string;
  name: string;
  label?: string;
  type: 'animated' | 'static';
  pack: string;
  url: string;
  emoji: string;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// ==========================================
// 1. NHÓM STICKER ĐỘNG (ANIMATED STICKERS)
// ==========================================

const catDanceSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes vibingCat {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-12px) rotate(6deg) scale(1.05); }
    }
    @keyframes earMove {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.8); }
    }
    .cat-head { animation: vibingCat 0.45s infinite ease-in-out; transform-origin: 70px 90px; }
    .cat-ear { animation: earMove 0.45s infinite ease-in-out; }
  </style>
  <g class="cat-head">
    <!-- Tai mèo -->
    <polygon class="cat-ear" points="40,30 20,65 55,55" fill="#f43f5e" stroke="#881337" stroke-width="3" stroke-linejoin="round"/>
    <polygon class="cat-ear" points="100,30 85,55 120,65" fill="#f43f5e" stroke="#881337" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="42,36 30,60 52,53" fill="#ffe4e6"/>
    <polygon points="98,36 88,53 110,60" fill="#ffe4e6"/>
    <!-- Đầu mèo -->
    <ellipse cx="70" cy="72" rx="42" ry="34" fill="#ffffff" stroke="#1e293b" stroke-width="4"/>
    <!-- Mắt híp cười tít -->
    <path d="M48,68 Q56,60 64,68" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M76,68 Q84,60 92,68" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Mũi & miệng -->
    <polygon points="70,74 66,78 74,78" fill="#f43f5e"/>
    <path d="M64,80 Q70,86 76,80" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Má hồng -->
    <ellipse cx="44" cy="76" rx="7" ry="4" fill="#fda4af" opacity="0.8"/>
    <ellipse cx="96" cy="76" rx="7" ry="4" fill="#fda4af" opacity="0.8"/>
    <!-- Nốt nhạc quẩy -->
    <text x="18" y="35" font-size="20" fill="#ec4899">🎵</text>
    <text x="106" y="42" font-size="22" fill="#8b5cf6">🎶</text>
  </g>
</svg>
`);

const wumpusWaveSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes waveHand {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(32deg); }
    }
    @keyframes bounceBody {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .wumpus-arm { animation: waveHand 0.4s infinite ease-in-out; transform-origin: 92px 70px; }
    .wumpus-body { animation: bounceBody 0.6s infinite ease-in-out; }
  </style>
  <g class="wumpus-body">
    <!-- Thân Wumpus Discord -->
    <ellipse cx="64" cy="78" rx="36" ry="34" fill="#5865f2" stroke="#313338" stroke-width="4"/>
    <!-- Bụng -->
    <ellipse cx="64" cy="85" rx="22" ry="18" fill="#7983f5"/>
    <!-- Mắt tròn đáng yêu -->
    <circle cx="52" cy="70" r="6" fill="#ffffff"/>
    <circle cx="53" cy="70" r="3" fill="#1e1f22"/>
    <circle cx="76" cy="70" r="6" fill="#ffffff"/>
    <circle cx="77" cy="70" r="3" fill="#1e1f22"/>
    <!-- Mũi & miệng -->
    <ellipse cx="64" cy="76" rx="4" ry="2.5" fill="#f47fff"/>
    <path d="M59,82 Q64,87 69,82" stroke="#1e1f22" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Tay trái -->
    <path d="M30,80 Q24,90 32,96" stroke="#5865f2" stroke-width="9" stroke-linecap="round" fill="none"/>
  </g>
  <!-- Tay phải vẫy chào -->
  <g class="wumpus-arm">
    <path d="M92,72 Q112,50 115,36" stroke="#5865f2" stroke-width="9" stroke-linecap="round" fill="none"/>
    <circle cx="115" cy="36" r="6" fill="#5865f2"/>
    <text x="110" y="26" font-size="16">✨</text>
  </g>
</svg>
`);

const partyParrotSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes partySpin {
      0% { transform: translateY(0) rotate(-14deg); filter: hue-rotate(0deg); }
      50% { transform: translateY(-10px) rotate(14deg) scale(1.1); filter: hue-rotate(180deg); }
      100% { transform: translateY(0) rotate(-14deg); filter: hue-rotate(360deg); }
    }
    .parrot { animation: partySpin 0.35s infinite ease-in-out; transform-origin: 70px 70px; }
  </style>
  <g class="parrot">
    <ellipse cx="65" cy="75" rx="34" ry="40" fill="#22c55e" stroke="#14532d" stroke-width="3"/>
    <circle cx="78" cy="50" r="26" fill="#ef4444"/>
    <path d="M96,44 Q120,54 98,72 Z" fill="#eab308" stroke="#713f12" stroke-width="2"/>
    <circle cx="75" cy="46" r="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
    <circle cx="77" cy="46" r="4" fill="#0f172a"/>
    <path d="M40,75 Q20,85 35,105" stroke="#3b82f6" stroke-width="10" stroke-linecap="round" fill="none"/>
    <text x="20" y="35" font-size="20">🎉</text>
    <text x="100" y="32" font-size="20">✨</text>
  </g>
</svg>
`);

const popCatSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes popCycle {
      0%, 45% { opacity: 1; }
      50%, 95% { opacity: 0; }
    }
    @keyframes popOpenCycle {
      0%, 45% { opacity: 0; }
      50%, 95% { opacity: 1; }
    }
    .pop-closed { animation: popCycle 0.32s infinite; }
    .pop-open { animation: popOpenCycle 0.32s infinite; }
  </style>
  <!-- Pop Cat Ngậm Miệng -->
  <g class="pop-closed">
    <polygon points="42,38 28,68 58,58" fill="#fed7aa"/>
    <polygon points="98,38 82,58 112,68" fill="#fed7aa"/>
    <ellipse cx="70" cy="78" rx="42" ry="36" fill="#ffedd5" stroke="#431407" stroke-width="4"/>
    <circle cx="52" cy="72" r="5" fill="#431407"/>
    <circle cx="88" cy="72" r="5" fill="#431407"/>
    <path d="M62,84 Q70,88 78,84" stroke="#431407" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Pop Cat Há Mồm To (O Mouth) -->
  <g class="pop-open">
    <polygon points="42,32 28,62 58,52" fill="#fed7aa"/>
    <polygon points="98,32 82,52 112,62" fill="#fed7aa"/>
    <ellipse cx="70" cy="74" rx="44" ry="40" fill="#ffedd5" stroke="#431407" stroke-width="4"/>
    <circle cx="50" cy="62" r="6" fill="#431407"/>
    <circle cx="90" cy="62" r="6" fill="#431407"/>
    <!-- Mồm chữ O to đùng -->
    <ellipse cx="70" cy="85" rx="20" ry="22" fill="#991b1b" stroke="#431407" stroke-width="4"/>
  </g>
</svg>
`);

const heartPulseSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes heartPump {
      0%, 100% { transform: scale(0.92); filter: drop-shadow(0 0 4px #f43f5e); }
      30% { transform: scale(1.18); filter: drop-shadow(0 0 16px #fb7185); }
      50% { transform: scale(1.02); }
      70% { transform: scale(1.15); filter: drop-shadow(0 0 12px #f43f5e); }
    }
    .heart-shape { animation: heartPump 0.75s infinite ease-in-out; transform-origin: 70px 70px; }
  </style>
  <g class="heart-shape">
    <path d="M70,116 C20,85 10,48 35,28 C52,14 65,26 70,36 C75,26 88,14 105,28 C130,48 120,85 70,116 Z" 
          fill="url(#heartGrad)" stroke="#be123c" stroke-width="3"/>
    <circle cx="48" cy="42" r="6" fill="#ffffff" opacity="0.6"/>
  </g>
  <defs>
    <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="50%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
  </defs>
</svg>
`);

const fireBurnSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes flameDance {
      0%, 100% { transform: scale(1) skewX(0deg); }
      35% { transform: scale(1.08, 0.94) skewX(4deg); }
      70% { transform: scale(0.94, 1.08) skewX(-4deg); }
    }
    .flame-outer { animation: flameDance 0.4s infinite ease-in-out; transform-origin: 70px 115px; }
  </style>
  <g class="flame-outer">
    <path d="M70,15 C85,45 115,70 115,95 C115,118 95,125 70,125 C45,125 25,118 25,95 C25,70 55,45 70,15 Z" fill="#ea580c"/>
    <path d="M70,40 C80,60 100,80 100,98 C100,114 86,120 70,120 C54,120 40,114 40,98 C40,80 60,60 70,40 Z" fill="#f97316"/>
    <path d="M70,65 C76,78 88,90 88,102 C88,112 80,116 70,116 C60,116 52,112 52,102 C52,90 64,78 70,65 Z" fill="#facc15"/>
    <ellipse cx="70" cy="100" rx="10" ry="12" fill="#ffffff" opacity="0.9"/>
  </g>
</svg>
`);

const pepeDanceSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes pepeBounce {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-10px) rotate(6deg); }
    }
    .pepe-wrap { animation: pepeBounce 0.45s infinite ease-in-out; transform-origin: 70px 80px; }
  </style>
  <g class="pepe-wrap">
    <ellipse cx="70" cy="75" rx="46" ry="36" fill="#84cc16" stroke="#365314" stroke-width="4"/>
    <!-- Mắt to ếch Pepe -->
    <ellipse cx="50" cy="52" rx="14" ry="16" fill="#ffffff" stroke="#365314" stroke-width="3"/>
    <circle cx="52" cy="54" r="5" fill="#1e293b"/>
    <ellipse cx="88" cy="52" rx="14" ry="16" fill="#ffffff" stroke="#365314" stroke-width="3"/>
    <circle cx="86" cy="54" r="5" fill="#1e293b"/>
    <!-- Môi cong cười tươi -->
    <path d="M36,82 C55,102 85,102 104,82" stroke="#b91c1c" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M38,82 C55,98 85,98 102,82" stroke="#ea580c" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Nón tiệc -->
    <polygon points="70,12 55,42 85,42" fill="#a855f7" stroke="#581c87" stroke-width="2"/>
    <text x="100" y="40" font-size="18">🎉</text>
  </g>
</svg>
`);

const duckDanceSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes duckWaddle {
      0%, 100% { transform: rotate(-10deg); }
      50% { transform: rotate(10deg); }
    }
    .duck-wrap { animation: duckWaddle 0.35s infinite ease-in-out; transform-origin: 70px 105px; }
  </style>
  <g class="duck-wrap">
    <!-- Thân vịt vàng -->
    <ellipse cx="70" cy="80" rx="36" ry="30" fill="#facc15" stroke="#854d0e" stroke-width="3"/>
    <circle cx="70" cy="50" r="22" fill="#facc15" stroke="#854d0e" stroke-width="3"/>
    <!-- Mắt híp vui vẻ -->
    <path d="M58,48 Q64,42 70,48" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Mỏ vịt -->
    <ellipse cx="78" cy="55" rx="12" ry="6" fill="#f97316" stroke="#9a3412" stroke-width="2"/>
    <!-- Cánh -->
    <path d="M42,80 Q30,70 45,64" stroke="#eab308" stroke-width="6" stroke-linecap="round" fill="none"/>
    <!-- Chân vịt -->
    <path d="M60,110 L55,124 M78,110 L83,124" stroke="#ea580c" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>
`);

const cryRiverSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes tearFlow {
      0% { transform: translateY(0) scaleY(0.7); opacity: 0.9; }
      100% { transform: translateY(28px) scaleY(1.4); opacity: 0.1; }
    }
    .tear-stream-l { animation: tearFlow 0.5s infinite linear; }
    .tear-stream-r { animation: tearFlow 0.5s infinite linear 0.25s; }
  </style>
  <circle cx="70" cy="65" r="44" fill="#fde047" stroke="#854d0e" stroke-width="4"/>
  <!-- Mắt khóc nhắm nghiền -->
  <path d="M44,56 L58,62 L44,68" stroke="#713f12" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M96,56 L82,62 L96,68" stroke="#713f12" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Miệng mếu khóc to -->
  <path d="M52,86 Q70,72 88,86 Q70,105 52,86 Z" fill="#991b1b" stroke="#713f12" stroke-width="3"/>
  <!-- Dòng nước mắt tuôn rơi -->
  <g class="tear-stream-l">
    <ellipse cx="48" cy="74" rx="5" ry="12" fill="#0284c7"/>
  </g>
  <g class="tear-stream-r">
    <ellipse cx="92" cy="74" rx="5" ry="12" fill="#0284c7"/>
  </g>
</svg>
`);

const thinkingSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes spinWheel { 100% { transform: rotate(360deg); } }
    .loading-wheel { animation: spinWheel 1.5s infinite linear; transform-origin: 95px 35px; }
  </style>
  <circle cx="65" cy="75" r="42" fill="#fde047" stroke="#854d0e" stroke-width="4"/>
  <!-- Mắt suy ngẫm ngước lên -->
  <circle cx="50" cy="65" r="6" fill="#1e293b"/>
  <circle cx="76" cy="65" r="6" fill="#1e293b"/>
  <!-- Tay chống cằm suy nghĩ -->
  <path d="M46,92 Q65,85 78,94" stroke="#713f12" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M72,98 Q82,108 92,94" stroke="#854d0e" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Bánh răng xoay tròn suy nghĩ -->
  <g class="loading-wheel">
    <circle cx="95" cy="35" r="14" fill="none" stroke="#6366f1" stroke-width="4" stroke-dasharray="14 6"/>
    <text x="90" y="39" font-size="12" fill="#6366f1">🧠</text>
  </g>
</svg>
`);

const dogeBonkSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes bonkSwing {
      0%, 100% { transform: rotate(0deg); }
      35% { transform: rotate(-38deg); }
      55% { transform: rotate(18deg); }
    }
    .bat-swing { animation: bonkSwing 0.65s infinite ease-in-out; transform-origin: 35px 45px; }
  </style>
  <!-- Đầu Doge -->
  <ellipse cx="80" cy="75" rx="38" ry="34" fill="#fbbf24" stroke="#78350f" stroke-width="3"/>
  <polygon points="58,45 52,22 72,36" fill="#d97706"/>
  <polygon points="102,45 116,24 94,36" fill="#d97706"/>
  <circle cx="70" cy="68" r="4" fill="#1e293b"/>
  <circle cx="96" cy="68" r="4" fill="#1e293b"/>
  <polygon points="84,76 80,82 88,82" fill="#1e293b"/>
  <text x="88" y="42" font-size="14" font-weight="bold" fill="#ef4444">BONK!</text>
  <!-- Gậy bóng chày gõ đầu -->
  <g class="bat-swing">
    <rect x="25" y="38" width="55" height="10" rx="5" fill="#a16207" stroke="#451a03" stroke-width="2"/>
  </g>
</svg>
`);

const capooLoveSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <style>
    @keyframes heartToss {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.06); }
    }
    @keyframes floatHeart {
      0% { transform: translateY(0) scale(0.8); opacity: 0.3; }
      50% { transform: translateY(-16px) scale(1.2); opacity: 1; }
      100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
    }
    .capoo-body { animation: heartToss 0.5s infinite ease-in-out; transform-origin: 70px 80px; }
    .floating-heart { animation: floatHeart 0.9s infinite ease-out; transform-origin: 70px 40px; }
  </style>
  <g class="capoo-body">
    <!-- Mèo Capoo xanh dương -->
    <ellipse cx="70" cy="78" rx="42" ry="32" fill="#38bdf8" stroke="#0369a1" stroke-width="4"/>
    <polygon points="40,50 32,32 50,42" fill="#0284c7"/>
    <polygon points="100,50 108,32 90,42" fill="#0284c7"/>
    <circle cx="52" cy="72" r="5" fill="#082f49"/>
    <circle cx="88" cy="72" r="5" fill="#082f49"/>
    <ellipse cx="70" cy="82" rx="14" ry="10" fill="#f43f5e"/>
    <!-- Ôm tim đỏ -->
    <path d="M70,95 C55,80 50,68 60,60 C66,54 70,60 70,64 C70,60 74,54 80,60 C90,68 85,80 70,95 Z" fill="#e11d48"/>
  </g>
  <g class="floating-heart">
    <text x="60" y="32" font-size="22">💖</text>
  </g>
</svg>
`);

// ==========================================
// 2. NHÓM STICKER TĨNH (STATIC STICKERS)
// ==========================================

const byeCatSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <!-- Mèo HaDoanTV vẫy tay Bái Bai -->
  <polygon points="40,30 20,60 55,52" fill="#334155" stroke="#0f172a" stroke-width="3"/>
  <polygon points="100,30 85,52 120,60" fill="#334155" stroke="#0f172a" stroke-width="3"/>
  <ellipse cx="70" cy="72" rx="44" ry="36" fill="#f8fafc" stroke="#0f172a" stroke-width="4"/>
  <!-- Mảng màu xám mèo mướp -->
  <path d="M50,40 Q70,48 90,40 Q80,56 70,56 Q60,56 50,40 Z" fill="#334155"/>
  <!-- Mắt tròn long lanh -->
  <circle cx="50" cy="68" r="6" fill="#0f172a"/>
  <circle cx="52" cy="66" r="2" fill="#ffffff"/>
  <circle cx="86" cy="68" r="6" fill="#0f172a"/>
  <circle cx="88" cy="66" r="2" fill="#ffffff"/>
  <!-- Miệng chữ w dễ thương -->
  <path d="M62,78 Q66,84 70,80 Q74,84 78,78" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Tay vẫy Bái Bai -->
  <ellipse cx="112" cy="50" rx="9" ry="14" fill="#f8fafc" stroke="#0f172a" stroke-width="3" transform="rotate(25 112 50)"/>
  <rect x="88" y="18" width="46" height="22" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="94" y="34" font-size="11" font-weight="bold" fill="#38bdf8">Bye 👋</text>
</svg>
`);

const okHandSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#10b981" opacity="0.15"/>
  <text x="32" y="88" font-size="64">👌</text>
  <rect x="25" y="100" width="90" height="22" rx="11" fill="#10b981"/>
  <text x="36" y="115" font-size="11" font-weight="bold" fill="#ffffff">OKELA LUÔN</text>
</svg>
`);

const thumbsUpSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#3b82f6" opacity="0.15"/>
  <text x="32" y="86" font-size="64">👍</text>
  <rect x="25" y="100" width="90" height="22" rx="11" fill="#3b82f6"/>
  <text x="38" y="115" font-size="11" font-weight="bold" fill="#ffffff">TUYỆT VỜI</text>
</svg>
`);

const trophyGgSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#f59e0b" opacity="0.15"/>
  <text x="34" y="84" font-size="62">🏆</text>
  <rect x="22" y="98" width="96" height="22" rx="11" fill="#f59e0b"/>
  <text x="31" y="113" font-size="11" font-weight="bold" fill="#ffffff">GOOD GAME (GG)</text>
</svg>
`);

const angryCatSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <ellipse cx="70" cy="75" rx="42" ry="34" fill="#fca5a5" stroke="#991b1b" stroke-width="4"/>
  <polygon points="38,36 24,65 52,55" fill="#ef4444"/>
  <polygon points="102,36 88,55 116,65" fill="#ef4444"/>
  <!-- Mắt xếch giận dữ -->
  <line x1="42" y1="62" x2="60" y2="70" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>
  <line x1="98" y1="62" x2="80" y2="70" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>
  <!-- Dấu tức giận anime -->
  <text x="96" y="38" font-size="20" fill="#dc2626">💢</text>
  <!-- Miệng cong hờn dỗi -->
  <path d="M58,86 Q70,78 82,86" stroke="#7f1d1d" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="35" y="102" width="70" height="20" rx="10" fill="#dc2626"/>
  <text x="44" y="116" font-size="11" font-weight="bold" fill="#ffffff">DỖI RỒI!</text>
</svg>
`);

const sleepyCatSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="75" r="42" fill="#c7d2fe" stroke="#3730a3" stroke-width="3"/>
  <!-- Mắt nhắm ngủ -->
  <path d="M48,72 Q56,78 64,72" stroke="#312e81" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M76,72 Q84,78 92,72" stroke="#312e81" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Bóng ngủ Zzz -->
  <ellipse cx="88" cy="85" rx="10" ry="10" fill="#818cf8" opacity="0.6"/>
  <text x="98" y="44" font-size="22" font-weight="bold" fill="#4f46e5">Zzz</text>
  <rect x="30" y="104" width="80" height="20" rx="10" fill="#4f46e5"/>
  <text x="40" y="118" font-size="11" font-weight="bold" fill="#ffffff">ĐI NGỦ ĐÂY</text>
</svg>
`);

const coffeeChillSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#78350f" opacity="0.15"/>
  <text x="36" y="82" font-size="62">☕</text>
  <rect x="24" y="98" width="92" height="22" rx="11" fill="#78350f"/>
  <text x="32" y="113" font-size="11" font-weight="bold" fill="#ffffff">LÀM LY CÀ PHÊ</text>
</svg>
`);

const devCodingSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#2563eb" opacity="0.15"/>
  <text x="35" y="82" font-size="62">💻</text>
  <rect x="25" y="98" width="90" height="22" rx="11" fill="#2563eb"/>
  <text x="34" y="113" font-size="11" font-weight="bold" fill="#ffffff">ĐANG FIX BUG...</text>
</svg>
`);

const clappingSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#f59e0b" opacity="0.15"/>
  <text x="34" y="84" font-size="62">👏</text>
  <rect x="30" y="98" width="80" height="22" rx="11" fill="#f59e0b"/>
  <text x="40" y="113" font-size="11" font-weight="bold" fill="#ffffff">VỖ TAY NÈ</text>
</svg>
`);

const coolShibaSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <ellipse cx="70" cy="75" rx="42" ry="36" fill="#f59e0b" stroke="#78350f" stroke-width="3"/>
  <polygon points="40,42 32,20 54,34" fill="#d97706"/>
  <polygon points="100,42 108,20 86,34" fill="#d97706"/>
  <!-- Kính râm cực ngầu -->
  <rect x="38" y="58" width="28" height="18" rx="4" fill="#0f172a"/>
  <rect x="74" y="58" width="28" height="18" rx="4" fill="#0f172a"/>
  <line x1="66" y1="65" x2="74" y2="65" stroke="#0f172a" stroke-width="4"/>
  <!-- Nụ cười nhếch mép -->
  <path d="M64,88 Q76,96 86,88" stroke="#78350f" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="32" y="104" width="76" height="20" rx="10" fill="#0f172a"/>
  <text x="45" y="118" font-size="11" font-weight="bold" fill="#ffffff">NGẦU ĐÉC</text>
</svg>
`);

const shockedCatSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <ellipse cx="70" cy="75" rx="44" ry="36" fill="#fef08a" stroke="#854d0e" stroke-width="4"/>
  <!-- Mắt tròn xoe ngơ ngác -->
  <circle cx="50" cy="65" r="10" fill="#ffffff" stroke="#854d0e" stroke-width="3"/>
  <circle cx="50" cy="65" r="4" fill="#0f172a"/>
  <circle cx="90" cy="65" r="10" fill="#ffffff" stroke="#854d0e" stroke-width="3"/>
  <circle cx="90" cy="65" r="4" fill="#0f172a"/>
  <!-- Mồm há hốc chữ O -->
  <ellipse cx="70" cy="88" rx="12" ry="14" fill="#881337" stroke="#854d0e" stroke-width="3"/>
  <text x="96" y="38" font-size="20">⚡</text>
  <rect x="30" y="106" width="80" height="20" rx="10" fill="#eab308"/>
  <text x="38" y="120" font-size="11" font-weight="bold" fill="#713f12">ỦA GÌ DỢ?</text>
</svg>
`);

const loveHeartSvg = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <circle cx="70" cy="70" r="54" fill="#ec4899" opacity="0.15"/>
  <text x="32" y="85" font-size="64">💖</text>
  <rect x="25" y="100" width="90" height="22" rx="11" fill="#ec4899"/>
  <text x="35" y="115" font-size="11" font-weight="bold" fill="#ffffff">YÊU THƯƠNG</text>
</svg>
`);

// ==========================================
// TOÀN BỘ DANH SÁCH STICKER ĐỘNG & TĨNH
// ==========================================

export const STICKER_LIST: StickerItem[] = [
  // 12 Sticker Động
  { id: 'cat_dance', name: 'Mèo Quẩy Nhạc', type: 'animated', pack: 'Mèo Béo', url: catDanceSvg, emoji: '🐱' },
  { id: 'wumpus_wave', name: 'Wumpus Chào Bạn', type: 'animated', pack: 'Discord Wumpus', url: wumpusWaveSvg, emoji: '👋' },
  { id: 'party_parrot', name: 'Vẹt Quẩy Party', type: 'animated', pack: 'Party Pack', url: partyParrotSvg, emoji: '🎉' },
  { id: 'pop_cat', name: 'Pop Cat Há Mồm', type: 'animated', pack: 'Meme Huyền Thoại', url: popCatSvg, emoji: '😺' },
  { id: 'capoo_love', name: 'Capoo Bắn Tim', type: 'animated', pack: 'Capoo Xanh', url: capooLoveSvg, emoji: '💖' },
  { id: 'heart_pulse', name: 'Tim Đập Rộn Ràng', type: 'animated', pack: 'Cảm Xúc', url: heartPulseSvg, emoji: '💓' },
  { id: 'fire_burn', name: 'Quá Cháy Luôn', type: 'animated', pack: 'Cảm Xúc', url: fireBurnSvg, emoji: '🔥' },
  { id: 'pepe_dance', name: 'Pepe Nhảy Vui', type: 'animated', pack: 'Pepe Frog', url: pepeDanceSvg, emoji: '🐸' },
  { id: 'duck_dance', name: 'Vịt Lắc Lư', type: 'animated', pack: 'Hài Hước', url: duckDanceSvg, emoji: '🦆' },
  { id: 'cry_river', name: 'Khóc Một Dòng Sông', type: 'animated', pack: 'Cảm Xúc', url: cryRiverSvg, emoji: '😭' },
  { id: 'thinking_brain', name: 'Đang Tải Não...', type: 'animated', pack: 'Hài Hước', url: thinkingSvg, emoji: '🧠' },
  { id: 'doge_bonk', name: 'Doge Bonk!', type: 'animated', pack: 'Meme Huyền Thoại', url: dogeBonkSvg, emoji: '🐕' },

  // 12 Sticker Tĩnh
  { id: 'bye_cat', name: 'Bái Bai Tạm Biệt', type: 'static', pack: 'HaDoanTV Server', url: byeCatSvg, emoji: '🐾' },
  { id: 'ok_deal', name: 'Okela Chốt Đơn', type: 'static', pack: 'Công Việc', url: okHandSvg, emoji: '👌' },
  { id: 'thumbs_up', name: 'Tuyệt Vời 10 Điểm', type: 'static', pack: 'Cảm Xúc', url: thumbsUpSvg, emoji: '👍' },
  { id: 'trophy_gg', name: 'Good Game (GG)', type: 'static', pack: 'Game Thủ', url: trophyGgSvg, emoji: '🏆' },
  { id: 'angry_cat', name: 'Dỗi Rồi Nghỉ Chơi', type: 'static', pack: 'Mèo Béo', url: angryCatSvg, emoji: '😾' },
  { id: 'sleepy_cat', name: 'Khò Khò Đi Ngủ', type: 'static', pack: 'Mèo Béo', url: sleepyCatSvg, emoji: '😴' },
  { id: 'coffee_chill', name: 'Làm Ly Cà Phê', type: 'static', pack: 'Thư Giãn', url: coffeeChillSvg, emoji: '☕' },
  { id: 'dev_coding', name: 'Đang Fix Bug', type: 'static', pack: 'Công Việc', url: devCodingSvg, emoji: '💻' },
  { id: 'clapping_applause', name: 'Vỗ Tay Tán Thưởng', type: 'static', pack: 'Cảm Xúc', url: clappingSvg, emoji: '👏' },
  { id: 'cool_shiba', name: 'Shiba Ngầu Đéc', type: 'static', pack: 'Meme Huyền Thoại', url: coolShibaSvg, emoji: '😎' },
  { id: 'shocked_cat', name: 'Ủa Gì Dợ?', type: 'static', pack: 'Meme Huyền Thoại', url: shockedCatSvg, emoji: '😲' },
  { id: 'love_heart', name: 'Thả Tim Yêu Thương', type: 'static', pack: 'Cảm Xúc', url: loveHeartSvg, emoji: '💕' }
];

// Bản đồ tương thích ngược cho các sticker cũ
const LEGACY_STICKER_MAP: Record<string, string> = {
  wave: 'wumpus_wave',
  party: 'party_parrot',
  love: 'capoo_love',
  lol: 'pepe_dance',
  gg: 'trophy_gg',
  fire: 'fire_burn',
  ok: 'ok_deal',
  coding: 'dev_coding',
  coffee: 'coffee_chill',
  cry: 'cry_river',
  sleep: 'sleepy_cat',
  rocket: 'pop_cat'
};

export function formatStickerToken(sticker: StickerItem): string {
  return `[STICKER:${sticker.id}|${sticker.name}|${sticker.type}]`;
}

export function parseStickerToken(content: string): StickerItem | null {
  if (!content) return null;
  const trimmed = content.trim();
  const match = /^\[STICKER:([a-z0-9_-]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]$/i.exec(trimmed);
  if (!match) return null;

  const rawId = match[1];
  const mappedId = LEGACY_STICKER_MAP[rawId] || rawId;
  const found = STICKER_LIST.find(s => s.id === mappedId) || STICKER_LIST.find(s => s.id === rawId);
  if (found) {
    return {
      ...found,
      label: found.label || found.name
    };
  }

  // Fallback nếu không tìm thấy ID cụ thể
  const fallbackName = match[2] || 'Nhãn dán';
  return {
    id: rawId,
    name: fallbackName,
    label: fallbackName,
    type: (match[3] === 'animated' ? 'animated' : 'static'),
    pack: 'Discord Mini',
    url: catDanceSvg,
    emoji: '✨'
  };
}

const STICKER_TOKEN_REGEX = /\[STICKER:([a-z0-9_-]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]/i;

/**
 * Tách nội dung tin nhắn thành text và sticker (nếu có)
 * Giúp hiển thị text và sticker thành các khối độc lập riêng biệt, không bị dính chữ hay đè layout
 */
export function extractStickerFromContent(content: string): { text: string; sticker: StickerItem | null } {
  if (!content) return { text: '', sticker: null };
  const trimmed = content.trim();
  const directSticker = parseStickerToken(trimmed);
  if (directSticker) {
    return { text: '', sticker: directSticker };
  }

  const match = STICKER_TOKEN_REGEX.exec(content);
  if (!match) {
    return { text: content, sticker: null };
  }

  const sticker = parseStickerToken(match[0]);
  const text = content.replace(match[0], '').trim();
  return { text, sticker };
}

