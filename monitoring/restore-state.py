"""Restore only a validated JSON incident state from this branch's prior artifact.
No downloaded scripts or paths are executed. Missing state means first run, not
permission to ignore an API/zip error. GH_TOKEN needs Actions read access only.
"""
import io, json, os, subprocess, sys, zipfile
name, output = sys.argv[1:]
repo = os.environ['GITHUB_REPOSITORY']
branch = os.environ['GITHUB_REF_NAME']
data = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/artifacts?name={name}&per_page=50']))
items = [a for a in data['artifacts'] if not a['expired'] and a.get('workflow_run', {}).get('head_branch') == branch]
if items:
    latest = max(items, key=lambda a: a['created_at'])
    archive = subprocess.check_output(['gh', 'api', f"repos/{repo}/actions/artifacts/{latest['id']}/zip"])
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        payload = z.read('monitoring-state.json')
        if len(payload) > 4096:
            raise ValueError('Incident state too large')
        state = json.loads(payload)
        if state.get('signature') is not None and (not isinstance(state['signature'], str) or len(state['signature']) != 64):
            raise ValueError('Invalid incident signature')
        with open(output, 'w') as f:
            json.dump(state, f)
