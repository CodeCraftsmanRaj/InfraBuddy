import { useState } from "react"
import {
    Cloud, Shield, Mail, HardDrive,
    ChevronDown, ChevronRight, ExternalLink,
    BookOpen, CheckCircle2, AlertCircle, Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GuideSection {
    id: string
    icon: React.ReactNode
    color: string
    title: string
    subtitle: string
    steps: string[]
    tips?: string[]
    warnings?: string[]
}

const GUIDES: GuideSection[] = [
    {
        id: "onedrive-sharing",
        icon: <Cloud className="w-5 h-5" />,
        color: "text-sky-400",
        title: "Share Files or Remove Access on OneDrive",
        subtitle: "How to share files with external users or revoke their access",
        steps: [
            "Open OneDrive on the web (onedrive.live.com or your organisation's SharePoint).",
            "Right-click (or select) the file or folder you want to share.",
            "Click **Share** → **Copy link** or enter the person's email address directly.",
            "Set the permission level: **Can view** (read-only) or **Can edit** (full access).",
            "For external users, choose **Specific people** and type their full external email address.",
            "Click **Send** to share or **Apply** to update permissions.",
            "To remove access: right-click the file → **Manage access** → find the person → click **Remove**.",
        ],
        tips: [
            "Use 'Anyone with the link' only for non-sensitive documents.",
            "Set an expiry date on shared links to auto-revoke access after a set period.",
            "Check 'Manage Access' regularly to audit who can view your files.",
        ],
        warnings: [
            "Sharing directly from File Explorer may not give you the same permission controls as the web.",
        ],
    },
    {
        id: "authenticator",
        icon: <Shield className="w-5 h-5" />,
        color: "text-violet-400",
        title: "Microsoft Authenticator Setup",
        subtitle: "Set up two-factor authentication (2FA) on your account",
        steps: [
            "Install the **Microsoft Authenticator** app from the App Store or Google Play.",
            "On a computer, go to **aka.ms/mfasetup** and sign in with your work account.",
            "Click **Add sign-in method** → choose **Authenticator app** → click **Add**.",
            "Open the Authenticator app on your phone and tap the **+** button → **Work or school account**.",
            "Scan the QR code shown on your computer screen.",
            "A 6-digit code will appear in the app — enter it on the web to verify.",
            "Click **Done**. From now on, you'll be prompted in the app when signing in.",
        ],
        tips: [
            "Enable phone number backup in the app settings so you can recover if you change devices.",
            "You can add multiple accounts to one Authenticator app.",
        ],
        warnings: [
            "If you get a push notification you didn't initiate, tap **Deny** — it may be an unauthorized login attempt.",
        ],
    },
    {
        id: "outlook-sync",
        icon: <Mail className="w-5 h-5" />,
        color: "text-teal-400",
        title: "Outlook Email Not Syncing or Won't Open",
        subtitle: "Troubleshoot common Outlook connection and launch issues",
        steps: [
            "Check your internet connection — Outlook requires a stable connection.",
            "Close Outlook completely (check Task Manager: **Ctrl+Shift+Esc** → find OUTLOOK.EXE → End Task).",
            "Reopen Outlook and wait 2–3 minutes for sync to complete.",
            "Go to **File** → **Account Settings** → **Account Settings** → repair or update your account.",
            "Clear the Outlook cache: close Outlook, press **Win+R**, type `%localappdata%\\Microsoft\\Outlook`, delete the **.OST** file (Outlook will rebuild it).",
            "If Outlook won't open at all, try: **Win+R** → type `outlook.exe /safe` to start in Safe Mode.",
            "As a last resort, use **Control Panel** → **Programs** → **Office** → **Quick Repair**.",
        ],
        tips: [
            "If you're on a slow connection, reduce the Outlook sync window: File → Account Settings → Change → set 'Mail to keep offline' to 3 months.",
            "Enable Cached Exchange Mode for better offline performance.",
        ],
        warnings: [
            "Deleting the .OST file will cause Outlook to re-download all your emails — this may take time on large mailboxes.",
        ],
    },
    {
        id: "onedrive-windows",
        icon: <HardDrive className="w-5 h-5" />,
        color: "text-amber-400",
        title: "Understanding OneDrive in Windows",
        subtitle: "What OneDrive does, where files are stored, and how sync works",
        steps: [
            "OneDrive is a cloud storage service built into Windows — your **Documents, Desktop, and Pictures** folders may be synced automatically.",
            "A **blue cloud icon** (☁️) next to a file means it's online-only (not downloaded).",
            "A **green tick** means the file is synced and available offline.",
            "To make a file available offline: right-click it → **Always keep on this device**.",
            "To free up space: right-click → **Free up space** (moves the file to cloud-only).",
            "The OneDrive icon lives in the system tray (bottom-right). Click it to see sync status or open Settings.",
            "Pause sync: click the OneDrive tray icon → **Pause syncing** → choose duration.",
        ],
        tips: [
            "If your Desktop seems empty after signing in on a new machine, check OneDrive — your items may be there.",
            "You can choose which folders sync: OneDrive tray icon → Settings → Account → Choose folders.",
            "Storage limit: standard accounts have 1 TB via Microsoft 365.",
        ],
        warnings: [
            "Moving files out of synced folders will remove them from OneDrive — other devices won't see them.",
            "If OneDrive is full, new files won't sync and you'll get 'storage full' errors.",
        ],
    },
]

function GuideCard({ guide }: { guide: GuideSection }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="guide-card rounded-xl overflow-hidden">
            {/* Header */}
            <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => setExpanded((p) => !p)}
            >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", expanded ? "gradient-primary" : "bg-muted/60")}>
                    <span className={expanded ? "text-white" : guide.color}>{guide.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-sm", expanded && "text-gradient")}>{guide.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{guide.subtitle}</p>
                </div>
                <div className={cn("transition-transform duration-200", expanded && "rotate-180")}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
            </button>

            {/* Body */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4 animate-slide-up">
                    <div className="border-t border-border/40 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Steps
                        </p>
                        <ol className="space-y-2">
                            {guide.steps.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm">
                                    <span className={cn("flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5", guide.color, "bg-current/10")}>
                                        {i + 1}
                                    </span>
                                    <span
                                        className="text-foreground/90 leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>'),
                                        }}
                                    />
                                </li>
                            ))}
                        </ol>
                    </div>

                    {guide.tips && (
                        <div className="rounded-lg bg-primary/8 border border-primary/20 p-3 space-y-1.5">
                            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" /> Tips
                            </p>
                            <ul className="space-y-1">
                                {guide.tips.map((tip, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                        <ChevronRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {guide.warnings && (
                        <div className="rounded-lg bg-destructive/8 border border-destructive/20 p-3 space-y-1.5">
                            <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Watch out
                            </p>
                            <ul className="space-y-1">
                                {guide.warnings.map((w, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                        <ChevronRight className="w-3 h-3 mt-0.5 text-destructive flex-shrink-0" />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function UserGuide() {
    return (
        <div className="flex-1 overflow-y-auto">
            {/* Hero */}
            <div className="px-1 pt-2 pb-5">
                <div className="glass-strong rounded-2xl px-5 py-5 mb-5 relative overflow-hidden">
                    <div className="absolute inset-0 gradient-primary opacity-5 pointer-events-none" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                            <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gradient">InfraBuddy User Guide</h2>
                            <p className="text-xs text-muted-foreground">IT knowledge base — quick self-service help</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Browse the guides below to resolve common IT issues on your own before raising a ticket.
                        Click any card to expand step-by-step instructions.
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                        <ExternalLink className="w-3 h-3" />
                        <span>Guides sourced from the InfraBuddy internal documentation library</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {GUIDES.map((guide) => (
                        <GuideCard key={guide.id} guide={guide} />
                    ))}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6 pb-2">
                    Can't find what you need?{" "}
                    <button
                        className="text-primary hover:underline"
                        onClick={() => {
                            // This triggers switching back to chat tab
                            document.dispatchEvent(new CustomEvent("infrabuddy:switch-tab", { detail: "chat" }))
                        }}
                    >
                        Ask InfraBuddy in the chat →
                    </button>
                </p>
            </div>
        </div>
    )
}
