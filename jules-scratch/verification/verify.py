from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173")
        page.wait_for_selector('.file-list', state='visible')
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
