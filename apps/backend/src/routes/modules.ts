import { Router } from "express"
import { z } from "zod"
import { prisma } from "../prisma"
import { asyncHandler } from "../http"
import { requireAdmin, requireAuth } from "../middleware/auth"

export const modulesRouter = Router()

modulesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const modules = await prisma.module.findMany({
      orderBy: { updatedAt: "desc" },
    })
    res.json(modules)
  }),
)

modulesRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        thumbnailUrl: z.string().url().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        version: z.number().int().positive().optional(),
      })
      .parse(req.body)

    const created = await prisma.module.create({
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description ?? null,
        category: body.category ?? null,
        thumbnailUrl: body.thumbnailUrl ?? null,
        status: body.status ?? "draft",
        version: body.version ?? 1,
      },
    })

    res.status(201).json(created)
  }),
)

modulesRouter.get(
  "/:id",
  requireAuth,
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

modulesRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin,
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
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        category: body.category,
        thumbnailUrl: body.thumbnailUrl,
        status: body.status,
        version: body.version,
      },
    })

    res.json(updated)
  }),
)

modulesRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const moduleId = z.string().min(1).parse(req.params.id)
    await prisma.module.delete({ where: { id: moduleId } })
    res.status(204).send()
  }),
)
