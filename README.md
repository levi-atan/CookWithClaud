# CookWithClaud

A Claude Code project workspace for building and experimenting with AI-assisted workflows. This repo serves as a base for custom skills, configurations, and tooling powered by [Claude Code](https://claude.ai/code).

## What's Inside

```
.claude/
├── settings.local.json          # Project-level Claude Code settings
└── skills/
    └── git-summary/
        └── SKILL.md             # Custom skill: summarize recent git activity
```

## Skills

### `/git-summary [days]`

Generates a plain-English summary of recent git activity for the project.

**Usage:**
```
/git-summary 7
```

**What it does:**
- Lists commits from the last N days
- Shows which files changed
- Summarizes uncommitted work in progress
- Gives a human-readable overview of what was worked on

## Getting Started

### Requirements

- [Claude Code](https://claude.ai/code) installed
- [Git](https://git-scm.com/) installed

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/levi-atan/CookWithClaud.git
   cd CookWithClaud
   ```

2. Open the project in Claude Code and the skills will be automatically available.

3. Try the skill:
   ```
   /git-summary 7
   ```

## Adding Your Own Skills

Create a new folder under `.claude/skills/` with a `SKILL.md` file:

```
.claude/skills/
└── my-skill/
    └── SKILL.md
```

Restart Claude Code and invoke it with `/my-skill`.

See the [Claude Code Skills documentation](https://docs.anthropic.com/claude-code) for the full list of frontmatter options.
