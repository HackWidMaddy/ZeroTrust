# 🔴 ZeroTrust - Advanced Red Team Simulation & C2 Framework

> **Next-Gen Red Team Command & Control Platform** | Educational Cybersecurity Training | Advanced Persistent Threat Simulation

[![License](https://img.shields.io/badge/License-Educational%20Use-red.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2014-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-73%25-blue.svg)](https://www.typescriptlang.org)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

---

## 🎯 Overview

**ZeroTrust** is a cutting-edge **Red Team Simulation Platform** and **Command & Control (C2) Framework** built with modern web technologies. Designed for advanced cybersecurity training, red team exercises, and blue team defensive posture validation.

This platform simulates real-world attack scenarios with a sophisticated authentication layer, role-based access control, and persistent threat simulation capabilities—all wrapped in a sleek, modern dark-themed interface.

```
┌─────────────────────────────────────────────────────────┐
│         🛡️  ZEROTRUST C2 FRAMEWORK  🛡️                 │
├─────────────────────────────────────────────────────────┤
│  ✦ Advanced Authentication Layer                        │
│  ✦ Multi-Role Access Control System                     │
│  ✦ Persistent Command Execution Pipeline                │
│  ✦ Real-Time Threat Simulation                          │
│  ✦ Secure Session Management                           │
│  ✦ Educational Red Team Training Suite                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 🔐 **Military-Grade Security Architecture**
- **Advanced Authentication**: MD5-hashed credential validation with secure comparison
- **Route Protection**: Middleware-enforced endpoint security
- **Session Hijacking Prevention**: SameSite=Strict cookie policies
- **Automatic Session Expiration**: 1-hour timeout with forced re-authentication

### 👥 **Role-Based Access Control (RBAC)**
Granular permission management across three security tiers:
- `administrator` - Full system access & configuration
- `user` - Standard access with limited privileges
- `tester` - Restricted red team simulation mode

### ⚙️ **C2 Framework Components**
- **Command Execution Pipeline**: Execute simulated red team commands
- **Persistent Agent Simulation**: Long-running threat actor behavior modeling
- **Real-Time Dashboard**: Live monitoring of active engagements
- **Threat Intelligence Integration**: Educational vulnerability mapping

### 🎨 **Modern UI/UX**
- Dark theme optimized for security operations centers
- Responsive design for multi-device access
- Real-time status indicators
- Clean, minimalist cybersecurity aesthetic

---

## ⚡ Quick Start

### Prerequisites
```bash
Node.js 18.0+
npm or yarn package manager
```

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/HackWidMaddy/ZeroTrust.git
   cd ZeroTrust
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Launch Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Platform**
   ```
   http://localhost:3000
   ```

---

## 🔑 Demo Credentials

| Username | Password | Role | Clearance |
|----------|----------|------|-----------|
| `admin` | `admin` | **Administrator** | Full System Access |
| `user` | `password` | **Standard User** | Limited Access |
| `test` | `test` | **Tester** | Red Team Mode |

> ⚠️ **IMPORTANT**: Change all default credentials immediately in production environments.

---

## 📊 Platform Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
├─────────────────────────────────────────────────────────┤
│  Login Form → Warning Dialog → Dashboard Interface      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              MIDDLEWARE LAYER                            │
├─────────────────────────────────────────────────────────┤
│  Route Protection → Authentication Verification         │
│  Session Validation → Cookie Management                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────┤
│  Dashboard Controller → User Management                 │
│  Role Enforcement → Activity Logging                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              DATA LAYER                                 │
├─────────────────────────────────────────────────────────┤
│  User Database (JSON) → MD5 Hash Validation            │
│  Session Store → Activity Logs                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ZeroTrust/
│
├── 📂 app/
│   ├── 📂 dashboard/
│   │   └── page.tsx              # Protected C2 Command Center
│   ├── 📂 utils/
│   │   └── md5.ts                # Cryptographic Hash Functions
│   ├── layout.tsx                # Root Layout Template
│   └── page.tsx                  # Authentication Gate
│
├── 📂 public/
│   └── users.json                # Credential Database
│
├── middleware.ts                 # Route Protection Engine
├── package.json                  # Dependencies & Scripts
└── README.md                      # Documentation
```

---

## 🔧 User Authentication Flow

```
1️⃣  USER ACCESS
    ↓
    Client navigates to http://localhost:3000
    Login form presented
    ↓
2️⃣  CREDENTIAL SUBMISSION
    ↓
    Username + Password entered
    Client-side MD5 hashing applied
    ↓
3️⃣  VALIDATION
    ↓
    Credentials compared against public/users.json
    Role extracted from validated entry
    ↓
4️⃣  WARNING DIALOG
    ↓
    Educational warning displayed
    User must acknowledge terms
    ↓
5️⃣  DASHBOARD ACCESS
    ↓
    Secure cookie set (SameSite=Strict)
    Session established (1-hour TTL)
    Middleware validates all subsequent requests
    ↓
6️⃣  PROTECTED OPERATIONS
    ↓
    User granted access based on role
    Real-time threat simulation available
```

---

## 🛡️ Security Implementation

### Password Protection
```typescript
// Passwords stored as MD5 hashes
// Example: "admin" → "21232f297a57a5a743894a0e4a801fc3"
```

### Secure Cookie Settings
```javascript
// SameSite=Strict prevents CSRF attacks
// Secure flag prevents interception over HTTP
// HttpOnly flag prevents JavaScript access
```

### Route Middleware
```typescript
// Validates authentication before route access
// Checks session expiration
// Enforces role-based permissions
```

---

## ⚙️ Configuration & Customization

### Add New User Accounts

Edit `public/users.json`:
```json
{
  "users": [
    {
      "username": "operator1",
      "password": "5f4dcc3b5aa765d61d8327deb882cf99",
      "role": "administrator"
    }
  ]
}
```

### Modify Warning Message

Update `app/page.tsx`:
```typescript
const warningMessage = "Your custom warning text here...";
```

### Extend Role System

Add new roles in authentication logic:
```typescript
type UserRole = 'administrator' | 'user' | 'tester' | 'operator';
```

### Customize Dashboard

Modify `app/dashboard/page.tsx` to add:
- Custom threat intelligence panels
- Real-time command execution logs
- Advanced reporting capabilities
- Threat actor behavior simulation

---

## 🚀 Advanced Features

### Session Management
- Automatic session timeout (1 hour)
- Forced re-authentication on timeout
- Real-time activity tracking
- Concurrent session limiting

### Activity Logging
- Comprehensive audit trails
- Timestamp-based event recording
- User action tracking
- Anomaly detection capabilities

### Threat Simulation
- Educational red team scenarios
- Blue team defense challenges
- Attack pattern replay
- Vulnerability training modules

---

## 🏗️ Building for Production

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Environment Configuration
Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com
SESSION_TIMEOUT=3600
ENABLE_LOGGING=true
```

---

## 📦 Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.x | Modern React Framework |
| **TypeScript** | 5.x | Type-Safe Development |
| **Tailwind CSS** | 4.x | Styling & UI Components |
| **crypto-js** | Latest | MD5 Hashing |
| **React Hooks** | 18.x | State Management |

---

## 🚨 Important Security Notes

⚠️ **EDUCATIONAL USE ONLY**

- This platform is designed exclusively for authorized cybersecurity training
- All red team activities must be conducted in authorized lab environments
- Unauthorized use is strictly prohibited by law
- Comply with all applicable cybersecurity and computer fraud regulations
- Obtain explicit written permission before security testing
- All activities are logged and may be monitored

### Ethical Guidelines
✓ Only test systems you own or have explicit permission to test  
✓ Never disrupt critical infrastructure  
✓ Report vulnerabilities responsibly  
✓ Follow organizational security policies  
✓ Maintain confidentiality of findings  

---

## 🤝 Contributing

Contributions welcome for educational improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

**Educational Purpose License**

This project is strictly for authorized cybersecurity training and educational purposes. Unauthorized access to computer systems is illegal. Users must ensure compliance with all applicable laws and regulations.

---

## 👨‍💻 Creator

**HackWidMaddy**  
Red Team Security Research | Cybersecurity Education  
🏆 NASA Hall of Fame | CVE Discoverer | TryHackMe Top 2%

Connect & Collaborate:
- 📧 madhav.shah24@spit.ac.in
- 🐙 [GitHub](https://github.com/HackWidMaddy)
- 🔗 [LinkedIn](https://linkedin.com/in/madhavshah)

---

## 🎓 Learning Resources

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Red Team Methodology](https://owasp.org)
- [Cybersecurity Training Labs](https://tryhackme.com)
- [Advanced Penetration Testing](https://www.offensive-security.com)

---

## 📞 Support & Issues

Found a bug? Have a suggestion?

- 🐛 [Report Issues](https://github.com/HackWidMaddy/ZeroTrust/issues)
- 💬 [Discussions](https://github.com/HackWidMaddy/ZeroTrust/discussions)
- 📧 Email: madhav.shah24@spit.ac.in

---

<div align="center">

### ⭐ If you found this project useful, give it a star!

**"In cybersecurity, there's no trust. Only verification."** 🔴

Built with 🖤 by the HackWidMaddy Community

</div>
