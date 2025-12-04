# Zcash Philanthropy Platform - Frontend

This is the Next.js frontend for the Privacy-First Zcash Philanthropy Platform.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Privacy-First**: All donations use Zcash shielded addresses
- **TEE-Verified AI**: Chat with an AI agent running in a Trusted Execution Environment
- **Fundraiser Management**: Create and manage fundraisers with trust scores
- **Real-time Donations**: Live donation feed with privacy protection
- **Session Persistence**: Your session and preferences are saved locally

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components organized by feature
- `lib/` - Utilities, stores, API clients, and hooks
- `public/` - Static assets including tokens.json

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- TanStack Query (Server State)
- Shadcn/UI (Component Library)

