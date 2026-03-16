#!/bin/bash
# Hook PreToolUse: bloque les commandes bash dangereuses
# Lit le JSON de l'outil sur stdin, vérifie le champ "command"

input=$(cat)
command=$(echo "$input" | grep -o '"command":"[^"]*"' | sed 's/"command":"//;s/"$//')

# Liste des patterns dangereux
dangerous_patterns=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf ."
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -fd"
  "git checkout -- ."
  "drop table"
  "DROP TABLE"
  "> /dev/sda"
  "mkfs"
  ":(){:|:&};:"
)

for pattern in "${dangerous_patterns[@]}"; do
  if echo "$command" | grep -qF "$pattern"; then
    echo "BLOCKED: commande dangereuse détectée: $pattern"
    exit 2
  fi
done

exit 0
