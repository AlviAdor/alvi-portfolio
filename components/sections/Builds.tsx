import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import CommitMatrix from "@/components/ui/CommitMatrix";
import SectionHeading from "@/components/ui/SectionHeading";
import TiltCard from "@/components/ui/TiltCard";
import { ago, LANG_COLOR } from "@/lib/format";
import { caseStudyRepos, categoryLabel, projects, type Project } from "@/lib/projects";
import type { GitHubData, RepoSummary } from "@/lib/types";

function ProjectCard({ project, live, now, large }: { project: Project; live: RepoSummary | undefined; now: number; large: boolean }) {
  const shot = project.shots[0];
  return (
    <TiltCard className="h-full" max={large ? 5 : 8}>
      <Link href={`/projects/${project.slug}`} className="glass noise group flex h-full flex-col overflow-hidden transition-colors hover:border-neon/40">
        {shot && (
          <div className={`relative overflow-hidden border-b border-line bg-abyss ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              sizes={large ? "(min-width: 1024px) 620px, 100vw" : "(min-width: 1024px) 400px, 100vw"}
              className="object-cover object-top opacity-80 transition-all duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
          </div>
        )}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono text-[10px] tracking-[0.18em] text-neon uppercase">{project.kicker}</p>
            <ArrowUpRight className="size-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neon" aria-hidden />
          </div>
          <h3 className={`mt-3 font-semibold tracking-tight transition-colors group-hover:text-neon ${large ? "text-2xl" : "text-lg"}`}>{project.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-mute">{project.summary}</p>
          <ul className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.slice(0, large ? 6 : 4).map((t) => (
              <li key={t} className="border border-line px-2 py-0.5 font-mono text-[10px] text-ink/60">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center gap-4 pt-6 font-mono text-[11px] text-faint">
            <span>{categoryLabel[project.category]}</span>
            {live?.language && (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: LANG_COLOR[live.language] ?? "#8A94A8" }} />
                {live.language}
              </span>
            )}
            {live?.pushedAt && <span className="ml-auto">updated {ago(live.pushedAt, now)}</span>}
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

/** Server component: data arrives pre-fetched and cached (ISR) from the page. */
export default function Builds({ data }: { data: GitHubData }) {
  const now = new Date(data.fetchedAt).getTime();
  const byRepo = new Map(data.repos.map((r) => [r.name, r]));
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const more = data.repos.filter((r) => !caseStudyRepos.has(r.name));

  return (
    <section id="builds" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index="05 / 09"
        eyebrow="Builds & web architecture"
        title={
          <>
            Specific things that exist, <span className="text-mute">run, and do what they claim to.</span>
          </>
        }
        lede="Eight case studies, each with the full write-up, screenshots and source, plus a live feed of everything else on GitHub, re-fetched on the edge every hour."
        aside={
          <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-line px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-ink uppercase transition-colors hover:border-neon hover:text-neon">
            github.com/{data.user} <ArrowUpRight className="size-3.5" />
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {featured.map((p) => (
          <div key={p.slug} data-reveal>
            <ProjectCard project={p} live={p.repo ? byRepo.get(p.repo) : undefined} now={now} large />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((p) => (
          <div key={p.slug} data-reveal>
            <ProjectCard project={p} live={p.repo ? byRepo.get(p.repo) : undefined} now={now} large={false} />
          </div>
        ))}
      </div>

      <div data-reveal className="mt-16">
        <CommitMatrix days={data.activity} weeks={data.weeks} total={data.totalCommits} source={data.activitySource} />
      </div>

      {more.length > 0 && (
        <div data-reveal className="mt-6 border border-line">
          <p className="border-b border-line px-6 py-4 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">Also on GitHub · live</p>
          <ul>
            {more.map((r) => (
              <li key={r.id} className="border-b border-line last:border-b-0">
                <a href={r.homepage ?? r.url} target="_blank" rel="noopener noreferrer" className="group grid items-center gap-2 px-6 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[240px_1fr_auto] sm:gap-6">
                  <span className="font-mono text-sm text-ink transition-colors group-hover:text-neon">{r.name}</span>
                  <span className="text-sm text-mute">{r.description || "Source on GitHub."}</span>
                  <span className="flex items-center gap-4 font-mono text-[11px] text-faint">
                    {r.language && (
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: LANG_COLOR[r.language] ?? "#8A94A8" }} />
                        {r.language}
                      </span>
                    )}
                    {r.pushedAt && <span>{ago(r.pushedAt, now)}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.error && <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-flare uppercase">GitHub sync degraded: {data.error}. Showing cached project list.</p>}
    </section>
  );
}
