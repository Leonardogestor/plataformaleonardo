import React from "react"
import classNames from "classnames"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={classNames("bg-white rounded-xl shadow-sm border border-gray-200 p-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}
