const { EmbedBuilder } = require("discord.js");

exports.parse = (data) => {
  if(!data) {
    const error = {message: `forms API data is ${data}`, code: 404, loc: "parseFormdatas.js/parse()"};
    return {error, response: null};
  }

  if(!data.roundDetails && !data.results) {
    const details = {...data, loc: "parseFormdatas.js/parse()"};
    const error = {message: `forms API data malformed`, code: 400, details};
    return {error, response: null}
  } 

  if(!data.roundDetails || typeof(data.roundDetails) !== "object") {
    const error = {message: `forms API data roundDetails were ${JSON.stringify(data.roundDetails)}`, code: 400, loc: "parseFormdatas.js/parse()"};
    return {error, response: null};
  } 
  
  if(!data.results || typeof(data.results) !== "object") {
    const error = {message: `forms API data results were ${JSON.stringify(data.results)}`, code: 400, loc: "parseFormdatas.js/parse()"};
    return {error, response: null};
  }

  const {roundDetails, results} = data;
  const teams = Object.keys(results);
  
  if(teams.length < 1) {
    const error = {message: `forms API data results ${JSON.stringify(data.results)} does not contain any teams`, code: 404, loc: "parseFormdatas.js/parse()"};
    return {error, response: null};
  }
  
  const embedMessages = [];

  teams.forEach((teamname) => {
    const teamEmbed = new EmbedBuilder()
      .setColor('e511c7')
      .setTitle(teamname)
      .setAuthor({name: `Virtual Quizzes - Round Number ${roundDetails.number}`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setImage('https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png')
      .addFields({name: "Total Score", value: `${results[teamname].score} / ${roundDetails.totalScore}`})

    const emoji = determineEmoji(Number(results[teamname].score / roundDetails.totalScore));
    teamEmbed.setThumbnail(emoji);

    const answers = results[teamname].answers;  // an array of datas in the format "{ answerGiven: <string>, answerScore: <number>, correctAnswer: <boolean> }"
    answers.forEach((answer, number) => {
      const checkmark = answer.correct ? ":white_check_mark:" : ":x:";
      teamEmbed.addFields({
        name: `Question ${number+1}`,
        value: `${answer.answer} ${checkmark}`
      })
    })

    embedMessages.push(teamEmbed);
  })
  return {error: null, response: {roundNum: roundDetails.number, teams, embedMessages}};
}

const determineEmoji = (percent) => {
  if(percent = 1){
    return "https://cdn.discordapp.com/attachments/1250390976829067268/1250467682663272601/top.png"
  } else if(percent >= 0.75) {
    return "https://cdn.discordapp.com/attachments/1250390976829067268/1250467682986496192/first.png"
  } else if(percent >= 0.5) {
    return "https://cdn.discordapp.com/attachments/1250390976829067268/1250467683288223864/second.png"
  } else if(percent >= 0.25) {
    return "https://cdn.discordapp.com/attachments/633268964662968320/1250470326694055957/third.png"
  } else {
    return "https://cdn.discordapp.com/attachments/1250390976829067268/1250467506779586660/poop.png"
  }
}