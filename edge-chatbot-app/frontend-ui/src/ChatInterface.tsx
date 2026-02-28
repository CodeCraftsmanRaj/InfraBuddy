import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, Send, Ticket, Wifi, WifiOff, Loader2, RotateCcw, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { TicketModal } from "./TicketModal"
import { cn } from "@/lib/utils"

const EDGE_API = "http://localhost:8000"

interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    timestamp: Date
}

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user"
    const isSystem = message.role === "system"

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
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
                        ? "bg-primary/20 border border-primary/40"
                        : "bg-accent/20 border border-accent/40"
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-primary" />
                ) : (
                    <Bot className="w-4 h-4 text-accent" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "glass text-foreground rounded-tl-sm"
                )}
            >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                    className={cn(
                        "text-[10px] mt-1 opacity-60",
                        isUser ? "text-right" : "text-left"
                    )}
                >
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    )
}

function TypingIndicator() {
    return (
        <div className="flex items-start gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-accent/20 border border-accent/40">
                <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    )
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "👋 Hi! I'm **InfraBuddy**, your AI-powered technical support assistant.\n\nTell me what's going wrong — I'll do my best to help you fix it. If the issue is complex, we can raise a support ticket together.",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
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

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    const addMessage = useCallback((role: Message["role"], content: string) => {
        const msg: Message = {
            id: `${Date.now()}-${Math.random()}`,
            role,
            content,
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, msg])
        return msg
    }, [])

    const sendMessage = useCallback(async () => {
        const text = input.trim()
        if (!text || isLoading) return

        setInput("")
        setLastUserMessage(text)
        addMessage("user", text)

        // Build running chat context for ticket
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
            addMessage("assistant", reply)
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

    return (
        <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 gap-4">
            {/* Header */}
            <Card className="glass border-border/50 flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-foreground">InfraBuddy</h1>
                        <p className="text-xs text-muted-foreground">Edge AI Support Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Connection status */}
                    <div className="flex items-center gap-1.5 text-xs">
                        {isOnline === null ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        ) : isOnline ? (
                            <>
                                <Wifi className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Connected</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3 text-destructive" />
                                <span className="text-destructive">Offline</span>
                            </>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </div>
            </Card>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={bottomRef} />
            </div>

            {/* Raise Ticket Banner */}
            {showRaiseTicket && (
                <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-4 border-primary/30 animate-fade-in flex-shrink-0">
                    <p className="text-sm text-muted-foreground">
                        🎫 Still stuck? Escalate to our support team.
                    </p>
                    <Button
                        variant="glow"
                        size="sm"
                        onClick={() => setShowTicketModal(true)}
                        className="flex items-center gap-1.5 flex-shrink-0"
                    >
                        <Ticket className="w-4 h-4" />
                        Raise Ticket
                    </Button>
                </div>
            )}

            {/* Input Bar */}
            <Card className="glass border-border/50 flex items-center gap-3 px-4 py-3 flex-shrink-0">
                <Input
                    ref={inputRef}
                    id="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your technical issue…"
                    disabled={isLoading}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60"
                />
                <Button
                    id="send-button"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="flex-shrink-0"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </Button>
            </Card>

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
