# Analytics & Reporting Scripts (Local Execution)

This project contains a suite of Node.js scripts designed to fetch, process, and report on various analytics data from sources: Auth0, Stripe, and Focus Bear's internal PostgreSQL database. This version is intended for local execution and development. There is a seperate branch created as a starting point for AWS lambda deployment. It was heavily modified by RMIT Sem1 2025's Intern Team.

## System Overview

The scripts have been modularized for improved performance, structure, and maintainability. They perform bulk data fetching, optimized data processing, and generate Excel and CSV reports.

### Directory Structure

The core logic is organized as follows:

*   **`config/`**:
    *   `load-env.js`: Loads environment variables from AWS Secrets Manager at script startup.
    *   `constants.js`: Contains all shared constants (column mappings, event type definitions, OS names, report configurations, etc.).
    *   `clients.js`: Initializes and exports shared clients (PostgreSQL pool, Stripe client) after environment variables are loaded.
*   **`utils/`**: Contains generic utility functions (core, date, OS-specific).
*   **`services/`**: Encapsulates direct interactions with external services (Database, Auth0, Stripe).
*   **`reporting/`**: Contains the logic for generating specific reports (data aggregation, mapping, Excel/CSV export, summary generation).
*   **`communication/`**: Manages sending notifications (Slack, Zoho Cliq).
*   **Main Script Files (Entry Points for Local Execution):**
    *   `generate-onboarding-tracker-report.js`: Generates the detailed onboarding report (Excel) and a summary CSV.
    *   `generate-conversion-rate.js`: Generates and outputs conversion rate statistics.
    *   `run-productivity-report.js`: Runs the productivity impact category report.
    *   `run-feedback-report.js`: Runs the feedback score data generation.

### Key Features & Improvements (Compared to older monolithic version)
*   **Performance:** Significant speed improvements through bulk data fetching and optimized data processing.
*   **Maintainability:** Modular code is easier to understand, debug, and modify.
*   **New Reports:**
    *   Integration of `team_id` into the onboarding report.
    *   "Productivity Impact Report" based on `impact_category`.
    *   Data fetching for "Average Feedback Scores".
*   **Error Handling & Logging:** Enhanced error handling and more informative logging.
*   **Rate Limiting Mitigation:** Implemented delays for Auth0 API calls.

## Local Development & Execution

### Prerequisites:

1.  **Node.js:** LTS version recommended (e.g., v18.x, v20.x).
2.  **NPM:** Comes bundled with Node.js.
3.  **AWS CLI v2:** Must be installed and configured.
    *   **For AWS SSO Users:** Your AWS CLI needs to be configured with an SSO profile that has permissions to access the required AWS Secrets Manager secret. You will need to run `aws sso login --profile YOUR_PROFILE_NAME` periodically (e.g., every 8-12 hours) to refresh your SSO session if it expires.

### Setup:

1.  **Clone the Repository**
   
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    This will install `moment`, `axios`, `pg`, `stripe`, `exceljs`, and `@aws-sdk/client-secrets-manager` (though the SDK for secrets is primarily for the Lambda version, `load-env.js` in this branch uses `execSync` with AWS CLI).

### Configuration:
**Configure aws sso**
    ```bash
    aws configure sso
    ```

    Use these parameters:

    SSO start URL = https://d-9767b91bde.awsapps.com/start/
    SSO region = ap-southeast-2

    Log in via the browser
    
    When it asks you for a profile, set the profile name to focusbear. 

    Copy .env.sample to .env - this contains the AWS_PROFILE name

    If you set the profile to something other than focusbear, you'll need to update AWS_PROFILE in the .env file

### Running the Scripts:

Execute the desired main script file using Node.js from the project root directory:

*   **Onboarding Report:**
    ```bash
    node generate-onboarding-tracker-report.js
    ```
    *Output:* `onboarding_tracking_report.xlsx` and `os_signup_week_summary.csv` in the project root.

*   **Conversion Rate Report:**
    ```bash
    node generate-conversion-rate.js
    ```
    *Output:* `conversion-rate.txt` in the project root and console output. (Slack/Cliq notifications may also be sent if configured).

*   **Productivity Impact Report:**
    ```bash
    node run-productivity-report.js
    ```
    *Output:* `all_impact_categories_report.xlsx` in the project root.

*   **Feedback Score Data:**
    ```bash
    node run-feedback-report.js
    ```
    *Output:* `monthly_feedback_ratings.csv` (or `.json`) in the project root and console output.

**Troubleshooting Local Execution:**

*   **AWS Credentials/SSO:** If you see errors related to AWS credentials or "Unable to locate credentials," ensure your AWS CLI profile is correctly configured and active.
*   **Dependencies:** Ensure all dependencies are installed via `npm install`.
*   **Paths:** Double-check `require` paths if you move files around. Paths are relative to the file doing the requiring.
