## 1. Introduction

This document explains the changes committed to Focus Bear’s `Analytics` Git repository, specifically the `node-js-analytics` files.

## 2. Structural Change: Modularization

The previously large `helpers.js` file has been modularized into smaller, focused modules, organized logically for improved readability, maintainability, and testability.

### New Directory Structure

* **`config/`**: Handles environment loading, constants, and client initializations.

  * `load-env.js`: Loads environment variables from AWS Secrets Manager.
  * `constants.js`: Defines shared constants (column mappings, event types, OS names, report configuration arrays).
  * `clients.js`: Initializes and exports shared clients (PostgreSQL pool, Stripe).

* **`utils/`**: Contains generic utility functions.

  * `core-utils.js`: Functions like `sleep`, `chunkArray`, `groupDataByKey`.
  * `date-utils.js`: Date formatting (`formatDate`) and calculations (`calculateDaysBetweenDates`) using `moment.js`.
  * `os-utils.js`: OS-specific utilities (`buildOsCombination`, `parseDeviceFromCredentials`).

* **`services/`**: Encapsulates external services and database interactions.

  * `db.js`: `executeQueryUsingPool` for database interactions.
  * `auth0.js`: Auth0 API calls (`getAccessToken`, `getUserFromAuth0`, `fetchDeviceCredentials`).
  * `stripe.js`: Stripe API calls (`getSubscriptionByUserId`, `getAllNewSubscribersFromStripe`, `getAllNewUserSignupsFromStripe`).

* **`reporting/`**: Logic for generating reports.

  * `data-aggregator.js`: Combines data from services for reporting (`getDeviceForUser`, `getDeviceForStripeUser`, `getUsersSubscribedNotViaStripe`).
  * `onboarding-fetchers.js`: Bulk data fetching for onboarding reports (`fetchUserUpdatedIn45Days`, `fetchTrackEventsForUsers`) and orchestrator (`fetchOnboardingReportData`).
  * `report-mapper.js`: `mapTrackEvents` transforms raw data into detailed reports (logic reverted for value extraction).
  * `excel-export.js`: Handles Excel file generation (`exportToExcel2`, original `exportToExcel`).

* **`communication/`**: Manages sending notifications.

  * `slack.js`: `postToSlack` (potentially deprecated).
  * `cliq.js`: `logEventInCliq`.

## 3. Performance Enhancements

### Bulk Data Fetching (Major Improvement)

* Addressed N+1 query issue with bulk fetching of data.
* `fetchOnboardingReportData` orchestrates bulk fetching using `Promise.all` and optimized database queries.
* Refactored `getDeviceForUser`, `getDeviceForStripeUser` to bulk-fetch data before processing.

### Map Track Events

* "Used focus mode on day X" now correctly counts events.

### Auth0 API Call Optimization

* Token caching reduces redundant Auth0 token requests.
* Rate limiting mitigated with delays (`sleep`) between API calls.
* Conditional fetching prioritizes DB-stored device data.

### Stripe API Call Optimization

* Server-side filtering reduces data transfer using `created: { gte: timestamp }`.
* Avoids performance-intensive per-user API calls, favoring database queries.

### Efficient Excel Export

* Optimized column width calculation (`autoSizeColumnsOptimized`) speeds up large dataset exports.
* Improved header styling and boolean handling.

### Database Connection Pooling

* Consistent use of `executeQueryUsingPool` with `pg.Pool` improves connection management.

## 4. Features & Debugging

### Team ID Integration

* `fetchUserUpdatedIn45Days` retrieves `team_id` via LEFT JOIN.
* `team_id` passed to `mapTrackEvents` and included as a new "Team ID" Excel column.

### Operating System Determination Diagnostics

* Enhanced logging tracks OS determination (DB first, Auth0 fallback).

### Error Handling and Robustness

* Detailed error logging for database/API issues.
* Safe navigation (`object?.property`) and defaults prevent crashes.
* `try...catch` blocks around potential failure points.

## 5. Dependency Additions

* `moment.js`: Added for robust date parsing, formatting, and calculations.

## 6. Conclusion

* Modularization simplifies development and debugging.
* Performance improvements enhance data retrieval efficiency and reliability.
* Features and debugging improvements align with data visualization objectives.
