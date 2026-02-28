import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsData {
    total_tickets: number
    by_label: { L1: number; L2: number; L3: number; Unclassified: number }
    by_status: { Open: number; "In Progress": number; Resolved: number; Closed: number }
}

interface StatsProps {
    stats: StatsData | null
    loading: boolean
}

interface StatCardProps {
    title: string
    value: string | number
    subtitle: string
    icon: React.ReactNode
    accentClass: string
    trend?: "up" | "down" | "neutral"
}

function StatCard({ title, value, subtitle, icon, accentClass, trend }: StatCardProps) {
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

    return (
        <Card className="glass border-border/50 overflow-hidden relative group hover:border-primary/30 transition-all duration-300">
            <div className={cn("absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity", accentClass)} />
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accentClass, "bg-opacity-20")}>
                        {icon}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-bold animate-count-up">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                            trend === "up" ? "bg-green-500/15 text-green-400" : trend === "down" ? "bg-red-500/15 text-red-400" : "bg-muted/30 text-muted-foreground"
                        )}>
                            <TrendIcon className="w-3 h-3" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export function Stats({ stats, loading }: StatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(7)].map((_, i) => (
                    <Card key={i} className="glass border-border/50 animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-4 bg-muted rounded w-24 mb-3" />
                            <div className="h-8 bg-muted rounded w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-4">
            {/* Total + Status Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                    title="Total Tickets"
                    value={stats.total_tickets}
                    subtitle="All time"
                    icon={<Tag className="w-4 h-4 text-primary" />}
                    accentClass="bg-primary"
                />
                <StatCard
                    title="Open"
                    value={stats.by_status["Open"]}
                    subtitle="Awaiting triage"
                    icon={<AlertTriangle className="w-4 h-4 text-blue-400" />}
                    accentClass="bg-blue-500"
                    trend="up"
                />
                <StatCard
                    title="In Progress"
                    value={stats.by_status["In Progress"]}
                    subtitle="Being worked on"
                    icon={<Clock className="w-4 h-4 text-yellow-400" />}
                    accentClass="bg-yellow-500"
                    trend="neutral"
                />
                <StatCard
                    title="Resolved"
                    value={stats.by_status["Resolved"]}
                    subtitle="Issues fixed"
                    icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
                    accentClass="bg-green-500"
                    trend="down"
                />
            </div>

            {/* Labels Row */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-green-500/20 hover:border-green-500/40 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-opacity" />
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-green-400">L1</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">{stats.by_label.L1}</p>
                            <p className="text-xs text-muted-foreground">Basic tickets</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-opacity" />
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-yellow-400">L2</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-400">{stats.by_label.L2}</p>
                            <p className="text-xs text-muted-foreground">Intermediate tickets</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border-red-500/20 hover:border-red-500/40 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-opacity" />
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-red-400">L3</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-400">{stats.by_label.L3}</p>
                            <p className="text-xs text-muted-foreground">Critical tickets</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
