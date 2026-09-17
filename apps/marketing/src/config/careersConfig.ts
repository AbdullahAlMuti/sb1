export type JobDepartment =
  | "engineering"
  | "ecommerce"
  | "product"
  | "growth"
  | "internships";

export interface JobPosition {
  id: string;
  title: string;
  department: JobDepartment;
  departmentLabel: string;
  workArrangement: string; // e.g. "Onsite · Full time", "Hybrid · Full time", "Remote / Hybrid"
  experience: string; // e.g. "3–7 years", "Fresher / Student"
  salaryRange: string; // e.g. "90k–200k BDT/month"
  location: string;
  techTags: string[];
  description: string;
  applyUrl: string;
  featured?: boolean;
}

export interface CareerBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface CareersConfig {
  hero: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    stats: Array<{ value: string; label: string }>;
  };
  filterDepartments: Array<{ id: "all" | JobDepartment; label: string }>;
  benefits: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    items: CareerBenefit[];
  };
  generalApplication: {
    eyebrow: string;
    heading: string;
    description: string;
    ctaLabel: string;
    applyUrl: string;
  };
  positions: JobPosition[];
}

export const GOOGLE_FORM_CAREER_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSet-BG17Tcl5Xl9drWyYeu_sawmwRig_5EhSlKuWTxD0HKsZQ/viewform";

export const careersConfig: CareersConfig = {
  hero: {
    eyebrow: "Current Job Openings",
    heading: "Build the future of autonomous marketplace commerce",
    subtitle:
      "Join our engineering, AI research, and growth teams in Dhaka and worldwide. We build mission-critical automation systems powering thousands of high-velocity sellers.",
    stats: [
      { value: "20", label: "Open Positions" },
      { value: "Onsite / Hybrid", label: "Flexible Arrangements" },
      { value: "Competitive BDT", label: "Transparent Salary Scales" },
      { value: "Dhaka HQ", label: "Lalmatia & Global Remote" },
    ],
  },

  filterDepartments: [
    { id: "all", label: "All Openings" },
    { id: "engineering", label: "Engineering & AI" },
    { id: "ecommerce", label: "E-Commerce & ERP" },
    { id: "product", label: "Product & Design" },
    { id: "growth", label: "Growth & Operations" },
    { id: "internships", label: "Internships" },
  ],

  benefits: {
    eyebrow: "Why Work With Us",
    heading: "Everything you need to do your best work",
    subtitle:
      "We invest heavily in our team's craft, technical autonomy, physical well-being, and continuous career acceleration.",
    items: [
      {
        icon: "Banknote",
        title: "Competitive Compensation",
        description:
          "Above-market salary tiers in BDT with semi-annual performance reviews, project bonuses, and festival allowances.",
      },
      {
        icon: "Cpu",
        title: "Cutting-Edge AI Tech Stack",
        description:
          "Work hands-on with n8n workflow swarms, AI decision agents, Hermes, OpenClaw, LLM APIs (OpenAI, Claude, Gemini), and cloud distributed systems.",
      },
      {
        icon: "TrendingUp",
        title: "Rapid Career Trajectory",
        description:
          "Fast-track growth opportunities with real product ownership from day one. Build features used by thousands of merchants globally.",
      },
      {
        icon: "Laptop",
        title: "Modern Workstations & Tools",
        description:
          "High-performance workstations, ergonomic setup, dual monitors, and premium subscriptions (ChatGPT Plus, Copilot, Figma Pro, AWS).",
      },
      {
        icon: "Coffee",
        title: "Engaging Office Culture",
        description:
          "Daily gourmet lunches, unlimited premium coffee, snacks, monthly team outings, and recreational activities at our Lalmatia HQ.",
      },
      {
        icon: "BookOpen",
        title: "Learning & Certifications",
        description:
          "Dedicated educational stipends for AWS/GCP certifications, O'Reilly subscriptions, technical courses, and global developer conferences.",
      },
    ],
  },

  generalApplication: {
    eyebrow: "Spontaneous Talent",
    heading: "Don't see your exact role listed?",
    description:
      "We are always on the lookout for brilliant software engineers, AI developers, and technical problem solvers. Submit your resume and portfolio to our general talent pool.",
    ctaLabel: "Submit Open Application",
    applyUrl: GOOGLE_FORM_CAREER_URL,
  },

  positions: [
    // 1. Engineering & AI
    {
      id: "ai-automation-engineer",
      title: "AI Automation Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "2–6 years",
      salaryRange: "80k–190k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["n8n", "AI Agents", "Python", "REST APIs", "Webhooks"],
      description:
        "Architect and deploy autonomous workflow swarms using n8n, OpenAI/Claude APIs, and custom Python bridges to orchestrate e-commerce listing pipelines.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
      featured: true,
    },
    {
      id: "ai-ml-engineer",
      title: "AI / ML Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "3–7 years",
      salaryRange: "90k–200k BDT/month",
      location: "Lalmatia, Dhaka / Hybrid",
      techTags: ["Python", "PyTorch", "OpenAI API", "Vector Embeddings", "RAG"],
      description:
        "Develop high-accuracy title generation, product classification, and catalog similarity models powering SellerSuit's automated dropshipping pipelines.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
      featured: true,
    },
    {
      id: "solutions-architect",
      title: "Solutions Architect / Technical Lead",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "5–10 years",
      salaryRange: "130k–260k BDT/month",
      location: "Lalmatia, Dhaka / Hybrid",
      techTags: ["System Architecture", "Node.js", "PostgreSQL", "AWS", "Microservices"],
      description:
        "Lead technical architecture across backend services, multi-tenant databases, queue workers, and real-time marketplace syncing infrastructure.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
      featured: true,
    },
    {
      id: "full-stack-developer",
      title: "Full Stack Developer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "3–7 years",
      salaryRange: "80k–190k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL"],
      description:
        "Build end-to-end features across our React SPA dashboard, Next.js marketing applications, and Node/Express backend APIs.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "backend-api-engineer",
      title: "Backend / API Integration Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "3–7 years",
      salaryRange: "80k–180k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Node.js", "Express", "REST APIs", "Webhooks", "PostgreSQL"],
      description:
        "Engineer high-reliability REST endpoints, marketplace webhook listeners, rate-limited supplier adapters, and queue job processors.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "frontend-engineer",
      title: "Frontend Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "2–6 years",
      salaryRange: "70k–160k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["React", "TypeScript", "Tailwind CSS", "Vite", "State Management"],
      description:
        "Craft fluid, accessible, and responsive user interfaces for high-velocity merchants managing complex catalog variations and live metrics.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "mobile-app-developer",
      title: "Mobile App Developer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "2–6 years",
      salaryRange: "70k–160k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Flutter", "React Native", "iOS", "Android", "REST APIs"],
      description:
        "Design and launch cross-platform mobile apps for iOS and Android, allowing sellers to monitor live profit, orders, and listing statuses on the go.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "devops-cloud-engineer",
      title: "DevOps / Cloud Engineer",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "3–7 years",
      salaryRange: "90k–200k BDT/month",
      location: "Lalmatia, Dhaka / Hybrid",
      techTags: ["AWS", "Docker", "CI/CD", "Terraform", "Monitoring"],
      description:
        "Maintain 99.9% uptime, automate CI/CD release pipelines, manage containerized cloud infrastructure, and implement proactive observability.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "qa-engineer",
      title: "QA Engineer (Automation / Manual)",
      department: "engineering",
      departmentLabel: "Engineering & AI",
      workArrangement: "Onsite · Full time",
      experience: "2–5 years",
      salaryRange: "50k–120k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Playwright", "Jest", "Manual Testing", "API Testing", "CI/CD"],
      description:
        "Build robust end-to-end regression test suites with Playwright, audit edge function endpoints, and ensure flawless UX across releases.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },

    // 2. E-Commerce & ERP
    {
      id: "ecommerce-engineer",
      title: "eCommerce Engineer",
      department: "ecommerce",
      departmentLabel: "E-Commerce & ERP",
      workArrangement: "Onsite · Full time",
      experience: "2–6 years",
      salaryRange: "70k–160k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["eBay API", "Amazon SP-API", "Walmart API", "Shopify", "WooCommerce"],
      description:
        "Integrate deep multi-channel marketplace APIs, handling inventory sync, variation mapping, order routing, and merchant catalog protocols.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
      featured: true,
    },
    {
      id: "erp-solutions-engineer",
      title: "ERP Solutions Engineer",
      department: "ecommerce",
      departmentLabel: "E-Commerce & ERP",
      workArrangement: "Onsite · Full time",
      experience: "2–6 years",
      salaryRange: "80k–170k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["ERP Integrations", "Odoo", "NetSuite", "Inventory Sync", "SQL"],
      description:
        "Connect SellerSuit with enterprise ERP ecosystems, synchronizing warehousing, purchase orders, multi-location inventory, and financial ledgers.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "wordpress-developer",
      title: "WordPress Developer",
      department: "ecommerce",
      departmentLabel: "E-Commerce & ERP",
      workArrangement: "Onsite · Full time",
      experience: "2–5 years",
      salaryRange: "50k–120k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["PHP", "WordPress", "WooCommerce", "Plugin Development", "MySQL"],
      description:
        "Develop high-performance custom WordPress & WooCommerce plugins, webhooks connectors, and client-facing storefront themes.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },

    // 3. Product & Design
    {
      id: "ui-ux-product-designer",
      title: "UI/UX / Product Designer",
      department: "product",
      departmentLabel: "Product & Design",
      workArrangement: "Onsite · Full time",
      experience: "3–6 years",
      salaryRange: "60k–150k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Figma", "Design Systems", "User Research", "Prototyping", "Wireframing"],
      description:
        "Champion user-centric design across our SaaS dashboard, extension panels, and marketing surfaces. Create world-class design system components.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
      featured: true,
    },
    {
      id: "project-product-manager",
      title: "Project / Product Manager",
      department: "product",
      departmentLabel: "Product & Design",
      workArrangement: "Onsite · Full time",
      experience: "3–7 years",
      salaryRange: "70k–160k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Agile / Scrum", "Product Roadmaps", "Jira / Linear", "User Stories", "SaaS"],
      description:
        "Bridge engineering, design, and merchant feedback. Prioritize roadmap sprints, define technical specs, and drive fast, reliable product releases.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },

    // 4. Growth & Operations
    {
      id: "business-development-executive",
      title: "Business Development Executive",
      department: "growth",
      departmentLabel: "Growth & Operations",
      workArrangement: "Onsite · Full time",
      experience: "2–5 years",
      salaryRange: "50k–120k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["B2B Sales", "Lead Generation", "Client Outreach", "CRM", "Negotiation"],
      description:
        "Drive international enterprise seller outreach, develop wholesale agency partnerships, and convert prospective dropshippers into active subscribers.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "digital-marketing-seo-executive",
      title: "Digital Marketing / SEO Executive",
      department: "growth",
      departmentLabel: "Growth & Operations",
      workArrangement: "Onsite · Full time",
      experience: "2–5 years",
      salaryRange: "40k–100k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Technical SEO", "Content Marketing", "Google Ads", "Social Media", "Analytics"],
      description:
        "Execute organic SEO growth campaigns, build high-ranking content clusters, manage paid search funnels, and optimize conversion metrics.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "customer-success-technical-support",
      title: "Customer Success / Technical Support",
      department: "growth",
      departmentLabel: "Growth & Operations",
      workArrangement: "Onsite · Full time",
      experience: "1–4 years",
      salaryRange: "35k–80k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Customer Support", "Zendesk", "Troubleshooting", "Merchant Onboarding"],
      description:
        "Deliver white-glove technical assistance to e-commerce store operators, investigate extension pairing logs, and ensure exceptional merchant satisfaction.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },

    // 5. Early Career & Internships
    {
      id: "ai-automation-intern",
      title: "AI Automation Intern",
      department: "internships",
      departmentLabel: "Internships",
      workArrangement: "Onsite · Full time / Part time",
      experience: "Fresher / Student",
      salaryRange: "20k–35k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["n8n", "AI Workflows", "Prompt Engineering", "Python Basics"],
      description:
        "Gain real-world engineering experience designing n8n webhook pipelines, testing AI agent prompts, and automating supplier catalog tasks.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "software-development-intern",
      title: "Software Development Intern",
      department: "internships",
      departmentLabel: "Internships",
      workArrangement: "Onsite · Full time / Part time",
      experience: "Fresher / Student",
      salaryRange: "20k–35k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["JavaScript", "TypeScript", "React", "Node.js", "Git"],
      description:
        "Pair program with senior architects on real SaaS codebase features. Master modern TypeScript, React, test automation, and Git workflows.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
    {
      id: "marketing-bd-intern",
      title: "Marketing / Business Development Intern",
      department: "internships",
      departmentLabel: "Internships",
      workArrangement: "Onsite · Full time / Part time",
      experience: "Fresher / Student",
      salaryRange: "18k–30k BDT/month",
      location: "Lalmatia, Dhaka",
      techTags: ["Market Research", "Social Media", "Content Drafting", "Lead Prospecting"],
      description:
        "Support international marketing campaigns, conduct competitive dropshipping tool research, and assist in prospective merchant outreach.",
      applyUrl: GOOGLE_FORM_CAREER_URL,
    },
  ],
};
