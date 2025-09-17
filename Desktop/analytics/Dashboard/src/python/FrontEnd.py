# Import necessary libraries
import dash
from dash import dcc, html
from dash import Input, Output
import pandas as pd
from datetime import date, datetime, timedelta
import plotly.express as px

# Import files from the Backend
from src.python.Backend import DataHandling
from src.python.Backend.VisualVariables import FOCUS_BEAR_YELLOW, FOCUS_BEAR_LIGHT, FOCUS_BEAR_BLACK, FOCUS_BEAR_ACCENT
from src.python.Backend.VisualVariables import Box, Box2, chart_container, app_css, tab_style, selected_tab_style

fortnight_ago = DataHandling.get_max_date  #date(2025, 1, 30)
current_date =  DataHandling.current_date #date(2025, 3, 15)
min_date = DataHandling.get_min_date()
max_date = DataHandling.get_max_date()

max_date_date = date.fromisoformat(max_date)
month_ago = max_date_date - timedelta(days=30)
fortnight_ago =  max_date_date - timedelta(days=14)
current_date = max_date
df = DataHandling.df



# Layout with tabs and branding
layout = html.Div([

    # === Header with logo and title ===
    html.Div([

        # === Logo on the left ===
        html.Div([
            html.Img(
                src='assets/logo.png', 
                style={'height': '60px', 'marginRight': '20px'}
            ),
        ], style={'display': 'inline-block', 'verticalAlign': 'middle'}),
        
        # === Title ===
        html.Div([
            html.H1("Focus Bear Data Dashboard", style={
                "color": FOCUS_BEAR_BLACK, 
                "marginBottom": "0"
            })
        ], style={'display': 'inline-block', 'verticalAlign': 'middle'})   
    ], style={
        "display": "flex", 
        "alignItems": "center", 
        "padding": "10px 20px",
        "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", 
        "marginBottom": "20px",
        "backgroundColor": "white"
    }),

    # === Tabs section ===
    dcc.Tabs([


        #####################################################
        ################# Tab 1: Overview ###################
        #####################################################
          # === Date Range Picker ===
            dcc.Tab(label='Overview', children=[
            
            # === Date Range Picker ===
            html.Div([
                html.H5("Select Date Range for Analytics", className="date-label"),
                html.Div([
                    dcc.DatePickerRange(
                        id={'type': 'auto-update-daterange', 'index': 'overview'},
                        start_date=fortnight_ago,
                        end_date=current_date,
                        min_date_allowed=min_date,
                        max_date_allowed=max_date,
                        display_format='MM/DD/YYYY',
                        className='custom-date-picker'
                    )
                ], className='date-picker-wrapper')
            ], className='date-picker-card', style={"backgroundColor": "white", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "borderRadius": "8px", "padding": "15px", "marginBottom": "20px"}),

            # === Row 1: Signups & Conversion Metrics ===
            html.H3("New User Counts", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px", "textAlign": "center"}),

            html.Div([

                html.Div([
                    html.I(className="fas fa-user-plus", style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                    html.H3(id='New-Signups-output', style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
                ], id='Signups-outputBox', style=Box2),

                html.Div([
                    html.I(className="fas fa-user-check", 
                        style={"color": FOCUS_BEAR_BLACK, "fontSize": "36px", "marginBottom": "10px"}),
                    html.H3(id='New-Personal-Subs', 
                        style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
                ], id='New-Personal-Subs-box', style=Box2),

                html.Div([
                    html.I(className="fas fa-user-group", 
                        style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                    html.H3(id='newteams', 
                        style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
                ], id='newteams_box', style={
                    "backgroundColor": FOCUS_BEAR_YELLOW, 
                    "color": FOCUS_BEAR_BLACK,
                    "padding": "20px",
                    "borderRadius": "8px",
                    "textAlign": "center",
                    "height": "140px",
                    "width": "200px",
                    "display": "flex",
                    "flexDirection": "column",
                    "alignItems": "center",
                    "justifyContent": "center"
                }),

                html.Div([
                    html.I(className="fas fa-face-frown", 
                        style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                    html.H3(id='Uninstalled', 
                        style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
                ], id='Uninstalled-box', style={
                    "backgroundColor": FOCUS_BEAR_YELLOW, 
                    "color": FOCUS_BEAR_BLACK,
                    "padding": "20px",
                    "borderRadius": "8px",
                    "textAlign": "center",
                    "height": "140px",
                    "width": "200px",
                    "display": "flex",
                    "flexDirection": "column",
                    "alignItems": "center",
                    "justifyContent": "center"
                }),
            ], style={
                "display": "flex",
                "flexWrap": "wrap",
                "marginBottom": "20px",
                "gap": "10%",
                "justifyContent": "center"
            }),

        # === Row 2: Habit Metrics ===
        html.H3("User Habits (at least 1 completion)", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px", "textAlign": "center"}),

        html.Div([
            html.Div([
                html.I(className="fas fa-cog", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='did-morning-habit', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='did-morning-habit_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),

            html.Div([
                html.I(className="fas fa-moon", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='did-evening-habit', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='did-evening-habit_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),

            html.Div([
                html.I(className="fas fa-coffee", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='did-break-habit', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='did-break-habit_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),

            html.Div([
                html.I(className="fas fa-brain", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='did-focus-session', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='did-focus-session_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),
        ], style={
            "display": "flex",
            "flexWrap": "wrap",
            "marginBottom": "20px",
            "gap": "10%",
            "justifyContent": "center"
        }),

        # === Row 3: Advanced Metrics ===
        html.H3("Further User Metrics", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px", "textAlign": "center"}),

        html.Div([
            html.Div([
                html.I(className="fas fa-hourglass-half", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='Stickiness-Rate', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='Stickiness_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),

            html.Div([
                html.I(className="fas fa-flag", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='QuitWithin7days', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='QuitWithin7days_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),

            html.Div([
                html.I(className="fas fa-bolt", 
                      style={"color": FOCUS_BEAR_BLACK, "fontSize": "24px", "marginBottom": "10px"}),
                html.H3(id='Activation-Rate', 
                       style={"margin": "0", "fontSize": "18px", "fontWeight": "normal"})
            ], id='Activation-Rate_box', style={
                "backgroundColor": FOCUS_BEAR_YELLOW, 
                "color": FOCUS_BEAR_BLACK,
                "padding": "20px",
                "borderRadius": "8px",
                "textAlign": "center",
                "height": "140px",
                "width": "200px",
                "display": "flex",
                "flexDirection": "column",
                "alignItems": "center",
                "justifyContent": "center"
            }),
        ], style={
            "display": "flex",
            "flexWrap": "wrap",
            "marginBottom": "20px",
            "gap": "10%",
            "justifyContent": "center"
        })
    ], style={"backgroundColor": FOCUS_BEAR_LIGHT, "padding": "20px"}),


        #######################################################
        ############ Tab 2: Retention Breakdown ###############
        #######################################################
       dcc.Tab(label='Retention Breakdown', children=[
            html.Div([

                # === Left sidebar with filters ===
                html.Div([
                    html.H4("Filters", className="section-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px"}),

                    # === Date Range Picker ===
                    html.Div([
                        html.Label("Date Range", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        html.Div([
                            dcc.DatePickerRange(
                               id={'type': 'auto-update-daterange', 'index': 'habits'},
                                start_date=fortnight_ago, # Default start
                                end_date=current_date,   # Default end
                                min_date_allowed=min_date,
                                max_date_allowed=max_date,
                                display_format='MM/DD/YYYY',
                                className='custom-date-picker',
                                style={
                                    'backgroundColor': 'white',
                                    'border': f'2px solid {FOCUS_BEAR_YELLOW}',
                                    'borderRadius': '8px',
                                    'padding': '10px',
                                    'width': '100%',
                                    'textAlign': 'center',
                                    'fontWeight': 'bold',
                                    'color': FOCUS_BEAR_BLACK
                                }
                            ),
                            html.Div( # This div will display the selected range from the callback
                                id='retention-cohort-end-date-output', # ID for the output
                                style={
                                    'marginTop': '10px',
                                    'fontWeight': 'bold',
                                    'color': FOCUS_BEAR_BLACK,
                                    'textAlign': 'center'
                                }
                            )
                        ], className='date-picker-wrapper')
                    ], className="filter-group", style={"marginBottom": "15px"}),


                    # === Subscription Status Filter ===
                    html.Div([
                        html.Label("Subscription Status", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        dcc.RadioItems(
                            id='habits-subscription-filter',
                            options=[
                                {'label': 'All', 'value': 'all'},
                                {'label': 'Trial', 'value': 'trial'},
                                {'label': 'Personal', 'value': 'personal'},
                                {'label': 'Team Member', 'value': 'team_member'}
                            ],
                            value='all',
                            labelStyle={'display': 'block', 'padding': '5px', 'color': FOCUS_BEAR_BLACK} # display:block for better layout
                        )
                    ], className="filter-group", style={"marginBottom": "15px"}),

                    # === Platform Filter ===
                    html.Div([
                        html.Label("Platform", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        dcc.RadioItems(
                            id='habits-platform-filter',
                            options=[
                                {'label': 'All Platforms', 'value': 'all'},
                                {'label': 'iOS', 'value': 'ios'},
                                {'label': 'macOS', 'value': 'macos'},
                                {'label': 'Windows', 'value': 'windows'},
                                {'label': 'Android', 'value': 'android'},
                                {'label': 'Web', 'value': 'web'},
                                {'label': 'Unknown', 'value': 'unknown'}
                            ],
                            value='all',
                            labelStyle={'display': 'block', 'padding': '5px', 'color': FOCUS_BEAR_BLACK} # display:block
                        )
                    ], className="filter-group")
                ], className="sidebar", style={"width": "25%", "backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginRight": "20px", "alignSelf": "flex-start"}), # Adjusted width and alignSelf

                # === Main content area with heatmaps ===
                html.Div([
                    # Title is now part of the figure layout (via annotations in callback)
                    # html.H4("User Habit Tracking - Current Period", className="chart-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px", "textAlign": "center"}),
                    dcc.Graph(id='habits-heatmap', config={'displayModeBar': False}),

                    html.Hr(style={"margin": "30px 0"}), # Add a horizontal line separator

                    # Title is now part of the figure layout (via annotations in callback)
                    # html.H4("User Habit Tracking - Previous Period", className="chart-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px", "textAlign": "center", "marginTop": "30px"}),
                    dcc.Graph(id='habits-heatmap-previous', config={'displayModeBar': False}) # NEW GRAPH ID
                ], style={"width": "73%", "backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}"}) # Adjusted width
            ], style={"display": "flex", "backgroundColor": FOCUS_BEAR_LIGHT, "padding": "20px", "alignItems": "stretch"}) # alignItems stretch
        ], style={"backgroundColor": FOCUS_BEAR_LIGHT}),


        ##########################################################################
        ########################## Tab 3: User Demographics ######################
        ##########################################################################
        dcc.Tab(label='User Demographics', children=[
            html.Div([

                # === Sidebar filters - Left side ===
                html.Div([
                    html.H4("Filters", className="section-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px"}),
                    
                    # === Date range picker ===
                    html.Div([
                        html.Label("Date Range", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        dcc.DatePickerRange(
                            id={'type': 'auto-update-daterange', 'index': 'demographics'},
                            start_date=month_ago,
                            end_date=current_date,
                            min_date_allowed=min_date,
                            max_date_allowed=max_date,
                            display_format='MM/DD/YYYY',
                            className='custom-date-picker'
                        )
                    ], className="filter-group", style={"marginBottom": "15px"}),

                    # === Subscription status filter ===
                    html.Div([
                        html.Label("Subscription Status", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        dcc.RadioItems(
                            id='subscription-status-filter',
                            options=[
                                {'label': 'All', 'value': 'all'},
                                {'label': 'Trial', 'value': 'trial'},
                                {'label': 'Personal', 'value': 'personal'},
                                {'label': 'Team Member', 'value': 'team_member'}
                            ],
                            value='all',
                            labelStyle={'padding': '5px', 'color': FOCUS_BEAR_BLACK}
                        )
                    ], className="filter-group", style={"marginBottom": "15px"}),

                    # === Platform filter ===
                    html.Div([
                        html.Label("Platform", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                        dcc.RadioItems(
                            id='platform-filter',
                            options=[
                                {'label': 'All Platforms', 'value': 'all'},
                                {'label': 'iOS', 'value': 'ios'},
                                {'label': 'macOS', 'value': 'macos'},
                                {'label': 'Windows', 'value': 'windows'},
                                {'label': 'Android', 'value': 'android'},
                                {'label': 'Web', 'value': 'web'},
                                {'label': 'Unknown', 'value': 'unknown'}
                            ],
                            value='all',
                            labelStyle={'padding': '5px', 'color': FOCUS_BEAR_BLACK}
                        )
                    ], className="filter-group")
                ], className="sidebar", style={"width": "20%", "backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginRight": "15px"}),

                # === Charts area - Right side === 
                html.Div([
                    # Top row with two charts side by side
                    html.Div([

                        # === Left chart - Subscription Status ===
                        html.Div([
                            html.H4("Subscription Status Distribution", className="chart-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px"}),
                            dcc.Graph(id='subscription-pie-chart')
                        ], style={"backgroundColor": "white", "padding": "15px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "width": "48%", "marginRight": "2%"}),

                        # === Right chart - Hopes ===
                        html.Div([
                            html.H4("Top Hopes for Using Focus Bear", className="chart-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px"}),
                            dcc.Graph(id='hopes-bar-chart')
                        ], style={"backgroundColor": "white", "padding": "15px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "width": "48%"})
                    ], style={"display": "flex", "marginBottom": "15px"}),

                    # === Bottom row with occupation chart ===
                    html.Div([
                        html.H4("Occupation Distribution", className="chart-title", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px"}),
                        dcc.Graph(id='occupation-bar-chart')
                    ], style={"backgroundColor": "white", "padding": "15px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "width": "100%"})
                ], style={"width": "78%"})
            ], style={"display": "flex", "backgroundColor": FOCUS_BEAR_LIGHT, "padding": "20px"})
        ], style={"backgroundColor": FOCUS_BEAR_LIGHT}),



        ##########################################################################
        ########################## Tab 4: Usage Analytics ########################
        ##########################################################################
        dcc.Tab(label='Usage Analytics', children=[
            html.Div([

                # === Left sidebar with filters ===
                html.Div([
                    html.H4("Filters", style={"color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "10px"}),
                    html.Div([

                        # === Date range picker in sidebar ===
                        html.Div([
                            html.Label("Date Range", className="filter-label", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                            dcc.DatePickerRange(
                                id={'type': 'auto-update-daterange', 'index': 'usage'},
                                start_date=fortnight_ago,
                                end_date=current_date,
                                display_format='MM/DD/YYYY',
                                className='custom-date-picker'
                            )
                        ], className="filter-group", style={"marginBottom": "15px"}),

                        # === Subscription status filter in sidebar ===
                        html.Div([    
                            html.Label("Subscription Status", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                            dcc.RadioItems(
                                id='function-subscription-filter',
                                options=[
                                    {'label': 'All', 'value': 'all'},
                                    {'label': 'Trial', 'value': 'trial'},
                                    {'label': 'Personal', 'value': 'personal'},
                                    {'label': 'Team Member', 'value': 'team_member'}
                                ],
                                value='all',
                                labelStyle={'padding': '5px', 'color': FOCUS_BEAR_BLACK}
                            )
                        ], style={"marginBottom": "20px"}),

                        # === Platform filter in sidebar ===
                        html.Div([
                            html.Label("Platform", style={"fontWeight": "bold", "color": FOCUS_BEAR_BLACK}),
                            dcc.RadioItems(
                                id='function-platform-filter',
                                options=[
                                    {'label': 'All Platforms', 'value': 'all'},
                                    {'label': 'iOS', 'value': 'ios'},
                                    {'label': 'macOS', 'value': 'macos'},
                                    {'label': 'Windows', 'value': 'windows'},
                                    {'label': 'Android', 'value': 'android'},
                                    {'label': 'Web', 'value': 'web'},
                                    {'label': 'Unknown', 'value': 'unknown'}
                                ],
                                value='all',
                                labelStyle={'padding': '5px', 'color': FOCUS_BEAR_BLACK}
                            )
                        ])
                    ]),
                ], style={"width": "20%", "backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginRight": "15px"}),
               
                # === Main content area - Right side ===
                html.Div([
                    # Top row with two charts side by side
                    html.Div([

                        # === Left chart - Modes used ===
                        html.Div([
                            html.H3("Simple vs Geek Mode Usage", style={"textAlign": "center", "color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px"}),
                            dcc.Graph(id='graph-mode-comparison'),
                        ], style={"width": "48%", "marginRight": "2%", "backgroundColor": "white", "padding": "15px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}"}),
                       
                        # === Right chart - Blocking features ===
                        html.Div([
                            html.H3("Feature & Blocking Tool Usage", style={"textAlign": "center", "color": FOCUS_BEAR_BLACK, "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}", "paddingBottom": "5px"}),
                            dcc.Graph(id='graph-feature-usage')
                        ], style={"width": "48%", "backgroundColor": "white", "padding": "15px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}"})
                    ], style={"display": "flex", "marginBottom": "15px"}),
                    # Bottom row with habit usage chart
                    html.Div([
                        html.H3("Habit Usage Analysis", style={
                            "textAlign": "center",
                            "color": FOCUS_BEAR_BLACK,
                            "borderBottom": f"2px solid {FOCUS_BEAR_YELLOW}",
                            "paddingBottom": "5px"
                        }),

                        html.Div(
                            dcc.Graph(id='graph-habit-usage'),
                            style={"display": "flex", "justifyContent": "center"}
                        )
                    ], style={
                        "width": "100%",
                        "backgroundColor": "white",
                        "padding": "15px",
                        "borderRadius": "8px",
                        "border": f"1px solid {FOCUS_BEAR_YELLOW}",
                        "marginTop": "15px"
                    })
                ], style={"width": "78%"})
            ], style={"display": "flex", "backgroundColor": FOCUS_BEAR_LIGHT, "padding": "20px"})
        ], style={"backgroundColor": FOCUS_BEAR_LIGHT}),
    ##########################################################################
        ########################## Tab 5: User Feedback ##########################
        ##########################################################################
        dcc.Tab(label='User Feedback', children=[
            html.Div([
                # Chart 1: CSAT Survey
                html.Div([
                    dcc.Graph(id='csat-survey-chart')
                ], style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginBottom": "20px"}),

                # Chart 2: Efficacy Over Time
                html.Div([
                    dcc.Graph(id='efficacy-perception-chart')
                ], style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginBottom": "20px"}),
                 # Chart 3: Efficacy - Mood
                html.Div([
                    dcc.Graph(id='efficacy-mood-chart') # New chart
                ], style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginBottom": "20px"}),

                # Chart 4: Efficacy - Energy Level
                html.Div([
                    dcc.Graph(id='efficacy-energy-chart') # New chart
                ], style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}", "marginBottom": "20px"}),

                # Chart 5: Efficacy - Hours of Sleep
                html.Div([
                    dcc.Graph(id='efficacy-sleep-chart') # New chart
                ], style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px", "border": f"1px solid {FOCUS_BEAR_YELLOW}"})
            
            ], style={"backgroundColor": FOCUS_BEAR_LIGHT, "padding": "20px"})
        ], style={"backgroundColor": FOCUS_BEAR_LIGHT}),

    ], 
    style={
        "marginTop": "10px",
        "borderRadius": "8px",
        "overflow": "hidden"
    }),
], style=app_css)




def register_callbacks(app: dash.Dash):
    # Apply the custom tab styles to the app
    app.layout = layout
   
    # Add the custom styles to the tabs
    for i in range(len(layout.children[1].children)):
        layout.children[1].children[i].style = tab_style
        layout.children[1].children[i].selected_style = selected_tab_style