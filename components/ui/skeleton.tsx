import { cn } from "@/lib/utils"
import React from "react"

export function Skeleton({
  className,
  children,
  isLoading = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  isLoading?: boolean
}): React.ReactNode {
  return isLoading ? (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg relative bg-neutral-100",
        className,
      )}
      {...props}
    >
      <div className="after:content-[''] after:opacity-5 after:absolute after:inset-0 after:w-full after:h-full after:-translate-x-full after:[background-image:linear-gradient(90deg,rgba(0,0,0,0)_0,rgba(0,0,0,0.2)_20%,rgba(0,0,0,0.5)_60%,rgb(0,0,0),rgba(0,0,0,0))] after:animate-skeleton">
        <div className="opacity-0">{children}</div>
      </div>
    </div>
  ) : (
    <>{children}</>
  )
}
