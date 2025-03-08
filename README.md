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
