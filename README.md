# Viet Phrases

A mobile-first web app for learning Vietnamese phrases on the go.

## Features

- Ask for any phrase in English, get Vietnamese + phonetic pronunciation
- Automatic saving and categorization
- "Show Large" mode for showing phrases to others
- Cross-device sync with shareable sync keys
- Offline-capable (saved phrases work without internet)
- PWA support - install on your phone's home screen

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd viet-phrases
npm install
```

### 2. Configure API key

Create a `.env.local` file in the root directory:

```
ANTHROPIC_API_KEY=your-api-key-here
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add `ANTHROPIC_API_KEY` as an environment variable in Vercel dashboard
4. Add Vercel KV storage:
   - Go to Storage tab in your Vercel project
   - Click "Create Database" → "KV"
   - Follow the setup wizard (free tier available)
   - KV environment variables will be automatically added to your project
5. Deploy

## Usage

1. Type what you want to say in English
2. Get the Vietnamese phrase with pronunciation guide
3. Tap "Show Large" to display for someone to read
4. All phrases auto-save and are categorized
5. Tap the menu icon to browse saved phrases
6. Tap the cloud icon to view your sync key and sync across devices:
   - Copy your sync key to share across your devices
   - Enter a sync key on a new device to load your phrases there
   - All changes sync automatically in the background

## Roadmap

- [ ] Spaced repetition review
- [ ] Audio pronunciation
- [ ] Context-aware notifications
- [ ] Food photo tracking
- [ ] Multi-language support
