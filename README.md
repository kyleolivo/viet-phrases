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
4. Add Redis storage from Marketplace:
   - Go to Marketplace in your Vercel dashboard
   - Search for and add Redis
   - Connect it to your project
   - Redis environment variables (REDIS_URL) will be automatically added
5. Deploy
6. (Optional) To test locally:
   - Run `vercel link` to link your local project
   - Run `vercel env pull .env.development.local` to get environment variables

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
