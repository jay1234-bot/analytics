# Statify: Spotify Analytics Web App

Statify is a premium, modern Spotify Analytics platform inspired by stats.fm. Discover your top artists, tracks, unique genres, and share your music personality with beautiful exportable cards.

## Prerequisites
- Node.js v18+
- Docker & Docker Compose
- A Spotify Developer account (for Client ID & Secret)

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://admin:password@localhost:5432/spotify_analytics?schema=public"
JWT_SECRET="super-secret-jwt-key"
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
SPOTIFY_REDIRECT_URI="http://localhost:5000/auth/callback"
FRONTEND_URL="http://localhost:3000"
```

### Spotify Developer Dashboard
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an App.
3. Add `http://localhost:5000/auth/callback` to the Redirect URIs.
4. Copy your Client ID and Client Secret to the backend `.env`.

## Setup & Running

1. **Start the Database**
   In the root directory, start PostgreSQL using Docker:
   ```bash
   docker-compose up -d
   ```

2. **Run the Backend**
   ```bash
   cd backend
   npm install
   npx prisma db push
   npx nodemon src/index.ts
   ```

3. **Run the Frontend**
   ```bash
   cd web
   npm run dev
   ```

## Architecture
- **Frontend**: Next.js 15, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, html2canvas.
- **Backend**: Express, TypeScript, Prisma ORM, PostgreSQL, JWT Authentication.
