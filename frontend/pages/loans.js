import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

const SCHEMES = [
  {
    id: 'mudra',
    name: 'MUDRA Loan',
    fullName: 'Pradhan Mantri MUDRA Yojana',
    icon: '🏦',
    maxAmount: '₹10 Lakh',
    maxAmountNum: 1000000,
    interestRate: '8.5% – 12% p.a.',
    description: 'Micro-finance loans for non-corporate, non-farm small/micro enterprises. Three tiers: Shishu (up to ₹50K), Kishor (₹50K–5L), Tarun (₹5L–10L).',
    applyLink: 'https://www.mudra.org.in',
    eligibility: {
      minAge: 18,
      maxAge: 65,
      businessTypes: ['all'],
      maxInvestment: 1000000,
      employmentStatus: ['self-employed', 'business-owner', 'unemployed'],
    },
    tags: ['No collateral', 'All business types', 'Quick approval'],
  },
  {
    id: 'svanidhii',
    name: 'PM SVANidhi',
    fullName: 'PM Street Vendor\'s AtmaNirbhar Nidhi',
    icon: '🛒',
    maxAmount: '₹50,000',
    maxAmountNum: 50000,
    interestRate: '7% p.a. (subsidized)',
    description: 'Working capital loans for street vendors. Start with ₹10,000, scale up to ₹50,000 with timely repayment. Digital transactions rewarded.',
    applyLink: 'https://pmsvanidhi.mohua.gov.in',
    eligibility: {
      minAge: 18,
      maxAge: 65,
      businessTypes: ['street-vendor', 'retail', 'food'],
      maxInvestment: 100000,
      employmentStatus: ['self-employed', 'unemployed'],
    },
    tags: ['Street vendors', 'Interest subsidy', 'Digital rewards'],
  },
  {
    id: 'pmegp',
    name: 'PMEGP',
    fullName: 'Prime Minister\'s Employment Generation Programme',
    icon: '🏭',
    maxAmount: '₹50 Lakh',
    maxAmountNum: 5000000,
    interestRate: '11% – 12% p.a.',
    description: 'Subsidy-linked loan for setting up new micro-enterprises. 15–35% government subsidy on project cost. Manufacturing up to ₹50L, services up to ₹20L.',
    applyLink: 'https://www.kviconline.gov.in/pmegpeportal',
    eligibility: {
      minAge: 18,
      maxAge: 45,
      businessTypes: ['manufacturing', 'services', 'food', 'retail'],
      maxInvestment: 5000000,
      employmentStatus: ['unemployed', 'self-employed'],
    },
    tags: ['15–35% subsidy', 'New enterprises', 'Manufacturing & services'],
  },
  {
    id: 'startup-seed',
    name: 'Startup India Seed Fund',
    fullName: 'Startup India Seed Fund Scheme',
    icon: '🚀',
    maxAmount: '₹20 Lakh',
    maxAmountNum: 2000000,
    interestRate: '0% (grant/convertible note)',
    description: 'Seed funding for DPIIT-recognized startups for proof of concept, prototype development, and market entry. Disbursed through incubators.',
    applyLink: 'https://seedfund.startupindia.gov.in',
    eligibility: {
      minAge: 18,
      maxAge: 45,
      businessTypes: ['tech', 'startup', 'innovation'],
      maxInvestment: 10000000,
      employmentStatus: ['self-employed', 'business-owner'],
    },
    tags: ['DPIIT recognized', 'Grant/equity', 'Tech startups'],
  },
  {
    id: 'cgtmse',
    name: 'CGTMSE',
    fullName: 'Credit Guarantee Fund Trust for Micro and Small Enterprises',
    icon: '🛡️',
    maxAmount: '₹2 Crore',
    maxAmountNum: 20000000,
    interestRate: '9% – 14% p.a.',
    description: 'Collateral-free credit guarantee for MSMEs. Banks provide loans without collateral; government guarantees up to 85% of the loan amount.',
    applyLink: 'https://www.cgtmse.in',
    eligibility: {
      minAge: 21,
      maxAge: 65,
      businessTypes: ['manufacturing', 'services', 'retail', 'food', 'tech'],
      maxInvestment: 20000000,
      employmentStatus: ['self-employed', 'business-owner'],
    },
    tags: ['No collateral', 'Up to ₹2 Cr', 'All MSMEs'],
  },
  {
    id: 'standup',
    name: 'Stand-Up India',
    fullName: 'Stand-Up India Scheme',
    icon: '💪',
    maxAmount: '₹1 Crore',
    maxAmountNum: 10000000,
    interestRate: 'Base rate + 3% p.a.',
    description: 'Bank loans for SC/ST and women entrepreneurs for greenfield enterprises in manufacturing, services, or trading. At least one loan per bank branch.',
    applyLink: 'https://www.standupmitra.in',
    eligibility: {
      minAge: 18,
      maxAge: 65,
      businessTypes: ['manufacturing', 'services', 'retail', 'food'],
      maxInvestment: 10000000,
      employmentStatus: ['unemployed', 'self-employed'],
      special: ['sc-st', 'women'],
    },
    tags: ['SC/ST & Women', 'Greenfield only', 'Up to ₹1 Cr'],
  },
];

const BUSINESS_TYPES = [
  { value: 'food', label: '🍽️ Food & Catering' },
  { value: 'retail', label: '🛍️ Retail / Shop' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },
  { value: 'services', label: '🔧 Services' },
  { value: 'tech', label: '💻 Tech / Startup' },
  { value: 'street-vendor', label: '🛒 Street Vendor' },
];

function getEligibility(scheme, form) {
  const age = parseInt(form.age) || 0;
  const investment = parseInt(form.investment?.replace(/[^0-9]/g, '')) || 0;
  const e = scheme.eligibility;

  let score = 0;
  let total = 0;

  // Age check
  total++;
  if (age >= e.minAge && age <= e.maxAge) score++;

  // Investment check
  total++;
  if (investment <= e.maxAmountNum) score++;

  // Business type check
  total++;
  if (e.businessTypes.includes('all') || e.businessTypes.includes(form.businessType)) score++;

  // Employment check
  total++;
  const empMap = { 'employed': 'self-employed', 'self-employed': 'self-employed', 'unemployed': 'unemployed', 'business-owner': 'business-owner' };
  const mappedEmp = empMap[form.employment] || form.employment;
  if (e.employmentStatus.includes(mappedEmp)) score++;

  const ratio = score / total;
  if (ratio >= 0.85) return 'eligible';
  if (ratio >= 0.5) return 'maybe';
  return 'not-eligible';
}

const eligibilityConfig = {
  eligible: { color: '#34d399', bg: '#34d39915', border: '#34d39930', label: '✅ Likely Eligible', icon: '🟢' },
  maybe: { color: '#fbbf24', bg: '#fbbf2415', border: '#fbbf2430', label: '⚠️ Possibly Eligible', icon: '🟡' },
  'not-eligible': { color: '#f87171', bg: '#f8717115', border: '#f8717130', label: '❌ May Not Qualify', icon: '🔴' },
};

export default function LoansPage() {
  const [form, setForm] = useState({ businessType: '', city: '', investment: '', age: '', employment: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const results = submitted
    ? SCHEMES.map(s => ({ ...s, eligibilityStatus: getEligibility(s, form) })).sort((a, b) => {
        const order = { eligible: 0, maybe: 1, 'not-eligible': 2 };
        return order[a.eligibilityStatus] - order[b.eligibilityStatus];
      })
    : [];

  return (
    <Layout>
      <Head>
        <title>Loan Eligibility Checker — BizScope AI</title>
        <meta name="description" content="Check your eligibility for government business loan schemes like MUDRA, PMEGP, and more." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f3f4f6', marginBottom: '10px' }}>
            Loan Eligibility Checker
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
            Find government loan schemes you qualify for — MUDRA, PMEGP, Startup India, and more.
          </p>
        </div>

        {/* Form */}
        <div className="card anim-fade-up delay-1" style={{ padding: '32px', marginBottom: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  🏢 Business Type *
                </label>
                <select name="businessType" value={form.businessType} onChange={handleChange} className="input-field" required>
                  <option value="">Select type</option>
                  {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  📍 City
                </label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Delhi, Chennai" className="input-field" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  💰 Investment Amount (₹) *
                </label>
                <input name="investment" value={form.investment} onChange={handleChange} placeholder="e.g. 500000" type="number" min="0" className="input-field" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  🎂 Your Age *
                </label>
                <input name="age" value={form.age} onChange={handleChange} placeholder="e.g. 28" type="number" min="18" max="80" className="input-field" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>
                  💼 Employment Status *
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'unemployed', label: '🔍 Unemployed / Looking to start' },
                    { value: 'self-employed', label: '🧑‍💼 Self-employed / Freelancer' },
                    { value: 'employed', label: '👔 Currently Employed' },
                    { value: 'business-owner', label: '🏪 Existing Business Owner' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: `1px solid ${form.employment === opt.value ? '#3b82f6' : '#2d3748'}`, background: form.employment === opt.value ? '#3b82f615' : 'transparent', cursor: 'pointer', fontSize: '13px', color: form.employment === opt.value ? '#3b82f6' : '#9ca3af', fontWeight: '500' }}>
                      <input type="radio" name="employment" value={opt.value} checked={form.employment === opt.value} onChange={handleChange} style={{ display: 'none' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
              🔍 Check Eligibility
            </button>
          </form>
        </div>

        {/* Results */}
        {submitted && (
          <div className="anim-fade-up">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f3f4f6', marginBottom: '6px' }}>
                📋 Matching Schemes
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: '#34d399' }}>🟢 {results.filter(r => r.eligibilityStatus === 'eligible').length} Likely eligible</span>
                <span style={{ color: '#fbbf24' }}>🟡 {results.filter(r => r.eligibilityStatus === 'maybe').length} Possibly eligible</span>
                <span style={{ color: '#f87171' }}>🔴 {results.filter(r => r.eligibilityStatus === 'not-eligible').length} May not qualify</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {results.map((scheme, i) => {
                const ec = eligibilityConfig[scheme.eligibilityStatus];
                return (
                  <div key={scheme.id} className="card anim-fade-up" style={{ padding: '24px', borderColor: ec.border, animationDelay: `${i * 0.05}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#1c2130', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                          {scheme.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '17px', fontWeight: '700', color: '#f3f4f6' }}>{scheme.name}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{scheme.fullName}</div>
                        </div>
                      </div>
                      <div style={{ padding: '8px 16px', borderRadius: '100px', background: ec.bg, border: `1px solid ${ec.border}`, color: ec.color, fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                        {ec.label}
                      </div>
                    </div>

                    <div style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '16px' }}>
                      {scheme.description}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ background: '#1c2130', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Max Amount</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>{scheme.maxAmount}</div>
                      </div>
                      <div style={{ background: '#1c2130', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Interest Rate</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#f3f4f6' }}>{scheme.interestRate}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {scheme.tags.map(tag => (
                        <span key={tag} style={{ padding: '4px 10px', borderRadius: '100px', background: '#3b82f610', border: '1px solid #3b82f625', color: '#3b82f6', fontSize: '12px', fontWeight: '600' }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <a href={scheme.applyLink} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
                      🔗 Apply on Official Portal
                    </a>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '32px', padding: '20px 24px', background: '#f59e0b08', border: '1px solid #f59e0b20', borderRadius: '16px' }}>
              <div style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '700', marginBottom: '6px' }}>⚠️ Important Note</div>
              <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.7' }}>
                Eligibility shown here is indicative only, based on general scheme criteria. Final approval depends on your credit history, business plan, and bank assessment. Always consult your nearest bank branch or SIDBI office for accurate guidance.
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
