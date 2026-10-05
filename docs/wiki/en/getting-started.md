# Getting started

> For new developers. Replace the guidance with real steps and commands (written the way AGENTS.md → Commands shows them).

## In short
How to get watchlist-saham running on your machine, check that it works, and make your first change.

## Requirements
Tools and versions you need installed (runtime, package manager, database, …) and the required agent tooling listed in AGENTS.md.

## Install and run
The exact commands, in order, from a fresh clone to a running project.

## Test
How to run the tests and what "passing" looks like.

## Graph hooks
If AGENTS.md lists graphify under Required tooling, run `graphify hook install` once after cloning: git hooks live in `.git/` and are not committed, and they keep the code graph that AI agents query up to date after every commit. `graphify hook status` shows whether they are installed.

## Your first change
The workflow: plan the task, make the change with tests and doc comments, update the wiki page of the topic, pass the Definition of Done, then ask for commit approval.
