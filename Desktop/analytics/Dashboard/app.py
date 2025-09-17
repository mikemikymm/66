import dash
from dash import dcc, html 
from src.python.FrontEnd import layout, register_callbacks
from src.python import FrontEnd 
from src.python.Backend import T1OverviewBackEnd, T2RetentionBreakdown, T3UserDemographics, T4FunctionUsage, T5UserFeedback
import webbrowser
external_stylesheets = [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
]

app = dash.Dash(__name__, external_stylesheets=external_stylesheets)

app.layout = FrontEnd.layout

# Register tab-specific callbacks
T1OverviewBackEnd.OverviewCallbacks(app)
T2RetentionBreakdown.CategoryBreakDownCallBacks(app)
T3UserDemographics.register_demographics_callbacks(app)
T4FunctionUsage.usageAnalysisCallbacks(app)
T5UserFeedback.register_feedback_callbacks(app)
register_callbacks(app)

if __name__ == '__main__':
    webbrowser.open("http://127.0.0.1:8050")
    app.run(debug=True)

#team_to_member