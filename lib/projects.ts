/**
 * Case studies, carried over from the original portfolio
 * (github.com/AlviAdor/portfolio), with each project's full write-up and
 * screenshots. Every entry renders as a card in the Builds section and as a
 * statically generated page at /projects/[slug]. Live GitHub metadata
 * (language, last push, stars) is merged in by `repo` at render time.
 */

export type ProjectCategory = "security" | "fullstack" | "ml" | "graphics" | "apps";

export interface ProjectShot {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export interface ProjectHighlight {
  label: string;
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  /** Short label above the title on cards ("Featured build", "Security", …). */
  kicker: string;
  category: ProjectCategory;
  /** One- or two-sentence card summary. */
  summary: string;
  /** Large headline on the case-study page. */
  headline: string;
  stack: string[];
  highlights: ProjectHighlight[];
  storyTitle: string;
  story: string[];
  shots: ProjectShot[];
  /** GitHub repository name under the owner, used for live metadata. */
  repo: string | null;
  repoUrl: string | null;
  featured: boolean;
}

export const categoryLabel: Record<ProjectCategory, string> = {
  security: "Security",
  fullstack: "Full-stack",
  ml: "Machine learning",
  graphics: "Graphics",
  apps: "Applications",
};

export const projects: Project[] = [
  {
    slug: "secure-auth-demo",
    title: "Secure Auth Demo",
    kicker: "Featured build · PHP / MySQL",
    category: "security",
    summary:
      "Zero-knowledge encrypted contact inbox and end-to-end encrypted chat. A working app that backs up every security claim on this site with code you can run.",
    headline: "Secure Auth Demo: the app that backs up every security claim on this site.",
    stack: ["PHP", "MySQL", "Web Crypto API", "RSA-OAEP", "AES-256-GCM", "WebRTC", "Argon2id"],
    highlights: [
      {
        label: "Zero-knowledge",
        title: "Encrypted contact inbox",
        body: "Messages are RSA-OAEP + AES-256-GCM encrypted in the visitor's browser with my public key. The server stores only ciphertext, and there is no code path that could decrypt it, even if I wanted one.",
      },
      {
        label: "End-to-end",
        title: "Invite-to-chat",
        body: "I can invite a sender into a private chat. They get temporary credentials, set their own password, and get their own keypair generated client-side. Every message after that is encrypted twice, once per participant, before it leaves the browser.",
      },
      {
        label: "Hardened",
        title: "Real account security",
        body: "Argon2id/bcrypt password hashing, CSRF tokens on every state-changing request, five-strike rate limiting with lockout, and a CAPTCHA enforced server-side, not just hidden in the UI.",
      },
    ],
    storyTitle: "Why this exists",
    story: [
      "My security write-ups make specific, checkable claims: rate limiting, parameterized queries, session hardening, encrypted messaging. I got tired of security pages that assert these things in prose with no way to verify them, so I built a real app to back them up instead of writing another paragraph about best practices.",
      "The part I'm most proud of is the contact inbox. Your message is encrypted in your browser with the Web Crypto API before it's ever sent, using a keypair whose private half never leaves local storage and is protected by a key derived from my own login password. I can open phpMyAdmin, stare at the raw database rows and see nothing but ciphertext. It only turns back into words in my browser, after I type my password.",
      "From there it extends into an end-to-end encrypted chat, with voice and video over WebRTC (DTLS-SRTP, peer to peer) and even the call-setup signalling encrypted the same way as a message. Attachments are encrypted client-side too, filename included. The server's job is just to store and relay bytes it can't read.",
      "Getting there took real cryptography that had to be correct. Wrapping a one-time AES key with an RSA public key, and getting the padding, IV handling and key derivation right enough to decrypt back to the original message, took several wrong attempts that silently produced garbage. Most of the fix came from reading the Web Crypto spec instead of the first Stack Overflow answer.",
    ],
    shots: [
      { src: "/projects/secure-auth-register.png", alt: "Secure Auth Demo registration screen", caption: "Registration: your keypair is generated in-browser", width: 1040, height: 1700 },
    ],
    repo: "portfolio",
    repoUrl: "https://github.com/AlviAdor/portfolio/tree/main/demos/secure-auth",
    featured: true,
  },
  {
    slug: "security-assessment",
    title: "Isolated Network Security Assessment",
    kicker: "Security · Penetration test",
    category: "security",
    summary: "A hands-on penetration test of an unknown host: from an IP address and nothing else to a root shell, with evidence at every step.",
    headline: "A full penetration test, from zero information to root, documented end to end.",
    stack: ["Kali Linux", "Nmap", "Metasploit", "Wireshark"],
    highlights: [
      {
        label: "Recon",
        title: "No prior information",
        body: "Given nothing but an IP in an isolated virtual network, Nmap enumeration found three open ports (FTP, SSH and HTTP). Everything that followed started there.",
      },
      {
        label: "Exploitation",
        title: "A real backdoor, really used",
        body: "Service fingerprinting identified ProFTPD 1.3.3c, the release whose distributed source was backdoored. Metasploit's matching module opened a shell, and whoami returned root on the first attempt.",
      },
      {
        label: "Evidence",
        title: "Every step captured, not claimed",
        body: "Wireshark packet capture, exploit output and command history are all in the report. It's a walkthrough with proof at each step, not a plausible-sounding summary.",
      },
    ],
    storyTitle: "What the assessment actually covered",
    story: [
      "The premise was simple: here's an IP address on an isolated virtual network, here's a Kali Linux attacker box, find out everything you can and see how far you can get. No hints, no prior knowledge of the target.",
      "Nmap's initial scan found three open ports, and a service/version scan identified the FTP daemon as ProFTPD 1.3.3c, the release whose source tarball was compromised with a command-execution backdoor. Metasploit had a matching module; running it opened a shell with root privileges.",
      "From there the assessment went further than \"got a shell\". A packet capture of an FTP session recovered plaintext credentials, which led to cracking a non-system account's password to demonstrate credential-reuse risk. The report closes with concrete remediation: patch the outdated FTP service, segment the network, and stop reusing passwords across accounts.",
      "The value for me wasn't \"I ran a tool and it worked\". It was connecting the dots: recon tells you what's running, version identification tells you what's vulnerable, and exploitation only works because the first two steps were done properly. That mindset now shows up in how I build and secure software.",
    ],
    shots: [
      { src: "/projects/security-assessment-nmap.png", alt: "Nmap scan from the isolated network security assessment", caption: "Initial Nmap recon", width: 1494, height: 950 },
      { src: "/projects/security-assessment-rootshell.png", alt: "Metasploit session showing root access gained on the isolated target", caption: "Root shell via the ProFTPD backdoor", width: 1494, height: 911 },
    ],
    repo: "Security-Assessment-of-an-Unknown-System-in-an-Isolated-Virtual-Network",
    repoUrl: "https://github.com/AlviAdor/Security-Assessment-of-an-Unknown-System-in-an-Isolated-Virtual-Network",
    featured: true,
  },
  {
    slug: "cnn-custom-dataset",
    title: "CNN on a Custom Dataset",
    kicker: "Machine learning · Python",
    category: "ml",
    summary: "A convolutional network trained from scratch with no pretrained backbone, reaching 98%+ validation accuracy across three classes of animal faces.",
    headline: "A convolutional neural network, trained from scratch, not fine-tuned from a pretrained model.",
    stack: ["Python", "PyTorch", "Jupyter", "Matplotlib", "AFHQ"],
    highlights: [
      {
        label: "Architecture",
        title: "Built, not borrowed",
        body: "The CNN was designed and trained from scratch with no pretrained backbone, so every weight in it was learned on this dataset alone.",
      },
      {
        label: "Results",
        title: "98%+ validation accuracy",
        body: "Across three classes (cat, dog and wild animal faces) the confusion matrix is close to diagonal: a small handful of misclassifications out of roughly 1,500 validation images.",
      },
      {
        label: "Training",
        title: "Watched, not assumed",
        body: "Loss and accuracy were tracked across 15 epochs for both training and validation sets, which is what actually shows whether a model is learning or memorizing.",
      },
    ],
    storyTitle: "What \"from scratch\" actually means here",
    story: [
      "For a Computer Vision and Pattern Recognition assignment, the brief was to build and train a CNN on a custom dataset, in this case AFHQ-style cat, dog and wildlife face images. The constraint that mattered was no pretrained backbone. Every convolutional filter learned its weights from this dataset alone, which is a meaningfully harder exercise than fine-tuning a ResNet.",
      "The training curves matter to me more than the final accuracy. Training and validation loss drop and plateau together without the validation curve diverging upward, which tells you the model generalized rather than memorized. Getting there meant actually understanding regularization and data splits, not just running more epochs and hoping.",
      "The confusion matrix backs that up. Of roughly 500 validation images per class, the vast majority land on the diagonal. The \"wild\" class shows slightly more confusion with \"dog\" than the other pairs do, which tracks: several wild species in the set have dog-like facial structure.",
    ],
    shots: [
      { src: "/projects/cnn-confusion-matrix.png", alt: "Confusion matrix showing CNN classification accuracy across three classes", caption: "Confusion matrix, 3-class validation set", width: 567, height: 490 },
      { src: "/projects/cnn-training-curves.png", alt: "Loss and accuracy curves from training the custom-dataset CNN", caption: "Training vs. validation loss and accuracy, 15 epochs", width: 1189, height: 390 },
    ],
    repo: "CNN-Development-on-Custom-Dataset",
    repoUrl: "https://github.com/AlviAdor/CNN-Development-on-Custom-Dataset",
    featured: true,
  },
  {
    slug: "ans-hospital",
    title: "ANS Hospital Management System",
    kicker: "Full-stack · PHP / MySQL",
    category: "fullstack",
    summary: "A role-based hospital system for sensitive patient data, with MVC architecture, server-side role checks on every request, and parameterized queries throughout.",
    headline: "ANS Hospital Management System, built for real patient data, not a toy CRUD demo.",
    stack: ["PHP", "MySQL", "MVC", "Sessions", "JavaScript"],
    highlights: [
      {
        label: "Access",
        title: "Role-based staff accounts",
        body: "Doctors, admissions staff and administrators each see a different dashboard, enforced server-side on every request, not just hidden in the UI.",
      },
      {
        label: "Integrity",
        title: "Normalized patient records",
        body: "Admissions, diagnoses and billing live in a properly normalized schema, reached only through parameterized queries. There's no string-built SQL anywhere in the codebase.",
      },
      {
        label: "Validation",
        title: "Server-side on every write",
        body: "Every form (registration, appointments, diagnosis entry, billing) is re-validated server-side, regardless of what the client already checked.",
      },
    ],
    storyTitle: "Why I built it this way",
    story: [
      "This started as a university Web Technology project with a teammate. I used it to practice something I kept reading about but hadn't done: an MVC architecture with real role separation, not a login check sprinkled on top of a flat script.",
      "Staff roles have genuinely different capabilities. A doctor can enter diagnoses and update patient records, front-desk staff register patients and manage appointments, and only an admin can manage other accounts. That separation is enforced in the controller layer on every request, not by hiding buttons in the view.",
      "Most of my time went into the boring-sounding parts: session handling that survives a refresh without leaking state between roles, a schema normalized enough that updating one record can't silently desync another, and validation consistent enough that a malformed request from curl is rejected exactly like a malformed form submission.",
      "It's still a student project, not a HIPAA-compliant production system. But the habits in it (parameterized queries, role checks on every controller action, session integrity) carried into everything I've built since, including the Secure Auth Demo.",
    ],
    shots: [
      { src: "/projects/ans-hospital-banner.png", alt: "ANS Hospital project banner", caption: "Project banner", width: 6912, height: 3456 },
      { src: "/projects/ans-hospital-login.png", alt: "ANS Hospital Management System live login screen", caption: "Live login screen", width: 2560, height: 1050 },
    ],
    repo: "WT_Fall-25-26-",
    repoUrl: "https://github.com/AlviAdor/WT_Fall-25-26-",
    featured: true,
  },
  {
    slug: "somapura-mahavihara",
    title: "Somapura Mahavihara",
    kicker: "Graphics · C++ / OpenGL",
    category: "graphics",
    summary: "A computer-graphics recreation of a 1,200-year-old UNESCO-listed monastery, built directly on OpenGL and FreeGLUT with no game engine.",
    headline: "Somapura Mahavihara: a computer-graphics recreation of a 1,200-year-old monastery.",
    stack: ["C++", "OpenGL", "FreeGLUT"],
    highlights: [
      {
        label: "Rendering",
        title: "Built directly on OpenGL",
        body: "No game engine. The scene graph, camera and lighting are hand-written against raw OpenGL and FreeGLUT, so every visual decision is one I made explicitly.",
      },
      {
        label: "Scenes",
        title: "Multiple interchangeable views",
        body: "Several distinct scenes of the monastery complex, switchable by keyboard, each with its own camera framing and lighting setup.",
      },
      {
        label: "Audio",
        title: "Not a silent render",
        body: "Ambient audio layered into the scenes, so it's an experience to move through rather than a static model viewer.",
      },
    ],
    storyTitle: "Why build a renderer instead of using a game engine",
    story: [
      "Somapura Mahavihara is a UNESCO World Heritage site in Bangladesh and one of the largest known Buddhist monasteries south of the Himalayas. Reconstructing a real historical structure forces you to deal with proportion, layout and lighting that have to look right, not just render without crashing.",
      "I built it on OpenGL and FreeGLUT because the point was understanding the rendering pipeline itself (transformations, camera matrices, lighting models), not an engine's abstraction layer. Matrices that look clean in a textbook are a lot less clean when your scene renders upside down. There's nothing to blame but you and the math.",
      "It's the project furthest from security work, and I keep it in the list for exactly that reason: it's real, finished, non-trivial C++ in a completely different domain.",
    ],
    shots: [],
    repo: "Somapura-Mahavihara",
    repoUrl: "https://github.com/AlviAdor/Somapura-Mahavihara",
    featured: false,
  },
  {
    slug: "dx-ball",
    title: "DX-Ball",
    kicker: "Applications · Python",
    category: "apps",
    summary: "A brick-breaker that outgrew its prototype: five distinct modes, a boost and combo system, and fully configurable, persisted settings.",
    headline: "DX-Ball: a brick-breaker that outgrew its own prototype.",
    stack: ["Python", "pygame-ce"],
    highlights: [
      {
        label: "Modes",
        title: "Five distinct ways to play",
        body: "Classic for a balanced run, Speed for risk and reward, Zen for a relaxed survival pace, Rapid Fire for chaos, and Gauntlet, which ramps difficulty continuously the longer you survive.",
      },
      {
        label: "Systems",
        title: "Boosts and scoring that matter",
        body: "Power-ups spawn mid-run (extra life, wider paddle, slower ball, score multipliers, bonus time), each with its own visual tell, plus a combo multiplier for consecutive pickups.",
      },
      {
        label: "Settings",
        title: "Actually configurable",
        body: "Ball colour and radius, paddle speed, sound with a volume slider, a boost-animation toggle and a light/dark theme, all persisted between sessions.",
      },
    ],
    storyTitle: "Why five modes instead of one",
    story: [
      "DX-Ball started as the brick-breaker clone everyone builds once: paddle, ball, bricks, done in an afternoon. What kept me coming back was realizing that \"keep the ball alive\" supports far more variety than one difficulty curve.",
      "Each mode changes the actual rules, not just a speed multiplier. Zen is deliberately forgiving, Rapid Fire leans into frequent hazards, and Gauntlet ramps difficulty continuously so a single run goes from easy to genuinely hard without a level transition.",
      "The settings screen was worth building properly. Ball radius and paddle speed sound like minor tuning values, but they change how a mode feels. Persisting them, along with a best score per mode, is what made it feel like a real small game instead of a script I run once and forget.",
    ],
    shots: [
      { src: "/projects/dxball-menu.png", alt: "DX-Ball main menu with game modes and best scores", caption: "Mode select, with per-mode best scores", width: 1400, height: 1029 },
      { src: "/projects/dxball-gameplay.png", alt: "DX-Ball in-game screenshot with live score and boost guide", caption: "Mid-run, Classic mode", width: 1400, height: 1029 },
      { src: "/projects/dxball-settings.png", alt: "DX-Ball settings screen", caption: "Settings", width: 1400, height: 1029 },
    ],
    repo: "DX-Ball",
    repoUrl: "https://github.com/AlviAdor/DX-Ball",
    featured: false,
  },
  {
    slug: "mobile-shop-management",
    title: "Mobile Shop Management",
    kicker: "Applications · C# / .NET",
    category: "apps",
    summary: "A Windows desktop app for a real small phone shop: stock, customers and records, with password-gated deletion so a misclick can't wipe data.",
    headline: "Mobile Shop Management: a desktop app for a problem I actually watched someone have.",
    stack: ["C#", ".NET", "Windows Forms", "SQL Server"],
    highlights: [
      {
        label: "Inventory",
        title: "Phones in, phones out",
        body: "Add new stock with model, price and quantity. The view updates live as records are added, edited or sold.",
      },
      {
        label: "Customers",
        title: "A real customer ledger",
        body: "Track who bought what, keep contact details on file, and pull up a customer's history without digging through paper receipts.",
      },
      {
        label: "Protected",
        title: "Password-gated deletion",
        body: "Deleting a stock or customer record requires a password prompt, so a misclick during a busy shift can't silently wipe data.",
      },
    ],
    storyTitle: "Why a desktop app, not a web app",
    story: [
      "This was built for a small mobile-phone shop's day-to-day: adding stock, logging sales, keeping a customer list, and not losing any of it to a crashed spreadsheet. The shop has one computer and the owner wanted something that opens and just works, so a Windows Forms app made more sense than a web app.",
      "The feature I took the most care over sounds the most minor: deletion is password-gated. An accidental delete during a busy afternoon is a real problem, so removing anything requires a deliberate password prompt rather than a confirm dialog someone clicks through on autopilot.",
      "It's deliberately scoped to what the shop needed rather than a general-purpose POS system. No feature in it exists because it sounded impressive to build.",
    ],
    shots: [],
    repo: "MobileShopManagementSystem",
    repoUrl: "https://github.com/AlviAdor/MobileShopManagementSystem",
    featured: false,
  },
  {
    slug: "tourismo",
    title: "Tourismo",
    kicker: "Applications · Java",
    category: "apps",
    summary: "A Java desktop app with login, registration and article browsing, built to practice object-oriented structure with a package-per-concern layout.",
    headline: "Tourismo: a Java desktop app built to practice OOP, not just use it.",
    stack: ["Java", "OOP", "Desktop GUI"],
    highlights: [
      {
        label: "Flow",
        title: "Login, registration, homepage",
        body: "A complete account flow (authenticate existing users, register new ones, land on a central homepage), with each step a distinct, testable module.",
      },
      {
        label: "Content",
        title: "Eight article modules",
        body: "A modular article system with eight separate content modules, each its own class, showing composition over one monolithic content blob.",
      },
      {
        label: "Structure",
        title: "Package-per-concern",
        body: "Separate packages for Articles, Homepage, LoginClass and Registration: the structure you'd want in something bigger, practised at a size you can hold in your head.",
      },
    ],
    storyTitle: "Why this one is about structure, not features",
    story: [
      "Tourismo is functionally modest on purpose. The point was practising object-oriented structure, with separate packages for login, registration, the homepage and article content rather than one script that does everything.",
      "Eight article modules exist as eight classes rather than eight database rows or eight if-branches. That's a deliberate, maybe slightly over-engineered choice, because the assignment was about demonstrating OOP principles and a flat structure wouldn't have shown that.",
      "It's smaller than the others here. I keep it because it's a clean example of package-per-concern structure applied consistently, a habit that scales far better than the project where I learned it.",
    ],
    shots: [],
    repo: "Tourismo",
    repoUrl: "https://github.com/AlviAdor/Tourismo",
    featured: false,
  },
];

export const projectBySlug = new Map(projects.map((p) => [p.slug, p]));

/** Repos represented by a case study, so the "more on GitHub" list doesn't repeat them. */
export const caseStudyRepos = new Set(projects.map((p) => p.repo).filter((r): r is string => r !== null && r !== "portfolio"));
