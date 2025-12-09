/**
 * Price Alert Monitor - Hybrid Version
 * Uses Google Sheets formulas for price fetching
 */

const SPREADSHEET_ID = "1YpYYTcoslYxNTI0iPLtjWE2nOSsNdUorLY96o_b2eN0"; // change it to the ID of your Google Sheet where your tracked stocks are present eg. if the URL of your sheet is https://docs.google.com/spreadsheets/d/1YpYYTcoslYxNTI0iPLtjWE2nOSsNdUorLY96o_b2eN0/edit?gid=0#gid=0, use 1YpYYTcoslYxNTI0iPLtjWE2nOSsNdUorLY96o_b2eN0 
const SHEET_NAME = "Watchlist"; // change the name of the sheet in your spreadsheet to Watchlist from "Sheet 1"
const PRICE_ALERT_LOG_SHEET = "Alert History";

const COLUMNS = {
  TICKER: 1,
  ASSET_NAME: 2,
  ASSET_TYPE: 3,
  TARGET_PRICE: 4,
  CONDITION: 5,
  EMAIL: 6,
  ENABLED: 7,
  CURRENT_PRICE: 8,
  LAST_ALERTED: 9
};

// Main function - reads prices from sheet (auto-calculated by GOOGLEFINANCE formula)
function checkAllPrices() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip if not enabled
    if (row[COLUMNS.ENABLED - 1] !== true && row[COLUMNS.ENABLED - 1] !== "TRUE") {
      continue;
    }
    
    const ticker = row[COLUMNS.TICKER - 1];
    const assetName = row[COLUMNS.ASSET_NAME - 1];
    const targetPrice = parseFloat(row[COLUMNS.TARGET_PRICE - 1]);
    const condition = row[COLUMNS.CONDITION - 1];
    const email = row[COLUMNS.EMAIL - 1];
    const currentPrice = parseFloat(row[COLUMNS.CURRENT_PRICE - 1]);
    
    if (!ticker || !targetPrice || !email || !currentPrice) {
      continue;
    }
    
    
    // if (shouldAlert) {
    //   sendAlert(assetName, ticker, currentPrice, targetPrice, condition, email);
      
    //   // Update last alerted timestamp
    //   sheet.getRange(i + 1, COLUMNS.LAST_ALERTED).setValue(new Date());
      
    //   // Log the alert
    //   logAlert(assetName, ticker, currentPrice, targetPrice, condition, email);
    // }

    // Check alert condition and 6-hour throttle
    const lastAlertTime = row[COLUMNS.LAST_ALERTED - 1];
    const shouldAlert = checkCondition(currentPrice, targetPrice, condition);

    // Only send alert if condition is met AND either:
    // 1. Never alerted before, OR
    // 2. More than 6 hours have passed since last alert
    const now = new Date();
    const sixHoursInMs = 6 * 60 * 60 * 1000; // 6 hours
    const canAlert = !lastAlertTime || (now - new Date(lastAlertTime)) > sixHoursInMs;

    if (shouldAlert && canAlert) {
      sendAlert(assetName, ticker, currentPrice, targetPrice, condition, email);
      
      // Update last alerted timestamp
      sheet.getRange(i + 1, COLUMNS.LAST_ALERTED).setValue(new Date());
      
      // Log the alert
      logAlert(assetName, ticker, currentPrice, targetPrice, condition, email);
      
      Logger.log(`✅ Alert sent to ${email} for ${ticker}`);
    } else if (shouldAlert && !canAlert) {
      Logger.log(`⏳ ${ticker}: Condition met but throttled (last alert < 6 hours ago)`);
    }


  }
  
  Logger.log("✅ Price check completed at " + new Date());
}

// Check if alert condition is met
function checkCondition(currentPrice, targetPrice, condition) {
  if (condition === "ABOVE") {
    return currentPrice >= targetPrice;
  } else if (condition === "BELOW") {
    return currentPrice <= targetPrice;
  }
  return false;
}

// Send alert email
function sendAlert(assetName, ticker, currentPrice, targetPrice, condition, email) {
  const subject = `Price Alert: ${assetName} (${ticker})`; // Remove emoji from subject
  
  const body = `
🚨 Price Alert Triggered!

Asset: ${assetName}
Ticker: ${ticker}
Current Price: ${currentPrice}
Target Price: ${targetPrice}
Condition: ${condition}

Timestamp: ${new Date().toString()}

---
This is an automated alert from your Price Monitor.
To disable this alert, set Enabled to FALSE in your watchlist.
  `;
  
  try {
    MailApp.sendEmail(email, subject, body, {
      name: "Price Alert Monitor"
    });
    Logger.log(`✅ Alert sent to ${email} for ${ticker}`);
  } catch (e) {
    Logger.log(`Error sending email: ${e}`);
  }
}

// Log alerts
function logAlert(assetName, ticker, currentPrice, targetPrice, condition, email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let logSheet = ss.getSheetByName(PRICE_ALERT_LOG_SHEET);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(PRICE_ALERT_LOG_SHEET);
    logSheet.appendRow([
      "Timestamp",
      "Asset Name",
      "Ticker",
      "Current Price",
      "Target Price",
      "Condition",
      "Email"
    ]);
  }
  
  logSheet.appendRow([
    new Date(),
    assetName,
    ticker,
    currentPrice,
    targetPrice,
    condition,
    email
  ]);
}

// Set up trigger
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  ScriptApp.newTrigger("checkAllPrices")
    .timeBased()
    .everyMinutes(30)
    .create();
  
  Logger.log("✅ Trigger set up - will check every 30 minutes");
}

// Test function
function testPriceCheck() {
  Logger.log("=== Testing Price Check ===");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  Logger.log("Sheet data loaded:");
  for (let i = 1; i < Math.min(data.length, 3); i++) {
    const row = data[i];
    Logger.log(`${row[1]}: Current Price = ${row[7]}`);
  }
  
  Logger.log("✅ Test complete");
}

function stopAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log("✅ All triggers stopped");
}

