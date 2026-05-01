#!/usr/bin/env bash
set -euo pipefail

readonly MARKER='<!-- playwright-changed-videos-bot -->'
readonly MAX_BODY_CHARS=65000

root="${RUNNER_TEMP:-/tmp}/pw-changed-videos-pr"
mkdir -p "${root}/s1" "${root}/s2"

gh run download "${GITHUB_RUN_ID}" \
	-n "changed-playwright-videos-${GITHUB_RUN_ID}-1" \
	-D "${root}/s1" 2>/dev/null || true
gh run download "${GITHUB_RUN_ID}" \
	-n "changed-playwright-videos-${GITHUB_RUN_ID}-2" \
	-D "${root}/s2" 2>/dev/null || true

read_summary() {
	local dir=$1
	local f
	for f in "${dir}/summary.md" "${dir}/changed-playwright-videos/summary.md"; do
		if [[ -f "$f" ]]; then
			cat "$f"
			return 0
		fi
	done
	return 1
}

s1=''
s2=''
if out=$(read_summary "${root}/s1"); then s1=$out; fi
if out=$(read_summary "${root}/s2"); then s2=$out; fi

if [[ -z "$s1" && -z "$s2" ]]; then
	echo 'No changed-playwright-videos summaries; skipping PR comment.'
	exit 0
fi

sanitize() {
	sed -E 's/<video[^>]*src="([^"]*)"[^>]*><\/video>/`\1` (in artifact ZIP)/gi'
}

run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
body_file=$(mktemp)
trap 'rm -f "${body_file}"' EXIT

{
	printf '%s\n\n' "${MARKER}"
	printf '## Changed Playwright videos\n\n'
	printf '**Run:** %s\n\n' "${run_url}"
	printf '**Videos:** artifacts `changed-playwright-videos-%s-1` and `…-2` (comments cannot embed video).\n\n' "${GITHUB_RUN_ID}"
	printf '---\n\n'
	if [[ -n "$s1" ]]; then
		printf '### Shard 1\n\n'
		printf '%s\n\n' "$(printf '%s' "$s1" | sanitize)"
		printf '---\n\n'
	fi
	if [[ -n "$s2" ]]; then
		printf '### Shard 2\n\n'
		printf '%s\n' "$(printf '%s' "$s2" | sanitize)"
	fi
} >"${body_file}"

if [[ $(wc -c <"${body_file}") -gt ${MAX_BODY_CHARS} ]]; then
	head -c "${MAX_BODY_CHARS}" "${body_file}" >"${body_file}.trim"
	mv "${body_file}.trim" "${body_file}"
	printf '\n\n_(truncated)_\n' >>"${body_file}"
fi

pr=$(
	gh api "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" \
		--jq '.[] | select(.state == "open") | .number' | head -1
)
if [[ -z "$pr" ]]; then
	echo 'No open PR for this commit; skipping.'
	exit 0
fi

comment_id=$(
	gh api "repos/${GITHUB_REPOSITORY}/issues/${pr}/comments?per_page=100" \
		--jq '.[] | select(.body | test("playwright-changed-videos-bot")) | .id' | head -1
)

if [[ -n "$comment_id" ]]; then
	jq -n --rawfile body "${body_file}" '{body: $body}' |
		gh api --method PATCH \
			"repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
			--input -
	echo "Updated comment ${comment_id} on PR #${pr}"
else
	jq -n --rawfile body "${body_file}" '{body: $body}' |
		gh api --method POST "repos/${GITHUB_REPOSITORY}/issues/${pr}/comments" --input -
	echo "Posted comment on PR #${pr}"
fi
