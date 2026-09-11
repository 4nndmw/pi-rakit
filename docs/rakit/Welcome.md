# Pi Rakit Documentation

Pi Rakit is an interactive CLI for selecting and adding a collection of extensions to [Pi](https://github.com/badlogic/pi-mono). It can update either the user-level Pi configuration or a project-local configuration.

## Start Here

- [[Getting Started]] — install and run Pi Rakit
- [[CLI Reference]] — commands, options, and configuration paths
- [[Package Manifest]] — define packages shown by the installer
- [[Creating an Extension]] — build and register a Pi extension
- [[Custom Provider]] — connect Pi to an OpenAI-compatible endpoint
- [[Doctor]] — diagnose the Pi runtime and settings safely
- [[Worktree]] — create and remove isolated Git worktrees from Pi
- [[Git]] — inspect repositories and commit explicitly staged changes
- [[Development and Release]] — develop, test, and publish the project
- [Changelog](../../CHANGELOG.md) — review published package versions and release notes

## Published Packages

| Package | Purpose |
| --- | --- |
| [`@anandamw/pi-rakit`](https://www.npmjs.com/package/@anandamw/pi-rakit) | Interactive installer CLI |
| [`@anandamw/hello-pi`](https://www.npmjs.com/package/@anandamw/hello-pi) | Example extension providing `/hello` |
| [`@anandamw/custom-provider`](https://www.npmjs.com/package/@anandamw/custom-provider) | Configurable OpenAI-compatible provider |
| [`@anandamw/doctor`](https://www.npmjs.com/package/@anandamw/doctor) | Runtime and settings diagnostics through `/doctor` |
| [`@anandamw/worktree`](https://www.npmjs.com/package/@anandamw/worktree) | Safe Git worktree management through `/worktree` |
| [`@anandamw/git`](https://www.npmjs.com/package/@anandamw/git) | Focused status, branch, and staged commit commands through `/git` |

## Repository

Source code and issue tracking are available at [github.com/4nndmw/pi-rakit](https://github.com/4nndmw/pi-rakit).
