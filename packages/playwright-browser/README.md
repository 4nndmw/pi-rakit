# Pi Rakit Playwright Browser

A Pi skill for deterministic browser automation with Playwright. It can navigate pages, interact with forms, inspect content, make assertions, and save screenshots or PDFs from a validated JSON scenario.

## Install

```bash
pi install npm:pi-rakit-playwright-browser
npx playwright install chromium
```

Reload Pi, then invoke the skill:

```text
/reload
/skill:playwright-browser open https://example.com and take a screenshot
```

The agent may also load the skill automatically when a task requires browser automation.

## Browser setup

The npm package includes Playwright but does not download browser binaries during installation. Install only the browser you need:

```bash
npx playwright install chromium
# Linux system dependencies, when required:
npx playwright install --with-deps chromium
```

Scenarios write screenshots and PDFs under `playwright-artifacts/` by default. See [`skills/playwright-browser/SKILL.md`](skills/playwright-browser/SKILL.md) for the scenario format and safety rules.
