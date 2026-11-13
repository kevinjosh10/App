import subprocess
import json

for num in [105756, 105693]:
    res = subprocess.run(['gh', 'issue', 'view', str(num), '--repo', 'Expensify/App', '--json', 'comments'], capture_output=True, text=True, encoding='utf-8')
    if res.returncode == 0:
        data = json.loads(res.stdout)
        my_comments = [c for c in data.get('comments', []) if c.get('author', {}).get('login') == 'kevinjosh10']
        if my_comments:
            c = my_comments[-1]
            print(f"=== #{num} (comment id: {c.get('id')}) ===")
            print(c.get('body', '')[:400])
            print("...\n[END OF PREVIEW]\n")
