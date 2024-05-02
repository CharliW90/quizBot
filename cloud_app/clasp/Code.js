const key = process.env.forms;

function doGet(e) {
  const roundNumber = e.parameter.formId
  const formId = key[roundNumber]
  const form = FormApp.openById(formId);
  const responses = form.getResponses();
  const result = JSON.stringify(responses)
  return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
}