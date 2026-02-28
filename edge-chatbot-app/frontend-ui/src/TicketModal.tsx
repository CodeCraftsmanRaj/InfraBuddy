import { useState } from "react"
import { Loader2, Ticket, CheckCircle2, AlertTriangle } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const EDGE_API = "http://localhost:8000"

interface TicketModalProps {
    open: boolean
    onClose: () => void
    issueContext: string
    chatContext: string
}

type SubmitState = "idle" | "loading" | "success" | "error"

export function TicketModal({ open, onClose, issueContext, chatContext }: TicketModalProps) {
    const [form, setForm] = useState({
        user_name: "",
        user_email: "",
        issue_description: issueContext,
        priority: "Normal",
    })
    const [submitState, setSubmitState] = useState<SubmitState>("idle")
    const [ticketId, setTicketId] = useState("")
    const [mlLabel, setMlLabel] = useState("")
    const [errorMsg, setErrorMsg] = useState("")

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        if (!form.user_name.trim() || !form.user_email.trim() || !form.issue_description.trim()) {
            setErrorMsg("Please fill in all required fields.")
            return
        }

        setErrorMsg("")
        setSubmitState("loading")

        try {
            const res = await fetch(`${EDGE_API}/bridge-to-portal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    chat_context: chatContext,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to submit ticket.")
            }

            const data = await res.json()
            setTicketId(data.ticket_id || "N/A")
            setMlLabel(data.ml_label || "N/A")
            setSubmitState("success")
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Unknown error. Is the portal running?")
            setSubmitState("error")
        }
    }

    const handleClose = () => {
        setSubmitState("idle")
        setErrorMsg("")
        setTicketId("")
        setMlLabel("")
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent id="ticket-modal">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Ticket className="w-5 h-5 text-primary" />
                        <DialogTitle>Raise a Support Ticket</DialogTitle>
                    </div>
                    <DialogDescription>
                        Our team will review your issue and classify it automatically using ML.
                    </DialogDescription>
                </DialogHeader>

                {submitState === "success" ? (
                    /* Success State */
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Ticket Submitted!</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Your ticket has been received and classified.
                            </p>
                        </div>
                        <div className="glass rounded-lg px-5 py-3 w-full text-left space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Ticket ID</span>
                                <span className="font-mono font-semibold text-primary">#{ticketId}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">ML Classification</span>
                                <span
                                    className={cn(
                                        "font-bold",
                                        mlLabel === "L1" && "text-green-400",
                                        mlLabel === "L2" && "text-yellow-400",
                                        mlLabel === "L3" && "text-red-400",
                                        mlLabel === "Unclassified" && "text-muted-foreground"
                                    )}
                                >
                                    {mlLabel}
                                </span>
                            </div>
                        </div>
                        <Button onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    </div>
                ) : (
                    /* Form State */
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium" htmlFor="ticket-name">
                                Full Name <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="ticket-name"
                                placeholder="Jane Smith"
                                value={form.user_name}
                                onChange={(e) => handleChange("user_name", e.target.value)}
                                disabled={submitState === "loading"}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium" htmlFor="ticket-email">
                                Email <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="ticket-email"
                                type="email"
                                placeholder="jane@company.com"
                                value={form.user_email}
                                onChange={(e) => handleChange("user_email", e.target.value)}
                                disabled={submitState === "loading"}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium" htmlFor="ticket-desc">
                                Issue Description <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                id="ticket-desc"
                                rows={4}
                                placeholder="Describe your issue in detail…"
                                value={form.issue_description}
                                onChange={(e) => handleChange("issue_description", e.target.value)}
                                disabled={submitState === "loading"}
                                className={cn(
                                    "w-full rounded-md border border-input bg-input px-3 py-2 text-sm shadow-sm",
                                    "placeholder:text-muted-foreground resize-none",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    "disabled:cursor-not-allowed disabled:opacity-50"
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium" htmlFor="ticket-priority">
                                Priority
                            </label>
                            <select
                                id="ticket-priority"
                                value={form.priority}
                                onChange={(e) => handleChange("priority", e.target.value)}
                                disabled={submitState === "loading"}
                                className={cn(
                                    "w-full h-9 rounded-md border border-input bg-input px-3 py-1 text-sm shadow-sm",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    "disabled:cursor-not-allowed disabled:opacity-50"
                                )}
                            >
                                <option value="Low">Low</option>
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>

                        {(submitState === "error" || errorMsg) && (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/15 border border-destructive/30 px-3 py-2">
                                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-destructive">{errorMsg}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleClose}
                                disabled={submitState === "loading"}
                            >
                                Cancel
                            </Button>
                            <Button
                                id="submit-ticket-btn"
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={submitState === "loading"}
                            >
                                {submitState === "loading" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <Ticket className="w-4 h-4" />
                                        Submit Ticket
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
