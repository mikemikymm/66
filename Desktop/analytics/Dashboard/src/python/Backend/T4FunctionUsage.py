import plotly.graph_objects as go
import pandas as pd
from dash import dcc, html, Input, Output, State, MATCH, no_update
import plotly.express as px
from datetime import date, datetime, timedelta

from src.python.Backend.VisualVariables import FOCUS_BEAR_YELLOW, FOCUS_BEAR_LIGHT, FOCUS_BEAR_BLACK
from src.python.Backend import DataHandling

df = DataHandling.df.copy()
df["First desktop login date"] = pd.to_datetime(df["First desktop login date"], errors='coerce')

# Helper to get previous period data (can be shared or defined locally)
def get_previous_period_data_t4(start_date_str, end_date_str, full_df, date_column="First desktop login date"):
    if not start_date_str or not end_date_str:
        return pd.DataFrame()
    try:
        current_start_dt = pd.to_datetime(start_date_str)
        current_end_dt = pd.to_datetime(end_date_str)
        duration = current_end_dt - current_start_dt
        prev_end_dt = current_start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - duration
        
        df_copy = full_df.copy()
        # Ensure date_column is datetime for comparison, handling potential errors
        df_copy[date_column] = pd.to_datetime(df_copy[date_column], errors='coerce')
        df_copy.dropna(subset=[date_column], inplace=True)

        previous_df = df_copy[
            (df_copy[date_column].dt.date >= prev_start_dt.date()) &
            (df_copy[date_column].dt.date <= prev_end_dt.date())
        ]
        return previous_df
    except Exception as e:
        print(f"Error in get_previous_period_data_t4: {e}")
        return pd.DataFrame()

def usageAnalysisCallbacks(app):
    @app.callback(
        Output('graph-mode-comparison', 'figure'),
        Output('graph-feature-usage', 'figure'),
        Output('graph-habit-usage', 'figure'),  
        [
            Input({'type': 'auto-update-daterange', 'index': 'usage'}, 'start_date'),
            Input({'type': 'auto-update-daterange', 'index': 'usage'}, 'end_date'),
            Input('function-subscription-filter', 'value'),
            Input('function-platform-filter', 'value')
        ]
    )
    def update_function_usage_graphs(start_date, end_date, subscription_filter, platform_filter):
        empty_fig = go.Figure().update_layout(
            xaxis={'visible': False}, yaxis={'visible': False},
            annotations=[{'text': "No data available or<br>invalid inputs.", 'xref': "paper", 'yref': "paper", 'showarrow': False, 'font': {'size': 16}}],
            paper_bgcolor='white', plot_bgcolor='white'
        )
        if not start_date or not end_date or df.empty:
            return empty_fig, empty_fig

        # --- CURRENT PERIOD ---
        df_mode_current, df_features_current = get_split_function_usage_data(
            df, start_date, end_date, subscription_filter, platform_filter
        )
        df_mode_current['Period'] = 'Current'
        df_features_current['Period'] = 'Current'

        # --- PREVIOUS PERIOD ---
        df_previous_period = get_previous_period_data_t4(start_date, end_date, df)
        df_mode_previous, df_features_previous = get_split_function_usage_data(
            df_previous_period, # Pass the already date-filtered previous period df
            None, # start_date not needed as df_previous_period is already for that range
            None, # end_date not needed
            subscription_filter, # Apply same sub/platform filters
            platform_filter
        )
        df_mode_previous['Period'] = 'Previous'
        df_features_previous['Period'] = 'Previous'
        
        # --- Combine data for grouped bar charts ---
        # For Mode Comparison
        if df_mode_current.empty and df_mode_previous.empty:
            fig_mode = empty_fig
        else:
            df_mode_combined = pd.concat([df_mode_current, df_mode_previous], ignore_index=True)
            # Ensure 'Count' is numeric, fill NaNs with 0 if any concatenation issues
            df_mode_combined['Count'] = pd.to_numeric(df_mode_combined['Count'], errors='coerce').fillna(0)

            if df_mode_combined.empty or df_mode_combined['Count'].sum() == 0:
                fig_mode = empty_fig
            else:
                try:
                    fig_mode = px.bar(
                        df_mode_combined,
                        x='Mode_Label',
                        y='Count',
                        color='Period', # This creates the groups
                        barmode='group', # Explicitly set to group for side-by-side
                        text='Count', # Display count on bars
                        color_discrete_map={"Current": "#FFB347", "Previous": "#ADD8E6"}, # Define colors for periods
                        hover_name='Mode_Description',
                        hover_data={'Mode_Label': False, 'Period': True, 'Count': True, 'Percentage': ':.1f%'}
                    )
                    fig_mode.update_traces(texttemplate='%{text}', textposition='outside')
                    fig_mode.update_layout(
                        title_text="Simple vs Geek Mode Usage (Current vs Previous)",
                        xaxis_title=None, yaxis_title="Number of Users",
                        margin=dict(t=70, b=50, l=50, r=30), paper_bgcolor='white', plot_bgcolor='white',
                        font=dict(color=FOCUS_BEAR_BLACK),
                        xaxis=dict(type='category', tickangle=0),
                        legend_title_text='Period',
                        width=700, height=500 # Set a fixed size for consistency
                    )
                except Exception as e:
                    print(f"Error creating combined mode graph: {e}")
                    fig_mode = empty_fig
        
        # For Feature Usage
        if df_features_current.empty and df_features_previous.empty:
            fig_features = empty_fig
        else:
            df_features_combined = pd.concat([df_features_current, df_features_previous], ignore_index=True)
            df_features_combined['Count'] = pd.to_numeric(df_features_combined['Count'], errors='coerce').fillna(0)
            
            if df_features_combined.empty or df_features_combined['Count'].sum() == 0:
                fig_features = empty_fig
            else:
                try:
                    # Define a consistent color map for features if needed, or let px choose
                    feature_color_map = {
                        "Pomodoro Mode": "#F8A5C2", "Focus Mode": "#9DDE8B", "Time Tracker": "#A29BFE",
                        "Late No More": "#F6D365", "App Blocking": "#FFB6B9", "URL Blocking": "#FFEAA7",
                        "Mobile Blocking": "#D6A2E8"
                    }
                    fig_features = px.bar(
                        df_features_combined,
                        x='Feature_Label',
                        y='Count',
                        color='Period', # Group by period
                        barmode='group', # Side-by-side bars
                        text='Count',
                        # pattern_shape="Period", # Optional: use patterns if colors are too similar
                        color_discrete_map={"Current": "#FFB347", "Previous": "#ADD8E6"},
                        hover_name='Feature_Description',
                        hover_data={'Feature_Label': False, 'Period': True, 'Count': True, 'Percentage': ':.1f%'}
                    )
                    fig_features.update_traces(texttemplate='%{text}', textposition='outside')
                    fig_features.update_layout(
                        title_text="Feature & Blocking Tool Usage (Current vs Previous)",
                        xaxis_title=None, yaxis_title="Number of Users",
                        margin=dict(t=70, b=100, l=50, r=30), paper_bgcolor='white', plot_bgcolor='white',
                        font=dict(color=FOCUS_BEAR_BLACK),
                        xaxis=dict(type='category', tickangle=45),
                        legend_title_text='Period',
                        width=700, height=500 # Set a fixed size for consistency
                    )
                except Exception as e:
                    print(f"Error creating combined features graph: {e}")
                    fig_features = empty_fig
                     # Add habit usage graph with current and previous periods
        if not start_date or not end_date or df.empty:
            fig_habits = empty_fig
        else:
            try:
                # Get current period data
                filtered_df_current = filter_function_usage_data(df, start_date, end_date, subscription_filter, platform_filter)
                total_current = len(filtered_df_current)

                # Check if filtered_df_current is empty
                if filtered_df_current.empty:
                    print("filtered_df_current is empty after filtering.")
                    fig_habits = empty_fig
                    return fig_mode, fig_features, fig_habits  # Return early

                # Get previous period data
                df_previous = get_previous_period_data_t4(start_date, end_date, df)
                filtered_df_previous = filter_function_usage_data(df_previous, None, None, subscription_filter, platform_filter)
                total_previous = len(filtered_df_previous)

                # Check if filtered_df_previous is empty
                if filtered_df_previous.empty:
                    print("filtered_df_previous is empty after filtering.")
                    fig_habits = empty_fig
                    return fig_mode, fig_features, fig_habits  # Return early
                
                # Create DataFrame for both periods
                habit_data = {
                    "Habit": [],
                    "Count": [],
                    "Period": [],
                    "Percentage": []
                }

                # Define habits to track
                habits = {
                    "Break Habit": "Started a break activity",
                    "Morning Routine": "Started morning routine",
                    "Evening Routine": "Started evening routine"
                }
                # Add current period data
                for habit_label, column in habits.items():
                    count_current = int(filtered_df_current[column].fillna(False).sum())
                    habit_data["Habit"].append(habit_label)
                    habit_data["Count"].append(count_current)
                    habit_data["Period"].append("Current")
                    habit_data["Percentage"].append((count_current / total_current * 100) if total_current else 0)

                # Add previous period data
                for habit_label, column in habits.items():
                    count_previous = int(filtered_df_previous[column].fillna(False).sum())
                    habit_data["Habit"].append(habit_label)
                    habit_data["Count"].append(count_previous)
                    habit_data["Period"].append("Previous")
                    habit_data["Percentage"].append((count_previous / total_previous * 100) if total_previous else 0)

                df_habits = pd.DataFrame(habit_data)

                # Create the figure
                fig_habits = px.bar(
                    df_habits,
                    x="Habit",
                    y="Count",
                    color="Period",
                    barmode="group",
                    text="Count",
                    color_discrete_map={"Current": "#FFB347", "Previous": "#ADD8E6"},
                    hover_data={"Percentage": ":.1f%"}
                )
                fig_habits.update_traces(
                    texttemplate='%{text}',
                    textposition="outside",
                    cliponaxis=False
                )
                
                fig_habits.update_layout(
                    title_text="Habit Usage (Current vs Previous)",
                    xaxis_title=None,
                    yaxis_title="Number of Users",
                    showlegend=True,
                    legend_title_text="Period",
                    paper_bgcolor="white",
                    plot_bgcolor="white",
                    margin=dict(t=70, b=50, l=50, r=30),
                    font=dict(color=FOCUS_BEAR_BLACK),
                    width=700,
                    height=500
                )
            except Exception as e:
                print(f"Error creating habit usage graph: {e}")
                fig_habits = empty_fig


        return fig_mode, fig_features, fig_habits

# === Helper Functions (filter_function_usage_data, get_split_function_usage_data) ===
# IMPORTANT: Modify get_split_function_usage_data to correctly handle
# being called for the previous period where start/end dates might be None.

def filter_function_usage_data(df_to_filter, start_date_str, end_date_str, subscription_filter='all', platform_filter='all'):
    if df_to_filter.empty:
        return pd.DataFrame()
    
    # Create a copy to avoid modifying the original DataFrame slice
    filtered_df = df_to_filter.copy()

    if subscription_filter != 'all':
        filtered_df = filtered_df[filtered_df['Subscription Status'].fillna('').str.lower() == subscription_filter.lower()]
    if platform_filter != 'all':
        filtered_df = filtered_df[filtered_df['platform'].fillna('').str.lower() == platform_filter.lower()]

    # Date filtering is applied *before* calling get_split_function_usage_data for the previous period.
    # For the current period, it's applied here.
    if start_date_str and end_date_str and "First desktop login date" in filtered_df.columns:
        try:
            start_dt = pd.to_datetime(start_date_str).date()
            end_dt = pd.to_datetime(end_date_str).date()
            # Ensure the date column in filtered_df is also just date for comparison
            # This assumes 'First desktop login date' in the global 'df' was already converted.
            # If not, it should be converted here.
            # For safety, re-ensure conversion if not already done on the input df_to_filter
            if not pd.api.types.is_datetime64_any_dtype(filtered_df["First desktop login date"]):
                 filtered_df["First desktop login date"] = pd.to_datetime(filtered_df["First desktop login date"], errors='coerce')
            
            filtered_df = filtered_df.dropna(subset=["First desktop login date"]) # Drop if conversion failed
            if not filtered_df.empty:
                 filtered_df = filtered_df[
                     (filtered_df['First desktop login date'].dt.date >= start_dt) &
                     (filtered_df['First desktop login date'].dt.date <= end_dt)
                 ]
        except Exception as e:
            print(f"Date Filter Error in filter_function_usage_data: {e}")
            return pd.DataFrame()
    elif start_date_str and end_date_str and "First desktop login date" not in filtered_df.columns:
         print("Warning: 'First desktop login date' not found for date filtering in filter_function_usage_data.")
         return pd.DataFrame()
         
    return filtered_df

def get_split_function_usage_data(input_df, start_date, end_date, subscription_filter='all', platform_filter='all'):
    """
    Processes an already date-filtered (or full) DataFrame to get mode and feature usage.
    If start_date and end_date are provided, it applies date filtering.
    Otherwise, it assumes input_df is already filtered for the desired period.
    """
    # If start_date and end_date are provided, perform the full filtering.
    # Otherwise, input_df is assumed to be pre-filtered by date (e.g., for previous period).
    if start_date and end_date:
        filtered_df_for_period = filter_function_usage_data(input_df, start_date, end_date, subscription_filter, platform_filter)
    else: # input_df is already for a specific period (e.g. previous), just apply sub/platform filters
        temp_df = input_df.copy()
        if subscription_filter != 'all':
            temp_df = temp_df[temp_df['Subscription Status'].fillna('').str.lower() == subscription_filter.lower()]
        if platform_filter != 'all':
            temp_df = temp_df[temp_df['platform'].fillna('').str.lower() == platform_filter.lower()]
        filtered_df_for_period = temp_df

    total_users = len(filtered_df_for_period)
    empty_mode_df = pd.DataFrame({'Mode_Label': [], 'Mode_Description': [], 'Count': [], 'Percentage': []})
    empty_feature_df = pd.DataFrame({'Feature_Label': [], 'Feature_Description': [], 'Count': [], 'Percentage': []})

    if total_users == 0:
        return empty_mode_df, empty_feature_df

    # --- Graph 1: Simple vs Geek ---
    geek_col = 'Switched to geek mode'
    if geek_col not in filtered_df_for_period.columns: filtered_df_for_period[geek_col] = False
    filtered_df_for_period[geek_col] = filtered_df_for_period[geek_col].fillna(False).astype(bool)
    mode_data = {'Mode_Label': [], 'Mode_Description': [], 'Count': [], 'Percentage': []}
    geek_mode_count = filtered_df_for_period[geek_col].sum()
    mode_data['Mode_Label'].append("Geek Mode"); mode_data['Mode_Description'].append(f"Geek Mode ({geek_mode_count}/{total_users} users)")
    mode_data['Count'].append(geek_mode_count); mode_data['Percentage'].append((geek_mode_count / total_users) * 100 if total_users > 0 else 0)
    simple_mode_count = total_users - geek_mode_count
    mode_data['Mode_Label'].append("Simple Mode (Default)"); mode_data['Mode_Description'].append(f"Simple Mode ({simple_mode_count}/{total_users} users)")
    mode_data['Count'].append(simple_mode_count); mode_data['Percentage'].append((simple_mode_count / total_users) * 100 if total_users > 0 else 0)
    df_mode = pd.DataFrame(mode_data)

    # --- Graph 2: Other Features & Blocking Tools ---
    feature_data = {'Feature_Label': [], 'Feature_Description': [], 'Count': [], 'Percentage': []}
    feature_map = {
        "Pomodoro Mode": "Started pomodoro", "Focus Mode": "Started focus mode",
        "Time Tracker": "Enabled Time Tracker", "Late No More": "Enabled Late No More",
        "App Blocking": "Blocked an app", "URL Blocking": "Blocked a url", "Mobile Blocking": "Blocked on mobile"
    }
    for label, col in feature_map.items():
        count = 0
        if col in filtered_df_for_period.columns:
            count = filtered_df_for_period[col].fillna(False).astype(bool).sum()
        feature_data['Feature_Label'].append(label); feature_data['Feature_Description'].append(f"{label} ({count}/{total_users} users)")
        feature_data['Count'].append(count); feature_data['Percentage'].append((count / total_users) * 100 if total_users > 0 else 0)
    df_features = pd.DataFrame(feature_data)

    return df_mode, df_features


# --- Other helper functions (get_modes_count, get_blocking_count) ---
# These were not used by the main callback, leaving them as is for now,
# but they would also need updates to handle start/end dates correctly if used later.

def get_modes_count(df, start_date, end_date, subscription_filter='all', platform_filter='all'):
    """Get the total count of users using Geek or Pomodoro mode"""
    filtered_df = filter_function_usage_data(df, start_date, end_date, subscription_filter, platform_filter)
    total_users = len(filtered_df)
    if total_users == 0: return "0 users"

    geek_col = 'Switched to geek mode'
    pomo_col = 'Started pomodoro'
    # Check/add columns and fill NaNs
    if geek_col not in filtered_df.columns: filtered_df[geek_col] = False
    if pomo_col not in filtered_df.columns: filtered_df[pomo_col] = False
    filtered_df[geek_col] = filtered_df[geek_col].fillna(False).astype(bool)
    filtered_df[pomo_col] = filtered_df[pomo_col].fillna(False).astype(bool)

    modes_count = filtered_df[filtered_df[geek_col] | filtered_df[pomo_col]].shape[0]

    return f"{modes_count} / {total_users} users"


def get_blocking_count(df, start_date, end_date, subscription_filter='all', platform_filter='all'):
    """Get the total count of users using any blocking feature"""
    filtered_df = filter_function_usage_data(df, start_date, end_date, subscription_filter, platform_filter)
    total_users = len(filtered_df)
    if total_users == 0: return "0 users"

    block_cols = ['Blocked an app', 'Blocked a url', 'Blocked on mobile']
    blocking_count = 0
    query = []
    for col in block_cols:
        if col in filtered_df.columns:
             # Ensure boolean before using in query
             filtered_df[col] = filtered_df[col].fillna(False).astype(bool)
             query.append(f"`{col}` == True") # Use backticks for column names with spaces

    if query:
        blocking_count = filtered_df.query(" or ".join(query)).shape[0]
    else:
        print("Warning: No blocking columns found.")


    return f"{blocking_count} / {total_users} users"

