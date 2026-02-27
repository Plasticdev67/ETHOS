import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()

  try {
    const { rows: cards } = await client.query(`
      SELECT
        pdc.id,
        pdc."assignedDesignerId",
        pdc."targetStartDate",
        pdc."targetEndDate",
        pdc."createdAt",
        u.name as designer_name,
        p.description as product_desc,
        p."productJobNumber"
      FROM product_design_cards pdc
      LEFT JOIN users u ON pdc."assignedDesignerId" = u.id
      LEFT JOIN products p ON pdc."productId" = p.id
      WHERE pdc."assignedDesignerId" IS NOT NULL
        AND pdc.status NOT IN ('COMPLETE', 'ON_HOLD')
      ORDER BY pdc."targetStartDate" ASC NULLS LAST, pdc."createdAt" ASC
    `)

    console.log(`Found ${cards.length} active cards to sequence\n`)

    // Group by designer
    const byDesigner: Record<string, typeof cards> = {}
    for (const card of cards) {
      const dId = card.assignedDesignerId
      if (!byDesigner[dId]) byDesigner[dId] = []
      byDesigner[dId].push(card)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let totalUpdated = 0

    for (const designerId in byDesigner) {
      const designerCards = byDesigner[designerId]
      const designerName = designerCards[0]?.designer_name || "Unknown"

      console.log(`--- ${designerName} (${designerCards.length} tasks) ---`)

      let nextStart = new Date(today)

      for (const card of designerCards) {
        // Preserve original duration, default 14 days
        let durationDays = 14
        if (card.targetStartDate && card.targetEndDate) {
          const origDuration = Math.round(
            (new Date(card.targetEndDate).getTime() - new Date(card.targetStartDate).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (origDuration > 0) durationDays = origDuration
        }

        const newStart = new Date(nextStart)
        const newEnd = new Date(nextStart)
        newEnd.setDate(newEnd.getDate() + durationDays)

        const label = card.productJobNumber || card.product_desc || card.id
        console.log(`  ${label}: ${newStart.toISOString().split("T")[0]} -> ${newEnd.toISOString().split("T")[0]} (${durationDays}d)`)

        await client.query(
          `UPDATE product_design_cards SET "targetStartDate" = $1, "targetEndDate" = $2 WHERE id = $3`,
          [newStart, newEnd, card.id]
        )

        nextStart = new Date(newEnd)
        totalUpdated++
      }
      console.log()
    }

    console.log(`Done! Rescheduled ${totalUpdated} cards across ${Object.keys(byDesigner).length} designers.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
