# Time Tracking Application

[![CI](https://github.com/PauloDevelo/time-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/PauloDevelo/time-tracker/actions/workflows/ci.yml)
[![Release](https://github.com/PauloDevelo/time-tracker/actions/workflows/release.yml/badge.svg)](https://github.com/PauloDevelo/time-tracker/actions/workflows/release.yml)

A full-stack time tracking application built with Angular, Node.js, Express, and MongoDB.

## Features

- Google OAuth 2.0 Authentication
- Customer Management
- Project Management
- Task Time Tracking
- Reporting System with PDF/Excel Export

## Tech Stack

- Frontend: Angular (latest stable version)
- Backend: Node.js with Express.js
- Database: MongoDB
- Authentication: Google OAuth 2.0

## Project Structure

```
time-tracking-app/
├── frontend/           # Angular frontend application
├── backend/           # Node.js/Express backend application
└── README.md         # Project documentation
```

## Prerequisites

- Node.js (v18.19 or higher)
- MongoDB (v6 or higher)
- Angular CLI
- Google Cloud Platform account for OAuth 2.0

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory with:
   ```
   API_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. Start the frontend development server:
   ```bash
   ng serve
   ```

## Development

- Backend runs on: http://localhost:3000
- Frontend runs on: http://localhost:4200

## API Documentation

API documentation is available at http://localhost:3000/api-docs when the backend server is running.

## Release Process

This project uses GitHub Actions for continuous integration and deployment.

### How to Create a Release

1. **Go to GitHub Actions** → Select "Release & Deploy" workflow
2. **Click "Run workflow"** and configure:
   - **Release type**: `patch` (0.1.0 → 0.1.1), `minor` (0.1.0 → 0.2.0), or `major` (0.1.0 → 1.0.0)
   - **Create official release**: Check this box to create a tagged release and deploy
3. **Wait for tests** to pass
4. **Approve the release** when prompted (you'll receive a notification)
5. The workflow will automatically:
   - Bump version numbers in package.json files
   - Update CHANGELOG.md
   - Create a git tag (e.g., `v0.2.0`)
   - Create a GitHub Release with release notes
   - Deploy to production server

### Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Deployment

The application is deployed to `https://timetracker.snpdnd.com` using a self-hosted GitHub Actions runner.

For server setup instructions, see [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md).

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.