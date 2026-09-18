/**
 * Marketing + site content for the GEO Tool frontend.
 * Ported from GEO-UI-Version-5/src/data/site.js. This is static site copy
 * (navigation, pricing tiers, FAQ, solutions) — it is NOT audit data and is
 * never used by the audit flow or the dashboard.
 */

export const nav = [
  {
    label: "Product",
    to: "/product/geo-audit",
    columns: [
      {
        title: "Measure",
        links: [
          { label: "GEO Audit", to: "/product/geo-audit", desc: "One score for your AI answer visibility" },
          { label: "AI Visibility", to: "/product/geo-audit#ai-visibility", desc: "Presence across ChatGPT, Claude, Perplexity, Gemini, Copilot" },
          { label: "Competitor Intelligence", to: "/product/geo-audit#competitive-position", desc: "Share of voice vs the brands you lose to" },
        ],
      },
      {
        title: "Improve",
        links: [
          { label: "Page-Level Findings", to: "/product/geo-audit#page-findings", desc: "Where technical and content fixes matter" },
          { label: "Technical GEO", to: "/product/geo-audit#technical-geo", desc: "robots.txt, llms.txt, schema, rendering" },
          { label: "Action Plan & Roadmap", to: "/product/geo-audit#action-plan", desc: "A dated 90-day plan with owners" },
        ],
      },
    ],
  },
  { label: "Pricing", to: "/pricing" },
  {
    label: "Solutions",
    to: "/solutions",
    columns: [
      {
        title: "By team",
        links: [
          { label: "For Marketing teams", to: "/solutions#marketing", desc: "Own the AI answer as a channel" },
          { label: "For SEO teams", to: "/solutions#seo", desc: "Extend search visibility to LLMs" },
          { label: "For Agencies", to: "/solutions#agencies", desc: "Audit and report across every client" },
          { label: "For Enterprises", to: "/enterprise", desc: "Many brands, many domains, one view" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    to: "/resources",
    columns: [
      {
        title: "Learn",
        links: [
          { label: "The GEO Guide", to: "/resources#guide", desc: "What Generative Engine Optimization is" },
          { label: "Blog", to: "/resources#blog", desc: "Field notes on AI search" },
          { label: "Case studies", to: "/resources#cases", desc: "Before and after GEO scores" },
          { label: "FAQ", to: "/resources#faq", desc: "Common questions, answered" },
        ],
      },
    ],
  },
  { label: "Enterprise", to: "/enterprise", external: true },
] as const;

export const socialProof = {
  logos: ["Northwind", "Halcyon Labs", "Meridian Retail", "Foundry Health", "Cedar & Vine", "Atlas Freight"],
  stat: { value: "2,400+", label: "domains audited on phazeAi" },
  testimonials: [
    {
      quote:
        "We were invisible for 'best analytics platform' on every model. phazeAi found it, told us why, and the 90-day plan moved us from a 54 to a 71.",
      name: "Dana Whitfield",
      role: "VP Marketing, Northwind",
    },
    {
      quote:
        "The prompt-level evidence is what got the engineering team to prioritise it. You cannot argue with a screenshot of ChatGPT recommending your competitor.",
      name: "Marcus Lee",
      role: "Head of SEO, Halcyon Labs",
    },
    {
      quote:
        "As an agency we run a phazeAi audit in the first week of every engagement. It is the fastest way to show a client where they actually stand in AI search.",
      name: "Priya Raman",
      role: "Founder, Raman & Co.",
    },
  ],
};

export const pricing = {
  note: "Prices in USD. Checkout in this build is simulated — see the Paywall section of FINAL-INTEGRATION.md.",
  plans: [
    {
      id: "free",
      name: "Free Audit",
      price: 0,
      cadence: "forever",
      blurb: "See where you stand in AI search.",
      cta: "Run a free audit",
      ctaTo: "/audit",
      featured: false,
      features: [
        "GEO score out of 100",
        "All dimension scores",
        "Top strengths and weaknesses",
        "Your #1 opportunity with evidence",
        "Example AI answers",
        "Competitor snapshot",
      ],
      limits: "One domain. Re-run monthly.",
    },
    {
      id: "report",
      name: "Full GEO Report",
      price: 149,
      cadence: "one-time",
      blurb: "The complete audit for one domain.",
      cta: "Get the full report",
      ctaTo: "/checkout",
      featured: true,
      features: [
        "Everything in Free, plus",
        "Detailed AI visibility by model and intent",
        "All prompt-level evidence cards",
        "Full competitor intelligence and share of voice",
        "Page-level findings and content priorities",
        "Technical GEO with copy-paste robots.txt, llms.txt and schema",
        "Prioritised action plan and dated roadmap",
        "PDF export and shareable link",
      ],
      limits: "One domain, one audit. Includes 30 days of re-runs.",
    },
    {
      id: "monitor",
      name: "GEO Monitor",
      price: 99,
      cadence: "per month",
      blurb: "Track and improve every month.",
      cta: "Start monitoring",
      ctaTo: "/checkout",
      comingSoon: true,
      featured: false,
      features: [
        "Everything in Full GEO Report",
        "Weekly re-audits and trend lines",
        "Alerts when a competitor overtakes you",
        "Up to 3 domains",
        "Progress tracking against your roadmap",
      ],
      limits: "Billed monthly. Cancel anytime.",
    },
  ],
  faq: [
    {
      q: "How is the GEO score calculated?",
      a: "The headline Overall GEO Score uses website readiness when available, followed by measured AI visibility or available website optimization signals. AI Visibility, Recommendation Performance and Competitive Position remain separate report metrics.",
    },
    {
      q: "Which AI models do you test?",
      a: "ChatGPT (GPT-4o), Claude, Perplexity, Google AI Overviews / Gemini and Microsoft Copilot, depending on which providers the audit backend is configured to run. Each prompt is run multiple times per model and aggregated.",
    },
    {
      q: "Do I need an account?",
      a: "You can run a free audit and see your score without signing up. An account is used to save audits and track progress over time.",
    },
    {
      q: "What is the difference between GEO and SEO?",
      a: "SEO optimises for ranked links on a results page. GEO optimises for being recommended and represented accurately inside an AI-generated answer, where there is often no list of links at all.",
    },
    {
      q: "How long does an audit take?",
      a: "Typically 1–4 minutes. The processing screen shows live status while the backend crawls your site and probes the configured AI engines.",
    },
    {
      q: "Can I re-run an audit?",
      a: "Yes. Re-running produces a fresh score against the current state of your site and the models.",
    },
  ],
};

export const solutions = [
  {
    id: "marketing",
    audience: "Marketing teams",
    headline: "Own the AI answer the way you own the SERP.",
    body: "AI assistants are becoming the first place buyers ask what to buy. phazeAi shows you the share of voice you hold in that conversation, the exact prompts where a competitor is named instead of you, and the content changes that close the gap.",
    points: [
      "Share of voice tracking against your named competitor set",
      "Prompt-level evidence you can put in a board deck",
      "A content plan mapped to the queries you are losing",
    ],
    metric: { value: "9% → 15%", label: "typical share-of-voice gain in 90 days" },
  },
  {
    id: "seo",
    audience: "SEO teams",
    headline: "Extend everything you know about search to LLMs.",
    body: "Your technical and content instincts still matter — they just point somewhere new. phazeAi checks robots.txt and llms.txt, structured-data coverage, rendering and entity consistency, then tells you which pages models can actually read and quote.",
    points: [
      "Crawler-access and llms.txt checks for every major AI agent",
      "Page-level GEO scores with the specific fix for each",
      "Schema and entity recommendations, ready to paste",
    ],
    metric: { value: "18% → 45%", label: "structured-data coverage after Phase 1" },
  },
  {
    id: "content",
    audience: "Content teams",
    headline: "Write the answer models want to quote.",
    body: "phazeAi identifies the buyer questions your site cannot answer, the strengths that are invisible because they lack a quotable page, and the comparison content competitors publish about you that you do not publish back.",
    points: [
      "The buyer questions with no answer on your site",
      "Quotability scoring for your key commercial pages",
      "A ranked list of comparison and 'best for' pages to write",
    ],
    metric: { value: "22 → 48", label: "buyer questions fully answerable" },
  },
  {
    id: "agencies",
    audience: "Agencies",
    headline: "A GEO audit in the first week of every engagement.",
    body: "Run a phazeAi audit for a new client and walk into the kickoff with a number, a competitor comparison and a 90-day plan. White-label the report, manage every client from one workspace, and show progress month over month.",
    points: [
      "Unlimited client workspaces on the agency plan",
      "White-label PDF export and shareable links",
      "Portfolio view across every client's GEO score",
    ],
    metric: { value: "1 week", label: "from kickoff to a defensible GEO plan" },
  },
];

export const resources = {
  guide: {
    title: "The GEO Guide",
    summary:
      "Generative Engine Optimization is the practice of making sure large language models recommend and accurately represent your brand in AI-generated answers. This is the short version.",
    chapters: [
      { n: "01", title: "Why AI answers are a distribution channel", read: "4 min" },
      { n: "02", title: "The dimensions of GEO", read: "7 min" },
      { n: "03", title: "Machine access: robots.txt, llms.txt, rendering", read: "6 min" },
      { n: "04", title: "Answerability and structured content", read: "8 min" },
      { n: "05", title: "Entity consistency and the knowledge graph", read: "5 min" },
      { n: "06", title: "Reviews and third-party authority", read: "6 min" },
      { n: "07", title: "Measuring share of voice against competitors", read: "5 min" },
      { n: "08", title: "Building a 90-day GEO roadmap", read: "6 min" },
    ],
  },
  posts: [
    { title: "We asked 5 models 'best CRM for a small team' 300 times. Here is what happened.", tag: "Research", read: "9 min", date: "Aug 2026" },
    { title: "Your pricing page is probably invisible to ChatGPT. Here is the fix.", tag: "Technical", read: "5 min", date: "Aug 2026" },
    { title: "llms.txt, explained: what to put in it and why it matters", tag: "Technical", read: "6 min", date: "Jul 2026" },
    { title: "Share of voice is the only GEO metric your CEO will remember", tag: "Strategy", read: "4 min", date: "Jul 2026" },
  ],
  cases: [
    { company: "Northwind", industry: "Analytics", before: 54, after: 71, days: 92, quote: "From invisible to shortlisted on every model." },
    { company: "Halcyon Labs", industry: "DevTools", before: 47, after: 69, days: 88, quote: "Prompt evidence got engineering to prioritise it." },
    { company: "Cedar & Vine", industry: "DTC", before: 61, after: 78, days: 90, quote: "Doubled our AI-assisted revenue in a quarter." },
  ],
};

export const enterprise = {
  headline: "GEO intelligence for every brand and domain you own.",
  sub: "phazeAi Enterprise brings multi-brand tracking, team workflows, SSO and a dedicated analyst into one workspace.",
  capabilities: [
    { title: "Multi-brand, multi-domain", body: "Track every product line and regional domain in one portfolio view, with roll-up scoring and per-brand roadmaps." },
    { title: "Team workflows", body: "Assign actions to owners, sync the roadmap to Jira or Linear, and review progress in a weekly digest." },
    { title: "Governance & access", body: "SSO / SAML, role-based access, audit logs, and a private benchmark set for your category." },
    { title: "Reporting at scale", body: "Scheduled executive reports, white-label exports, and an API for your own dashboards." },
    { title: "Dedicated support", body: "A named GEO analyst, quarterly strategy reviews, and priority turnaround on new audits." },
    { title: "Custom benchmarks", body: "Define your own competitor set and intent taxonomy; we calibrate scoring to your market." },
  ],
  stats: [
    { value: "40+", label: "brands in the largest workspace" },
    { value: "99.9%", label: "reporting uptime" },
    { value: "< 24h", label: "new-audit turnaround" },
  ],
};

/** Live status labels for the processing screen. Generic — no fictional company. */
export const processingStages = [
  { key: "crawl", label: "Discovering website pages", detail: "Fetching and rendering your pages" },
  { key: "entity", label: "Understanding brand and entity", detail: "Resolving the knowledge graph and profiles" },
  { key: "technical", label: "Checking technical GEO", detail: "robots.txt, llms.txt, schema coverage, rendering" },
  { key: "visibility", label: "Testing AI visibility", detail: "Running buyer-intent prompts across the configured models" },
  { key: "competitors", label: "Analyzing competitors", detail: "Share of voice across the tracked competitor set" },
  { key: "citations", label: "Reviewing prompt evidence", detail: "Checking observed model responses and outcomes" },
  { key: "recommend", label: "Generating recommendations", detail: "Scoring dimensions and building the action plan" },
];
