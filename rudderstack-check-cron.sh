#!/bin/zsh
# Cron wrapper for synthetic-rudderstack-check.js.
# Installed as: */30 * * * * <this script>
# Logs every run to ~/Library/Logs/rudderstack-check.log; on failure sends a
# macOS notification, a Slack ping, and an email ping.
#
# Notification settings (Slack webhook URL, email address/method) live in
# ~/.config/nourish-checks/notify.env — kept out of the repo because the
# webhook URL is a secret.
#
# Run with --test-notify to fire all three pings without a real failure.

export PATH="/Users/geminpak/.local/bin:/usr/local/bin:/usr/bin:/bin"
REPO="/Users/geminpak/Documents/Github Webflow/nourish-long-view-labs"
LOG="$HOME/Library/Logs/rudderstack-check.log"
ENV_FILE="$HOME/.config/nourish-checks/notify.env"

[ -f "$ENV_FILE" ] && source "$ENV_FILE"

notify_failure() {
  local detail="$1"
  local subject="RudderStack synthetic check FAILED"
  local body="Viewed Page events may be dropping for non-interacting visitors on nourish.com.

$detail

Log: ~/Library/Logs/rudderstack-check.log
Runbook: see rudderstack-must-load-eagerly — never defer e.loadJS() in global-footer.html."

  osascript -e 'display notification "Viewed Page events may be dropping. See ~/Library/Logs/rudderstack-check.log" with title "RudderStack check FAILED" sound name "Basso"'

  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    local payload
    payload=$(SUBJECT="$subject" BODY="$body" python3 -c \
      'import json,os; print(json.dumps({"text": ":rotating_light: *" + os.environ["SUBJECT"] + "*\n" + os.environ["BODY"]}))')
    curl -sf -X POST -H 'Content-type: application/json' \
      --data "$payload" "$SLACK_WEBHOOK_URL" >> "$LOG" 2>&1 \
      || echo "(slack ping failed)" >> "$LOG"
  else
    echo "(slack ping skipped: SLACK_WEBHOOK_URL not set in $ENV_FILE)" >> "$LOG"
  fi

  if [ "$EMAIL_METHOD" = "mailapp" ] && [ -n "$ALERT_EMAIL_TO" ]; then
    osascript \
      -e 'on run argv' \
      -e 'tell application "Mail"' \
      -e 'set m to make new outgoing message with properties {subject:item 1 of argv, content:item 2 of argv, visible:false}' \
      -e 'tell m to make new to recipient with properties {address:item 3 of argv}' \
      -e 'send m' \
      -e 'end tell' \
      -e 'end run' \
      -- "$subject" "$body" "$ALERT_EMAIL_TO" >> "$LOG" 2>&1 \
      || echo "(email ping failed — is Mail.app signed in / automation allowed?)" >> "$LOG"
  fi
}

if [ "$1" = "--test-notify" ]; then
  notify_failure "(this is a TEST ping — the check did not actually fail)"
  echo "Test pings sent (macOS + Slack + email where configured)."
  exit 0
fi

cd "$REPO" || exit 1
echo "==== $(date '+%Y-%m-%d %H:%M:%S') ====" >> "$LOG"

if ! node synthetic-rudderstack-check.js >> "$LOG" 2>&1; then
  notify_failure "Failed at $(date '+%Y-%m-%d %H:%M'). Last log lines:
$(tail -12 "$LOG")"
fi
