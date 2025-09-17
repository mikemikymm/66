
# This file contains variables that impact the visual representation of the dashboard.

# Focus Bear brand colors
FOCUS_BEAR_YELLOW = '#FFC107'  # Bright yellow
FOCUS_BEAR_BLACK = '#212121'   # Dark black
FOCUS_BEAR_LIGHT = '#FFFDE7'   # Light yellow/cream for backgrounds
FOCUS_BEAR_ACCENT = '#FFA000'  # Darker yellow for accents



#####
##### CSS Style Dictionary for tab 1 of the dashboard
#####

# Updated box style with brand colors
Box = {
    "marginTop": "5%",
    "padding": "1%",
    "width": "12%",
    "textAlign": "center",
    "border": f"1px solid {FOCUS_BEAR_YELLOW}",
    "borderRadius": "8px",
    "backgroundColor": FOCUS_BEAR_LIGHT,
    "boxShadow": f"0 4px 8px rgba(33,33,33,0.1)",
    "color": FOCUS_BEAR_BLACK
}

# Updated box style for bottom layer with brand colors
Box2 = {
    "marginTop": "3%",
    "padding": "1%",
    "width": "12%",
    "textAlign": "center",
    "border": f"1px solid {FOCUS_BEAR_YELLOW}",
    "borderRadius": "10px",
    "backgroundColor": FOCUS_BEAR_LIGHT,
    "boxShadow": f"0 4px 8px rgba(33,33,33,0.1)",
    "color": FOCUS_BEAR_BLACK
}

# Updated chart container style with brand colors
chart_container = {
    "border": f"1px solid {FOCUS_BEAR_YELLOW}",
    "borderRadius": "8px",
    "padding": "15px",
    "margin": "10px",
    "backgroundColor": "white",
    "boxShadow": f"0 2px 4px rgba(33,33,33,0.1)"
}

# Custom CSS for consistent branding
app_css = {
    'backgroundColor': FOCUS_BEAR_LIGHT,
    'fontFamily': 'Arial, sans-serif',
    'color': FOCUS_BEAR_BLACK,
}

# Custom tab style to match Focus Bear branding
tab_style = {
    'backgroundColor': 'white',
    'color': FOCUS_BEAR_BLACK,
    'padding': '10px 15px',
    'borderBottom': f'1px solid {FOCUS_BEAR_YELLOW}'
}


selected_tab_style = {
    'backgroundColor': FOCUS_BEAR_YELLOW,  # Changed from blue to yellow for selected tab
    'color': FOCUS_BEAR_BLACK,
    'padding': '10px 15px',
    'borderBottom': f'3px solid {FOCUS_BEAR_BLACK}',
    'fontWeight': 'bold'
}

light_red = '#ffb7b7'  # Light red for emphasis
## Customer Colour Scale for heatmap 
custom_colorscale = [
    [0.0, "white"],   # 0% (minimum) -> white
    [0.1, light_red], # 0.1% -> light red
    [1.0, "red"]  # 100% (maximum) -> magenta
]