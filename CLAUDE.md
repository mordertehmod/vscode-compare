# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that compares folders, shows file differences in a list or tree view, and presents diffs side by side. The extension uses the `dir-compare` package for comparison logic and integrates deeply with VS Code's TreeView API.

## Development Commands

### Build & Watch
- `yarn compile` - Compile TypeScript to JavaScript (outputs to `out/`)
- `yarn watch` - Watch mode for continuous compilation during development
- `npm: watch` - Background task (default in VS Code)

### Testing
- `yarn test` - Run all integration tests (uses Mocha + VS Code test runner)
- Use "Extension Tests" launch config in [.vscode/launch.json](.vscode/launch.json) to debug tests

### Debug & Run
- Use "Run Extension" launch config to launch extension in development mode
- Both launch configs use `npm: watch` as pre-launch task

### Package & Deploy
- `yarn package` - Package extension as VSIX using vsce
- `yarn package:test` - Run [scripts/package-test.sh](scripts/package-test.sh)
- `yarn deploy` - Publish to VS Code marketplace
- `yarn deploy:insider` - Deploy insider version via [scripts/deploy-insider.js](scripts/deploy-insider.js)
- `yarn deploy:openvsx` - Publish to OpenVSX via [scripts/deploy-openvsx.sh](scripts/deploy-openvsx.sh)

## Architecture & Data Flow

### Core Components

**Entry Point**: [src/extension.ts](src/extension.ts)
- Registers all commands and tree data providers
- Handles activation via `onStartupFinished` event
- Supports CLI mode: `COMPARE_FOLDERS=DIFF code path/to/folder1 path/to/folder2`
- Supports auto-compare on load via `compareFolders.folderLeft` and `compareFolders.folderRight` settings

**Providers** (implement VS Code's `TreeDataProvider`):
- [src/providers/foldersCompareProvider.ts](src/providers/foldersCompareProvider.ts) - Main differences view with file operations
- [src/providers/viewOnlyProvider.ts](src/providers/viewOnlyProvider.ts) - Read-only views for "Only in A", "Only in B", and "Identical files"

**Context Management** ([src/context/](src/context/)):
- [src/context/path.ts](src/context/path.ts) - `pathContext` singleton manages main/compared folder paths, handles path swapping
- [src/context/ui.ts](src/context/ui.ts) - `uiContext` singleton manages view mode (tree/list), syncs with VS Code context keys
- [src/context/global.ts](src/context/global.ts) - Wrapper for VS Code context key updates

**Core Services** ([src/services/](src/services/)):
- [src/services/comparer.ts](src/services/comparer.ts) - Main comparison logic using `dir-compare`, builds comparison options, handles diff display
- [src/services/treeBuilder.ts](src/services/treeBuilder.ts) - Converts flat file lists to tree/list data structures for UI
- [src/services/configuration.ts](src/services/configuration.ts) - Reads extension settings from `compareFolders.*` namespace
- [src/services/globalState.ts](src/services/globalState.ts) - Tracks recent compares and extension version in VS Code global state
- [src/services/gitignoreFilter.ts](src/services/gitignoreFilter.ts) - Implements `.gitignore` support for file filtering
- [src/services/includeExcludeFilesGetter.ts](src/services/includeExcludeFilesGetter.ts) - Combines include/exclude filters with gitignore rules
- [src/services/ignorePatterns.ts](src/services/ignorePatterns.ts) - Applies regex patterns to ignore specific lines or code snippets during comparison
- [src/services/customFileCompare.ts](src/services/customFileCompare.ts) - Custom file comparison handler that applies ignore patterns before comparing

**Utilities** ([src/utils/](src/utils/)):
- [src/utils/ui.ts](src/utils/ui.ts) - User notifications, error reporting, progress messages
- [src/utils/path.ts](src/utils/path.ts) - Path manipulation helpers
- [src/utils/consts.ts](src/utils/consts.ts) - Shared constants

### Data Flow

1. User triggers comparison via command/UI → calls method on `CompareFoldersProvider`
2. Provider calls `compareFolders()` in [src/services/comparer.ts](src/services/comparer.ts)
3. Comparer:
   - Reads configuration via `getConfiguration()` from [src/services/configuration.ts](src/services/configuration.ts)
   - Builds compare options (ignore rules, whitespace, extensions, gitignore)
   - Calls `dir-compare` library with options
   - Separates results into: differences, only-in-A, only-in-B, identical
4. Results passed to `treeBuilder.build()` which creates tree/list based on `uiContext.diffViewMode`
5. Provider updates all tree views → VS Code re-renders UI
6. User clicks file → command triggers diff view via `vscode.diff` or `diffMerge.compareSelected`

### View Modes

- **Tree mode**: Hierarchical folder structure (default)
- **List mode**: Flat file list
- Toggled via "View as List/Tree" buttons in toolbar
- Mode stored in `uiContext.diffViewMode` and synced to context key `foldersCompare.diffViewMode`
- Initial mode set via `compareFolders.defaultDiffViewMode` setting

### File Operations

All implemented in [src/providers/foldersCompareProvider.ts](src/providers/foldersCompareProvider.ts):
- **Take My File / Take Compared File**: Replace file on one side with the other (uses `fs-extra`)
- **Copy to Compared / Copy to My**: Copy unique file to other folder
- **Delete**: Permanently delete file from filesystem
- **Dismiss Difference**: Remove file from comparison results (UI only, doesn't touch filesystem)
- Warning dialogs controlled by `compareFolders.warnBeforeDelete` and `compareFolders.warnBeforeTake`

### Context Keys

- `foldersCompareContext.hasFolders` - Set when folders are loaded
- `foldersCompare.diffViewMode` - Current view mode ('tree' or 'list')
- Used in [package.json](package.json) `when` clauses to show/hide commands and buttons

## Configuration System

All settings use `compareFolders.*` namespace (defined in [package.json](package.json) under `contributes.configuration`):

**Comparison Options**:
- `compareContent` (boolean) - Compare by content vs metadata
- `ignoreLineEnding`, `ignoreWhiteSpaces`, `ignoreAllWhiteSpaces`, `ignoreEmptyLines` - Whitespace handling
- `ignoreFileNameCase` - Case-insensitive filename matching
- `ignoreExtension` - Array of extension pairs to treat as same file (e.g., `[["js", "ts"]]`)
  - IMPORTANT: Each extension can appear only once across all pairs
  - Validated in [src/services/ignoreExtensionTools.ts](src/services/ignoreExtensionTools.ts)
- `ignoreLinePatterns` - Array of regex patterns to ignore entire lines during comparison (e.g., `["^\\s*//.*$"]`)
  - Lines matching any pattern are removed before comparison
  - Validated on activation; invalid patterns show warnings
  - Implemented in [src/services/ignorePatterns.ts](src/services/ignorePatterns.ts)
- `ignoreCodePatterns` - Array of regex patterns to ignore code snippets within lines (e.g., `["\\s*//.*$"]`)
  - Code matching any pattern is removed from lines before comparison
  - Applied before line patterns
  - Implemented in [src/services/ignorePatterns.ts](src/services/ignorePatterns.ts)

**Filtering**:
- `includeFilter`, `excludeFilter` - Glob patterns (arrays)
- `respectGitIgnore` - Honor `.gitignore` rules (supports basic gitignore syntax including negation)

**UI Options**:
- `diffViewTitle` - Enum: "name only", "compared path", "full path"
- `diffLayout` - Enum: "local <> compared", "compared <> local"
- `defaultDiffViewMode` - Enum: "tree", "list"
- `showIdentical` - Show "Identical files" panel
- `useDiffMerge` - Use `moshfeu.diff-merge` extension for diffs

**Auto-compare**:
- `folderLeft`, `folderRight` - If both set, compare on extension load

## Key Commands

All defined in [src/constants/commands.ts](src/constants/commands.ts):
- `foldersCompare.chooseFoldersAndCompare` - Pick 2 folders via OS dialog
- `foldersCompare.compareFoldersAgainstWorkspace` - Compare folder against workspace
- `foldersCompare.compareSelectedFolders` - Compare 2 folders selected in explorer
- `foldersCompare.pickFromRecentCompares` - Show quick pick of recent comparisons
- `foldersCompare.refresh` - Re-compare current folders
- `foldersCompare.swap` - Swap left/right sides
- `foldersCompare.viewAsList` / `viewAsTree` - Toggle view mode

## Testing

- Integration tests in [src/test/suite/](src/test/suite/)
- Tests use VS Code's `@vscode/test-electron` for running in real VS Code environment
- Test runner: [src/test/suite/index.ts](src/test/suite/index.ts)
- Run via `yarn test` or "Extension Tests" launch config
- Key test files:
  - [src/test/suite/extension.test.ts](src/test/suite/extension.test.ts) - Extension activation tests
  - [src/test/suite/treeBuilder.test.ts](src/test/suite/treeBuilder.test.ts) - Tree building logic
  - [src/test/suite/includeExcludeFilesGetter/](src/test/suite/includeExcludeFilesGetter/) - Filter logic tests
  - [src/test/suite/ignorePatterns.test.ts](src/test/suite/ignorePatterns.test.ts) - Ignore patterns service tests
  - [src/test/suite/customFileCompare.test.ts](src/test/suite/customFileCompare.test.ts) - Custom file comparison tests

## TypeScript Configuration

- Strict mode enabled in [tsconfig.json](tsconfig.json)
- Target: ES6, Module: CommonJS
- Output: `out/` directory
- Source maps enabled for debugging
- All types defined in [src/types.ts](src/types.ts)

## Important Constraints & Conventions

### Extension Settings
- All settings use `compareFolders` namespace
- Each `ignoreExtension` entry must have unique extensions (validated on activation)
- Settings accessed via `getConfiguration()` helper, never directly

### View Structure
- Three main views in activity bar: "Differences", "Only in my folder", "Only in compared folder"
- Optional fourth view: "Identical files" (controlled by `showIdentical` setting)
- All use same `File` model from [src/models/file.ts](src/models/file.ts)

### Error Handling
- User-facing errors use [src/utils/ui.ts](src/utils/ui.ts) helpers
- Errors prompt user to report issues on GitHub with system info
- Permission validation in [src/services/validators.ts](src/services/validators.ts)

### Path Management
- Always use `pathContext` singleton for folder paths
- Supports swapping via `pathContext.swap()`
- Recent compares tracked in global state

### State Management
- UI state: `uiContext` in [src/context/ui.ts](src/context/ui.ts)
- Path state: `pathContext` in [src/context/path.ts](src/context/path.ts)
- Persistent state: `globalState` in [src/services/globalState.ts](src/services/globalState.ts)
- No global mutable state outside these singletons

## Integration Points

- **dir-compare**: Core comparison engine
- **@cjs-exporter/globby**: Glob pattern matching for gitignore support
- **fs-extra**: File operations (copy, delete)
- **lodash**: Tree structure manipulation (get/set)
- **parse-gitignore**: Parse `.gitignore` files
- **VS Code API**: Extensive use of TreeDataProvider, commands, context keys, notifications

## Known Limitations

From [README.md](README.md):
- Known issues with comparing local and remote folders over SSH (see issues #81, #83)
- Gitignore support covers basic rules including negation, but not `.gitignore` files in subfolders

## CI/CD

- Azure Pipelines: [azure-pipelines.yml](azure-pipelines.yml)
- GitHub Actions: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- Automated builds and releases on push/tag
