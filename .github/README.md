# CI/CD Pipeline Documentation

This directory contains the GitHub Actions workflow and related configuration for the Qyou monorepo CI/CD pipeline.

## Files

- `workflows/ci.yml` - Main CI/CD pipeline workflow
- `BRANCH_PROTECTION_SETUP.md` - Instructions for setting up branch protection rules

## Pipeline Overview

The CI/CD pipeline is designed to ensure code quality and prevent bugs from being merged into the main branches. It runs automatically on every push and pull request.

### Workflow Features

✅ **Comprehensive Testing**: Runs linting, type checking, unit tests, and build verification  
✅ **Matrix Strategy**: Parallel execution across all apps and packages  
✅ **Smart Caching**: Caches dependencies to speed up builds  
✅ **Branch Protection**: Blocks PRs from merging if checks fail  
✅ **Monorepo Support**: Handles multiple apps and packages efficiently  

### Trigger Events

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

### Jobs

1. **Install Dependencies** - Installs and caches npm dependencies
2. **Lint Code** - Runs ESLint across all workspaces
3. **Type Check** - Runs TypeScript type checking
4. **Run Tests** - Executes Jest tests across all workspaces
5. **Build Verification** - Ensures all apps can build successfully
6. **CI Success** - Summary job that fails if any previous job fails

### Matrix Strategy

The pipeline uses a matrix strategy to run checks in parallel:

**Linting Matrix:**
- web-admin
- api
- mobile
- eslint-config
- types
- typescript-config

**Type Checking Matrix:**
- web-admin
- api
- mobile

**Testing Matrix:**
- web-admin
- api
- mobile
- types

**Build Verification Matrix:**
- web-admin
- api

### Caching Strategy

- **Cache Key**: Based on `package-lock.json` hash
- **Cache Paths**: 
  - `node_modules`
  - `apps/*/node_modules`
  - `packages/*/node_modules`
- **Restore Keys**: Fallback to previous cache versions

### Required Scripts

Each workspace must have the following npm scripts:

```json
{
  "scripts": {
    "lint": "...",
    "test": "...",
    "typecheck": "...",
    "build": "..."
  }
}
```

### Configuration Files

The pipeline expects the following configuration files in each workspace:

- `.eslintrc.js` - ESLint configuration
- `jest.config.js` - Jest test configuration
- `tsconfig.json` - TypeScript configuration

## Setup Instructions

1. **Install Dependencies**: Run `npm install` in the repository root
2. **Configure Branch Protection**: Follow the instructions in `BRANCH_PROTECTION_SETUP.md`
3. **Test the Pipeline**: Create a test pull request to verify everything works

## Troubleshooting

### Common Issues

1. **Status checks not appearing**: Ensure the workflow file is committed to the default branch
2. **Cache not working**: Verify `package-lock.json` files are committed
3. **Tests failing**: Check that all required dependencies are installed

### Local Testing

You can run the same commands locally:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run tests
npm run test

# Run type checking
npm run typecheck

# Build all apps
npm run build
```

## Performance

The pipeline is optimized for speed:

- **Parallel Execution**: Jobs run in parallel where possible
- **Dependency Caching**: Reduces installation time
- **Conditional Execution**: Skips unnecessary steps when possible
- **Matrix Strategy**: Efficient resource utilization

Expected runtime: 5-10 minutes depending on changes and cache hits.

## Maintenance

### Adding New Workspaces

When adding new apps or packages:

1. Add the workspace to the matrix strategies in `ci.yml`
2. Ensure the workspace has the required scripts and configuration files
3. Test the pipeline with the new workspace

### Updating Dependencies

When updating dependencies:

1. Update `package-lock.json` files
2. Clear GitHub Actions cache if needed
3. Verify the pipeline still passes

### Modifying the Pipeline

When modifying the workflow:

1. Test changes in a feature branch first
2. Ensure all matrix combinations still work
3. Update documentation as needed
4. Consider impact on pipeline performance
