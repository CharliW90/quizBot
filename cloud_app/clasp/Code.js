const key = JSON.parse(PropertiesService.getScriptProperties().getProperty("forms"))
const quizBotUrl = PropertiesService.getScriptProperties().getProperty("quizBot")
const apiKey = PropertiesService.getScriptProperties().getProperty("apiKey")

function doGet(e) {
  
  const options = {
    'method': 'get',
    'headers': {
      'Authorization': `Bearer ${apiKey}`,
      'Password': e.parameter.passkey,
    },
    'muteHttpExceptions': true
  }

  const passcheck = UrlFetchApp.fetch(`${quizBotUrl}/api/passcheck`, options);

  if(!passcheck.getResponseCode() === 200 || !passcheck.toString() === e.parameter.passkey){
    console.error(`${quizBotUrl} passcheck response: ${passcheck.getResponseCode()}, ${passcheck.toString()}`)
    msg = {
      error: {
        code: 403,
        reason: "password incorrect"
      }
    }
    console.warn(msg.error.reason);
    const response = JSON.stringify(msg)
    return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
  }
  if(e.parameter.endpoint === 'permissionsCheck'){
    msg = {
      response: {
        code: 200,
        message: "Adequate permissions."
      }
    }
    console.info('Permissions Check: PASS')
    const stringResponse = JSON.stringify(msg);
    return ContentService.createTextOutput(stringResponse).setMimeType(ContentService.MimeType.JSON);
  }
  const roundNumber = e.parameter.formId
  if(isNaN(roundNumber)){
    msg = {
      error: {
        code: 400,
        reason: `${roundNumber} is not a number...`
      }
    }
    console.warn(msg.error.reason);
    const response = JSON.stringify(msg)
    return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
  }
  if(!Object.keys(key).includes(roundNumber)){
    msg = {
      error: {
        code: 404,
        reason: `${roundNumber} is not a valid round number...`
      }
    }
    console.warn(msg.error.reason);
    const response = JSON.stringify(msg)
    return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
  }

  console.log(`Fetching Round ${roundNumber}`);
  const formId = key[roundNumber];
  const form = FormApp.openById(formId);

  if(form.isAcceptingResponses()){
    msg = {
      error: {
        code: 409,
        reason: `Form is still accepting responses`
      }
    }
    console.warn(msg.error.reason);
    const response = JSON.stringify(msg)
    return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
  }

  const roundDetails = {
    number: Number(roundNumber),
    questions: 0,
    totalScore: 0
  }

  const questions = form.getItems()         // first build up some information about the questions
  const questionsToIgnore = []

  questions.forEach((question) => {
    const questionTitle = String(question.getTitle()).toLowerCase()
    const questionType = String(question.getType().name()).toUpperCase()
    if(questionType === "PARAGRAPH_TEXT" && questionTitle.includes("feedback")){
      questionsToIgnore.push(Number(question.getIndex()))
    } else if(questionType === "TEXT"){
      const parsedItem = question.asTextItem();
      const possiblePoints = parsedItem.getPoints();
      if(possiblePoints > 0){
        roundDetails.questions ++;
        roundDetails.totalScore += possiblePoints;
      }
    } else if(questionType === "MULTIPLE_CHOICE"){
      const parsedItem = question.asMultipleChoiceItem();
      const possiblePoints = parsedItem.getPoints();
      if(possiblePoints > 0){
        roundDetails.questions ++;
        roundDetails.totalScore += possiblePoints;
      }
    } else {
      msg = {
        error: {
          code: 400,
          reason: `Form contains answer fields other than TEXT or MULTIPLE CHOICE`
        }
      }
      console.warn(msg.error.reason);
      const response = JSON.stringify(msg)
      return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
    }
  })

  const responses = form.getResponses();      // now build up the responses provided
  const results = {};

  responses.forEach((teamResponse) => {
    const responses = parseTeamResponse(teamResponse, questionsToIgnore);
    const teamName = responses[0].answer.trim()   // the first question always asks for team name
    results[teamName] = {
      answers: [],
      score: 0
    };
    // the remaining questions are quiz questions
    for(let i=1; i<responses.length; i++){
      results[teamName].answers.push({...responses[i]});
      results[teamName].score += responses[i].score;
    }
  })

  const response = {roundDetails, results};

  const stringResponse = JSON.stringify(response);
  console.log(`Sending response for Round ${roundNumber}`);
  return ContentService.createTextOutput(stringResponse).setMimeType(ContentService.MimeType.JSON);
}

function parseTeamResponse(teamResponse, questionsToIgnore) {
  const questionResponses = teamResponse.getGradableItemResponses();
  const results = [];

  questionResponses.forEach((questionResponse) => {
    const questionIndex = Number(questionResponse.getItem().getIndex());
    if(!questionsToIgnore.includes(questionIndex)){
      const response = parseAnswer(questionResponse);
      results[questionIndex] = response;
    }
  })

  return results;
}

function parseAnswer(question) {
  const answerGiven = String(question.getResponse());
  const score = Number(question.getScore());
  const correct = Boolean(score > 0);

  const result = {answer: answerGiven, score, correct};

  return result;
}