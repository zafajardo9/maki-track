import type { Metadata } from "next";
import { ContentCard } from "@/components/landing/content-card";
import { FadeIn } from "@/components/landing/fade-in";
import { Footer } from "@/components/landing/footer";
import { breadcrumbJsonLd, JsonLd } from "@/components/landing/json-ld";
import { Navbar } from "@/components/landing/navbar";
import { SectionSeparator } from "@/components/landing/section-separator";
import { formatBlogDateShort } from "@/lib/format-date";
import { guideList, guidePath } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical guides to open-source and self-hosted project management: choosing a tool, self-hosting with Docker, single sign-on, data residency, and AI agents.",
  alternates: { canonical: "/guides" },
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Maki", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Maki guides",
          itemListElement: guideList.map((guide, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: guide.question,
            url: `https://kaneo.app${guidePath(guide.slug)}`,
          })),
        }}
      />
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="px-6 pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <FadeIn delay={0}>
                <p className="font-medium text-primary text-sm">Guides</p>
              </FadeIn>
              <FadeIn delay={60}>
                <h1 className="mt-3 text-balance font-medium text-4xl leading-[1.06] md:text-5xl">
                  Straight answers about project tools
                </h1>
              </FadeIn>
              <FadeIn delay={120}>
                <p className="mt-5 text-balance text-foreground/70 text-lg leading-relaxed">
                  The questions people actually ask before choosing a project
                  manager, answered without pretending Maki is the answer to all
                  of them.
                </p>
              </FadeIn>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guideList.map((guide) => (
                <ContentCard
                  body={guide.summary}
                  href={guidePath(guide.slug)}
                  key={guide.slug}
                  meta={[
                    "Guide",
                    <time dateTime={guide.updatedOn} key="updated">
                      Updated {formatBlogDateShort(guide.updatedOn)}
                    </time>,
                  ]}
                  title={guide.question}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
