# Project instructions

Read this file when working in the website repository. Consult only the relevant sections of [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for site behavior and [ENVIRONMENT.md](ENVIRONMENT.md) for the toolchain, testing, Git, and release operations. If a reference is unavailable, use the source, package scripts, lockfile, and workflow to recover the relevant facts. When documentation and implementation differ, investigate the discrepancy before changing either.

## Change workflow

1. Confirm the requested behavior and scope, and inspect Git status before editing. Preserve existing user changes.
2. Read the relevant source, tests, and data. Identify the affected entry points and any shared behavior.
3. Make the smallest change that meets the requirement. Reuse existing components and layout rules. Preserve accepted behavior and source material in other sections. Integrate new features with the existing navigation and responsive layout.
4. Run the relevant checks and build for code changes; for documentation-only changes, check content consistency, Markdown formatting, and relative links. For interaction or layout changes, exercise the affected paths in a browser, including desktop and touch layouts when relevant. Report what was actually verified and what remains unverified.
5. Stop when the requested change works, relevant checks pass, and no material regression is found. Report the changes, checks, and any remaining issues.

## Environment and acceptance workflow

- **Codex Cloud** is the primary development and automated-testing workspace. A locally running server inside a cloud task is not, by itself, a user-accessible preview website. The Windows checkout remains an optional local development and interactive-testing workspace.
- **ChatGPT Sites** hosts the existing **test website** for the user's own interactive acceptance testing. See [ENVIRONMENT.md](ENVIRONMENT.md) for its address and handoff limitations. Deploy to this test site only when requested for the current task; do not treat automated test success as user acceptance.
- **GitHub** is the version-controlled source repository. **GitHub Pages** is the production website, deployed from `main` by the existing GitHub Actions workflow. A push or merge to `main` can trigger production deployment.
- Follow this sequence when relevant: implement and test → prepare an identifiable test candidate → update ChatGPT Sites on request using an actually available, verified handoff/deployment method → obtain the user's interactive acceptance → obtain explicit production-release authorization → integrate the accepted version and verify GitHub Pages.
- If the current tool cannot update ChatGPT Sites, report that boundary and provide a reproducible handoff of the candidate; never imply that Codex Cloud and Sites automatically sync, claim an unperformed deployment, or substitute a different hosting service without authorization. A Sites test alone does not prove that the GitHub Pages build will behave identically.
- Keep test candidates traceable to source changes. Do not push unaccepted changes to `main`. If test-site content differs from repository source, identify and reconcile the differences before proposing production release.

## Repository and release boundaries

- Keep backups, temporary files, screenshots, private settings, credentials, personal data, and unlicensed assets out of Git.
- Local edits, validation, and release preparation are within scope when needed. Commit, push, and deploy only with authorization for the current task. Test-site authorization does not authorize production deployment; acceptance does not, by itself, authorize a production push.
- Change remote history or deployment settings only when the task explicitly requires it.
