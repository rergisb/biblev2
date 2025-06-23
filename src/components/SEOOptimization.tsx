import React from 'react';

interface SEOOptimizationProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export const SEOOptimization: React.FC<SEOOptimizationProps> = ({
  title = "Guiding Light - Your AI Bible Companion | Voice-Activated Scripture & Spiritual Guidance",
  description = "Experience personalized Bible study with our AI-powered voice assistant. Get instant scripture verses, spiritual guidance, and biblical wisdom through natural conversation. Perfect for daily devotions and spiritual growth.",
  keywords = "Bible companion, AI Bible study, voice-activated scripture, spiritual guidance, biblical wisdom, daily devotions, Christian AI assistant, scripture verses, faith companion, biblical counseling",
  canonicalUrl = "https://myguidinglight.me",
  ogImage = "https://i.ibb.co/yj8Qp41/guidinglight-upscaled.png"
}) => {
  React.useEffect(() => {
    // Set document title
    document.title = title;

    // Create or update meta tags
    const updateMetaTag = (name: string, content: string, property?: string) => {
      const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic SEO meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('author', 'Guiding Light');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph meta tags
    updateMetaTag('og:title', title, 'og:title');
    updateMetaTag('og:description', description, 'og:description');
    updateMetaTag('og:type', 'website', 'og:type');
    updateMetaTag('og:url', canonicalUrl, 'og:url');
    updateMetaTag('og:image', ogImage, 'og:image');
    updateMetaTag('og:site_name', 'Guiding Light', 'og:site_name');
    updateMetaTag('og:locale', 'en_US', 'og:locale');

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Apple-specific meta tags
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    updateMetaTag('apple-mobile-web-app-title', 'Guiding Light');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Structured data for voice search optimization
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Guiding Light",
      "description": description,
      "url": canonicalUrl,
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "creator": {
        "@type": "Organization",
        "name": "Guiding Light",
        "url": canonicalUrl
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": canonicalUrl + "?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      },
      "mainEntity": {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do I use the voice Bible companion?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Simply tap the microphone button and speak your question or request for biblical guidance. Our AI will provide scripture verses and spiritual insights."
            }
          },
          {
            "@type": "Question",
            "name": "What kind of biblical guidance can I get?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can ask for specific Bible verses, spiritual advice, prayer guidance, biblical interpretation, and daily devotional content."
            }
          },
          {
            "@type": "Question",
            "name": "Is the Bible companion free to use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, Guiding Light is completely free to use. Simply visit our website and start your spiritual journey with voice-activated biblical guidance."
            }
          }
        ]
      }
    };

    // Add structured data
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(structuredData);

    // Speakable schema markup for voice assistants
    const speakableData = {
      "@context": "https://schema.org",
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-content", "h1", "h2", ".bible-verse"]
    };

    let speakableScript = document.querySelector('script[data-speakable="true"]');
    if (!speakableScript) {
      speakableScript = document.createElement('script');
      speakableScript.setAttribute('type', 'application/ld+json');
      speakableScript.setAttribute('data-speakable', 'true');
      document.head.appendChild(speakableScript);
    }
    speakableScript.textContent = JSON.stringify(speakableData);

  }, [title, description, keywords, canonicalUrl, ogImage]);

  return null;
};