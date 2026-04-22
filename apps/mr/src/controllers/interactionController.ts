import type { InteractionManifest, SceneManifest } from "@nalarxr/shared-types"

type InteractionHit = {
  interaction: InteractionManifest
  contentBlockId?: string
}

export function resolveSelectInteraction(
  manifest: SceneManifest,
  objectKey: string,
): InteractionHit | null {
  const interaction = manifest.interactions.find(
    (i) => i.objectKey === objectKey && i.interactionType === "select",
  )
  if (!interaction) return null

  if (interaction.actionType === "open_content" && interaction.targetType === "content_block") {
    const id = interaction.targetRef
    if (!id) return { interaction }
    return { interaction, contentBlockId: id }
  }

  return { interaction }
}

