# Project instructions

Read this file when working in the website repository. Consult only the relevant sections of [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for site behavior and [ENVIRONMENT.md](ENVIRONMENT.md) for the toolchain, testing, Git, and release operations. If a reference is unavailable, use the source, package scripts, lockfile, and workflow to recover the relevant facts. When documentation and implementation differ, investigate the discrepancy before changing either.

## Change workflow

1. Confirm the requested behavior and scope, and inspect Git status before editing. Preserve existing user changes.
2. Read the relevant source, tests, and data. Identify the affected entry points and any shared behavior.
3. Make the smallest change that meets the requirement. Reuse existing components and layout rules. Preserve accepted behavior and source material in other sections. Integrate new features with the existing navigation and responsive layout.
4. Run the relevant checks and build. For interaction or layout changes, exercise the affected paths in a browser, including desktop and touch layouts when relevant. Report what was actually verified and what remains unverified.
5. Stop when the requested change works, relevant checks pass, and no material regression is found. Report the changes, checks, and any remaining issues.

## Repository and release boundaries

- Keep backups, temporary files, screenshots, private settings, credentials, personal data, and unlicensed assets out of Git.
- Local edits, validation, and release preparation are within scope when needed. Commit, push, and deploy only with authorization for the current task.
- Change remote history or deployment settings only when the task explicitly requires it.
