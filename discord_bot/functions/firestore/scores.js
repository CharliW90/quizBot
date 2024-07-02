const { firestore, quizDate } = require("../../database");

// currently WIP - not in use

exports.addScoreToFirestoreTeam = async (serverId, roundNum, teamName, userName, score) => {
  if(!serverId || !roundNum || isNaN(roundNum) || !teamName || !userName){
    return {error: {code: 400, loc: "firestore/responses.js", message: `Missing parameters - expected serverId ${serverId}, roundNum (number) ${roundNum} and quizRoundObject ${quizRoundObject}`}, response: null}
  }
  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisUser = thisGuild.collection('Users').doc(userName);
  const thisTeam = thisUser.collection('Teams').doc(teamName);
  const thisQuiz = thisTeam.collection('Quizzes').doc(quiz.code);

  let thisGuildRecord = await thisGuild.get();
  if(!thisGuildRecord.exists){
    return {error: {code: 404, loc: "firestore/scores.js", message: `No firestore document for ${serverId}`}, response: null};
  }
  
  const thisUserRecord = await thisUser.get();
  if(!thisUserRecord.exists){
    return {error: {code: 404, loc: "firestore/scores.js", message: `No firestore document for ${userName} on ${serverId}`}, response: null};
  }

  let thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists){
    await thisTeam.set();
    thisTeamRecord = await thisTeam.get();
  }

  let thisQuizRecord = await thisQuiz.get();
  if(!thisQuizRecord.exists){
    await thisQuiz.set({});
    thisQuizRecord = await thisQuiz.get();
  }

  const currentScores = await thisQuizRecord.data();
    let total = score;
    for(round in currentScores){
      total += round;
    }
    currentScores[roundNum] = score;
    currentScores.total = total;
    const write = thisQuizRecord.set(currentScores);
    return {error: null, response: write}
}