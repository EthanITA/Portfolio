import type { Run } from "./text";

export type CvEntry = {
  title: string;
  org: string;
  when: string;
  points?: Run[][];
  note?: Run[];
  tech?: string[];
};

export type CvSkill = { group: string; items: string[] };

export const cv = {
  name: "Marco Dong",
  headline: "AI Product Engineer. Agent products, end to end.",
  location: "Milan, Italy",
  profile: [
    "Engineer with ",
    { strong: "four years delivering software to other people’s businesses" },
    ", from Salesforce consulting at Deloitte to B2B platform work for Italian energy majors. I currently ship a ",
    { strong: "production LLM agent inside a regulated wealth manager" },
    ", including the evaluation work that decides whether it is safe to release. Alongside that I have run seven freelance engagements end to end, from first conversation to invoice, and hold an MBA. Native Italian, based in Milan.",
  ] satisfies Run[],
  experience: [
    {
      title: "AI Product Engineer",
      org: "Moneyfarm · Milan",
      when: "Jul 2026–present",
      points: [
        ["Build a customer-facing LLM concierge agent for a digital wealth manager."],
        ["Design the evaluation frameworks that decide whether agent behaviour is safe to release in a regulated trading context."],
        ["Work across the AI product team and the platform services underneath it, from the customer-facing app down to trading and pricing APIs."],
      ],
      tech: ["TypeScript", "Node.js", "Claude", "AWS", "Evals"],
    },
    {
      title: "Software Engineer",
      org: "Klarna · full-time",
      when: "Feb 2025–present",
      points: [
        ["Maintain the Klarna app, serving over ", { metric: "100M" }, " monthly active users."],
        ["Analytics, logging and monitoring across a large mobile codebase."],
      ],
      tech: ["React Native", "Node.js", "TypeScript", "Datadog", "Amplitude"],
    },
    {
      title: "Full Stack Engineer",
      org: "Independent practice",
      when: "Nov 2022–present",
      points: [
        ["Delivered to ", { strong: "two individuals, four SMEs and one corporate" }, "."],
        ["Owned every stage myself: first conversation, scoping, pricing, delivery, invoicing and the awkward parts in between."],
        ["Negotiated contract terms directly, including a data-handling clause I refused to sign and had amended in writing."],
      ],
      tech: ["Vue", "Nuxt", "Python", "Flask", "PostgreSQL", "MongoDB", "Docker"],
    },
    {
      title: "Full Stack Engineer",
      org: "Indra · contract",
      when: "Apr 2023–Feb 2025",
      points: [
        ["Core developer on ", { strong: "Onesait Platform" }, ", a B2B product serving major Italian energy companies."],
        ["Built ", { metric: "3" }, " microservices and ", { metric: "3" }, " frontend applications from scratch."],
      ],
      tech: ["Vue", "TypeScript", "Docker", "Kubernetes", "GitLab CI"],
    },
    {
      title: "Salesforce Consultant",
      org: "Deloitte Digital · full-time",
      when: "Dec 2021–Feb 2023",
      points: [
        ["Led ", { strong: "Receptionist 2.0" }, ", an enterprise solution digitalising the traditional work of receptionists."],
        ["Managed the gradual rollout across multiple client branches, working with the people whose daily job the software changed."],
      ],
      tech: ["Salesforce", "Atlassian", "JavaScript"],
    },
  ] satisfies CvEntry[],
  work: [
    {
      title: "LexSA",
      org: "lexsa.ai",
      when: "Nov 2024–Mar 2025",
      note: ["An AI assistant helping tax professionals resolve fiscal queries. Built the retrieval, the agent orchestration and the product around them."],
      tech: ["LangChain", "LangGraph", "Claude", "Gemini", "Python", "Drizzle", "Cloudflare"],
    },
    {
      title: "Intellectual.AI",
      org: "Custom GPT, once #16 in Education",
      when: "Jul 2023–present",
      note: ["Over ", { metric: "200,000" }, " conversations and ", { metric: "90+" }, " ratings averaging ", { metric: "4.5" }, " stars."],
    },
    {
      title: "Twilight",
      org: "Demand test with paid acquisition",
      when: "Nov 2023–Nov 2024",
      note: [{ metric: "979" }, " visitors and ", { metric: "113" }, " leads for an ", { metric: "11.5%" }, " conversion rate, measured end to end."],
      tech: ["Figma", "Meta Ads", "Nuxt", "Vercel"],
    },
  ] satisfies CvEntry[],
  education: [
    { title: "MBA", org: "Bologna Business School", when: "Feb 2024–Dec 2025" },
    { title: "BSc Computer Science", org: "Università di Bologna", when: "Sep 2017–Dec 2021" },
    { title: "Startup Builder", org: "Startup Geeks", when: "Feb 2024–May 2024" },
  ] satisfies CvEntry[],
  skills: [
    { group: "AI and LLM", items: ["Claude", "LangChain", "LangGraph", "Agent design", "Evaluation frameworks", "ChatGPT", "Gemini"] },
    { group: "Languages", items: ["TypeScript", "Python", "JavaScript"] },
    { group: "Platform", items: ["Node.js", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "Cloudflare", "DigitalOcean"] },
    { group: "Interface", items: ["Vue", "Nuxt", "React Native", "Tailwind", "Figma"] },
    { group: "Spoken", items: ["Italian, native", "English, professional working"] },
  ] satisfies CvSkill[],
};
