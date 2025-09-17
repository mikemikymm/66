// generate a report for the number of user who cancelled the subscription

const ExcelJS = require("exceljs");

// Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = require("stripe")(STRIPE_SECRET_KEY);

const filePath = "users_canceled_sub.xlsx";

async function fetchCanceledSubscriptions() {
  try {
    // Fetch all subscriptions that have a status of 'canceled'
    const subscriptions = await stripe.subscriptions.list({
      status: "canceled",
      limit: 100
    });

    // Iterate over the list of canceled subscriptions
    const canceledDetails = [];
    for (let subscription of subscriptions.data) {
      // Retrieve the customer associated with each canceled subscription
      const customer = await stripe.customers.retrieve(subscription.customer);

      // Assume 'cancellation_details' contains both the reason for cancellation and feedback
      const reasonForCanceling = subscription.cancellation_details.reason;
      const cancellationFeedback = subscription.cancellation_details.feedback;
      const cancelationComment = subscription.cancellation_details.comment;

      canceledDetails.push({
        email: customer.email,
        reasonForCanceling: reasonForCanceling,
        cancellationFeedback: cancellationFeedback,
        cancelationComment: cancelationComment,
        dateCanceled: new Date(
          subscription.ended_at * 1000
        ).toLocaleDateString(), // Converting timestamp to readable date
      });
    }

    return canceledDetails;
  } catch (error) {
    console.error("Error fetching canceled subscriptions:", error);
  }
}

async function exportToExcel(data, filePath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet 1");

  const headers = Object.keys({
    email: "email",
    reasonForCanceling: "reasonForCanceling",
    cancellationFeedback: "cancellationFeedback",
    cancelationComment: "cancelationComment",
    dateCanceled: "dateCanceled",
  });

  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    const headerWidth = headers[colNumber - 1].length * 1.2;
    worksheet.getColumn(colNumber).width = headerWidth > 40 ? headerWidth : 30;
  });

  data.forEach((row) => {
    const rowData = [];
    headers.forEach((header) => {
      rowData.push(row[header]);
    });
    worksheet.addRow(rowData);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log("Excel file has been created successfully.");
}

const main = async () => {
  const users = await fetchCanceledSubscriptions();

  exportToExcel(users, filePath)
    .then(() => console.log("Export completed"))
    .catch((err) => console.error("Error exporting to Excel:", err));
};

main();
