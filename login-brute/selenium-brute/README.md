# Selenium brute helper

This folder contains a small Selenium script to attempt a list of username/password pairs against a login form.

Files:
- `brute.py` - the script that iterates credentials and attempts to log in.
- `creds.json` - sample credentials (edit with your own list; do not commit secrets to git).
- `requirements.txt` - Python dependencies.

Requirements:
- Python 3.8+
- Google Chrome / Chromium installed (or adjust the script to use Firefox and geckodriver)

Quick start (recommended inside a virtualenv):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# run headless (no browser window)
python3 brute.py --creds creds.json --headless
# or run with visible browser for debugging
python3 brute.py --creds creds.json
```

Notes:
- The script uses `webdriver-manager` to automatically download a matching chromedriver binary.
- The script assumes the target login page is at `http://127.0.0.1:8080/login` by default; use `--url` to change.
- For heavy or stealthy testing, add delays and randomization and obey any applicable rules/legal constraints.
