# Project Overview

Next.js Web Application with Drizzle ORM and Tailwind CSS + NextAuth Integration with OTP and TOTP. We use Biome for linting. Its a Credit application Management System. it supports multiple user roles with different access levels. The readme.md file provides instruction on whats implemented and what's next to be done.

## Coding Standards

- When developing a new feature
  1. Create a cypress e2e test file to cover the feature.
    1.1 should cover happy path and some edge cases. not all cases are needed. the rest will can be mentioned in comments as future tests.
    1.2 create tasks in cypress/tasks for any db related calls if needed, mainly for setting up data for the test.
    1.3 use before, after, beforeEach, afterEach hooks for setup and teardown correctly.
    1.4 should be written in english.
    1.5 dont use data-testid attributes, use role, label, text content, etc.
    1.6 use should assertions.
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