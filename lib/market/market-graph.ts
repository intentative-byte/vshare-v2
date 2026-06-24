export type MarketGraphNode = {
  industry: string;
  skills: string[];
  technologies: string[];
  jobs: string[];
  businesses: string[];
  trends: string[];
};

export const marketGraph: MarketGraphNode[] = [
  {
    industry: "AI",
    skills: ["Prompt Engineering", "Agents", "Evaluation", "Product Thinking"],
    technologies: ["LLMs", "RAG", "Automation", "AI Agents"],
    jobs: ["AI Product Manager", "AI Engineer", "Automation Consultant"],
    businesses: ["AI Workflow Agency", "Vertical SaaS", "Internal Tools"],
    trends: ["Agentic workflows", "AI operations", "Evaluation systems"],
  },
  {
    industry: "Business",
    skills: ["Sales", "Marketing", "Operations", "Customer Discovery"],
    technologies: ["CRM", "Analytics", "Automation"],
    jobs: ["Growth Lead", "Operations Manager", "Account Executive"],
    businesses: ["Consulting", "Services", "B2B SaaS"],
    trends: ["Founder-led sales", "Niche services", "Revenue operations"],
  },
  {
    industry: "Technology",
    skills: ["APIs", "Databases", "Architecture", "Security"],
    technologies: ["TypeScript", "Postgres", "Cloud", "APIs"],
    jobs: ["Software Engineer", "Solutions Architect", "Platform Engineer"],
    businesses: ["Developer Tools", "Automation Products", "Infrastructure"],
    trends: ["AI-native software", "Internal platforms", "Security automation"],
  },
  {
    industry: "Fitness",
    skills: ["Training Consistency", "Nutrition", "Recovery", "Habit Design"],
    technologies: ["Wearables", "Tracking Apps", "Remote Coaching"],
    jobs: ["Coach", "Wellness Lead", "Performance Specialist"],
    businesses: ["Online Coaching", "Fitness Programs", "Health Communities"],
    trends: ["Hybrid coaching", "Longevity", "Personalized health"],
  },
  {
    industry: "Finance",
    skills: ["Financial Planning", "Revenue", "Risk", "Investing"],
    technologies: ["Spreadsheets", "Fintech Apps", "Analytics"],
    jobs: ["Analyst", "Finance Manager", "Revenue Operations"],
    businesses: ["Financial Education", "Advisory", "Fintech"],
    trends: ["Personal finance automation", "Creator finance", "Revenue intelligence"],
  },
];

export function getMarketGraph() {
  return marketGraph;
}
