"use client"

import { Droppable, Draggable } from "@hello-pangea/dnd"
import {
  WORKSHOP_STAGES,
  STAGE_DISPLAY_NAMES,
  PRODUCT_LANE_CONFIG,
  type ProductLane,
} from "@/lib/production-utils"
import {
  ProductionProductCard,
  type FlatProduct,
} from "./production-product-card"
import { ChevronRight } from "lucide-react"

export function ProductLaneRow({
  lane,
  productsByStage,
  compact,
}: {
  lane: ProductLane
  productsByStage: Record<string, FlatProduct[]>
  compact?: boolean
}) {
  const config = PRODUCT_LANE_CONFIG[lane]
  const totalCount = Object.values(productsByStage).reduce(
    (s, arr) => s + arr.length,
    0
  )

  return (
    <div
      className={`rounded-lg border-2 ${config.borderColor} bg-gradient-to-r ${config.bgFrom} ${config.bgVia} ${config.bgTo}`}
    >
      {/* Lane Header */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 border-b ${config.borderColor}`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <h3
            className={`text-sm font-bold ${config.textColor} uppercase tracking-wider`}
          >
            {config.label}
          </h3>
          {config.subtitle && (
            <span className="text-[10px] text-gray-400 normal-case tracking-normal">
              ({config.subtitle})
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.textColor} ${
            "bg-gray-200"
          }`}
        >
          {totalCount}
        </span>
      </div>

      {/* Stage cells — horizontal row */}
      <div className="flex overflow-x-auto">
        {WORKSHOP_STAGES.map((stage, idx) => {
          const stageProducts = productsByStage[stage] || []
          const droppableId = `${stage}:${lane}`

          return (
            <div key={stage} className="flex items-stretch shrink-0">
              <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-[280px] min-h-[100px] p-2 ${
                      snapshot.isDraggingOver
                        ? "bg-blue-50/60 ring-2 ring-blue-300 ring-inset"
                        : ""
                    }`}
                  >
                    {/* Mini stage label */}
                    <div
                      className="text-[10px] font-medium uppercase tracking-wider mb-1.5 text-gray-400"
                    >
                      {STAGE_DISPLAY_NAMES[stage]}
                      {stageProducts.length > 0 && (
                        <span className="ml-1">({stageProducts.length})</span>
                      )}
                    </div>

                    {/* Product Cards */}
                    {stageProducts.map((product, index) => (
                      <Draggable
                        key={product.id}
                        draggableId={product.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`mb-1.5 ${
                              dragSnapshot.isDragging
                                ? "rotate-2 shadow-lg"
                                : ""
                            }`}
                          >
                            <ProductionProductCard
                              product={product}
                              compact={compact}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {stageProducts.length === 0 &&
                      !snapshot.isDraggingOver && (
                        <div
                          className={`py-3 text-center text-[10px] ${config.cellEmptyColor}`}
                        >
                          —
                        </div>
                      )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Arrow connector between stages */}
              {idx < WORKSHOP_STAGES.length - 1 && (
                <div className="flex items-center px-0.5 shrink-0">
                  <ChevronRight
                    className="h-4 w-4 text-gray-300"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
