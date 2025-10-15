# Aurora Energy Flow - Documentation

This folder contains consolidated documentation for the Aurora Energy Flow project.

## Project Overview

Aurora Energy Flow is a comprehensive energy management system for Kenya, supporting both KPLC (Kenya Power) and solar energy systems.

## Key Features

- Real-time energy monitoring
- SMS/USSD integration for KPLC
- Solar system tracking
- Energy insights and analytics
- Mobile-responsive dashboard
- Multi-provider support (KPLC, Solar, Hybrid)

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run migrations: `supabase db push`
5. Start development server: `npm run dev`

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, etc.)
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # API services
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

supabase/
├── functions/      # Edge functions
└── migrations/     # Database migrations
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `supabase start` - Start local Supabase
- `supabase db push` - Apply migrations

## Deployment

The project is configured for deployment on:
- **Frontend**: Vercel
- **Backend**: Supabase Cloud
- **Proxy**: Render/Railway (for KPLC integration)

See individual deployment guides in this docs folder for detailed instructions.