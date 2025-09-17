// This file contains utility functions for date formatting and calculations.

const moment = require('moment');

/**
 * Formats a date string into 'YYYY-MM-DD' using UTC.
 * Returns an empty string if the input is invalid or formatting fails.
 * @param {string | Date | null | undefined} dateString - The date input.
 * @returns {string} The formatted date string or empty string.
 */
const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
        // Ensure moment object is valid before formatting
        const mDate = moment.utc(dateString);
        return mDate.isValid() ? mDate.format("YYYY-MM-DD") : "";
    }
    catch (e) {
        console.warn(`Could not format date: ${dateString}`, e);
        return "";
    }
};

/**
 * Calculates the number of full days between two dates (inclusive).
 * Uses UTC dates and considers the start of each day.
 * Returns 0 if either date is invalid.
 * @param {string | Date | null | undefined} date1 - The start date.
 * @param {string | Date | null | undefined} date2 - The end date.
 * @returns {number} The number of days between the dates.
 */
const calculateDaysBetweenDates = (date1, date2) => {
    if (!date1 || !date2) return 0;
    try {
        const start = moment.utc(date1).startOf('day');
        const end = moment.utc(date2).startOf('day');
        // Ensure both dates are valid moment objects
        if (!start.isValid() || !end.isValid()) {
            console.warn(`Invalid date provided to calculateDaysBetweenDates: ${date1} or ${date2}`);
            return 0;
        }
        // Add 1 because if signup and update are on the same day, it's 1 day of activity
        return end.diff(start, 'days') + 1;
    } catch(e) {
        console.warn(`Error calculating days between ${date1} and ${date2}`, e);
        return 0;
    }
};

module.exports = {
    formatDate,
    calculateDaysBetweenDates,
};

// --- END OF FILE utils/date-utils.js ---