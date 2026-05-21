const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ponte",
  legalName: "1402 Celsius Ltd",
  url: "https://ponte.trade",
  logo: "https://ponte.trade/icon.png",
  image: "https://ponte.trade/opengraph-image.png",
  description:
    "Ponte connects suppliers with buyers globally — international trade, procurement, and market entry consultancy.",
  email: "info@ponte.trade",
  telephone: "+44-208-123-1402",
  slogan: "Empowering Connections.",
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "20–22 Wenlock Road",
      addressLocality: "London",
      postalCode: "N1 7GU",
      addressCountry: "GB",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "1A Aton Street, Building 6",
      addressLocality: "Plovdiv",
      postalCode: "4002",
      addressCountry: "BG",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "info@ponte.trade",
    telephone: "+44-208-123-1402",
    availableLanguage: ["English", "Italian", "Bulgarian"],
  },
  areaServed: "Worldwide",
  knowsAbout: [
    "International Trade",
    "Procurement",
    "Market Entry",
    "Supply Chain Management",
    "Agricultural Commodities",
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  );
}
