import { Router } from "express"
import { z } from "zod"
import type { SceneManifest } from "@nalarxr/shared-types"
import { asyncHandler } from "../http"
import { prisma } from "../prisma"

export const runtimeRouter = Router()

const JsonRecordSchema = z.record(z.string(), z.any())

const GLOBAL_MODULE_SLUG = "__global__"

runtimeRouter.get(
  "/modules",
  asyncHandler(async (_req, res) => {
    const modules = await prisma.module.findMany({
      where: { status: "published", slug: { not: GLOBAL_MODULE_SLUG } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        version: true,
        updatedAt: true,
      },
    })
    res.json(modules)
  }),
)

runtimeRouter.get(
  "/modules/:moduleId/manifest",
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.moduleId)
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { scenes: { where: { status: "published" }, orderBy: { orderNo: "asc" } } },
    })
    if (!module) {
      res.status(404).json({ error: "Not found" })
      return
    }
    if (module.status !== "published") {
      res.status(404).json({ error: "Not found" })
      return
    }
    if (module.slug === GLOBAL_MODULE_SLUG) {
      res.status(404).json({ error: "Not found" })
      return
    }

    const orientation = await prisma.scene.findFirst({
      where: {
        sceneType: "orientation",
        status: "published",
        module: { slug: GLOBAL_MODULE_SLUG, status: "published" },
      },
      orderBy: { createdAt: "asc" },
    })

    res.json({
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
        status: module.status,
        version: module.version,
      },
      scenes: [
        ...(orientation
          ? [
              {
                id: orientation.id,
                title: orientation.title,
                slug: orientation.slug,
                type: orientation.sceneType,
                orderNo: 0,
              },
            ]
          : []),
        ...module.scenes.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          type: s.sceneType,
          orderNo: s.orderNo,
        })),
      ],
    })
  }),
)

runtimeRouter.get(
  "/scenes/:sceneId/manifest",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: {
        module: { select: { status: true } },
        objects: { include: { asset: true }, orderBy: { createdAt: "asc" } },
        contentBlocks: { where: { isActive: true }, orderBy: { orderNo: "asc" } },
        interactions: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] },
        practiceSteps: { orderBy: { stepNo: "asc" } },
        evaluations: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!scene) {
      res.status(404).json({ error: "Not found" })
      return
    }
    if (scene.status !== "published" || scene.module.status !== "published") {
      res.status(404).json({ error: "Not found" })
      return
    }

    const evaluation = scene.evaluations[0]

    const manifest: SceneManifest = {
      scene: {
        id: scene.id,
        title: scene.title,
        type: scene.sceneType as SceneManifest["scene"]["type"],
        orderNo: scene.orderNo,
      },
      environment: {
        preset: (scene.environmentPreset as SceneManifest["environment"]["preset"]) ?? "workshop-glass-blue",
        spawnPoint: [0, 1.6, 0],
        passthrough: true,
      },
      objects: scene.objects.map((o) => ({
        objectKey: o.objectKey,
        objectName: o.objectName,
        assetUrl: o.asset.fileUrl,
        position: [o.positionX, o.positionY, o.positionZ],
        rotation: [o.rotationX, o.rotationY, o.rotationZ],
        scale: [o.scaleX, o.scaleY, o.scaleZ],
        interactive: o.isInteractive,
        metadata: (o.metadataJson as Record<string, unknown> | null) ?? undefined,
      })),
      contentBlocks: scene.contentBlocks.map((b) => ({
        id: b.id,
        type: (b.blockType as SceneManifest["contentBlocks"][number]["type"]) ?? "card",
        title: b.title ?? undefined,
        body: b.body ?? undefined,
        mediaUrl: b.mediaUrl ?? undefined,
        position: (b.positionJson as Record<string, unknown> | null) ?? undefined,
        style: (b.styleJson as Record<string, unknown> | null) ?? undefined,
        triggerType: b.triggerType ?? undefined,
        targetObjectKey: b.targetObjectKey ?? undefined,
        orderNo: b.orderNo,
      })),
      interactions: scene.interactions
        .filter((i) => i.isActive)
        .map((i) => ({
          objectKey: i.objectKey,
          interactionType: i.interactionType,
          actionType: i.actionType,
          targetType: i.targetType ?? undefined,
          targetRef: i.targetRef ?? undefined,
          condition: (i.conditionJson as Record<string, unknown> | null) ?? undefined,
          payload: (i.payloadJson as Record<string, unknown> | null) ?? undefined,
          priority: i.priority,
        })),
      practiceSteps: scene.practiceSteps.map((s) => ({
        id: s.id,
        stepNo: s.stepNo,
        title: s.title,
        instruction: s.instruction,
        expectedAction: s.expectedAction,
        targetObjectKey: s.targetObjectKey,
        targetAnchorKey: s.targetAnchorKey,
        validationRule: (s.validationRuleJson as Record<string, unknown> | null) ?? null,
        successFeedback: s.successFeedback,
        failFeedback: s.failFeedback,
        scoreValue: s.scoreValue,
      })),
      evaluation: evaluation
        ? {
            id: evaluation.id,
            title: evaluation.title,
            evaluationType: evaluation.evaluationType,
            config: evaluation.configJson as Record<string, unknown>,
            passingScore: evaluation.passingScore,
          }
        : null,
    }

    res.json(manifest)
  }),
)

runtimeRouter.post(
  "/progress",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        moduleId: z.string().min(1),
        sceneId: z.string().min(1),
        currentStep: z.number().int().nonnegative().optional(),
        completionPercent: z.number().min(0).max(100).optional(),
        lastState: JsonRecordSchema.optional(),
      })
      .parse(req.body)

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_moduleId_sceneId: {
          userId: body.userId,
          moduleId: body.moduleId,
          sceneId: body.sceneId,
        },
      },
      create: {
        userId: body.userId,
        moduleId: body.moduleId,
        sceneId: body.sceneId,
        currentStep: body.currentStep ?? 0,
        completionPercent: body.completionPercent ?? 0,
        lastStateJson: body.lastState ?? undefined,
      },
      update: {
        currentStep: body.currentStep,
        completionPercent: body.completionPercent,
        lastStateJson: body.lastState,
      },
    })

    res.json(progress)
  }),
)

runtimeRouter.post(
  "/activity-log",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        moduleId: z.string().min(1),
        sceneId: z.string().min(1),
        objectKey: z.string().nullable().optional(),
        interactionType: z.string().min(1),
        actionResult: z.string().nullable().optional(),
        payload: JsonRecordSchema.nullable().optional(),
      })
      .parse(req.body)

    const log = await prisma.activityLog.create({
      data: {
        userId: body.userId,
        moduleId: body.moduleId,
        sceneId: body.sceneId,
        objectKey: body.objectKey ?? null,
        interactionType: body.interactionType,
        actionResult: body.actionResult ?? null,
        payloadJson: body.payload ?? undefined,
      },
    })

    res.status(201).json(log)
  }),
)

runtimeRouter.post(
  "/evaluation-result",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        moduleId: z.string().min(1),
        sceneId: z.string().min(1),
        payload: JsonRecordSchema,
      })
      .parse(req.body)

    const log = await prisma.activityLog.create({
      data: {
        userId: body.userId,
        moduleId: body.moduleId,
        sceneId: body.sceneId,
        objectKey: null,
        interactionType: "evaluation_result",
        actionResult: null,
        payloadJson: body.payload,
      },
    })

    res.status(201).json(log)
  }),
)
