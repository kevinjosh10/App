import subprocess
import json

issues = [106238, 106237, 106235, 106189, 105899, 106107, 106038, 105756, 104341]
for num in issues:
    res = subprocess.run(['gh', 'issue', 'view', str(num), '--repo', 'Expensify/App', '--json', 'comments,assignees'], capture_output=True, text=True, encoding='utf-8')
    if res.returncode == 0:
        data = json.loads(res.stdout)
        assignees = [a['login'] for a in data.get('assignees', [])]
        comments = data.get('comments', [])
        last_comment = comments[-1] if comments else {}
        author = last_comment.get('author', {}).get('login', 'none')
        created = last_comment.get('createdAt', '')
        print(f"#{num} | Assignees: {assignees} | Last comment by @{author} at {created}")
