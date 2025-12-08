<div align="center">
  <img src="https://github.com/user-attachments/assets/fccf99e5-df32-46b5-9cf6-b8684143132b" alt="ZSPA Logo" width="200"/>
  
  # 🛡️ Zcash Shielded Philanthropy Agent (ZSPA)
  
  **[Live Demo](https://zspa.vercel.app)**
  
  > **An AI agent that makes private philanthropy intelligent, effortless, and verifiable—all inside hardware enclaves.**

  [![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://zspa.vercel.app)
  [![TEE Verified](https://img.shields.io/badge/TEE-Verified-blue)]()
  [![Privacy First](https://img.shields.io/badge/Privacy-First-purple)]()

</div>

---

## 🎯 The Problem

Crypto philanthropy today suffers from three critical failures:

1. **Trust Blindness** — No way to verify which causes are legitimate
2. **Privacy Theatre** — Platforms expose donor identity, amounts, and patterns  
3. **UX Friction** — Manual research, bridging, and address verification (30+ minutes per donation)

---

## ⚡ Our Solution

Zcash Shielded Philanthropy Agent (ZSPA) is a **dual-TEE AI agent** that makes ZEC spending:

✅ **Intelligent** — 15-signal Trust Score Engine audits causes automatically  
✅ **Private** — All AI inference + execution inside hardware enclaves (NEAR AI GPU + Phala Cloud)  
✅ **Effortless** — Natural language ("Donate 5 ZEC to privacy NGOs in Africa") → autonomous discovery, auditing, and cross-chain routing  
✅ **Verifiable** — Every AI decision produces cryptographic proofs (request_hash, response_hash, ECDSA signatures)

---

## 🚀 How It Works (30-Second Flow)

**User:** *"Donate 5 ZEC to high-trust privacy projects in Africa"*

**Zcash Shielded Philanthropy Agent (ZSPA):**
1. 🔍 **Discovers** causes across multiple fundraisers
2. 🧠 **Audits** via 15-signal Trust Score Engine (on-chain: wallet stability, goal edits; off-chain: website scraping, social verification)
3. 📊 **Ranks** by trust (87/100), relevance, and impact
4. 🌉 **Routes** via NEAR Intent atomic swaps (ZEC → any token on any chain)
5. ✅ **Executes** privately from shielded z-address with zero donor correlation

**Result:** Recipient gets USDC on NEAR. Donor's ZEC stays shielded. **Total time: 2 minutes.**


---

## 🏗️ Architecture Highlights

### **Triple-Layer Privacy**

| Layer | Technology | Guarantee |
|-------|-----------|-----------|
| **AI Inference** | NEAR AI GPU TEE (H100 + Intel TDX) | Your prompts never leave hardware enclaves |
| **Backend Execution** | Phala Cloud confidential containers | All trust computations inside isolated TEE |
| **Financial Privacy** | ZEC shielded z-addresses + NEAR Intent swaps | Zero on-chain correlation between donor/recipient |

### **15-Signal Trust Score Engine**

**On-Chain Forensics (35%)**
- Wallet stability audits (>1 swap → -30 pts)
- Goal edit tracking (>2 edits → -20 pts)
- Image deduplication (-60 pts for duplicates)

**Off-Chain AI Reasoning (40%)**
- Website consistency checks (scraped via Playwright, validated by NEAR AI TEE)
- Update quality analysis (human-written, meaningful content)
- Social media verification (Twitter, Instagram, Facebook)

**Momentum Signals (15%)**
- Funding progress (75-95% gets priority)
- Recency bonus (created within 60 days)

**Visual Content (10%)**
- Unique update images (≥3 unique images → +5% per image)

**Example Output:**
```json
{
  "trust_score": 87,
  "flags": [
    "✅ Verified: Website matches description",
    "✅ Verified: 3 quality updates (+0.30)",
    "⚠️ Penalty: Goal changed 1 time"
  ]
}
```

---

## 🌉 Cross-Chain Magic

**The Problem:** Donor has ZEC. Recipient needs USDC on NEAR.

**Traditional Approach:** 8 steps, 30+ minutes, $50 gas fees.

**Zcash Shielded Philanthropy Agent (ZSPA) Approach:**
1. User sends ZEC from **shielded z-address** to temporary deposit address
2. NEAR Intent executes **atomic swap** (ZEC → USDC)
3. USDC automatically routed to recipient on NEAR
4. **Zero on-chain correlation** between donor/recipient

**Supported:** Multiple chains (NEAR, Ethereum, Arbitrum, Solana) × multiple tokens (USDC, ETH, SOL, and many more)

---

## 🔐 Cryptographic Verification

Every AI call produces:
```json
{
  "request_hash": "0x4f8a...",  // SHA-256 of your prompt
  "response_hash": "0x9d2b...", // SHA-256 of AI output
  "signature": "0x1a3f...",     // ECDSA signature from TEE
  "verified": true
}
```

**At startup**, ZSPA verifies:
- ✅ NEAR AI's Intel TDX quote
- ✅ NVIDIA H100 GPU attestation
- ✅ Signing address bound to TEE model

**Result:** Cryptographically provable that your prompts never left hardware enclaves.

---

## 📊 Demo Scenario

**Alice (ZEC holder):** *"I want to donate 5 ZEC to a trusted privacy project in Africa"*

**ZSPA Response:**
```
Found 3 strong matches:

1. Digital Rights Foundation (Trust: 91/100)
   📍 Nigeria | 🔒 Privacy & Security
   ✅ Verified website, 4 quality updates, valid Twitter

2. Kenya Privacy Coalition (Trust: 84/100)
   📍 Kenya | 🔒 Privacy & Advocacy
   ✅ Consistent updates, social verified

3. African Crypto Educators (Trust: 79/100)
   📍 Ghana | 📚 Privacy Education
   ⚠️ Early-stage (fewer updates)
```

**Alice:** *"Donate to African Crypto Educators"*

**ZSPA:** 
```
Perfect! Routing 5 ZEC → USDC on NEAR

Send to: t1temp... [QR CODE]
Refunds: zs1alice... ✅ Privacy maintained
```

**2 minutes later:**
```
✅ Ghana Educators received 125.2 USDC
🎉 Donation complete! Zero identity leakage ✅
```

---

## 🏆 Why This Wins

**Hackathon Requirements:** Build an AI agent that spends ZEC wisely and privately using verifiable TEE inference.

**ZSPA Delivery:**

| **Hackathon Criteria** | **ZSPA Implementation** |
|------------------------|------------------------|
| Verifiable TEE inference | ✅ Dual-TEE architecture with cryptographic proofs |
| Spend ZEC wisely | ✅ 15-signal Trust Score Engine + AI risk assessment |
| Spend ZEC privately | ✅ Shielded z-addresses + cross-chain obfuscation |
| Agentic behavior | ✅ Autonomous discovery, auditing, routing |
| Natural language | ✅ Full conversational AI interface |
| Cross-chain spending | ✅ ZEC → multiple chains via NEAR Intent atomic swaps |

### **Real-World Impact**
- **For donors:** Removes "paralysis by analysis" → confident giving
- **For fundraisers:** Cross-chain flexibility → receive usable currencies (USDC for expenses)
- **For privacy advocates:** Proves privacy + usability aren't mutually exclusive

---

## 🛠️ Built With

- **NEAR AI Cloud** — GPU TEE inference (NVIDIA H100 + Intel TDX)
- **Shade Agent (Phala Network)** — Confidential container execution
- **Zcash** — Shielded z-address privacy
- **NEAR Intent (1-click)** — Cross-chain atomic swaps
- **LangGraph** — Agentic AI orchestration
- **FastAPI** — Backend API
- **Next.js** — Frontend interface


---

## 📚 Deep Dive Documentation

Want the full technical details?

- 📖 [Architecture Deep Dive](./ARCHITECTURE.md) — TEE attestation flow, trust score computation, cross-chain routing mechanics

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- NEAR AI API key
- Phala Cloud credentials
- Zcash node access

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zspa
cd zspa

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
docker build -t zspa .

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the application
npm run dev  # Frontend (port 3000)
sudo docker run --env-file .env  -d  -p 8000:8000   -v $(pwd)/state_db:/app/state_db   --name zspa zspa   # Backend (port 8000)
```

Visit `http://localhost:3000` to start using ZSPA locally.

---

<div align="center">

> *"Privacy without wisdom is reckless. Wisdom without privacy is oppression. ZSPA delivers both."*

**Built with 🛡️ for the Zcash Community**

[Live Demo](https://zspa.vercel.app) • [Documentation](./ARCHITECTURE.md) • [Report Issue](https://github.com/yourusername/zspa/issues)

</div>