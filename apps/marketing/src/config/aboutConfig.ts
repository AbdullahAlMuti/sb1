/**
 * Typed configuration for the About Us Editorial Page.
 * Centralizing all copy, images, team members, metrics, and office locations
 * allows seamless updates when replacing placeholder images and designations.
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageSrc: string;
  location: string;
  bio?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface CoreValue {
  id: string;
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
}

export interface ImpactMetric {
  value: string;
  label: string;
  description?: string;
}

export interface OfficeLocation {
  country: string;
  city: string;
  label: string;
  address: string;
  flag: string;
  imageSrc?: string;
  email?: string;
  phone?: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarSrc?: string;
  rating?: number;
}

export interface AboutHeroConfig {
  headline: string;
  subtitle: string;
  bentoImages: {
    portrait: string;
    collab: string;
    workspace: string;
  };
  statCards: {
    topStat: {
      value: string;
      label: string;
    };
    bottomStat: {
      value: string;
      label: string;
    };
  };
}

export interface AboutMissionConfig {
  eyebrow: string;
  heading: string;
  story: string[];
  metrics: ImpactMetric[];
}

export interface AboutFounderConfig {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  founderName: string;
  founderRole: string;
  founderImage: string;
  signatureText: string;
}

export interface AboutConfig {
  hero: AboutHeroConfig;
  mission: AboutMissionConfig;
  coreValues: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    values: CoreValue[];
  };
  partners: {
    eyebrow: string;
    heading: string;
    subtitle: string;
  };
  founder: AboutFounderConfig;
  team: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    members: TeamMember[];
  };
  testimonials: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    items: TestimonialItem[];
  };
  offices: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    locations: OfficeLocation[];
  };
}

export const aboutConfig: AboutConfig = {
  hero: {
    headline: "Where technology meets opportunity",
    subtitle:
      "Building resilient automation pipelines, intelligent agent workflows, and commerce acceleration tools that empower modern marketplace operators worldwide.",
    bentoImages: {
      portrait: "/images/about/bento-portrait.jpg",
      collab: "/images/about/bento-collab.jpg",
      workspace: "/images/about/bento-workspace.jpg",
    },
    statCards: {
      topStat: {
        value: "90%",
        label: "YoY Efficiency Acceleration",
      },
      bottomStat: {
        value: "50%",
        label: "Operational Cost Reduction",
      },
    },
  },

  mission: {
    eyebrow: "Our Mission",
    heading: "Making software better for everyone.",
    story: [
      "E-commerce operators waste hundreds of hours every month manually scraping products, downloading images, formatting specifications, and guessing fee margins. SellerSuit was founded with a single mission: to eliminate tedious manual friction with intelligent, enterprise-grade automation.",
      "We believe software should work quietly in the background—extracting catalogs in milliseconds, orchestrating multi-agent decisions, and synchronizing global inventories so your team can focus on product strategy, growth, and customer satisfaction.",
    ],
    metrics: [
      {
        value: "90M+",
        label: "Operations Synced",
        description: "Listings, feeds, and orders processed autonomously",
      },
      {
        value: "95%",
        label: "Customer Retention",
        description: "Long-term trust across enterprise seller teams",
      },
      {
        value: "77%",
        label: "Faster Fulfillment",
        description: "Reduction in manual item processing time",
      },
      {
        value: "5k+",
        label: "Active Businesses",
        description: "Global brands and dropshipping merchants scale daily",
      },
    ],
  },

  coreValues: {
    eyebrow: "Philosophy",
    heading: "Our core values",
    subtitle:
      "The foundational principles that guide every feature we build, every line of code we ship, and every merchant partnership we foster.",
    values: [
      {
        id: "customer-first",
        title: "Customer Obsessed",
        description:
          "We build directly alongside active sellers and merchants. Every workflow solves a genuine, painful operational bottleneck.",
        iconName: "Users",
        accentColor: "#ea580c",
      },
      {
        id: "radical-automation",
        title: "Radical Automation",
        description:
          "If a task must be repeated twice, it belongs in an autonomous pipeline. We engineer software to save thousands of human hours.",
        iconName: "Zap",
        accentColor: "#3b82f6",
      },
      {
        id: "engineering-precision",
        title: "Engineering Precision",
        description:
          "Zero tolerance for catalog drift, broken feeds, or downtime. Sub-second execution and verified idempotency come standard.",
        iconName: "Cpu",
        accentColor: "#10b981",
      },
      {
        id: "transparent-integrity",
        title: "Transparent Integrity",
        description:
          "Clear, honest pricing with no hidden charges. Absolute data confidentiality and SOC2-level operational standards.",
        iconName: "ShieldCheck",
        accentColor: "#8b5cf6",
      },
    ],
  },

  partners: {
    eyebrow: "Ecosystem",
    heading: "Backed by the best",
    subtitle:
      "Deeply integrated with the world's leading e-commerce platforms, payment gateways, and cloud networks.",
  },

  founder: {
    eyebrow: "Leadership",
    heading: "A Word from the CEO",
    paragraphs: [
      "When we started SellerSuit, marketplace operators were drowning in fragmented spreadsheets, brittle browser extensions, and unreliable scrapers that broke every time an e-commerce catalog updated.",
      "We assembled a world-class engineering team to build what we wished existed: a rock-solid, cloud-native orchestration platform that treats dropshipping, catalog syncing, and listing automation with true enterprise rigor.",
      "Our commitment to you remains unwavering: we will continue to pioneer AI decision agents, autonomous workflows, and real-time data engines so your business stays ahead of marketplace shifts.",
    ],
    founderName: "Abdullah Al Noman",
    founderRole: "Chief Executive Officer",
    founderImage: "/images/about/ceo.png",
    signatureText: "Abdullah Al Noman",
  },

  team: {
    eyebrow: "The People",
    heading: "Meet the team",
    subtitle:
      "Our diverse collective of distributed engineers, AI researchers, and e-commerce strategists building the future of commerce.",
    members: [
      {
        id: "ceo",
        name: "Abdullah Al Noman",
        role: "Chief Executive Officer",
        location: "New York, United States",
        imageSrc: "/images/about/ceo.png",
        socialLinks: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
      },
      {
        id: "cfo",
        name: "MD Raihan Islam",
        role: "Chief Financial Officer",
        location: "Dhaka, Bangladesh",
        imageSrc: "/images/about/cfo.png",
        socialLinks: { linkedin: "https://linkedin.com" },
      },
      {
        id: "coo",
        name: "Abul Bashar",
        role: "Chief Operating Officer",
        location: "Dhaka, Bangladesh",
        imageSrc: "/images/about/coo.png",
        socialLinks: { linkedin: "https://linkedin.com" },
      },
      {
        id: "head-of-engineering",
        name: "Morshed Khan Rana",
        role: "Head of Engineering",
        location: "Dhaka, Bangladesh",
        imageSrc: "/images/about/head-of-engineering.jpg",
        socialLinks: { linkedin: "https://linkedin.com", github: "https://github.com" },
      },
      {
        id: "hr",
        name: "Rezaul Karim",
        role: "Head of Human Resources",
        location: "Spain",
        imageSrc: "/images/about/hr.png",
        socialLinks: { linkedin: "https://linkedin.com" },
      },
    ],
  },

  testimonials: {
    eyebrow: "Wall of Love",
    heading: "Trusted by the best in your industry",
    subtitle:
      "Over 5,000 marketplace businesses scale their catalog operations and dropshipping margins with SellerSuit.",
    items: [
      {
        id: "test-1",
        quote:
          "SellerSuit cut our listing creation time from 20 minutes down to 30 seconds. We scaled our eBay inventory from 500 to 12,000 SKUs in under four months.",
        author: "Alexander Brooks",
        role: "Chief Operations Officer",
        company: "Apex Commerce Group",
        avatarSrc: "/images/about/team-1.jpg",
        rating: 5,
      },
      {
        id: "test-2",
        quote:
          "The n8n workflow integrations and webhook bridges are extraordinary. We connected NetSuite directly to our multi-store setup without hiring custom dev agencies.",
        author: "Sarah Jenkins",
        role: "Director of E-Commerce",
        company: "Velocity Brands",
        avatarSrc: "/images/about/team-2.jpg",
        rating: 5,
      },
      {
        id: "test-3",
        quote:
          "By far the most dependable scraper and listing engine on the market. Zero CAPTCHA headaches and flawless margin calculations on every single SKU.",
        author: "Liam O'Connor",
        role: "Founder & Managing Partner",
        company: "Nexus Marketplace Ventures",
        avatarSrc: "/images/about/team-3.jpg",
        rating: 5,
      },
      {
        id: "test-4",
        quote:
          "We operate across three countries. The speed of data extraction and the ease of team delegation gave us a 4x operational leverage boost.",
        author: "Camila Duarte",
        role: "Head of Supply Chain",
        company: "GlobalRetail Inc.",
        avatarSrc: "/images/about/team-4.jpg",
        rating: 5,
      },
      {
        id: "test-5",
        quote:
          "The Hermes AI decision agents revolutionized our ticket triage and inventory reconciliation. We save over 35 engineering hours each week.",
        author: "Ethan Zhang",
        role: "VP of Technology",
        company: "Aura Digital",
        avatarSrc: "/images/about/team-5.jpg",
        rating: 5,
      },
      {
        id: "test-6",
        quote:
          "Exceptional software quality. Clean UI, high-speed API responses, and dedicated support that truly understands marketplace logistics.",
        author: "Miriam Al-Hassan",
        role: "Managing Director",
        company: "Oasis Trade House",
        avatarSrc: "/images/about/team-6.jpg",
        rating: 5,
      },
    ],
  },

  offices: {
    eyebrow: "Global Presence",
    heading: "Our offices are all across the world",
    subtitle:
      "Headquartered in the United States and Bangladesh, supporting clients across North America, Europe, and Asia.",
    locations: [
      {
        country: "Bangladesh",
        city: "Dhaka",
        label: "Asia Operations & R&D Hub",
        address: "195, Fakirapool (2nd Floor), Motijheel, Dhaka-1000, Bangladesh",
        flag: "🇧🇩",
        email: "contact@sellersuit.com",
        phone: "+880 1338-356197",
      },
      {
        country: "USA",
        city: "Deltona, Florida",
        label: "United States HQ",
        address: "491 Fort Smith Blvd, Deltona, FL 32738, United States",
        flag: "🇺🇸",
        email: "contact@sellersuit.com",
        phone: "+1 (516) 951-7773",
      },
    ],
  },
};

export default aboutConfig;
