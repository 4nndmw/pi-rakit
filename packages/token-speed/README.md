# Pi Rakit Token Speed

A Pi extension that shows the current token streaming speed in the status bar.

## Install

```bash
pi install npm:pi-rakit-token-speed
```

During an assistant response the footer displays an updating estimate such as:

```text
⚡ ~42.5 tok/s
```

When the response finishes, the extension replaces the estimate with a final rate calculated from the provider-reported output token usage:

```text
⚡ 40.8 tok/s
```

The timer starts at the first streamed content delta, so provider time-to-first-token is not included. Text, reasoning, and tool-call deltas contribute to the live estimate. The status is cleared when the next assistant response starts or the session shuts down.
