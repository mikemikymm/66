// This file contains the mapping function for user events and activities.
// It processes the input data and generates a report configuration based on the defined structure.

const moment = require('moment'); // Still needed if date utils are used

// Constants from the new structure
const {
    COLUMN_NAME_MAPPING,
    eventTypeConstant,
    breakDownByPropertyConstant,
    highlightRuleConstant,
    reportConfig, // Use the reportConfig from constants
    ANDROID_OPERATION_SYSTEM,
    IOS_OPERATION_SYSTEM,
    UNKNOWN_OPERATING_SYSTEM,
} = require('../Config/constants');

// Utilities from the new structure
const { formatDate, calculateDaysBetweenDates } = require('../utils/date-utils');



const joinUniqueStrings = (array) => {
  const uniqueSet = new Set(array.filter(Boolean)); // Ensure only truthy values are added
  return Array.from(uniqueSet).join(" "); // Join with space
};

const calculateTotalByEventDataType = (events, event_data_type) => {
  const value = events.reduce((pre, cur) => {
    // Original logic might have accessed data differently, adjust if needed
    const data = cur?.event_data?.data;
    const curValue = data ? parseInt(data[event_data_type]) || 0 : 0;
    return pre + curValue;
  }, 0);
  return value;
};

const countRoutineDays = (eventType, events) => {
  const types = eventType.split(",");
  const filteredEvents = events
    .filter((event) => types.includes(event.event_type))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let distinctEvents = [];
  let seenDates = new Set();

  filteredEvents.forEach((event) => {
    let eventDateStr = formatDate(event.created_at); // Use imported formatDate
    if (eventDateStr && !seenDates.has(eventDateStr)) { // Check date is valid
      distinctEvents.push(event);
      seenDates.add(eventDateStr);
    }
  });

  const offset =
    distinctEvents.length > 0 ? distinctEvents[0].created_at : null;
  // Use imported calculateDaysBetweenDates
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;
  const value = distinctEvents.length;

  return { offset, offsetDays, value };
};

const getPercentOfDayDidRoutineHabit = ( event_type, track_events, active_days) => {
    // active_days needs to be calculated or passed correctly
    // Let's assume active_days is passed from the main mapTrackEvents call
    const { offset, offsetDays, value } = countRoutineDays( event_type, track_events );
    const percentValue = active_days > 0 ? parseFloat(((value * 100) / active_days).toFixed(1)) : 0;
    return { offset, offsetDays, value: percentValue };
};

const countRoutineEvent = ( eventType, events, startHours = null, endHours = null, user_id, user_created_at) => {
    // Needs user_created_at for time window logic
    const signupTime = user_created_at ? moment.utc(user_created_at) : null;
    if (!signupTime || !signupTime.isValid()) {
         console.warn(`[countRoutineEvent] Invalid or missing signupTime for user ${user_id}`);
         return { offset: null, offsetDays: 0, value: 0 };
    }

    const types = eventType.split(",");
    let filteredEvents = events
        .filter((event) => event && types.includes(event.event_type)) // Add null check for event
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Apply time window filtering if startHours and endHours are provided
    if (startHours !== null && endHours !== null) {
        const startTime = signupTime.clone().add(startHours, 'hours');
        const endTime = signupTime.clone().add(endHours, 'hours');

        // Ensure start and end times are valid moments
        if (!startTime.isValid() || !endTime.isValid()) {
             console.warn(`[countRoutineEvent] Invalid start/end time for user ${user_id}. Start: ${startHours}, End: ${endHours}`);
             return { offset: null, offsetDays: 0, value: 0 };
        }

        filteredEvents = filteredEvents.filter((event) => {
                const eventTime = moment.utc(event.created_at);
                // Check if eventTime is valid before comparison
                return eventTime.isValid() && eventTime.isSameOrAfter(startTime) && eventTime.isSameOrBefore(endTime);
            }
        );
    }

    // Determine offset based on the first event *found within the filter*
    const offset = filteredEvents.length > 0 ? filteredEvents[0].created_at : null;
    const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;

    // --- CORRECTED VALUE CALCULATION ---
    // For EVENT_COUNT breakdown, the value should always be the *number* of events found.
    // The previous logic incorrectly tried to sum 'focusDuration' for focus start events.
    // This resulted in focus mode sessions being counted as 0 or 1 instead of the actual count.
    const value = filteredEvents.length;
    // --- END CORRECTION ---

    // Log if focus mode calculation resulted in non-zero (for verification)
    if (eventType === `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}` && value > 0) {
        // console.log(`   [countRoutineEvent] User ${user_id}: Found ${value} focus starts between ${startHours}-${endHours} hours.`);
    }


    return { offset, offsetDays, value };
};

const getEventDetails = (eventType, events, excel_column_name = '') => { // Added default for excel_column_name
  const filteredEvents = events.filter(event => event.event_type === eventType);
  // Find the earliest (first) event of this type
  const firstEvent = filteredEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

  const offset = firstEvent ? firstEvent.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;

  let value;
  // Logic based on original structure for specific columns
  if (excel_column_name === COLUMN_NAME_MAPPING.SIGNED_UP_ON_MOBILE_DATE) {
      const isMobileSignup = firstEvent && [ANDROID_OPERATION_SYSTEM, IOS_OPERATION_SYSTEM].includes(firstEvent.operating_system);
      value = isMobileSignup ? formatDate(firstEvent.created_at) : '';
  } else if (excel_column_name === COLUMN_NAME_MAPPING.SIGNED_UP_ON_MOBILE) {
       const isMobileSignup = firstEvent && [ANDROID_OPERATION_SYSTEM, IOS_OPERATION_SYSTEM].includes(firstEvent.operating_system);
       value = isMobileSignup; // Boolean
  } else if ([eventTypeConstant.LOGIN_HOMEMADE, eventTypeConstant.LOGIN].includes(eventType)) {
      // Assuming first login date is desired
      value = firstEvent ? formatDate(firstEvent.created_at) : "";
  } else {
      // Default: Did the event happen at all?
      value = !!firstEvent;
  }

  return { offset, offsetDays, value };
};


const getEventDetailsWithMultipleType = (eventTypesString, events) => {
  const eventTypes = eventTypesString.split(',').map(s => s.trim());
  const filteredEvents = events.filter((event) => eventTypes.includes(event.event_type));

  // Find the earliest event among the matching types
  const earliestEvent = filteredEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

  const offset = earliestEvent ? earliestEvent.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;
  const value = !!earliestEvent; // Did *any* of these events happen?

  return { offset, offsetDays, value };
};


const getEventPropertyValue = (eventType, events, propertyNames) => {
  const filteredEvents = events.filter(event => event.event_type === eventType);
  // Find the date of the first event of this type
  const firstEvent = filteredEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
  const offset = firstEvent ? firstEvent.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;

  // Extract values from ALL events of this type, check multiple property names
  const extractedValues = filteredEvents.map((event) => {
    let value = "";
    // Iterate through possible property names provided
    for (const propertyName of propertyNames) {
      if (event.event_data?.data?.[propertyName] !== undefined) { // Check existence
        value = event.event_data.data[propertyName];
        // Original logic stringified, let's keep that for exactness, though maybe not ideal
        return JSON.stringify(value);
        // break; // Found a value, stop checking other property names for this event
      }
    }
    return null; // Return null if no property matched for this event
  }).filter(Boolean); // Filter out nulls

  // Get unique stringified values and join with a space
  const value = joinUniqueStrings(extractedValues);

  return { offset, offsetDays, value };
};


const getAverageHoursDeepWorkPerWeek = (eventType, events, active_days) => {
    const completedSessions = events.filter((event) => event.event_type === eventType);
    const firstEvent = completedSessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    const offset = firstEvent ? firstEvent.created_at : null;
    const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;

    const totalMinutes = calculateTotalByEventDataType(completedSessions, "focusDurationMinutes");
    const weeksActive = Math.max(active_days, 1) / 7; // Use active_days, ensure at least 1 day
    const avgMinutesPerWeek = weeksActive > 0 ? totalMinutes / weeksActive : 0;
    const avgHoursPerWeek = avgMinutesPerWeek / 60;

    return { offset, offsetDays, value: parseFloat(avgHoursPerWeek.toFixed(1)) };
};

const calculateAverageOfBreakTiming = (events) => {
  const feedbackEvents = events.filter(event => event.event_type === eventTypeConstant.BREAK_FEEDBACK_LEFT);
  const firstEvent = feedbackEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
  const offset = firstEvent ? firstEvent.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;

  if (feedbackEvents.length === 0) return { offset, offsetDays, value: 0 };

  const sumRating = feedbackEvents.reduce((sum, event) => {
      const rating = parseInt(event.event_data?.data?.['breaking-timing']) || 0; // Use original key access
      return sum + rating;
  }, 0);
  const avgRating = sumRating / feedbackEvents.length;

  return { offset, offsetDays, value: Math.round(avgRating) };
};


const didQuitWithinDays = (eventType, events, targetDay) => {
    // Need first login event details
    const firstLoginEvent = events
        .filter(e => e.event_type === eventTypeConstant.LOGIN_HOMEMADE)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    // Get details of the quit event
    const quitDetails = getEventDetails(eventType, events); // Uses the first quit event

    if (!firstLoginEvent || !quitDetails.offset) {
        return { ...quitDetails, value: false }; // Cannot determine if no login or no quit
    }

    // Use calculateDaysBetweenDates for consistency
    const daysBetween = calculateDaysBetweenDates(firstLoginEvent.created_at, quitDetails.offset);
    // <= targetDay means within the first N days (inclusive)
    const quitWithinTarget = daysBetween <= targetDay;

    return { ...quitDetails, value: quitWithinTarget };
};

const getActivityConfigDetail = (activities, type) => {
  const filteredActivities = activities.filter((f) => f.activity_type === type);
  // Get the first (earliest) activity of this type
  const firstActivity = filteredActivities.sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[0];
  const offset = firstActivity ? firstActivity.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;
  const value = filteredActivities.length; // Total count
  return { offset, offsetDays, value };
};

const getFocusModeConfigDetail = (focusModeDatas) => {
  // Get the first (earliest) focus mode entry
  const firstFocusMode = focusModeDatas.sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[0];
  const offset = firstFocusMode ? firstFocusMode.created_at : null;
  const offsetDays = offset ? calculateDaysBetweenDates(offset, new Date()) : 0;
  const value = focusModeDatas.length; // Total count
  return { offset, offsetDays, value };
};

// Helper used by the original mapTrackEvents
const getRoutineDetails = ( event_type, track_events, breakDownByProperty, excel_column_name, active_days, startHours, endHours, user_id, user_created_at) => {
    if (breakDownByProperty === breakDownByPropertyConstant.EVENT_COUNT) {
        // Use the recreated countRoutineEvent
        return countRoutineEvent( event_type, track_events, startHours, endHours, user_id, user_created_at );
    } else if (excel_column_name === COLUMN_NAME_MAPPING.COMPLETED_BREAK_ACTIVITY) {
        // Special case from original logic? Let's just use getEventDetails for consistency
        return getEventDetails(event_type, track_events, excel_column_name);
    } else {
        // Use the recreated getPercentOfDayDidRoutineHabit
        return getPercentOfDayDidRoutineHabit(event_type, track_events, active_days);
    }
};

// Helper used by the original mapTrackEvents
const setConfigValues = (config, value) => {
    config.value = value;
    // Apply original highlighting logic (may differ slightly from optimized one)
    if (typeof value === 'boolean') {
        config.highlightRule = value ? highlightRuleConstant.GREEN : highlightRuleConstant.RED;
    } else if (typeof value === 'number' && value > 0) {
         config.highlightRule = highlightRuleConstant.GREEN;
    } else if (typeof value === 'string' && value && value !== 'unknown') {
         config.highlightRule = highlightRuleConstant.GREEN;
    } else if (config.excel_column_name !== COLUMN_NAME_MAPPING.USER_ID &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.FIRST_DESKTOP_LOGIN_DATE &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.LAST_UPDATED_DATE &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.TEAM_ID && // Don't highlight Team ID red
               !value) {
         config.highlightRule = highlightRuleConstant.RED;
    } else {
         config.highlightRule = ""; // Default no highlight
    }

     
};

// Helper used by the original mapTrackEvents
const getDetailsAndSetConfig = (config, details) => {
    config.timeframe.offset = details.offset;
    config.timeframe.offsetDays = details.offsetDays;
    config.value = details.value;
     // Apply original highlighting logic (may differ slightly from optimized one)
    if (typeof details.value === 'boolean') {
        config.highlightRule = details.value ? highlightRuleConstant.GREEN : highlightRuleConstant.RED;
    } else if (typeof details.value === 'number' && details.value > 0) {
         config.highlightRule = highlightRuleConstant.GREEN;
    } else if (typeof details.value === 'string' && details.value && details.value !== 'unknown') {
         config.highlightRule = highlightRuleConstant.GREEN;
    } else if (config.excel_column_name !== COLUMN_NAME_MAPPING.USER_ID &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.FIRST_DESKTOP_LOGIN_DATE &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.LAST_UPDATED_DATE &&
               config.excel_column_name !== COLUMN_NAME_MAPPING.TEAM_ID && // Don't highlight Team ID red
               !details.value) {
         config.highlightRule = highlightRuleConstant.RED;
    } else {
         config.highlightRule = ""; // Default no highlight
    }

    // Specific overrides from original mapTrackEvents logic
     if (config.excel_column_name === COLUMN_NAME_MAPPING.QUIT_WITHIN_7_DAYS && details.value === true) { config.highlightRule = highlightRuleConstant.RED; }
     if (config.excel_column_name === COLUMN_NAME_MAPPING.UNINSTALLED_APP && details.value > 0) { config.highlightRule = highlightRuleConstant.RED; }
};



const mapTrackEvents = ({
  user_id, // DB ID is primary internal ID
  auth0_id, // Auth0 ID for display/linking
  team_id, //is not used by this original function
  created_at, // User creation date
  updated_at, // User last update date
  revenue_cat_status,
  track_events = [], // Default to empty arrays
  activities = [],
  focusModeDatas = [],
  devices = [], // Contains primary OS object { operating_system: ... }
}) => {
  // Calculate active_days based on user create/update dates
  // Use the imported utility function for consistency
  const active_days = calculateDaysBetweenDates(created_at, updated_at);

  // Create a deep copy of the reportConfig constant to avoid modifying it globally
  const reportConfigCopy = JSON.parse(JSON.stringify(reportConfig));

  // *** Process using the original logic structure ***
  const reportConfigWithDetails = reportConfigCopy.map((config) => {
    const {
      event_type,
      excel_column_name,
      breakDownByProperty,
      startHours, // Used for 'Day X' metrics
      endHours,   // Used for 'Day X' metrics
    } = config;

    

    // Handle specific event types as in the original function
    switch (event_type) {
      case eventTypeConstant.USER_ID:
        setConfigValues(config, auth0_id || user_id); // Use Auth0 ID if available
        break;
      case 'user_data_team_id':
          // Directly use the team_id passed into the function
          // Use empty string if team_id is null or undefined
        setConfigValues(config, team_id || '');
        break;
      case eventTypeConstant.UPDATED_AT:
        setConfigValues(config, updated_at ? formatDate(updated_at) : null); // Use imported formatDate
        break;

      case eventTypeConstant.LOGIN_HOMEMADE:
         // Get the date of the *first* login-homemade event
         const firstLoginDetails = getEventDetails(event_type, track_events, excel_column_name);
         setConfigValues(config, firstLoginDetails.value || (created_at ? formatDate(created_at) : null)); // Fallback to user creation date
        break;

      case eventTypeConstant.REVENUE_CAT_STATUS:
        setConfigValues(config, revenue_cat_status || 'unknown'); // Use 'unknown' if null/undefined
        break;

      case eventTypeConstant.APP_QUIT:
        // Handle 'Quit within 7 days' specifically
        if (excel_column_name === COLUMN_NAME_MAPPING.QUIT_WITHIN_7_DAYS) {
            getDetailsAndSetConfig(config, didQuitWithinDays(event_type, track_events, 7));
        } else {
            // Default behavior if APP_QUIT is used for other columns (unlikely)
             getDetailsAndSetConfig(config, getEventDetails(event_type, track_events, excel_column_name));
        }
        break;

      case eventTypeConstant.UNINSTALL:
      case eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY:
      case eventTypeConstant.COMPLETE_BREAK_ACTIVITY:
      case eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY:
      case `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`: // Combined focus start
        const routineDetails = getRoutineDetails(
          event_type,
          track_events,
          breakDownByProperty,
          excel_column_name,
          active_days,
          startHours,
          endHours,
          user_id, // Pass user_id
          created_at // Pass user_created_at
        );
        getDetailsAndSetConfig(config, routineDetails);
        break;

      case eventTypeConstant.COMPLETED_FOCUS_SESSION:
        getDetailsAndSetConfig(config, getAverageHoursDeepWorkPerWeek(event_type, track_events, active_days));
        break;

      // Cases using getEventPropertyValue
      case eventTypeConstant.OCCUPATION_SELECTED:
        getDetailsAndSetConfig(config, getEventPropertyValue(event_type, track_events, ["occupation"]));
        break;
      case eventTypeConstant.GOALS_FOR_FOCUS_BEAR:
        getDetailsAndSetConfig(config, getEventPropertyValue(event_type, track_events, ["custom-goal", "customGoal"]));
        break;
      case eventTypeConstant.CARE_ABOUT_HABITS:
         getDetailsAndSetConfig(config, getEventPropertyValue(event_type, track_events, ["commitment"])); // Assuming property name
         break;
      case eventTypeConstant.CARE_ABOUT_BREAKS:
          getDetailsAndSetConfig(config, getEventPropertyValue(event_type, track_events, ["careFactor"])); // Assuming property name
          break;

      case eventTypeConstant.BREAK_FEEDBACK_LEFT:
        getDetailsAndSetConfig(config, calculateAverageOfBreakTiming(track_events));
        break;

      // Cases using Activity/FocusMode data from separate tables
      case eventTypeConstant.MORNING:
      case eventTypeConstant.EVENING:
      case eventTypeConstant.BREAKING:
        getDetailsAndSetConfig(config, getActivityConfigDetail(activities, event_type));
        break;
      case eventTypeConstant.FOCUS_MODE:
        getDetailsAndSetConfig(config, getFocusModeConfigDetail(focusModeDatas));
        break;

      // Default case for simple existence checks or multi-type checks
      default:
        const details = (breakDownByProperty === breakDownByPropertyConstant.COUNT_WITH_MULTIPLE_TYPES)
            ? getEventDetailsWithMultipleType(event_type, track_events)
            : getEventDetails(event_type, track_events, excel_column_name);
        getDetailsAndSetConfig(config, details);
        break;
    }

    return config; // Return the modified config object
  });

  // Extract primary OS from the input devices array
  const primaryOs = devices?.[0]?.operating_system || UNKNOWN_OPERATING_SYSTEM;

  return {
    os: [primaryOs], // Keep os field as an array
    reportConfig: reportConfigWithDetails,
  };
};


module.exports = {
    mapTrackEvents, // Export only the main mapping function
};

// --- END OF FILE reporting/report-mapper.js ---