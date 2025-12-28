# Axiom Logging Setup Guide

This guide explains how to set up log persistence using Axiom and Vercel Log Drains.

## Prerequisites

Before you can build or deploy this application, you need to set up environment variables for Clerk authentication. See `.env.example` for all required variables.

**Important**: The application requires Clerk environment variables to build successfully. Make sure to set up a `.env.local` file (for local development) or configure environment variables in your deployment platform before building.

## Overview

Your application now logs all requests to `console.log` in structured JSON format. These logs are:
1. **Captured by Vercel** during runtime
2. **Sent to Axiom** via Log Drains
3. **Queryable** via the `/api/logs` endpoint

## Step 1: Create an Axiom Account

1. Go to [axiom.co](https://axiom.co) and sign up (free tier: 500GB/month)
2. Create a new dataset:
   - Click **"Datasets"** in the sidebar
   - Click **"New Dataset"**
   - Name it `viet-phrases-logs` (or your preferred name)
   - Click **"Create"**

## Step 2: Get Your Axiom API Token

1. In Axiom, click **Settings** (gear icon in sidebar)
2. Go to **API Tokens**
3. Click **"New Token"**
4. Configure the token:
   - **Name**: `vercel-log-drain`
   - **Permissions**: Select "Ingest" for your dataset
   - Click **"Create"**
5. **Copy the token** (you won't see it again!)

## Step 3: Configure Vercel Log Drain

### Option A: Using Vercel Dashboard

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Settings** → **Integrations** → **Log Drains**
3. Click **"Add Log Drain"**
4. Configure the drain:
   - **Log Drain Type**: Select **"Axiom"**
   - **Dataset**: Enter `viet-phrases-logs` (or your dataset name)
   - **API Token**: Paste your Axiom token
   - **Environment**: Select **"Production"** (or all environments)
5. Click **"Add Log Drain"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Add the log drain
vercel log-drains add axiom \\
  --token <YOUR_AXIOM_TOKEN> \\
  --dataset viet-phrases-logs
```

## Step 4: Set Environment Variables

Add these environment variables to your Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add the following:

```
AXIOM_TOKEN=<your-axiom-api-token>
AXIOM_DATASET=viet-phrases-logs
```

Make sure to add them for all environments (Production, Preview, Development).

## Step 5: Verify Setup

1. Deploy your application (or trigger a new deployment)
2. Make a few requests to your API endpoints
3. Check Axiom:
   - Go to your dataset in Axiom
   - You should see logs appearing with `type: "request"`
4. Test the query endpoint:
   ```bash
   # Query by IP
   curl "https://your-app.vercel.app/api/logs?ip=1.2.3.4&limit=10"

   # Query by user (sync key)
   curl "https://your-app.vercel.app/api/logs?user=mysynkey123&limit=10"

   # Query by time range (ISO 8601)
   curl "https://your-app.vercel.app/api/logs?startTime=2025-01-01T00:00:00Z&endTime=2025-01-02T00:00:00Z"
   ```

## Log Format

All request logs have this structure:

```json
{
  "type": "request",
  "timestamp": "2025-12-27T10:30:45.123Z",
  "method": "POST",
  "path": "/api/translate",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "mysynkey123",
  "status": 200,
  "duration": 1234,
  "error": "Translation failed"
}
```

## Querying Logs in Axiom

You can also query logs directly in Axiom's web interface:

### Find all requests from a specific IP:
```apl
['viet-phrases-logs']
| where type == "request" and ip == "192.168.1.1"
| order by _time desc
| limit 100
```

### Find all errors:
```apl
['viet-phrases-logs']
| where type == "request" and error != ""
| order by _time desc
| limit 100
```

### Find rate limit violations:
```apl
['viet-phrases-logs']
| where type == "request" and status == 429
| summarize count() by ip
| order by count_ desc
```

### Find slow requests:
```apl
['viet-phrases-logs']
| where type == "request" and duration > 2000
| order by duration desc
| limit 50
```

## Using the /api/logs Endpoint

Your application provides a convenient API endpoint to query logs:

### Query by IP Address
```bash
GET /api/logs?ip=192.168.1.1&limit=50
```

### Query by User (Sync Key)
```bash
GET /api/logs?user=mysynkey123&limit=100
```

### Query by Time Range
```bash
# Using ISO 8601 timestamps
GET /api/logs?startTime=2025-01-01T00:00:00Z&endTime=2025-01-02T00:00:00Z

# Or using milliseconds since epoch
GET /api/logs?startTime=1640000000000&endTime=1640086400000
```

## Tracking Abuse

With this setup, you can now:

1. **Identify abusive IPs**: Query logs by IP to see request patterns
2. **Monitor user behavior**: Track specific users via their sync keys
3. **Analyze errors**: Find which IPs/users are causing errors
4. **Track rate limits**: See who's hitting rate limits
5. **Performance monitoring**: Find slow requests and optimize

## Costs

Axiom's free tier includes:
- **500GB/month** of ingested logs
- **30 days** retention
- **Unlimited queries**

This should be more than enough for a personal project. If you exceed this, paid plans start at $25/month.

## Troubleshooting

### Logs not appearing in Axiom?
- Check that the Log Drain is enabled in Vercel
- Verify your Axiom token has "Ingest" permissions
- Wait a few minutes - there can be a slight delay
- Check Vercel's deployment logs for errors

### /api/logs returning empty results?
- Ensure `AXIOM_TOKEN` and `AXIOM_DATASET` environment variables are set
- Verify logs are actually in Axiom (check Axiom web interface)
- Check the query parameters are correct
- Look at Vercel function logs for error messages

### Performance issues?
- The logging itself has zero impact (console.log is non-blocking)
- The `/api/logs` endpoint does make external API calls to Axiom
- Consider caching frequently accessed queries if needed

## Additional Resources

- [Axiom Documentation](https://axiom.co/docs)
- [Vercel Log Drains Documentation](https://vercel.com/docs/observability/log-drains)
- [Axiom Processing Language (APL) Reference](https://axiom.co/docs/apl/introduction)
