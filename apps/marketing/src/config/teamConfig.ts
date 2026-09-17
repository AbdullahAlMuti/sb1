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
    { id: "engineering", label: "Engineering" },
    { id: "operations", label: "People & HR" },
  ],

  members: [
    {
      id: "ceo",
      name: "Abdullah Al Noman",
      role: "Founder & Chief Executive Officer",
      department: "leadership",
      departmentLabel: "Leadership",
      imageSrc: "/images/about/ceo.png",
      location: "New York, United States",
      bio: "Visionary entrepreneur and technology executive directing SellerSuit's corporate vision, enterprise growth, and autonomous marketplace infrastructure expansion across North America and global markets.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
    {
      id: "cfo",
      name: "MD Raihan Islam",
      role: "Chief Financial Officer",
      department: "leadership",
      departmentLabel: "Leadership",
      imageSrc: "/images/about/cfo.png",
      location: "Dhaka, Bangladesh",
      bio: "Financial strategist managing global fiscal architecture, international compliance, revenue planning, and capital efficiency across SellerSuit's cross-border operations.",
      socialLinks: {
        linkedin: "https://linkedin.com",
      },
    },
    {
      id: "coo",
      name: "ABUL BASHAR",
      role: "Chief Operating Officer",
      department: "leadership",
      departmentLabel: "Leadership",
      imageSrc: "/images/about/coo.png",
      location: "Dhaka, Bangladesh",
      bio: "Operations executive driving day-to-day organizational momentum, enterprise customer delivery, supply chain integrations, and scalable business processes.",
      socialLinks: {
        linkedin: "https://linkedin.com",
      },
    },
    {
      id: "head-of-engineering",
      name: "Morshed Khan Rana",
      role: "Head of Engineering",
      department: "engineering",
      departmentLabel: "Engineering",
      imageSrc: "/images/about/head-of-engineering.jpg",
      location: "Dhaka, Bangladesh",
      bio: "Seasoned engineering leader overseeing distributed cloud architecture, high-throughput catalog extractors, queue workers, and resilient multi-tenant platform stability.",
      socialLinks: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "hr",
      name: "Rezaul Karim",
      role: "Head of Human Resources",
      department: "operations",
      departmentLabel: "People & HR",
      imageSrc: "/images/about/hr.png",
      location: "Spain",
      bio: "Human resources leader spearheading international talent acquisition, distributed team enablement, organizational wellness, and people culture across global timezones.",
      socialLinks: {
        linkedin: "https://linkedin.com",
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
