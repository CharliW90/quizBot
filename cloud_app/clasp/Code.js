const key = JSON.parse(PropertiesService.getScriptProperties().getProperty("forms"))
const pass = PropertiesService.getScriptProperties().getProperty("pass")

function doGet(e) {
  if(e.parameter.passKey === pass){
    const roundNumber = e.parameter.formId
    const formId = key[roundNumber]
    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    const result = JSON.stringify(responses)
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } else {
    err = [
      "error",
      {
        "code": 403,
        "reason": "password incorrect"
      }
    ]
    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }
}