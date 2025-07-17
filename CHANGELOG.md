# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released]

### Added

- Manual trigger support for GitHub Actions release workflow
- Comprehensive CHANGELOG.md file

### Changed

- Modernized GitHub Actions workflow to use latest versions
  - Updated `actions/checkout` from v2 to v4
  - Updated `actions/setup-node` from v1 to v4
  - Upgraded Node.js from 14.x to 18 (current LTS)
  - Added npm caching for faster builds
- Improved release workflow with better naming and changelog references
- Enhanced build process with linting step

### Fixed

- Critical bug in date parsing logic resolved
- Fixed incorrect dates for expressions beyond current week:
  - `@yesterday` now correctly gives yesterday's date
  - `@next monday` now correctly gives next Monday's date  
  - `@last monday` now correctly gives last Monday's date
- Parser now uses current date as reference point instead of week start
- Maintains full compatibility with week start preferences
- Resolved TypeScript linting errors throughout codebase
  - Replaced `@ts-ignore` with proper type assertions
  - Fixed unused parameter warnings
  - Improved type safety for internal API access
- Added defensive error handling for Obsidian internal API usage
- Fixed deprecated `::set-output` usage in GitHub Actions

### Technical Details

- **Problem**: Plugin used start of current week as reference point for parsing dates with explicit weekdays
- **Solution**: Parser now consistently uses current date as reference point
- **Compatibility**: No breaking changes, all existing functionality preserved
- Switched from `yarn` to `npm ci` for more reliable dependency installation
- Added conditional styles.css upload in release workflow
- Improved error handling and fallbacks for internal API access
- Enhanced type safety while maintaining compatibility with Obsidian internals

---

## Release Instructions

### Automatic Release

Push a git tag to trigger automatic release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Manual Release

1. Go to repository Actions tab on GitHub
2. Select "Build and Release Obsidian Plugin" workflow
3. Click "Run workflow"
4. Enter desired tag name (e.g., `v1.0.1`)
5. Click "Run workflow" 
