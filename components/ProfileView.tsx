"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import EffectText from "./EffectText";
import MusicPlayer from "./MusicPlayer";
import ParticleBackground from "./ParticleBackground";
import CursorTrail from "./CursorTrail";
import DiscordPresenceCard from "./DiscordPresenceCard";
import DiscordServerCard from "./DiscordServerCard";
import GameIntegrationCards, { GameIntegration } from "./GameIntegrationCards";
import PurchasedEffectsEngine from "./PurchasedEffectsEngine";
import { DecorationFrame } from "./DecorationSVGs";

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  discord: (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  steam: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  ),
  website: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
};

const PLATFORM_COLOR: Record<string, string> = {
  steam: "#1b2838", spotify: "#1DB954", discord: "#5865F2", instagram: "#E1306C",
  twitter: "#000000", youtube: "#FF0000", twitch: "#9146FF", github: "#333333",
  tiktok: "#010101", website: "#555555",
};

const BADGE_ICON: Record<string, React.ReactNode> = {
  og: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z" /></svg>,
  views_master: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
  verified: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>,
  owner: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1h14v-1z" /></svg>,
  admin: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" /></svg>,
  known: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>,
  rich: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>,
  trapstar: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" /></svg>,
  hall_of_fame: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" /></svg>,
  champion: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 6.5 5 5l2 5H4l2.5 4h11L20 10h-3l2-5-4.5 1.5L12 2z" opacity=".9" /><rect x="7" y="19" width="10" height="2" rx="1" /><rect x="8.5" y="16" width="7" height="2.5" rx=".8" /></svg>,
  the_killer: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>,
  discord: <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" /></svg>,
  booster: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19M5.64 12.5L1.81 10.87L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M21.61 2.39C21.61 2.39 16.66.269 11 5.93C8.81 8.12 7.5 10.53 6.65 12.64C6.37 13.39 6.56 14.21 7.11 14.77L9.24 16.89C9.79 17.45 10.61 17.63 11.36 17.35C13.5 16.53 15.88 15.19 18.07 13C23.73 7.34 21.61 2.39 21.61 2.39M14.54 9.46C13.76 8.68 13.76 7.41 14.54 6.63S16.59 5.85 17.37 6.63C18.14 7.41 18.15 8.68 17.37 9.46C16.59 10.24 15.32 10.24 14.54 9.46M8.88 16.53L7.47 15.12L8.88 16.53M6.24 22L9.88 18.36C9.54 18.27 9.21 18.12 8.91 17.91L4.83 22H6.24M2 22H3.41L8.18 17.24L6.76 15.83L2 20.59V22M7 22H8.41L9.5 20.92L8.09 19.5L7 20.59V22Z" /></svg>,
  lover: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>,
  fresh: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z" /></svg>,
  crew: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z" /></svg>,
  billionaire: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
  promoter: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" /></svg>,
  promoter_elite: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" /></svg>,
  content_creator: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" /><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" /></svg>,
  designer: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z" /></svg>,
};

interface ProfileViewProps {
  username: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  job: string | null;
  age: number | null;
  banner: string | null;
  avatar: string | null;
  avatarShape: string;
  avatarRing: "none" | "normal" | "premium";
  activeDecoration?: string | null;
  accentColor: string;
  backgroundColor: string;
  nameColor: string;
  bioColor: string;
  overlayColor: string;
  backgroundType: string;
  backgroundValue: string;
  isPremium: boolean;
  particleEffect: boolean;
  cursorTrail: boolean;
  nameEffect: string;
  bioEffect: string;
  musicTracks: string[];
  playlistStyle: string;
  views: number;
  createdAt: string;
  isOwner: boolean;
  socialLinks: { id: number; platform: string; url: string }[];
  badges: { id: string; label: string }[];
  cursorPath: string | null;
  discordInt: { discordUserId: string; discordUsername: string; discordGlobalName: string | null; discordAvatar: string | null } | null;
  discordServerInt: { invite: string; serverName: string; serverIcon: string | null; serverId: string; online: number; total: number } | null;
  gameIntegrations: GameIntegration[];
  layoutTemplate: string;
  purchasedEffects: string[];
  activeCursorEffect: string;
  activeAvatarEffect: string;
  activeBgEffect: string;
  likeCount: number;
  likedByViewer: boolean;
  viewerLoggedIn: boolean;
}

export default function ProfileView(p: ProfileViewProps) {
  const [entered, setEntered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(p.likedByViewer);
  const [likeCount, setLikeCount] = useState(p.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);

  async function toggleLike() {
    if (!p.viewerLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const prevLiked = liked, prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await fetch("/api/profile-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: p.username }),
      });
      const data = await res.json();
      if (data.success) {
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
    setLikeBusy(false);
  }

  useEffect(() => {
    if (!entered || !cardRef.current) return;
    const card = cardRef.current;
    if (window.matchMedia("(pointer:coarse)").matches) return;
    const MAX = 6;
    let rafId: number | null = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, inside = false;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    function animate() {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);
      const sc = inside ? 1.02 : 1;
      card.style.transform = `perspective(900px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${sc})`;
      if (Math.abs(currentX - targetX) > 0.01 || Math.abs(currentY - targetY) > 0.01) {
        rafId = requestAnimationFrame(animate);
      } else rafId = null;
    }
    function startRaf() { if (!rafId) rafId = requestAnimationFrame(animate); }
    function onMove(e: MouseEvent) {
      const r = card.getBoundingClientRect();
      targetY = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * MAX;
      targetX = -((e.clientY - r.top - r.height / 2) / (r.height / 2)) * MAX;
      startRaf();
    }
    function onEnter() { inside = true; startRaf(); }
    function onLeave() { inside = false; targetX = 0; targetY = 0; startRaf(); }
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, [entered]);

  function enter() {
    setEntered(true);
  }

  const hasChampion = p.badges.some((b) => b.id === "champion");
  const hasActiveAvatarEffect = !!(p.activeAvatarEffect && p.purchasedEffects.includes(p.activeAvatarEffect));

  const bgStyle: React.CSSProperties =
    p.backgroundType === "color" || p.backgroundType === "gradient"
      ? { background: p.backgroundValue }
      : p.backgroundType === "image"
        ? { backgroundImage: `url(/${p.backgroundValue})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: p.backgroundColor };

  const effectiveLayout = p.layoutTemplate === "wide" && !p.isPremium ? "classic" : p.layoutTemplate;

  const paletteVars = {
    ["--accent" as string]: p.accentColor,
    ["--profile-name-color" as string]: p.nameColor,
    ["--profile-bio-color" as string]: p.bioColor,
    ["--profile-overlay" as string]: p.overlayColor,
  };

  return (
    <div className="profile-body" style={paletteVars}>
      {!entered && (
        <div id="splash-screen" onClick={enter}>
          <div id="splash-text">
            click to enter<span className="splash-dots">...</span>
          </div>
        </div>
      )}

      <div
        id="profile-content"
        style={{ opacity: entered ? 1 : 0, pointerEvents: entered ? "auto" : "none", transition: "opacity .7s ease" }}
      >
        <div id="profile-bg" style={bgStyle} />
        {p.backgroundType === "video" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
            <video id="bg-video" autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute" }}>
              <source src={`/${p.backgroundValue}`} />
            </video>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          </div>
        )}
        {entered && p.isPremium && p.particleEffect && <ParticleBackground />}
        {entered && p.isPremium && p.cursorTrail && <CursorTrail color={p.accentColor} />}
        {entered && (
          <PurchasedEffectsEngine
            purchasedEffects={p.purchasedEffects}
            activeCursorEffect={p.activeCursorEffect}
            activeAvatarEffect={p.activeAvatarEffect}
            activeBgEffect={p.activeBgEffect}
            avatarShape={p.avatarShape}
            cursorTrailEnabled={p.isPremium && p.cursorTrail}
            customCursorUrl={p.cursorPath ? `/${p.cursorPath}` : null}
          />
        )}
        {p.musicTracks.length > 0 && (
          <MusicPlayer tracks={p.musicTracks} style={p.playlistStyle} active={entered} />
        )}

        {p.isOwner && (
          <div className="edit-profile-btn">
            <a href="/dashboard" className="btn btn-secondary btn-sm">✏ Edit</a>
          </div>
        )}

        <div className={`profile-wrapper profile-wrapper--${effectiveLayout}`}>
          <div className={`profile-card profile-card--${effectiveLayout}`} ref={cardRef}>
            {p.banner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/${p.banner}`} alt="" className="profile-banner-img fade-in" />
            )}
            <div className={`avatar-wrapper fade-in avatar-shape-${p.avatarShape} ${p.banner ? "avatar-wrapper--with-banner" : ""}`}>
              {!hasActiveAvatarEffect && p.isPremium && p.avatarRing === "premium" ? (
                <>
                  <div className="avatar-ring-pulse" />
                  <div className="avatar-ring-shell ring-premium">
                    <div className="avatar-ring-spin" />
                  </div>
                </>
              ) : !hasActiveAvatarEffect && p.avatarRing === "normal" ? (
                <div className="avatar-ring-shell ring-normal">
                  <div className="avatar-ring-spin" />
                </div>
              ) : null}
              <div className="avatar-ring-inner" />
              <div className="avatar-decoration-anchor">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.avatar ? `/${p.avatar}` : "/assets/img/default-avatar.png"}
                  alt={p.displayName}
                  className="avatar-img"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }}
                />
                <DecorationFrame id={p.activeDecoration} />
              </div>
              {hasActiveAvatarEffect && (
                <div className="pav-effect-wrap" data-effect={p.activeAvatarEffect}>
                  <canvas className="pav-canvas" id="pav-canvas" />
                </div>
              )}
            </div>

            <div className={`profile-username fade-in-d1 ${hasChampion ? "champion-name" : ""}`} id="profile-display-name">
              <EffectText text={p.displayName} effect={p.nameEffect} active={entered} />
            </div>

            {p.badges.length > 0 && (
              <div className="profile-badges fade-in-d1">
                {p.badges.map((b) =>
                  b.id === "premium" ? (
                    <div
                      key={b.id}
                      className="profile-badge badge-premium"
                      style={{ background: "linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,160,0,.12))", border: "1.5px solid rgba(255,215,0,.55)", boxShadow: "0 0 16px rgba(255,215,0,.4)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="17" height="17" style={{ filter: "drop-shadow(0 0 5px rgba(255,215,0,.9))" }}>
                        <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" opacity=".85" />
                      </svg>
                      <span className="badge-tooltip">Premium</span>
                    </div>
                  ) : (
                    <div key={b.id} className={`profile-badge badge-${b.id}`}>
                      {BADGE_ICON[b.id]}
                      <span className="badge-tooltip">{b.label}</span>
                    </div>
                  )
                )}
              </div>
            )}

            {p.bio && (
              <p className="profile-bio fade-in-d1">
                &quot;<EffectText text={p.bio} effect={p.bioEffect} active={entered} />&quot;
              </p>
            )}

            {(p.location || p.job || p.age !== null) && (
              <div className="profile-meta-row fade-in-d2">
                {p.location && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff" style={{ opacity: 0.6 }}>
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" />
                      <circle cx="12" cy="8" r="2.2" fill="rgba(5,5,7,0.55)" />
                    </svg>
                    {p.location}
                  </div>
                )}
                {p.job && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: 0.6 }}>
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    {p.job}
                  </div>
                )}
                {p.age !== null && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: 0.6 }}>
                      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    {p.age}
                  </div>
                )}
              </div>
            )}

            {p.socialLinks.length > 0 && (
              <div className="social-icons fade-in-d3">
                {p.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon"
                    data-tooltip={link.platform[0].toUpperCase() + link.platform.slice(1)}
                    style={{ ["--platform-color" as string]: PLATFORM_COLOR[link.platform] || "#555" }}
                  >
                    {PLATFORM_ICON[link.platform] || PLATFORM_ICON.website}
                  </a>
                ))}
              </div>
            )}

            {(p.discordInt || p.discordServerInt || p.gameIntegrations.length > 0) && (
              <div className="integrations-grid fade-in-d3">
                {p.discordInt && (
                  <DiscordPresenceCard
                    discordUserId={p.discordInt.discordUserId}
                    discordUsername={p.discordInt.discordUsername}
                    discordGlobalName={p.discordInt.discordGlobalName}
                    discordAvatar={p.discordInt.discordAvatar}
                  />
                )}
                {p.discordServerInt && (
                  <DiscordServerCard
                    invite={p.discordServerInt.invite}
                    serverName={p.discordServerInt.serverName}
                    serverIcon={p.discordServerInt.serverIcon}
                    serverId={p.discordServerInt.serverId}
                    online={p.discordServerInt.online}
                    total={p.discordServerInt.total}
                  />
                )}
                <GameIntegrationCards integrations={p.gameIntegrations} />
              </div>
            )}

            <div className="fade-in-d4" style={{ marginTop: ".85rem" }}>
              <div className="profile-views-row">
                <div className="profile-views-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  {p.views.toLocaleString()}
                </div>
                {!p.isOwner && (
                  <button
                    className={`profile-like-pill ${liked ? "liked" : ""}`}
                    onClick={toggleLike}
                    disabled={likeBusy}
                    title={liked ? "Unlike" : "Like this profile"}
                  >
                    <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {likeCount.toLocaleString()}
                  </button>
                )}
              </div>
              <div className="profile-joined">Joined {p.createdAt}</div>
            </div>
          </div>
        </div>

        {!p.isPremium && (
          <div className="profile-footer">
            <a href="/">⬡ INFECTED.WTF</a>
          </div>
        )}
      </div>
    </div>
  );
}
