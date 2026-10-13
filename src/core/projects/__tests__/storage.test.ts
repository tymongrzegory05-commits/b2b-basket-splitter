import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  deriveProjectStatus,
  duplicateProject,
  loadWorkspace,
  saveWorkspace,
  type KeyValueStore,
} from "@/core/projects/storage";
import type { Workspace } from "@/core/projects/types";

function memoryStorage(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("project storage", () => {
  it("zapisuje i odczytuje workspace", () => {
    const storage = memoryStorage();
    const project = createEmptyProject("Kotłownia – ul. Piotrkowska", "2026-09-03T10:00:00.000Z");
    const workspace: Workspace = {
      version: 2,
      activeProjectId: project.id,
      projects: [project],
    };
    saveWorkspace(workspace, storage);
    const loaded = loadWorkspace(storage);
    expect(loaded?.projects[0].name).toBe("Kotłownia – ul. Piotrkowska");
    expect(loaded?.activeProjectId).toBe(project.id);
  });

  it("duplikuje projekt z nowym id i przyrostkiem", () => {
    const original = createEmptyProject("Pompa ciepła – Inwestycja Zgierz");
    const copy = duplicateProject(original, "2026-09-03T12:00:00.000Z");
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Pompa ciepła – Inwestycja Zgierz (kopia)");
    expect(copy.createdAt).toBe("2026-09-03T12:00:00.000Z");
  });

  it("wylicza status z dopasowań", () => {
    expect(deriveProjectStatus({ offerCounts: [0, 0], unmatched: 0, unverified: 0 })).toBe(
      "szkic",
    );
    expect(
      deriveProjectStatus({ offerCounts: [10, 10], unmatched: 0, unverified: 3 }),
    ).toBe("do weryfikacji");
    expect(
      deriveProjectStatus({ offerCounts: [10, 10], unmatched: 0, unverified: 0 }),
    ).toBe("gotowy");
  });
});
