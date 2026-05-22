import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const sections = [
  {
    id: 'getting-started', title: '🚀 Getting Started', content: `
**What is BizScope AI?**
BizScope AI is a free market intelligence platform that helps entrepreneurs analyze local business competition, discover market gaps, and find the best location to start a business.

**How to run your first analysis:**
1. Go to the homepage
2. Enter your city name (e.g. "Delhi", "Mumbai", "Bangalore")
3. Optionally add a street address or pincode for more precision
4. Click "Analyze Market"
5. You'll see real competitor data from OpenStreetMap within 5km of your location

**Data source:**
All business data comes from OpenStreetMap (OSM) — a free, community-maintained map of the world. No paid API keys required.
    `
  },
  {
    id: 'analysis', title: '📊 Understanding the Dashboard', content: `
**Competitor Score:**
A weighted score calculated from:
- Competitor count (40% weight)
- Average rating (30% weight)  
- Popularity/review count (30% weight)

Higher score = more competition in that category.

**Risk Levels:**
- 🟢 Low Risk (0–34): Few competitors, good opportunity
- 🟡 Medium Risk (35–69): Moderate competition, differentiation needed
- 🔴 High Risk (70–100): Highly competitive, strong USP required

**Best Opportunity:**
The category with the lowest competitor score — meaning least competition relative to demand.
    `
  },
  {
    id: 'ai', title: '🤖 AI Recommendations', content: `
**How AI suggestions work:**
After your analysis loads, BizScope sends the market data to an AI model (Gemini or GPT) which analyzes the competition landscape and suggests the 5 best businesses to start in that area.

**AI runs in the background:**
The page loads instantly with your data. AI suggestions appear within 5–15 seconds. If you see "Generating...", just wait — the page will update automatically.

**No AI key configured?**
If no Gemini or OpenAI key is set, BizScope shows data-driven recommendations based purely on the category stats — still useful, just not AI-generated prose.

**To enable AI:**
Add your Gemini API key (free) to backend/.env:
\`GEMINI_API_KEY=your_key_here\`
Get a free key at: https://aistudio.google.com
    `
  },
  {
    id: 'listing', title: '🏪 Listing Your Business', content: `
**Who can list a business?**
Any registered user can list their business to appear in market analyses.

**How to list:**
1. Register or log in
2. Go to "List Business" in the navbar
3. Fill in your business details
4. Add coordinates (use "Use My Location" if you're at your business)
5. Submit — your business will appear in analyses within the 5km radius

**Editing your listing:**
Click the ✏️ Edit button on any of your listings to update details.

**Verification:**
New listings show as "Pending" until reviewed by an admin. Verified listings get a ✅ badge.
    `
  },
  {
    id: 'suggest', title: '➕ Suggesting a Business', content: `
**No account needed:**
Anyone can suggest a local business using the small ＋ button in the bottom-right corner of any page.

**What happens after submission:**
Suggestions go to the admin panel for review. Approved suggestions are added to the database and appear in future analyses.

**What to include:**
- Business name (required)
- City (required)
- Category, address, phone (optional but helpful)
    `
  },
  {
    id: 'export', title: '📄 Exporting Reports', content: `
**PDF Export:**
After running an analysis, click "📄 Export PDF Report" on the Dashboard page.

The PDF includes:
- Location summary
- Full category breakdown table with risk scores
- AI recommendations (if available)
- Top 15 businesses in the area
- Page numbers and report date

**File naming:**
Reports are saved as: \`BizScope_[City]_[Date].pdf\`
    `
  },
  {
    id: 'saved', title: '🔖 Saved Searches', content: `
**Saving an analysis:**
Log in, run an analysis, then click "🔖 Save Search" on the Dashboard.

**Loading a saved search:**
Go to "Saved" in the navbar → click "Load →" on any saved search to instantly restore that analysis.

**Limit:**
Up to 10 saved searches per account (oldest are replaced automatically).
    `
  },
  {
    id: 'admin', title: '🔐 Admin Panel', content: `
**Accessing admin:**
Click the 🔐 icon in the top-right navbar → enter the admin password.

**What admins can do:**
- View and manage all public business suggestions (approve/reject/delete)
- View all registered users
- See stats on pending suggestions

**Admin password:**
Set in backend/.env as \`ADMIN_PASSWORD_HASH\` (bcrypt hash).
Default password is set during setup.
    `
  },
];

export default function Docs() {
  const router = useRouter();
  const { dark, mounted, toggle } = useTheme();
  const [active, setActive] = useState('getting-started');

  const current = sections.find(s => s.id === active);

  const renderContent = (text) => {
    return text.trim().split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px', marginTop: '18px', marginBottom: '6px' }}>{line.replace(/\*\*/g, '')}</div>;
      }
      if (line.startsWith('- ')) {
        return <div key={i} style={{ display: 'flex', gap: '8px', color: 'var(--text2)', fontSize: '14px', marginBottom: '5px', paddingLeft: '8px' }}><span style={{ color: '#3b82f6' }}>•</span>{line.slice(2)}</div>;
      }
      if (line.match(/^\d\./)) {
        return <div key={i} style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '5px', paddingLeft: '8px' }}>{line}</div>;
      }
      if (line.startsWith('`') && line.endsWith('`')) {
        return <code key={i} style={{ display: 'block', background: 'var(--surface2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#60a5fa', margin: '8px 0', fontFamily: 'monospace' }}>{line.replace(/`/g, '')}</code>;
      }
      if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />;
      return <div key={i} style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.7', marginBottom: '4px' }}>{line}</div>;
    });
  };

  return (
    <>
      <Head>
        <title>Documentation — BizScope AI</title>
        <meta name="description" content="Learn how to use BizScope AI for market analysis, competitor research, and business opportunity discovery." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Navbar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg,#c8f03a,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} suppressHydrationWarning style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>{mounted ? (dark ? '☀️' : '🌙') : '��'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Sidebar — desktop */}
          <div className="docs-sidebar" style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '84px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Documentation</div>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: active === s.id ? '600' : '400', marginBottom: '2px', background: active === s.id ? 'rgba(200,240,58,0.08)' : 'transparent', color: active === s.id ? '#a8d420' : 'var(--muted)', borderLeft: active === s.id ? '2px solid #c8f03a' : '2px solid transparent', transition: 'all 0.15s' }}>
                {s.title}
              </button>
            ))}
          </div>

          {/* Mobile section picker */}
          <div className="docs-mobile-select" style={{ display: 'none', width: '100%', marginBottom: '16px' }}>
            <select value={active} onChange={e => setActive(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          {/* Content */}
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', minHeight: '500px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>{current?.title}</h1>
            <div>{renderContent(current?.content || '')}</div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .docs-sidebar { display: none !important; }
          .docs-mobile-select { display: block !important; }
        }
      `}</style>
    </>
  );
}
