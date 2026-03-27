// ✅ NEW: Performance monitoring component
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, Database, Zap } from "lucide-react"

interface PerformanceMetrics {
  apiCallCount: number
  cacheHitRate: number
  averageResponseTime: number
  lastUpdateTime: Date
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCallCount: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    lastUpdateTime: new Date(),
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    setIsVisible(process.env.NODE_ENV === "development")
  }, [])

  if (!isVisible) return null

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs">API Calls</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {metrics.apiCallCount}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs">Cache Hit Rate</span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${
              metrics.cacheHitRate > 70
                ? "text-green-600 border-green-200"
                : metrics.cacheHitRate > 40
                  ? "text-yellow-600 border-yellow-200"
                  : "text-red-600 border-red-200"
            }`}
          >
            {metrics.cacheHitRate.toFixed(1)}%
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs">Avg Response</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {metrics.averageResponseTime}ms
          </Badge>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t">
          Last updated: {metrics.lastUpdateTime.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}
