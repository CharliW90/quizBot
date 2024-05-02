# Google Cloud Web App

The plan here is to have a Web App that creates an API that can serve, to the discord bot, the responses from Google Forms

## Plan

- express app with API endpoints to return form response
- google Apps Script for pulling the form responses and returning them in json format
- CI via circleci to assist with future updates to the app
- terraform to handle (what little) google cloud infrastructure is needed

### Express App

The express app exposes an endpoint for 'responses' which accepts a round number - this then performs a GET request on the google Apps Script deployment, providing that round number.

WIP:  The app will also need to be able to handle a request for all forms, for the discord bot to parse into a results table

### Apps Script (clasp)

clasp is googles Apps Script CLI, which lets you edit, and deploy Apps Script projects - environment variables are provided via the .clasp.json file - the main one used here is an object of key value pairs which allows conversion between a round number and a form ID for the google form that we want to get responses from - it looks something like this:

```
"variables":{
  "forms":{
    "1":"1zHFj43kL2MNOpqrS-tUvWxY123Z456",
    "2":"14LnLKm9nOpqRSt-uVwXyZ0123456",
    "3":"fwEgHj34KLmNOp-qRsTuVwXyZ7890",
    "4":"_3FDhJKlmNOpQR-sTuVwXyZ12345",
    "5":"98gFJKlMNOPqR-sTuVwXyZabcde",
    "6":"XYzhIJnopQR-sTuVwXyZ_uVwXyZ3456"
  }
}
```

WIP: The Apps Script needs to only respond to the express app, to prevent anyone else being able to get the results

### CircleCI

WIP

### Terraform

WIP