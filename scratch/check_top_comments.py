import subprocess
import json

for num in [106741, 106743, 106721, 106238, 106237, 106235, 106189, 105899]:
    res = subprocess.run(['gh', 'issue', 'view', str(num), '--repo', 'Expensify/App', '--json', 'comments,assignees'], capture_output=True, text=True, encoding='utf-8')
    if res.returncode == 0:
        data = json.loads(res.stdout)
        comments = data.get('comments', [])
        last = comments[-1] if comments else {}
        author = last.get('author', {}).get('login')
        created = last.get('createdAt')
        assignees = [a.get('login') for a in data.get('assignees', [])]
        print(f"#{num} | Assignees: {assignees} | Last comment by @{author} at {created}")
