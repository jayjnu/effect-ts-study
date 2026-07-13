#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/copy-cli-core.sh [--force]

Copies these directories from ../effect-todo-cli/src into this assignment:
  - domain -> domain
  - services -> services
  - programs -> programs
  - layers -> layers
  - cli -> adapters/cli

By default, the script refuses to overwrite target directories that already
contain files other than .gitkeep. Use --force to replace them.
EOF
}

force=false

case "${1:-}" in
  "")
    ;;
  "--force")
    force=true
    ;;
  "-h" | "--help")
    usage
    exit 0
    ;;
  *)
    usage
    exit 1
    ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
assignment_dir="$(cd -- "${script_dir}/.." && pwd)"
repo_root="$(cd -- "${assignment_dir}/../.." && pwd)"
source_root="${repo_root}/assignments/effect-todo-cli/src"
target_root="${assignment_dir}/src"

copy_entries=(
  "domain:domain"
  "services:services"
  "programs:programs"
  "layers:layers"
  "cli:adapters/cli"
)

for entry in "${copy_entries[@]}"; do
  source_dir="${entry%%:*}"

  if [[ ! -d "${source_root}/${source_dir}" ]]; then
    echo "Missing source directory: ${source_root}/${source_dir}" >&2
    exit 1
  fi
done

for entry in "${copy_entries[@]}"; do
  target_dir="${entry#*:}"
  target="${target_root}/${target_dir}"
  existing_file="$(find "${target}" -type f ! -name ".gitkeep" -print -quit 2>/dev/null || true)"

  if [[ -n "${existing_file}" && "${force}" != true ]]; then
    echo "Refusing to overwrite ${target} because it already contains files." >&2
    echo "First existing file: ${existing_file}" >&2
    echo "Run with --force if you intentionally want to replace copied core files." >&2
    exit 1
  fi
done

for entry in "${copy_entries[@]}"; do
  source_dir="${entry%%:*}"
  target_dir="${entry#*:}"
  target="${target_root}/${target_dir}"

  rm -rf "${target}"
  mkdir -p "$(dirname -- "${target}")"
  cp -R "${source_root}/${source_dir}" "${target}"
done

echo "Copied CLI core and adapter into effect-todo-server:"
for entry in "${copy_entries[@]}"; do
  source_dir="${entry%%:*}"
  target_dir="${entry#*:}"
  echo "  - src/${source_dir} -> src/${target_dir}"
done

echo
echo "Next step: replace file-backed layers with DB-backed transaction/audit layers."
