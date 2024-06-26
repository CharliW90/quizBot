const { firestore, quizDate } = require("../../database");

exports.addScoreToFirestoreTeam = async (serverId, roundNum, teamName, score) => {
  if(!serverId || !roundNum || isNaN(roundNum) || !teamName){
    return {error: {code: 400, loc: "firestore/responses.js", message: `Missing parameters - expected serverId ${serverId}, roundNum (number) ${roundNum} and quizRoundObject ${quizRoundObject}`}, response: null}
  }
  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Teams').doc(teamName);
}