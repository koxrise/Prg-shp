function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.created_at || "",
      data.username || "",
      data.user_id || "",
      data.full_name || "",
      data.products || "",
      data.total || "",
      data.delivery || "",
      data.payment_link || "",
      data.comment || "",
      data.status || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        message: "saved"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
