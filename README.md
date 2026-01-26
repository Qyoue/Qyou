# Qyou

**Qyou** is an open-source, crowd-powered queuing intelligence platform that helps people avoid long lines at real-world locations like banks, hospitals, fuel stations, government offices, and service centers.

By allowing users to report and view real-time wait times, **Qyou** turns everyday queuing into shared public data. Built on **Stellar**, the platform adds a lightweight trust, rewards, and incentives layer—encouraging honest reporting and enabling new queue-based micro-economies.

---

## Why Qyou?

Queues waste time, energy, and productivity—especially in high-traffic public services. Yet queue information is usually invisible until you arrive.

Qyou makes wait times _visible before you commit_.

With Qyou, users can:

- Check real-time queue conditions before leaving home
- Decide the best time to visit a location
- Earn rewards for contributing accurate queue data
- Hire or become a **queue buddy**—someone who holds a spot in line on your behalf

By combining crowd-sourced data with blockchain-backed incentives, Qyou creates a system where truthful reporting is rewarded and time is treated as a valuable resource.

---

## Core Features

- **Real-Time Queue Reporting** – Users submit live wait-time updates at locations
- **Crowd Verification** – Multiple reports improve accuracy and confidence
- **Queue Discovery** – View nearby locations and their current wait times
- **Queue Buddies** – Hire trusted users to hold a spot in line for you
- **Stellar-Powered Rewards** – Earn tokens for verified reports and services
- **Reputation & Trust** – On-chain signals back honest contributors
- **Mobile-First Experience** – Designed for fast, on-the-go reporting

---

## Architecture Overview

Qyou is designed as a scalable monorepo with clear separation between user experience, core logic, and blockchain integration.

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| **Mobile App**  | React Native (Expo)                 |
| **Admin Web**   | Next.js (React)                     |
| **Backend API** | Node.js (Express Modular Monolith)  |
| **Database**    | MongoDB                             |
| **Blockchain**  | **Stellar**                         |
| **Payments**    | Stellar micro-payments & incentives |
| **Auth**        | Token-based auth                    |

---

## Monorepo Structure

The monorepo structure enables rapid iteration while keeping responsibilities isolated:

```text
Qyou/
├── apps/
│   ├── mobile/              # User-facing Mobile App (Expo)
│   ├── admin-web/           # Admin Dashboard (Next.js)
│   └── api/                 # Backend API (Express)
├── libs/
│   ├── config/              # Shared configuration
│   ├── logger/              # Shared logging utilities
│   └── types/               # Shared TypeScript interfaces
├── stellar/
│   ├── client/              # Stellar SDK & interaction scripts
│   └── contracts/           # Soroban Smart Contracts (Future)
├── .env                     # Environment variables
├── package.json             # Workspaces configuration
└── README.md

```

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (Running locally or via Atlas)
- **Stellar Testnet Account** (Optional for reading ledger)

### 1. Installation

Clone the repository and install all dependencies from the root:

```bash
git clone [https://github.com/qyoue/qyou.git](https://github.com/qyoue/qyou.git)
cd Qyou
npm install

```

### 2. Configuration

Create a `.env` file in the root directory (copy from `.env.example` if available):

```bash
# API Config
API_PORT=4000
MONGO_URI=mongodb://localhost:27017/qyou

# Stellar Config
STELLAR_NETWORK=TESTNET

```

### 3. Run Locally (The "All-in-One" Command)

Start the Mobile App, Admin Web, and Backend API simultaneously:

```bash
npm run dev

```

- **API:** [http://localhost:4000/health](https://www.google.com/search?q=http://localhost:4000/health)
- **Admin Web:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
- **Mobile:** Scan the QR code in the terminal with the Expo Go app.

### 4. Test Stellar Connection

To verify the Stellar blockchain integration is working:

```bash
cd stellar/client
npm run test-net

```

---

## API Highlights

### Queues

- `POST /queues/report` – Submit a wait-time report
- `GET /queues/nearby` – Discover queues around a location
- `GET /queues/:id` – View aggregated queue details

### Queue Buddies

- `POST /buddies/request` – Hire a queue buddy
- `POST /buddies/accept` – Accept a queue task
- `GET /buddies/:id` – Track queue-holding progress

### Rewards (Stellar)

- `POST /rewards/claim` – Claim earned rewards
- `GET /rewards/balance` – View reward balance

---

## Blockchain Layer

Qyou uses **Stellar** to:

- Distribute micro-rewards for verified reports
- Power queue buddy payments
- Anchor reputation signals and trust scores

---

## Contributing

Qyou is open-source and community-driven. Contributions are welcome across frontend, backend, blockchain, data aggregation, and UX.

### How to Contribute

1. Fork the repository
2. Create a branch from `main`
3. Pick an issue or propose a new feature
4. Keep PRs focused and well-documented
5. Open a pull request with context and screenshots

---

## 💬 Community & Support

For questions, feature discussions, or collaboration:

👉 Telegram: [https://t.me/+gRA3CdyekZw3MWM0](https://t.me/+gRA3CdyekZw3MWM0)

---

## 📄 License

MIT License
