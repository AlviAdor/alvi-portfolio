import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GithubIcon } from "@/components/ui/BrandIcons";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Footer from "@/components/sections/Footer";
import Nav from "@/components/ui/Nav";
import TerminalModal from "@/components/ui/Terminal";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ago, LANG_COLOR } from "@/lib/format";
import { getGitHubData } from "@/lib/github";
import { categoryLabel, projectBySlug, projects } from "@/lib/projects";
import { getResearchData } from "@/lib/research";
import { site } from "@/lib/site";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug.get(slug);
  if (!project) return {};
  const shot = project.shots[0];
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.title} · ${site.handle}`,
      description: project.summary,
      url: `/projects/${project.slug}`,
      images: shot ? [{ url: shot.src, width: shot.width, height: shot.height, alt: shot.alt }] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = projectBySlug.get(slug);
  if (!project) notFound();

  const [github, research] = await Promise.all([getGitHubData(), getResearchData()]);
  const live = project.repo ? github.repos.find((r) => r.name === project.repo) : undefined;
  const now = new Date(github.fetchedAt).getTime();
  const index = projects.findIndex((p) => p.slug === project.slug);
  const prev = projects[(index - 1 + projects.length) % projects.length]!;
  const next = projects[(index + 1) % projects.length]!;
  const demoUrl = project.slug === "secure-auth-demo" && site.secureMessagingBase ? `${site.secureMessagingBase}register.php` : null;

  return (
    <SmoothScroll>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 pt-32 pb-24 sm:px-8">
        <Link href="/#builds" className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-mute uppercase hover:text-neon">
          <ArrowLeft className="size-3.5" /> All builds
        </Link>

        <header className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px] lg:items-end">
          <div>
            <p className="eyebrow">{project.kicker}</p>
            <h1 className="mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">{project.headline}</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mute sm:text-lg">{project.summary}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-l border-line pl-6 font-mono text-[11px]">
            <dt className="text-faint uppercase">Type</dt>
            <dd className="text-ink/80">{categoryLabel[project.category]}</dd>
            {live?.language && (
              <>
                <dt className="text-faint uppercase">Language</dt>
                <dd className="flex items-center gap-2 text-ink/80">
                  <span className="size-2 rounded-full" style={{ background: LANG_COLOR[live.language] ?? "#8A94A8" }} />
                  {live.language}
                </dd>
              </>
            )}
            {live?.pushedAt && (
              <>
                <dt className="text-faint uppercase">Updated</dt>
                <dd className="text-ink/80">{ago(live.pushedAt, now)}</dd>
              </>
            )}
            <dt className="text-faint uppercase">Stack</dt>
            <dd className="text-ink/80">{project.stack.join(" · ")}</dd>
          </dl>
        </header>

        <div className="mt-10 flex flex-wrap gap-3">
          {project.repoUrl && (
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-neon px-5 py-3 font-mono text-xs tracking-[0.14em] text-obsidian uppercase hover:shadow-[0_0_40px_-6px_rgb(0_240_255/0.7)]">
              <GithubIcon className="size-4" /> View source
            </a>
          )}
          {demoUrl && (
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-line px-5 py-3 font-mono text-xs tracking-[0.14em] text-ink uppercase hover:border-neon hover:text-neon">
              <ExternalLink className="size-4" /> Try the live demo
            </a>
          )}
        </div>

        <section aria-label="Highlights" className="mt-16 grid gap-4 md:grid-cols-3">
          {project.highlights.map((h) => (
            <article key={h.title} data-reveal className="glass noise p-7">
              <p className="font-mono text-[10px] tracking-[0.18em] text-neon uppercase">{h.label}</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{h.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">{h.body}</p>
            </article>
          ))}
        </section>

        {project.shots.length > 0 && (
          <section aria-label="Screenshots" className="mt-16">
            <p className="eyebrow mb-6">What it actually looks like</p>
            <div className={`grid gap-6 ${project.shots.length > 1 ? "md:grid-cols-2" : ""}`}>
              {project.shots.map((shot, i) => (
                <figure key={shot.src} data-reveal className={project.shots.length === 3 && i === 0 ? "md:col-span-2" : ""}>
                  <div className={`glass overflow-hidden p-2 ${shot.height > shot.width ? "mx-auto max-w-sm" : ""}`}>
                    <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(min-width: 1024px) 1100px, 100vw" className="h-auto w-full" />
                  </div>
                  <figcaption className="mt-3 font-mono text-[11px] text-faint">{shot.caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="story" className="mt-20 grid gap-10 lg:grid-cols-[300px_1fr]">
          <h2 id="story" data-reveal className="text-2xl font-semibold tracking-tight text-balance">
            {project.storyTitle}
          </h2>
          <div data-reveal className="space-y-5 text-base leading-relaxed text-ink/80">
            {project.story.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </div>
        </section>

        <nav aria-label="More projects" className="mt-24 grid gap-4 border-t border-line pt-10 sm:grid-cols-2">
          <Link href={`/projects/${prev.slug}`} className="group border border-line p-6 transition-colors hover:border-neon/50">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
              <ArrowLeft className="size-3" /> Previous
            </span>
            <span className="mt-2 block text-lg font-medium group-hover:text-neon">{prev.title}</span>
          </Link>
          <Link href={`/projects/${next.slug}`} className="group border border-line p-6 text-right transition-colors hover:border-neon/50">
            <span className="flex items-center justify-end gap-2 font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
              Next <ArrowRight className="size-3" />
            </span>
            <span className="mt-2 block text-lg font-medium group-hover:text-neon">{next.title}</span>
          </Link>
        </nav>

        <div className="mt-10 text-center">
          <Link href="/#contact" className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-neon uppercase hover:text-ink">
            Want something like this built? Get in touch <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </main>
      <Footer builtAt={github.fetchedAt} />
      <TerminalModal data={{ papers: research.papers, repos: github.repos }} />
    </SmoothScroll>
  );
}
