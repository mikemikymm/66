# Import necessary libraries
import dash
from dash import html, Input, Output, State, MATCH, no_update
import pandas as pd
from datetime import date, timedelta
import math

# Import data from DataHandling and Colours from VisualVariables
from src.python.Backend.DataHandling import df
from src.python.Backend.VisualVariables import FOCUS_BEAR_YELLOW, FOCUS_BEAR_BLACK

def OverviewCallbacks(app):

    # === SINGLE CALLBACK for ALL Auto-Updating Date Pickers ===
    @app.callback(
        # Output uses MATCH to target the specific component that triggered
        Output({'type': 'auto-update-daterange', 'index': MATCH}, 'end_date'),
        # Input uses MATCH to listen to any component matching the pattern
        Input({'type': 'auto-update-daterange', 'index': MATCH}, 'start_date'),
        # State uses MATCH to get the state from the specific component that triggered
        State({'type': 'auto-update-daterange', 'index': MATCH}, 'max_date_allowed'),
        prevent_initial_call=True
    )
    def update_matching_end_date(start_date_str, max_allowed_str):
        """
        Updates the end date of ANY date picker range with an ID matching
        {'type': 'auto-update-daterange', 'index': ...}
        to be 2 weeks after the selected start date, capped by max_date_allowed.
        """
        if not start_date_str:
            return no_update

        try:
            start_date_obj = date.fromisoformat(start_date_str)
            potential_end_date = start_date_obj + timedelta(weeks=2)

            if max_allowed_str:
                try:
                    max_allowed_obj = date.fromisoformat(max_allowed_str)
                    final_end_date = min(potential_end_date, max_allowed_obj)
                except (ValueError, TypeError):
                     print(f"Warning: Invalid max_date_allowed format: {max_allowed_str}")
                     final_end_date = potential_end_date # Use potential if max is invalid
            else:
                # Handle case where max_date_allowed might not be set on some pickers
                final_end_date = potential_end_date

            return final_end_date.isoformat()

        except (ValueError, TypeError) as e:
            print(f"Error updating end date via MATCH callback: {e}")
            return no_update

    ###/////////////////
    ### Top Row of Boxes: New User Counts
    ### New Signups, New Personal Subs, Active Teams, Uninstalled
    ###/////////////////


    @app.callback(
        Output('New-Signups-output', 'children'),
        Output('Signups-outputBox', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def calculate_new_signups(start_date, end_date):
        # Calculate new signups based on the date range selected in the overview picker
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update # Return valid component + no_update for style

        FirstLoginDatesInRange = filter_df_by_Date_range(start_date, end_date, df)
        LastCo_hortDates = previousCohort(start_date, end_date, df)

        number_of_dates = FirstLoginDatesInRange["First desktop login date"].count() if FirstLoginDatesInRange is not None else 0
        number_of_dates_lastCohort = LastCo_hortDates["First desktop login date"].count() if LastCo_hortDates is not None else 0

        return ([
            html.H5("New Signups"),
            html.H2(f"{number_of_dates}"),
            html.Div(f"previous: {number_of_dates_lastCohort}",
                    style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
        ], colourSelector(number_of_dates, number_of_dates_lastCohort))



    @app.callback(
        Output('New-Personal-Subs', 'children'),
        Output('New-Personal-Subs-box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def calculate_new_personal_subs(start_date, end_date):
        # Calculate new personal subscriptions based on the date range selected in the overview picker
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        FirstLoginDatesInRange = filter_df_by_Date_range(start_date, end_date, df)
        LastCo_hortDates = previousCohort(start_date, end_date, df)

        new_personal_subs = pd.DataFrame()
        if FirstLoginDatesInRange is not None:
            new_personal_subs = FirstLoginDatesInRange[FirstLoginDatesInRange['Subscription Status'] == "personal"]

        last_personal_subs = pd.DataFrame()
        if LastCo_hortDates is not None:
            last_personal_subs = LastCo_hortDates[LastCo_hortDates['Subscription Status'] == "personal"]

        new_personal_subs_count = new_personal_subs['Subscription Status'].count()
        last_personal_subs_count = last_personal_subs['Subscription Status'].count()

        return ([
            html.H5("New Personal Subs"),
            html.H2(f"{new_personal_subs_count}"),
            html.Div(f"previous: {last_personal_subs_count}",
                    style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
        ], colourSelector(new_personal_subs_count, last_personal_subs_count))



    @app.callback(Output('newteams', 'children'),
        Output('newteams_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def newTeams(start_date, end_date):
        # Individual teams that have a new member in the date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            newteam_count = 0
            if filteredDF is not None and not filteredDF.empty and "Team ID" in filteredDF:
                if filteredDF["Team ID"].unique().all() == [math.nan]:
                    newteam_count = 0
                else:
                    newteam_count = len(filteredDF["Team ID"].unique())
            
            newteam_count_last = 0
            if LastCo_DF is not None and not LastCo_DF.empty and "Team ID" in LastCo_DF:
                if LastCo_DF["Team ID"].unique().all() == [math.nan]:
                    newteam_count_last = 0
                else:
                    newteam_count_last = len(LastCo_DF["Team ID"].unique())
            
            return([
                html.H5("Active Teams"),
                html.H2(f"{newteam_count}"),
                html.Div(f"previous: {newteam_count_last}",
                        style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(newteam_count, newteam_count_last)) 

        except (ValueError, TypeError) as e:
             print(f"Error in newteams callback: {e}")
             return html.Div("Error"), dash.no_update



    @app.callback(
        Output('Uninstalled', 'children'),
        Output('Uninstalled-box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def calculate_uninstalled(start_date, end_date):
        # Calculate uninstalled apps based on the date range selected in the overview picker
        if not start_date or not end_date:
             return html.Div("Select dates"), dash.no_update

        filteredDF = filter_df_by_Date_range(start_date, end_date, df)
        LastCo_hort = previousCohort(start_date, end_date, df)

        uninstalled = (len(filteredDF[filteredDF["Uninstalled app"] != 0])) if filteredDF is not None and "Uninstalled app" in filteredDF else 0
        uninstalled_last = (len(LastCo_hort[LastCo_hort["Uninstalled app"] != 0])) if LastCo_hort is not None and "Uninstalled app" in LastCo_hort else 0

        return([
            html.H5("Uninstalled"),
            html.H2(f"{uninstalled}"),
            html.Div(f"previous: {uninstalled_last}",
                    style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            # Invert comparison for uninstalled? Lower is better.
        ], colourSelector(uninstalled_last, uninstalled)) # Inverted for "lower is better"



    ###////////////////////
    ### Second Row of Boxes: User Habits (at least 1 completion)
    ### Did morning habit, evening habit, break activity, focus session
    ###////////////////////

    @app.callback(
        Output('did-morning-habit', 'children'),
        Output('did-morning-habit_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def did_morning_habit(start_date, end_date):
        # Calculates the percentage of users who completed at least 1 morning habit in date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            morningHabitPercent = 0.0
            if filteredDF is not None and not filteredDF.empty and "Started morning routine" in filteredDF:
                didMorningHabit_count = filteredDF[filteredDF["Started morning routine"] == True].shape[0]
                morningHabitPercent = (didMorningHabit_count / len(filteredDF)) * 100

            morningHabitPercent_last = 0.0
            if LastCo_DF is not None and not LastCo_DF.empty and "Started morning routine" in LastCo_DF:
                didMorningHabit_last_count = LastCo_DF[LastCo_DF["Started morning routine"] == True].shape[0]
                morningHabitPercent_last = (didMorningHabit_last_count / len(LastCo_DF)) * 100

            return ([
                html.H5("Did Morning Habit"),
                html.H2(f"{round(morningHabitPercent, 2)}%"),
                html.Div(f"previous: {round(morningHabitPercent_last, 2)}%",
                        style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(morningHabitPercent, morningHabitPercent_last))

        except (ValueError, TypeError) as e:
             print(f"Error in did_morning_habit: {e}")
             return html.Div("Error"), dash.no_update



    @app.callback(
        Output('did-evening-habit', 'children'),
        Output('did-evening-habit_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def did_evening_habit(start_date, end_date):
        # Calculates the percentage of users who completed at least 1 evening habit in date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update
        try:

            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            eveningHabitPercent = 0.0
            if filteredDF is not None and not filteredDF.empty and "Started evening routine" in filteredDF:
                 eveningHabitPercent = (filteredDF[filteredDF["Started evening routine"] == True].shape[0] / len(filteredDF)) * 100

            eveningHabitPercent_last = 0.0
            if LastCo_DF is not None and not LastCo_DF.empty and "Started evening routine" in LastCo_DF:
                 eveningHabitPercent_last = (LastCo_DF[LastCo_DF["Started evening routine"] == True].shape[0] / len(LastCo_DF)) * 100

            return ([
                html.H5("Did Evening Habit"),
                html.H2(f"{round(eveningHabitPercent, 2)}%"),
                html.Div(f"previous: {round(eveningHabitPercent_last, 2)}%", style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(eveningHabitPercent, eveningHabitPercent_last))
        
        except (ValueError, TypeError) as e: 
            print(f"Error in did_evening_habit: {e}"); 
            return html.Div("Error"), dash.no_update



    @app.callback(
        Output('did-break-habit', 'children'),
        Output('did-break-habit_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def did_break_habit(start_date, end_date):
        # Calculates the percentage of users who completed at least 1 break habit in date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update
        
        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            breakHabitPercent = 0.0
            if filteredDF is not None and not filteredDF.empty and "Completed a break activity" in filteredDF:
                 breakHabitPercent = (filteredDF[filteredDF["Completed a break activity"] == True].shape[0] / len(filteredDF)) * 100

            breakHabitPercent_last = 0.0
            if LastCo_DF is not None and not LastCo_DF.empty and "Completed a break activity" in LastCo_DF:
                 breakHabitPercent_last = (LastCo_DF[LastCo_DF["Completed a break activity"] == True].shape[0] / len(LastCo_DF)) * 100

            return([
                html.H5("Did Break Habit"),
                html.H2(f"{round(breakHabitPercent, 2)}%"),
                html.Div(f"previous: {round(breakHabitPercent_last, 2)}%", style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(breakHabitPercent, breakHabitPercent_last))
        
        except (ValueError, TypeError) as e: 
            print(f"Error in did_break_habit: {e}"); 
            return html.Div("Error"), dash.no_update



    @app.callback(
        Output('did-focus-session', 'children'),
        Output('did-focus-session_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def did_focus_Session(start_date, end_date):
        # Calculates the percentage of users who completed at least 1 focus session in date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            focusModePercent = 0.0
            if filteredDF is not None and not filteredDF.empty and "Started focus mode" in filteredDF:
                 focusModePercent = (filteredDF[filteredDF["Started focus mode"] == True].shape[0] / len(filteredDF)) * 100

            focusModePercent_last = 0.0
            if LastCo_DF is not None and not LastCo_DF.empty and "Started focus mode" in LastCo_DF:
                 focusModePercent_last = (LastCo_DF[LastCo_DF["Started focus mode"] == True].shape[0] / len(LastCo_DF)) * 100

            return([
                html.H5("Did Focus Session"),
                html.H2(f"{round(focusModePercent, 2)}%"),
                html.Div(f"previous: {round(focusModePercent_last, 2)}%", style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(focusModePercent, focusModePercent_last))
        
        except (ValueError, TypeError) as e: 
            print(f"Error in did_focus_Session: {e}"); 
            return html.Div("Error"), dash.no_update


    ###///////////////////
    ### Third Row of Boxes: Futher User Metrics 
    ### Stickiness Rate, Quit within 7 days, Activation Rate
    ###///////////////////

    @app.callback(
        Output('Stickiness-Rate', 'children'), 
        Output('Stickiness_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def Stickiness(start_date, end_date):
        # Calculates the stickiness rate based on user activity in the date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            currentStickiness = CalculateStickiness(filteredDF)
            prevStickiness = CalculateStickiness(LastCo_DF)

            return ([
                html.H5("Stickiness"),
                html.H2(f"{round(currentStickiness, 2)}%"), # Stickiness calc returns %
                html.Div(f"previous: {round(prevStickiness, 2)}%", # Stickiness calc returns %
                        style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
            ], colourSelector(currentStickiness, prevStickiness)) # Higher is better

        except (ValueError, TypeError) as e:
             print(f"Error in Stickiness callback: {e}")
             return html.Div("Error"), dash.no_update



    @app.callback(
        Output('QuitWithin7days', 'children'),
        Output('QuitWithin7days_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')] 
    )
    def Quit_in_7days(start_date, end_date):
        # Calculates the percentage of users who quit within 7 days of signing up in the date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        try:
            filteredDF = filter_df_by_Date_range(start_date, end_date, df)
            LastCo_DF = previousCohort(start_date, end_date, df)

            quitPercent = 0.0
            if filteredDF is not None and not filteredDF.empty and "Quit within 7 days" in filteredDF:
                didQuitIn7Days_count = filteredDF[filteredDF["Quit within 7 days"] == True].shape[0]
                quitPercent = (didQuitIn7Days_count / len(filteredDF)) * 100

            quitPercent_last = 0.0
            if LastCo_DF is not None and not LastCo_DF.empty and "Quit within 7 days" in LastCo_DF:
                didQuitIn7Days_last_count = LastCo_DF[LastCo_DF["Quit within 7 days"] == True].shape[0]
                quitPercent_last = (didQuitIn7Days_last_count / len(LastCo_DF)) * 100

            return([
                html.H5("Quit within 7 days"),
                html.H2(f"{round(quitPercent, 2)}%"), # Added % sign
                html.Div(f"previous: {round(quitPercent_last, 2)}%", # Added % sign
                        style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
                # Invert comparison for quit? Lower is better.
            ], colourSelector(quitPercent_last, quitPercent)) # Inverted for "lower is better"

        except (ValueError, TypeError) as e:
             print(f"Error in Quit_in_7days callback: {e}")
             return html.Div("Error"), dash.no_update
        


    @app.callback(
        Output('Activation-Rate', 'children'),
        Output('Activation-Rate_box', 'style'),
        [Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'start_date'),
         Input({'type': 'auto-update-daterange', 'index': 'overview'}, 'end_date')]
    )
    def calculate_ActivationRate(start_date, end_date):
        # Calculates the activation rate in the date range
        if not start_date or not end_date:
            return html.Div("Select dates"), dash.no_update

        filteredDF = filter_df_by_Date_range(start_date, end_date, df)
        LastCo_hortDates = previousCohort(start_date, end_date, df)

        activationRate = 0.0
        if filteredDF is not None and not filteredDF.empty and "Did activate" in filteredDF:
            activationRate = (len(filteredDF[filteredDF["Did activate"] == True]) / len(filteredDF)) * 100

        activationRate_last = 0.0
        if LastCo_hortDates is not None and not LastCo_hortDates.empty and "Did activate" in LastCo_hortDates:
            activationRate_last = (len(LastCo_hortDates[LastCo_hortDates["Did activate"] == True]) / len(LastCo_hortDates)) * 100

        return ([
            html.H5("Activation Rate"),
            html.H2(f"{activationRate:.2f}%"), # Added % sign
            html.Div(f"previous: {activationRate_last:.2f}%", # Added % sign
                    style={"fontSize": "12px", "fontStyle": "italic", "opacity": "0.7"})
        ], colourSelector(activationRate, activationRate_last)) # Higher is better


# === Helper Functions (Unchanged from previous version with robustness checks) ===

def filter_df_by_Date_range(start_date, end_date, df):
    """Filters DataFrame based on 'First desktop login date' column."""
    try:
        df_copy = df.copy()
        df_copy["First desktop login date"] = pd.to_datetime(df_copy["First desktop login date"], errors='coerce')
        df_copy = df_copy.dropna(subset=["First desktop login date"])

        start_dt = pd.to_datetime(start_date, errors='coerce')
        end_dt = pd.to_datetime(end_date, errors='coerce')

        if pd.isna(start_dt) or pd.isna(end_dt):
            print(f"Warning: Invalid date format provided to filter_df_by_Date_range: {start_date}, {end_date}")
            return pd.DataFrame()

        date_filterd_df = df_copy.loc[
            (df_copy["First desktop login date"].dt.date >= start_dt.date()) &
            (df_copy["First desktop login date"].dt.date <= end_dt.date())
        ]
        return date_filterd_df
    except Exception as e:
        print(f"Error in filter_df_by_Date_range: {e}")
        return pd.DataFrame()


def previousCohort(start_date, end_date, df):
    """Calculates the date range for the previous cohort and filters the DataFrame."""
    try:
        start_dt = pd.to_datetime(start_date, errors='coerce')
        end_dt = pd.to_datetime(end_date, errors='coerce')

        if pd.isna(start_dt) or pd.isna(end_dt):
             print(f"Warning: Invalid date format provided to previousCohort: {start_date}, {end_date}")
             return pd.DataFrame()

        duration = end_dt - start_dt
        prev_end_dt = start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - duration

        last_cohort_df = filter_df_by_Date_range(prev_start_dt.strftime('%Y-%m-%d'), prev_end_dt.strftime('%Y-%m-%d'), df)
        return last_cohort_df
    except Exception as e:
        print(f"Error in previousCohort: {e}")
        return pd.DataFrame()


def CalculateStickiness(df):
    """Calculates stickiness based on 'Did X on day Y' columns."""
    if df is None or df.empty: return 0.0
    rel_cols = [col for col in df.columns if "Did " in col and "on day" in col]
    if not rel_cols: return 0.0
    df_rel = df[rel_cols].apply(pd.to_numeric, errors='coerce').fillna(0) > 0
    total_active_users = 0
    total_retention_metric = 0.0

    try:
        day_numbers = sorted([int(col.split(' ')[-1]) for col in rel_cols if col.split(' ')[-1].isdigit()])
        num_days = day_numbers[-1] if day_numbers else 0
    except:
        num_days = 0 # Fallback if parsing fails

    if num_days == 0: # If we couldn't determine days, cannot calculate % stickiness reliably
         print("Warning: Could not determine number of days for stickiness calculation.")
         return 0.0 # Or return sum of active days? Needs clarification.

    for _, row in df_rel.iterrows():
        days_active = row.sum()
        if days_active > 0:
            total_active_users += 1
            user_retention = days_active / num_days # Use dynamically found num_days
            total_retention_metric += user_retention
    if total_active_users == 0: return 0.0
    stickiness = (total_retention_metric / total_active_users) * 100
    return stickiness


def colourSelector(val_current, val_last):
    """Selects background color based on comparison."""
    color_style = {'backgroundColor': 'transparent'} # Default: no background color
    try:
        current = float(val_current)
        last = float(val_last)

        if last > current:
            color_style = '#ffaca4' # Light Red - Current is lower
        elif last < current:
            color_style =  '#90ee90' # Light Green - Current is higher
    except (ValueError, TypeError):
        print(f"Warning: Non-numeric value passed to colourSelector: {val_current}, {val_last}")
        pass
    return {"marginTop": "3%",
    "padding": "1%",
    "width": "12%",
    "textAlign": "center",
    "border": f"1px solid {FOCUS_BEAR_YELLOW}",
    "borderRadius": "10px",
    "backgroundColor": color_style,
    "boxShadow": f"0 4px 8px rgba(33,33,33,0.1)",
    "color": FOCUS_BEAR_BLACK}
