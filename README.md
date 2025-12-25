# Viet Phrases

A mobile-first web app for learning Vietnamese phrases on the go.

## Features

- Ask for any phrase in English, get Vietnamese + phonetic pronunciation
- Automatic saving and categorization
- "Show Large" mode for showing phrases to others
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
4. Deploy

## Usage

1. Type what you want to say in English
2. Get the Vietnamese phrase with pronunciation guide
3. Tap "Show Large" to display for someone to read
4. All phrases auto-save and are categorized
5. Tap the menu icon to browse saved phrases

## Roadmap

- [ ] Spaced repetition review
- [ ] Audio pronunciation
- [ ] Context-aware notifications
- [ ] Food photo tracking
- [ ] Multi-language support
