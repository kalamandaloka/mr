export type Id = string

export type ModuleStatus = "draft" | "published" | "archived"
export type SceneStatus = "draft" | "published" | "archived"

export type SceneType =
  | "orientation"
  | "overview"
  | "components"
  | "mechanism"
  | "practice"
  | "evaluation"

export type EnvironmentPreset = "workshop-glass-blue" | "workshop-default"

export type Vec3 = [number, number, number]

export interface ModuleDto {
  id: Id
  title: string
  slug: string
  description: string | null
  category: string | null
  thumbnailUrl: string | null
  status: ModuleStatus
  version: number
  createdAt: string
  updatedAt: string
}

export interface SceneDto {
  id: Id
  moduleId: Id
  title: string
  slug: string
  sceneType: SceneType
  orderNo: number
  description: string | null
  environmentPreset: EnvironmentPreset
  status: SceneStatus
  createdAt: string
  updatedAt: string
}

export interface SceneObjectManifest {
  objectKey: string
  objectName: string
  assetUrl: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  interactive: boolean
  metadata?: Record<string, unknown>
}

export interface ContentBlockManifest {
  id: string
  type: "card" | "instruction" | "hotspot" | "label" | "video"
  title?: string
  body?: string
  mediaUrl?: string
  style?: Record<string, unknown>
  position?: Record<string, unknown>
  triggerType?: string
  targetObjectKey?: string
  orderNo?: number
}

export interface InteractionManifest {
  objectKey: string
  interactionType: string
  actionType: string
  targetType?: string
  targetRef?: string
  condition?: Record<string, unknown>
  payload?: Record<string, unknown>
  priority?: number
}

export interface PracticeStepManifest {
  id: string
  stepNo: number
  title: string
  instruction: string
  expectedAction: string
  targetObjectKey: string | null
  targetAnchorKey: string | null
  validationRule?: Record<string, unknown> | null
  successFeedback?: string | null
  failFeedback?: string | null
  scoreValue?: number | null
}

export interface EvaluationManifest {
  id: string
  title: string
  evaluationType: string
  config: Record<string, unknown>
  passingScore: number
}

export interface SceneManifest {
  scene: {
    id: string
    title: string
    type: SceneType
    orderNo: number
  }
  environment: {
    preset: EnvironmentPreset
    spawnPoint: Vec3
    passthrough: boolean
  }
  objects: SceneObjectManifest[]
  contentBlocks: ContentBlockManifest[]
  interactions: InteractionManifest[]
  practiceSteps: PracticeStepManifest[]
  evaluation: EvaluationManifest | null
}
