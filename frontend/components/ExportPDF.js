import { useState } from 'react';

export default function ExportPDF({ data, onExported }) {
  const [loading, setLoading] = useState(false);

  const exportPDF = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; // A4 width
      let y = 20;

      const addText = (text, x, size = 11, style = 'normal', color = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.setTextColor(...color);
        doc.text(String(text), x, y);
      };

      const newLine = (gap = 7) => { y += gap; };
      const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } };

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, W, 30, 'F');
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('BizScope AI — Market Analysis Report', 14, 18);
      y = 40;

      // Location
      addText(`📍 Location: ${data.location?.displayName?.split(',').slice(0, 3).join(', ')}`, 14, 12, 'bold', [79, 70, 229]);
      newLine(6);
      addText(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 10, 'normal', [100, 100, 100]);
      newLine(10);

      // Summary stats
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, y - 4, W - 28, 22, 3, 3, 'F');
      addText(`Total Businesses: ${data.businesses?.length}`, 20, 11, 'bold');
      addText(`Categories: ${data.categoryStats?.length}`, 80, 11, 'bold');
      addText(`Best Opportunity: ${data.categoryStats?.[data.categoryStats.length - 1]?.category}`, 130, 11, 'bold', [16, 185, 129]);
      newLine(8);
      addText(`Most Competitive: ${data.categoryStats?.[0]?.category}`, 20, 11, 'normal', [239, 68, 68]);
      newLine(16);

      // Data quality summary
      if (data.dataQuality?.usesMockData || data.dataQuality?.hasEstimatedMetrics) {
        doc.setFillColor(255, 247, 237);
        doc.roundedRect(14, y - 4, W - 28, 16, 3, 3, 'F');
        addText('Data Quality Notice:', 18, 10, 'bold', [180, 83, 9]);
        newLine(5);
        const qualityText = data.dataQuality?.usesMockData
          ? 'Some entries are fallback data; ratings/reviews may include estimates.'
          : 'Ratings/reviews may include estimates where providers do not expose metrics.';
        addText(qualityText, 18, 9, 'normal', [120, 113, 108]);
        newLine(11);
      }

      // Category breakdown
      addText('Market Category Breakdown', 14, 14, 'bold', [30, 30, 30]);
      newLine(8);

      // Table header
      doc.setFillColor(79, 70, 229);
      doc.rect(14, y - 5, W - 28, 8, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('Category', 18, y);
      doc.text('Count', 70, y);
      doc.text('Avg Rating', 95, y);
      doc.text('Risk Level', 130, y);
      doc.text('Risk Score', 165, y);
      newLine(10);

      data.categoryStats?.forEach((s, i) => {
        checkPage();
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 5, W - 28, 8, 'F');
        }
        const riskColor = s.riskLevel === 'Low' ? [16, 185, 129] : s.riskLevel === 'Medium' ? [245, 158, 11] : [239, 68, 68];
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        doc.text(s.category, 18, y);
        doc.text(String(s.count), 70, y);
        doc.text(String(s.avgRating), 95, y);
        doc.setTextColor(...riskColor);
        doc.text(s.riskLevel, 130, y);
        doc.setTextColor(30, 30, 30);
        doc.text(`${s.riskScore}/100`, 165, y);
        newLine(9);
      });

      newLine(6);
      checkPage();

      // AI Suggestions
      if (data.aiSuggestions && data.aiSuggestions !== 'Generating AI recommendations...' && data.aiSuggestions !== 'AI suggestions unavailable (no OpenAI key set).') {
        addText('AI Business Recommendations', 14, 14, 'bold', [30, 30, 30]);
        newLine(8);
        doc.setFillColor(245, 247, 250);
        const aiLines = doc.splitTextToSize(data.aiSuggestions, W - 30);
        const blockH = Math.min(aiLines.length * 5 + 10, 80);
        doc.roundedRect(14, y - 4, W - 28, blockH, 3, 3, 'F');
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
        aiLines.slice(0, 15).forEach(line => {
          checkPage();
          doc.text(line, 18, y);
          newLine(5);
        });
        newLine(6);
      }

      // Top businesses
      checkPage();
      addText('Top Businesses in Area', 14, 14, 'bold', [30, 30, 30]);
      newLine(8);
      data.businesses?.slice(0, 15).forEach((b, i) => {
        checkPage();
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text(`${i + 1}. ${b.name}`, 18, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text(`${b.category} · ⭐${b.rating} · ${b.address?.slice(0, 40)}`, 18, y + 4);
        newLine(10);
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`BizScope AI Report · Page ${i} of ${pageCount} · bizscope.ai`, 14, 290);
      }

      const filename = `BizScope_${data.location?.displayName?.split(',')[0]?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      if (onExported) onExported(filename);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('PDF export failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <button onClick={exportPDF} disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #4f46e540', background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, #4f46e510, #7c3aed10)', color: loading ? 'var(--muted)' : '#a78bfa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e520, #7c3aed20)'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e510, #7c3aed10)'; }}
    >
      {loading ? '⏳ Generating...' : '📄 Export PDF Report'}
    </button>
  );
}
