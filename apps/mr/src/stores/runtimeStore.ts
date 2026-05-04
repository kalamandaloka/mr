import { create } from "zustand"
import type { SceneManifest, Vec3 } from "@nalarxr/shared-types"

export type ObjectTransform = {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

type RuntimeState = {
  currentModuleId: string | null
  currentSceneId: string | null
  manifest: SceneManifest | null
  selectedObjectKey: string | null
  openedContentBlockId: string | null
  hoveredObjectKey: string | null
  gripRotatingObjectKey: string | null
  transformLocked: boolean
  xrSessionRequested: boolean
  objectTransforms: Record<string, ObjectTransform>
  initialObjectTransforms: Record<string, ObjectTransform>
  assetIssues: Record<string, string>
  setCurrentScene: (moduleId: string | null, sceneId: string | null) => void
  setManifest: (manifest: SceneManifest | null) => void
  selectObject: (objectKey: string | null) => void
  openContent: (contentBlockId: string | null) => void
  hoverObject: (objectKey: string | null) => void
  setGripRotatingObjectKey: (objectKey: string | null) => void
  toggleTransformLocked: () => void
  setObjectTransform: (objectKey: string, transform: Partial<ObjectTransform>) => void
  resetObjectTransform: (objectKey: string) => void
  ensureObjectTransform: (objectKey: string, initial: ObjectTransform) => void
  setAssetIssue: (objectKey: string, message: string) => void
  resetToDashboard: () => void
  setXrSessionRequested: (requested: boolean) => void
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  currentModuleId: null,
  currentSceneId: null,
  manifest: null,
  selectedObjectKey: null,
  openedContentBlockId: null,
  hoveredObjectKey: null,
  gripRotatingObjectKey: null,
  transformLocked: false,
  xrSessionRequested: false,
  objectTransforms: {},
  initialObjectTransforms: {},
  assetIssues: {},
  setCurrentScene: (moduleId, sceneId) => set({ currentModuleId: moduleId, currentSceneId: sceneId }),
  setManifest: (manifest) =>
    set(() => {
      if (!manifest) {
        return {
          manifest: null,
          selectedObjectKey: null,
          openedContentBlockId: null,
          hoveredObjectKey: null,
          gripRotatingObjectKey: null,
          objectTransforms: {},
          initialObjectTransforms: {},
          assetIssues: {},
        }
      }

      const initial: Record<string, ObjectTransform> = {}
      const eps = 1e-6
      const defaultObjectPos: Vec3 = [0, 1.15, -0.8]
      for (const o of manifest.objects) {
        const isDefaultPos =
          Math.abs(o.position[0]) < eps && Math.abs(o.position[1]) < eps && Math.abs(o.position[2]) < eps
        initial[o.objectKey] = {
          position: isDefaultPos ? defaultObjectPos : o.position,
          rotation: o.rotation,
          scale: o.scale,
        }
      }

      for (const b of manifest.contentBlocks) {
        const key = `cb:${b.id}`
        let position: Vec3 | null = null
        const p = b.position as Record<string, unknown> | undefined
        if (p) {
          const arr = (p.pos ?? p.position) as unknown
          if (Array.isArray(arr) && arr.length === 3 && arr.every((x) => typeof x === "number")) {
            position = [arr[0] as number, arr[1] as number, arr[2] as number]
          } else if (typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number") {
            position = [p.x, p.y, p.z]
          }
        }

        if (!position && b.targetObjectKey) {
          const target = initial[b.targetObjectKey]
          if (target) {
            position = [target.position[0], target.position[1] + 0.35, target.position[2]]
          }
        }

        if (!position) position = [0, 1.2, -0.9]

        initial[key] = {
          position,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        }
      }

      return {
        manifest,
        selectedObjectKey: null,
        openedContentBlockId: null,
        hoveredObjectKey: null,
        gripRotatingObjectKey: null,
        objectTransforms: initial,
        initialObjectTransforms: initial,
        assetIssues: {},
      }
    }),
  selectObject: (objectKey) => set({ selectedObjectKey: objectKey }),
  openContent: (contentBlockId) => set({ openedContentBlockId: contentBlockId }),
  hoverObject: (objectKey) => set({ hoveredObjectKey: objectKey }),
  setGripRotatingObjectKey: (objectKey) => set({ gripRotatingObjectKey: objectKey }),
  toggleTransformLocked: () => set((s) => ({ transformLocked: !s.transformLocked })),
  setObjectTransform: (objectKey, transform) =>
    set((s) => {
      const current = s.objectTransforms[objectKey]
      if (!current) return s
      return {
        objectTransforms: {
          ...s.objectTransforms,
          [objectKey]: {
            position: transform.position ?? current.position,
            rotation: transform.rotation ?? current.rotation,
            scale: transform.scale ?? current.scale,
          },
        },
      }
    }),
  resetObjectTransform: (objectKey) =>
    set((s) => {
      const initial = s.initialObjectTransforms[objectKey]
      if (!initial) return s
      return {
        objectTransforms: { ...s.objectTransforms, [objectKey]: initial },
      }
    }),
  ensureObjectTransform: (objectKey, initial) =>
    set((s) => {
      if (s.objectTransforms[objectKey] && s.initialObjectTransforms[objectKey]) return s
      return {
        objectTransforms: { ...s.objectTransforms, [objectKey]: s.objectTransforms[objectKey] ?? initial },
        initialObjectTransforms: { ...s.initialObjectTransforms, [objectKey]: s.initialObjectTransforms[objectKey] ?? initial },
      }
    }),
  setAssetIssue: (objectKey, message) =>
    set((s) => ({
      assetIssues: { ...s.assetIssues, [objectKey]: message },
    })),
  resetToDashboard: () =>
    set({
      currentModuleId: null,
      currentSceneId: null,
      manifest: null,
      selectedObjectKey: null,
      openedContentBlockId: null,
      hoveredObjectKey: null,
      gripRotatingObjectKey: null,
      objectTransforms: {},
      initialObjectTransforms: {},
      assetIssues: {},
      xrSessionRequested: false,
    }),
  setXrSessionRequested: (requested) => set({ xrSessionRequested: requested }),
}))
