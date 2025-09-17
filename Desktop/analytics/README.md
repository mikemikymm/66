# Project: Analytics Processing & Dashboard

## 1. Project Overview

This project provides an analytics solution comprising two main components:

1. A **Python-based Dashboard** (`Dashboard/`) for data visualization.  
2. A **Node.js Analytics Service** (`node-js-analytics/`) for backend data processing or related tasks.

---

## 2. Purpose of the `main` Branch

This `main` branch is configured and intended for **local development and execution** of the project components. It serves as the primary base for ongoing development work.

For instructions on deploying to lambda AWS, please see `Lambda-fied` branch.

---

## 3. General Prerequisites for Local Execution

To run this project locally, you will generally need:

- **Python**: Version 3.9 or higher (for the Dashboard).  
- **pip**: Python package installer.  
- **Node.js**: Version 16.x or higher (for the Node.js service).  
- **npm**: Node.js package manager.  
- **Git**: For cloning and managing the repository.  

Specific version requirements and additional dependencies for each component are listed in their respective directories.

---

## 4. Project Structure

```
.
├── Dashboard/                 # Contains the Python Dash application & its local setup guide
├── node-js-analytics/         # Contains the Node.js analytics service & its local setup guide
└── README.md                  # This main overview guide
```

---

## 5. Getting Started with Local Development

To set up and run the project components locally, please refer to the detailed README files within each component's directory:

### For the Dashboard:

Navigate to the `Dashboard/` directory and follow the instructions in its `README.md` (or equivalent setup guide) for:

- Setting up the Python environment.  
- Installing dependencies.  
- Arranging local data files.  
- Running the Dash application.

### For the Node.js Analytics Service:

Navigate to the `node-js-analytics/` directory and consult its `README.md` (or equivalent setup guide) for:

- Setting up the Node.js environment.  
- Installing dependencies.  
- Running the service.

---

## 6. Key Local Execution Notes

**Data Handling (Dashboard)**: In this `main` branch, the Dashboard (`Dashboard/datahandling.py`) is configured to read data from local files stored within the `Dashboard/data/` directory.

**AWS CLI (Node-js)**: In this branch, the node-js analytics scripts need you to configure AWS CLI to access Focus Bear Credentials. See more in `node-js-analytics/readme.md`.
