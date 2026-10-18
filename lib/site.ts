import type { Paper } from "./types";

/**
 * Single source of truth for everything personal on the site. Edit here;
 * sections, the terminal, metadata and the API fallbacks all read from it.
 */
export const site = {
  name: "Md. Faizal Alvi Sarker",
  handle: "Alvi Ador",
  shortName: "Alvi",
  roles: ["Cybersecurity & DevSecOps Engineer", "AI / Computer-Vision Researcher", "Full-Stack Architect"],
  location: "Dhaka, Bangladesh",
  timezone: "Asia/Dhaka",
  education: "B.Sc. CSE, American International University–Bangladesh (Cybersecurity major, ML minor)",
  availability: "Open to ML / AI internships & research collaborations",
  email: "sarker.faizal2537@gmail.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://alviador.is-a.dev",
  github: { user: "AlviAdor", url: "https://github.com/AlviAdor" },
  linkedin: "https://www.linkedin.com/in/alviador",
  researchgate: "https://www.researchgate.net/search/researcher?q=Md.%20Faizal%20Alvi%20Sarker",
  /** Name exactly as it appears on ResearchGate-minted DOIs (DataCite creators.name). */
  researchgateCreatorName: "MD. Faizal Alvi Sarker",
  openalexAuthorId: process.env.OPENALEX_AUTHOR_ID ?? "A5147350797",
  /**
   * Base URL of the Secure Auth Demo backend (with trailing slash), e.g.
   * "https://alviador.freehosting.dev/". When set, the contact form offers an
   * end-to-end encrypted channel into the zero-knowledge inbox and the Secure
   * Auth case study links to the live demo. Empty = feature hidden.
   */
  secureMessagingBase: process.env.NEXT_PUBLIC_SECURE_MESSAGING_BASE ?? "",
  /** Research lines in progress beyond published work (from the About page). */
  researchInProgress: 4,
  portrait: {
    src: "/alvi-ador.jpg",
    width: 1000,
    height: 1246,
    alt: "Portrait of Md. Faizal Alvi Sarker in a light grey suit and black shirt",
    /** Face region in UV space (0..1, origin bottom-left) used by the scanner frame. */
    faceBox: { x: 0.37, y: 0.7, w: 0.25, h: 0.25 },
  },
} as const;

export const headline = {
  kicker: "Deep learning × high-performance web",
  title: ["I train models that see.", "I build systems that ship them."],
  sub: "Computer-vision research, from lightweight facial-emotion networks to retinal OCT classifiers, paired with full-stack engineering that puts those models in front of real users.",
} as const;

export const story = {
  intro:
    "Computer Science & Engineering student with a specific obsession: software that holds up when someone actually tries to break it, not just when a demo goes well. Early-career, self-taught in most of the parts that matter, and allergic to claiming something works when I haven't checked.",
  research:
    "I build and stress-test vision models under real constraints: small parameter budgets, imbalanced classes and honest evaluation. I trained a CNN from scratch to 98%+ validation accuracy without a pretrained backbone, and co-authored work on lightweight, cost-sensitive facial emotion recognition for real-time use in healthcare and surveillance. Right now: a confusion-aware multi-scale CNN for retinal OCT and an interval-stratified benchmark of C2-beacon detection on IoT traffic.",
  engineering:
    "I ship the systems around the models: role-separated PHP/MySQL back ends, a zero-knowledge encrypted inbox and chat built on the Web Crypto API, .NET desktop tools, an OpenGL monastery and WebGL front ends like this one. Security is the lens I run every project through, because it's the field where \"looks like it works\" and \"actually works\" are most dangerously far apart.",
};

/** Plan → Build → Audit → Maintain: how security and engineering blend. */
export const method: { step: string; body: string }[] = [
  { step: "Plan", body: "Design threats before code. Map attack vectors, data flows and access controls up front." },
  { step: "Build", body: "Verified libraries, parameterized queries, encryption. Every input is questioned; defaults are secure." },
  { step: "Audit", body: "Test for logic flaws, injection, session hijacking and side channels before anything ships." },
  { step: "Maintain", body: "Patch, monitor logs, rotate credentials, and respond to incidents quickly." },
];

/** Four habits that show up in everything. */
export const habits: { title: string; body: string }[] = [
  { title: "Question first", body: "Before writing a feature, I ask what happens when someone tries to misuse it. That question shapes the design, not a review that happens afterwards." },
  { title: "Build it real", body: "If I claim something works, it has to actually run. I'd rather ship one real, working thing than describe ten hypothetical ones." },
  { title: "Read the spec", body: "Tutorials get you started. Getting cryptography, sessions or a rendering pipeline correct means reading the real documentation, not the first example that compiles." },
  { title: "Finish the boring part", body: "Error handling, validation, the fifth edge case nobody asks about. That's where most of my time goes, because that's where most real bugs live." },
];

/** "What I've had to push through": the parts that didn't work on the first try. */
export const fieldNotes: { title: string; body: string }[] = [
  {
    title: "Cryptography that actually had to be correct",
    body: "Reading about RSA-OAEP and AES-256-GCM is one thing. Getting a browser to wrap a one-time key with a public key, with the padding, IV handling and key derivation all correct enough to decrypt back to the original message, took several wrong attempts that silently produced garbage, and a lot of reading the Web Crypto spec instead of the first Stack Overflow answer.",
  },
  {
    title: "A rendering pipeline with no safety net",
    body: "Somapura Mahavihara was my first real graphics project, built on raw OpenGL. Transformation matrices and camera math look clean in a textbook and a lot less clean when your scene renders upside down. There's no abstraction layer to blame, just you and the math.",
  },
  {
    title: "A penetration test with no hints",
    body: "An IP address and nothing else. No known vulnerability to confirm, no walkthrough. Just Nmap, a lot of reading about what an outdated FTP daemon actually was, and the slow work of confirming an exploit would work before trying it for real.",
  },
  {
    title: "A model that had to generalize, not memorize",
    body: "It's easy to push a CNN's training accuracy near 100%, which usually means something is wrong. Getting training and validation curves to track each other meant actually understanding regularization and data splits, not running more epochs and hoping.",
  },
  {
    title: "Coursework plus projects nobody assigned",
    body: "Most of what's on this site wasn't required for a grade. Building it anyway, on top of a full course load, meant a lot of late nights deciding a side project mattered more than finishing early. I'd make that trade again every time.",
  },
];

/** First-visit greeting cycle (one per session). */
export const greetings = ["Greetings", "Hello", "Assalamu alaikum", "Hola", "Salut", "Ciao", "Merhaba", "Xin chào", "你好", "مرحبا", "Привет", "Bonjour"];

export interface SecurityPillar {
  id: string;
  index: string;
  title: string;
  tagline: string;
  statement: string;
  controls: { label: string; title: string; body: string }[];
  conviction: string;
}

/** The four security deep dives from the original portfolio, backed by the Secure Auth Demo. */
export const securityPillars: SecurityPillar[] = [
  {
    id: "authentication",
    index: "01",
    title: "Authentication",
    tagline: "Verified before anything else happens.",
    statement:
      "Rate-limited logins, a CAPTCHA that can't be skipped by hiding it, and sessions that rotate on every privilege change. Authentication isn't a form that calls it a day once a password matches; it's enforced server-side, every time, the same way.",
    controls: [
      { label: "Protection", title: "Rate limiting", body: "Brute-force attempts are throttled. Five failed logins lock the account temporarily." },
      { label: "Sessions", title: "Session integrity", body: "Tokens are time-limited, rotated on privilege change and cleared completely on logout." },
      { label: "Access", title: "Role-based access", body: "Each account type sees only what it's permitted to, checked in the controller on every request." },
    ],
    conviction: "I treat authentication as a contract, not a checkbox. If your account exists, it is defended.",
  },
  {
    id: "validation",
    index: "02",
    title: "Validation",
    tagline: "Nothing reaches the database unchecked.",
    statement:
      "Every field is re-verified server-side, every query is parameterized, and every character that could pass as a script is escaped before it's stored or shown back. There isn't a single trust-the-client shortcut anywhere in the path.",
    controls: [
      { label: "Server-side", title: "Re-verified on the server", body: "Every input is re-checked and sanitized before any database operation, whatever the client already checked." },
      { label: "Injection", title: "Parameterized queries", body: "User input is never concatenated into SQL, so injection has nowhere to go." },
      { label: "XSS", title: "Output escaping", body: "Special characters are escaped, so scripts can't execute from stored or displayed data." },
    ],
    conviction: "Validation is not a courtesy, it's a barrier. Every field is questioned and every submission is tested.",
  },
  {
    id: "integrity",
    index: "03",
    title: "Data integrity",
    tagline: "Records that can't quietly drift wrong.",
    statement:
      "Strict schema types, constraints the database itself enforces, and foreign keys that cascade instead of leaving orphaned rows. Accuracy isn't checked after the fact; the structure doesn't allow it to break.",
    controls: [
      { label: "Schema", title: "Strict design", body: "Every field has defined types, lengths and rules. Malformed data is rejected at the boundary." },
      { label: "Queries", title: "Parameterized safety", body: "Careful query construction leaves SQL injection no path into the database." },
      { label: "Constraints", title: "Enforced by the database", body: "Keys and constraints keep records consistent even if application code has a bad day." },
    ],
    conviction: "Carelessness, shortcuts and unverified practices don't get to put your data at risk. That part is non-negotiable.",
  },
  {
    id: "messaging",
    index: "04",
    title: "Encrypted messaging",
    tagline: "Locked by design, not by promise.",
    statement:
      "Text, voice and video calls, and file attachments are all encrypted end to end by default, with no toggle to remember. Not \"encrypted at rest\", and not \"encrypted on our servers, which we can still read\": encrypted before it leaves your device and decrypted only on the other person's.",
    controls: [
      { label: "Text", title: "RSA-OAEP + AES-256-GCM", body: "Each message gets a fresh AES key, wrapped with the recipient's RSA public key in the browser before any request is made. The database stores ciphertext only." },
      { label: "Calls", title: "DTLS-SRTP, peer to peer", body: "Audio and video flow directly between browsers over WebRTC, and the call-setup signalling is encrypted like a message too." },
      { label: "Files", title: "Attachments, same guarantee", body: "Files are encrypted client-side before upload, filename included. The server can confirm a file exists, not what it is." },
    ],
    conviction: "I can open phpMyAdmin myself, the person who built it, and read nothing. That isn't a policy I promise to follow; it's the only thing the code can do.",
  },
];

export interface CuratedProject {
  blurb: string;
  stack: string[];
  featured?: boolean;
}

/**
 * Context for repositories that don't have a full case study in lib/projects.ts.
 * Repos not listed here fall back to their GitHub description.
 */
export const projectNotes: Record<string, CuratedProject> = {
  "shopify-3d-store": { blurb: "3D storefront experiment built in TypeScript.", stack: ["TypeScript", "3D", "E-commerce"], featured: true },
  "Demo-Shop": { blurb: "A demo storefront that shows clients what their site could look like before a line of production code is written.", stack: ["TypeScript", "Web"], featured: true },
  "Sales-Intelligence-Data-Analysis": { blurb: "Data cleaning, analysis and visualisation of a sales dataset with Pandas, NumPy and Matplotlib.", stack: ["Python", "Pandas", "Matplotlib"] },
  "lumina-dental": { blurb: "PHP website for a dental practice.", stack: ["PHP", "MySQL"] },
  portfolio: { blurb: "The previous security-focused portfolio, plus the Secure Auth Demo's PHP source in demos/secure-auth.", stack: ["HTML", "CSS", "JavaScript", "PHP"] },
};

/** Coursework/scratch repositories that are never listed. */
export const hiddenRepos = new Set(["SE_Fall-25-26", "java-Project"]);

/**
 * Research that the live sync cannot know about (work in progress) plus
 * editorial context (summary, tags) merged onto synced records by DOI.
 */
export const curatedResearch: Omit<Paper, "bibtex" | "citations" | "source">[] = [
  {
    id: "fer-cost-sensitive-2026",
    title: "Lightweight Cost-Sensitive Deep Learning for Real-Time Facial Emotion Recognition in Healthcare and Smart Surveillance Systems",
    authors: ["Tawsif Jawad Efty", "Jabir Al Nahean", "MD. Faizal Alvi Sarker", "Tanvir Islam"],
    year: 2026,
    venue: "ResearchGate preprint",
    status: "preprint",
    summary:
      "A compact EfficientNet-style FER pipeline trained with a cost-sensitive objective so that rare, clinically important expressions are not drowned out by majority classes. It is designed for real-time inference on modest hardware in healthcare monitoring and smart-surveillance settings.",
    tags: ["Facial Emotion Recognition", "EfficientNet", "Cost-sensitive learning", "Real-time"],
    doi: "10.13140/RG.2.2.33309.88804",
    url: "https://www.researchgate.net/doi/10.13140/RG.2.2.33309.88804",
    pdfUrl: null,
  },
  {
    id: "oct-c8-multiscale",
    title: "Multi-Scale CNN with a Confusion-Aware Head for Eight-Class Retinal OCT Classification",
    authors: ["Md. Faizal Alvi Sarker"],
    year: 2026,
    venue: "Manuscript in preparation",
    status: "in-progress",
    summary:
      "A multi-scale CNN backbone with an auxiliary confusion-aware head for the eight OCT-C8 classes (AMD, CNV, CSR, DME, DR, Drusen, MH, Normal), evaluated with a held-out test set that never touches model selection, seed-averaged comparisons and Grad-CAM explanations.",
    tags: ["Medical imaging", "Multi-scale CNN", "Grad-CAM", "PyTorch"],
    doi: null,
    url: null,
    pdfUrl: null,
  },
  {
    id: "quiet-signal-c2",
    title: "Catching the Quiet Signal: An Interval-Stratified Benchmark of C2 Beaconing Detection",
    authors: ["Md. Faizal Alvi Sarker"],
    year: 2026,
    venue: "Undergraduate thesis (in progress)",
    status: "in-progress",
    summary:
      "Benchmarks Suricata signatures against Random Forest, kNN and histogram gradient boosting on IoT-23, CTU-13 and a synthetic corpus with known beacon interval and jitter. Results are stratified by beacon interval to show where detectors degrade as command-and-control traffic gets slower and quieter.",
    tags: ["Network security", "C2 beaconing", "Gradient boosting", "IoT-23"],
    doi: null,
    url: null,
    pdfUrl: null,
  },
];

export type SkillGroup = "ai" | "web" | "systems" | "security";

export interface SkillNode {
  id: string;
  group: SkillGroup;
  /** 1 (supporting) … 3 (core) – drives node radius. */
  weight: 1 | 2 | 3;
}

export const skillGroups: Record<SkillGroup, { label: string; color: string }> = {
  ai: { label: "AI / Vision", color: "#00F0FF" },
  web: { label: "Web architecture", color: "#6366F1" },
  systems: { label: "Systems & data", color: "#A5B4FC" },
  security: { label: "Security", color: "#F472B6" },
};

export const skills: SkillNode[] = [
  { id: "PyTorch", group: "ai", weight: 3 },
  { id: "EfficientNet", group: "ai", weight: 3 },
  { id: "TinyML", group: "ai", weight: 2 },
  { id: "CNNs", group: "ai", weight: 3 },
  { id: "Computer Vision", group: "ai", weight: 3 },
  { id: "Grad-CAM", group: "ai", weight: 1 },
  { id: "scikit-learn", group: "ai", weight: 2 },
  { id: "Python", group: "systems", weight: 3 },
  { id: "NumPy / Pandas", group: "systems", weight: 2 },
  { id: "C++", group: "systems", weight: 2 },
  { id: "OpenGL", group: "systems", weight: 1 },
  { id: "SQL", group: "systems", weight: 2 },
  { id: "C# / .NET", group: "systems", weight: 1 },
  { id: "TypeScript", group: "web", weight: 3 },
  { id: "Next.js", group: "web", weight: 3 },
  { id: "React", group: "web", weight: 2 },
  { id: "WebGL", group: "web", weight: 3 },
  { id: "Three.js", group: "web", weight: 2 },
  { id: "PHP", group: "web", weight: 1 },
  { id: "Threat modelling", group: "security", weight: 2 },
  { id: "Network forensics", group: "security", weight: 2 },
  { id: "Kali / Metasploit", group: "security", weight: 1 },
  { id: "Applied cryptography", group: "security", weight: 3 },
  { id: "Wireshark / Nmap", group: "security", weight: 1 },
  { id: "Java", group: "systems", weight: 1 },
  { id: "MVC / MySQL", group: "web", weight: 2 },
];

export const skillLinks: [string, string][] = [
  ["PyTorch", "EfficientNet"],
  ["PyTorch", "CNNs"],
  ["PyTorch", "Python"],
  ["PyTorch", "Grad-CAM"],
  ["EfficientNet", "TinyML"],
  ["EfficientNet", "Computer Vision"],
  ["CNNs", "Computer Vision"],
  ["CNNs", "Grad-CAM"],
  ["TinyML", "C++"],
  ["TinyML", "Computer Vision"],
  ["scikit-learn", "Python"],
  ["scikit-learn", "Network forensics"],
  ["NumPy / Pandas", "Python"],
  ["NumPy / Pandas", "scikit-learn"],
  ["Computer Vision", "WebGL"],
  ["C++", "OpenGL"],
  ["OpenGL", "WebGL"],
  ["WebGL", "Three.js"],
  ["Three.js", "React"],
  ["React", "Next.js"],
  ["Next.js", "TypeScript"],
  ["TypeScript", "React"],
  ["Next.js", "SQL"],
  ["PHP", "SQL"],
  ["PHP", "Threat modelling"],
  ["C# / .NET", "SQL"],
  ["Threat modelling", "Network forensics"],
  ["Network forensics", "Kali / Metasploit"],
  ["Python", "Network forensics"],
  ["Python", "Computer Vision"],
  ["Applied cryptography", "TypeScript"],
  ["Applied cryptography", "PHP"],
  ["Applied cryptography", "Threat modelling"],
  ["Wireshark / Nmap", "Kali / Metasploit"],
  ["Wireshark / Nmap", "Network forensics"],
  ["MVC / MySQL", "PHP"],
  ["MVC / MySQL", "SQL"],
  ["Java", "C# / .NET"],
  ["Java", "C++"],
];
