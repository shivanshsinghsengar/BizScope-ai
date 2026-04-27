import { useState, useEffect } from 'react';

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
      await fetch('http://localhost:5000/api/reviews', {
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
            </>
          )}

          {step === 'form' && (
            <>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>📝</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Thanks for the rating!</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Help us improve — share your thoughts</div>
              <input
                type="email"
                placeholder="Your email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <textarea
                placeholder="Any feedback or suggestions?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', resize: 'none' }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !rating}
                style={{ width: '100%', padding: '12px', background: rating >= 4 ? '#10b981' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎉</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Thank you!</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Your feedback helps us improve BizScope AI</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}