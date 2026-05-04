import { prisma } from "./prisma"

async function main() {
  const moduleSlug = "demo-module"
  const sceneSlug = "demo-scene"

  const mod = await prisma.module.upsert({
    where: { slug: moduleSlug },
    create: {
      title: "Demo Module",
      slug: moduleSlug,
      description: "Demo module for MR runtime testing",
      status: "published",
    },
    update: {
      title: "Demo Module",
      description: "Demo module for MR runtime testing",
      status: "published",
    },
  })

  await prisma.scene.upsert({
    where: { moduleId_slug: { moduleId: mod.id, slug: sceneSlug } },
    create: {
      moduleId: mod.id,
      title: "Demo Scene",
      slug: sceneSlug,
      sceneType: "overview",
      orderNo: 1,
      status: "published",
    },
    update: {
      title: "Demo Scene",
      sceneType: "overview",
      orderNo: 1,
      status: "published",
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    await prisma.$disconnect().catch(() => {})
    process.stderr.write(err instanceof Error ? `${err.message}\n` : "Seed failed\n")
    process.exit(1)
  })

