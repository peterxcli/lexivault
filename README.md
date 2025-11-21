# LexiVault

A modern dictionary application that persists your vocabulary lookup history to GitHub Issues with built-in spaced repetition review.

## Features

- **Dictionary Search**: Look up word definitions using the Free Dictionary API
- **GitHub Sync**: Save words to GitHub Issues for persistent storage
- **Spaced Repetition**: Smart flashcard review system that prioritizes older and less-mastered words
- **Beautiful UI**: Modern, responsive design with Tailwind CSS
- **Audio Pronunciation**: Listen to word pronunciations

## How It Works

LexiVault uses GitHub Issues as a backend to store your vocabulary words. Each word is saved as an issue with the `lexivault` label, and includes metadata to track your review progress.

## Setup

1. Create a GitHub repository to store your vocabulary
2. Generate a Personal Access Token with `repo` scope
3. Configure LexiVault with your token, username, and repository name
4. Start searching and saving words!

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Technologies

- React 18
- Vite
- Tailwind CSS
- Lucide Icons
- GitHub API

## License

MIT
