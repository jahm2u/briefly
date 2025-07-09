# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🗺️ Key Documentation References

- **Application Architecture**: `/docs/ARCHITECTURE.md` - NestJS clean architecture overview
- **Claude CLI Integration**: `/docs/CLAUDE_CLI_INTEGRATION.md` 🤖 - Telegram bot integration
- **Development Commands**: See below for common commands
- **API Endpoints**: `/docs/API_ENDPOINTS.md` - HTTP endpoints reference
- **Environment Setup**: `/docs/ENVIRONMENT_SETUP.md` - Local development setup
- **Deployment Guide**: `/docs/DEPLOYMENT.md` 🚀 - Docker & production deployment
- **Testing Strategy**: `/docs/TESTING.md` - Unit, integration, e2e tests

## 📚 CRITICAL DOCUMENTATION PATTERN

**ALWAYS ADD IMPORTANT DOCS HERE!** When you create or discover:
- Architecture diagrams → Add reference path here
- Database schemas → Add reference path here  
- Problem solutions → Add reference path here
- Setup guides → Add reference path here

This prevents context loss! Update this file IMMEDIATELY when creating important docs.

## Common Development Commands

All commands should be run from the `/api` directory:

```bash
cd api

# Development
npm run start:dev          # Start with hot reload
npm run build             # Build the application
npm run start:prod        # Run production build

# Testing
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint with auto-fix
npm run format           # Format code with Prettier
```

## Quick Architecture Overview

This is a NestJS application with:
- **`/api/lib/core/`** - Infrastructure (services, controllers, modules)
- **`/api/lib/logic/`** - Business logic (grouping, messaging, claude)
- **Clean separation** between infrastructure and business concerns

For detailed architecture information, see `/docs/ARCHITECTURE.md`.

## Claude CLI Integration

The application integrates with Claude CLI via Telegram bot:
- Use `/claude <request>` in Telegram
- Direct execution without templates
- Automatic file editing and git workflow

For full integration details, see `/docs/CLAUDE_CLI_INTEGRATION.md`.

## Important Instructions

### File Editing Guidelines
- **ALWAYS** preserve existing code patterns and conventions
- **NEVER** modify environment configuration files
- **ALWAYS** test changes before committing
- **NEVER** commit secrets or sensitive data
- **ALWAYS** follow TypeScript strict mode requirements

### Git Workflow
- **CREATE** feature branches for all work
- **GENERATE** pull requests instead of direct commits
- **PRESERVE** .env file during operations
- **USE** descriptive commit messages
- **REFERENCE** GitHub issues in commits

### Communication
- **CONFIRM** destructive operations with user
- **REPORT** progress and status updates
- **PROVIDE** clear error messages
- **INCLUDE** relevant context in responses
- **FILTER** verbose output to essential information

### Testing Requirements
- **RUN** `npm run lint` before committing
- **RUN** `npm run test:unit` for new features
- **VERIFY** application starts successfully
- **CHECK** no TypeScript errors
- **VALIDATE** all imports resolve correctly

This configuration enables Claude CLI to work effectively with the codebase while maintaining security and code quality standards.