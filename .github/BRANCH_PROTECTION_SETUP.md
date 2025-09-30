# Branch Protection Setup

This document outlines how to configure GitHub branch protection rules to ensure that pull requests cannot be merged unless all CI checks pass.

## Required GitHub Settings

To enable branch protection and block pull requests from merging when CI checks fail, you need to configure the following in your GitHub repository:

### 1. Enable Branch Protection Rules

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or **Add branch protection rule**
4. Configure the following settings:

#### Branch Name Pattern
- Set to `main` (or your primary branch name)
- Optionally add `develop` if you want protection on both branches

#### Required Status Checks
- ✅ Check "Require status checks to pass before merging"
- ✅ Check "Require branches to be up to date before merging"
- Add the following required status checks:
  - `Install Dependencies`
  - `Lint Code`
  - `Type Check`
  - `Run Tests`
  - `Build Verification`

#### Additional Settings (Recommended)
- ✅ Check "Require a pull request before merging"
- ✅ Check "Dismiss stale PR approvals when new commits are pushed"
- ✅ Check "Require review from code owners"
- ✅ Check "Restrict pushes that create files larger than 100 MB"

### 2. Repository Settings

Ensure the following repository settings are enabled:

1. Go to **Settings** → **General**
2. Under "Features":
   - ✅ Check "Issues"
   - ✅ Check "Projects"
   - ✅ Check "Wiki" (optional)

3. Under "Pull Requests":
   - ✅ Check "Allow merge commits"
   - ✅ Check "Allow squash merging"
   - ✅ Check "Allow rebase merging"

### 3. Actions Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - ✅ Check "Allow GitHub Actions to create and approve pull requests"

## Workflow Behavior

Once configured, the CI/CD pipeline will:

1. **Trigger automatically** on:
   - Push to `main` or `develop` branches
   - Pull requests targeting `main` or `develop` branches

2. **Run the following checks**:
   - **Install Dependencies**: Installs and caches npm dependencies
   - **Lint Code**: Runs ESLint across all apps and packages
   - **Type Check**: Runs TypeScript type checking
   - **Run Tests**: Executes Jest tests across all apps
   - **Build Verification**: Ensures all apps can build successfully

3. **Block merging** if any check fails

4. **Use caching** to speed up subsequent runs

## Matrix Strategy

The pipeline uses a matrix strategy to run checks in parallel across different workspaces:

- **Apps**: `web-admin`, `api`, `mobile`
- **Packages**: `eslint-config`, `types`, `typescript-config`

This allows for:
- Faster execution through parallelization
- Independent failure reporting per workspace
- Better resource utilization

## Dependencies Caching

The pipeline includes intelligent caching:

- **Node modules caching**: Caches `node_modules` directories
- **Cache key**: Based on `package-lock.json` hash
- **Restore keys**: Fallback to previous cache versions

## Troubleshooting

### Common Issues

1. **Status checks not appearing**: Ensure the workflow file is in the correct branch and the Actions permissions are properly configured.

2. **Cache not working**: Verify that the `package-lock.json` files are committed to the repository.

3. **Tests failing**: Check that all required dependencies are installed and test files are properly configured.

### Manual Override

In emergency situations, repository administrators can:
1. Go to the pull request
2. Click "Merge pull request" 
3. Select "Merge without waiting for requirements to be met"

**Note**: This should only be used in exceptional circumstances and should be followed by immediate fixes.

## Next Steps

After setting up branch protection:

1. Create a test pull request to verify the setup
2. Ensure all team members understand the new workflow
3. Consider adding code review requirements
4. Set up notifications for failed builds
5. Monitor the pipeline performance and adjust caching as needed
