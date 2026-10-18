import { setRequestLocale } from "next-intl/server";
import SmoothScroll from "@/components/providers/SmoothScroll";
import About from "@/components/sections/About";
import Builds from "@/components/sections/Builds";
import Certifications from "@/components/sections/Certifications";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Labs from "@/components/sections/Labs";
import Research from "@/components/sections/Research";
import Roadmap from "@/components/sections/Roadmap";
import Security from "@/components/sections/Security";
import Skills from "@/components/sections/Skills";
import LanguageNotice from "@/components/ui/LanguageNotice";
import Intro from "@/components/ui/Intro";
import Nav from "@/components/ui/Nav";
import TerminalModal from "@/components/ui/Terminal";
import { routing } from "@/i18n/routing";
import { getGitHubData } from "@/lib/github";
import { getResearchData } from "@/lib/research";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [github, research] = await Promise.all([getGitHubData(), getResearchData()]);
  const terminalData = { papers: research.papers, repos: github.repos };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: site.handle,
    url: site.url,
    image: new URL(site.portrait.src, site.url).toString(),
    jobTitle: "Cybersecurity & AI Engineer",
    email: `mailto:${site.email}`,
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
    alumniOf: { "@type": "CollegeOrUniversity", name: "American International University-Bangladesh" },
    sameAs: [site.github.url, site.linkedin],
    knowsAbout: ["Cybersecurity", "DevSecOps", "Computer Vision", "Deep Learning", "Facial Emotion Recognition", "Applied Cryptography", "Web Engineering"],
  };

  return (
    <SmoothScroll>
      <Intro />
      <Nav />
      <LanguageNotice />
      <main>
        <Hero />
        <About data={terminalData} />
        <Roadmap />
        <Labs />
        <Research data={research} />
        <Builds data={github} />
        <Certifications />
        <Security />
        <Skills />
        <Contact />
      </main>
      <Footer builtAt={github.fetchedAt} />
      <TerminalModal data={terminalData} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </SmoothScroll>
  );
}
