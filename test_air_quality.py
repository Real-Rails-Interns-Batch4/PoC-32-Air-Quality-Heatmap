import sys
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# --- Technical Configurations ---
TARGET_URL = "https://airquality-frontend-6x2o.onrender.com"
REPORT_FILE = "Test_Report_Air_Quality.txt"
WAIT_TIMEOUT = 120  # Handle Render free-tier cold starts

def log_result(test_name, status, message=""):
    """Appends test results to the report file with a clean structure."""
    with open(REPORT_FILE, "a") as f:
        f.write(f"[{test_name}]\n")
        f.write(f"Result: {status}\n")
        if message:
            f.write(f"Detail: {message}\n")
        f.write("-" * 50 + "\n")

def initialize_driver():
    """Initializes Chrome WebDriver with robust options."""
    chrome_options = Options()
    # chrome_options.add_argument("--headless=new")  # Disabled for visibility
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def test_air_quality_intelligence():
    driver = initialize_driver()
    wait = WebDriverWait(driver, WAIT_TIMEOUT)
    
    try:
        # 1. Initialize Report File
        with open(REPORT_FILE, "w") as f:
            f.write("=" * 60 + "\n")
            f.write("AIR QUALITY INTELLIGENCE - E2E VALIDATION REPORT\n")
            f.write(f"Target: {TARGET_URL}\n")
            f.write("=" * 60 + "\n\n")

        print(f"Initiating handshake with {TARGET_URL}...")
        driver.get(TARGET_URL)

        # --- Test Case 1: Canvas Rendering ---
        print("Running Test Case 1: Canvas Rendering...")
        try:
            # Wait for the SVG map container
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "svg")))
            
            # Verify visibility of land paths (topography from CDN)
            # We wait specifically for 'path' elements to be injected into the SVG
            wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "svg path")) > 0)
            
            land_paths = driver.find_elements(By.CSS_SELECTOR, "svg path")
            if len(land_paths) > 0:
                log_result("Test Case 1: Canvas Rendering", "PASS", 
                           f"Global map visualization confirmed. Found {len(land_paths)} land path segments.")
            else:
                log_result("Test Case 1: Canvas Rendering", "FAIL", "SVG element found but land paths (topography) failed to render.")
        except Exception as e:
            log_result("Test Case 1: Canvas Rendering", "FAIL", f"Map container timeout or rendering error: {str(e)}")

        # --- Test Case 2: API Handshake & Panel Slide ---
        print("Running Test Case 2: API Handshake & Panel Slide...")
        try:
            # 1. Locate Search Bar and filter for "Zoo Park"
            search_box = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='Search']")))
            search_box.clear()
            search_box.send_keys("Zoo Park")
            
            # Allow time for FastAPI response and UI update
            time.sleep(5) 
            
            # 2. Click a live sensor station marker
            wait.until(lambda d: len(d.find_elements(By.TAG_NAME, "circle")) > 0)
            
            circles = driver.find_elements(By.CSS_SELECTOR, "circle[style*='cursor: pointer']")
            if not circles:
                circles = driver.find_elements(By.TAG_NAME, "circle")

            if circles:
                # Click the first matching marker (Zoo Park, Hyderabad)
                driver.execute_script("""
                    var evObj = document.createEvent('MouseEvents');
                    evObj.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                    arguments[0].dispatchEvent(evObj);
                """, circles[0])
                
                # 3. Verify Intelligence Panel (Sidebar) loads with live telemetry
                sidebar = wait.until(EC.visibility_of_element_located((By.TAG_NAME, "aside")))
                wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, "aside"), "Zoo Park"))
                
                telemetry_present = "Risk Score" in sidebar.text or "Sensors" in sidebar.text
                if telemetry_present:
                    log_result("Test Case 2: API Handshake & Panel Slide", "PASS", 
                               "Successful station selection. Intelligence Panel sliding verified with live telemetry data.")
                else:
                    log_result("Test Case 2: API Handshake & Panel Slide", "FAIL", "Sidebar loaded but telemetry fields missing.")
            else:
                log_result("Test Case 2: API Handshake & Panel Slide", "FAIL", "Target sensor station marker not found on map after filtering.")
        except Exception as e:
            log_result("Test Case 2: API Handshake & Panel Slide", "FAIL", f"Handshake or panel slide error: {str(e)}")

        # --- Preparation for Test Case 3: Clear UI Interception ---
        try:
            close_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label*='Close']")
            if close_buttons:
                driver.execute_script("arguments[0].click();", close_buttons[0])
                time.sleep(1) # Wait for sidebar to slide out
        except:
            pass

        # --- Test Case 3: Developer Signature Gate ---
        print("Running Test Case 3: Developer Signature Gate...")
        try:
            # 1. Click (i) info icon in AppHeader.tsx
            info_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label='Show project metadata']")))
            info_button.click()
            
            # 2. Assert Signature Data
            wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Metadata')]")))
            
            content = driver.page_source
            name_verified = "Ananthakrishnan A H" in content
            batch_verified = "Batch 4" in content
            
            if name_verified and batch_verified:
                log_result("Test Case 3: Developer Signature Gate", "PASS", 
                           "Signature verified: Architect 'Ananthakrishnan A H' and 'Batch 4' confirmed.")
            else:
                log_result("Test Case 3: Developer Signature Gate", "FAIL", 
                           f"Signature mismatch. Name Found: {name_verified}, Batch Found: {batch_verified}")
        except Exception as e:
            log_result("Test Case 3: Developer Signature Gate", "FAIL", f"Metadata gate error: {str(e)}")

    except Exception as global_e:
        print(f"Critical execution failure: {str(global_e)}")
    finally:
        driver.quit()
        print(f"Automation finished. Report generated at: {os.path.abspath(REPORT_FILE)}")

if __name__ == "__main__":
    test_air_quality_intelligence()
