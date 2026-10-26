"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiDiscord, SiSpotify, SiGithub, SiSteam } from "react-icons/si";

const clean = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30);

// The claim prompt and the specimen card next to it share the name being typed.
export default function HeroClaim({ specimenNo }: { specimenNo: number }) {
  const router = useRouter();
  const [val, setVal] = useState("");
  const name = clean(val);

  function claim(e: React.FormEvent) {
    e.preventDefault();
    router.push(name ? `/register?u=${encodeURIComponent(name)}` : "/register");
  }

  return (
    <div className="lx-hero-grid">
      <div className="lx-hero-copy">
        <div className="lab-label lx-hero-tag"><span className="lab-dot" /> Strain active · No known cure</div>
        <h1 className="lx-hero-title">
          <span>One link.</span>
          <span>Total</span>
          <span className="is-accent">infection.</span>
        </h1>
        <p className="lx-hero-lead">
          A bio page that spreads. Links, music, Discord presence, game stats and effects — contained in a single
          <code> infected.wtf/</code> address.
        </p>
        <form className="lx-claim" onSubmit={claim}>
          <label className="lx-claim-field">
            <span className="lx-claim-prompt" aria-hidden="true">&gt;</span>
            <span className="lx-claim-prefix">infected.wtf/</span>
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="yourname"
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              aria-label="Username to claim"
            />
          </label>
          <button type="submit" className="lab-btn lab-btn--solid lab-btn--lg">Infect me</button>
        </form>
        <div className="lx-claim-meta">
          <span>Free forever</span><span>No card</span><span>Live in ~2 min</span>
        </div>
      </div>

      <div className="lx-specimen" aria-hidden="true">
        <div className="lx-specimen-head">
          <span>Specimen #{String(specimenNo).padStart(6, "0")}</span>
          <span className="lab-dot" />
        </div>
        <div className="lx-specimen-body">
          <div className="lx-specimen-avatar">{(name || "you").charAt(0).toUpperCase()}</div>
          <div className="lx-specimen-name">{name || "yourname"}</div>
          <div className="lx-specimen-url">infected.wtf/{name || "yourname"}</div>
          <div className="lx-specimen-bio">building things at 3am. probably online.</div>
          <div className="lx-specimen-rows">
            <div><SiDiscord /> <span>Discord</span><em>online</em></div>
            <div><SiSpotify /> <span>Now playing</span><em>▮▮▮▯▯</em></div>
            <div><SiSteam /> <span>Steam</span><em>in game</em></div>
            <div><SiGithub /> <span>GitHub</span><em>→</em></div>
          </div>
        </div>
        <div className="lx-specimen-foot">
          <span>Views <b>0012.4K</b></span>
          <span>Status <b className="is-accent">Contagious</b></span>
        </div>
        <i className="lx-tick lx-tick--tl" /><i className="lx-tick lx-tick--tr" /><i className="lx-tick lx-tick--bl" /><i className="lx-tick lx-tick--br" />
      </div>
    </div>
  );
}
