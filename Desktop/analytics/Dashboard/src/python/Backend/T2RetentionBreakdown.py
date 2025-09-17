# --- START OF FILE T2HabbitsBackEnd.py ---

import dash
from dash import dcc, html, Input, Output
import pandas as pd
from datetime import date, datetime, timedelta
import plotly.graph_objects as go
import numpy as np # Import numpy for finding max in list of lists

# Import data and variables from other files
from src.python.Backend.VisualVariables import FOCUS_BEAR_YELLOW, FOCUS_BEAR_LIGHT, FOCUS_BEAR_BLACK, custom_colorscale
from src.python.Backend import DataHandling # This will provide df and create_habits_heatmap
from src.python.Backend.DataHandling import df # Directly import df if it's a global variable in DataHandling


def get_previous_period_data(start_date_str, end_date_str, full_df, date_column="First desktop login date"):
    """
    Calculates the DataFrame for the period immediately preceding the given start_date and end_date,
    with the same duration. Also returns the start and end dates of this previous period.
    """
    if not start_date_str or not end_date_str:
        return pd.DataFrame(), None, None # Return empty DataFrame and None for dates
    try:
        current_start_dt = pd.to_datetime(start_date_str)
        current_end_dt = pd.to_datetime(end_date_str)

        duration = current_end_dt - current_start_dt

        prev_end_dt = current_start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - duration # Subtract the same duration

        df_copy = full_df.copy() # Work on a copy
        df_copy[date_column] = pd.to_datetime(df_copy[date_column], errors='coerce')
        df_copy = df_copy.dropna(subset=[date_column]) # Remove rows where date conversion failed

        previous_df = df_copy[
            (df_copy[date_column].dt.date >= prev_start_dt.date()) &
            (df_copy[date_column].dt.date <= prev_end_dt.date())
        ]
        return previous_df, prev_start_dt.strftime('%Y-%m-%d'), prev_end_dt.strftime('%Y-%m-%d')
    except Exception as e:
        print(f"Error in get_previous_period_data: {e}")
        return pd.DataFrame(), None, None

def create_habits_heatmap(df_input, user_id_column="Userid"):
    """
    Creates a heatmap showing habit usage across days 1-28 for all habit prefixes.
    Y-axis: Habit prefixes
    X-axis: Day numbers (1-28)
    Z value: PERCENTAGE of unique users performing that habit on that day.
    RETURNS: plotly.graph_objects.Figure, list_of_lists_with_percentage_data (z_data)
    """
    PREFIXES = [
        "Did morning habits on day",
        "Did evening habits on day",
        "Used breaks on day",
        "Used focus mode on day"
    ]
    
    heatmap_z_data_percent = [] # This will be our raw z data

    if df_input is None or df_input.empty:
        empty_z_data = [[0 for _ in range(28)] for _ in PREFIXES] # Empty data structure
        fig = go.Figure()
        fig.update_layout(
            title_text="Habit Usage Heatmap (% Users)",
            annotations=[dict(text="No data available for selected period/filters", showarrow=False)],
            xaxis_showticklabels=False, yaxis_showticklabels=False
        )
        return fig, empty_z_data # Return empty figure and empty z_data

    if user_id_column not in df_input.columns:
        
        empty_z_data = [[0 for _ in range(28)] for _ in PREFIXES]
        fig = go.Figure()
        fig.update_layout(
            title_text="Habit Usage Heatmap (Error)",
            annotations=[dict(text=f"User ID column '{user_id_column}' missing.", showarrow=False)],
            xaxis_showticklabels=False, yaxis_showticklabels=False
        )
        return fig, empty_z_data
        
    total_unique_users = df_input[user_id_column].nunique()

    if total_unique_users == 0:
        for _ in PREFIXES: # Iterate to match the number of rows expected
            heatmap_z_data_percent.append([0.0] * 28) # 28 days of zeros
    else:
        for prefix in PREFIXES:
            row_data_percent = []
            for day in range(1, 29):
                col_name = f"{prefix} {day}"
                if col_name in df_input.columns:
                    count_habit_day = df_input[col_name].fillna(0).astype(bool).sum()
                    percentage = (count_habit_day / total_unique_users) * 100
                    row_data_percent.append(round(percentage, 2))
                else:
                    row_data_percent.append(0.0)
            heatmap_z_data_percent.append(row_data_percent)
    
    # The figure is created using this heatmap_z_data_percent
    fig = go.Figure(data=go.Heatmap(
        z=heatmap_z_data_percent,
        x=[str(i) for i in range(1, 29)],
        y=PREFIXES,
        colorscale=custom_colorscale, # Default, will be overridden by callback if dynamic zmax is used
        # zmin will be set by callback, zmax will be dynamic
        hovertemplate="Day %{x}<br>%{y}<br>Percentage: %{z:.2f}%<extra></extra>",
        colorbar=dict(title='% Users Engaging'),
        showscale=True
    ))
    
    fig.update_layout(
        title="Habit Usage Heatmap (% Users)",
        xaxis=dict(title="Day Number (Relative to User's Start in Period)", tickmode='linear', dtick=1),
        yaxis=dict(title="Habit Type"),
        margin=dict(t=60, l=250, r=50, b=50),
        height=600,
    )
    
    return fig, heatmap_z_data_percent # Return both the figure and the raw z data

def CategoryBreakDownCallBacks(app):

    def calculate_days_and_format_period(start_date_str, end_date_str, period_label="Selected Period"):
        """Formats the date period string for display."""
        if start_date_str and end_date_str:
            try:
                start_dt = pd.to_datetime(start_date_str)
                end_dt = pd.to_datetime(end_date_str)
                num_days = (end_dt - start_dt).days + 1
                return f"<b>{period_label}: {start_dt.strftime('%b %d, %Y')} - {end_dt.strftime('%b %d, %Y')} ({num_days} days)</b>"
            except ValueError: # Handle case where date strings might not be valid yet
                 return f"<b>{period_label}: Invalid dates</b>"
            except Exception: # Catch any other parsing error
                 return f"<b>{period_label}: Calculating...</b>"
        return f"<b>{period_label}: No period selected</b>"

    @app.callback(
        [Output('habits-heatmap', 'figure'),
         Output('habits-heatmap-previous', 'figure')],
        [Input({'type': 'auto-update-daterange', 'index': 'habits'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'habits'}, 'end_date'),
         Input('habits-subscription-filter', 'value'),
         Input('habits-platform-filter', 'value')]
    )
    def update_heatmaps(start_date, end_date, subscription_filter, platform_filter):
        if not start_date or not end_date:
            empty_fig_layout = dict(
                title_text="Please select a date range",
                xaxis_showticklabels=False, yaxis_showticklabels=False,
                paper_bgcolor=FOCUS_BEAR_LIGHT, plot_bgcolor='white',
                font=dict(color=FOCUS_BEAR_BLACK)
            )
            return go.Figure(layout=empty_fig_layout), go.Figure(layout=empty_fig_layout)

        # --- CURRENT PERIOD DATA ---
        current_filtered_df = df.copy()
        current_filtered_df["First desktop login date"] = pd.to_datetime(current_filtered_df["First desktop login date"], errors='coerce')
        current_filtered_df.dropna(subset=["First desktop login date"], inplace=True)
        try:
            current_start_dt_obj = pd.to_datetime(start_date).date()
            current_end_dt_obj = pd.to_datetime(end_date).date()
        except ValueError:
            error_fig_layout = dict(
                title_text="Invalid date format selected",
                xaxis_showticklabels=False, yaxis_showticklabels=False,
                paper_bgcolor=FOCUS_BEAR_LIGHT, plot_bgcolor='white',
                font=dict(color=FOCUS_BEAR_BLACK)
            )
            return go.Figure(layout=error_fig_layout), go.Figure(layout=error_fig_layout)

        current_filtered_df = current_filtered_df[
            (current_filtered_df["First desktop login date"].dt.date >= current_start_dt_obj) &
            (current_filtered_df["First desktop login date"].dt.date <= current_end_dt_obj)
        ]

        if subscription_filter != 'all':
            current_filtered_df = current_filtered_df[current_filtered_df["Subscription Status"] == subscription_filter]

        if platform_filter != 'all':
            if platform_filter == 'unknown':
                current_filtered_df = current_filtered_df[current_filtered_df["platform"].isna() | (current_filtered_df["platform"] == "")]
            else:
                current_filtered_df = current_filtered_df[current_filtered_df["platform"].astype(str).str.lower() == platform_filter.lower()]

    
        fig_current, z_data_current = create_habits_heatmap(current_filtered_df, user_id_column="Userid")
        current_period_text = calculate_days_and_format_period(start_date, end_date, "Current Period")

        # --- PREVIOUS PERIOD DATA ---
        previous_filtered_df, prev_start_str, prev_end_str = get_previous_period_data(start_date, end_date, df, date_column="First desktop login date")
        if not previous_filtered_df.empty:
            if subscription_filter != 'all':
                previous_filtered_df = previous_filtered_df[previous_filtered_df["Subscription Status"] == subscription_filter]
            if platform_filter != 'all':
                if platform_filter == 'unknown':
                    previous_filtered_df = previous_filtered_df[previous_filtered_df["platform"].isna() | (previous_filtered_df["platform"] == "")]
                else:
                    previous_filtered_df = previous_filtered_df[previous_filtered_df["platform"].astype(str).str.lower() == platform_filter.lower()]
        
        fig_previous, z_data_previous = create_habits_heatmap(previous_filtered_df)
        previous_period_text = calculate_days_and_format_period(prev_start_str, prev_end_str, "Previous Period") if prev_start_str and prev_end_str else "<b>Previous Period: N/A</b>"

        # --- DETERMINE DYNAMIC ZMAX ---
        max_val_current = 0
        if z_data_current and any(z_data_current):
            flat_current = [item for sublist in z_data_current for item in sublist if isinstance(item, (int, float))] # Ensure items are numeric
            if flat_current: max_val_current = np.max(flat_current)

        max_val_previous = 0
        if z_data_previous and any(z_data_previous):
            flat_previous = [item for sublist in z_data_previous for item in sublist if isinstance(item, (int, float))] # Ensure items are numeric
            if flat_previous: max_val_previous = np.max(flat_previous)
        
        overall_max_z = max(max_val_current, max_val_previous)

        if overall_max_z == 0: # No data or all values are zero
            dynamic_zmax = 10 # Default small range if no data, or use 100 if you want full scale
        elif overall_max_z <= 10: # If max actual value is 10% or less
            dynamic_zmax = 10   # Set scale top to 10%
        elif overall_max_z <= 25:
            dynamic_zmax = 25
        elif overall_max_z <= 50:
            dynamic_zmax = 50
        else: # For values > 50%, scale up to 100%
            dynamic_zmax = 100
        
        # --- UPDATE FIGURE LAYOUTS WITH DYNAMIC ZMAX ---
        # Current Figure
        existing_annotations_current = list(fig_current.layout.annotations) if fig_current.layout.annotations else []
        fig_current.update_layout(
            width= 1300,
            height=500,
            annotations=[dict(text=current_period_text, xref="paper", yref="paper", x=0.5, y=1.05, showarrow=False, font=dict(size=14, color=FOCUS_BEAR_BLACK), align='center')] + existing_annotations_current,
            coloraxis=dict(
                colorscale=fig_current.layout.coloraxis.colorscale if fig_current.layout.coloraxis and fig_current.layout.coloraxis.colorscale else custom_colorscale,
                cmin=0,
                cmax=dynamic_zmax
            ),
            paper_bgcolor=FOCUS_BEAR_LIGHT,
            plot_bgcolor='white',
            font=dict(color=FOCUS_BEAR_BLACK)
        )

        # Previous Figure
        existing_annotations_previous = list(fig_previous.layout.annotations) if fig_previous.layout.annotations else []
        fig_previous.update_layout(
            width=1300,
            height=500,
            annotations=[dict(text=previous_period_text, xref="paper", yref="paper", x=0.5, y=1.05, showarrow=False, font=dict(size=14, color=FOCUS_BEAR_BLACK), align='center')] + existing_annotations_previous,
            coloraxis=dict(
                colorscale=fig_previous.layout.coloraxis.colorscale if fig_previous.layout.coloraxis and fig_previous.layout.coloraxis.colorscale else custom_colorscale,
                cmin=0,
                cmax=dynamic_zmax # Apply THE SAME dynamic zmax
            ),
            paper_bgcolor=FOCUS_BEAR_LIGHT,
            plot_bgcolor='white',
            font=dict(color=FOCUS_BEAR_BLACK)
        )

        return fig_current, fig_previous

    @app.callback(
        Output('retention-cohort-end-date-output', 'children'),
        [Input({'type': 'auto-update-daterange', 'index': 'habits'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'habits'}, 'end_date')]
    )
    def update_retention_period_display(start_date_str, end_date_str):
        if not start_date_str or not end_date_str:
            return "Select a date range above to see the analysis period."
        try:
            start_dt = pd.to_datetime(start_date_str)
            end_dt = pd.to_datetime(end_date_str)
            return f"Analyzing Period: {start_dt.strftime('%b %d, %Y')} - {end_dt.strftime('%b %d, %Y')}"
        except Exception as e:
            return "Calculating period..."