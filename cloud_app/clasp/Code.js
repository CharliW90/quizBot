const key = JSON.parse(PropertiesService.getScriptProperties().getProperty("forms"))
const quizBotUrl = PropertiesService.getScriptProperties().getProperty("quizBot")
const apiKey = PropertiesService.getScriptProperties().getProperty("apiKey")

function doGet(e) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Password': e.parameter.passkey,
  }
  const options = {
    'method': 'get',
    'headers': headers,
    'muteHttpExceptions': true
  }

  const err = {
    "error": {}
  }

  const passcheck = UrlFetchApp.fetch(`${quizBotUrl}/api/passcheck`, options);

  if(passcheck.getResponseCode() === 200 && passcheck.toString() === e.parameter.passkey){
    const roundNumber = e.parameter.formId
    if(!isNaN(roundNumber)){
      if(Object.keys(key).includes(roundNumber)){     // roundNumber matches a known form ID
        const formId = key[roundNumber];

        const form = FormApp.openById(formId);

        if(!form.isAcceptingResponses()){             // form is closed to responses, safe to proceed with handling scores
          const roundDetails = {
            number: Number(roundNumber),
            questions: 0,
            totalScore: 0
          }

          const questions = form.getItems()         // first build up some information about the questions

          questions.forEach((question) => {
            if(question.getType().name() === "TEXT"){
              const parsedItem = question.asTextItem();
              const possiblePoints = parsedItem.getPoints();
              if(possiblePoints > 0){
                roundDetails.questions ++;
                roundDetails.totalScore += possiblePoints;
              }
            } else if(question.getType().name() === "MULTIPLE_CHOICE"){
              const parsedItem = question.asMultipleChoiceItem();
              const possiblePoints = parsedItem.getPoints();
              if(possiblePoints > 0){
                roundDetails.questions ++;
                roundDetails.totalScore += possiblePoints;
              }
            }
          })

          const responses = form.getResponses();      // now build up the responses provided
          const results = {};

          responses.forEach((teamResponse) => {
            const responses = parseTeamResponse(teamResponse);
            const teamName = responses[0].answer   // the first question always asks for team name
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

          const response = {roundDetails, results}

          const stringResponse = JSON.stringify(response)
          return ContentService.createTextOutput(stringResponse).setMimeType(ContentService.MimeType.JSON);
        } else {
          console.warn(`Form is still accepting responses - refusing results...`);
          err.error = {
            "code": 409,
            "reason": `Form is still accepting responses`
          }
        }
      } else {
        console.warn(`${roundNumber} is not a valid round number...`);
        err.error = {
          "code": 404,
          "reason": `${roundNumber} is not a valid round number...`
        }
      }
    } else {
      console.warn(`${roundNumber} is not a number...`);
        err.error = {
          "code": 400,
          "reason": `${roundNumber} is not a number...`
        }
    }
  } else {
    console.error(`${quizBotUrl} passcheck response code: ${passcheck.getResponseCode()}, ${passcheck.toString()}`)
    err.error = {
      "code": 403,
      "reason": "password incorrect"
    }
  }
  const response = JSON.stringify(err)
  return ContentService.createTextOutput(response).setMimeType(ContentService.MimeType.JSON);
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
  const score = Number(question.getScore());
  const correct = Boolean(score > 0);

  const result = {questionIndex, answer: {answer: answerGiven, score, correct}};

  return result;
}