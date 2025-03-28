# GitHub Actions Workflow Dashboard

A real-time dashboard for monitoring GitHub Actions workflow runs across multiple repositories.

## Features

- Real-time monitoring of GitHub Actions workflows
- Support for multiple repositories
- Automatic updates every minute (server-side)
- Real-time UI updates every 30 seconds
- Dark theme interface
- Search functionality for repositories
- Manual refresh option

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   GITHUB_TOKEN=your_github_token
   GITHUB_REPOSITORIES=owner/repo1,owner/repo2
   CRON_SECRET=your_cron_secret
   MONGODB_URI=your_mongodb_uri
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Architecture

- Server-side cron job updates data from GitHub every minute
- Client-side updates from MongoDB every 30 seconds
- MongoDB for data persistence
- Next.js for the frontend

## License

MIT
