#!/usr/bin/env bash
# Restore everything removed in the 2026-06-23 admin mock-feature cleanup.
# Run from repo root: bash _quarantine/admin/2026-06-23/restore.sh

set -e
echo "Restoring AdminModulePage.tsx and related changes from git..."
git checkout HEAD -- apps/admin/src/pages/AdminModulePage.tsx
git checkout HEAD -- apps/admin/src/App.tsx
git checkout HEAD -- apps/admin/src/modules/admin/navigation/admin-navigation.config.ts
echo "Done. All files restored to pre-cleanup state."
