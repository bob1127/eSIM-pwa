#!/bin/zsh
# launchd 每週呼叫。不含密碼；由 backup-supabase-db.mjs 讀取 .env.backup.local。
set -euo pipefail

export PATH="/opt/homebrew/opt/libpq/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export NVM_DIR="${HOME}/.nvm"
if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${NVM_DIR}/nvm.sh"
fi

PROJECT="/Volumes/Sandisk E61/eISM/Esim專案-PWA(Supabase)/esim-store-front"
LOG_DIR="${HOME}/JekoBackups/supabase"
LOG="${LOG_DIR}/backup.log"

mkdir -p "${LOG_DIR}"
chmod 700 "${HOME}/JekoBackups" "${LOG_DIR}" 2>/dev/null || true

{
  echo "-------- $(date '+%Y-%m-%d %H:%M:%S') --------"
  if [[ ! -f "${PROJECT}/scripts/backup-supabase-db.mjs" ]]; then
    echo "ERROR: 專案磁碟未掛載，略過本次備份。"
    exit 1
  fi
  if [[ ! -f "${PROJECT}/.env.backup.local" ]]; then
    echo "ERROR: 找不到 .env.backup.local"
    exit 1
  fi
  cd "${PROJECT}"
  node scripts/backup-supabase-db.mjs
} >>"${LOG}" 2>&1
