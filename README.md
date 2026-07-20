# Badminton Website

Build with TypeScript, Next.js

This project is based on the [BadminStar Website](https://www.badminstar.com/) from this [repo](https://github.com/tontong1412/badminton-pwa.git) with the goal of enhancing automation, maintainability, and reliability by:

- Migrating to TypeScript for improved type safety and developer experience.
- Implementing unit and end-to-end (e2e) testing to ensure code quality and robustness.
- Integrating GitHub Actions for CI/CD to streamline development workflows and automate testing and deployment.

## To run the project

The project is not yet connected to a fully developed backend service, as the [backend](https://github.com/tontong1412/badminton-service.git) also requires similar improvements in automation, maintainability, and reliability.

Therefore, this project can currently be run as a standalone website:

```bash
npm install
npm run dev
```

## Firebase Analytics (website traffic)

This project supports Firebase Analytics for traffic tracking in the Next.js App Router.

### 1) Set up Firebase and GA4

1. Create a Firebase project.
2. Add a Web App in Firebase Project Settings.
3. Enable Google Analytics integration and make sure a GA4 data stream is created.
4. Copy the Web App config values and place them in your local env file.

Use [.env.local.example](.env.local.example) as the template:

```bash
cp .env.local.example .env.local
```

Required variables:

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

### 2) Validate traffic events

1. Run `npm run dev`.
2. Open the site and navigate through multiple pages.
3. Open GA4 DebugView and verify `page_view` events are received.

If you see duplicate `page_view` events, disable the GA4 Enhanced Measurement option for browser history-based page changes.

## Test

The project is test with unit tests and end-to-end tests

### Unit tests

```bash
npm run test
```

### End-to-end tests

```bash
npm run dev # start the project before runing e2e test
npx cypress run
```

## CI/CD

The project has a GitHub Actions pipeline, which runs linting, test, and trigger deployment on Render at https://badminton-web.onrender.com/
