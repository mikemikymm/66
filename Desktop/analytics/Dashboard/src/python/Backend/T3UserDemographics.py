from .DataHandling import df
import plotly.express as px
from dash import Input, Output
def filter_demographics_data(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None):
    """
    Filter the dataframe based on demographic filters
    
    Args:
        df: The dataframe to filter
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        Filtered dataframe
    """
    filtered_df = df.copy()
    
    # Apply subscription filter
    if subscription_filter != 'all':
        filtered_df = filtered_df[filtered_df['Subscription Status'].str.lower() == subscription_filter]
    
    # Apply platform filter
    if platform_filter != 'all':
        filtered_df = filtered_df[filtered_df['platform'].str.lower() == platform_filter.lower()]
    
    # Apply date range filter if provided
    if start_date and end_date:
        filtered_df = filtered_df[
            (filtered_df['First desktop login date'] >= start_date) & 
            (filtered_df['First desktop login date'] <= end_date)
        ]
    
    return filtered_df

def get_subscription_distribution(df, platform_filter='all', start_date=None, end_date=None):
    """
    Get subscription status distribution data for pie chart
    
    Args:
        df: The dataframe with user data
        platform_filter: Filter by platform
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        DataFrame with subscription status counts
    """
    filtered_df = filter_demographics_data(df, 'all', platform_filter, start_date, end_date)
    
    # Count subscription statuses
    status_counts = filtered_df['Subscription Status'].value_counts().reset_index()
    status_counts.columns = ['Status', 'Count']
    
    return status_counts

def get_hopes_distribution(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None, top_n=10):
    """
    Get hopes for using Focus Bear distribution data for bar chart
    
    Args:
        df: The dataframe with user data
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        top_n: Number of top hopes to include
        
    Returns:
        DataFrame with hopes counts
    """
    filtered_df = filter_demographics_data(df, subscription_filter, platform_filter, start_date, end_date)
    
    # Count hopes
    hopes_counts = filtered_df['Hopes for using Focus Bear'].value_counts().reset_index()
    hopes_counts.columns = ['Hope', 'Count']
    
    # Get top N hopes
    top_hopes = hopes_counts.sort_values('Count', ascending=False).head(top_n)
    
    return top_hopes

def get_occupation_distribution(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None, top_n=15):
    """
    Get occupation distribution data for bar chart
    
    Args:
        df: The dataframe with user data
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        top_n: Number of top occupations to include
        
    Returns:
        DataFrame with occupation counts
    """
    filtered_df = filter_demographics_data(df, subscription_filter, platform_filter, start_date, end_date)
    
    # Process occupation data to extract just the main category
    def extract_occupation_category(occupation):
        #if not isinstance(occupation, str):
        #    return "Unknown"
        
        # Check if it's in JSON-like format: {"Category":{"Subcategory":"Detail"}}
        if occupation.startswith('{') and '}' in occupation:
            try:
                # Extract just the main category (the first key)
                category = occupation.split(':', 1)[0].replace('{', '').replace('"', '').strip()
                return category
            except:
                return occupation
        else:
            # If it's not in the complex format, return as is
            category = occupation.split(':', 1)[0].replace('"', '').strip()
            return category
    
    # Apply the extraction function to get simplified occupations
    filtered_df['Simplified_Occupation'] = filtered_df['Occupation'].apply(extract_occupation_category)
    
    # Count simplified occupations
    occupation_counts = filtered_df['Simplified_Occupation'].value_counts().reset_index()
    occupation_counts.columns = ['Occupation', 'Count']
    
    # Get top N occupations
    top_occupations = occupation_counts.sort_values('Count', ascending=False).head(top_n)
    
    return top_occupations




def filter_demographics_data(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None):
    """
    Filter the dataframe based on demographic filters
    
    Args:
        df: The dataframe to filter
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        Filtered dataframe
    """
    filtered_df = df.copy()
    
    # Apply subscription filter
    if subscription_filter != 'all':
        filtered_df = filtered_df[filtered_df['Subscription Status'].str.lower() == subscription_filter]
    
    # Apply platform filter
    if platform_filter != 'all':
        filtered_df = filtered_df[filtered_df['platform'].str.lower() == platform_filter.lower()]
    
    # Apply date range filter if provided
    if start_date and end_date:
        filtered_df = filtered_df[
            (filtered_df['First desktop login date'] >= start_date) & 
            (filtered_df['First desktop login date'] <= end_date)
        ]
    
    return filtered_df

def extract_occupation_category(occupation):
    """Extract just the main category from complex occupation data"""
    if not isinstance(occupation, str):
       return "Unknown"
    
    # Check if it's in JSON-like format: {"Category":{"Subcategory":"Detail"}}
    if occupation.startswith('{') and '}' in occupation:
        try:
            # Extract just the main category (the first key)
            category = occupation.split(':', 1)[0].replace('{', '').replace('"', '').strip().lower()
            return category
        except:
            return occupation
    else:
        # If it's not in the complex format, return as is
        if len(occupation) > 30:
            return "other"
        category = occupation.split(':', 1)[0].replace('"', '').strip().lower()
        return category

def get_subscription_distribution(df, platform_filter='all', start_date=None, end_date=None):
    """
    Get subscription status distribution data for pie chart
    
    Args:
        df: The dataframe with user data
        platform_filter: Filter by platform
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        DataFrame with subscription status counts
    """
    filtered_df = filter_demographics_data(df, 'all', platform_filter, start_date, end_date)
    
    # Count subscription statuses
    status_counts = filtered_df['Subscription Status'].value_counts().reset_index()
    status_counts.columns = ['Status', 'Count']
    
    return status_counts

def get_hopes_distribution(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None, top_n=10):
    """
    Get hopes for using Focus Bear distribution data for bar chart
    
    Args:
        df: The dataframe with user data
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        top_n: Number of top hopes to include
        
    Returns:
        DataFrame with hopes counts
    """
    filtered_df = filter_demographics_data(df, subscription_filter, platform_filter, start_date, end_date)
    
    # Count hopes
    hopes_counts = filtered_df['Hopes for using Focus Bear'].value_counts().reset_index()
    hopes_counts.columns = ['Hope', 'Count']
    
    # Get top N hopes
    top_hopes = hopes_counts.sort_values('Count', ascending=False).head(top_n)
    
    return top_hopes

def get_occupation_distribution(df, subscription_filter='all', platform_filter='all', start_date=None, end_date=None, top_n=15):
    """
    Get occupation distribution data for bar chart
    
    Args:
        df: The dataframe with user data
        subscription_filter: Filter by subscription status
        platform_filter: Filter by platform (mobile/desktop)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        top_n: Number of top occupations to include
        
    Returns:
        DataFrame with occupation counts
    """
    filtered_df = filter_demographics_data(df, subscription_filter, platform_filter, start_date, end_date)
    
    # Apply the extraction function to get simplified occupations
    filtered_df['Simplified_Occupation'] = filtered_df['Occupation'].apply(extract_occupation_category)
    
    # Count simplified occupations
    occupation_counts = filtered_df['Simplified_Occupation'].value_counts().reset_index()
    occupation_counts.columns = ['Occupation', 'Count']
    
    # Get top N occupations
    top_occupations = occupation_counts.sort_values('Count', ascending=False).head(top_n)
    
    return top_occupations

# ================= CALLBACKS =================

def register_demographics_callbacks(app):
    """Register all callbacks for the Demographics tab"""
    
    @app.callback(
        Output('subscription-pie-chart', 'figure'),
        [Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'end_date'),
         Input('platform-filter', 'value')]
    )
    def update_subscription_pie_chart(start_date, end_date, platform_filter):
        # Filter the data based on selected filters but NOT subscription status
        filtered_df = df.copy()
        
        # Apply date range filter
        if start_date and end_date:
            filtered_df = filtered_df[
                (filtered_df['First desktop login date'] >= start_date) & 
                (filtered_df['First desktop login date'] <= end_date)
            ]
        
        # Apply platform filter
        if platform_filter != 'all':
            filtered_df = filtered_df[filtered_df['platform'].str.lower() == platform_filter.lower()]
                
        # Count subscription statuses
        status_counts = filtered_df['Subscription Status'].value_counts().reset_index()
        status_counts.columns = ['Status', 'Count']
        
        # Create pie chart with consistent color scheme
        color_map = {
            'Trial': '#1f77b4',       # Blue
            'Personal': '#ff7f0e',    # Orange
            'Team Member': '#2ca02c'  # Green
        }
        
        # Create pie chart
        fig = px.pie(
            status_counts, 
            values='Count', 
            names='Status', 
            title='Subscription Status Distribution',
            color='Status',
            color_discrete_map=color_map
        )
        
        fig.update_traces(textposition='inside', textinfo='percent+label')
        fig.update_layout(
            margin=dict(t=30, b=0, l=0, r=0),
            legend=dict(orientation="h", yanchor="bottom", y=-0.1, xanchor="center", x=0.5)
        )
        
        return fig

    @app.callback(
        Output('hopes-bar-chart', 'figure'),
        [Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'end_date'),
         Input('subscription-status-filter', 'value'),
         Input('platform-filter', 'value')]
    )
    def update_hopes_bar_chart(start_date, end_date, subscription_filter, platform_filter):
        # Filter the data based on selected filters
        filtered_df = df.copy()
        
        # Apply date range filter
        if start_date and end_date:
            filtered_df = filtered_df[
                (filtered_df['First desktop login date'] >= start_date) & 
                (filtered_df['First desktop login date'] <= end_date)
            ]
        
        # Apply platform filter
        if platform_filter != 'all':
            filtered_df = filtered_df[filtered_df['platform'].str.lower() == platform_filter.lower()]
        
        # Apply subscription filter
        if subscription_filter != 'all':
            filtered_df = filtered_df[filtered_df['Subscription Status'].str.lower() == subscription_filter]
        
        # Analyze hopes data
        hopes_data = filtered_df['Hopes for using Focus Bear'].value_counts().reset_index()
        hopes_data.columns = ['Hope', 'Count']
        
        # Sort by count and take top 10 if there are many categories
        hopes_data = hopes_data.sort_values('Count', ascending=False).head(10)
        
        # Create bar chart with consistent color scheme
        fig = px.bar(
            hopes_data,
            x='Hope',
            y='Count',
            title='Top Hopes for Using Focus Bear',
            color_discrete_sequence=['#1f77b4']  # Using consistent blue color
        )
        
        # Force y-axis to show only integers
        fig.update_yaxes(tickformat=',d')
        
        fig.update_layout(
            xaxis_title="User Hopes",
            yaxis_title="Number of Users",
            margin=dict(t=30, b=50, l=30, r=10)
        )
        
        return fig

    @app.callback(
        Output('occupation-bar-chart', 'figure'),
        [Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'demographics'}, 'end_date'),
         Input('subscription-status-filter', 'value'),
         Input('platform-filter', 'value')]
    )
    def update_occupation_bar_chart(start_date, end_date, subscription_filter, platform_filter):
        # Filter the data based on selected filters
        filtered_df = df.copy()
        
        # Apply date range filter
        if start_date and end_date:
            filtered_df = filtered_df[
                (filtered_df['First desktop login date'] >= start_date) & 
                (filtered_df['First desktop login date'] <= end_date)
            ]
        
        # Apply platform filter
        if platform_filter != 'all':
            filtered_df = filtered_df[filtered_df['platform'].str.lower() == platform_filter.lower()]
        
        # Apply subscription filter
        if subscription_filter != 'all':
            filtered_df = filtered_df[filtered_df['Subscription Status'].str.lower() == subscription_filter]
        

        # Apply the extraction function to get simplified occupations
        filtered_df['Simplified_Occupation'] = filtered_df['Occupation'].apply(extract_occupation_category)
        filtered_df = filtered_df[filtered_df['Simplified_Occupation'] != "Unknown"]
        
        # Analyze simplified occupation data
        occupation_data = filtered_df['Simplified_Occupation'].value_counts().reset_index()
        occupation_data.columns = ['Occupation', 'Count']
        
        # Sort by count and take top 15
        occupation_data = occupation_data.sort_values('Count', ascending=False).head(15)
        
        # Create horizontal bar chart with consistent color scheme
        fig = px.bar(
            occupation_data,
            y='Occupation',
            x='Count',
            title='Occupation Distribution',
            orientation='h',
            color_discrete_sequence=['#ff7f0e']  # Using consistent orange color
        )
        
        # Force x-axis to show only integers
        fig.update_xaxes(tickformat=',d')
        
        fig.update_layout(
            yaxis_title="Occupation",
            xaxis_title="Number of Users",
            margin=dict(t=30, b=30, l=150, r=10),
            height=600
        )
        
        return fig
