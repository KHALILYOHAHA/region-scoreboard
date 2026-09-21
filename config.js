// Google Sheet settings — paste your spreadsheet ID below (from the Sheet URL).
// Example URL: https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
// Sheet must be shared: Anyone with the link → Viewer
window.SCOREBOARD_CONFIG = {
  // Leave empty to use demo/random mode until a sheet is connected.
  sheetId: "",
  // Tab name (exact match)
  sheetName: "Scores",
  // How often to refresh from Sheets (ms)
  pollMs: 5000,
};
