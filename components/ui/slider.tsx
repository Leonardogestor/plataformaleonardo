"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max: number
  min: number
  step: number
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, onValueChange, max, min, step, disabled = false, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const sliderRef = React.useRef<HTMLDivElement>(null)

    const percentage = (((value[0] || 0) - min) / (max - min)) * 100

    const updateValue = React.useCallback(
      (clientX: number) => {
        if (!sliderRef.current) return

        const rect = sliderRef.current.getBoundingClientRect()
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const newValue = min + percentage * (max - min)
        const steppedValue = Math.round(newValue / step) * step

        onValueChange([Math.max(min, Math.min(max, steppedValue))])
      },
      [min, max, step, onValueChange]
    )

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(e.clientX)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled) return
      setIsDragging(true)
      if (e.touches[0]) {
        updateValue(e.touches[0].clientX)
      }
    }

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          updateValue(e.clientX)
        }
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && e.touches[0]) {
          updateValue(e.touches[0].clientX)
        }
      }

      const handleMouseUp = () => {
        setIsDragging(false)
      }

      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
        document.addEventListener("touchmove", handleTouchMove)
        document.addEventListener("touchend", handleMouseUp)
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleMouseUp)
      }
    }, [isDragging, max, min, step, onValueChange, updateValue])

    return (
      <div
        ref={sliderRef}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
          className
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className={cn(
            "absolute top-1/2 h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-all",
            "-translate-y-1/2",
            disabled && "pointer-events-none",
            isDragging && "scale-110"
          )}
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
