<div align="center">
  <h1>devmem-cli</h1>
  <p><strong>Cross-project memory for AI coding assistants</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/devmem-cli"><img src="https://img.shields.io/npm/v/devmem-cli?color=brightgreen" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/devmem-cli"><img src="https://img.shields.io/npm/dm/devmem-cli" alt="npm downloads"></a>
    <a href="https://github.com/brian-mwirigi/devmem-cli/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/devmem-cli" alt="license"></a>
  </p>

  <p><em>Give AI assistants memory across ALL your projects</em></p>
</div>

---

## The Problem

You have 10 projects. Each uses similar patterns.

**You to Cursor:** _"Use the auth pattern from my-api project"_

**Cursor:** _"I don't have access to that project."_

**AI assistants forget everything outside the current project.**

## The Solution

Index all your projects once. AI can reference them forever.

```bash
# Index your projects
devmem index ~/projects/my-api
devmem index ~/projects/my-frontend
devmem index ~/projects/my-backend

# Now in ANY project, ask:
# "Use the JWT auth pattern from my-api"

# Search across all projects
devmem search "authentication"
# Shows: 12 functions across 3 projects
```

**AI now has context from ALL your code.**

> **Demo:** _[Add GIF here showing search and export]_

## Features

- **Project Indexing** - Scan projects for functions, classes, patterns
- **Semantic Search** - Find code by description, not just names
- **Cross-project Context** - Reference patterns from any project
- **Export for AI** - Generate markdown context files for Cursor/Claude
- **Local Storage** - All data stays on your machine
- **Multi-language** - TypeScript, JavaScript, Python, Go, Rust, Java
- **Smart Extraction** - Captures functions, classes, interfaces, patterns

## Installation

```bash
npm install -g devmem-cli
```

## Quick Start

### 1. Index Your Projects

```bash
# Index a single project
devmem index ~/projects/my-api

# Index with custom name
devmem index ~/projects/my-app -n "main-app"

# Index multiple projects
devmem index ~/projects/api-v1
devmem index ~/projects/api-v2
devmem index ~/projects/frontend
```

### 2. Search for Patterns

```bash
# Find authentication code
devmem search "authentication"

# Find by function name
devmem search "validateToken"

# Limit to specific project
devmem search "auth" -p my-api

# Find classes only
devmem search "Controller" -t class
```

### 3. Export Context for AI

```bash
# Export all indexed code as markdown
devmem export -o ./context.md

# Now use this file with AI assistants
# In Cursor: Attach context.md to chat
# In Claude: Paste context into conversation
```

## Commands

### Index

```bash
# Index a project
devmem index <path>

# With options
devmem index ~/projects/my-app -n "MyApp" --exclude "test,spec"
```

**Options:**
- `-n, --name` - Custom project name
- `-r, --recursive` - Index subdirectories
- `--exclude` - Exclude patterns (comma-separated)

**What gets indexed:**
- Functions and methods
- Classes and interfaces
- Important code patterns
- File locations
- Keywords for search

### Search

```bash
# Basic search
devmem search "auth"

# Advanced search
devmem search "validate" -p my-api -t function -l 20
```

**Options:**
- `-p, --project` - Limit to specific project
- `-t, --type` - Code type (function, class, pattern)
- `-l, --limit` - Number of results (default: 10)

**Output:**
```
Found 5 result(s):

1. validateJWT
   my-api • src/auth/jwt.ts
   Type: function • Relevance: 100.00

   async function validateJWT(token: string): Promise<User> {
     const decoded = jwt.verify(token, SECRET);
     return await User.findById(decoded.userId);
   }

2. validatePassword
   my-api • src/auth/password.ts
   Type: function • Relevance: 75.00

   ...
```

### Show

```bash
# Show full code for a result
devmem show 1
```

Displays complete function/class code.

### List

```bash
# List all indexed projects
devmem list
```

Output:
```
Indexed Projects:

• my-api
  /Users/brian/projects/my-api
  47 files • Indexed Feb 01, 2026

• my-frontend
  /Users/brian/projects/my-frontend
  123 files • Indexed Feb 01, 2026
```

### Update

```bash
# Update specific project
devmem update my-api

# Update all projects
devmem update
```

Use after making code changes.

### Remove

```bash
devmem remove my-api
```

Removes project from index (doesn't delete files).

### Stats

```bash
devmem stats
```

Output:
```
DevMem Statistics:

Projects: 5
Files Indexed: 342
Functions: 1,247
Classes: 156
Patterns: 423
Total Lines: 45,890
```

### Export

```bash
# Export all projects
devmem export -o ./context.md

# Export specific project
devmem export -p my-api -o ./api-context.md
```

Creates markdown file with all indexed code for AI context.

## Use Cases

### 1. Consistent Patterns Across Projects

**Scenario:** You have a proven auth pattern in one project, want to use it in another.

```bash
# In new project
devmem search "JWT authentication"

# Shows your auth implementation from other projects
# Copy pattern to new project
devmem show 3 > auth.ts
```

### 2. Cursor/Claude Context

**Problem:** Cursor doesn't know about your other projects.

**Solution:**
```bash
# Export indexed code
devmem export -o ~/devmem-context.md

# In Cursor:
# 1. Open chat
# 2. Attach devmem-context.md
# 3. Ask: "Use the auth pattern from my-api"
# Cursor now sees all your code!
```

### 3. Finding Forgotten Code

**Scenario:** "I wrote a date formatter somewhere..."

```bash
devmem search "formatDate"

# Shows all date functions across all projects
# With file locations
```

### 4. Onboarding Documentation

```bash
# Generate documentation for new developers
devmem export -p main-app -o ./docs/codebase-overview.md

# New devs can see all patterns, classes, functions
```

### 5. Code Reuse Detection

```bash
# Search before implementing
devmem search "send email"

# Finds: You already wrote this in 3 projects
# Reuse instead of duplicating
```

## Integration

### With Cursor

1. Index all projects:
   ```bash
   devmem index ~/projects/*
   ```

2. Export context:
   ```bash
   devmem export -o ~/cursor-context.md
   ```

3. In Cursor:
   - Open chat (@)
   - Attach `cursor-context.md`
   - Now reference any project: _"Use the auth from api-v2"_

### With Claude

1. Export context:
   ```bash
   devmem export -o ~/claude-context.md
   ```

2. In Claude:
   - Paste contents of `claude-context.md`
   - Ask: _"Show me all authentication patterns"_
   - Claude sees all your code

### With aitoken-cli

Track AI costs when using exported context:

```bash
# After AI conversation using context
aitoken stats
```

### With codesession-cli

Log indexing sessions:

```bash
cs start "Index all projects"
devmem index ~/projects/api-v1
devmem index ~/projects/api-v2
devmem index ~/projects/frontend
cs end -n "Indexed 3 projects, 342 files"
```

### With runbook-cli

Save index commands:

```bash
runbook set index-all "devmem update"
runbook set export-context "devmem export -o ~/context.md"
```

## How It Works

### Indexing

When you run `devmem index`:

1. **Scans files** - Finds all code files (.ts, .js, .py, .go, etc.)
2. **Parses code** - Extracts functions, classes, interfaces
3. **Extracts keywords** - Builds search index
4. **Stores locally** - Saves to SQLite database

### Search

When you run `devmem search`:

1. **Matches keywords** - Searches function names, code content
2. **Ranks results** - Most relevant first
3. **Shows context** - File location, code snippet
4. **Cross-project** - Searches all indexed projects

### Storage

All data stored in `~/.devmem/index.db` (SQLite).

**Database includes:**
- Project metadata
- File paths
- Function/class definitions
- Keywords for search
- Line numbers

## Supported Languages

- **JavaScript** (.js, .jsx)
- **TypeScript** (.ts, .tsx)
- **Python** (.py)
- **Go** (.go)
- **Rust** (.rs)
- **Java** (.java)

More languages coming soon.

## Configuration

### Custom Exclude Patterns

```bash
devmem index ~/projects/my-app --exclude "test,spec,mock,__tests__"
```

### Index Hidden Folders

```bash
# By default, hidden folders (.*) are excluded
# To include them, edit config (coming soon)
```

## Troubleshooting

### Slow Indexing

**Problem:** Indexing takes too long

**Solution:**
```bash
# Exclude large folders
devmem index ~/project --exclude "node_modules,dist,build"
```

### Search Returns Nothing

**Problem:** No results found

**Check:**
1. Is project indexed? `devmem list`
2. Update index: `devmem update`
3. Try broader search terms

### Out of Date Results

**Solution:**
```bash
# Re-index specific project
devmem update my-api

# Or update all
devmem update
```

## Privacy

- **All data local** - Nothing sent to cloud
- **Your code stays private** - Indexed on your machine only
- **Export control** - You choose what to share with AI

## Roadmap

- [ ] AST-based parsing (more accurate extraction)
- [ ] Vector embeddings for semantic search
- [ ] Git integration (auto-update on commits)
- [ ] Team sharing (optional cloud sync)
- [ ] VS Code extension
- [ ] Cursor native integration
- [ ] More languages (C++, C#, Ruby, PHP)
- [ ] Pattern similarity detection

## Development

```bash
# Clone
git clone https://github.com/brian-mwirigi/devmem-cli.git
cd devmem-cli

# Install
npm install

# Build
npm run build

# Test locally
npm link
devmem index ./src
devmem search "Database"
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Author

Built by [Brian Mwirigi](https://github.com/brian-mwirigi)  
Blog: [brianmunene.me/blog](https://brianmunene.me/blog)

---

<div align="center">
  <strong>Stop forgetting your own code. Give AI memory.</strong>
  <br><br>
  <a href="https://www.npmjs.com/package/devmem-cli">npm</a> •
  <a href="https://github.com/brian-mwirigi/devmem-cli">GitHub</a> •
  <a href="https://github.com/brian-mwirigi/devmem-cli/issues">Issues</a>
</div>
#   d e v m e m - c l i  
 