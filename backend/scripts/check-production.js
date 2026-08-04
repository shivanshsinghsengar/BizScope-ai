// Direct production API check for Mathura
const axios = require('axios');

const PROD_URL = 'https://bizscope-ai-og.onrender.com';

(async () => {
  console.log('\n🔍 Checking production API for Mathura...\n');

  try {
    // Use SSE stream endpoint — this is what the app uses
    const res = await axios.get(`${PROD_URL}/api/analyze-stream`, {
      params: { location: 'Mathura, Uttar Pradesh', nocache: '1' },
      headers: { Accept: 'text/event-stream' },
      responseType: 'text',
      timeout: 90000, // 90s for full analysis
    });

    const lines = res.data.split('\n').filter(l => l.startsWith('data:'));
    let finalResult = null;

    for (const line of lines) {
      try {
        const json = JSON.parse(line.replace('data:', '').trim());
        if (json.step === 'result') finalResult = json.data;
        else if (json.step && json.message) {
          console.log(`  [${json.step}] ${json.message}${json.sub ? ' — ' + json.sub : ''}`);
        }
      } catch (_) {}
    }

    if (finalResult) {
      const biz = finalResult.businesses || [];
      const cats = finalResult.categoryStats || [];
      const dq = finalResult.dataQuality || {};

      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║         MATHURA PRODUCTION RESULTS          ║');
      console.log('╚══════════════════════════════════════════════╝\n');
      console.log(`📍 Location: ${finalResult.location?.displayName}`);
      console.log(`🏪 Total unique businesses: ${biz.length}`);
      console.log(`📂 Categories: ${cats.length}`);
      console.log(`\n📊 Source breakdown:`);
      Object.entries(dq.sourceCounts || {}).forEach(([src, cnt]) => {
        console.log(`   ${src}: ${cnt}`);
      });
      console.log(`\n🏆 Top 10 categories by count:`);
      cats.slice(0, 10).forEach((c, i) => {
        console.log(`   ${i+1}. ${c.category}: ${c.count} businesses (risk: ${c.riskLevel})`);
      });
      console.log(`\n📋 Sample businesses:`);
      biz.slice(0, 5).forEach(b => {
        console.log(`   - ${b.name} (${b.category}) | ${b.source} | ⭐${b.rating} | 📞${b.phone || 'N/A'}`);
      });
      console.log(`\n✅ Estimated data: ${finalResult.estimatedData ? 'YES (mock)' : 'NO (real)'}`);
    } else {
      console.log('❌ No result received');
      console.log('Raw response (last 500 chars):', res.data.slice(-500));
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
    if (e.response) console.log('Response status:', e.response.status);
  }
})();
