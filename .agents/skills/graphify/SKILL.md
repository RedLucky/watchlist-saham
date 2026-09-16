---
name: graphify
description: Instructs the agent to look for a local repository dependency graph to understand which files to scan or skip.
---
# Graphify Framework
- Before scanning or reading repository files, check for a local dependency map or architecture guide.
- Skip scanning build targets, asset folders, and heavy dependency directories like node_modules.
- Target only the specific code files that directly share a dependency link with the file being modified.
