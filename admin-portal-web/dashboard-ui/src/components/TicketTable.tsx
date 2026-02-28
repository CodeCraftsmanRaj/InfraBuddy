import { useState } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MLBadge, StatusBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Ticket {
    ticket_id: string
    user_name: string
    user_email: string
    issue_description: string
    ml_label: string
    ml_confidence: number
    status: string
    priority: string
    created_at: string
}

interface TicketTableProps {
    tickets: Ticket[]
    loading: boolean
    onStatusChange: (ticketId: string, newStatus: string) => void
}

type SortKey = keyof Pick<Ticket, "ticket_id" | "user_name" | "ml_label" | "status" | "created_at">
type SortDir = "asc" | "desc"

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"]

export function TicketTable({ tickets, loading, onStatusChange }: TicketTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("created_at")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [filter, setFilter] = useState("")

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        else { setSortKey(key); setSortDir("asc") }
    }

    const filtered = tickets.filter(
        (t) =>
            t.user_name.toLowerCase().includes(filter.toLowerCase()) ||
            t.issue_description.toLowerCase().includes(filter.toLowerCase()) ||
            t.ticket_id.toLowerCase().includes(filter.toLowerCase())
    )

    const sorted = [...filtered].sort((a, b) => {
        const av = a[sortKey] ?? ""
        const bv = b[sortKey] ?? ""
        const cmp = String(av).localeCompare(String(bv))
        return sortDir === "asc" ? cmp : -cmp
    })

    function SortIcon({ col }: { col: SortKey }) {
        if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />
        return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    }

    return (
        <Card className="glass border-border/50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-base">Ticket Queue ({tickets.length})</CardTitle>
                    <input
                        id="ticket-search"
                        type="text"
                        placeholder="Search tickets…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-8 px-3 rounded-md border border-input bg-input text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Loading tickets…</div>
                ) : sorted.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted-foreground text-sm">No tickets found.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Raise a ticket from the edge chatbot to see it here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    {[
                                        { key: "ticket_id" as SortKey, label: "ID" },
                                        { key: "user_name" as SortKey, label: "User" },
                                        { key: null, label: "Issue" },
                                        { key: "ml_label" as SortKey, label: "ML Label" },
                                        { key: "status" as SortKey, label: "Status" },
                                        { key: "created_at" as SortKey, label: "Created" },
                                        { key: null, label: "Actions" },
                                    ].map(({ key, label }) => (
                                        <th
                                            key={label}
                                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                                        >
                                            {key ? (
                                                <button
                                                    onClick={() => handleSort(key)}
                                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                                >
                                                    {label}
                                                    <SortIcon col={key} />
                                                </button>
                                            ) : label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {sorted.map((ticket) => (
                                    <tr key={ticket.ticket_id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs text-primary font-semibold">#{ticket.ticket_id}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-foreground">{ticket.user_name}</p>
                                                <p className="text-xs text-muted-foreground">{ticket.user_email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="truncate text-foreground/80" title={ticket.issue_description}>
                                                {ticket.issue_description}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <MLBadge label={ticket.ml_label as "L1" | "L2" | "L3" | "Unclassified"} />
                                                <p className="text-[10px] text-muted-foreground">
                                                    {(ticket.ml_confidence * 100).toFixed(0)}% conf.
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={ticket.status} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                id={`status-${ticket.ticket_id}`}
                                                value={ticket.status}
                                                onChange={(e) => onStatusChange(ticket.ticket_id, e.target.value)}
                                                className="h-7 px-2 rounded border border-input bg-input text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                            >
                                                {STATUSES.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
