import { useState, useEffect } from 'react';
import API_URL from '../utils/api';

const PROMPTS = [
  "You just analyzed a market — how was it? 🚀",
  "Was BizScope helpful for your business research?",
  "Quick question — did BizScope save you time today?",
];

export default function ReviewWidget() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('rating'); // rating | form | done
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  useEffect(() => {
    // Show after 20s on first visit, or after analysis (triggered externally)
    const shown = sessionStorage.getItem('review_shown');
    if (shown) return;
    const t = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem('review_shown', '1');
    }, 20000);
    return () => clearTimeout(t);
  }, []);

  // Listen for manual trigger after analysis
  useEffect(() => {
    const handler = () => {
      const shown = sessionStorage.getItem('review_shown');
      if (!shown) { setShow(true); sessionStorage.setItem('review_shown', '1'); }
    };
    window.addEventListener('bizscope_trigger_review', handler);
    return () => window.removeEventListener('bizscope_trigger_review', handler);
  }, []);

  const handleRating = (r) => {
    setRating(r);
    setTimeout(() => setStep('form'), 300);
  };

  const handleSubmit = async () => {
    if (!rating || !email) return;
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, email: email.trim(), review: description.trim() }),
      });
    } catch (_) {}
    setStep('done');
    setSubmitting(false);
    setTimeout(() => setShow(false), 3000);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setShow(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} />

      {/* Widget */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 8001,
        width: '340px', background: 'var(--surface)',
        border: '1px solid var(--border2)', borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(200,240,58,0.1)',
        overflow: 'hidden', animation: 'slideInRight 0.4s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Top accent */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #c8f03a, #ef4444)' }} />

        <div style={{ padding: '24px' }}>
          {/* Close */}
          <button onClick={() => setShow(false)}
            style={{ position: 'absolute', top: '16px', right: '16px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>

          {step === 'rating' && (
            <>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⭐</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>{prompt}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>Rate your experience with BizScope AI</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s}
                    onClick={() => handleRating(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    style={{ fontSize: '32px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s', transform: (hover || rating) >= s ? 'scale(1.2)' : 'scale(1)', filter: (hover || rating) >= s ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                    ⭐
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
                {hover === 1 ? 'Poor' : hover === 2 ? 'Fair' : hover === 3 ? 'Good' : hover === 4 ? 'Great' : hover === 5 ? 'Excellent! 🎉' : 'Tap a star'}
              </div>
            </>
          )}

          {step === 'form' && (
            <>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ fontSize: '20px', filter: rating >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                ))}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>
                {rating >= 4 ? 'Awesome! Tell others about it 🙌' : 'Thanks for the feedback!'}
              </div>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                type="email"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px', marginBottom: '10px', outline: 'none' }} />
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Tell us your feedback..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '14px' }} />
              <button onClick={handleSubmit} disabled={submitting || !email}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', color: '#0a0f0a', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Thank you!</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Your review helps other entrepreneurs find BizScope.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
