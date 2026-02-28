import { useState, useEffect, useCallback } from "react"
import { RefreshCw, LayoutDashboard, TicketIcon, Brain, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Stats } from "@/components/Stats"
import { TicketTable } from "@/components/TicketTable"
import { MLReport } from "@/components/MLReport"

const PORTAL_API = "http://localhost:9000"

type Tab = "overview" | "tickets" | "ml-report"

type Ticket = {
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

type StatsData = {
    total_tickets: number
    by_label: { L1: number; L2: number; L3: number; Unclassified: number }
    by_status: { Open: number; "In Progress": number; Resolved: number; Closed: number }
}

type MLReportData = {
    best_model: string
    best_f1_macro: number
    results: {
        model: string
        accuracy: number
        precision_macro: number
        recall_macro: number
        f1_macro: number
    }[]
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [stats, setStats] = useState<StatsData | null>(null)
    const [mlReport, setMlReport] = useState<MLReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

    const fetchAll = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true)
        else setLoading(true)

        try {
            const [ticketsRes, statsRes, reportRes] = await Promise.all([
                fetch(`${PORTAL_API}/tickets`),
                fetch(`${PORTAL_API}/stats`),
                fetch(`${PORTAL_API}/ml-report`),
            ])

            const ticketsData = await ticketsRes.json()
            const statsData = await statsRes.json()
            const reportData = await reportRes.json()

            setTickets(ticketsData.tickets ?? [])
            setStats(statsData)
            setMlReport(reportData.error ? null : reportData)
            setLastRefresh(new Date())
        } catch (e) {
            console.error("Failed to fetch portal data:", e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => fetchAll(true), 30_000)
        return () => clearInterval(interval)
    }, [fetchAll])

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        try {
            const res = await fetch(`${PORTAL_API}/tickets/${ticketId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setTickets((prev) =>
                    prev.map((t) => (t.ticket_id === ticketId ? { ...t, status: newStatus } : t))
                )
                // Also update stats
                await fetchAll(true)
            }
        } catch (e) {
            console.error("Failed to update ticket status:", e)
        }
    }

    const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: "tickets", label: "Tickets", icon: <TicketIcon className="w-4 h-4" /> },
        { id: "ml-report", label: "ML Analysis", icon: <Brain className="w-4 h-4" /> },
    ]

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top Navigation Bar */}
            <header className="glass border-b border-border/50 px-6 py-4 sticky top-0 z-40 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-bold text-foreground text-lg leading-none">InfraBuddy</h1>
                            <p className="text-xs text-muted-foreground leading-none mt-0.5">Admin Portal</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <nav className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
                        {TABS.map(({ id, label, icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Refresh */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                            Last refresh: {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Button
                            id="refresh-btn"
                            variant="outline"
                            size="sm"
                            onClick={() => fetchAll(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                {activeTab === "overview" && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Overview</h2>
                            <p className="text-muted-foreground text-sm">
                                Real-time ticket stats and system health
                            </p>
                        </div>
                        <Stats stats={stats} loading={loading} />
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Recent Tickets</h3>
                            <TicketTable
                                tickets={tickets.slice(0, 5)}
                                loading={loading}
                                onStatusChange={handleStatusChange}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "tickets" && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Ticket Queue</h2>
                            <p className="text-muted-foreground text-sm">
                                All incoming tickets classified by ML. Update status inline.
                            </p>
                        </div>
                        <TicketTable
                            tickets={tickets}
                            loading={loading}
                            onStatusChange={handleStatusChange}
                        />
                    </div>
                )}

                {activeTab === "ml-report" && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">ML Analysis</h2>
                            <p className="text-muted-foreground text-sm">
                                Comparative performance of Random Forest, SVM, and KNN classifiers.
                            </p>
                        </div>
                        <MLReport report={mlReport} loading={loading} />
                    </div>
                )}
            </main>
        </div>
    )
}
