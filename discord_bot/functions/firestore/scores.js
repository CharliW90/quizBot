const { firestore, quizDate } = require("../../database");

// currently WIP - not in use

exports.addScoreToFirestoreTeam = async (serverId, roundNum, teamName, userName, score) => {
  if(!serverId || !roundNum || isNaN(roundNum) || !teamName || !userName || !score){
    return {error: {code: 400, loc: "firestore/responses/addScoreToFirestoreTeam", message: `Missing parameters - expected serverId, roundNum (number), teamName, userName, and score`}, response: null}
  }

  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisUser = thisGuild.collection('Users').doc(userName);
  const thisQuiz = thisUser.collection('Quizzes').doc(quiz.code);

  let thisGuildRecord = await thisGuild.get();
  if(!thisGuildRecord.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }
  
  const thisUserRecord = await thisUser.get();
  if(!thisUserRecord.exists){
    return {error: {code: 404, message: `No firestore document for ${userName} on ${serverId}`}, response: null};
  }

  let thisQuizRecord = await thisQuiz.get();
  if(!thisQuizRecord.exists){
    await thisQuiz.set({total: 0, scores: {}});
    thisQuizRecord = await thisQuiz.get();
  }

  const data = await thisQuizRecord.data();

  data.scores[roundNum] = {teamName, score};
  data.total += score;

  const write = thisQuizRecord.set(data);
  return {error: null, response: write}
}