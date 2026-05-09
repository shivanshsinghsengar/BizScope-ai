/**
 * MarketChat — AI conversation mode for the analysis dashboard.
 * Users ask follow-up questions about their market data.
 * Powered by Gemini / GPT with full market context injected.
 */
import { useState, useRef, useEffect } from 'react';
import API_URL from '../utils/api';

const SUGGESTED_QUESTIONS = [
  'What\'s the best business to open here?',
  'Which category should I avoid?',
  'How much can I earn from a cafe here?',
  'What if I open a gym instead?',
  'Who is my biggest threat?',
  'What\'s the best location in this area?',
  'How do I beat the top competitor?',
  'Is this a good time to invest here?',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '10px',
      alignItems: 'flex-start',
      marginBottom: '16px',
      animation: 'fadeInUp 0.3s ease both',
    }}>
      {/* Avatar */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #4f8ef7, #2563eb)'
          : 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', boxShadow: isUser ? '0 2px 8px rgba(79,142,247,0.4)' : '0 2px 8px rgba(16,185,129,0.4)',
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background: isUser
          ? 'linear-gradient(135deg, #4f8ef7, #2563eb)'
          : 'var(--surface2)',
        border: isUser ? 'none' : '1px solid var(--border2)',
        color: isUser ? '#ffffff' : 'var(--text)',
        fontSize: '13.5px',
        lineHeight: '1.65',
        boxShadow: isUser
          ? '0 4px 16px rgba(79,142,247,0.3)'
          : '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        {/* Render markdown-lite: bold, bullets */}
        {msg.content.split('\n').map((line, i) => {
          if (!line.trim()) return <br key={i} />;
          // Bold: **text**
          const parts = line.split(/\*\*(.*?)\*\*/g);
          const rendered = parts.map((p, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: isUser ? '#fff' : 'var(--text)', fontWeight: '700' }}>{p}</strong>
              : p
          );
          // Bullet
          if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <span style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--accent)', flexShrink: 0, marginTop: '1px' }}>•</span>
                <span>{rendered}</span>
              </div>
            );
          }
          return <div key={i} style={{ marginBottom: '3px' }}>{rendered}</div>;
        })}

        {/* Timestamp */}
        <div style={{ fontSize: '10px', color: isUser ? 'rgba(255,255,255,0.55)' : 'var(--muted2)', marginTop: '6px', textAlign: isUser ? 'right' : 'left' }}>
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function MarketChat({ data, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your **BizScope AI** assistant. I have full access to your **${data?.location?.displayName?.split(',')[0] || 'market'}** analysis data.\n\nAsk me anything — best business to open, which categories to avoid, profit estimates, competitor weaknesses, or location strategy.`,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Build market context from analysis data
  const marketContext = {
    location: data?.location?.displayName || '',
    totalBusinesses: data?.businesses?.length || 0,
    topCategory: data?.categoryStats?.[0]?.category || 'N/A',
    bestOpportunity: data?.categoryStats?.[data?.categoryStats?.length - 1]?.category || 'N/A',
    viabilityScore: data?.viabilityScore || 0,
    categories: data?.categoryStats || [],
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setError('');

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/market-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          marketContext,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: json.reply,
        timestamp: json.timestamp || new Date().toISOString(),
      }]);
    } catch (e) {
      setError(e.message || 'Failed to get response. Try again.');
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glow-pulse"
        style={{
          position: 'fixed', bottom: '80px', right: '24px', zIndex: 500,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff', fontSize: '14px', fontWeight: '700',
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 8px 32px rgba(16,185,129,0.45)',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <span style={{ fontSize: '18px' }}>🤖</span>
        Ask AI about this market
        <span style={{
          background: 'rgba(255,255,255,0.2)', borderRadius: '100px',
          padding: '2px 8px', fontSize: '11px', fontWeight: '800',
        }}>NEW</span>
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 500,
      width: '400px', maxWidth: 'calc(100vw - 32px)',
      background: 'var(--surface)',
      border: '1px solid var(--border3)',
      borderRadius: '24px',
      boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'scaleIn 0.2s cubic-bezier(.16,1,.3,1)',
      maxHeight: '80vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '16px 18px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
          flexShrink: 0,
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>BizScope AI Chat</div>
          <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live market data loaded · {data?.location?.displayName?.split(',')[0]}
          </div>
        </div>
        <button onClick={() => setOpen(false)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: '200px', maxHeight: '420px' }}>
        {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
              <TypingDots />
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions (only at start) */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--muted2)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Try asking:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{
                  padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border2)',
                  background: 'var(--surface2)', color: 'var(--text2)', fontSize: '11px',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: '500',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your market..."
          rows={1}
          style={{
            flex: 1, background: 'var(--surface2)', border: '1px solid var(--border2)',
            borderRadius: '12px', padding: '10px 14px', color: 'var(--text)',
            fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'none',
            outline: 'none', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#10b981'}
          onBlur={e => e.target.style.borderColor = 'var(--border2)'}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            width: '38px', height: '38px', borderRadius: '12px', border: 'none',
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'var(--surface3)',
            color: input.trim() && !loading ? '#ffffff' : 'var(--muted2)',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
            transition: 'all 0.2s',
            boxShadow: input.trim() && !loading ? '0 4px 12px rgba(16,185,129,0.4)' : 'none',
          }}>
          {loading ? '⏳' : '↑'}
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 16px 10px', textAlign: 'center', fontSize: '10px', color: 'var(--muted2)', flexShrink: 0 }}>
        Powered by Gemini AI · Context: {marketContext.totalBusinesses} businesses in {data?.location?.displayName?.split(',')[0]}
      </div>
    </div>
  );
}
