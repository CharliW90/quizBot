const { EmbedBuilder } = require("discord.js")
const { getResponseFromFirestore } = require("../firestore")

module.exports = async (serverId, rounds, session = null) => {
  if(!serverId || !rounds){
    console.error("ERR")
    return {error: {code: 400, loc: "quiz/scoreboardGenerator", message: `Missing parameters - expected serverId and rounds`}, response: null}
  }

  const roundsScores = []
  for(const round of rounds){
    roundsScores.push(getResponseFromFirestore(serverId, round.split(' ')[1], session))
  }

  return Promise.all(roundsScores)
  .then((results) => {
    const scoreboard = new Map()
    results.forEach((round) => {
      if(round.error){
        return {error: round.error, response: null}
      }
      const currentRound = round.response.current;
      currentRound.embeds.forEach((embed) => {
        const teamName = embed.title;
        if(!scoreboard.has(teamName)){
          scoreboard.set(teamName, {scores: [], total: 0, totalPossible: 0})
        }
        let {scores, total, totalPossible} = scoreboard.get(teamName);

        const totalScore = embed.fields.filter((field) => {return field.name === "Total Score"}).map(field => field.value)[0];
        scores.push(totalScore);

        const scoreNums = totalScore.split(' / ');
        const scored = Number(scoreNums[0])
        const possible = Number(scoreNums[1])
        total += scored;
        totalPossible += possible;

        scoreboard.set(teamName, {scores, total, totalPossible});
      })
    })

    const uniqueScores = new Set(Array.from(scoreboard.values(), (team) => team.total).sort((a, b) => b-a))
    const leaderboard = new Map()

    uniqueScores.forEach((score) => {
      const teams = [];
      for(const [name, value] of scoreboard.entries()){
        if(value.total === score){
          teams.push(name)
        }
      }
      leaderboard.set(score, teams)
    })

    const report = new EmbedBuilder()
      .setColor('e511c7')
      .setTitle(`Scoreboard :tada:`)
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})

    let count = 1;

    leaderboard.forEach((teams, score) => {
      const position = addOrdinals(count);
      let message = "In "
      if(teams.length > 1){
        message += "joint "
      }
      message += `${position} place, with ${score} points:\n${teams.join('\n')}`
      count += teams.length;
      const output = teams.map((name) => {
        const team = scoreboard.get(name);
        const scoring = team.scores.map((score, i) => {return `${i+1}) ${score.split(' / ')[0]}`})
        return `${name}:\n${team.total} / ${team.totalPossible}\n${scoring.join(', ')}\n`
      })
      report.addFields({name: message, value: output.join('\n')})
    })
    
    return {error: null, response: report}
  })
}

const plurals = new Intl.PluralRules("en-US", {type: "ordinal"});
const suffixes = new Map([
  ["one", "st"],
  ["two", "nd"],
  ["few", "rd"],
  ["other", "th"],
]);

const addOrdinals = (n) => {
  const rule = plurals.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`
}