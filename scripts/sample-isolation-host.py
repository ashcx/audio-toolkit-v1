"""Sample existing Chrome processes without attaching, terminating, or launching a browser."""
import argparse
import json
import subprocess
import time
parser = argparse.ArgumentParser()
parser.add_argument('--seconds', type=int, default=900)
parser.add_argument('--output', required=True)
args = parser.parse_args()
if not 1 <= args.seconds <= 1800:
    raise SystemExit('Choose a finite duration between 1 and 1800 seconds.')
end = time.monotonic() + args.seconds
with open(args.output, 'w') as destination:
    while time.monotonic() < end:
        processes = []
        for line in subprocess.check_output(['ps', '-axo', 'pid,pcpu,rss,comm'], text=True).splitlines()[1:]:
            fields = line.split(None, 3)
            if len(fields) != 4 or '/Applications/Google Chrome.app/' not in fields[3]:
                continue
            processes.append({'pid': int(fields[0]), 'cpuPercent': float(fields[1]), 'rssBytes': int(fields[2]) * 1024})
        destination.write(json.dumps({'utcSeconds': time.time(), 'scope': 'All user Chrome processes, including unrelated tabs. Not owned benchmark memory.', 'rssBytes': sum(p['rssBytes'] for p in processes), 'processes': processes}) + '\n')
        destination.flush()
        time.sleep(2)
