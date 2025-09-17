import pandas as pd 
import numpy as np
from datetime import date
import plotly.express as px
import plotly.graph_objects as go
import sys
import os

def resource_path(relative_path):
    """ Get the absolute path to a resource bundled with PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

# Calcuate Dates
fortnight_ago = date(2025, 3, 1)
current_date = date(2025, 3, 15)


# import data from xlsx file
excel_file = resource_path("data/onboarding_tracking_report.xlsx")

# Load the workbook
xls = pd.ExcelFile(excel_file)

# Read each sheet into a DataFrame, adding a column for the sheet name
df_list = []
for sheet_name in xls.sheet_names:
    temp_df = pd.read_excel(excel_file, sheet_name=sheet_name)
    temp_df["platform"] = sheet_name
    df_list.append(temp_df)

# Concatenate into a single DataFrame
df = pd.concat(df_list, ignore_index=True)

# Add aggregate habit columns for analysis
df["did_morning_habit"] = df[[f"Did morning habits on day {i}" for i in range(1, 29)]].sum(axis=1)
df["did_evening_habit"] = df[[f"Did evening habits on day {i}" for i in range(1, 29)]].sum(axis=1)
df["did_break_habit"] = df[[f"Used breaks on day {i}" for i in range(1, 29)]].sum(axis=1)
df["did_focus_session"] = df[[f"Used focus mode on day {i}" for i in range(1, 29)]].sum(axis=1)



###//////////////////////////////////////////
### New Data for Tab 5: User Feedback
###//////////////////////////////////////////

# Load CSAT survey data
feedback_csv_file = resource_path("data/monthly_feedback_ratings.csv")
df_feedback_ratings = pd.read_csv(feedback_csv_file)
df_feedback_ratings['Month'] = pd.to_datetime(df_feedback_ratings['Month'], format='%Y-%m').dt.strftime('%b %Y') # Format for display

# Load user perception log data
signup_date_col = 'User Signup Date'
completion_date_col = 'Completion Date'
impact_category_col = 'Impact Category'   # Column specifying 'perception_of_prod', 'mood', etc.
quantity_logged_col = 'Quantity Logged' # The score/value
user_id_col = 'User DB ID'            # Column for unique user identification

# Load the Excel file for perception/impact data
excel_file_path = resource_path("data/productivity_impact_report.xlsx")
df_impact_raw = pd.read_excel(excel_file_path)

# Function to process data for a specific impact category
def process_impact_category_data(df_raw, category_name, max_weeks_filter=16): # Added max_weeks_filter
    if df_raw.empty:
        print(f"WARNING: Raw impact data is empty. Cannot process for {category_name}.")
        return pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count'])

    # Create a copy to avoid modifying the original df_raw within this function for different categories
    df_processing = df_raw.copy()

    # Ensure essential columns exist
    required_columns = [signup_date_col, completion_date_col, impact_category_col, quantity_logged_col, user_id_col]
    for col in required_columns:
        if col not in df_processing.columns:
            print(f"ERROR: Essential column '{col}' not found in the Excel sheet for processing {category_name}!")
            return pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count'])

    # Ensure date columns are datetime
    df_processing[signup_date_col] = pd.to_datetime(df_processing[signup_date_col], errors='coerce')
    df_processing[completion_date_col] = pd.to_datetime(df_processing[completion_date_col], errors='coerce')
    
    # Ensure quantity_logged is numeric
    df_processing[quantity_logged_col] = pd.to_numeric(df_processing[quantity_logged_col], errors='coerce')


    # Filter for the specific impact category
    df_category = df_processing[df_processing[impact_category_col] == category_name].copy() # Use .copy() to avoid SettingWithCopyWarning
        
    # Drop rows where essential dates, score, or user_id are missing (NaN/NaT)
    # This will happen if to_datetime or to_numeric coerced values to NaT/NaN due to bad data
    cols_to_check_for_na = [signup_date_col, completion_date_col, quantity_logged_col, user_id_col]
    df_category.dropna(subset=cols_to_check_for_na, inplace=True)
        
    # Calculate weeks since signup
    df_category['Weeks Since Signup'] = ((df_category[completion_date_col] - df_category[signup_date_col]).dt.days // 7) + 1
    
    # Filter out non-positive weeks and apply max_weeks_filter
    df_category = df_category[df_category['Weeks Since Signup'] > 0]
    if max_weeks_filter:
         df_category = df_category[df_category['Weeks Since Signup'] <= max_weeks_filter]

    # Aggregate: Median score and count of unique users
    df_processed = df_category.groupby('Weeks Since Signup').agg(
        Median_Score=(quantity_logged_col, 'median'),
        User_Count=(user_id_col, 'nunique') 
    ).reset_index()
    
    df_processed.rename(columns={'Median_Score': 'Median Score', 'User_Count': 'User Count'}, inplace=True)
    if not df_processed.empty:
       return df_processed

# Define the categories to process
categories_to_process = {
    "perception": "perception_of_productivity",
    "mood": "mood",
    "energy": "energy_level_upon_awakening",
    "sleep": "hours_of_sleep"
}

# Process for each required category and store in a dictionary or individual variables
processed_dataframes = {}
for df_name_key, category_value in categories_to_process.items():
    # Your current code has max_weeks_filter=16, so we'll use that.
    # If different categories need different max_weeks, you can adjust this.
    processed_dataframes[f'df_efficacy_{df_name_key}'] = process_impact_category_data(df_impact_raw, category_value, max_weeks_filter=16)

# For easier access in T5UserFeedback.py, you can assign them to individual variables:
df_efficacy_perception = processed_dataframes.get('df_efficacy_perception', pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count']))
df_efficacy_mood = processed_dataframes.get('df_efficacy_mood', pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count']))
df_efficacy_energy = processed_dataframes.get('df_efficacy_energy', pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count']))
df_efficacy_sleep = processed_dataframes.get('df_efficacy_sleep', pd.DataFrame(columns=['Weeks Since Signup', 'Median Score', 'User Count']))

# minmax dates
def get_min_date():
    """Get the minimum date from the DataFrame."""
    min_date = df["First desktop login date"].min()
    if not isinstance(min_date, str):
        min_date = min_date.strftime('%Y-%m-%d')
    return min_date

def get_max_date():
    """Get the maximum date from the DataFrame."""
    max_date = df["First desktop login date"].max()
    if not isinstance(max_date, str):
        max_date = max_date.strftime('%Y-%m-%d')
    return max_date