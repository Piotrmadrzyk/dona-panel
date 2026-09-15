#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Ten instalator jest przeznaczony dla macOS."
  exit 1
fi

for command_name in node claude git curl security launchctl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Brak wymaganego polecenia: $command_name"
    exit 1
  fi
done

node -e 'const m=Number(process.versions.node.split(".")[0]); if(m<20){console.error("Wymagany Node.js 20 lub nowszy");process.exit(1)}'

claude_path="$(command -v claude)"
claude_version_output="$("$claude_path" --version 2>/dev/null || true)"
CLAUDE_VERSION_OUTPUT="$claude_version_output" node -e '
const found = (process.env.CLAUDE_VERSION_OUTPUT || "").match(/(\d+)\.(\d+)\.(\d+)/);
if (!found) {
  console.error("Nie udało się odczytać wersji Claude Code. Uruchom: claude --version");
  process.exit(1);
}
const actual = found.slice(1).map(Number);
const minimum = [2, 1, 259];
for (let i = 0; i < 3; i += 1) {
  if (actual[i] > minimum[i]) process.exit(0);
  if (actual[i] < minimum[i]) {
    console.error(`Wymagany Claude Code 2.1.259 lub nowszy; wykryto ${actual.join(".")}. Zaktualizuj Claude Code i uruchom instalator ponownie.`);
    process.exit(1);
  }
}
'

runner_dir="$(cd "$(dirname "$0")" && pwd)"
config_dir="$HOME/.config/dona-claude-runner"
log_dir="$HOME/Library/Logs/dona-claude-runner"
agent_file="$HOME/Library/LaunchAgents/pl.probatum.dona-claude-runner.plist"
mkdir -p "$config_dir" "$log_dir" "$(dirname "$agent_file")"

default_runner="piotr-$(scutil --get ComputerName 2>/dev/null | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9._-' || true)"
read -r -p "Nazwa runnera [$default_runner]: " runner_id
runner_id="${runner_id:-$default_runner}"
if [[ ! "$runner_id" =~ ^[a-zA-Z0-9._-]{2,80}$ ]]; then
  echo "Nazwa runnera może zawierać tylko litery, cyfry, kropkę, myślnik i podkreślenie."
  exit 1
fi

read -r -p "Główny katalog repozytoriów [$HOME/Projekty]: " projects_root
projects_root="${projects_root:-$HOME/Projekty}"
projects_root="$(cd "$projects_root" 2>/dev/null && pwd || true)"
if [[ -z "$projects_root" || ! -d "$projects_root" ]]; then
  echo "Podany katalog nie istnieje."
  exit 1
fi

declare -a aliases=(dona-panel canon zenit nikon)
declare -a project_args=()
for alias_name in "${aliases[@]}"; do
  default_path="$projects_root/$alias_name"
  read -r -p "Ścieżka projektu $alias_name [$default_path; Enter pomija, jeśli nie istnieje]: " project_path
  project_path="${project_path:-$default_path}"
  if [[ -d "$project_path" ]]; then
    project_path="$(cd "$project_path" && pwd)"
    project_args+=("$alias_name" "$project_path")
  else
    echo "Pomijam $alias_name — katalog nie istnieje."
  fi
done

if (( ${#project_args[@]} == 0 )); then
  echo "Nie znaleziono żadnego dozwolonego repozytorium."
  exit 1
fi

read -r -s -p "Hasło panelu Dona (zostanie zapisane tylko w Keychain): " panel_secret
echo
if [[ -z "$panel_secret" ]]; then
  echo "Hasło nie może być puste."
  exit 1
fi
/usr/bin/security add-generic-password -U -s dona-claude-runner -a "$runner_id" -w "$panel_secret" >/dev/null
unset panel_secret

node - "$config_dir/config.json" "$runner_id" "$projects_root" "$claude_path" "${project_args[@]}" <<'NODE'
const fs = require('fs');
const [file, runnerId, root, claudePath, ...pairs] = process.argv.slice(2);
const projects = {};
for (let i = 0; i < pairs.length; i += 2) projects[pairs[i]] = { path: pairs[i + 1] };
const config = {
  endpoint: 'https://pmresearch.app.n8n.cloud/webhook/dona-claude-runner',
  runnerId,
  claudePath,
  pollSeconds: 30,
  maxRunMinutes: 45,
  maxOutputBytes: 2000000,
  keychainService: 'dona-claude-runner',
  keychainAccount: runnerId,
  allowedRoots: [root],
  projects,
};
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
NODE

node_path="$(command -v node)"
escaped_node="$(printf '%s' "$node_path" | sed 's/[&/]/\\&/g')"
escaped_runner="$(printf '%s' "$runner_dir/runner.mjs" | sed 's/[&/]/\\&/g')"
escaped_logs="$(printf '%s' "$log_dir" | sed 's/[&/]/\\&/g')"
sed -e "s/__NODE__/$escaped_node/g" -e "s/__RUNNER__/$escaped_runner/g" -e "s/__LOG_DIR__/$escaped_logs/g" \
  "$runner_dir/pl.probatum.dona-claude-runner.plist.template" > "$agent_file"
plutil -lint "$agent_file" >/dev/null

launchctl bootout "gui/$(id -u)" "$agent_file" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$agent_file"
launchctl kickstart -k "gui/$(id -u)/pl.probatum.dona-claude-runner"

echo "Runner został zainstalowany i uruchomiony."
echo "Log: $log_dir/runner.log"
echo "Błędy: $log_dir/runner-error.log"
