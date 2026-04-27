import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import LoginDialog from '../components/LoginDialog';

export default function ReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [submitForm, setSubmitForm] = useState({ rating: 0, review: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reviews');
      const data = await res.json();
      setReviews(data.reviews);
      setAvg(data.avg);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
    setLoading(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }
    setSubmitting(true);
    try {
      await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: submitForm.rating, name: user.name, review: submitForm.review }),
      });
      setSubmitForm({ rating: 0, review: '' });
      fetchReviews(); // Refresh reviews
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
    setSubmitting(false);
  };

  return (
    <>
      <Head>
        <title>User Reviews — BizScope AI</title>
        <meta name="description" content="See what entrepreneurs say about BizScope AI" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontWeight: '700', fontSize: '18px' }}>💬 User Reviews</h1>
          <a href="/" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>← Back Home</a>
        </nav>
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading reviews...</div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>⭐</div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{avg} / 5</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Based on {total} reviews</div>
              </div>

              {/* Submit Review Section */}
              <div style={{ marginBottom: '40px', padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Share Your Feedback</h3>
                {user ? (
                  <form onSubmit={handleSubmitReview}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Rating</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1,2,3,4,5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSubmitForm({ ...submitForm, rating: s })}
                            style={{
                              fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer',
                              color: s <= submitForm.rating ? '#fbbf24' : '#d1d5db'
                            }}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="Tell us about your experience..."
                      value={submitForm.review}
                      onChange={(e) => setSubmitForm({ ...submitForm, review: e.target.value })}
                      rows={4}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                        background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', resize: 'none', marginBottom: '16px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !submitForm.rating}
                      style={{
                        padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px'
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                      Sign in to share your feedback and help improve BizScope.
                    </p>
                    <button
                      onClick={() => setShowLogin(true)}
                      style={{
                        padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px'
                      }}
                    >
                      Sign In to Review
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {reviews.map((r, i) => (
                  <div key={i} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>{r.name}</div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: '14px', color: s <= r.rating ? '#fbbf24' : '#d1d5db' }}>⭐</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text)' }}>{r.review}</div>
                  </div>
                ))}
              </div>
              {reviews.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No reviews yet. Be the first to share your experience!</div>
              )}
            </>
          )}
        </div>
      </div>
      {showLogin && <LoginDialog onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
    </>
  );
}