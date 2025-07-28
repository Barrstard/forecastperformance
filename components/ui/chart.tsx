"use client"

import * as React from "react"
import { Bar, BarChart, Line, LineChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend, Area, AreaChart } from "recharts"
import { cn } from "@/lib/utils"

// Simple chart components without complex TypeScript issues
export const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    payload?: any[]
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
    label?: any
    labelFormatter?: (value: any, payload: any[]) => React.ReactNode
    labelClassName?: string
    formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode
    color?: string
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    if (!active || !payload?.length) {
      return null
    }

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const value = labelKey ? item[labelKey] : label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [label, labelFormatter, payload, hideLabel, labelClassName, labelKey])

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {!hideIndicator && (
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full border-2 border-background",
                          indicator === "dashed" && "h-0.5 w-0.5 rounded-none border-0 bg-current",
                          indicator === "line" && "h-0.5 w-0.5 rounded-none border-0 bg-current"
                        )}
                        style={{
                          backgroundColor: indicatorColor,
                        }}
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="text-xs text-muted-foreground">
                        {item.name || item.dataKey}
                      </div>
                      <div className="text-xs font-medium">
                        {item.value}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltip.displayName = "ChartTooltip"

export const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    payload?: any[]
    verticalAlign?: "top" | "bottom" | "left" | "right"
  }
>(
  (
    {
      payload,
      verticalAlign = "top",
      className,
      ...props
    },
    ref
  ) => {
    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 text-xs",
          verticalAlign === "top" && "justify-center",
          verticalAlign === "bottom" && "justify-center",
          verticalAlign === "left" && "flex-col",
          verticalAlign === "right" && "flex-col",
          className
        )}
        {...props}
      >
        {payload.map((item: any) => {
          const indicatorColor = item.payload?.fill || item.color

          return (
            <div
              key={item.dataKey}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2 py-1 text-xs",
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div
                className="h-2 w-2 rounded-full border-2 border-background"
                style={{
                  backgroundColor: indicatorColor,
                }}
              />
              <div className="text-xs font-medium">
                {item.value}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegend.displayName = "ChartLegend"

// Export all recharts components
export {
  Bar,
  BarChart,
  Line,
  LineChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  Area,
  AreaChart,
}
