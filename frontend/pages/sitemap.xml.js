const BASE = 'https://biz-scope-ai.vercel.app';

const PAGES = [
  { path: '/',             priority: '1.0', changefreq: 'daily' },
  { path: '/analysis',     priority: '0.9', changefreq: 'weekly' },
  { path: '/competitors',  priority: '0.8', changefreq: 'weekly' },
  { path: '/properties',   priority: '0.8', changefreq: 'weekly' },
  { path: '/insights',     priority: '0.8', changefreq: 'weekly' },
  { path: '/strategy',     priority: '0.8', changefreq: 'weekly' },
  { path: '/how-it-works', priority: '0.7', changefreq: 'monthly' },
  { path: '/trends',       priority: '0.7', changefreq: 'weekly' },
  { path: '/sparks',       priority: '0.7', changefreq: 'weekly' },
  { path: '/interior',     priority: '0.7', changefreq: 'weekly' },
  { path: '/news',         priority: '0.7', changefreq: 'daily' },
  { path: '/pricing',      priority: '0.6', changefreq: 'monthly' },
  { path: '/about',        priority: '0.6', changefreq: 'monthly' },
  { path: '/docs',         priority: '0.6', changefreq: 'monthly' },
  { path: '/privacy',      priority: '0.5', changefreq: 'yearly' },
  { path: '/terms',        priority: '0.5', changefreq: 'yearly' },
  { path: '/login',        priority: '0.4', changefreq: 'yearly' },
  { path: '/register',     priority: '0.4', changefreq: 'yearly' },
];

function Sitemap() {}

export async function getServerSideProps({ res }) {
  const now = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${PAGES.map(p => `  <url>
    <loc>${BASE}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(xml);
  res.end();
  return { props: {} };
}

export default Sitemap;
