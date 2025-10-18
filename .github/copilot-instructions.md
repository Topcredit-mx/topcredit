# Project Overview

Next.js Web Application with Drizzle ORM and Tailwind CSS + NextAuth Integration with OTP and TOTP. We use Biome for linting. Its a Credit application Management System. it supports multiple user roles with different access levels. The readme.md file provides instruction on whats implemented and what's next to be done.

## Coding Standards

- When developing a new feature
  1. Create a cypress e2e test file to cover the feature.
  2. Run the test to see it fail.
  3. Implement the feature.
    3.1. use form actions for handling form submissions.
    3.2. use server components where possible.
    3.3. avoid useEffects unless absolutely necessary.
    3.4. use /server/queries for data fetching.
    3.5. use /server/mutations for server actions/mutations.
    3.6 never use drizzle db in pages, keep those in /server/queries and /server/mutations only.
    3.7 use shadcn/ui and tailwind components for UI consistency. use the shadcn/ui commands to generate components if needed.
    3.8 use biome formatting and linting.
    3.9 use pnpm for package management.
    3.10 all texts should be in spanish.
  4. Run the test to see it pass.
- Use single quotes for strings.
- Use function based components in React.
- Use arrow functions for callbacks.

## UI guidelines

- A toggle is provided to switch between light and dark mode.
- Application should have a modern and clean design.