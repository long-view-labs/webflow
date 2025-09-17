# Nourish Long View Labs - Webflow JavaScript Files

This repository contains JavaScript files for the Nourish Long View Labs Webflow site.

## Release Management

This project includes an automated release management script that handles version bumping, tagging, and GitHub release creation.

### Prerequisites

- Node.js and npm installed
- Git configured with your credentials
- GitHub CLI installed and authenticated (optional, for automatic GitHub releases)

### Installation

```bash
npm install
```

### Usage

#### Interactive Release (Recommended)

```bash
npm run release
```

This will start an interactive process where you can:

- Choose the release type (patch, minor, major, prerelease)
- Enter release notes
- Confirm the release details

#### Direct Release Commands

```bash
# Patch release (1.0.0 → 1.0.1) - Bug fixes
npm run release:patch

# Minor release (1.0.0 → 1.1.0) - New features
npm run release:minor

# Major release (1.0.0 → 2.0.0) - Breaking changes
npm run release:major

# Prerelease (1.0.0 → 1.0.1-0) - Alpha/Beta versions
npm run release:prerelease
```

#### Utility Commands

```bash
# Show current version
npm run version

# Show changelog
npm run changelog
```

### What the Release Script Does

1. **Pre-flight Checks**

   - Verifies git status (warns about uncommitted changes)
   - Checks if you're on the main/master branch
   - Allows you to proceed with warnings if needed

2. **Version Management**

   - Updates `package.json` with the new version
   - Creates/updates `CHANGELOG.md` with release notes
   - Uses semantic versioning (semver)

3. **Git Operations**

   - Commits the version bump and changelog
   - Creates an annotated git tag
   - Pushes changes and tags to the remote repository

4. **GitHub Integration**
   - Creates a GitHub release (if GitHub CLI is available)
   - Includes release notes and tags

### Release Types

- **Patch** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes, major updates
- **Prerelease** (1.0.0 → 1.0.1-0): Alpha, beta, or release candidate versions

### Files Modified During Release

- `package.json` - Version number updated
- `CHANGELOG.md` - New release entry added
- Git repository - New commit and tag created
- GitHub - New release created (if GitHub CLI available)

### Troubleshooting

If a release fails partway through:

1. Check the error message for specific issues
2. You may need to manually clean up:
   - Revert version in `package.json`
   - Remove changelog entry
   - Reset commit and tag if they were created
3. Fix the underlying issue and try again

### Manual GitHub Release

If GitHub CLI is not available, you can create releases manually:

1. Go to https://github.com/long-view-labs/webflow/releases
2. Click "Create a new release"
3. Select the tag created by the script
4. Add release notes
5. Publish the release
