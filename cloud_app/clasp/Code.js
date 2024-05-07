const key = JSON.parse(PropertiesService.getScriptProperties().getProperty("forms"))
const quizBotUrl = PropertiesService.getScriptProperties().getProperty("quizBot")

function doGet(e) {
  const passcheck = UrlFetchApp.fetch(`${quizBotUrl}/api/passcheck?password=${e.parameter.passKey}`, {'muteHttpExceptions': true});
  if(passcheck.getResponseCode() === 200 && passcheck.toString() === e.parameter.passKey){
    const roundNumber = e.parameter.formId
    const formId = key[roundNumber]

    const form = FormApp.openById(formId);
    const responses = form.getResponses();

    const results = [];

    responses.forEach((teamResponse) => {
      const responses = parseTeamResponse(teamResponse);

      const teamResult = {
        teamName: responses[0].answerGiven,
        answers: [],
        score: 0
      };

      for(let i=1; i<responses.length; i++){
        teamResult.answers.push(responses[i]);
        teamResult.score += responses[i].answerScore;
      }
      console.log(teamResult)
      results.push(teamResult)
    })
    console.log(results)
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
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