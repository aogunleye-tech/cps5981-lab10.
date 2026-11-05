# Gate policy - Cougar Advising

> **Status: STARTER POLICY - NOT DEFENSIBLE.** This version warns on everything and
> blocks nothing, so every run is green. Replacing it is part of the lab.

| Field | Value |
|---|---|
| Policy version | 0.1.0 |
| Owner (named person who can defend it) | UNASSIGNED |
| Last reviewed | - |
| Override procedure | - |

## Rules

The pipeline reads **only** the JSON block below. Each source maps a level to one
of three decisions: `block` (fails the build), `warn` (passes, shown in the
summary), or `record` (passes, written to the decision log only).

```json
{
  "policy_version": "0.1.0",
  "owner": "UNASSIGNED",
  "rules": {
    "security_tests": { "fail": "warn" },
    "secrets":        { "any": "warn" },
    "sast":           { "ERROR": "warn", "WARNING": "warn", "INFO": "warn" },
    "sca":            { "critical": "warn", "high": "warn", "moderate": "warn", "low": "warn", "info": "warn" },
    "dast":           { "high": "warn", "medium": "warn", "low": "warn", "informational": "warn" }
  },
  "exceptions": []
}
```

## Why each threshold is where it is

_Nothing written yet._

## Findings that are real but do not block release

_Nothing written yet._
