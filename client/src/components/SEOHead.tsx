/**
 * SEO Head Component for Peter Digital Enterprise Security Platform
 * Provides comprehensive meta tags, Open Graph, and structured data
 */

import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  schema?: object;
  noIndex?: boolean;
  alternateLanguages?: { lang: string; href: string }[];
}

export function SEOHead({
  title = "Peter Digital Enterprise Security Platform",
  description = "Advanced enterprise security platform providing comprehensive threat intelligence, fraud detection, and real-time risk assessment with AI-powered analytics.",
  keywords = [
    "enterprise security",
    "threat intelligence", 
    "fraud detection",
    "risk assessment",
    "cybersecurity",
    "AI security",
    "payment security",
    "authentication"
  ],
  canonical,
  ogImage = "/og-image.png",
  ogType = "website",
  schema,
  noIndex = false,
  alternateLanguages = []
}: SEOHeadProps) {
  const fullTitle = title.includes("Peter Digital") ? title : `${title} | Peter Digital Security`;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://petershop.com';
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : baseUrl);
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

  // Default structured data for the platform
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Peter Digital Enterprise Security Platform",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Web",
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": "Peter Digital",
      "url": baseUrl
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "category": "Enterprise Security Software"
    },
    "featureList": [
      "JWT Authentication",
      "Fraud Detection",
      "Threat Intelligence",
      "Real-time Monitoring",
      "Risk Assessment",
      "Payment Security"
    ]
  };

  const structuredData = schema || defaultSchema;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Viewport and Character Set */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Peter Digital Security" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:site" content="@PeterDigital" />
      
      {/* Additional Meta Tags for Security Platform */}
      <meta name="author" content="Peter Digital Security Team" />
      <meta name="generator" content="Peter Digital Enterprise Platform" />
      <meta name="theme-color" content="#1a1a1a" />
      
      {/* Security Headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Alternate Languages */}
      {alternateLanguages.map(({ lang, href }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={href} />
      ))}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      
      {/* Favicon and App Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Preconnect for Performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Helmet>
  );
}

// Predefined SEO configurations for different pages
export const SEOConfigs = {
  home: {
    title: "Peter Digital Enterprise Security Platform",
    description: "Advanced enterprise security platform providing comprehensive threat intelligence, fraud detection, and real-time risk assessment with AI-powered analytics.",
    keywords: ["enterprise security", "threat intelligence", "fraud detection", "cybersecurity"]
  },
  
  admin: {
    title: "Admin Dashboard - Security Management",
    description: "Comprehensive admin dashboard for managing enterprise security operations, monitoring threats, and configuring system settings.",
    keywords: ["admin dashboard", "security management", "threat monitoring", "system administration"]
  },
  
  authentication: {
    title: "Secure Authentication - Enterprise Login",
    description: "Enterprise-grade JWT authentication with multi-factor security, role-based access control, and comprehensive audit logging.",
    keywords: ["secure authentication", "JWT login", "enterprise security", "multi-factor auth"]
  },
  
  fraudDetection: {
    title: "AI-Powered Fraud Detection System",
    description: "Advanced fraud detection using machine learning algorithms, real-time risk assessment, and behavioral analysis for payment security.",
    keywords: ["fraud detection", "AI security", "payment protection", "risk assessment"]
  },
  
  threatIntelligence: {
    title: "Threat Intelligence Platform",
    description: "Real-time threat intelligence with geographic analysis, attack pattern recognition, and automated response systems.",
    keywords: ["threat intelligence", "cybersecurity", "attack detection", "security monitoring"]
  },
  
  giftCards: {
    title: "Secure Gift Card Management",
    description: "Enterprise gift card management with Square integration, fraud protection, and comprehensive transaction monitoring.",
    keywords: ["gift card management", "Square integration", "payment security", "transaction monitoring"]
  }
};

// Higher-order component for pages that need specific SEO
export function withSEO<T extends object>(
  Component: React.ComponentType<T>,
  seoConfig: SEOHeadProps
) {
  return function SEOWrappedComponent(props: T) {
    return (
      <>
        <SEOHead {...seoConfig} />
        <Component {...props} />
      </>
    );
  };
}