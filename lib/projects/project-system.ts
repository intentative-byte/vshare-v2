import type { Interest, ProjectStatus, UserProject } from "@/lib/types";

export function createProject(input: {
  title: string;
  description: string;
  skills: string[];
  topics: Interest[];
}): UserProject {
  const now = new Date().toISOString();

  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    status: "active",
    skills: input.skills.map((skill) => skill.trim()).filter(Boolean),
    topics: input.topics,
    createdAt: now,
    updatedAt: now,
  };
}

export function isValidProject(input: { title: string; description: string; topics: Interest[] }) {
  return input.title.trim().length >= 4 && input.description.trim().length >= 8 && input.topics.length > 0;
}

export function updateProjectStatus(project: UserProject, status: ProjectStatus): UserProject {
  return {
    ...project,
    status,
    updatedAt: new Date().toISOString(),
  };
}
