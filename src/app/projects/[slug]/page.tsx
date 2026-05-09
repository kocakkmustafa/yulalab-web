import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getProjectSlugs,
  projects,
} from "@/data/projects";
import { ProjectShowcase } from "@/components/projects/ProjectShowcase";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline.tr,
    openGraph: {
      title: `${project.name} — ${project.tagline.tr}`,
      description: project.description.tr,
      images: project.visuals.ogImage
        ? [{ url: project.visuals.ogImage }]
        : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const others = projects.filter((p) => p.slug !== project.slug);

  return <ProjectShowcase project={project} others={others} />;
}
