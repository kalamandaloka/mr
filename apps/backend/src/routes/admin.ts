import { Router } from "express"
import { Prisma } from "@prisma/client"
import multer from "multer"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import { asyncHandler } from "../http"
import { requireAdmin, requireAuth } from "../middleware/auth"
import { prisma } from "../prisma"

export const adminRouter = Router()

adminRouter.use(requireAuth, requireAdmin)

const JsonRecordSchema = z.record(z.string(), z.any())

const GLOBAL_MODULE_SLUG = "__global__"

const DefaultSceneTemplate = [
  { orderNo: 1, title: "Overview", slugSuffix: "overview", sceneType: "overview" as const },
  { orderNo: 2, title: "Komponen", slugSuffix: "komponen", sceneType: "components" as const },
  { orderNo: 3, title: "Cara Kerja", slugSuffix: "cara-kerja", sceneType: "mechanism" as const },
  { orderNo: 4, title: "Praktek", slugSuffix: "praktek", sceneType: "practice" as const },
  { orderNo: 5, title: "Evaluasi", slugSuffix: "evaluasi", sceneType: "evaluation" as const },
]

async function ensureGlobalOrientation(tx: Prisma.TransactionClient) {
  const global = await tx.module.findUnique({ where: { slug: GLOBAL_MODULE_SLUG } })
  const module =
    global ??
    (await tx.module.create({
      data: {
        title: "Global Orientation",
        slug: GLOBAL_MODULE_SLUG,
        category: "system",
        status: "published",
      },
    }))

  const existing = await tx.scene.findFirst({
    where: { moduleId: module.id, sceneType: "orientation" },
    orderBy: { createdAt: "asc" },
  })

  if (existing) return { module, scene: existing }

  const scene = await tx.scene.create({
    data: {
      moduleId: module.id,
      title: "Orientasi",
      slug: `${module.slug}-orientasi`,
      sceneType: "orientation",
      orderNo: 0,
      environmentPreset: "workshop-glass-blue",
      status: "published",
    },
  })

  return { module, scene }
}

const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

function safeFilenameBase(input: string) {
  const base = path.parse(input).name
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  return cleaned || "file"
}

function readGlbHeader(filePath: string) {
  const fd = fs.openSync(filePath, "r")
  try {
    const header = Buffer.alloc(12)
    const bytes = fs.readSync(fd, header, 0, header.length, 0)
    if (bytes < 12) {
      return { ok: false as const, error: "GLB file is too small" }
    }
    const magic = header.toString("ascii", 0, 4)
    const version = header.readUInt32LE(4)
    const length = header.readUInt32LE(8)
    return { ok: true as const, magic, version, length }
  } finally {
    fs.closeSync(fd)
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const base = safeFilenameBase(file.originalname)
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      cb(null, `${base}-${suffix}${ext}`)
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== ".glb") {
      cb(new Error("Only .glb files are supported for now"))
      return
    }
    cb(null, true)
  },
})

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [modules, scenes, assets, contentBlocks, interactions, practiceSteps, evaluations, progress, activityLogs] =
      await prisma.$transaction([
        prisma.module.count(),
        prisma.scene.count(),
        prisma.asset.count(),
        prisma.contentBlock.count(),
        prisma.interactionConfig.count(),
        prisma.practiceStep.count(),
        prisma.evaluation.count(),
        prisma.userProgress.count(),
        prisma.activityLog.count(),
      ])

    res.json({
      modules,
      scenes,
      assets,
      contentBlocks,
      interactions,
      practiceSteps,
      evaluations,
      progress,
      activityLogs,
    })
  }),
)

adminRouter.get(
  "/content-blocks",
  asyncHandler(async (_req, res) => {
    const blocks = await prisma.contentBlock.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            sceneType: true,
            module: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    })
    res.json(blocks)
  }),
)

adminRouter.get(
  "/interactions",
  asyncHandler(async (_req, res) => {
    const interactions = await prisma.interactionConfig.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            sceneType: true,
            module: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    })
    res.json(interactions)
  }),
)

adminRouter.get(
  "/practice-steps",
  asyncHandler(async (_req, res) => {
    const steps = await prisma.practiceStep.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            sceneType: true,
            module: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    })
    res.json(steps)
  }),
)

adminRouter.get(
  "/evaluations",
  asyncHandler(async (_req, res) => {
    const evaluations = await prisma.evaluation.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            sceneType: true,
            module: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    })
    res.json(evaluations)
  }),
)

adminRouter.get(
  "/progress",
  asyncHandler(async (_req, res) => {
    const progress = await prisma.userProgress.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        module: { select: { id: true, title: true, slug: true } },
        scene: { select: { id: true, title: true, sceneType: true } },
      },
    })
    res.json(progress)
  }),
)

adminRouter.get(
  "/activity-logs",
  asyncHandler(async (_req, res) => {
    const logs = await prisma.activityLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        module: { select: { id: true, title: true, slug: true } },
        scene: { select: { id: true, title: true, sceneType: true } },
      },
    })
    res.json(logs)
  }),
)

adminRouter.post(
  "/demo/seed",
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { auth?: { sub: string } }).auth?.sub
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    const result = await prisma.$transaction(async (tx) => {
      const ensured = await ensureGlobalOrientation(tx)

      const globalBlocksCount = await tx.contentBlock.count({ where: { sceneId: ensured.scene.id } })
      if (globalBlocksCount === 0) {
        await tx.contentBlock.createMany({
          data: [
            {
              sceneId: ensured.scene.id,
              blockType: "card",
              title: "Selamat Datang",
              body:
                "<p>Gunakan menu Scene untuk berpindah topik. Arahkan pandangan ke kartu untuk membaca konten.</p><p><img src=\"https://picsum.photos/seed/nalarxr-orientation/640/360\" alt=\"\" /></p>",
              orderNo: 1,
              isActive: true,
            },
            {
              sceneId: ensured.scene.id,
              blockType: "instruction",
              title: "Cara Interaksi",
              body:
                "<ul><li>Pilih objek/kartu untuk membuka konten.</li><li>Gunakan tombol Back untuk menutup konten.</li></ul><p><video controls src=\"https://www.w3schools.com/html/mov_bbb.mp4\"></video></p>",
              orderNo: 2,
              isActive: true,
            },
          ],
        })
      }

      const demoSlug = "demo-motor-listrik"
      const module =
        (await tx.module.findUnique({ where: { slug: demoSlug } })) ??
        (await tx.module.create({
          data: {
            title: "Demo: Motor Listrik",
            slug: demoSlug,
            description: "Modul contoh untuk mengisi menu admin dengan data dummy yang realistis.",
            category: "demo",
            thumbnailUrl: "https://picsum.photos/seed/nalarxr-module/640/360",
            status: "published",
            version: 1,
          },
        }))

      const existingScenes = await tx.scene.findMany({
        where: { moduleId: module.id },
        orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
      })

      if (existingScenes.length === 0) {
        await tx.scene.createMany({
          data: DefaultSceneTemplate.map((s) => ({
            moduleId: module.id,
            title: s.title,
            slug: `${module.slug}-${s.slugSuffix}`,
            sceneType: s.sceneType,
            orderNo: s.orderNo,
            environmentPreset: "workshop-glass-blue",
            status: "published",
          })),
        })
      }

      const scenes = await tx.scene.findMany({
        where: { moduleId: module.id },
        orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
      })

      const byType = new Map(scenes.map((s) => [s.sceneType, s]))
      const overview = byType.get("overview")
      const components = byType.get("components")
      const mechanism = byType.get("mechanism")
      const practice = byType.get("practice")
      const evaluation = byType.get("evaluation")

      const asset =
        (await tx.asset.findFirst({ where: { name: "Demo Astronaut.glb" }, orderBy: { createdAt: "asc" } })) ??
        (await tx.asset.create({
          data: {
            name: "Demo Astronaut.glb",
            fileType: "glb",
            fileUrl: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
            thumbnailUrl: null,
            mimeType: "model/gltf-binary",
            size: null,
            version: 1,
            uploadedById: userId,
          },
        }))

      if (overview) {
        const count = await tx.contentBlock.count({ where: { sceneId: overview.id } })
        if (count === 0) {
          await tx.contentBlock.createMany({
            data: [
              {
                sceneId: overview.id,
                blockType: "card",
                title: "Tujuan Pembelajaran",
                body:
                  "<ul><li>Memahami komponen utama motor listrik</li><li>Menjelaskan prinsip kerja dasar</li><li>Mencoba langkah praktek sederhana</li></ul>",
                orderNo: 1,
                isActive: true,
              },
              {
                sceneId: overview.id,
                blockType: "card",
                title: "Ringkasan",
                body:
                  "<p>Motor listrik mengubah energi listrik menjadi energi mekanik melalui gaya elektromagnetik pada kumparan.</p>",
                orderNo: 2,
                isActive: true,
              },
            ],
          })
        }

        const objCount = await tx.sceneObject.count({ where: { sceneId: overview.id } })
        if (objCount === 0) {
          await tx.sceneObject.create({
            data: {
              sceneId: overview.id,
              assetId: asset.id,
              objectKey: "demo-model",
              objectName: "Model Demo",
              positionX: 0,
              positionY: 0,
              positionZ: 0,
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
              isInteractive: true,
              metadataJson: { note: "Dummy object untuk demo interaksi" },
            },
          })
        }

        const blocks = await tx.contentBlock.findMany({
          where: { sceneId: overview.id },
          orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
        })
        const firstBlock = blocks[0]
        if (firstBlock) {
          const iCount = await tx.interactionConfig.count({ where: { sceneId: overview.id } })
          if (iCount === 0) {
            await tx.interactionConfig.createMany({
              data: [
                {
                  sceneId: overview.id,
                  objectKey: "demo-model",
                  interactionType: "select",
                  actionType: "open_content",
                  targetType: "content_block",
                  targetRef: firstBlock.id,
                  priority: 10,
                  isActive: true,
                },
              ],
            })
          }
        }
      }

      if (components) {
        const count = await tx.contentBlock.count({ where: { sceneId: components.id } })
        if (count === 0) {
          await tx.contentBlock.createMany({
            data: [
              {
                sceneId: components.id,
                blockType: "card",
                title: "Stator",
                body:
                  "<p>Bagian diam yang menghasilkan medan magnet.</p><p><img src=\"https://picsum.photos/seed/nalarxr-stator/640/360\" alt=\"\" /></p>",
                orderNo: 1,
                isActive: true,
              },
              {
                sceneId: components.id,
                blockType: "card",
                title: "Rotor",
                body:
                  "<p>Bagian berputar yang berinteraksi dengan medan magnet dari stator.</p><p><img src=\"https://picsum.photos/seed/nalarxr-rotor/640/360\" alt=\"\" /></p>",
                orderNo: 2,
                isActive: true,
              },
            ],
          })
        }
      }

      if (mechanism) {
        const count = await tx.contentBlock.count({ where: { sceneId: mechanism.id } })
        if (count === 0) {
          await tx.contentBlock.createMany({
            data: [
              {
                sceneId: mechanism.id,
                blockType: "instruction",
                title: "Prinsip Kerja",
                body:
                  "<p>Arus listrik pada kumparan membentuk medan magnet. Interaksi medan magnet menghasilkan torsi pada rotor.</p>",
                orderNo: 1,
                isActive: true,
              },
              {
                sceneId: mechanism.id,
                blockType: "card",
                title: "Video Singkat",
                body: "<p><video controls src=\"https://www.w3schools.com/html/mov_bbb.mp4\"></video></p>",
                orderNo: 2,
                isActive: true,
              },
            ],
          })
        }
      }

      if (practice) {
        const count = await tx.practiceStep.count({ where: { sceneId: practice.id } })
        if (count === 0) {
          await tx.practiceStep.createMany({
            data: [
              {
                sceneId: practice.id,
                stepNo: 1,
                title: "Identifikasi Komponen",
                instruction: "Amati model dan sebutkan komponen utama: stator dan rotor.",
                expectedAction: "identify_components",
                targetObjectKey: "demo-model",
                targetAnchorKey: null,
                validationRuleJson: { type: "manual_confirm" },
                successFeedback: "Benar. Kamu sudah mengenali komponen utama.",
                failFeedback: "Coba cek lagi bagian stator (diam) dan rotor (berputar).",
                scoreValue: 20,
              },
              {
                sceneId: practice.id,
                stepNo: 2,
                title: "Simulasi Putaran",
                instruction: "Bayangkan arah gaya elektromagnetik dan jelaskan mengapa rotor berputar.",
                expectedAction: "explain_rotation",
                targetObjectKey: null,
                targetAnchorKey: null,
                validationRuleJson: { type: "manual_confirm" },
                successFeedback: "Mantap. Penjelasanmu sesuai prinsip dasar.",
                failFeedback: "Fokus pada interaksi medan magnet stator dan arus pada rotor.",
                scoreValue: 30,
              },
            ],
          })
        }
      }

      if (evaluation) {
        const count = await tx.evaluation.count({ where: { sceneId: evaluation.id } })
        if (count === 0) {
          await tx.evaluation.create({
            data: {
              sceneId: evaluation.id,
              title: "Kuis: Dasar Motor Listrik",
              evaluationType: "quiz",
              configJson: {
                questions: [
                  {
                    id: "q1",
                    type: "single_choice",
                    prompt: "Komponen mana yang diam pada motor listrik?",
                    choices: ["Rotor", "Stator", "Sikat", "Poros"],
                    answerIndex: 1,
                    score: 50,
                  },
                  {
                    id: "q2",
                    type: "single_choice",
                    prompt: "Motor listrik mengubah energi listrik menjadi…",
                    choices: ["Energi panas", "Energi mekanik", "Energi kimia", "Energi cahaya"],
                    answerIndex: 1,
                    score: 50,
                  },
                ],
              },
              passingScore: 70,
            },
          })
        }
      }

      const sceneIds = scenes.map((s) => s.id)
      for (const sceneId of sceneIds) {
        await tx.userProgress.upsert({
          where: {
            userId_moduleId_sceneId: {
              userId,
              moduleId: module.id,
              sceneId,
            },
          },
          create: {
            userId,
            moduleId: module.id,
            sceneId,
            currentStep: 0,
            completionPercent: 10,
            lastStateJson: { seeded: true },
          },
          update: {},
        })
      }

      const logCount = await tx.activityLog.count({ where: { moduleId: module.id } })
      if (logCount === 0 && overview) {
        await tx.activityLog.createMany({
          data: [
            {
              userId,
              moduleId: module.id,
              sceneId: overview.id,
              objectKey: "demo-model",
              interactionType: "select",
              actionResult: "opened_content",
              payloadJson: { seeded: true },
            },
            {
              userId,
              moduleId: module.id,
              sceneId: overview.id,
              objectKey: null,
              interactionType: "evaluation_result",
              actionResult: null,
              payloadJson: { score: 80, passed: true, seeded: true },
            },
          ],
        })
      }

      return {
        globalOrientationSceneId: ensured.scene.id,
        moduleId: module.id,
        scenes: scenes.map((s) => ({ id: s.id, title: s.title, type: s.sceneType, orderNo: s.orderNo, status: s.status })),
      }
    })

    res.json(result)
  }),
)

adminRouter.get(
  "/modules",
  asyncHandler(async (_req, res) => {
    const modules = await prisma.module.findMany({ orderBy: { updatedAt: "desc" } })
    res.json(modules)
  }),
)

adminRouter.post(
  "/modules",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        thumbnailUrl: z.string().url().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
      .parse(req.body)

    if (body.slug === GLOBAL_MODULE_SLUG) {
      res.status(400).json({ error: "Slug reserved" })
      return
    }

    const created = await prisma.$transaction(async (tx) => {
      await ensureGlobalOrientation(tx)
      const module = await tx.module.create({
        data: {
          title: body.title,
          slug: body.slug,
          description: body.description ?? null,
          category: body.category ?? null,
          thumbnailUrl: body.thumbnailUrl ?? null,
          status: body.status ?? "draft",
        },
      })

      await tx.scene.createMany({
        data: DefaultSceneTemplate.map((s) => ({
          moduleId: module.id,
          title: s.title,
          slug: `${module.slug}-${s.slugSuffix}`,
          sceneType: s.sceneType,
          orderNo: s.orderNo,
          environmentPreset: "workshop-glass-blue",
          status: "draft",
        })),
      })

      return module
    })
    res.status(201).json(created)
  }),
)

adminRouter.get(
  "/modules/:id",
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.id)
    const module = await prisma.module.findUnique({ where: { id: moduleId } })
    if (!module) {
      res.status(404).json({ error: "Not found" })
      return
    }
    res.json(module)
  }),
)

adminRouter.patch(
  "/modules/:id",
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        thumbnailUrl: z.string().url().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        version: z.number().int().positive().optional(),
      })
      .parse(req.body)

    const updated = await prisma.module.update({
      where: { id: moduleId },
      data: body,
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/modules/:id",
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.id)
    await prisma.module.delete({ where: { id: moduleId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/modules/:moduleId/scenes",
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.moduleId)
    const module = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true, slug: true } })
    if (!module) {
      res.status(404).json({ error: "Not found" })
      return
    }

    const scenes = await prisma.$transaction(async (tx) => {
      if (module.slug === GLOBAL_MODULE_SLUG) {
        const ensured = await ensureGlobalOrientation(tx)
        return [ensured.scene]
      }

      const existing = await tx.scene.findMany({
        where: { moduleId },
        orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
      })

      const hasOrientation = existing.some((s) => s.sceneType === "orientation")
      if (hasOrientation) {
        await tx.scene.deleteMany({ where: { moduleId, sceneType: "orientation" } })
        await tx.scene.updateMany({
          where: { moduleId, orderNo: { gt: 1 } },
          data: { orderNo: { decrement: 1 } },
        })
      }

      const afterMigration = await tx.scene.findMany({
        where: { moduleId },
        orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
      })

      const byType = new Map(afterMigration.map((s) => [s.sceneType, s]))
      const toCreate: Array<{
        moduleId: string
        title: string
        slug: string
        sceneType: (typeof DefaultSceneTemplate)[number]["sceneType"]
        orderNo: number
        environmentPreset: string
        status: "draft"
      }> = []

      const usedSlugs = new Set(afterMigration.map((s) => s.slug))
      for (const t of DefaultSceneTemplate) {
        if (byType.has(t.sceneType)) continue
        const base = `${module.slug}-${t.slugSuffix}`
        const slug = usedSlugs.has(base) ? `${base}-v2` : base
        toCreate.push({
          moduleId: module.id,
          title: t.title,
          slug,
          sceneType: t.sceneType,
          orderNo: t.orderNo,
          environmentPreset: "workshop-glass-blue",
          status: "draft",
        })
        usedSlugs.add(slug)
      }

      if (afterMigration.length === 0) {
        await tx.scene.createMany({
          data: DefaultSceneTemplate.map((t) => ({
            moduleId: module.id,
            title: t.title,
            slug: `${module.slug}-${t.slugSuffix}`,
            sceneType: t.sceneType,
            orderNo: t.orderNo,
            environmentPreset: "workshop-glass-blue",
            status: "draft",
          })),
        })
      } else if (toCreate.length) {
        await tx.scene.createMany({ data: toCreate })
      }

      return tx.scene.findMany({
        where: { moduleId },
        orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
      })
    })

    res.json(scenes)
  }),
)

adminRouter.post(
  "/modules/:moduleId/scenes",
  asyncHandler(async (_req, res) => {
    res.status(400).json({
      error:
        "Struktur scene untuk setiap modul bersifat tetap: Overview, Komponen, Cara Kerja, Praktek, Evaluasi. Scene Orientasi bersifat global.",
    })
  }),
)

adminRouter.get(
  "/scenes/:id",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.id)
    const scene = await prisma.scene.findUnique({ where: { id: sceneId } })
    if (!scene) {
      res.status(404).json({ error: "Not found" })
      return
    }
    res.json(scene)
  }),
)

adminRouter.patch(
  "/scenes/:id",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        sceneType: z
          .enum([
            "orientation",
            "overview",
            "components",
            "mechanism",
            "practice",
            "evaluation",
          ])
          .optional(),
        orderNo: z.number().int().nonnegative().optional(),
        description: z.string().nullable().optional(),
        environmentPreset: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
      .parse(req.body)

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: body,
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/scenes/:id",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.id)
    await prisma.scene.delete({ where: { id: sceneId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/assets",
  asyncHandler(async (_req, res) => {
    const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } })
    res.json(assets)
  }),
)

adminRouter.post(
  "/assets/upload-file",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) next(err)
      else next()
    })
  },
  asyncHandler(async (req, res) => {
    const file = (req as unknown as { file?: Express.Multer.File }).file
    if (!file) {
      res.status(400).json({ error: "Missing file" })
      return
    }

    const diskPath = file.path || path.join(uploadsDir, file.filename)
    try {
      const header = readGlbHeader(diskPath)
      if (!header.ok) {
        try {
          fs.unlinkSync(diskPath)
        } catch {}
        res.status(400).json({ error: header.error })
        return
      }
      if (header.magic !== "glTF" || header.version !== 2 || header.length !== file.size) {
        try {
          fs.unlinkSync(diskPath)
        } catch {}
        res.status(400).json({
          error: `Invalid GLB (magic=${header.magic}, version=${header.version}, declaredLength=${header.length}, fileSize=${file.size}). Re-upload the file.`,
        })
        return
      }
    } catch (e) {
      try {
        fs.unlinkSync(diskPath)
      } catch {}
      const message = e instanceof Error ? e.message : "Failed to validate GLB"
      res.status(400).json({ error: message })
      return
    }

    const uploadedById = (req as unknown as { auth?: { sub: string } }).auth?.sub ?? null

    const created = await prisma.asset.create({
      data: {
        name: file.originalname,
        fileType: "glb",
        fileUrl: `/uploads/${file.filename}`,
        thumbnailUrl: null,
        mimeType: file.mimetype || null,
        size: file.size ?? null,
        version: 1,
        uploadedById,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.post(
  "/assets/upload",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        fileType: z.string().min(1),
        fileUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        mimeType: z.string().optional(),
        size: z.number().int().positive().optional(),
        version: z.number().int().positive().optional(),
      })
      .parse(req.body)

    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        fileType: body.fileType,
        fileUrl: body.fileUrl,
        thumbnailUrl: body.thumbnailUrl ?? null,
        mimeType: body.mimeType ?? null,
        size: body.size ?? null,
        version: body.version ?? 1,
      },
    })
    res.status(201).json(asset)
  }),
)

adminRouter.delete(
  "/assets/:id",
  asyncHandler(async (req, res) => {
    const assetId = z.string().min(1).parse(req.params.id)
    await prisma.asset.delete({ where: { id: assetId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/scenes/:sceneId/objects",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const objects = await prisma.sceneObject.findMany({
      where: { sceneId },
      include: { asset: true },
      orderBy: [{ createdAt: "asc" }],
    })
    res.json(objects)
  }),
)

adminRouter.post(
  "/scenes/:sceneId/objects",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const body = z
      .object({
        assetId: z.string().min(1),
        objectKey: z.string().min(1),
        objectName: z.string().min(1),
        position: z.tuple([z.number(), z.number(), z.number()]),
        rotation: z.tuple([z.number(), z.number(), z.number()]),
        scale: z.tuple([z.number(), z.number(), z.number()]).optional(),
        interactive: z.boolean().optional(),
        metadata: JsonRecordSchema.optional(),
      })
      .parse(req.body)

    const created = await prisma.sceneObject.create({
      data: {
        sceneId,
        assetId: body.assetId,
        objectKey: body.objectKey,
        objectName: body.objectName,
        positionX: body.position[0],
        positionY: body.position[1],
        positionZ: body.position[2],
        rotationX: body.rotation[0],
        rotationY: body.rotation[1],
        rotationZ: body.rotation[2],
        scaleX: body.scale?.[0] ?? 1,
        scaleY: body.scale?.[1] ?? 1,
        scaleZ: body.scale?.[2] ?? 1,
        isInteractive: body.interactive ?? false,
        metadataJson: body.metadata ?? undefined,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.patch(
  "/scene-objects/:id",
  asyncHandler(async (req, res) => {
    const sceneObjectId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        objectName: z.string().min(1).optional(),
        position: z.tuple([z.number(), z.number(), z.number()]).optional(),
        rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
        scale: z.tuple([z.number(), z.number(), z.number()]).optional(),
        interactive: z.boolean().optional(),
        metadata: JsonRecordSchema.nullable().optional(),
      })
      .parse(req.body)

    const updated = await prisma.sceneObject.update({
      where: { id: sceneObjectId },
      data: {
        objectName: body.objectName,
        positionX: body.position?.[0],
        positionY: body.position?.[1],
        positionZ: body.position?.[2],
        rotationX: body.rotation?.[0],
        rotationY: body.rotation?.[1],
        rotationZ: body.rotation?.[2],
        scaleX: body.scale?.[0],
        scaleY: body.scale?.[1],
        scaleZ: body.scale?.[2],
        isInteractive: body.interactive,
        metadataJson: body.metadata === null ? Prisma.DbNull : body.metadata,
      },
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/scene-objects/:id",
  asyncHandler(async (req, res) => {
    const sceneObjectId = z.string().min(1).parse(req.params.id)
    await prisma.sceneObject.delete({ where: { id: sceneObjectId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/scenes/:sceneId/content-blocks",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const blocks = await prisma.contentBlock.findMany({
      where: { sceneId },
      orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }],
    })
    res.json(blocks)
  }),
)

adminRouter.post(
  "/scenes/:sceneId/content-blocks",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const body = z
      .object({
        blockType: z.string().min(1),
        title: z.string().optional(),
        body: z.string().optional(),
        mediaUrl: z.string().url().optional(),
        position: JsonRecordSchema.optional(),
        style: JsonRecordSchema.optional(),
        triggerType: z.string().optional(),
        targetObjectKey: z.string().optional(),
        orderNo: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body)

    const created = await prisma.contentBlock.create({
      data: {
        sceneId,
        blockType: body.blockType,
        title: body.title ?? null,
        body: body.body ?? null,
        mediaUrl: body.mediaUrl ?? null,
        positionJson: body.position ?? undefined,
        styleJson: body.style ?? undefined,
        triggerType: body.triggerType ?? null,
        targetObjectKey: body.targetObjectKey ?? null,
        orderNo: body.orderNo ?? 0,
        isActive: body.isActive ?? true,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.patch(
  "/content-blocks/:id",
  asyncHandler(async (req, res) => {
    const contentBlockId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        blockType: z.string().min(1).optional(),
        title: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
        mediaUrl: z.string().url().nullable().optional(),
        position: JsonRecordSchema.nullable().optional(),
        style: JsonRecordSchema.nullable().optional(),
        triggerType: z.string().nullable().optional(),
        targetObjectKey: z.string().nullable().optional(),
        orderNo: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body)

    const updated = await prisma.contentBlock.update({
      where: { id: contentBlockId },
      data: {
        blockType: body.blockType,
        title: body.title,
        body: body.body,
        mediaUrl: body.mediaUrl,
        positionJson: body.position === null ? Prisma.DbNull : body.position,
        styleJson: body.style === null ? Prisma.DbNull : body.style,
        triggerType: body.triggerType,
        targetObjectKey: body.targetObjectKey,
        orderNo: body.orderNo,
        isActive: body.isActive,
      },
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/content-blocks/:id",
  asyncHandler(async (req, res) => {
    const contentBlockId = z.string().min(1).parse(req.params.id)
    await prisma.contentBlock.delete({ where: { id: contentBlockId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/scenes/:sceneId/interactions",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const interactions = await prisma.interactionConfig.findMany({
      where: { sceneId },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })
    res.json(interactions)
  }),
)

adminRouter.post(
  "/scenes/:sceneId/interactions",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const body = z
      .object({
        objectKey: z.string().min(1),
        interactionType: z.string().min(1),
        actionType: z.string().min(1),
        targetType: z.string().optional(),
        targetRef: z.string().optional(),
        condition: JsonRecordSchema.optional(),
        payload: JsonRecordSchema.optional(),
        priority: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body)

    const created = await prisma.interactionConfig.create({
      data: {
        sceneId,
        objectKey: body.objectKey,
        interactionType: body.interactionType,
        actionType: body.actionType,
        targetType: body.targetType ?? null,
        targetRef: body.targetRef ?? null,
        conditionJson: body.condition ?? undefined,
        payloadJson: body.payload ?? undefined,
        priority: body.priority ?? 0,
        isActive: body.isActive ?? true,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.patch(
  "/interactions/:id",
  asyncHandler(async (req, res) => {
    const interactionId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        objectKey: z.string().min(1).optional(),
        interactionType: z.string().min(1).optional(),
        actionType: z.string().min(1).optional(),
        targetType: z.string().nullable().optional(),
        targetRef: z.string().nullable().optional(),
        condition: JsonRecordSchema.nullable().optional(),
        payload: JsonRecordSchema.nullable().optional(),
        priority: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body)

    const updated = await prisma.interactionConfig.update({
      where: { id: interactionId },
      data: {
        objectKey: body.objectKey,
        interactionType: body.interactionType,
        actionType: body.actionType,
        targetType: body.targetType,
        targetRef: body.targetRef,
        conditionJson: body.condition === null ? Prisma.DbNull : body.condition,
        payloadJson: body.payload === null ? Prisma.DbNull : body.payload,
        priority: body.priority,
        isActive: body.isActive,
      },
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/interactions/:id",
  asyncHandler(async (req, res) => {
    const interactionId = z.string().min(1).parse(req.params.id)
    await prisma.interactionConfig.delete({ where: { id: interactionId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/scenes/:sceneId/practice-steps",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const steps = await prisma.practiceStep.findMany({
      where: { sceneId },
      orderBy: [{ stepNo: "asc" }, { createdAt: "asc" }],
    })
    res.json(steps)
  }),
)

adminRouter.post(
  "/scenes/:sceneId/practice-steps",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const body = z
      .object({
        stepNo: z.number().int().nonnegative(),
        title: z.string().min(1),
        instruction: z.string().min(1),
        expectedAction: z.string().min(1),
        targetObjectKey: z.string().nullable().optional(),
        targetAnchorKey: z.string().nullable().optional(),
        validationRule: JsonRecordSchema.nullable().optional(),
        successFeedback: z.string().nullable().optional(),
        failFeedback: z.string().nullable().optional(),
        scoreValue: z.number().int().nullable().optional(),
      })
      .parse(req.body)

    const created = await prisma.practiceStep.create({
      data: {
        sceneId,
        stepNo: body.stepNo,
        title: body.title,
        instruction: body.instruction,
        expectedAction: body.expectedAction,
        targetObjectKey: body.targetObjectKey ?? null,
        targetAnchorKey: body.targetAnchorKey ?? null,
        validationRuleJson: body.validationRule ?? undefined,
        successFeedback: body.successFeedback ?? null,
        failFeedback: body.failFeedback ?? null,
        scoreValue: body.scoreValue ?? null,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.patch(
  "/practice-steps/:id",
  asyncHandler(async (req, res) => {
    const stepId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        stepNo: z.number().int().nonnegative().optional(),
        title: z.string().min(1).optional(),
        instruction: z.string().min(1).optional(),
        expectedAction: z.string().min(1).optional(),
        targetObjectKey: z.string().nullable().optional(),
        targetAnchorKey: z.string().nullable().optional(),
        validationRule: JsonRecordSchema.nullable().optional(),
        successFeedback: z.string().nullable().optional(),
        failFeedback: z.string().nullable().optional(),
        scoreValue: z.number().int().nullable().optional(),
      })
      .parse(req.body)

    const updated = await prisma.practiceStep.update({
      where: { id: stepId },
      data: {
        stepNo: body.stepNo,
        title: body.title,
        instruction: body.instruction,
        expectedAction: body.expectedAction,
        targetObjectKey: body.targetObjectKey,
        targetAnchorKey: body.targetAnchorKey,
        validationRuleJson: body.validationRule === null ? Prisma.DbNull : body.validationRule,
        successFeedback: body.successFeedback,
        failFeedback: body.failFeedback,
        scoreValue: body.scoreValue,
      },
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/practice-steps/:id",
  asyncHandler(async (req, res) => {
    const stepId = z.string().min(1).parse(req.params.id)
    await prisma.practiceStep.delete({ where: { id: stepId } })
    res.status(204).end()
  }),
)

adminRouter.get(
  "/scenes/:sceneId/evaluations",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const evaluations = await prisma.evaluation.findMany({
      where: { sceneId },
      orderBy: [{ createdAt: "desc" }],
    })
    res.json(evaluations)
  }),
)

adminRouter.post(
  "/scenes/:sceneId/evaluations",
  asyncHandler(async (req, res) => {
    const sceneId = z.string().min(1).parse(req.params.sceneId)
    const body = z
      .object({
        title: z.string().min(1),
        evaluationType: z.string().min(1),
        config: JsonRecordSchema,
        passingScore: z.number().int().nonnegative().optional(),
      })
      .parse(req.body)

    const created = await prisma.evaluation.create({
      data: {
        sceneId,
        title: body.title,
        evaluationType: body.evaluationType,
        configJson: body.config,
        passingScore: body.passingScore ?? 0,
      },
    })
    res.status(201).json(created)
  }),
)

adminRouter.patch(
  "/evaluations/:id",
  asyncHandler(async (req, res) => {
    const evaluationId = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        title: z.string().min(1).optional(),
        evaluationType: z.string().min(1).optional(),
        config: JsonRecordSchema.optional(),
        passingScore: z.number().int().nonnegative().optional(),
      })
      .parse(req.body)

    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        title: body.title,
        evaluationType: body.evaluationType,
        configJson: body.config,
        passingScore: body.passingScore,
      },
    })
    res.json(updated)
  }),
)

adminRouter.delete(
  "/evaluations/:id",
  asyncHandler(async (req, res) => {
    const evaluationId = z.string().min(1).parse(req.params.id)
    await prisma.evaluation.delete({ where: { id: evaluationId } })
    res.status(204).end()
  }),
)

