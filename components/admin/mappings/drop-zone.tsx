"use client"

import { useDrop } from "react-dnd"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { StreamingService } from "@/types/streaming"

interface DropZoneProps {
  children: ReactNode
  onDrop: (item: { service: StreamingService }) => void
}

export function DropZone({ children, onDrop }: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "SERVICE",
    drop: onDrop,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }))

  return (
    <div
      ref={drop}
      className={cn(
        "transition-colors border-2 border-transparent rounded-md",
        canDrop && "border-dashed",
        isOver && canDrop && "border-primary bg-primary/5",
      )}
    >
      {children}
    </div>
  )
}
