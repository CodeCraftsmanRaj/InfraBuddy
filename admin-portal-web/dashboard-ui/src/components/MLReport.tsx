import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trophy, Brain } from "lucide-react"

interface ModelMetrics {
    model: string
    accuracy: number
    precision_macro: number
    recall_macro: number
    f1_macro: number
    per_class?: Record<string, { precision: number; recall: number; f1_score: number; support: number }>
}

interface MLReportProps {
    report: {
        best_model: string
        best_f1_macro: number
        results: ModelMetrics[]
    } | null
    loading: boolean
}

const MODEL_COLOURS: Record<string, string> = {
    "Random Forest": "hsl(217 91% 60%)",
    "SVM": "hsl(262 83% 67%)",
    "KNN": "hsl(142 76% 44%)",
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="glass rounded-lg px-4 py-3 shadow-xl text-sm space-y-1">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-medium">{(p.value * 100).toFixed(1)}%</span>
                </div>
            ))}
        </div>
    )
}

export function MLReport({ report, loading }: MLReportProps) {
    if (loading) {
        return (
            <Card className="glass border-border/50 animate-pulse">
                <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Loading ML report…
                </CardContent>
            </Card>
        )
    }

    if (!report || !report.results) {
        return (
            <Card className="glass border-border/50">
                <CardContent className="h-40 flex flex-col items-center justify-center gap-2 text-center p-8">
                    <Brain className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm font-medium">No ML report available</p>
                    <p className="text-xs text-muted-foreground/60">
                        Run <code className="bg-muted px-1 rounded">python model_trainer.py</code> in the ml-engine directory.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Prepare bar chart data
    const chartData = [
        { metric: "Accuracy", ...Object.fromEntries(report.results.map((r) => [r.model, r.accuracy])) },
        { metric: "Precision", ...Object.fromEntries(report.results.map((r) => [r.model, r.precision_macro])) },
        { metric: "Recall", ...Object.fromEntries(report.results.map((r) => [r.model, r.recall_macro])) },
        { metric: "F1 Score", ...Object.fromEntries(report.results.map((r) => [r.model, r.f1_macro])) },
    ]

    return (
        <div className="space-y-4">
            {/* Best Model Banner */}
            <Card className="glass border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5" />
                <CardContent className="p-5 flex items-center gap-4 relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Performing Model</p>
                        <p className="text-xl font-bold text-primary">{report.best_model}</p>
                        <p className="text-sm text-muted-foreground">F1 Macro: {(report.best_f1_macro * 100).toFixed(2)}%</p>
                    </div>
                </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="glass border-border/50">
                <CardHeader>
                    <CardTitle className="text-base">Model Comparison</CardTitle>
                    <CardDescription>Accuracy, Precision, Recall & F1 across all classifiers</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                            <XAxis
                                dataKey="metric"
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 1]}
                                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                            />
                            {report.results.map((r) => (
                                <Bar
                                    key={r.model}
                                    dataKey={r.model}
                                    fill={MODEL_COLOURS[r.model] ?? "hsl(var(--primary))"}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card className="glass border-border/50">
                <CardHeader>
                    <CardTitle className="text-base">Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    {["Model", "Accuracy", "Precision", "Recall", "F1 Score"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {report.results
                                    .sort((a, b) => b.f1_macro - a.f1_macro)
                                    .map((r, i) => (
                                        <tr key={r.model} className={i === 0 ? "bg-primary/5" : "hover:bg-muted/20 transition-colors"}>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ background: MODEL_COLOURS[r.model] ?? "hsl(var(--primary))" }}
                                                    />
                                                    {r.model}
                                                    {i === 0 && <span className="text-xs text-primary font-semibold">★ Best</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{(r.accuracy * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-3 font-mono">{(r.precision_macro * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-3 font-mono">{(r.recall_macro * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-3 font-mono font-semibold">{(r.f1_macro * 100).toFixed(2)}%</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
