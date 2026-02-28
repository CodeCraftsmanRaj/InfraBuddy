import { cn } from "@/lib/utils"

interface BadgeProps {
    label: "L1" | "L2" | "L3" | "Unclassified"
    className?: string
}

const labelConfig = {
    L1: { cls: "badge-l1", icon: "●", text: "L1 Basic" },
    L2: { cls: "badge-l2", icon: "●", text: "L2 Intermediate" },
    L3: { cls: "badge-l3", icon: "●", text: "L3 Critical" },
    Unclassified: { cls: "bg-muted/30 text-muted-foreground border border-border", icon: "○", text: "Unclassified" },
}

export function MLBadge({ label, className }: BadgeProps) {
    const cfg = labelConfig[label] ?? labelConfig["Unclassified"]
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                cfg.cls,
                className
            )}
        >
            <span className="text-[8px]">{cfg.icon}</span>
            {cfg.text}
        </span>
    )
}

interface StatusBadgeProps {
    status: string
    className?: string
}

const statusConfig: Record<string, string> = {
    "Open": "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    "In Progress": "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    "Resolved": "bg-green-500/15 text-green-400 border border-green-500/30",
    "Closed": "bg-muted/30 text-muted-foreground border border-border",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const cls = statusConfig[status] ?? statusConfig["Open"]
    return (
        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cls, className)}>
            {status}
        </span>
    )
}
