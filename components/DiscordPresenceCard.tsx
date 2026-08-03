"use client";

import { useEffect, useRef } from "react";

interface Props {
  discordUserId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
}

const STATUS_CLS = ["online", "idle", "dnd"];

const ACTIVITY_ICONS: Record<number, string> = {
  0: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  5: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
};

const DISCORD_FLAG_BITS: Record<string, number> = {
  Staff: 1 << 0,
  Partner: 1 << 1,
  Hypesquad: 1 << 2,
  BugHunterLevel1: 1 << 3,
  HypeSquadOnlineHouse1: 1 << 6,
  HypeSquadOnlineHouse2: 1 << 7,
  HypeSquadOnlineHouse3: 1 << 8,
  PremiumEarlySupporter: 1 << 9,
  BugHunterLevel2: 1 << 14,
  VerifiedDeveloper: 1 << 17,
  CertifiedModerator: 1 << 18,
  ActiveDeveloper: 1 << 22,
};

const DISCORD_BADGES: { key: string; label: string }[] = [
  { key: "nitro", label: "Nitro Subscriber" },
  { key: "server_booster", label: "Server Booster" },
  { key: "Staff", label: "Discord Staff" },
  { key: "Partner", label: "Partnered Server Owner" },
  { key: "Hypesquad", label: "HypeSquad Events" },
  { key: "HypeSquadOnlineHouse1", label: "HypeSquad Bravery" },
  { key: "HypeSquadOnlineHouse2", label: "HypeSquad Brilliance" },
  { key: "HypeSquadOnlineHouse3", label: "HypeSquad Balance" },
  { key: "BugHunterLevel1", label: "Bug Hunter" },
  { key: "BugHunterLevel2", label: "Bug Hunter Level 2" },
  { key: "PremiumEarlySupporter", label: "Early Supporter" },
  { key: "VerifiedDeveloper", label: "Early Verified Bot Developer" },
  { key: "CertifiedModerator", label: "Discord Certified Moderator" },
  { key: "ActiveDeveloper", label: "Active Developer" },
];

const svg = (content: string) => "data:image/svg+xml;utf8," + encodeURIComponent(content);

const BADGE_IMG: Record<string, string> = {
  Staff: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M17.5 7.5a4 4 0 0 0-5.56-.37L9.5 9.5 7 7l-1.5 1.5 2.5 2.5-4 4a2 2 0 1 0 2.83 2.83l4-4 2.5 2.5L14.83 14.5l-2.5-2.5 2.37-2.44A4 4 0 0 0 17.5 7.5z" fill="white"/></svg>`),
  Partner: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M10 8.5c0-1.93 1.57-3.5 3.5-3.5S17 6.57 17 8.5c0 .98-.4 1.86-1.04 2.5H15a3 3 0 0 1 0 6H9a3 3 0 0 1 0-6h.04A3.48 3.48 0 0 1 8 8.5C8 6.57 9.57 5 11.5 5S13 6.07 13 7" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 12.5 12 16l3.5-3.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`),
  Hypesquad: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cg%20fill%3D%22%23fbb848%22%3E%3Cpath%20d%3D%22m21.5912%206.84349-7.8694%205.16551c-.1351.088-.2444.2103-.317.3543l-1.1997%202.4056c-.0174.0399-.0461.0739-.0825.0977-.0364.0239-.079.0366-.1226.0366s-.0862-.0127-.1226-.0366c-.0364-.0238-.0651-.0578-.0825-.0977l-1.1997-2.4056c-.0726-.144-.1819-.2663-.317-.3543l-7.86944-5.16551c-.03957-.04698-.09618-.07632-.15738-.08157-.0612-.00524-.12198.01404-.16896.0536-.04698.03957-.07633.09618-.08157.15738-.00525.0612.01403.12198.0536.16896l3.28825%206.39624c.01598.0335.02385.0703.02297.1074s-.01049.0734-.02804.1061c-.01756.0327-.04257.0608-.07301.082-.03043.0212-.06544.035-.10219.0402h-1.97668c-.04881-.0005-.0965.0146-.13617.043-.03967.0285-.06926.0688-.08449.1152s-.0153.0964-.00022.1428c.01509.0464.04455.0869.08413.1154l8.8142%206.3155c.0403.0275.088.0422.1368.0422s.0965-.0147.1368-.0422l8.8142-6.3155c.0396-.0285.069-.069.0841-.1154s.015-.0964-.0002-.1428-.0448-.0867-.0845-.1152c-.0396-.0284-.0873-.0435-.1362-.043h-1.9766c-.0389-.0015-.0769-.0126-.1105-.0323-.0335-.0197-.0617-.0474-.082-.0806s-.0321-.071-.0343-.1098c-.0022-.0389.0052-.0777.0216-.113l3.3132-6.39624c.0395-.04698.0588-.10776.0536-.16896-.0053-.0612-.0346-.11781-.0816-.15738-.047-.03956-.1078-.05884-.169-.0536-.0612.00525-.1178.03459-.1574.08157z%22/%3E%3Cpath%20d%3D%22m12.1741%202.10696.8081%201.64723c.0143.02721.0346.05084.0594.06913.0247.01829.0533.03078.0835.03654l1.8213.26107c.0356.00524.0691.02036.0966.04366s.0479.05383.0589.08814.0122.07102.0034.10595c-.0089.03494-.0273.06671-.0532.0917l-1.3178%201.28049c-.0213.02203-.0373.04854-.047.07758s-.0127.05988-.009.09025l.3108%201.80885c.0069.03487.0036.07096-.0094.10404-.013.03307-.0351.06174-.0639.08264-.0287.0209-.0628.03315-.0983.03532-.0354.00217-.0708-.00584-.1019-.02309l-1.6285-.85159c-.0265-.01527-.0565-.02331-.0871-.02331-.0305%200-.0605.00804-.087.02331l-1.6286.85159c-.031.01725-.0664.02526-.1019.02309-.0354-.00217-.0695-.01442-.0983-.03532-.0287-.0209-.0509-.04957-.0639-.08264-.0129-.03308-.0162-.06917-.0094-.10404l.3108-1.80885c.0038-.03037.0008-.06121-.0089-.09025s-.0258-.05555-.047-.07758l-1.31781-1.28049c-.02595-.02499-.04438-.05676-.05318-.0917-.00881-.03493-.00764-.07164.00336-.10595s.03141-.06484.05889-.08814c.02749-.0233.06095-.03842.0966-.04366l1.82124-.25485c.0303-.00576.0588-.01825.0836-.03654.0247-.01829.045-.04192.0594-.06913l.8081-1.64723c.015-.03321.0392-.06147.0696-.08149.0305-.02003.066-.03101.1025-.03166.0364-.00065.0723.00905.1035.02798.0311.01893.0563.0463.0725.07895z%22/%3E%3C/g%3E%3C/svg%3E",
  BugHunterLevel1: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#3BA55D"/><ellipse cx="12" cy="13" rx="4" ry="5" fill="white"/><ellipse cx="12" cy="9.5" rx="2.5" ry="2" fill="white"/><line x1="8" y1="10" x2="6" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="10" x2="18" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="13" x2="6" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="13" x2="18" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="16" x2="6" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="16" x2="18" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>`),
  HypeSquadOnlineHouse1: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m5.01502%204h13.97008c.1187%200%20.215.09992.215.22305v9.97865c0%20.0697-.0312.1343-.0837.1767l-6.985%205.5752c-.0389.0313-.0847.0464-.1314.0464-.0466%200-.0924-.0151-.1313-.0464l-6.985-5.5752c-.05252-.0424-.08365-.107-.08365-.1767v-9.97865c0-.12313.0963-.22305.21497-.22305zm7.82148%207.0972%204.1275-2.71296c.1039-.06863.2299.04542.1725.15644l-1.7114%203.36192c-.0403.0807.0182.1756.1079.1756h1.0246c.118%200%20.1664.1504.0706.219l-4.6267%203.3175c-.0414.0303-.0978.0303-.1402%200l-4.6267-3.3175c-.0948-.0686-.04639-.219.07059-.219h1.02356c.09076%200%20.14925-.0949.10791-.1756l-1.71132-3.36293c-.05648-.11001.06958-.22305.17345-.15543l4.12851%202.71296c.0716.0474.1291.112.1674.1887l.6293%201.2636c.0444.0888.1714.0888.2158%200l.6293-1.2636c.0383-.0767.0958-.1423.1674-.1887z%22%20fill%3D%22%239c84ef%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E",
  HypeSquadOnlineHouse2: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m12%2020c4.4183%200%208-3.5817%208-8%200-4.41828-3.5817-8-8-8-4.41828%200-8%203.58172-8%208%200%204.4183%203.58172%208%208%208zm.7921-8.275%203.6146-2.3738c.0909-.05916.2013.03974.151.136l-1.4986%202.9416c-.0354.0707.0158.1537.0944.1537h.8973c.1033%200%20.1457.1315.0618.1916l-4.0517%202.9027c-.0362.0265-.0856.0265-.1227%200l-4.05168-2.9027c-.08301-.0601-.04062-.1916.06182-.1916h.89634c.07948%200%20.1307-.083.09449-.1537l-1.49862-2.9416c-.04945-.09626.06094-.19516.1519-.136l3.61545%202.3738c.0627.0415.113.098.1465.1651l.5511%201.1057c.0389.0777.1501.0777.189%200l.551-1.1057c.0336-.0671.0839-.1245.1466-.1651z%22%20fill%3D%22%23f47b67%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E",
  HypeSquadOnlineHouse3: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m11.8622%204.05696c.076-.07595.1996-.07595.2756%200l7.8048%207.80474c.0371.0362.0574.0865.0574.1377%200%20.0513-.0212.1016-.0574.1378l-7.8048%207.8047c-.038.038-.0883.0574-.1378.0574s-.0998-.0194-.1378-.0574l-7.8048-7.8047c-.03709-.0362-.0574-.0857-.0574-.1378s.02031-.1015.0574-.1377zm.9299%208.29474%203.6146-2.37377c.0909-.05917.2013.03977.151.13597l-1.4986%202.9416c-.0354.0707.0158.1537.0944.1537h.8973c.1033%200%20.1457.1316.0618.1916l-4.0517%202.9028c-.0362.0265-.0856.0265-.1227%200l-4.05168-2.9028c-.08301-.06-.04062-.1916.06182-.1916h.89634c.07948%200%20.1307-.083.09449-.1537l-1.49862-2.9416c-.04945-.0962.06094-.19514.1519-.13597l3.61545%202.37377c.0627.0415.113.098.1465.1651l.5511%201.1057c.0389.0777.1501.0777.189%200l.551-1.1057c.0336-.0671.0839-.1245.1466-.1651z%22%20fill%3D%22%2345ddc0%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E",
  PremiumEarlySupporter: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#F1C40F"/><path d="M12 5l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 17l-5 3.4 1.9-5.8L4 11l6.1-.2z" fill="white"/></svg>`),
  BugHunterLevel2: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#F0B232"/><ellipse cx="12" cy="13" rx="4" ry="5" fill="white"/><ellipse cx="12" cy="9.5" rx="2.5" ry="2" fill="white"/><line x1="8" y1="10" x2="6" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="10" x2="18" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="13" x2="6" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="13" x2="18" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="16" x2="6" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="16" x2="18" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>`),
  VerifiedDeveloper: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`),
  CertifiedModerator: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#1ABC9C"/><path d="M12 4l7 3v5c0 4-3 7.5-7 8.5C8 19.5 5 16 5 12V7l7-3z" fill="white"/><path d="M9 12l2 2 4-4" stroke="#1ABC9C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`),
  ActiveDeveloper: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><rect x="5" y="7" width="14" height="10" rx="2" fill="none" stroke="white" stroke-width="1.5"/><path d="M8 12l2-2-2-2M12 14h4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`),
  nitro: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2212%22%20fill%3D%22%23fff%22%20r%3D%226%22/%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m2.20812%2010.124c.42636%200%20.7816-.34817.7816-.76611%200-.41793-.35524-.76615-.7816-.76615h-.42635c-.42636%200-.78177.34822-.78177.76615%200%20.41794.35541.76611.78177.76611zm16.13038%209.2643c4.0504-1.811%205.7558-6.4083%203.9083-10.23937-1.2791-2.71657-3.9793-4.31859-6.8217-4.45801h-8.02965c-.71065%200-1.20812.55735-1.20812%201.18425%200%20.69645.56859%201.18409%201.20812%201.18409h2.06067c.42635%200%20.78158.34822.78158.76616%200%20.41793-.35523.76632-.78158.76632h-5.04517c-.42635%200-.78176.34822-.78176.76615%200%20.41794.35541.76611.78176.76611h3.62404c.42635%200%20.78159.3484.78159.7664%200%20.4179-.35524.7661-.78159.7661h-2.27402c-.42636%200-.7816.3482-.7816.7662%200%20.4179.35524.7663.7816.7663h1.56336c.07112.8359.2843%201.6717.63954%202.4379%201.77654%203.8311%206.46643%205.5028%2010.37463%203.7614zm-7.2725-5.1884c-1.0318-2.2025-.0466-4.80794%202.2003-5.81933%202.2469-1.0114%204.9049-.04564%205.9366%202.15683%201.0318%202.2025.0468%204.8079-2.2003%205.8193-2.2469%201.0114-4.9048.0457-5.9366-2.1568z%22%20fill%3D%22%234f5d7f%22%20fill-rule%3D%22evenodd%22/%3E%3Cpath%20d%3D%22m16.8142%209.86662%201.4212%202.36838c.0711.1392.0711.2089%200%20.3482l-1.4212%202.3683c-.0711.1393-.2131.1393-.2842.1393h-2.7714c-.142%200-.2131-.0697-.2841-.1393l-1.4213-2.3683c-.0709-.1393-.0709-.209%200-.3482l1.4213-2.36838c.071-.13926.2132-.13926.2841-.13926h2.7714c.1422-.06971.2131%200%20.2842.13926z%22%20fill%3D%22%23c5cedd%22/%3E%3C/svg%3E",
  nitro_classic: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="nclg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7289da"/><stop offset="100%" stop-color="#4e5d94"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#nclg)"/><path d="M12 4.5 18 9l-2.2 7H8.2L6 9z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="9" x2="18" y2="9" stroke="white" stroke-width="1.2"/></svg>`),
  nitro_basic: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="nbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff73fa"/><stop offset="100%" stop-color="#c44dff"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#nbg)"/><path d="M12 4.5 18 9l-2.2 7H8.2L6 9z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="9" x2="18" y2="9" stroke="white" stroke-width="1.2"/></svg>`),
  server_booster: "data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20d%3D%22m12%204-10%2016h20zm0%205.66%204.59%207.34h-9.18z%22%20fill%3D%22%23ff6bfa%22/%3E%3Cpath%20d%3D%22m7.40991%2017%204.58999-7.34003%204.59%207.34003z%22%20fill%3D%22%23ffdef9%22/%3E%3Cpath%20d%3D%22m12%204v5.66l4.59%207.34%205.41%203z%22%20fill%3D%22%23ffb0ff%22/%3E%3C/svg%3E",
};

function escHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function DiscordPresenceCard({ discordUserId, discordUsername, discordGlobalName, discordAvatar }: Props) {
  const statusDotRef = useRef<HTMLDivElement>(null);
  const guildTagRef = useRef<HTMLDivElement>(null);
  const badgesRowRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const albumArtRef = useRef<HTMLDivElement>(null);
  const albumImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function renderBadges(data: any) {
      const el = badgesRowRef.current;
      if (!el) return;
      const badgesRowEl: HTMLDivElement = el;
      badgesRowEl.innerHTML = "";
      if (!data) return;

      const rawFlags = data.public_flags ?? data.flags_value ?? null;
      const flagsArr: string[] = Array.isArray(data.flags) ? data.flags : [];
      const premiumType = data.premium_type ?? 0;
      const hasBoost = !!data.server_booster || !!data.boosting || flagsArr.includes("server_booster");
      const hasNitro = premiumType > 0 || !!data.nitro || hasBoost || flagsArr.includes("nitro") || flagsArr.includes("PremiumEarlySupporter");

      function hasFlag(key: string) {
        if (rawFlags !== null && rawFlags !== undefined && DISCORD_FLAG_BITS[key] !== undefined) {
          return (rawFlags & DISCORD_FLAG_BITS[key]) !== 0;
        }
        return flagsArr.includes(key);
      }

      function addBadge(imgUrl: string, label: string) {
        const el = document.createElement("div");
        el.className = "dic-badge";
        el.title = label;
        const img = document.createElement("img");
        img.src = imgUrl;
        img.width = 20;
        img.height = 20;
        img.alt = label;
        img.style.imageRendering = "auto";
        el.appendChild(img);
        badgesRowEl.appendChild(el);
      }

      DISCORD_BADGES.forEach((b) => {
        let show = false;
        if (b.key === "nitro") show = hasNitro;
        else if (b.key === "server_booster") show = hasBoost;
        else show = hasFlag(b.key);
        if (!show) return;

        let imgUrl = BADGE_IMG[b.key];
        if (b.key === "nitro") {
          if (premiumType === 3) imgUrl = BADGE_IMG["nitro_basic"];
          else if (premiumType === 1) imgUrl = BADGE_IMG["nitro_classic"];
          else imgUrl = BADGE_IMG["nitro"];
        }
        if (!imgUrl) return;
        addBadge(imgUrl, b.label);
      });
    }

    function applyPresence(data: any) {
      if (!data) return;

      if (statusDotRef.current) {
        STATUS_CLS.forEach((c) => statusDotRef.current!.classList.remove(c));
        if (data.status && data.status !== "offline") statusDotRef.current.classList.add(data.status);
      }

      renderBadges(data);

      const guildTagEl = guildTagRef.current;
      if (guildTagEl) {
        const clanTag = data.guild_tag || data.clan?.tag || null;
        const clanBadgeUrl = data.guild_tag_badge_url || data.clan_badge_url || null;

        if (clanTag) {
          let inner = "";
          if (clanBadgeUrl) {
            inner += `<img src="${escHtml(clanBadgeUrl)}" width="14" height="14" alt="" style="border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`;
          } else {
            inner += `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" fill="#a8b4ff" opacity="0.9"/><path d="M9 12l2 2 4-4" stroke="#1e2240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          }
          inner += `<span>${escHtml(clanTag)}</span>`;
          guildTagEl.innerHTML = inner;
          guildTagEl.style.display = "inline-flex";
        } else {
          guildTagEl.style.display = "none";
        }
      }

      const activityEl = activityRef.current;
      if (activityEl) {
        const acts = data.activities || [];
        const act = acts.find((a: any) => a.type !== 4) || acts.find((a: any) => a.type === 4) || null;

        const albumArtEl = albumArtRef.current;
        const albumImgEl = albumImgRef.current;

        if (act) {
          const icon = ACTIVITY_ICONS[act.type] || "";
          let html = "";

          if (act.type === 2) {
            const song = act.details || act.name;
            const artist = act.state || "";
            html =
              icon +
              '<div class="dic-activity-lines">' +
              '<span class="dic-activity-main">Listening to <b>' + escHtml(song) + "</b></span>" +
              (artist ? '<span class="dic-activity-sub">by ' + escHtml(artist) + "</span>" : "") +
              "</div>";

            const imgUrl = act.assets?.largeImage;
            if (imgUrl && albumArtEl && albumImgEl) {
              albumImgEl.src = imgUrl;
              albumImgEl.onerror = () => { albumArtEl.style.display = "none"; };
              albumArtEl.style.display = "";
            } else if (albumArtEl) {
              albumArtEl.style.display = "none";
            }
          } else {
            if (albumArtEl) albumArtEl.style.display = "none";

            let text = "";
            if (act.type === 0) text = "Playing " + act.name;
            else if (act.type === 1) text = "Streaming " + act.name;
            else if (act.type === 3) text = "Watching " + act.name;
            else if (act.type === 5) text = "Competing in " + act.name;
            else text = act.name;
            if (text) html = icon + "<span>" + escHtml(text) + "</span>";
          }

          if (html) {
            activityEl.innerHTML = html;
            activityEl.style.display = "flex";
          } else {
            activityEl.style.display = "none";
          }
        } else {
          activityEl.style.display = "none";
          if (albumArtEl) albumArtEl.style.display = "none";
        }
      }
    }

    async function fetchPresence() {
      try {
        const fd = new FormData();
        fd.append("action", "get_presence");
        fd.append("discord_id", discordUserId);
        const res = await fetch("/api/integrations/discord-presence", { method: "POST", body: fd });
        const json = await res.json();
        if (json.success && json.data) applyPresence(json.data);
      } catch {}
    }

    fetchPresence();
    const id = setInterval(fetchPresence, 30000);
    return () => clearInterval(id);
  }, [discordUserId]);

  return (
    <div className="discord-int-card" id="discord-int-card">
      <div className="dic-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="16" height="16"><path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" /></svg>
        <span>Discord</span>
      </div>
      <div className="dic-body">
        <div className="dic-avatar-wrap">
          {discordAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://cdn.discordapp.com/avatars/${discordUserId}/${discordAvatar}.png?size=80`}
              className="dic-avatar"
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="dic-avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="#5865f2" width="22" height="22"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
            </div>
          )}
          <div className="dic-status-dot" ref={statusDotRef} />
        </div>
        <div className="dic-info" style={{ minWidth: 0, flex: 1 }}>
          <div className="dic-name-row">
            <div className="dic-name">{discordGlobalName || discordUsername}</div>
            <div className="dic-guild-tag" ref={guildTagRef} style={{ display: "none" }} />
            <div ref={badgesRowRef} style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }} />
          </div>
          <div className="dic-tag">@{discordUsername}</div>
          <div className="dic-activity" ref={activityRef} style={{ display: "none" }} />
        </div>
        <div className="dic-album-art" ref={albumArtRef} style={{ display: "none" }}>
          <img ref={albumImgRef} src="" alt="album art" loading="lazy" />
        </div>
      </div>
    </div>
  );
}
