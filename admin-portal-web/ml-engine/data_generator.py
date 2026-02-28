"""
ML Data Generator
Generates a realistic 1,200-row synthetic dataset of technical support issues
labelled as L1 (Basic), L2 (Intermediate), or L3 (Critical).
"""

import pandas as pd
import random
import os

# ---------------------------------------------------------------------------
# Seed phrases per severity level
# ---------------------------------------------------------------------------

L1_TEMPLATES = [
    "Cannot connect to WiFi on {device}",
    "Need to reset my password for {app}",
    "Printer {model} not found on network",
    "Screen brightness issue on {device}",
    "Keyboard shortcut not working in {app}",
    "Mouse cursor freezing on {os}",
    "Sound not working after {os} update",
    "Unable to open {app} application",
    "How to set up email on {device}",
    "USB drive not recognised on {os}",
    "Desktop icons disappeared on {os}",
    "Cannot find downloaded file on {device}",
    "Browser home page changed unexpectedly",
    "Antivirus subscription expired notification",
    "How to enable dark mode in {app}",
    "Battery draining fast on {device}",
    "How to share screen in {app}",
    "Clock showing wrong time on {os}",
    "Cannot copy-paste between applications",
    "Touchpad sensitivity too high on {device}",
    "Webcam not detected by {app}",
    "How to clear cache in {app}",
    "Auto-update popup keeps appearing",
    "Cannot add {app} to startup programs",
    "File extension not opening correctly",
]

L2_TEMPLATES = [
    "VPN disconnects intermittently on {os}",
    "Group policy update broke {app} on {os}",
    "Active Directory user cannot authenticate",
    "SSL certificate error on internal portal",
    "DHCP server not assigning IP to {device}",
    "{app} crashing after {os} 22H2 upgrade",
    "Cannot map network drive on {device}",
    "Remote desktop connection unstable on {os}",
    "Software deployment via SCCM failing for {app}",
    "Office 365 licence sync issue for user",
    "SharePoint permissions error for department folder",
    "BitLocker recovery key required on {device}",
    "Outlook calendar not syncing with Exchange",
    "Teams meeting audio echo for remote users",
    "Hyper-V virtual machine not starting",
    "Python script throwing ModuleNotFoundError for {app}",
    "Docker container exits immediately with code 137",
    "IIS application pool crashing on {os}",
    "Firewall blocking outbound SMTP on port 587",
    "DNS resolution failing for internal subdomain",
    "RAID 5 array degraded after disk replacement",
    "GPO not applying to new OU computers",
    "Network printer queue stuck with 50 jobs",
    "{app} API returning 403 on authenticated endpoint",
    "OneDrive sync conflict for large project folder",
]

L3_TEMPLATES = [
    "Blue screen of death IRQL_NOT_LESS_OR_EQUAL on {device}",
    "RAID controller failure — data inaccessible",
    "SQL Server database corruption on production",
    "Kernel panic — not syncing on Ubuntu {os}",
    "Ransomware encrypted files on file server",
    "Active Directory forest root compromise suspected",
    "vSphere ESXi host unresponsive — VMs down",
    "Storage array showing multiple failed disks",
    "Production API latency spike 3000ms+ — revenue impact",
    "Critical vulnerability CVE patching failure on {os}",
    "Backup job failing — all restore points corrupted",
    "Hardware RAID battery failure — cache disabled",
    "Network switch loop causing broadcast storm",
    "PostgreSQL WAL archiving lag — replication broken",
    "Memory leak in .NET service causing OOM crash",
    "Exchange server mail queue backing up — 10k items",
    "Certificate authority root cert expired — PKI broken",
    "Docker swarm orchestration node split-brain",
    "Kubernetes pod CrashLoopBackOff — all replicas down",
    "Production database migration failed — rollback needed",
    "Firewall rule misconfig — internal network exposed",
    "Hypervisor host overcommit — all VMs paused",
    "SAN multipath failure — single path remaining",
    "ERP system unresponsive — 500 users affected",
    "Data centre cooling failure — thermal shutdown risk",
]

DEVICES = ["laptop", "desktop", "workstation", "MacBook", "Surface Pro", "ThinkPad"]
APPS = ["Teams", "Outlook", "Chrome", "Zoom", "Slack", "VS Code", "SAP", "ServiceNow"]
OS_LIST = ["Windows 11", "Windows 10", "Ubuntu 22.04", "macOS Sonoma", "RHEL 9"]
MODELS = ["HP LaserJet", "Canon iR", "Epson L3110", "Brother DCP"]

LABEL_CONFIGS = {
    "L1": (L1_TEMPLATES, 500),
    "L2": (L2_TEMPLATES, 400),
    "L3": (L3_TEMPLATES, 300),
}


def fill_template(template: str) -> str:
    return (
        template
        .replace("{device}", random.choice(DEVICES))
        .replace("{app}", random.choice(APPS))
        .replace("{os}", random.choice(OS_LIST))
        .replace("{model}", random.choice(MODELS))
    )


def generate_data() -> pd.DataFrame:
    rows = []
    for label, (templates, count) in LABEL_CONFIGS.items():
        for _ in range(count):
            template = random.choice(templates)
            text = fill_template(template)
            rows.append({"text": text, "label": label})

    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    return df


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    df = generate_data()
    output_path = "data/synthetic_tickets.csv"
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} rows to {output_path}")
    print(df["label"].value_counts().to_string())
