# PLAT-09 — Encrypted Backup/Restore Drill and M1 Local-Complete Exit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tooling/scripts/backup.sh` (streams a custom-format `pg_dump` directly into `age` encryption, never writing a plaintext dump to disk) and `tooling/scripts/restore-drill.sh` (restores into an isolated scratch database, verifies row counts including the `platform_probe` bootstrap row, and cleans up), then update `docs/core/implementation-status.md` and `docs/core/implementation-roadmap.md` to record M1 as **local-complete** — with `PLAT-10` explicitly deferred and its remote-collaboration trigger documented — without claiming any staging evidence that was never produced.

**Architecture:** `backup.sh` pipes `pg_dump --format=custom` straight into `age --recipient`, writing to a temporary `.partial` file that is atomically renamed into place only after both commands succeed (and deleted by a `trap` if either fails), so no partial ciphertext is ever left on disk; it writes only the resulting ciphertext plus a small, non-sensitive JSON manifest (timestamp, exact backup basename, size, SHA-256, expected row counts) — and never prints the raw `DATABASE_URL`, only a database name parsed safely out of it. `restore-drill.sh` verifies the manifest's basename and SHA-256 against the actual backup file *before* decrypting anything, accepts no caller-provided target database at all, creates its own uniquely named scratch database, decrypts the backup to a `chmod 600` temporary file only because `pg_restore` cannot read a seekable custom-format archive from a pipe, restores into the scratch database, compares row counts against the manifest, and unconditionally cleans up both the temp file and the scratch database via a `trap`. Both scripts fail closed on missing required arguments (`--help` alone exits `0`) and both were verified end-to-end against fake `pg_dump`/`age`/`psql`/`pg_restore` stand-ins while drafting this plan — including the atomic-cleanup-on-failure path and both manifest-binding rejection paths — so every documented behavior below is a proven, not assumed, outcome. `packages/db`'s existing `pnpm db:seed` (built in `PLAT-03-database-local-stack.md`) already satisfies the "seed entrypoint" part of this work package — this plan does not duplicate it.

**Tech Stack:** `age` `1.3.1`, PostgreSQL client tools matching server major version `16` (`pg_dump`, `pg_restore`, `psql`), Bash, Node.js `22.17.0` (used inside the scripts only for robust URL parsing, not as a new project dependency).

---

## Before you start

This is the final cluster plan (6 of 6). All five earlier cluster plans must be done: the workspace, database, API, mobile vertical slice, and CI are all green. Read `docs/impl-plan/M1/README.md` for the shared ports/env/package-name contract and the exact PLAT-10 deferral trigger this plan records.

Install the two tools these scripts depend on if they are not already present:

```bash
# macOS
brew install age
brew install postgresql@16   # provides pg_dump, pg_restore, psql matching the server's major version

# Linux (Debian/Ubuntu 22.04+ / Debian 12+)
sudo apt-get update && sudo apt-get install -y age postgresql-client-16
```

Confirm both are on `PATH`:

```bash
age --version
pg_dump --version
```

Expected: both print a version string (`age` reports `1.3.1` or newer; `pg_dump` reports a `16.x` client matching the Compose server's major version).

---

### Task 1: Generate a local age keypair

**Files:**
- Modify: `.env` (local, untracked — never commit key material)

- [ ] **Step 1: Generate the keypair**

```bash
age-keygen -o age-key.txt
```

Expected: prints `Public key: age1...` to stdout and writes the private key (identity) into `age-key.txt`.

- [ ] **Step 2: Move the identity file somewhere outside the repository**

```bash
mkdir -p ~/.config/littlearc
mv age-key.txt ~/.config/littlearc/age-key.txt
chmod 600 ~/.config/littlearc/age-key.txt
```

Never commit an age identity (private key) file. If it is ever accidentally staged, `git status --porcelain` will show it under a tracked path — confirm it does not before any commit in this plan.

- [ ] **Step 3: Record the recipient (public key) and identity file path in your local `.env`**

Add these two lines to your local (untracked) root `.env`, replacing the placeholder public key with the one Step 1 printed:

```
BACKUP_AGE_RECIPIENT=age1qyourrealpublickeyfromstep1
BACKUP_AGE_IDENTITY_FILE=/Users/you/.config/littlearc/age-key.txt
```

`.env.example` (created in `PLAT-03-database-local-stack.md`) already documents both variable names with empty defaults — this step only fills in your local, untracked values.

- [ ] **Step 4: Confirm nothing sensitive is staged**

```bash
git status --porcelain
```

Expected: empty, or only pre-existing unrelated changes — never `age-key.txt` or `.env`.

---

### Task 2: `backup.sh`

**Files:**
- Create: `tooling/scripts/backup.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: DATABASE_URL=... BACKUP_AGE_RECIPIENT=age1... tooling/scripts/backup.sh [output-dir]

Streams a custom-format pg_dump directly into age encryption. Never writes an
unencrypted dump to disk, and never leaves a partial ciphertext or manifest
behind if any step fails. Produces a non-sensitive manifest — bound to the
encrypted file by its exact basename and SHA-256 — for later restore-drill
verification.

Required environment variables:
  DATABASE_URL           PostgreSQL connection string of the database to back up.
  BACKUP_AGE_RECIPIENT    age public key (recipient) to encrypt the backup to.

Optional:
  output-dir              Directory to write the encrypted backup and manifest
                           to. Defaults to ./backups.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

: "${DATABASE_URL:?DATABASE_URL is required. Run with --help for usage.}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required. Run with --help for usage.}"

for tool in pg_dump age psql node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: required tool '$tool' is not installed." >&2
    case "$tool" in
      pg_dump)
        echo "  macOS:  brew install postgresql@16" >&2
        echo "  Linux:  sudo apt-get install postgresql-client-16" >&2
        ;;
      age)
        echo "  macOS:  brew install age" >&2
        echo "  Linux:  sudo apt-get install age  (see https://github.com/FiloSottile/age#installation for other distros)" >&2
        ;;
    esac
    exit 1
  fi
done

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$OUTPUT_DIR/littlearc-${TIMESTAMP}.dump.age"
MANIFEST_FILE="$OUTPUT_DIR/littlearc-${TIMESTAMP}.manifest.json"
TMP_BACKUP_FILE="${BACKUP_FILE}.partial"
TMP_MANIFEST_FILE="${MANIFEST_FILE}.partial"
COMPLETED=false

if [[ -e "$BACKUP_FILE" || -e "$MANIFEST_FILE" ]]; then
  echo "error: refusing to overwrite an existing backup or manifest for timestamp $TIMESTAMP." >&2
  exit 1
fi

# Never print DATABASE_URL itself — it embeds a username and password.
# Describe the target safely using only the database name parsed from it.
SAFE_DB_DESCRIPTION="$(node -e "console.log(new URL(process.argv[1]).pathname.replace(/^\//, '') || 'unknown-database')" "$DATABASE_URL")"
echo "Backing up database '$SAFE_DB_DESCRIPTION' to: $BACKUP_FILE"

cleanup_partial_backup() {
  rm -f "$TMP_BACKUP_FILE" "$TMP_MANIFEST_FILE"
  if [[ "$COMPLETED" != true ]]; then
    rm -f "$BACKUP_FILE" "$MANIFEST_FILE"
  fi
}
trap cleanup_partial_backup EXIT

pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$TMP_BACKUP_FILE"

# Build and validate both artifacts under temporary names first. The EXIT trap
# removes temporary and final names until both final moves have succeeded.
BACKUP_SIZE_BYTES="$(wc -c < "$TMP_BACKUP_FILE" | tr -d ' ')"
BACKUP_SHA256="$(node -e "const { createHash } = require('node:crypto'); const { createReadStream } = require('node:fs'); const h=createHash('sha256'); createReadStream(process.argv[1]).on('data',c=>h.update(c)).on('end',()=>console.log(h.digest('hex'))).on('error',e=>{console.error(e.message);process.exit(1)})" "$TMP_BACKUP_FILE")"
PLATFORM_PROBE_COUNT="$(psql "$DATABASE_URL" --tuples-only --no-align --quiet -c 'SELECT count(*) FROM platform_probe' | tr -d ' ')"

cat > "$TMP_MANIFEST_FILE" <<JSON
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backupFile": "$(basename "$BACKUP_FILE")",
  "backupSizeBytes": $BACKUP_SIZE_BYTES,
  "backupSha256": "$BACKUP_SHA256",
  "expectedRowCounts": {
    "platform_probe": $PLATFORM_PROBE_COUNT
  }
}
JSON

mv "$TMP_BACKUP_FILE" "$BACKUP_FILE"
mv "$TMP_MANIFEST_FILE" "$MANIFEST_FILE"
COMPLETED=true
trap - EXIT

echo "Backup complete."
echo "  Encrypted dump: $BACKUP_FILE ($BACKUP_SIZE_BYTES bytes, sha256 $BACKUP_SHA256)"
echo "  Manifest:       $MANIFEST_FILE"
```

The manifest's `backupFile` (exact basename) and `backupSha256` bind it to one specific ciphertext — `restore-drill.sh` (Task 3) refuses to proceed if a backup file and manifest are mismatched or if the ciphertext's actual hash does not match what the manifest recorded.

- [ ] **Step 2: Make it executable**

```bash
chmod +x tooling/scripts/backup.sh
```

- [ ] **Step 3: Run it against the local Compose PostgreSQL**

This reads `DATABASE_URL` and `BACKUP_AGE_RECIPIENT` directly out of your local `.env` with a targeted `grep`/`cut`, rather than `source .env` — sourcing would execute the entire file as shell code, which is unnecessary risk for reading two known, simple `KEY=value` lines you already trust the content of.

```bash
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2-)"
BACKUP_AGE_RECIPIENT="$(grep -m1 '^BACKUP_AGE_RECIPIENT=' .env | cut -d= -f2-)"
DATABASE_URL="$DATABASE_URL" BACKUP_AGE_RECIPIENT="$BACKUP_AGE_RECIPIENT" \
  tooling/scripts/backup.sh tooling/scripts/.local-backups
```

Expected (the exact timestamp in the filenames is generated at runtime, so it cannot be written literally here — Step 4 shows how to discover it rather than guess it):

```
Backing up database 'littlearc' to: tooling/scripts/.local-backups/littlearc-<runtime-generated-timestamp>.dump.age
Backup complete.
  Encrypted dump: tooling/scripts/.local-backups/littlearc-<runtime-generated-timestamp>.dump.age (NNN bytes, sha256 <64 hex characters>)
  Manifest:       tooling/scripts/.local-backups/littlearc-<runtime-generated-timestamp>.manifest.json
```

- [ ] **Step 4: Discover the generated filenames and confirm the manifest is real and non-sensitive**

```bash
LATEST_BACKUP_FILE="$(ls -t tooling/scripts/.local-backups/*.dump.age | head -n 1)"
LATEST_MANIFEST_FILE="$(ls -t tooling/scripts/.local-backups/*.manifest.json | head -n 1)"
echo "Backup file:   $LATEST_BACKUP_FILE"
echo "Manifest file: $LATEST_MANIFEST_FILE"
cat "$LATEST_MANIFEST_FILE"
```

Expected: `$LATEST_BACKUP_FILE` and `$LATEST_MANIFEST_FILE` print real paths under `tooling/scripts/.local-backups/`; the manifest is valid JSON with `createdAt`, `backupFile`, `backupSizeBytes`, `backupSha256` (64 hex characters), and `expectedRowCounts.platform_probe` equal to `1` — no connection string, password, or hostname anywhere in it. Keep these two shell variables set — Task 3 Steps 4 and 5 reuse them.

- [ ] **Step 5: Prove the backup file is genuinely encrypted (no plaintext dump ever touched disk)**

```bash
pg_restore --list "$LATEST_BACKUP_FILE"
```

Expected: `pg_restore` fails to parse it as a dump archive (something like `input file does not appear to be a valid archive`) — proving the file on disk is ciphertext, not a readable `pg_dump` archive.

- [ ] **Step 6: Add `tooling/scripts/.local-backups/` to the root `.gitignore`**

Add this line to the root `.gitignore` (created in `PLAT-01-02-MOB-01-workspace-mobile.md`):

```
tooling/scripts/.local-backups/
```

- [ ] **Step 7: Commit**

```bash
git add tooling/scripts/backup.sh .gitignore
git commit -m "feat: add encrypted backup.sh (pg_dump streamed directly into age)"
```

---

### Task 3: `restore-drill.sh`

**Files:**
- Create: `tooling/scripts/restore-drill.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: DATABASE_URL=... BACKUP_AGE_IDENTITY_FILE=... tooling/scripts/restore-drill.sh <encrypted-backup-file> <manifest-file>

Restores an age-encrypted, custom-format pg_dump backup into a uniquely named
scratch database generated by this script. There is no target-database
argument, so the source database named in DATABASE_URL is structurally
ineligible as a restore target. Refuses to proceed if the manifest's basename and
SHA-256 do not match the provided backup file, before ever attempting to
decrypt it. Verifies row counts against the backup's manifest, and cleans up
the scratch database (and any decrypted temp file) on success or failure.

Required environment variables:
  DATABASE_URL              PostgreSQL connection string. Only its host, port,
                             user, and password are used to reach the server —
                             its own database name is used only for the final
                             untouched-source verification message.
  BACKUP_AGE_IDENTITY_FILE  Path to the age private key file used to decrypt
                             the backup.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 ]]; then
  echo "error: missing required arguments <encrypted-backup-file> and <manifest-file>." >&2
  usage >&2
  exit 1
fi

BACKUP_FILE="$1"
MANIFEST_FILE="$2"

: "${DATABASE_URL:?DATABASE_URL is required. Run with --help for usage.}"
: "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required. Run with --help for usage.}"

for tool in pg_restore age psql node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: required tool '$tool' is not installed." >&2
    exit 1
  fi
done

[[ -f "$BACKUP_FILE" ]] || { echo "error: backup file not found: $BACKUP_FILE" >&2; exit 1; }
[[ -f "$MANIFEST_FILE" ]] || { echo "error: manifest file not found: $MANIFEST_FILE" >&2; exit 1; }
[[ -f "$BACKUP_AGE_IDENTITY_FILE" ]] || { echo "error: age identity file not found: $BACKUP_AGE_IDENTITY_FILE" >&2; exit 1; }

# Bind this restore to the exact ciphertext the manifest describes, before
# ever attempting to decrypt anything.
MANIFEST_BACKUP_FILE="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).backupFile)" "$MANIFEST_FILE")"
MANIFEST_BACKUP_SHA256="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).backupSha256)" "$MANIFEST_FILE")"
ACTUAL_BACKUP_BASENAME="$(basename "$BACKUP_FILE")"

if [[ "$MANIFEST_BACKUP_FILE" != "$ACTUAL_BACKUP_BASENAME" ]]; then
  echo "error: manifest is for '$MANIFEST_BACKUP_FILE' but the provided backup file is '$ACTUAL_BACKUP_BASENAME'. Refusing to restore a mismatched backup/manifest pair." >&2
  exit 1
fi

ACTUAL_BACKUP_SHA256="$(node -e "const { createHash } = require('node:crypto'); const { createReadStream } = require('node:fs'); const h=createHash('sha256'); createReadStream(process.argv[1]).on('data',c=>h.update(c)).on('end',()=>console.log(h.digest('hex'))).on('error',e=>{console.error(e.message);process.exit(1)})" "$BACKUP_FILE")"

if [[ "$MANIFEST_BACKUP_SHA256" != "$ACTUAL_BACKUP_SHA256" ]]; then
  echo "error: backup file content does not match the manifest's recorded SHA-256 (expected $MANIFEST_BACKUP_SHA256, got $ACTUAL_BACKUP_SHA256). Refusing to restore a possibly corrupted or tampered backup." >&2
  exit 1
fi

url_with_database() {
  # $1: base URL, $2: database name
  node -e "const u = new URL(process.argv[1]); u.pathname = '/' + process.argv[2]; console.log(u.toString())" "$1" "$2"
}

SOURCE_DB_NAME="$(node -e "console.log(new URL(process.argv[1]).pathname.replace(/^\//, ''))" "$DATABASE_URL")"
ADMIN_URL="$(url_with_database "$DATABASE_URL" postgres)"
SCRATCH_DB_NAME="littlearc_restore_drill_$(date -u +%Y%m%dT%H%M%SZ)_$$"

DECRYPTED_FILE="$(mktemp "${TMPDIR:-/tmp}/littlearc-restore-drill.XXXXXX")"
chmod 600 "$DECRYPTED_FILE"

cleanup() {
  echo "Cleaning up decrypted temp file and scratch database ${SCRATCH_DB_NAME}..."
  rm -f "$DECRYPTED_FILE"
  # Deliberately not redirected to /dev/null: per the approved design, cleanup
  # must preserve actionable logs on failure, not silently swallow them. `||`
  # (not `&&`) only stops a failed cleanup command from aborting the trap
  # under `set -e` — psql's own stdout/stderr still reach the terminal.
  psql "$ADMIN_URL" --quiet -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${SCRATCH_DB_NAME}'" \
    || echo "warning: failed to terminate lingering connections to ${SCRATCH_DB_NAME} (see psql output above)" >&2
  psql "$ADMIN_URL" --quiet -c "DROP DATABASE IF EXISTS ${SCRATCH_DB_NAME}" \
    || echo "warning: failed to drop scratch database ${SCRATCH_DB_NAME} — manual cleanup required: DROP DATABASE ${SCRATCH_DB_NAME};" >&2
}
trap cleanup EXIT

echo "Restoring into scratch database: $SCRATCH_DB_NAME (source database '$SOURCE_DB_NAME' is never touched)"
psql "$ADMIN_URL" --quiet -c "CREATE DATABASE ${SCRATCH_DB_NAME}"

SCRATCH_URL="$(url_with_database "$ADMIN_URL" "$SCRATCH_DB_NAME")"

# pg_restore cannot read a seekable custom-format archive from a pipe/stdin,
# so the decrypted bytes must land in a real (600-permission, auto-deleted)
# file rather than being piped straight through — unlike backup.sh, which
# never needs an unencrypted intermediate because pg_dump's write side has
# no such seek requirement.
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" --output "$DECRYPTED_FILE" "$BACKUP_FILE"
pg_restore --no-owner --no-privileges --dbname "$SCRATCH_URL" "$DECRYPTED_FILE"

EXPECTED_PLATFORM_PROBE_COUNT="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).expectedRowCounts.platform_probe)" "$MANIFEST_FILE")"
ACTUAL_PLATFORM_PROBE_COUNT="$(psql "$SCRATCH_URL" --tuples-only --no-align --quiet -c 'SELECT count(*) FROM platform_probe' | tr -d ' ')"

if [[ "$EXPECTED_PLATFORM_PROBE_COUNT" != "$ACTUAL_PLATFORM_PROBE_COUNT" ]]; then
  echo "error: row count mismatch for platform_probe. expected=$EXPECTED_PLATFORM_PROBE_COUNT actual=$ACTUAL_PLATFORM_PROBE_COUNT" >&2
  exit 1
fi

echo "Restore drill PASSED. platform_probe row count matches manifest: $ACTUAL_PLATFORM_PROBE_COUNT"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x tooling/scripts/restore-drill.sh
```

- [ ] **Step 3: Confirm the CLI argument validation is correct**

```bash
tooling/scripts/restore-drill.sh --help; echo "exit: $?"
```

Expected: prints the usage text, `exit: 0`.

```bash
tooling/scripts/restore-drill.sh; echo "exit: $?"
```

Expected: prints `error: missing required arguments <encrypted-backup-file> and <manifest-file>.` to stderr followed by the usage text, `exit: 1` — missing arguments must fail closed, unlike `--help`.

- [ ] **Step 4: Confirm the manifest-to-ciphertext binding refuses a mismatched pair**

Using the real backup/manifest pair from Task 2 (`$LATEST_BACKUP_FILE`/`$LATEST_MANIFEST_FILE`), prove the binding check rejects a renamed copy before this plan ever runs it against the real thing:

```bash
cp "$LATEST_BACKUP_FILE" /tmp/renamed-backup-for-binding-check.dump.age
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2-)"
BACKUP_AGE_IDENTITY_FILE="$(grep -m1 '^BACKUP_AGE_IDENTITY_FILE=' .env | cut -d= -f2-)"
DATABASE_URL="$DATABASE_URL" BACKUP_AGE_IDENTITY_FILE="$BACKUP_AGE_IDENTITY_FILE" \
  tooling/scripts/restore-drill.sh /tmp/renamed-backup-for-binding-check.dump.age "$LATEST_MANIFEST_FILE"
echo "exit: $?"
rm -f /tmp/renamed-backup-for-binding-check.dump.age
```

Expected: `error: manifest is for '<original-basename>' but the provided backup file is 'renamed-backup-for-binding-check.dump.age'. Refusing to restore a mismatched backup/manifest pair.`, `exit: 1` — no scratch database is created (the check runs before any `psql`/`age`/`pg_restore` call).

- [ ] **Step 5: Run it against the real backup produced in Task 2**

```bash
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2-)"
BACKUP_AGE_IDENTITY_FILE="$(grep -m1 '^BACKUP_AGE_IDENTITY_FILE=' .env | cut -d= -f2-)"
DATABASE_URL="$DATABASE_URL" BACKUP_AGE_IDENTITY_FILE="$BACKUP_AGE_IDENTITY_FILE" \
  tooling/scripts/restore-drill.sh "$LATEST_BACKUP_FILE" "$LATEST_MANIFEST_FILE"
```

Expected:

```
Restoring into scratch database: littlearc_restore_drill_<runtime-generated-timestamp>_<pid> (source database 'littlearc' is never touched)
Restore drill PASSED. platform_probe row count matches manifest: 1
Cleaning up decrypted temp file and scratch database littlearc_restore_drill_<runtime-generated-timestamp>_<pid>...
```

- [ ] **Step 6: Confirm the scratch database and decrypted temp file are both gone**

```bash
docker compose exec postgres psql -U littlearc -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'littlearc_restore_drill_%'"
```

Expected: `(0 rows)` — no lingering scratch database. The decrypted temp file was removed by the script's own `trap`; there is nothing further to check for it since `mktemp` created it under a system temp directory that this plan does not otherwise touch.

- [ ] **Step 7: Confirm the source database is untouched**

```bash
docker compose exec postgres psql -U littlearc -d littlearc -c 'SELECT count(*) FROM platform_probe'
```

Expected: `1` — unchanged from before the drill.

- [ ] **Step 8: Commit**

```bash
git add tooling/scripts/restore-drill.sh
git commit -m "feat: add restore-drill.sh with manifest binding, scratch-database isolation, and row-count verification"
```

---

### Task 4: Root convenience script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add a root `backup` script**

In the root `package.json` `"scripts"` block, add:

```json
    "backup": "bash tooling/scripts/backup.sh",
```

`restore-drill.sh` is deliberately not wrapped here — it always takes two explicit file arguments (the backup and its manifest), so direct invocation (as in Task 3 Step 5) is clearer than a wrapper that would need argument pass-through anyway.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add root backup convenience script"
```

---

### Task 5: Update `docs/core/implementation-status.md`

**Files:**
- Modify: `docs/core/implementation-status.md`

Apply these edits only after every other M1 plan (`PLAT-01` through `PLAT-08`, `MOB-01`, `OBS-02`, and this plan's `PLAT-09`) is actually done, with real commit SHAs in hand — do not pre-fill this file with SHAs from work that has not happened yet.

- [ ] **Step 0: Collect the final commit SHA for each plan file**

Run one `git log` lookup per plan file, using each file's actual final commit message from this plan set (each is the message on that file's last "Commit" step):

```bash
git log -1 --format=%h --grep='^style: reformat apps/mobile to match biome\.json' -- .
git log -1 --format=%h --grep='^chore: add root db:migrate and db:seed convenience scripts' -- .
git log -1 --format=%h --grep='^feat: add packages/api-types type-only AppRouter export' -- .
git log -1 --format=%h --grep='^feat: add automated expo bundle leak check' -- .
git log -1 --format=%h --grep='^feat: add observability redaction utility' -- .
git log -1 --format=%h --grep='^chore: add root backup convenience script' -- .
```

Expected: each prints a real short SHA from your own work. `PLAT-01`, `PLAT-02`, and `MOB-01` share one plan file (`PLAT-01-02-MOB-01-workspace-mobile.md`), so they share the first SHA above; `PLAT-06` and `PLAT-07` share the third SHA (same file as `PLAT-05`, but `PLAT-07` finishes last — use that one for both `PLAT-06` and `PLAT-07` rows since `PLAT-06`'s own last commit precedes it in the same file and both merge into the same final state); `PLAT-04` and `OBS-02` share the fifth SHA. The sixth command is `PLAT-09`'s own last implementation commit (Task 4 of this plan, which precedes this status update) — use it for the `PLAT-09` row. Copy each resulting SHA into the matching `<sha>` cell in Step 3 below — do not leave any `<sha>` placeholder unresolved.

- [ ] **Step 1: Update "Current focus"**

Find:

```
## Current focus

_Nothing actively in progress. Next up: **M1 — Platform bootstrap & vertical slice** (needs its own implementation plan first)._
```

Replace with:

```
## Current focus

_M1 is local-complete. Next up: **M2 — Native Feasibility + Auth/Org/RLS Foundation** (needs its own implementation plan first)._
```

- [ ] **Step 2: Update the milestone summary table**

Find the M1 row:

```
| **M1** — Platform bootstrap + vertical slice | ☐ Not started | 0 / 12 |
```

Replace with:

```
| **M1** — Platform bootstrap + vertical slice | ✅ Local-complete | 11 / 11 active · 1 deferred |
```

(11 active work packages — `PLAT-01` through `PLAT-09`, `MOB-01`, `OBS-02` — plus `PLAT-10` deferred, matching the 12 total rows already in the M1 table.)

- [ ] **Step 3: Replace the entire M1 section**

Find the M1 heading and table:

```
## M1 — Workspace/Platform Bootstrap and One-Call Vertical Slice  ·  ☐ Not started

Prereq: PLAT-00 (✅). **Needs an implementation plan before execution.**

| WP | Deliverable | Status | Note |
|---|---|---|---|
| PLAT-01 | pnpm workspace + Turborepo + Biome scaffold | ☐ | |
| PLAT-02 | Shared TypeScript/Biome config package (`packages/config`) | ☐ | |
| PLAT-03 | Docker Compose local stack (postgres, minio, mailpit, clamav) | ☐ | |
| PLAT-04 | CI pipeline baseline (`.github/workflows/ci.yml`) | ☐ | |
| PLAT-05 | `apps/api` skeleton: Fastify + tRPC + health + rate-limit framework | ☐ | |
| PLAT-06 | `packages/contracts` skeleton (Zod conventions, base enums) | ☐ | |
| PLAT-07 | `packages/api-types` type-only AppRouter export | ☐ | |
| PLAT-08 | One-call vertical slice (Expo → tRPC → Fastify → Postgres) | ☐ | |
| MOB-01 | Expo Router app skeleton bootstrap (New Arch confirmed) | ☐ | Note: design-system app already exists; reconcile with `app.config.ts` |
| OBS-02 | `packages/observability` skeleton (allowlist + redaction stubs) | ☐ | |
| PLAT-09 | `tooling/scripts` skeleton (`backup.sh`, `restore-drill.sh`, seeds) | ☐ | |
| PLAT-10 | Staging deploy: Railway (Singapore) + staging PG + R2 staging bucket | ☐ | Depends on PLAT-05/PLAT-08 |

**Exit gate:** CI green (install/lint/typecheck/build); healthy `docker compose up`; vertical slice returns real PG data via tRPC on iOS + Android; Fastify/tRPC compat smoke test; `start:all` deployed to Railway staging with public `/health/ready` + mobile call passing.
```

Replace with (fill in each `<sha>` with that task's actual final commit SHA from your own work):

```
## M1 — Workspace/Platform Bootstrap and One-Call Vertical Slice  ·  ✅ Local-complete

Prereq: PLAT-00 (✅). Implementation plans: `docs/impl-plan/M1/*.md`.

| WP | Deliverable | Status | Note |
|---|---|---|---|
| PLAT-01 | pnpm workspace + Turborepo + Biome scaffold | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-01-02-MOB-01-workspace-mobile.md` |
| PLAT-02 | Shared TypeScript/Biome config package (`packages/config`) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-01-02-MOB-01-workspace-mobile.md` |
| PLAT-03 | Docker Compose local stack (postgres, minio, mailpit, clamav) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-03-database-local-stack.md` |
| PLAT-04 | CI pipeline baseline (`.github/workflows/ci.yml`) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-04-OBS-02-ci-observability.md` |
| PLAT-05 | `apps/api` skeleton: Fastify + tRPC + health + rate-limit framework | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-05-06-07-api-contracts-types.md` |
| PLAT-06 | `packages/contracts` skeleton (Zod conventions, base enums) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-05-06-07-api-contracts-types.md` |
| PLAT-07 | `packages/api-types` type-only AppRouter export | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-05-06-07-api-contracts-types.md` |
| PLAT-08 | One-call vertical slice (Expo → tRPC → Fastify → Postgres) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-08-one-call-vertical-slice.md` |
| MOB-01 | Expo Router app skeleton bootstrap (New Arch confirmed) | ✅ | `<sha>` · migrated in place, not re-scaffolded — `docs/impl-plan/M1/PLAT-01-02-MOB-01-workspace-mobile.md` |
| OBS-02 | `packages/observability` skeleton (allowlist + redaction stubs) | ✅ | `<sha>` · `docs/impl-plan/M1/PLAT-04-OBS-02-ci-observability.md` |
| PLAT-09 | `tooling/scripts` skeleton (`backup.sh`, `restore-drill.sh`, seeds) | ✅ | `<sha>` · seed entrypoint already delivered by PLAT-03's `packages/db` |
| PLAT-10 | Staging deploy: Railway (Singapore) + staging PG + R2 staging bucket | ⏸ Deferred | Trigger: a second developer or tester needs remote access (`docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md` §2.2). Depends on PLAT-05/PLAT-08 (both ✅) |

**Local-complete gate (reached without PLAT-10):** `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` are green in CI; CI's split non-database, database, and API test commands are all green; and the aggregate `pnpm test` command is green locally with Compose PostgreSQL healthy (`docs/impl-plan/M1/PLAT-04-OBS-02-ci-observability.md`). `docker compose ps` shows all four local services healthy; the one-call vertical slice returns real PostgreSQL data through tRPC on both a real iOS simulator and a real Android emulator; the Fastify/tRPC real-HTTP compatibility test passes in CI; the encrypted backup/restore drill passes locally with matching row counts. This milestone does **not** claim a staging `/health/ready` response or a mobile call against a deployed environment — no such evidence exists, because `PLAT-10` is deferred, not done.

**Full milestone exit gate (unchanged, still pending `PLAT-10`):** everything above, plus the combined `start:all` image deployed to Railway staging (Singapore) with its own staging PostgreSQL database and a separate R2 staging bucket/token, with the public staging `/health/ready` endpoint and a mobile call against staging both succeeding.
```

- [ ] **Step 4: Add a Changelog entry**

Get today's date in the same `YYYY-MM-DD` format the existing Changelog entries use:

```bash
date -u +%Y-%m-%d
```

Append a new bullet to the `## Changelog` section at the end of the file, replacing `<date-from-command-above>` with that command's real output:

```
- **<date-from-command-above>** — M1 recorded as ✅ local-complete: `PLAT-01`–`PLAT-09`, `MOB-01`, `OBS-02` done per `docs/impl-plan/M1/*.md`; `PLAT-10` explicitly deferred with its remote-collaboration trigger. No staging evidence is claimed. Next: M2 needs its own implementation plan.
```

- [ ] **Step 5: Commit**

```bash
git add docs/core/implementation-status.md
git commit -m "docs: record M1 as local-complete, defer PLAT-10 with its trigger"
```

---

### Task 6: Update `docs/core/implementation-roadmap.md`

**Files:**
- Modify: `docs/core/implementation-roadmap.md`

- [ ] **Step 1: Add a local-complete gate paragraph**

Find the existing M1 exit-gate paragraph (§8, M1 subsection):

```
**Exit gate.** `pnpm install`, `pnpm lint`, `pnpm typecheck`, and a build task pass in CI; `docker compose up -d` brings up a fully healthy local stack; the one-call vertical slice returns real PostgreSQL data through tRPC on both iOS and Android; the Fastify/tRPC version-compatibility smoke test passes in CI; the combined `start:all` image is deployed to Railway staging (Singapore) with its own staging PostgreSQL database and a separate R2 staging bucket/token, and the public staging `/health/ready` endpoint and a mobile call against staging both succeed (`PLAT-10`).
```

Insert this new paragraph immediately **before** it (leave the quoted paragraph above unchanged — it remains the definition of the *full* milestone exit gate, still pending `PLAT-10`):

```
**Local-complete gate (reached in the initial M1 execution; `PLAT-10` deferred).** `pnpm install`, `pnpm lint`, `pnpm typecheck`, and a build task pass in CI; `docker compose up -d` brings up a fully healthy local stack (PostgreSQL, MinIO, Mailpit, ClamAV); the one-call vertical slice returns real PostgreSQL data through tRPC on both a real iOS simulator and a real Android emulator; the Fastify/tRPC real-HTTP compatibility test passes in CI; the encrypted backup/restore drill passes locally with matching row counts. `PLAT-10` (Railway staging, staging PostgreSQL, R2 staging bucket, public `/health/ready`, and a mobile call against staging) is explicitly deferred until a second developer or tester needs remote access — see `docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md` §2.2 and the implementation plans in `docs/impl-plan/M1/`.
```

- [ ] **Step 2: Update the `PLAT-10` row's dependency note**

Find:

```
| `PLAT-10` | Staging deployment ownership: provision the Railway staging project (Singapore region), a staging PostgreSQL database, and a separate R2 staging bucket/token (distinct from any future production credentials); deploy the combined `start:all` image (the `PLAT-08` one-call vertical slice) to that staging project; verify the public staging `/health/ready` endpoint and a real mobile-app call against staging | `railway.toml` (or dashboard-recorded equivalent, referenced from this roadmap), `apps/api/Dockerfile`, `apps/api/src/all.ts` | Staging `/health/ready` returns 200 over the public internet with PostgreSQL reachable; the mobile app, pointed at the staging API URL, completes the same vertical-slice call that passes locally in `PLAT-08`; recorded screen capture of both checks. `DATA-05` (M2) later upgrades this same pre-deploy step to also run pg-boss's schema migrations alongside Drizzle's |
```

Replace only the description text (keep the surface/validation columns unchanged) by prepending a deferral note:

```
| `PLAT-10` | **Deferred** — trigger: a second developer or tester needs remote access (see `docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md` §2.2). Staging deployment ownership: provision the Railway staging project (Singapore region), a staging PostgreSQL database, and a separate R2 staging bucket/token (distinct from any future production credentials); deploy the combined `start:all` image (the `PLAT-08` one-call vertical slice) to that staging project; verify the public staging `/health/ready` endpoint and a real mobile-app call against staging | `railway.toml` (or dashboard-recorded equivalent, referenced from this roadmap), `apps/api/Dockerfile`, `apps/api/src/all.ts` | Staging `/health/ready` returns 200 over the public internet with PostgreSQL reachable; the mobile app, pointed at the staging API URL, completes the same vertical-slice call that passes locally in `PLAT-08`; recorded screen capture of both checks. `DATA-05` (M2) later upgrades this same pre-deploy step to also run pg-boss's schema migrations alongside Drizzle's |
```

- [ ] **Step 3: Commit**

```bash
git add docs/core/implementation-roadmap.md
git commit -m "docs: add M1 local-complete gate and PLAT-10 deferral trigger to roadmap"
```

---

### Task 7: Compile M1 exit evidence

**Files:** none — this task compiles evidence already produced by the other six M1 plans plus this one; it does not introduce new code.

- [ ] **Step 1: Full local stack health**

```bash
docker compose ps
```

Expected: all four services (`littlearc-postgres`, `littlearc-minio`, `littlearc-mailpit`, `littlearc-clamav`) show `(healthy)`. Save this output as evidence.

- [ ] **Step 2: CI evidence**

Record the GitHub Actions run URL from `PLAT-04-OBS-02-ci-observability.md` Task 6 Step 3 / Task 10 Step 3, showing all four jobs green.

- [ ] **Step 3: Vertical-slice evidence on both platforms**

Confirm the recordings/screenshots from `PLAT-08-one-call-vertical-slice.md` Task 9 exist: the `/_dev/platform` route showing the seeded value on a real iOS simulator and a real Android emulator, plus the database-unavailable/recovery sequence.

- [ ] **Step 4: Backup/restore drill evidence**

Confirm the terminal output from Task 2 Steps 3–5 (backup) and Task 3 Steps 3–7 (restore drill, including the CLI-validation and manifest-binding refusal proofs, the `PASSED` line, and the empty scratch-database query) is saved.

- [ ] **Step 5: Final full-workspace green run**

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm exec turbo run test --filter='!@littlearc/api' --filter='!@littlearc/db'
pnpm --filter @littlearc/db run test
pnpm --filter @littlearc/api run test
pnpm --filter @littlearc/mobile run test:bundle-leak
```

Expected: every command exits `0`.

- [ ] **Step 6: Confirm git is clean**

```bash
git status --porcelain
```

Expected: empty.

---

## M1 local-complete definition (final)

M1 is **local-complete** when all of the following hold, none of them involving a remote/staging environment:

- The root workspace has exactly one `pnpm-lock.yaml`; `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` are green in CI; CI's split test suites are green; and aggregate `pnpm test` is green locally with Compose PostgreSQL healthy.
- `docker compose ps` shows PostgreSQL, MinIO, Mailpit, and ClamAV all `(healthy)`.
- The `platform_probe` row is seeded and idempotently re-seedable.
- The real, non-mocked `platform.ping` tRPC HTTP integration test passes locally and in CI.
- The named rate-limit policy registry returns `429` after its configured threshold on `platform.rateLimitProbe`.
- `/health/live` and `/health/ready` behave as designed, including the fail-closed `503` case.
- Emitted logs redact sensitive fields; `INTERNAL_SERVER_ERROR` responses never leak their raw message.
- The Expo-exported mobile bundle contains no Fastify, Drizzle, PostgreSQL driver, or secret-bearing identifier.
- `packages/observability`'s allowlist rejects every event name, statically and dynamically, while it remains empty.
- The developer-only `/_dev/platform` route shows the seeded value on a real iOS simulator and a real Android emulator, and shows the designed database-unavailable/recovery behavior.
- `docker build -f apps/api/Dockerfile .` succeeds locally and in CI, and is never pushed anywhere.
- GitHub Actions shows all four CI jobs green on a real run.
- `backup.sh` produces a verifiably encrypted backup with a non-sensitive manifest bound to it by exact basename and SHA-256, atomically (no partial ciphertext or manifest survives a failed run), and never prints the raw `DATABASE_URL`; `restore-drill.sh` validates that binding before decrypting anything, refuses to run with missing arguments (while `--help` still exits `0`), accepts no caller-selected target database, and restores only into its own isolated scratch database with matching row counts before cleaning up unconditionally.
- `docs/core/implementation-status.md` and `docs/core/implementation-roadmap.md` both record M1 as local-complete, with `PLAT-10` named and deferred with its exact trigger (a second developer or tester needing remote access) — and neither file claims any staging evidence that does not exist.

`PLAT-10` remains the only work package standing between this local-complete state and the full M1 exit gate defined in `docs/core/implementation-roadmap.md`.
