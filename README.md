# qna test performance bot

Automates creation of interview sessions and simulates candidate flow in the qna platform using:
- Axios (create interview via public endpoint)
- Puppeteer (navigate QnA / FTQ / MCQ / Video sections)
- Concurrency (multiple workers + attempts)

## Features
- Random test candidate identity (name, phone, email)
- Form data submission with required IDs
- Section navigation & simple answer filling (FTQ random words, MCQ fixed “A”)
- Configurable parallel workers and attempts
- Basic throttling (staggered worker starts)
- Graceful logging of failures

## Requirements
- Node.js 18+
- Chrome dependencies (Puppeteer downloads Chromium automatically)
- Valid platform endpoint + credentials (IDs & codes)

## Installation
```bash
npm install
