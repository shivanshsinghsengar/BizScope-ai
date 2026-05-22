import { Html, Head, Main, NextScript } from 'next/document';

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BizScope AI",
  "url": "https://biz-scope-ai.vercel.app",
  "logo": "https://biz-scope-ai.vercel.app/logo.svg",
  "description": "Free AI-powered market analysis and competitor research tool. Analyze competitors, discover market gaps, and find the best business location anywhere in the world.",
  "foundingDate": "2024",
  "areaServed": "Worldwide",
  "sameAs": [
    "https://github.com/shivanshsinghsengar/BizScope-ai"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "availableLanguage": ["English", "Hindi"]
  }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "BizScope AI",
  "alternateName": "BizScope",
  "url": "https://biz-scope-ai.vercel.app",
  "description": "Free AI-powered market analysis and competitor research tool. Analyze competitors, discover market gaps, and find the best business location in any city worldwide. Get results in under 10 seconds.",
  "inLanguage": "en",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://biz-scope-ai.vercel.app/?location={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

export default function Document() {
  return (
    <Html lang="en-IN" suppressHydrationWarning>
      <Head>
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="Wo1NiAa7zCKJdSwepk7OP9ecr5klp4Z5_HtfsGMyQc0" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Favicon & PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <link rel="manifest" href="/manifest.json" />

        {/* Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

        {/* WebSite schema with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
