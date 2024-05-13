const key = JSON.parse(PropertiesService.getScriptProperties().getProperty("forms"))
const quizBotUrl = PropertiesService.getScriptProperties().getProperty("quizBot")
const apiKey = PropertiesService.getScriptProperties().getProperty("apiKey")

function doGet(e) {
  console.log(e)
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Password': e.parameter.passkey,
  }
  const options = {
    'method': 'get',
    'headers': headers,
    'muteHttpExceptions': true
  }
  const passcheck = UrlFetchApp.fetch(`${quizBotUrl}/api/passcheck`, options);
  console.log(passcheck)
  if(passcheck.getResponseCode() === 200 && passcheck.toString() === e.parameter.passkey){
    const roundNumber = e.parameter.formId
    if(roundNumber === "all"){
      console.warn("All Forms requested...")
      const response = "this is a work in progress"
      return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
    } else {
      const formId = key[roundNumber]

      const form = FormApp.openById(formId);
      const responses = form.getResponses();

      const results = {};

      responses.forEach((teamResponse) => {
        const responses = parseTeamResponse(teamResponse);
        const teamName = responses[0].answerGiven
        results[teamName] = {
          answers: [],
          score: 0
        };

        for(let i=1; i<responses.length; i++){
          results[teamName].answers.push({...responses[i]});
          results[teamName].score += responses[i].answerScore;
        }
      })
      const response = JSON.stringify(results)
      return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
    }
  } else {
    console.error(`${quizBotUrl} passcheck response code: ${passcheck.getResponseCode()}, ${passcheck.toString()}`)
    const err = {
      "error":
      {
        "code": 403,
        "reason": "password incorrect"
      }
    }
    const response = JSON.stringify(err)
    return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
  }
}

function parseTeamResponse(teamResponse) {
  const questionResponses = teamResponse.getGradableItemResponses();

  const results = [];

  questionResponses.forEach((questionResponse) => {
    const response = parseAnswer(questionResponse);
    results[response.questionIndex] = response.answer;
  })

  return results;
}

function parseAnswer(question) {
  const questionIndex = Number(question.getItem().getIndex());
  const answerGiven = String(question.getResponse());
  const answerScore = Number(question.getScore());
  const correctAnswer = Boolean(answerScore > 0);

  const result = {questionIndex, answer: {answerGiven, answerScore, correctAnswer}};

  return result;
}