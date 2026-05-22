import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

const COMMANDS = [
  { id: 'home',         icon: '🏠', label: 'Go to Home',            shortcut: 'H',  href: '/' },
  { id: 'analysis',     icon: '📊', label: 'Open Dashboard',        shortcut: 'D',  href: '/analysis' },
  { id: 'competitors',  icon: '🏪', label: 'View Competitors',      shortcut: 'C',  href: '/competitors' },
  { id: 'insights',     icon: '🤖', label: 'AI Insights',           shortcut: 'I',  href: '/insights' },
  { id: 'properties',   icon: '🏢', label: 'Find Properties',       shortcut: 'P',  href: '/properties' },
  { id: 'trends',       icon: '📈', label: 'Market Trends',         shortcut: 'T',  href: '/trends' },
  { id: 'map',          icon: '🗺️', label: 'Interactive Map',       shortcut: 'M',  href: '/map' },
  { id: 'saved',        icon: '🔖', label: 'Saved Searches',        shortcut: 'S',  href: '/saved' },
  { id: 'strategy',     icon: '♟️', label: 'Strategy Planner',      shortcut: null, href: '/strategy' },
  { id: 'sparks',       icon: '⚡', label: 'SparkLab Ideas',        shortcut: null, href: '/sparks' },
  { id: 'bizplan',      icon: '📋', label: 'Business Plan Builder', shortcut: null, href: '/business-plan' },
  { id: 'franchises',   icon: '🏬', label: 'Franchise Finder',      shortcut: null, href: '/franchises' },
  { id: 'loans',        icon: '💰', label: 'Business Loans',        shortcut: null, href: '/loans' },
  { id: 'cofounder',    icon: '🤝', label: 'Find Co-founder',       shortcut: null, href: '/cofounder' },
  { id: 'list',         icon: '➕', label: 'List Your Business',    shortcut: null, href: '/list-business' },
  { id: 'pricing',      icon: '💎', label: 'Pricing Plans',         shortcut: null, href: '/pricing' },
  { id: 'docs',         icon: '📖', label: 'Documentation',         shortcut: null, href: '/docs' },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = query.trim()
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = useCallback((href) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        navigate(filtered[activeIdx].href);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, activeIdx, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px' }}>
          <span style={{ fontSize: '18px', opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, features..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            style={{ flex: 1, padding: '18px 0' }}
          />
          <kbd style={{ fontSize: '11px', color: 'var(--muted2)', background: 'var(--surface2)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border2)', fontFamily: 'monospace' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              No results for "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                className={`cmd-item${i === activeIdx ? ' active' : ''}`}
                onClick={() => navigate(cmd.href)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="cmd-item-icon">{cmd.icon}</div>
                <span style={{ flex: 1 }}>{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="cmd-shortcut">{cmd.shortcut}</kbd>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted2)' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
          <span style={{ marginLeft: 'auto' }}>Ctrl+K to open anytime</span>
        </div>
      </div>
    </div>
  );
}
