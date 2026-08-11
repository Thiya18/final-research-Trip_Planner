"""End-to-end browser test of the app (Section 4.9, Table 5.2).

Walks through every screen of the web preview against the running backend:
home -> region -> interests -> trip details -> travel style -> itinerary -> places -> budget -> feedback.
The test fails if any step is missing, the plan request fails, or the page throws a JavaScript error.

Setup (once):
    pip install playwright
    python -m playwright install chromium

Run (three terminals):
    1. backend:   cd backend  &&  uvicorn api.main:app --port 8000
    2. web app:   cd mobile   &&  npx expo start --web --port 8081
    3. test:      python evaluation/e2e_test.py --app http://localhost:8081 --shots evaluation/screenshots_e2e
"""
import argparse
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

TIMEOUT = 30_000  # ms; the first plan request loads the models


def run(app_url: str, shots: Path | None, headed: bool) -> list:
    errors, steps = [], []

    def tap(text):
        """Click the visible element with exactly this text (earlier screens stay hidden in the page)."""
        page.locator(f'text="{text}" >> visible=true').first.click()

    def see(text):
        expect(page.locator(f'text="{text}" >> visible=true').first).to_be_visible()

    def shot(name):
        steps.append(name)
        print(f"  ok  {name}")
        if shots:
            page.screenshot(path=str(shots / f"{len(steps):02d}_{name}.png"))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        page = browser.new_page(viewport={"width": 420, "height": 900})
        page.set_default_timeout(TIMEOUT)
        page.on("pageerror", lambda e: errors.append(f"JavaScript error: {e}"))
        page.on("response", lambda r: errors.append(f"HTTP {r.status} from {r.url}")
                if "/plan" in r.url and r.request.method == "POST" and r.status != 200 else None)

        page.goto(app_url)
        see("Start planning")
        shot("home")
        tap("Start planning")

        see("Where do you want to go?")
        tap("Hill Country")
        shot("region")
        tap("Next")

        see("What do you love?")
        tap("Nature & wildlife")
        tap("Adventure")
        shot("interests")
        tap("Next")

        see("Tell us about your trip")
        tap("International visitor")
        shot("details")
        tap("Next")

        see("Your travel style")
        tap("Peaceful")
        shot("style")
        with page.expect_response(lambda r: r.url.endswith("/plan") and r.request.method == "POST") as resp:
            tap("Create my trip")
        if resp.value.status != 200:
            raise AssertionError(f"POST /plan returned {resp.value.status}")
        plan = resp.value.json()
        n_stops = plan["metrics"]["n_stops"]

        page.wait_for_url("**/itinerary")
        expect(page.locator("text=Day 1 >> visible=true").first).to_be_visible()
        shot("itinerary")

        page.get_by_role("tab", name="Places").click()
        page.wait_for_url("**/places")
        see(plan["recommendations"][0]["name"])
        shot("places")

        page.get_by_role("tab", name="Budget").click()
        page.wait_for_url("**/budget")
        expect(page.locator("text=LKR >> visible=true").first).to_be_visible()
        shot("budget")

        tap("Rate this plan")  # button at the end of the budget screen
        see("Send feedback")
        page.locator('[aria-label="Overall, how happy are you with this plan?: 4 of 5"] >> visible=true').first.click()
        shot("feedback")
        with page.expect_response(lambda r: r.url.endswith("/feedback") and r.request.method == "POST") as fb:
            tap("Send feedback")
        if fb.value.status != 200:
            raise AssertionError(f"POST /feedback returned {fb.value.status}")
        see("Thank you!")
        shot("feedback_sent")

        browser.close()
    print(f"\nPlan returned {n_stops} stops; {len(steps)} screens checked.")
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", default="http://localhost:8081", help="URL of the web preview")
    ap.add_argument("--shots", help="folder to save a screenshot of each step")
    ap.add_argument("--headed", action="store_true", help="show the browser window")
    args = ap.parse_args()
    shots = Path(args.shots) if args.shots else None
    if shots:
        shots.mkdir(parents=True, exist_ok=True)
    print(f"End-to-end test against {args.app}")
    errors = run(args.app, shots, args.headed)
    if errors:
        print("FAILED:\n  " + "\n  ".join(errors))
        sys.exit(1)
    print("PASSED: every screen loaded, the plan and feedback requests succeeded, no page errors.")


if __name__ == "__main__":
    main()
