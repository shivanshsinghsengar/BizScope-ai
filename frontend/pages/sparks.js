import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// ── Data ──────────────────────────────────────────────────────────────────────
const ALL_IDEAS = [
  // STARTUP
  { id:1, cat:'Startup', color:'#a78bfa', title:'Hyperlocal Skill Swap App', hook:'Trade skills with people in your colony — no money needed.', diff:'Medium' },
  { id:2, cat:'Startup', color:'#a78bfa', title:'Failure Museum — India Edition', hook:'Celebrate failed startups. Learn what went wrong. Inspire resilience.', diff:'Hard' },
  { id:3, cat:'Startup', color:'#a78bfa', title:'Rent-a-Professional for 1 Hour', hook:'Book a CA, lawyer, or designer for exactly 60 minutes.', diff:'Medium' },
  { id:4, cat:'Startup', color:'#a78bfa', title:'AI Tools for Kirana Shops', hook:'Inventory, billing, and reorder suggestions — in Hindi.', diff:'Hard' },
  { id:5, cat:'Startup', color:'#a78bfa', title:'Solo Founder Dashboard', hook:'Track MRR, tasks, mood, and energy — all in one place.', diff:'Easy' },
  // STUDENT
  { id:6, cat:'Student', color:'#60a5fa', title:'Study-with-Strangers Rooms', hook:'Join a silent Pomodoro room with random students worldwide.', diff:'Easy' },
  { id:7, cat:'Student', color:'#60a5fa', title:'Mock Interview with AI Judge', hook:'Practice HR and technical rounds. Get brutal honest feedback.', diff:'Medium' },
  { id:8, cat:'Student', color:'#60a5fa', title:'Notes-to-Flashcard AI Converter', hook:'Paste your notes. Get 20 spaced-repetition cards instantly.', diff:'Easy' },
  { id:9, cat:'Student', color:'#60a5fa', title:'Peer Accountability Bot', hook:'Daily check-ins with a study partner. Miss = lose streak.', diff:'Easy' },
  { id:10, cat:'Student', color:'#60a5fa', title:'Campus Gig Marketplace', hook:'Students hire students for design, coding, tutoring, and more.', diff:'Medium' },
  // CAREER
  { id:11, cat:'Career', color:'#34d399', title:'1-Minute Weekly Win Tracker', hook:'Log one win every Friday. Review quarterly. Feel unstoppable.', diff:'Easy' },
  { id:12, cat:'Career', color:'#34d399', title:'Meeting Cost Calculator Overlay', hook:'Browser extension that shows ₹ cost of every meeting in real time.', diff:'Medium' },
  { id:13, cat:'Career', color:'#34d399', title:'Skill Gap Radar for Your Role', hook:'Compare your skills to top performers in your job title.', diff:'Hard' },
  { id:14, cat:'Career', color:'#34d399', title:'Public Work Journal', hook:'Build in public. Share daily progress. Attract opportunities.', diff:'Easy' },
  { id:15, cat:'Career', color:'#34d399', title:'30-Day Career Experiment Tracker', hook:'Try one new career habit per day. Track what sticks.', diff:'Easy' },
  // CREATIVE
  { id:16, cat:'Creative', color:'#f472b6', title:'AI Comic of Your Day', hook:'Describe your day in 3 sentences. Get a 4-panel comic strip.', diff:'Easy' },
  { id:17, cat:'Creative', color:'#f472b6', title:'30-Day Micro-Creativity Challenge', hook:'One tiny creative act per day. Sketch, write, hum, build.', diff:'Easy' },
  { id:18, cat:'Creative', color:'#f472b6', title:'One-Sentence Daily Story App', hook:'Write one sentence. Others continue it. Collaborative fiction.', diff:'Easy' },
  { id:19, cat:'Creative', color:'#f472b6', title:'Sound Branding Generator', hook:'Upload your logo. Get a 3-second audio identity for your brand.', diff:'Hard' },
  // TECH
  { id:20, cat:'Tech', color:'#a3e635', title:'Browser Extension: Idea Catcher', hook:'Highlight any text online. Save it as a spark. Review weekly.', diff:'Medium' },
  { id:21, cat:'Tech', color:'#a3e635', title:'Mood-Based Playlist Builder', hook:'Rate your mood 1–10. Get a Spotify playlist that matches it.', diff:'Medium' },
  { id:22, cat:'Tech', color:'#a3e635', title:'CLI Tool for Daily Journaling', hook:'Type `journal` in terminal. Answer 3 prompts. Done in 2 min.', diff:'Easy' },
  { id:23, cat:'Tech', color:'#a3e635', title:'Offline-First Note Sync Tool', hook:'Notes work without internet. Sync when connected. No cloud lock-in.', diff:'Hard' },
];

const WORDS = [
  { word:'Kaizen', def:'The Japanese philosophy of continuous, incremental improvement.', spark:'What is one tiny thing you can improve in your product today?' },
  { word:'Ikigai', def:'Your reason for being — the intersection of passion, mission, vocation, and profession.', spark:'What would you build if money was not a factor?' },
  { word:'Jugaad', def:'Frugal innovation — finding a simple, affordable fix to a complex problem.', spark:'What expensive problem can you solve with zero budget?' },
  { word:'Serendipity', def:'Finding valuable things not sought for — happy accidents that change everything.', spark:'What unexpected connection between two industries could create a new product?' },
  { word:'Wabi-Sabi', def:'Finding beauty in imperfection and impermanence.', spark:'What "broken" product could be redesigned to celebrate its flaws?' },
  { word:'Sonder', def:'The realization that every passerby has a life as vivid and complex as your own.', spark:'Pick a stranger\'s job. What app would make their day 10x better?' },
];

const TRENDING = [
  { text:'AI tools for Tier 2 India businesses', cat:'Startup' },
  { text:'Study accountability apps for JEE/NEET', cat:'Student' },
  { text:'Build-in-public career journaling', cat:'Career' },
  { text:'Offline-first tools for low connectivity', cat:'Tech' },
  { text:'Micro-creativity challenges for burnout', cat:'Creative' },
];

const CAT_COLORS = { Startup:'#a78bfa', Student:'#60a5fa', Career:'#34d399', Creative:'#f472b6', Tech:'#a3e635' };
const DIFF_COLORS = { Easy:'#34d399', Medium:'#fbbf24', Hard:'#f87171' };

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

export default function Sparks() {
  const router = useRouter();
  const [activeFilters, setActiveFilters] = useState(['Startup','Student','Career','Creative','Tech']);
  const [displayed, setDisplayed] = useState([]);
  const [saved, setSaved] = useState(new Set());
  const [wordIdx, setWordIdx] = useState(0);
  const [activeNav, setActiveNav] = useState('home');
  const [ideasToday] = useState(Math.floor(Math.random() * 2000) + 3000);
  const [animKey, setAnimKey] = useState(0);

  const reshuffle = () => {
    const pool = ALL_IDEAS.filter(i => activeFilters.includes(i.cat));
    setDisplayed(shuffle(pool).slice(0, 6));
    setWordIdx(w => (w + 1) % WORDS.length);
    setAnimKey(k => k + 1);
  };

  useEffect(() => { reshuffle(); }, [activeFilters]);

  const toggleFilter = (cat) => {
    setActiveFilters(prev => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const word = WORDS[wordIdx];

  return (
    <>
      <Head>
        <title>SparkLab — Daily Idea Engine · BizScope AI</title>
        <meta name="description" content="Daily startup, career, and creative ideas for Indian entrepreneurs and students." />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07080f; color: #d4dde8; font-family: system-ui, -apple-system, sans-serif; }
        .spark-card {
          background: #0d1020; border: 1px solid #1e2a3a; border-radius: 14px;
          padding: 16px; cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          position: relative; overflow: hidden;
        }
        .spark-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--cat-color, #a78bfa); opacity: 0; transition: opacity 0.15s ease;
        }
        .spark-card:hover { transform: translateY(-3px); border-color: var(--cat-color, #a78bfa); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .spark-card:hover::before { opacity: 1; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-card { animation: fadeSlideUp 0.35s ease both; }
        .pill { border-radius: 999px; padding: 3px 10px; font-size: 10px; font-weight: 700; display: inline-block; }
        .filter-pill {
          border-radius: 999px; padding: 7px 16px; font-size: 12px; font-weight: 700;
          border: 1px solid #1e2a3a; background: #0d1020; color: #64748b;
          cursor: pointer; transition: all 0.15s ease;
        }
        .filter-pill.active { color: #07080f; border-color: transparent; }
        .filter-pill:hover { border-color: #a78bfa; color: #d4dde8; }
        .trend-row {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          border: 1px solid #1e2a3a; border-radius: 14px; cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .trend-row:hover { border-color: #a78bfa; background: #0d1020; }
        .bottom-nav-btn { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 16px; color: #475569; transition: color 0.15s ease; }
        .bottom-nav-btn.active { color: #a78bfa; }
        .cta-btn {
          background: #a78bfa; color: #07080f; border: none; border-radius: 14px;
          padding: 13px 28px; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .star-btn { background: none; border: none; cursor: pointer; font-size: 18px; transition: transform 0.15s ease; padding: 0; }
        .star-btn:hover { transform: scale(1.2); }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse { animation: pulse 2s infinite; }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
        @media (max-width: 480px) {
          .cards-grid { grid-template-columns: 1fr 1fr; }
          .insight-row { grid-template-columns: 1fr 1fr !important; }
          .filter-row { flex-wrap: wrap; }
        }
        @media (max-width: 360px) {
          .cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#07080f', paddingBottom: '80px' }}>

        {/* ── TOP NAV ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#07080f', borderBottom: '1px solid #1e2a3a', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/')}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#d4dde8' }}>Spark</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#a78bfa' }}>[Lab]</span>
          </div>

          {/* Center tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#0d1020', borderRadius: '999px', padding: '4px', border: '1px solid #1e2a3a' }}>
            {['Discover','Saved','My Sparks'].map(t => (
              <button key={t} onClick={() => setActiveNav(t.toLowerCase().replace(' ',''))}
                style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: activeNav === t.toLowerCase().replace(' ','') ? '#a78bfa' : 'transparent', color: activeNav === t.toLowerCase().replace(' ','') ? '#07080f' : '#64748b', transition: 'all 0.15s ease' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Streak */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1200', border: '1px solid #3d2800', borderRadius: '999px', padding: '5px 12px', flexShrink: 0 }}>
            <span style={{ fontSize: '14px' }}>🔥</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24' }}>7 day streak</span>
            <span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
          </div>
        </nav>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

          {/* ── HERO ── */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a0f2e', border: '1px solid #2d1f5e', borderRadius: '999px', padding: '5px 14px', marginBottom: '18px' }}>
              <span className="pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa' }}>{ideasToday.toLocaleString()} ideas sparked today</span>
            </div>
            <h1 style={{ fontSize: 'clamp(26px,5vw,42px)', fontWeight: '700', color: '#d4dde8', marginBottom: '10px', lineHeight: '1.2' }}>
              Your daily dose of <span style={{ color: '#a78bfa' }}>big ideas</span>
            </h1>
            <p style={{ fontSize: '14px', color: '#475569', maxWidth: '380px', margin: '0 auto 24px', lineHeight: '1.7' }}>
              Discover startup, career, and creative ideas curated for Indian entrepreneurs and students.
            </p>

            {/* Filter pills */}
            <div className="filter-row" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              {Object.entries(CAT_COLORS).map(([cat, color]) => (
                <button key={cat} className={`filter-pill ${activeFilters.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleFilter(cat)}
                  style={{ background: activeFilters.includes(cat) ? color : '#0d1020', color: activeFilters.includes(cat) ? '#07080f' : '#64748b', borderColor: activeFilters.includes(cat) ? color : '#1e2a3a' }}>
                  {cat}
                </button>
              ))}
            </div>

            <button className="cta-btn" onClick={reshuffle}>⚡ Spark new ideas</button>
          </div>

          {/* ── INSIGHT BAR ── */}
          <div className="insight-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: 'Ideas saved', value: saved.size },
              { label: 'Categories', value: activeFilters.length },
              { label: 'Ideas tried', value: 3 },
              { label: "Today's rank", value: '#' + Math.floor(Math.random() * 500 + 1) },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d1020', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#a78bfa', marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── IDEA CARDS ── */}
          <div className="cards-grid" key={animKey} style={{ marginBottom: '32px' }}>
            {displayed.map((idea, i) => (
              <div key={idea.id} className="spark-card anim-card"
                style={{ '--cat-color': idea.color, animationDelay: `${i * 0.07}s` }}>
                {/* Category pill */}
                <div className="pill" style={{ background: idea.color + '20', color: idea.color, marginBottom: '10px' }}>{idea.cat}</div>
                {/* Title */}
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#d4dde8', marginBottom: '6px', lineHeight: '1.4' }}>{idea.title}</div>
                {/* Hook */}
                <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{idea.hook}</div>
                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="pill" style={{ background: DIFF_COLORS[idea.diff] + '20', color: DIFF_COLORS[idea.diff] }}>{idea.diff}</span>
                  <button className="star-btn" onClick={e => { e.stopPropagation(); toggleSave(idea.id); }}
                    style={{ color: saved.has(idea.id) ? '#fbbf24' : '#334155' }}>
                    {saved.has(idea.id) ? '★' : '☆'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── WORD OF THE DAY ── */}
          <div style={{ background: '#0d1020', border: '1px solid #2d1f5e', borderRadius: '14px', padding: '28px', marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Word of the Day</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#d4dde8', marginBottom: '8px' }}>{word.word}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: '1.7' }}>{word.def}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '20px', borderLeft: '2px solid #a78bfa', paddingLeft: '12px' }}>
              Spark: {word.spark}
            </div>
            <button onClick={reshuffle}
              style={{ background: '#1a0f2e', border: '1px solid #2d1f5e', borderRadius: '999px', padding: '7px 18px', fontSize: '12px', fontWeight: '700', color: '#a78bfa', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2d1f5e'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a0f2e'; }}>
              Next word →
            </button>
          </div>

          {/* ── TRENDING SPARKS ── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trending Sparks</div>
              <span style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TRENDING.map((t, i) => (
                <div key={i} className="trend-row">
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155', minWidth: '20px' }}>#{i + 1}</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8', flex: 1 }}>{t.text}</span>
                  <span className="pill" style={{ background: CAT_COLORS[t.cat] + '20', color: CAT_COLORS[t.cat] }}>{t.cat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── BACK TO BIZSCOPE ── */}
          <div style={{ background: '#0d1020', border: '1px solid #1e2a3a', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>Ready to validate your idea with real market data?</div>
            <button onClick={() => router.push('/')}
              style={{ background: '#a78bfa', color: '#07080f', border: 'none', borderRadius: '14px', padding: '11px 24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s ease' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              🔍 Analyze Market with BizScope →
            </button>
          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#07080f', borderTop: '1px solid #1e2a3a', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 100 }}>
          {[
            { id:'home', label:'Home', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
            { id:'daily', label:'Daily', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { id:'saved', label:'Saved', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { id:'profile', label:'Profile', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ].map(n => (
            <button key={n.id} className={`bottom-nav-btn ${activeNav === n.id ? 'active' : ''}`}
              onClick={() => setActiveNav(n.id)}>
              {n.icon}
              <span style={{ fontSize: '10px', fontWeight: '700' }}>{n.label}</span>
              {activeNav === n.id && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
