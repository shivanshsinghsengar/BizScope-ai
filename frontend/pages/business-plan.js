import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import API_URL from '../utils/api';

const SECTIONS = [
  { key: 'executive_summary', label: '📋 Executive Summary', icon: '📋' },
  { key: 'market_analysis', label: '📊 Market Analysis', icon: '📊' },
  { key: 'business_model', label: '💼 Business Model', icon: '💼' },
  { key: 'marketing_strategy', label: '📣 Marketing Strategy', icon: '📣' },
  { key: 'operations_plan', label: '⚙️ Operations Plan', icon: '⚙️' },
  { key: 'financial_projections', label: '💰 Financial Projections', icon: '💰' },
  { key: 'risk_analysis', label: '⚠️ Risk Analysis', icon: '⚠️' },
  { key: 'action_plan', label: '🗓️ 90-Day Action Plan', icon: '🗓️' },
];

function parsePlanSections(planText) {
  if (!planText) return {};
  const sections = {};
  const lines = planText.split('\n');
  let currentKey = null;
  let buffer = [];

  const headingMap = {
    'executive summary': 'executive_summary',
    'market analysis': 'market_analysis',
    'business model': 'business_model',
    'marketing strategy': 'marketing_strategy',
    'operations plan': 'operations_plan',
    'financial projections': 'financial_projections',
    'risk analysis': 'risk_analysis',
    'action plan': 'action_plan',
    '90-day': 'action_plan',
  };

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[#*🎯📊💼📣⚙️💰⚠️🗓️📋]/g, '').trim();
    let matched = null;
    for (const [keyword, key] of Object.entries(headingMap)) {
      if (lower.includes(keyword)) { matched = key; break; }
    }
    if (matched) {
      if (currentKey && buffer.length) sections[currentKey] = buffer.join('\n').trim();
      currentKey = matched;
      buffer = [];
    } else if (currentKey) {
      buffer.push(line);
    }
  }
  if (currentKey && buffer.length) sections[currentKey] = buffer.join('\n').trim();

  // If no sections parsed, put everything in executive_summary
  if (Object.keys(sections).length === 0) {
    sections['executive_summary'] = planText;
  }
  return sections;
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: '8px' }} />;
    if (line.startsWith('## ')) return <h3 key={i} style={{ color: '#3b82f6', fontSize: '15px', fontWeight: '700', margin: '16px 0 8px' }}>{line.replace('## ', '')}</h3>;
    if (line.startsWith('# ')) return <h2 key={i} style={{ color: '#f3f4f6', fontSize: '17px', fontWeight: '800', margin: '20px 0 10px' }}>{line.replace('# ', '')}</h2>;
    if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#d1d5db' }}><span style={{ color: '#3b82f6', flexShrink: 0 }}>•</span><span>{line.replace(/^[-•]\s*/, '')}</span></div>;
    if (/^\d+\./.test(line)) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#d1d5db' }}><span style={{ color: '#3b82f6', flexShrink: 0, fontWeight: '700' }}>{line.match(/^\d+/)[0]}.</span><span>{line.replace(/^\d+\.\s*/, '')}</span></div>;
    if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: '700', color: '#f3f4f6', fontSize: '14px', marginBottom: '4px' }}>{line.replace(/\*\*/g, '')}</div>;
    return <div key={i} style={{ fontSize: '14px', color: '#d1d5db', lineHeight: '1.7', marginBottom: '4px' }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</div>;
  });
}

export default function BusinessPlanPage() {
  const [form, setForm] = useState({ idea: '', city: '', budget: '', timeline: '6 months', background: '' });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState({});

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idea.trim()) { setError('Please enter your business idea.'); return; }
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const res = await fetch(`${API_URL}/api/business-plan-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
      setPlan(data.plan);
      // Open first section by default
      setOpenSections({ executive_summary: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  const handlePrint = () => {
    window.print();
  };

  const sections = parsePlanSections(plan);

  return (
    <Layout>
      <Head>
        <title>AI Business Plan Generator — BizScope AI</title>
        <meta name="description" content="Generate a complete AI-powered business plan for your idea in seconds." />
        <style>{`
          @media print {
            nav, footer, .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .print-section { page-break-inside: avoid; }
          }
        `}</style>
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f3f4f6', marginBottom: '10px' }}>
            AI Business Plan Generator
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
            Enter your idea and get a complete, investor-ready business plan in seconds — powered by AI.
          </p>
        </div>

        {/* Form */}
        <div className="card anim-fade-up delay-1" style={{ padding: '32px', marginBottom: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  💡 Business Idea *
                </label>
                <input
                  name="idea"
                  value={form.idea}
                  onChange={handleChange}
                  placeholder="e.g. Tiffin delivery service for working professionals"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  📍 Target City
                </label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Bangalore, Mumbai"
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  💰 Budget Range
                </label>
                <select name="budget" value={form.budget} onChange={handleChange} className="input-field">
                  <option value="">Select budget</option>
                  <option value="Under ₹50,000">Under ₹50,000</option>
                  <option value="₹50,000 – ₹2,00,000">₹50,000 – ₹2,00,000</option>
                  <option value="₹2,00,000 – ₹10,00,000">₹2L – ₹10L</option>
                  <option value="₹10,00,000 – ₹50,00,000">₹10L – ₹50L</option>
                  <option value="₹50,00,000+">₹50L+</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  ⏱️ Timeline
                </label>
                <select name="timeline" value={form.timeline} onChange={handleChange} className="input-field">
                  <option value="3 months">3 months</option>
                  <option value="6 months">6 months</option>
                  <option value="1 year">1 year</option>
                  <option value="2 years">2 years</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  👤 Your Background
                </label>
                <select name="background" value={form.background} onChange={handleChange} className="input-field">
                  <option value="">Select background</option>
                  <option value="Student">Student</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Homemaker">Homemaker</option>
                  <option value="Existing Business Owner">Existing Business Owner</option>
                  <option value="First-time Entrepreneur">First-time Entrepreneur</option>
                  <option value="Freelancer">Freelancer</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f87171', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', fontSize: '15px' }}>
              {loading ? '⏳ Generating your business plan...' : '🚀 Generate Business Plan'}
            </button>
          </form>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>📋</div>
            <div style={{ color: '#9ca3af', fontSize: '16px' }}>AI is crafting your business plan...</div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '8px' }}>This takes 10–20 seconds</div>
          </div>
        )}

        {/* Plan output */}
        {plan && !loading && (
          <div className="anim-fade-up">
            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f3f4f6', margin: 0 }}>
                  📋 Your Business Plan
                </h2>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                  {form.idea} · {form.city || 'India'} · {form.budget || 'Bootstrap'}
                </div>
              </div>
              <button onClick={handlePrint} className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #3b82f640', background: '#3b82f615', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                🖨️ Download as PDF
              </button>
            </div>

            {/* Sections */}
            {SECTIONS.map(({ key, label, icon }) => {
              const content = sections[key];
              if (!content) return null;
              const isOpen = openSections[key];
              return (
                <div key={key} className="card print-section" style={{ marginBottom: '12px', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleSection(key)}
                    className="no-print"
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f3f4f6' }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{icon}</span> {label.replace(/^[^\s]+\s/, '')}
                    </span>
                    <span style={{ color: '#3b82f6', fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </button>
                  {/* Always visible in print */}
                  <div style={{ display: isOpen ? 'block' : 'none', padding: '0 24px 24px' }} className="print-always-show">
                    <div style={{ borderTop: '1px solid #1e2535', paddingTop: '16px' }}>
                      {renderMarkdown(content)}
                    </div>
                  </div>
                  {/* Print-only version */}
                  <style>{`.print-always-show { display: block !important; }`}</style>
                </div>
              );
            })}

            {/* If no sections parsed, show raw */}
            {Object.keys(sections).length === 1 && sections.executive_summary === plan && (
              <div className="card" style={{ padding: '24px' }}>
                {renderMarkdown(plan)}
              </div>
            )}

            <div className="no-print" style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '700', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
                🖨️ Download as PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
