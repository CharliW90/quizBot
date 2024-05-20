const { EmbedBuilder } = require("discord.js");
const { hold } = require("./holdFormResponses");

exports.parse = (response, isHeld = false) => {
  if(!response) {
    return [{"message": `forms API response is ${response}`, "code": 404}, null]
  }

  if(!response.roundDetails && !response.results) {
    const details = {...response}
    return [{"message": `forms API response malformed`, "code": 400, details}, null];
  } 

  if(!response.roundDetails || typeof(response.roundDetails) !== "object") {
    return [{"message": `forms API response roundDetails were ${JSON.stringify(response.roundDetails)}`, "code": 400}, null];
  } 
  
  if(!response.results || typeof(response.results) !== "object") {
    return [{"message": `forms API response results were ${JSON.stringify(response.results)}`, "code": 400}, null];
  }

  const {roundDetails, results} = response;
  const teams = Object.keys(results);
  
  if(teams.length < 1) {
    return [{"message": `forms API response results ${JSON.stringify(response.results)} does not contain any teams`, "code": 404}, null];
  }
  
  const embedMessages = [];

  teams.forEach((teamname) => {
    const teamEmbed = new EmbedBuilder()
      .setColor('Fuchsia')
      .setTitle(teamname)
      .setAuthor({name: `Virtual Quizzes - Round Number ${roundDetails.number}`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setImage('https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png')
      .addFields({name: "Total Score", value: `${results[teamname].score} / ${roundDetails.totalScore}`})

    const emoji = determineEmoji(Number(results[teamname].score / roundDetails.totalScore));

    teamEmbed.setThumbnail(emoji)
    const answers = results[teamname].answers;  // an array of responses in the format "{ answerGiven: <string>, answerScore: <number>, correctAnswer: <boolean> }"
    answers.forEach((answer, number) => {
      const checkmark = answer.correct ? ":white_check_mark:" : ":x:";
      teamEmbed.addFields({
        name: `Question ${number+1}`,
        value: `${answer.answer} ${checkmark}`
      })
    })
    embedMessages.push(teamEmbed);
  })
  if(isHeld){
    const output = hold(roundDetails.number, embedMessages, teams);
    const [err, res] = output
    return err ? [err, null] : [null, res]
  }
  return [null, embedMessages];
}

const determineEmoji = (percent) => {
  const base = 'https://cdn.discordapp.com/attachments/633012685902053397/1239615740919808000'
  if(percent = 1){
    return `https://discord.com/assets/6a4c929e8ed005e20d14.svg`
  } else if(percent >= 0.75) {
    return `https://discord.com/assets/0eefd3bb4579ab4794a1.svg`
  } else if(percent >= 0.5) {
    return `https://discord.com/assets/a1e33ef9c7ca6f453015.svg`
  } else if(percent >= 0.25) {
    return `https://discord.com/assets/1cd66500a74ac81cb169.svg`
  } else {
    return `${base}/poop.png`
  }
}