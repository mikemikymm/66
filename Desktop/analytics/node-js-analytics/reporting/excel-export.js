// Excel export module for user report data.
// This module uses ExcelJS to create an Excel file with multiple sheets based on user data.

const ExcelJS = require('exceljs');

// Constants
const {
    IOS_OPERATION_SYSTEM, MACOS_OPERATION_SYSTEM, WINDOWS_OPERATION_SYSTEM,
    ANDROID_OPERATION_SYSTEM, WEB_OPERATION_SYSTEM, UNKNOWN_OPERATING_SYSTEM,
    highlightRuleConstant // Needed for applyHighlightRules
} = require('../Config/constants'); 

/**
 * Creates worksheet columns based on the report configuration.
 * @param {Array<object>} reportConfig - The report configuration array.
 * @returns {Array<object>} Array of column definitions for ExcelJS.
 */
const createColumns = (reportConfig) => {
    if (!Array.isArray(reportConfig)) return [];
    return reportConfig.map((config) => ({
        header: config.excel_column_name,
        key: config.excel_column_name, // Key must match header
        width: 20 // Default width, adjusted later by autoSize
    }));
};

/**
 * Creates a row data object suitable for ExcelJS from the report configuration.
 * @param {Array<object>} reportConfig - The populated report configuration for a user.
 * @returns {object} An object mapping column headers to cell values.
 */
const createRow = (reportConfig) => {
    if (!Array.isArray(reportConfig)) return {};
    return reportConfig.reduce((acc, config) => {
        let value = config.value;
        // Handle complex types for Excel display
        if (typeof value === 'object' && value !== null) { value = JSON.stringify(value); }
        // Display booleans as strings
        if (value === false) value = "FALSE";
        if (value === true) value = "TRUE";
        // Assign value (including null or empty string)
        acc[config.excel_column_name] = value;
        return acc;
    }, {});
};

/**
 * Applies conditional formatting (cell fill/font) based on highlight rules.
 * @param {ExcelJS.Row} row - The ExcelJS row object.
 * @param {Array<object>} reportConfig - The populated report configuration for the row.
 */
const applyHighlightRules = (row, reportConfig) => {
    if (!Array.isArray(reportConfig)) return;
    reportConfig.forEach((config) => {
        // Use the column key (which matches the header) to get the cell
        const cell = row.getCell(config.excel_column_name);
        if (cell) { // Ensure cell exists
            if (config.highlightRule === highlightRuleConstant.GREEN) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6EFCE" } };
                cell.font = { color: { argb: '006100' } }; // Dark Green
            } else if (config.highlightRule === highlightRuleConstant.RED) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7CE" } };
                cell.font = { color: { argb: '9C0006' } }; // Dark Red
            } else {
                // Optionally clear formatting if no rule applies
                // cell.fill = undefined;
                // cell.font = undefined;
            }
        }
    });
};

/**
 * Auto-sizes worksheet columns based on header and sample data rows.
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to size.
 * @param {number} [checkRows=10] - Number of data rows to check for content length.
 */
const autoSizeColumnsOptimized = (worksheet, checkRows = 10) => {
    console.log(`   Resizing columns for sheet "${worksheet.name}" (checking header + ${checkRows} rows)...`);
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        // Check Header
        const header = column.header || '';
        if (header.length > maxLength) { maxLength = header.length; }
        // Check Sample Data Rows
        column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            // Only check data rows up to the limit (+1 for header row)
            if (rowNumber > 1 && rowNumber <= checkRows + 1) {
                 const cellValue = cell.value;
                 // Convert boolean/null/undefined to string representation for length check
                 const cellText = cellValue === false ? 'FALSE' : cellValue === true ? 'TRUE' : String(cellValue ?? '');
                 const cellLength = cellText.length;
                 if (cellLength > maxLength) { maxLength = cellLength; }
            }
        });
        // Apply width with padding and min/max limits
        column.width = Math.max(10, Math.min(60, maxLength + 3));
    });
};

/**
 * Creates an Excel worksheet with data and formatting.
 * @param {ExcelJS.Workbook} workbook - The workbook to add the sheet to.
 * @param {string} os - The name for the worksheet (Operating System).
 * @param {Array<object>} sheetData - Array of user report data for this sheet.
 */
const createWorksheet = (workbook, os, sheetData) => {
    const worksheet = workbook.addWorksheet(os);
    // Ensure there's data and the first item has a reportConfig
    if (sheetData.length > 0 && sheetData[0].reportConfig?.length > 0) {
        // Set columns based on the first user's config
        worksheet.columns = createColumns(sheetData[0].reportConfig);

        // Style Header Row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } }; // Light Grey
        headerRow.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

        // Add Data Rows
        sheetData.forEach((userReport) => {
          // Check for reportConfig on each user object
          if (userReport.reportConfig) {
              const rowData = createRow(userReport.reportConfig);
              const addedRow = worksheet.addRow(rowData);
              applyHighlightRules(addedRow, userReport.reportConfig); // Apply formatting
          } else {
              console.warn(`   [Excel] User data missing reportConfig for OS ${os}, skipping row.`);
          }
        });

        // Auto-size columns after data is added
        autoSizeColumnsOptimized(worksheet);
    } else {
        console.warn(`   [Excel] No data or reportConfig structure found for sheet ${os}. Sheet will be empty.`);
        // Optional: Add a placeholder message to the empty sheet
        worksheet.getCell('A1').value = `No data available for ${os}.`;
    }
};

/**
 * Exports processed report data to an Excel file, creating separate sheets per OS.
 * @param {Array<object>} datas - Array of user report objects (each with os and reportConfig).
 * @param {string} filePath - The path to save the Excel file.
 * @returns {Promise<void>}
 */
const exportToExcel2 = async (datas, filePath) => {
    // Define OS order here
    const operatingSystems = [
        MACOS_OPERATION_SYSTEM, WINDOWS_OPERATION_SYSTEM, IOS_OPERATION_SYSTEM,
        ANDROID_OPERATION_SYSTEM, WEB_OPERATION_SYSTEM, UNKNOWN_OPERATING_SYSTEM,
    ];
    try {
        const workbook = new ExcelJS.Workbook();
        // Group data by OS first
        const dataByOS = {};
        operatingSystems.forEach(os => dataByOS[os] = []); // Initialize all expected OS keys

        datas.forEach((data) => {
            let primaryOS = data.os?.[0]; // Assuming first OS in array is primary
            // If OS is missing or not in our known list, categorize as Unknown
            if (!primaryOS || !operatingSystems.includes(primaryOS)) {
                primaryOS = UNKNOWN_OPERATING_SYSTEM;
            }
            // Add safety check in case UNKNOWN_OPERATING_SYSTEM wasn't initialized (should be above)
            if (!dataByOS[primaryOS]) { dataByOS[primaryOS] = []; }
            dataByOS[primaryOS].push(data);
        });

        console.log("⚙️ [Excel] Creating Excel worksheets by OS...");
        // Create sheets in the desired order
        for (const os of operatingSystems) {
            const sheetData = dataByOS[os];
            if (sheetData.length > 0) {
                console.log(`   [Excel] Creating sheet for ${os} with ${sheetData.length} users...`);
                createWorksheet(workbook, os, sheetData);
            } else {
                 console.log(`   [Excel] Skipping empty sheet for ${os}.`);
            }
        }

        console.log(`💾 [Excel] Writing report to ${filePath}...`);
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ [Excel] Report exported successfully to ${filePath}`);
    } catch (err) {
        console.error("❌ [Excel] Error exporting report to Excel:", err.message, err.stack);
        // Re-throw to indicate failure to the calling script
        throw new Error(`Error exporting report to Excel: ${err.message}`);
    }
};

/**
 * Excel export function.
 */
const exportToExcel = async (datas, filePath, headers) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");
    // Add Header Row
    worksheet.addRow(headers);
    // Style Header Row (Original Styling)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        // Simple width calculation (Original)
        const headerWidth = headers[colNumber - 1]?.length * 1.2 || 10;
        worksheet.getColumn(colNumber).width = headerWidth > 40 ? 40 : (headerWidth < 10 ? 10 : headerWidth);
    });
    // Add Data Rows
    datas.forEach((data) => {
        const rowData = headers.map(header => data[header]); // Simpler mapping
        worksheet.addRow(rowData);
    });
    // Save File
    await workbook.xlsx.writeFile(filePath);
    console.log("✅ [Excel] File (original format) created successfully.");
};


module.exports = {
    exportToExcel2, // Optimized multi-sheet export
    exportToExcel,  // Original simple export
    // Internal helpers are not typically exported unless needed elsewhere
    // createColumns, createRow, applyHighlightRules, autoSizeColumnsOptimized, createWorksheet
};

// --- END OF FILE reporting/excel-export.js ---