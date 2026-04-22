import { z } from "zod"
import type { SceneManifest } from "@nalarxr/shared-types"

const defaultBaseUrl = "http://localhost:4000"

export function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL
  if (configured) return configured
  if (typeof window !== "undefined") {
    return ""
  }
  return defaultBaseUrl
}

const ModuleManifestSchema = z.object({
  module: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    status: z.string(),
    version: z.number(),
  }),
  scenes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      type: z.string(),
      orderNo: z.number(),
    }),
  ),
})

export type ModuleManifest = z.infer<typeof ModuleManifestSchema>

const ModuleListSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    status: z.string(),
    version: z.number(),
    updatedAt: z.string().optional(),
  }),
)

export type ModuleListItem = z.infer<typeof ModuleListSchema>[number]

export async function fetchModules(): Promise<ModuleListItem[]> {
  const res = await fetch(`${apiBaseUrl()}/api/runtime/modules`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(await res.text())
  }
  const json = (await res.json()) as unknown
  return ModuleListSchema.parse(json)
}

export async function fetchModuleManifest(moduleId: string): Promise<ModuleManifest> {
  const res = await fetch(`${apiBaseUrl()}/api/runtime/modules/${moduleId}/manifest`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(await res.text())
  }
  const json = (await res.json()) as unknown
  return ModuleManifestSchema.parse(json)
}

export async function fetchSceneManifest(sceneId: string): Promise<SceneManifest> {
  const res = await fetch(`${apiBaseUrl()}/api/runtime/scenes/${sceneId}/manifest`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(await res.text())
  }
  return (await res.json()) as SceneManifest
}
