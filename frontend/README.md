# CantoMeet Notes - Frontend

Production-ready React frontend for CantoMeet Notes, migrated from AI Studio prototype.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **React Router v6** - Routing
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **Lucide React** - Icons

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install Tailwind CSS Plugin

```bash
npm install -D tailwindcss-animate
```

### 3. Install Shadcn/UI Components

```bash
# Initialize Shadcn/UI (if not done already)
npx shadcn@latest init

# Install base components
npx shadcn@latest add button input dialog select badge card dropdown
```

### 4. Create Environment File

Create `.env.local` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENABLE_MOCK_API=true
VITE_ENABLE_DEV_TOOLS=true
VITE_APP_NAME=CantoMeet Notes
VITE_APP_VERSION=1.0.0
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn/UI components
│   │   ├── layout/       # Layout components (Sidebar, etc.)
│   │   └── shared/       # Shared components (ErrorBoundary, etc.)
│   ├── pages/            # Route pages
│   ├── layouts/          # Layout wrappers
│   ├── context/          # React Context providers
│   ├── services/         # API services
│   │   ├── api/         # API clients
│   │   └── mock/        # Mock API (MSW)
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript definitions
│   └── lib/             # Utilities & constants
├── public/              # Static assets
└── package.json
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier (to be configured)
- Absolute imports via `@/` alias

## Migration Status

✅ **Phase 1: Project Setup** - Complete
- Vite + React + TypeScript configured
- Dependencies installed
- Tailwind CSS configured
- Folder structure created

✅ **Phase 2: Core Infrastructure** - In Progress
- ✅ Type definitions split into domain files
- ✅ API client with interceptors
- ✅ React Router setup
- ✅ AuthContext created
- ✅ Error boundaries
- ⏳ Mock API layer (MSW) - Pending
- ⏳ Custom hooks - Pending

⏳ **Phase 3-7: Component Migration** - Pending

## Next Steps

1. Complete Shadcn/UI component installation
2. Set up Mock Service Worker (MSW) for development
3. Create custom hooks (useMeetings, useTasks, etc.)
4. Migrate components from `data/meetingmind-hk`
5. Connect to backend API

## Notes

- All pages are currently placeholder stubs
- Authentication is mocked (needs backend integration)
- API services are ready but need backend endpoints
- See `MIGRATION_BLUEPRINT.md` for detailed migration plan

