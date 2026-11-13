import subprocess
import json
import time
import sys

KNOWN_MAX_ISSUE = 106802
WATCH_PORTFOLIO = [106774, 106764, 106743, 106741, 106189]

# Load baseline comments
try:
    with open('scratch/portfolio_baseline.json', 'r', encoding='utf-8') as f:
        baseline = json.load(f)
except Exception:
    baseline = {}

print(f"Starting bounty daemon. Interval: 120s. Max known issue: {KNOWN_MAX_ISSUE}. Watching top 4: {WATCH_PORTFOLIO}", flush=True)

iteration = 0
MAX_ITERATIONS = 60  # 2 hours per run

while iteration < MAX_ITERATIONS:
    iteration += 1
    # 1. Check last 4 issues on Expensify/App
    try:
        res = subprocess.run(
            ['gh', 'issue', 'list', '--repo', 'Expensify/App', '--limit', '4', '--json', 'number,title,createdAt,labels,url'],
            capture_output=True, text=True, encoding='utf-8', timeout=30
        )
        if res.returncode == 0:
            issues = json.loads(res.stdout)
            for iss in issues:
                num = iss['number']
                if num > KNOWN_MAX_ISSUE:
                    title = iss.get('title', '')
                    labels = [l.get('name') for l in iss.get('labels', [])]
                    # Check if it's an External bug or bounty candidate
                    is_bounty = '[$' in title or 'External' in labels or 'Help Wanted' in labels
                    if is_bounty:
                        print(f"EVENT_DETECTED: NEW_BOUNTY #{num}: {title}", flush=True)
                        print(json.dumps(iss), flush=True)
                        sys.exit(0)
    except Exception as e:
        print(f"Error fetching issues: {e}", flush=True)

    # 2. Check top 4 portfolio tickets for assignment or reviewer comments
    for num in WATCH_PORTFOLIO:
        try:
            res = subprocess.run(
                ['gh', 'issue', 'view', str(num), '--repo', 'Expensify/App', '--json', 'comments,assignees,title,url'],
                capture_output=True, text=True, encoding='utf-8', timeout=30
            )
            if res.returncode == 0:
                data = json.loads(res.stdout)
                assignees = [a.get('login') for a in data.get('assignees', [])]
                if 'kevinjosh10' in assignees:
                    print(f"EVENT_DETECTED: ASSIGNED_TO_KEVIN #{num} ({data.get('title')})", flush=True)
                    print(json.dumps({'event': 'ASSIGNED', 'number': num, 'url': data.get('url')}), flush=True)
                    sys.exit(0)

                comments = data.get('comments', [])
                if comments:
                    last_c = comments[-1]
                    last_id = last_c.get('id')
                    last_author = last_c.get('author', {}).get('login')
                    base_id = baseline.get(str(num), {}).get('last_id')
                    if base_id and last_id != base_id and last_author not in ['kevinjosh10', 'melvin-bot']:
                        # New reviewer/contributor comment
                        print(f"EVENT_DETECTED: NEW_COMMENT #{num} by @{last_author}", flush=True)
                        print(json.dumps({'event': 'COMMENT', 'number': num, 'author': last_author, 'body': last_c.get('body')}), flush=True)
                        sys.exit(0)
        except Exception as e:
            print(f"Error checking ticket #{num}: {e}", flush=True)

    # Sleep 120s before next check
    time.sleep(120)

print("Daemon finished MAX_ITERATIONS without triggers.", flush=True)
