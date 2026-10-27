"""Restore only a validated JSON incident state from this branch's prior artifact.
No downloaded scripts or paths are executed. Missing state means first run, not
permission to ignore an API/zip error. GH_TOKEN needs Actions read access only.
"""
import io, json, os, subprocess, sys, zipfile
name, output = sys.argv[1:]
repo = os.environ['GITHUB_REPOSITORY']
branch = os.environ['GITHUB_REF_NAME']
data = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/artifacts?name={name}&per_page=50']))
repo_id = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}']))['id']

def trusted(artifact):
    # Only state written by this repo's own scheduled/manual monitor runs on this
    # branch counts. A fork or PR run uploading the same artifact name must not be
    # able to plant a signature that suppresses alerts.
    run_ref = artifact.get('workflow_run') or {}
    if artifact['expired'] or run_ref.get('head_branch') != branch or run_ref.get('head_repository_id') != repo_id:
        return False
    run = json.loads(subprocess.check_output(['gh', 'api', f"repos/{repo}/actions/runs/{run_ref['id']}"]))
    return (run.get('event') in ('schedule', 'workflow_dispatch')
            and run.get('path', '').startswith('.github/workflows/synthetic-rudderstack.yml')
            and (run.get('head_repository') or {}).get('id') == repo_id)

items = [a for a in data['artifacts'] if trusted(a)]
if items:
    latest = max(items, key=lambda a: a['created_at'])
    archive = subprocess.check_output(['gh', 'api', f"repos/{repo}/actions/artifacts/{latest['id']}/zip"])
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        if z.getinfo('monitoring-state.json').file_size > 4096:
            raise ValueError('Incident state too large')
        state = json.loads(z.read('monitoring-state.json'))
        if not isinstance(state, dict) or state.get('kind') not in (None, 'healthy', 'failure', 'unchanged', 'recovery'):
            raise ValueError('Invalid incident state')
        if state.get('signature') is not None and (not isinstance(state['signature'], str) or len(state['signature']) != 64):
            raise ValueError('Invalid incident signature')
        with open(output, 'w') as f:
            json.dump(state, f)
