const { google } = require('googleapis');
const { pathToCredentials } = require("../../config.json")

const formId = "17WDj4xTbLKo39sJP65Tte9RMXDOMdB78TdyLbgMXVuE" // Round 3

exports.fetch = (roundNum) => {
  console.log(`This will fetch results for round ${roundNum} (WIP - will currently always return round 3)`)
  const response = getFormResponses(formId)
  return response
}

async function getFormResponses(form) {
  try {
    // Load the service account credentials
    console.log("Loading service account credentials...")
    const credentials = require(`../../${pathToCredentials}`);
    console.log(`Fetched credentials for: ${credentials.client_email}`)

    // Create an auth client
    console.log("Creating auth client...")
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/forms.responses.readonly']
    });

    if(auth.GoogleAuth.jsonContent){
      console.log(`Auth generated for: ${auth.GoogleAuth.jsonContent.client_email}`)
    } else {
      console.error("No auth generated - see:")
      console.info(auth)
    }

    // Create the Forms API client
    console.log("Generating forms API client...")
    const forms = google.forms({
      version: 'v1',
      auth: auth.GoogleAuth
    });

    if(forms.forms && forms.forms.responses){
      console.log(`Forms API successfully generated!`)
    } else {
      console.error("Forms API failed - see:")
      console.log(forms)
    }

    // Get the responses
    const res = await forms.forms.responses.list({formId: form});

    const responses = res.data.responses;
    console.log(responses)
    return responses;

  } catch (error) {
    console.error('Error getting responses:', error);
    throw error; // Re-throw the error for handling elsewhere
  }
}