import type { SceneManifest } from "@nalarxr/shared-types"

export function createDebugManifest(): SceneManifest {
  return {
    scene: {
      id: "__debug__",
      title: "Debug Scene",
      type: "overview",
      orderNo: 0,
    },
    environment: {
      preset: "workshop-glass-blue",
      spawnPoint: [0, 1.6, 0],
      passthrough: true,
    },
    objects: [],
    contentBlocks: [],
    interactions: [],
    practiceSteps: [],
    evaluation: null,
  }
}

