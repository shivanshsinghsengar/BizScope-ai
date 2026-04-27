import Head from 'next/head';
import { useState } from 'react';
import API_URL from '../utils/api';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#10b981', Gym: '#3b82f6',
  Salon: '#ec4899', Pharmacy: '#06b6d4', Bakery: '#f97316', Laundry: '#6366f1',
  Hospital: '#ef4444', Clothing: '#a855f7', Electronics: '#0ea5e9',
  Hardware: '#78716c', Furniture: '#d97706', Education: '#14b8a6',
  Jewellery: '#eab308', Automotive: '#64748b', Finance: '#22c55e',
  Hotel: '#0ea5e9', Hospitality: '#f43f5e', Retail: '#8b5cf6', Wholesale: '#0891b2',
  Office: '#6366f1', Other: '#64748b',
};

export default function BusinessPlan() {
  const data = useAnalysis();
  const { user, token } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const generatePlan = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/business-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: data.location?.displayName,
          categoryStats: data.categoryStats,
          selectedBusiness,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      const result = await res.json();
      setPlan(result.plan);
      trackEvent('business_plan_generated', { business: selectedBusiness });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Business Plan Generator — BizScope AI</title>
        <meta name="description" content="Generate detailed business plans for your startup ideas" />
      </Head>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text)' }}>
          Business Plan Generator
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Get a comprehensive business plan tailored to your selected business type and location.
        </p>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>Select Business Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {data.categoryStats?.map(stat => (
              <button
                key={stat.category}
                onClick={() => setSelectedBusiness(stat.category)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${selectedBusiness === stat.category ? categoryColors[stat.category] || '#6366f1' : 'var(--border)'}`,
                  borderRadius: '8px',
                  background: selectedBusiness === stat.category ? `${categoryColors[stat.category] || '#6366f1'}20` : 'var(--background)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: '600' }}>{stat.category}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {stat.count} businesses • Score: {stat.competitorScore?.toFixed(1)}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={generatePlan}
            disabled={!selectedBusiness || loading}
            style={{
              padding: '12px 24px',
              background: selectedBusiness ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedBusiness && !loading ? 'pointer' : 'not-allowed',
              fontWeight: '600',
            }}
          >
            {loading ? 'Generating Plan...' : 'Generate Business Plan'}
          </button>
          {error && <p style={{ color: '#ef4444', marginTop: '12px' }}>{error}</p>}
        </div>

        {plan && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>Your Business Plan</h2>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text)' }}>
              {plan}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}