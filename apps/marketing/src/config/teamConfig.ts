export interface TeamMemberProfile {
  id: string;
  name: string;
  role: string;
  department: "leadership" | "engineering" | "product" | "operations";
  departmentLabel: string;
  imageSrc: string;
  location: string;
  bio: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface TeamDepartmentFilter {
  id: "all" | "leadership" | "engineering" | "product" | "operations";
  label: string;
}

export interface TeamConfig {
  hero: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    metrics: Array<{ value: string; label: string }>;
  };
  departments: TeamDepartmentFilter[];
  members: TeamMemberProfile[];
  culture: {
    eyebrow: string;
    heading: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
}

export const teamConfig: TeamConfig = {
  hero: {
    eyebrow: "Our Collective",
    heading: "Meet the team building autonomous commerce",
    subtitle:
      "We are a distributed team of engineers, AI practitioners, systems architects, and product designers united by a single mission: making multi-channel commerce effortless and scalable.",
    metrics: [
      { value: "100%", label: "Remote & Distributed" },
      { value: "12+", label: "Timezones Covered" },
      { value: "99.9%", label: "Platform Availability" },
      { value: "5,000+", label: "Sellers Empowered" },
    ],
  },

  departments: [
    { id: "all", label: "All Members" },
    { id: "leadership", label: "Leadership" },
    { id: "engineering", label: "Engineering & AI" },
    { id: "product", label: "Product & Design" },
    { id: "operations", label: "Operations & Success" },
  ],

  members: [
    {
      id: "founder",
      name: "Abdullah Al Muti",
      role: "Founder & Chief Executive Officer",
      department: "leadership",
      departmentLabel: "Leadership",
      imageSrc: "/images/about/founder.jpg",
      location: "Dhaka / Global",
      bio: "Serial technology entrepreneur and e-commerce software architect. Abdullah founded SellerSuit to eliminate manual dropshipping friction with autonomous listing pipelines.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
        github: "https://github.com",
      },
    },
    {
      id: "team-1",
      name: "Marcus Vance",
      role: "VP of Engineering",
      department: "leadership",
      departmentLabel: "Leadership",
      imageSrc: "/images/about/team-1.jpg",
      location: "San Francisco, USA",
      bio: "Former principal distributed systems lead with 14+ years scaling cloud infrastructure and high-throughput real-time queue workers across microservices.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
    {
      id: "team-2",
      name: "Elena Rostova",
      role: "Head of AI & Machine Learning",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      imageSrc: "/images/about/team-2.jpg",
      location: "Berlin, Germany",
      bio: "PhD in Natural Language Processing. Leads SellerSuit's proprietary product title generation, description synthesis, and supplier catalog matching models.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "team-3",
      name: "Julian Sterling",
      role: "Principal Systems Architect",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      imageSrc: "/images/about/team-3.jpg",
      location: "London, UK",
      bio: "Oversees core database schemas, edge execution engines, multi-tenant security layers, and asynchronous marketplace API synchronization pipelines.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "team-4",
      name: "Amina Patel",
      role: "Director of Product Design",
      department: "product",
      departmentLabel: "Product & Design",
      imageSrc: "/images/about/team-4.jpg",
      location: "Toronto, Canada",
      bio: "Design systems specialist passionate about creating fast, keyboard-first interfaces for high-velocity merchants managing tens of thousands of catalog listings.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
    {
      id: "team-5",
      name: "David Kim",
      role: "Lead Infrastructure Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      imageSrc: "/images/about/team-5.jpg",
      location: "Seoul, South Korea",
      bio: "Specializes in zero-downtime database migrations, resilient distributed caching layers, rate-limit pooling, and automated failover mechanics.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "team-6",
      name: "Sophia Lindqvist",
      role: "Head of Customer Operations",
      department: "operations",
      departmentLabel: "Operations & Success",
      imageSrc: "/images/about/team-6.jpg",
      location: "Stockholm, Sweden",
      bio: "Championing 24/7 seller onboarding, white-glove migration assistance, and deep merchant feedback loops directly connected to product development.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
  ],

  culture: {
    eyebrow: "Join Our Mission",
    heading: "Think you'd be a great fit?",
    description:
      "We're always looking for ambitious engineers, product thinkers, and marketplace operators who want to tackle complex distributed automation challenges.",
    ctaLabel: "View Open Positions",
    ctaHref: "/careers",
  },
};
