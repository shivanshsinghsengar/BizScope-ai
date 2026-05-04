import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import API_URL from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SKILLS_OPTIONS = ['Tech / Engineering', 'Business Development', 'Marketing', 'Design / UI-UX', 'Finance / Accounting', 'Sales', 'Operations', 'Legal', 'Content / Writing', 'Product Management'];
const LOOKING_FOR_OPTIONS = ['Tech Co-founder', 'Business Co-founder', 'Marketing Co-founder', 'Design Co-founder', 'Operations Co-founder'];
const IDEA_STAGES = ['Just an idea', 'Validated concept', 'MVP built', 'Early revenue', 'Scaling'];
const COMMITMENT_LEVELS = ['Part-time (weekends)', 'Part-time (evenings)', 'Full-time ready', 'Full-time (already quit job)'];

const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kochi', 'Chandigarh', 'Indore', 'Bhopal', 'Remote / Anywhere'];

export default function CofounderPage() {
  const { user, token } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ city: 'all', commitment: 'all', lookingFor: 'all' });

  const [form, setForm] = useState({
    name: '',
    city: '',
    skills: [],
    lookingFor: '',
    ideaStage: '',
    commitment: '',
    bio: '',
    whatsapp: '',
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cofounder`);
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillToggle = (skill) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city || !form.lookingFor || !form.commitment) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cofounder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create profile');
      setSuccess(true);
      setShowForm(false);
      setForm({ name: '', city: '', skills: [], lookingFor: '', ideaStage: '', commitment: '', bio: '', whatsapp: '' });
      fetchProfiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnect = (profile) => {
    const msg = encodeURIComponent(
      `Hi ${profile.name}! I found your co-founder profile on BizScope AI. I'm looking for a ${profile.lookingFor} co-founder too. Would love to connect and explore if we're a good fit! 🚀`
    );
    const phone = profile.whatsapp?.replace(/[^0-9]/g, '');
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${msg}`, '_blank');
    } else {
      alert('This person hasn\'t shared their WhatsApp. Try reaching out through other means.');
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (filters.city !== 'all' && p.city !== filters.city) return false;
    if (filters.commitment !== 'all' && p.commitment !== filters.commitment) return false;
    if (filters.lookingFor !== 'all' && p.lookingFor !== filters.lookingFor) return false;
    return true;
  });

  const stageColors = {
    'Just an idea': '#6b7280',
    'Validated concept': '#3b82f6',
    'MVP built': '#8b5cf6',
    'Early revenue': '#f59e0b',
    'Scaling': '#34d399',
  };

  return (
    <Layout>
      <Head>
        <title>Co-founder Matcher — BizScope AI</title>
        <meta name="description" content="Find your perfect co-founder. Browse profiles and connect with entrepreneurs in your city." />
      </Head>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '36px' }}>🤝</div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f3f4f6', margin: 0 }}>Co-founder Matcher</h1>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: '4px 0 0' }}>Find your perfect co-founder. No login required to browse.</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary" style={{ padding: '12px 24px' }}>
            {showForm ? '✕ Cancel' : '➕ Create My Profile'}
          </button>
        </div>

        {/* Success banner */}
        {success && (
          <div style={{ background: '#34d39915', border: '1px solid #34d39930', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', color: '#34d399', fontSize: '14px', fontWeight: '600' }}>
            ✅ Your profile is live! Other founders can now find and connect with you.
            <button onClick={() => setSuccess(false)} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Create profile form */}
        {showForm && (
          <div className="card anim-fade-up" style={{ padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f3f4f6', marginBottom: '24px' }}>📝 Create Your Co-founder Profile</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>👤 Your Name *</label>
                  <input name="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" className="input-field" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>📍 City *</label>
                  <select name="city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field" required>
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>🔍 Looking For *</label>
                  <select name="lookingFor" value={form.lookingFor} onChange={e => setForm(f => ({ ...f, lookingFor: e.target.value }))} className="input-field" required>
                    <option value="">Select role</option>
                    {LOOKING_FOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>📈 Idea Stage</label>
                  <select name="ideaStage" value={form.ideaStage} onChange={e => setForm(f => ({ ...f, ideaStage: e.target.value }))} className="input-field">
                    <option value="">Select stage</option>
                    {IDEA_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>⏰ Commitment Level *</label>
                  <select name="commitment" value={form.commitment} onChange={e => setForm(f => ({ ...f, commitment: e.target.value }))} className="input-field" required>
                    <option value="">Select commitment</option>
                    {COMMITMENT_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>📱 WhatsApp Number (optional)</label>
                  <input name="whatsapp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="e.g. 9876543210" className="input-field" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600' }}>🛠️ Your Skills</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {SKILLS_OPTIONS.map(skill => (
                      <button type="button" key={skill} onClick={() => handleSkillToggle(skill)}
                        style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${form.skills.includes(skill) ? '#3b82f6' : '#2d3748'}`, background: form.skills.includes(skill) ? '#3b82f620' : 'transparent', color: form.skills.includes(skill) ? '#3b82f6' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>💬 Short Bio (optional)</label>
                  <textarea name="bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell potential co-founders about your idea, background, and what you're building..." className="input-field" rows={3} style={{ resize: 'vertical' }} />
                </div>
              </div>

              {error && (
                <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f87171', fontSize: '14px' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', fontSize: '15px' }}>
                {submitting ? '⏳ Creating profile...' : '🚀 Publish My Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card anim-fade-up delay-1" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '600' }}>Filter:</span>
            <select value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} className="input-field" style={{ width: 'auto', padding: '8px 12px' }}>
              <option value="all">All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.lookingFor} onChange={e => setFilters(f => ({ ...f, lookingFor: e.target.value }))} className="input-field" style={{ width: 'auto', padding: '8px 12px' }}>
              <option value="all">All Roles</option>
              {LOOKING_FOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filters.commitment} onChange={e => setFilters(f => ({ ...f, commitment: e.target.value }))} className="input-field" style={{ width: 'auto', padding: '8px 12px' }}>
              <option value="all">All Commitments</option>
              {COMMITMENT_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: 'auto' }}>
              {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Profiles grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🤝</div>
            Loading profiles...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
            <div style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {profiles.length === 0 ? 'Be the first to create a profile!' : 'No profiles match your filters'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
              {profiles.length === 0 ? 'Create your co-founder profile and start connecting with entrepreneurs.' : 'Try adjusting the filters above.'}
            </div>
            {profiles.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary">➕ Create My Profile</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredProfiles.map((profile, i) => (
              <div key={profile.id} className="card anim-fade-up" style={{ padding: '24px', animationDelay: `${i * 0.04}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {profile.name?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#f3f4f6' }}>{profile.name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>📍 {profile.city}</div>
                    </div>
                  </div>
                  {profile.ideaStage && (
                    <span style={{ padding: '4px 10px', borderRadius: '100px', background: `${stageColors[profile.ideaStage] || '#6b7280'}20`, border: `1px solid ${stageColors[profile.ideaStage] || '#6b7280'}40`, color: stageColors[profile.ideaStage] || '#6b7280', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      {profile.ideaStage}
                    </span>
                  )}
                </div>

                {profile.bio && (
                  <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {profile.bio}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>LOOKING FOR</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', background: '#3b82f615', border: '1px solid #3b82f630', color: '#3b82f6', fontSize: '13px', fontWeight: '600' }}>
                    🔍 {profile.lookingFor}
                  </div>
                </div>

                {profile.skills?.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>SKILLS</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills).slice(0, 4).map(skill => (
                        <span key={skill} style={{ padding: '3px 10px', borderRadius: '100px', background: '#1c2130', border: '1px solid #2d3748', color: '#9ca3af', fontSize: '11px' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    ⏰ {profile.commitment}
                  </div>
                  <button onClick={() => handleConnect(profile)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                    💬 Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: '40px', background: '#3b82f608', border: '1px solid #3b82f620', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>🔒 Privacy Note</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.7' }}>
            Profiles are public and visible to everyone. Your WhatsApp number is only used for the Connect button — it's not displayed publicly. You can request profile removal by contacting support.
          </div>
        </div>
      </div>
    </Layout>
  );
}
