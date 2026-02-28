import { useState, useRef, useEffect, useCallback } from "react"
import {
    Bot, Send, Ticket, Wifi, WifiOff, Loader2, RotateCcw,
    User, MessageSquare, BookOpen, Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { TicketModal } from "./TicketModal"
import { UserGuide } from "./UserGuide"
import { cn } from "@/lib/utils"

const EDGE_API = "http://localhost:8000"

type ActiveTab = "chat" | "guide"

interface SuggestedAction {
    id: string
    title: string
    description: string
}

interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    timestamp: Date
    suggestedAction?: SuggestedAction
    actionResult?: string
}

function MessageBubble({
    message,
    onExecuteAction,
    isExecuting,
}: {
    message: Message
    onExecuteAction?: (actionId: string, messageId: string) => void
    isExecuting?: boolean
}) {
    const isUser = message.role === "user"
    const isSystem = message.role === "system"

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/30">
                    {message.content}
                </span>
            </div>
        )
    }

    return (
        <div className={cn("flex items-start gap-3 animate-fade-in", isUser && "flex-row-reverse")}>
            {/* Avatar */}
            <div
                className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    isUser
                        ? "bg-primary/15 border border-primary/40"
                        : "gradient-primary glow-primary"
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-primary" />
                ) : (
                    <Bot className="w-4 h-4 text-white" />
                )}
            </div>

            {/* Bubble */}
            <div className="flex flex-col gap-2 max-w-[78%]">
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                            ? "bg-primary/20 border border-primary/30 text-foreground rounded-tr-sm"
                            : "glass text-foreground rounded-tl-sm"
                    )}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                        className={cn(
                            "text-[10px] mt-1.5 opacity-50",
                            isUser ? "text-right" : "text-left"
                        )}
                    >
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>

                {/* Agentic Action Card */}
                {message.suggestedAction && !message.actionResult && (
                    <Card className="glass border-primary/30 p-3 mt-1 space-y-2 animate-slide-up">
                        <div className="flex items-start gap-2 text-sm text-foreground">
                            <Zap className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-primary">{message.suggestedAction.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {message.suggestedAction.description}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="w-full gradient-primary text-white border-0 hover:opacity-90 transition-opacity"
                            disabled={isExecuting}
                            onClick={() =>
                                onExecuteAction?.(message.suggestedAction!.id, message.id)
                            }
                        >
                            {isExecuting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Running Fix…
                                </>
                            ) : (
                                <>
                                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                                    Approve &amp; Run Fix
                                </>
                            )}
                        </Button>
                    </Card>
                )}

                {/* Agentic Action Result */}
                {message.actionResult && (
                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                        <p className="font-semibold mb-1.5 text-foreground flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-primary" /> Fix Result
                        </p>
                        <pre className="whitespace-pre-wrap font-mono text-[10px] max-h-36 overflow-y-auto leading-relaxed">
                            {message.actionResult}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}

function TypingIndicator() {
    return (
        <div className="flex items-start gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center gradient-primary glow-primary">
                <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    )
}

export default function ChatInterface() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("chat")
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "👋 Hi! I'm **InfraBuddy**, your AI-powered IT support assistant.\n\nDescribe your issue and I'll help you fix it. For step-by-step guides on OneDrive, Outlook, and more — check the **User Guide** tab above.",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExecutingScript, setIsExecutingScript] = useState(false)
    const [isOnline, setIsOnline] = useState<boolean | null>(null)
    const [showTicketModal, setShowTicketModal] = useState(false)
    const [lastUserMessage, setLastUserMessage] = useState("")
    const [chatContext, setChatContext] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Health check on mount
    useEffect(() => {
        fetch(`${EDGE_API}/health`)
            .then((r) => setIsOnline(r.ok))
            .catch(() => setIsOnline(false))
    }, [])

    // Listen for tab switch from UserGuide "ask in chat" button
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail === "chat") setActiveTab("chat")
        }
        document.addEventListener("infrabuddy:switch-tab", handler)
        return () => document.removeEventListener("infrabuddy:switch-tab", handler)
    }, [])

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading, isExecutingScript])

    const addMessage = useCallback(
        (role: Message["role"], content: string, suggestedAction?: SuggestedAction) => {
            const msg: Message = {
                id: `${Date.now()}-${Math.random()}`,
                role,
                content,
                timestamp: new Date(),
                suggestedAction,
            }
            setMessages((prev) => [...prev, msg])
            return msg
        },
        []
    )

    const executeAction = async (actionId: string, messageId: string) => {
        setIsExecutingScript(true)
        try {
            const res = await fetch(`${EDGE_API}/execute-script`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script_id: actionId }),
            })

            const data = await res.json()
            const resultText = res.ok
                ? data.output || "Completed successfully with no output."
                : `Error: ${data.detail || data.error}`

            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, actionResult: resultText } : m))
            )

            addMessage(
                "assistant",
                res.ok
                    ? "✅ I ran the fix for you! Did this resolve your issue? If not, feel free to raise a support ticket."
                    : "⚠️ I attempted the fix, but it encountered an error. Would you like to raise a support ticket instead?"
            )
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Execution failed."
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, actionResult: `Failed: ${errMsg}` } : m))
            )
        } finally {
            setIsExecutingScript(false)
        }
    }

    const sendMessage = useCallback(async () => {
        const text = input.trim()
        if (!text || isLoading) return

        setInput("")
        setLastUserMessage(text)
        addMessage("user", text)

        setChatContext((prev) => prev + `\nUser: ${text}`)

        setIsLoading(true)
        try {
            const res = await fetch(`${EDGE_API}/ask-ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Server error")
            }

            const data = await res.json()
            const reply = data.reply || "I couldn't generate a response."
            const suggestedAction = data.suggested_action as SuggestedAction | undefined

            addMessage("assistant", reply, suggestedAction)
            setChatContext((prev) => prev + `\nAssistant: ${reply}`)
        } catch (err: unknown) {
            const errMsg =
                err instanceof Error ? err.message : "Connection failed. Is the backend running?"
            addMessage("system", `⚠️ ${errMsg}`)
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }, [input, isLoading, addMessage])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Chat cleared. How can I help you today?",
                timestamp: new Date(),
            },
        ])
        setChatContext("")
    }

    const assistantMessages = messages.filter((m) => m.role === "assistant")
    const showRaiseTicket = assistantMessages.length > 1

    const TABS = [
        { id: "chat" as ActiveTab, label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
        { id: "guide" as ActiveTab, label: "User Guide", icon: <BookOpen className="w-3.5 h-3.5" /> },
    ]

    return (
        <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 gap-3">
            {/* ── Header ── */}
            <div className="glass-strong border border-border/50 rounded-2xl px-5 py-3 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gradient">InfraBuddy</h1>
                        <p className="text-[11px] text-muted-foreground">Edge AI Support Assistant</p>
                    </div>
                </div>

                {/* Centre: Tabs */}
                <nav className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/30">
                    {TABS.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            id={`tab-${id}`}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                                activeTab === id ? "tab-active shadow-sm" : "tab-inactive"
                            )}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Right: Status + Clear */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                        {isOnline === null ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        ) : isOnline ? (
                            <>
                                <Wifi className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Connected</span>
                                <span className="status-dot bg-emerald-400" />
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3 text-destructive" />
                                <span className="text-destructive">Offline</span>
                            </>
                        )}
                    </div>
                    {activeTab === "chat" && (
                        <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
                            <RotateCcw className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Tab Content ── */}
            {activeTab === "guide" ? (
                <UserGuide />
            ) : (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                onExecuteAction={executeAction}
                                isExecuting={isExecutingScript}
                            />
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </div>

                    {/* Raise Ticket Banner */}
                    {showRaiseTicket && (
                        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-primary/20 animate-fade-in flex-shrink-0">
                            <p className="text-sm text-muted-foreground">
                                🎫 Still stuck? Escalate to the support team.
                            </p>
                            <Button
                                size="sm"
                                className="gradient-primary text-white border-0 hover:opacity-90 flex items-center gap-1.5 flex-shrink-0"
                                onClick={() => setShowTicketModal(true)}
                            >
                                <Ticket className="w-4 h-4" />
                                Raise Ticket
                            </Button>
                        </div>
                    )}

                    {/* Input Bar */}
                    <Card className="glass-strong border-border/50 flex items-center gap-3 px-4 py-3 flex-shrink-0">
                        <Input
                            ref={inputRef}
                            id="chat-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe your technical issue…"
                            disabled={isLoading}
                            className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/50"
                        />
                        <Button
                            id="send-button"
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="flex-shrink-0 gradient-primary text-white border-0 hover:opacity-90 disabled:opacity-40"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </Card>
                </>
            )}

            {/* Ticket Modal */}
            <TicketModal
                open={showTicketModal}
                onClose={() => setShowTicketModal(false)}
                issueContext={lastUserMessage}
                chatContext={chatContext}
            />
        </div>
    )
}
