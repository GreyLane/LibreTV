# Project workflow

This checkout is the source of truth for the user's customized LibreTV deployment.

- Work on `codex/recommendation-feed` unless the user specifies another branch.
- Keep future changes in this Git repository. Commit and push verified changes to the user's GitHub fork before deploying them to the NAS.
- Preserve upstream compatibility where possible; the initial base is upstream tag `v2.16.12`.
- Never commit NAS credentials, website passwords, `.env` files, SSH keys, deployment transcripts, or private viewing history.
- Verify relevant tests, TypeScript types and the production build for code changes.
- Preserve existing NAS data sources and subscriptions during deployment. Back up the deployment configuration and retain a working image for rollback.
- Do not replace the upstream repository's branches or publish changes under an unrelated repository.
