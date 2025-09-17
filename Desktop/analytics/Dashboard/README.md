# Focus Bear Data DashBoard

This project is a data dashboard for the Focus Bear project. It allows Focus Bear staff to visualize and analyze data related to users usage of the Focus Bear application.

## Directory 
```bash
D:.
│   app.py
│   README.md
│   requirements.txt
│
├───assets
│       logo.png
│       style.css
│
├───data
│       onboarding_tracking_report.xlsx
│
├───src
│   └───python
│       │   FrontEnd.py
│       │
│       ├───Backend
│       │   │   DataHandling.py
│       │   │   T1OverviewBackEnd.py
│       │   │   T2HabbitsBackEnd.py
│       │   │   T3UserDemographics.py
│       │   │   T4FunctionUsage.py
│       │   │   VisualVariables.py
│       │   │
│       │   └───__pycache__
│       └───__pycache__
└───testingSpace
        test.ipynb
```

## Installation

To install the necessary dependencies, run:

```bash
poetry install --no-root
```

## Usage

To run the dashboard, use the following command:

```bash
poetry env activate
python app.py
```

## exporting to executable

To run the dashboard via exe, use the following command:

python -m PyInstaller --onefile --windowed --add-data "data/onboarding_tracking_report.xlsx;data" --add-data "assets;assets" app.py

## License

This project is licensed under the MIT License.