import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from dash import Input, Output, dcc, html

# Import processed data from DataHandling
from .DataHandling import (
    df_feedback_ratings,
    df_efficacy_perception,
    df_efficacy_mood,
    df_efficacy_energy,
    df_efficacy_sleep
)
from .VisualVariables import FOCUS_BEAR_YELLOW, FOCUS_BEAR_BLACK

def create_csat_survey_chart(data_df):
    """
    Creates the CSAT survey line chart with Feedback Count as text annotations.
    data_df should have 'Month', 'Average Rating', and 'Feedback Count' columns.
    """
    # Calculate total feedback count
    total_feedback_count = data_df['Feedback Count'].sum() if not data_df.empty else 0

    if data_df.empty:
        return go.Figure(layout={"title": f"No CSAT Data Available (Total Responses: {total_feedback_count})"})

    # Prepare for text annotations (feedback counts)
    annotations = []
    for i, row in data_df.iterrows():
        annotations.append(
            dict(
                x=row['Month'],
                y=row['Average Rating'],
                text=f"n={row['Feedback Count']}", # Text to display (e.g., "n=58")
                showarrow=False,
                font=dict(size=9, color="gray"),
                yshift=-15,  # Shift text slightly below the marker
                xanchor='center',
                yanchor='top'
            )
        )

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=data_df['Month'],
        y=data_df['Average Rating'],
        mode='lines+markers', # Markers are important for annotation reference
        name='Average Rating',
        line=dict(color='#1f77b4'),
        marker=dict(size=8),
        # Keep hovertemplate for interactive viewing
        customdata=data_df['Feedback Count'], # Add feedback count to customdata for hover
        hovertemplate=(
            "<b>Month: %{x}</b><br>" +
            "Avg. Rating: %{y:.2f}<br>" + # Format rating to 2 decimal places
            "Feedback Count: %{customdata}<extra></extra>"
        )
    ))

    fig.add_hline(
        y=5,
        line_dash="dash",
        line_color="red",
        annotation_text="Max Score (5)",
        annotation_position="bottom right"
    )

    fig.update_layout(
        title_text=f'Average Feedback Score From CSat survey (Total Responses: {total_feedback_count})', # Updated title
        xaxis_title='Month',
        yaxis_title='Average Rating',
        legend=dict(x=0.01, y=0.99),
        plot_bgcolor='white',
        paper_bgcolor='white',
        font=dict(color=FOCUS_BEAR_BLACK),
        annotations=annotations, # Add the feedback count annotations
        width=1800,  # Set a fixed width for consistency
        height=500  # Set a fixed height for consistency
    )
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='LightGray')
    
    # Adjust y-axis range to make space for annotations below points
    min_y_data = data_df['Average Rating'].min() if not data_df.empty else 0
    max_y_data = 5.0 # CSAT score max is 5

    # Give some padding at the bottom for the text
    # The y-axis range is 0-5.5, so a fixed shift or small percentage works.
    # Let's ensure the range starts a bit lower than the lowest data point to show text.
    # Assuming ratings are generally positive, we can set a lower bound for text visibility.
    # Smallest possible rating could be 1 (or 0 if allowed).
    # Let's make the range start from a value that gives space.
    # The default yaxis=dict(range=[0, 5.5]) already gives good top padding.
    # We just need to ensure the bottom has space if data points are low.
    
    # Heuristic for bottom padding:
    padding_bottom_value = 0.5 # Adjust as needed
    display_min_y = min(min_y_data - padding_bottom_value if not data_df.empty else 0, 0) # Ensure it can go below 0 if needed for text, but typically not for CSAT. Start from 0 or lower for text.
                                                                                      # More simply, just ensure the existing range [0, 5.5] has enough room.
                                                                                      # If lowest point is 1, yshift -15 on an 0-5.5 scale should be fine.
                                                                                      # If a point is at y=0.2, yshift -15 would push text below 0.

    current_y_range_min = 0 # from existing yaxis=dict(range=[0, 5.5])
    if not data_df.empty and min_y_data < (current_y_range_min + padding_bottom_value):
        # If lowest data point is too close to current y_range_min to show text below with yshift
        # This part is tricky without knowing actual y-pixel scale vs data scale for yshift
        # For now, we rely on the yshift and the existing [0, 5.5] range.
        # If points are very low (e.g., close to 0), the yshift=-15 might push text off-chart.
        # A more robust solution would calculate yshift in data units, but that's complex.
        # For simplicity, let's assume yshift=-15 is visually acceptable within the 0-5.5 range.
        pass


    fig.update_yaxes(range=[0, 5.5], showgrid=True, gridwidth=1, gridcolor='LightGray') # Keep the original range, yshift should handle placement

    return fig

def create_efficacy_chart(data_df, category_title_segment, y_axis_label):
    """
    Creates the Efficacy chart with a trend line and user counts as text annotations.
    data_df should have 'Weeks Since Signup', 'Median Score', and 'User Count' columns.
    """
    # Calculate total user count
    if data_df is None or data_df.empty:
        print(f"WARNING: Data for {category_title_segment} is empty. Cannot create chart.")
        return go.Figure(layout={"title": f"No Data Available for {category_title_segment}"})
    else:
        total_user_count = data_df['User Count'].sum() if not data_df.empty else 0
    
    chart_title_base = f"Efficacy - self reported {category_title_segment} (Total Users: {total_user_count})" # Updated title base
    
    if data_df.empty:
        fig = go.Figure(layout={"title": chart_title_base}) # Use updated title base
        fig.update_layout(
            xaxis_title='Weeks Since Signup',
            yaxis_title=y_axis_label,
            plot_bgcolor='white',
            paper_bgcolor='white',
            font=dict(color=FOCUS_BEAR_BLACK),
            width=1800,  # Set a fixed width for consistency
            height=500  # Set a fixed height for consistency
        )
        return fig
        
    # Prepare for text annotations (user counts)
    annotations = []
    for i, row in data_df.iterrows():
        annotations.append(
            dict(
                x=row['Weeks Since Signup'],
                y=row['Median Score'],
                text=f"n={row['User Count']}", # Text to display (e.g., "n=25")
                showarrow=False,
                font=dict(size=9, color="gray"),
                yshift=-15,  # Shift text slightly below the marker
                xanchor='center',
                yanchor='top'
            )
        )
    
    fig = go.Figure()

    # Scatter plot for median values
    fig.add_trace(go.Scatter(
        x=data_df['Weeks Since Signup'],
        y=data_df['Median Score'],
        mode='markers+lines', # Markers are important for annotation reference
        name='Median Values',
        marker=dict(color='purple', size=8),
        line=dict(color='purple', width=1, dash='dot'),
        # Keep hovertemplate for interactive viewing, but static export will use annotations
        customdata=data_df['User Count'],
        hovertemplate=(
            "<b>Week: %{x}</b><br>" +
            f"{y_axis_label}: %{{y}}<br>" +
            "User Count: %{customdata}<extra></extra>"
        )
    ))

    # Trend line (only if enough data)
    title_suffix = ""
    if len(data_df) >= 2:
        x_values_trend = data_df['Weeks Since Signup']
        y_values_trend = data_df['Median Score']
        
        coeffs = np.polyfit(x_values_trend, y_values_trend, 1)
        trend_poly = np.poly1d(coeffs)
        y_trend = trend_poly(x_values_trend)

        fig.add_trace(go.Scatter(
            x=x_values_trend,
            y=y_trend,
            mode='lines',
            name='Trend Line',
            line=dict(color='red', dash='dash'),
            hovertemplate="Trend<extra></extra>"
        ))

    fig.update_layout(
        title_text=f"{chart_title_base}{title_suffix}", # Updated title
        xaxis_title='Weeks Since Signup',
        yaxis_title=y_axis_label,
        legend=dict(x=0.01, y=0.99),
        plot_bgcolor='white',
        paper_bgcolor='white',
        font=dict(color=FOCUS_BEAR_BLACK),
        annotations=annotations,
        width=1800,  # Set a fixed width for consistency
        height=500  # Set a fixed height for consistency
    )
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='LightGray',zeroline=False)
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='LightGray',zeroline=False)
    
    # Adjust y-axis range to make space for annotations below points
    min_y_data = data_df['Median Score'].min() if not data_df.empty else 0
    max_y_data = data_df['Median Score'].max() if not data_df.empty else 10
    
    # Give some padding, especially at the bottom for the text
    y_padding_bottom = (max_y_data - min_y_data) * 0.15 if (max_y_data - min_y_data) > 0 else 1.5 
    y_padding_top = (max_y_data - min_y_data) * 0.05 if (max_y_data - min_y_data) > 0 else 0.5

    final_min_y = min(0, min_y_data - y_padding_bottom) # Ensure 0 is included if relevant, or go lower for text
    final_max_y = max_y_data + y_padding_top

    # Specific handling for sleep hours which might have a different natural min/max
    if "sleep" in category_title_segment.lower():
        final_max_y = max(10, max_y_data + y_padding_top) # sleep can be higher than 10
    elif "productivity" in category_title_segment.lower() or "mood" in category_title_segment.lower() or "energy" in category_title_segment.lower():
        final_max_y = max(10, max_y_data + y_padding_top) # scores up to 10

    fig.update_yaxes(range=[final_min_y, final_max_y])

    return fig

# --- (keep register_feedback_callbacks as is, calling this updated function) ---
def register_feedback_callbacks(app):
    @app.callback(
        Output('csat-survey-chart', 'figure'),
        Input('csat-survey-chart', 'id') 
    )
    def update_csat_chart(_):
        return create_csat_survey_chart(df_feedback_ratings)

    @app.callback(
        Output('efficacy-perception-chart', 'figure'),
        Input('efficacy-perception-chart', 'id') 
    )
    def update_efficacy_perception_chart(_):
        return create_efficacy_chart(df_efficacy_perception, "productivity", "Avg. Perception of Productivity")

    @app.callback(
        Output('efficacy-mood-chart', 'figure'),
        Input('efficacy-mood-chart', 'id')
    )
    def update_efficacy_mood_chart(_):
        return create_efficacy_chart(df_efficacy_mood, "mood", "Avg. Mood Score")

    @app.callback(
        Output('efficacy-energy-chart', 'figure'),
        Input('efficacy-energy-chart', 'id')
    )
    def update_efficacy_energy_chart(_):
        return create_efficacy_chart(df_efficacy_energy, "energy level upon awakening", "Avg. Energy Level")

    @app.callback(
        Output('efficacy-sleep-chart', 'figure'),
        Input('efficacy-sleep-chart', 'id')
    )
    def update_efficacy_sleep_chart(_):
        return create_efficacy_chart(df_efficacy_sleep, "hours of sleep", "Avg. Hours of Sleep")