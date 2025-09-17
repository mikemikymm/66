import asyncio
import threading
import os
import time
from playwright.async_api import async_playwright
import re # For regex path replacements
from bs4 import BeautifulSoup

# --- Main App Import ---
try:
    from app import app
    print("Successfully imported 'app' from app.py")
except ImportError:
    print("ERROR: Could not import 'app' from app.py. Ensure it's in the same directory and defines the 'app' instance.")
    exit()
# --- End Main App Import ---

# --- Configuration ---
HOST = "127.0.0.1"
PORT = 8051
BASE_URL = f"http://{HOST}:{PORT}/"
OUTPUT_DIR = "static_html_exports"
WAIT_AFTER_CLICK = 5000
WAIT_FOR_INITIAL_LOAD = 8000
ASSETS_DIR_NAME = "assets"      # Kept for reference but not used for path correction

# --- Plotly CDN Configuration ---
PLOTLY_CDN_URL = "https://cdn.plot.ly/plotly-3.0.1.min.js"

# --- Automatically determine tab labels ---
TAB_LABELS = []
try:
    from src.python.FrontEnd import layout
    tabs_component = None
    if hasattr(layout, 'children') and isinstance(layout.children, list):
        for child_level1 in layout.children:
            if "Tabs" in str(type(child_level1)): tabs_component = child_level1; break
            if hasattr(child_level1, 'children') and isinstance(child_level1.children, list):
                 for child_level2 in child_level1.children:
                      if "Tabs" in str(type(child_level2)): tabs_component = child_level2; break
                 if tabs_component: break
    if tabs_component and hasattr(tabs_component, 'children') and isinstance(tabs_component.children, list):
         TAB_LABELS = [tab.label for tab in tabs_component.children if hasattr(tab, 'label')]
    if not TAB_LABELS: raise ValueError("No tab labels detected in layout.")
    print(f"Detected Tab Labels: {TAB_LABELS}")
except Exception as e:
    print(f"WARN: Could not auto-detect tab labels ({e}). Using fallback.")
    TAB_LABELS = ['Overview', 'Retention Breakdown', 'User Demographics', 'Usage Analytics', 'User Feedback']
    print(f"Using fallback Tab Labels: {TAB_LABELS}")

# --- Define States to Capture ---
STATES_TO_CAPTURE = []
if TAB_LABELS:
    first_tab_name_sanitized = TAB_LABELS[0].lower().replace(' ', '_').replace('/', '_').replace('\\', '_')
    STATES_TO_CAPTURE.append({"name": f"initial_view_tab1_{first_tab_name_sanitized}", "url": BASE_URL, "is_initial_load": True})
    for i, label in enumerate(TAB_LABELS[1:], start=2):
        sanitized_label = label.lower().replace(' ', '_').replace('/', '_').replace('\\', '_')
        state_name = f"tab_{i}_{sanitized_label}_view"
        STATES_TO_CAPTURE.append({"name": state_name, "click_tab_label": label, "is_initial_load": False})
else:
    print("CRITICAL ERROR: No tab labels. Capturing single default view only.")
    STATES_TO_CAPTURE.append({"name": "default_view_no_tabs", "url": BASE_URL, "is_initial_load": True})
print(f"Defined states to capture: {[s['name'] for s in STATES_TO_CAPTURE]}")
# --- End Configuration ---

os.makedirs(OUTPUT_DIR, exist_ok=True) # Create directory for HTML files

def run_dash_app():
    print(f"Attempting to start Dash server on {HOST}:{PORT}...")
    try:
        app.run(host=HOST, port=PORT, debug=False, use_reloader=False)
    except Exception as e:
        print(f"ERROR starting Dash server: {e}")

dash_thread = threading.Thread(name='Dash App Server', target=run_dash_app, daemon=True)

def replace_plotly_with_cdn(html_content):
    """Replace Plotly script references with CDN version"""
    replacements_made = 0
    
    # Pattern 1: Replace plotly.js script tags with CDN
    # Matches: <script src="/_dash-component-suites/.../plotly.min.js"></script>
    # Or similar variations
    plotly_script_pattern = r'<script[^>]*src="[^"]*plotly[^"]*\.js"[^>]*></script>'
    plotly_cdn_script = f'<script src="{PLOTLY_CDN_URL}"></script>'
    
    html_content_new, count = re.subn(plotly_script_pattern, plotly_cdn_script, html_content, flags=re.IGNORECASE)
    if count > 0:
        html_content = html_content_new
        replacements_made += count
        print(f"    Replaced {count} Plotly script tag(s) with CDN version")
    
    # Pattern 2: Replace any remaining plotly references in script src attributes
    # Handles cases like: src="/_dash-component-suites/dash/deps/plotly-2.24.1.min.js"
    plotly_src_pattern = r'(src=")[^"]*plotly[^"]*\.js(")'
    html_content_new, count = re.subn(plotly_src_pattern, rf'\1{PLOTLY_CDN_URL}\2', html_content, flags=re.IGNORECASE)
    if count > 0:
        html_content = html_content_new
        replacements_made += count
        print(f"    Replaced {count} additional Plotly src reference(s) with CDN")
    
    # Pattern 3: Handle plotly references that might be in different formats
    # This catches variations in how Dash might reference plotly
    plotly_general_pattern = r'(["\'])/_dash-component-suites/[^"\']*plotly[^"\']*\.js\1'
    html_content_new, count = re.subn(plotly_general_pattern, rf'\1{PLOTLY_CDN_URL}\1', html_content, flags=re.IGNORECASE)
    if count > 0:
        html_content = html_content_new
        replacements_made += count
        print(f"    Replaced {count} general Plotly reference(s) with CDN")
    
    if replacements_made == 0:
        print("    No Plotly references found to replace with CDN")
    else:
        print(f"    Total Plotly CDN replacements: {replacements_made}")
    
    return html_content

async def capture_states():
    print("\nStarting Playwright capture process...")
    async with async_playwright() as p:
        try:
            # browser = await p.chromium.launch(headless=False) # For debugging
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            print("Playwright browser launched.")
        except Exception as e:
            print(f"ERROR: Failed to launch Playwright browser: {e}"); return

        navigated_once = False
        for state_idx, state in enumerate(STATES_TO_CAPTURE):
            state_name = state["name"]
            url_to_visit = state.get("url")
            tab_label_to_click = state.get("click_tab_label")
            is_initial_load_flag = state.get("is_initial_load", False)
            print(f"\nProcessing state {state_idx+1}/{len(STATES_TO_CAPTURE)}: {state_name}")

            try:
                if is_initial_load_flag and not navigated_once:
                    if not url_to_visit: print(f"  ERROR: Initial state missing 'url'. Skipping."); continue
                    print(f"  Navigating to initial URL: {url_to_visit}")
                    await page.goto(url_to_visit, wait_until='networkidle', timeout=45000)
                    await page.wait_for_timeout(2000)
                    navigated_once = True; print(f"  Initial page loaded.")
                elif not is_initial_load_flag and not navigated_once:
                    print(f"  ERROR: Not initial load but page not loaded. Skipping."); continue
                elif is_initial_load_flag and navigated_once:
                     print(f"  WARN: State marked initial_load, but already navigated. Skipping re-navigation.")

                if tab_label_to_click:
                    print(f"  Attempting to click tab: '{tab_label_to_click}'")
                    css_selector = f"div.tab:has-text('{tab_label_to_click}')"
                    try:
                        print(f"  Using CSS selector: {css_selector}")
                        tab_locator = page.locator(css_selector)
                        await tab_locator.wait_for(state='visible', timeout=25000)
                        await tab_locator.click()
                        print(f"  Clicked tab. Waiting {WAIT_AFTER_CLICK/1000}s for content...")
                        await page.wait_for_timeout(WAIT_AFTER_CLICK); print("  Wait complete.")
                    except Exception as e_click:
                        print(f"  ERROR clicking tab '{tab_label_to_click}': {e_click}"); continue

                print(f"  Fetching HTML content for: {state_name}")
                html_content = await page.content()
                output_path = os.path.join(OUTPUT_DIR, f"{state_name}.html")

                # --- Plotly CDN Replacement ---
                print(f"  Replacing Plotly with CDN for {state_name}...")
                html_content = replace_plotly_with_cdn(html_content)

                # --- NO OTHER PATH CORRECTIONS ---
                # --- NO FILE COPYING LOGIC WITHIN THIS FUNCTION ---

                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
                print(f"  HTML (with Plotly CDN) saved to {output_path}")

            except Exception as e_state:
                print(f"  UNEXPECTED ERROR processing state {state_name}: {e_state}"); continue
        try:
            await browser.close()
            print("\nPlaywright browser closed.")
        except Exception as e_close: print(f"WARN: Error closing browser: {e_close}")


# --- Add Tab Links to HTML ---

def create_tab_links_to_separate_html(html_file_path, output_file_path, tab_to_html_map):
    """
    Transforms static Dash tab headers into <a> links that navigate to
    separate HTML files.

    Args:
        html_file_path (str): Path to the input HTML file containing the tab headers.
        output_file_path (str): Path where the modified HTML will be saved.
        tab_to_html_map (dict): A dictionary where keys are the exact tab names
                                (e.g., "Overview", "Retention Breakdown") and
                                values are the filenames of the corresponding HTML pages.
                                Example: {"Overview": "overview.html", "Retention Breakdown": "retention.html"}
    """
    with open(html_file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Find the tab container
    tab_container = soup.find('div', class_='tab-container')
    if not tab_container:
        print("Tab container not found. Exiting.")
        return

    tabs = tab_container.find_all('div', class_='tab')

    for tab in tabs:
        tab_name_span = tab.find('span')
        if not tab_name_span:
            continue
        tab_name = tab_name_span.get_text(strip=True)

        # Get the target HTML file from the map
        target_html_file = tab_to_html_map.get(tab_name)

        if target_html_file:
            # Create a new <a> tag
            a_tag = soup.new_tag('a', href=target_html_file)

            # Preserve existing inline styles from the original tab div
            if 'style' in tab.attrs:
                a_tag['style'] = tab.attrs['style']

            # Move children of the original tab (like the span) into the <a> tag
            # We iterate backwards to safely remove and re-add elements
            children = list(tab.contents) # Create a list to modify safely
            for child in children:
                a_tag.append(child)

            # Move the class attributes from the original tab to the <a> tag
            if 'class' in tab.attrs:
                # Filter out Dash-specific classes 
                a_tag['class'] = tab.attrs['class']

            # Replace the original tab div with the new <a> tag
            tab.replace_with(a_tag)
        else:
            print(f"Warning: No HTML file mapped for tab: '{tab_name}'. This tab will not be linked.")


    # Save the modified HTML
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

    print(f"Added Links to: {output_file_path}")

def add_tab_links_to_html():

    #    map of tab names to their corresponding HTML files.
    tab_html_mapping = {
        "Overview": "initial_view_tab1_overview.html",
        "Retention Breakdown": "tab_2_retention_breakdown_view.html",
        "User Demographics": "tab_3_user_demographics_view.html",
        "Usage Analytics": "tab_4_usage_analytics_view.html",
        "User Feedback": "tab_5_user_feedback_view.html",
    }

    # Run the function for each tab HTML file
    for tab_key in tab_html_mapping.keys():

        print(f"Adding inter-tab links to: {tab_key} Tab HTML file")

        fileAddress = 'static_html_exports\\' + tab_html_mapping[tab_key]

        create_tab_links_to_separate_html(
            fileAddress,
            fileAddress,
            tab_html_mapping
        )

# --- Main Execution Block ---
if __name__ == "__main__":
    print("Starting Dash app thread...")
    dash_thread.start()
    print(f"Waiting {WAIT_FOR_INITIAL_LOAD/1000} seconds for Dash app to initialize...")
    time.sleep(WAIT_FOR_INITIAL_LOAD / 1000)

    if not dash_thread.is_alive():
        print("CRITICAL ERROR: Dash server thread did not start or died. Exiting.")
        exit()
    else:
        print("Dash server thread appears to be running.")

    try:
        asyncio.run(capture_states())
        add_tab_links_to_html()
    except Exception as e_main_capture:
        print(f"\nAn error occurred during the main capture process: {e_main_capture}")
    finally:
        print("\n--- HTML Export Finished ---")
        print(f"HTML files (with Plotly CDN) are saved in the '{OUTPUT_DIR}' directory.")
        print("Dash server thread will terminate with this script.")