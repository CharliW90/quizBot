const { firestore, quizDate } = require("../../database");

exports.addScoreboardToFirestore = async (serverId, scoreboard) => {
  if(!serverId || !quizRoundObject){
    return {error: {code: 400, loc: "firestore/scoreboard.js", message: `Missing parameters - expected serverId and scoreBoard object`}, response: null}
  }
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/scoreboard.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, loc: "firestore/scoreboard.js", message: `No firestore document for a Quiz Session on ${quiz.name} for ${serverId}`}, response: null};
  }

  const write = await thisQuizStore.update('scoreboard', scoreboard);

  return {error: null, response: write};
}

exports.getScoreboardFromFirestore = async (serverId, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/scoreboard.js", message: `Missing parameters - expected serverId`}, response: null}
  }
  if(session && (!session.code  || !session.name)){
    return {error: {code: 400, loc: "firestore/quiz.js", message: `Error in parameters - when session is used it must include both code and name properties:\n${session}`}, response: null};
  }

  const quiz = session ?? quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/scoreboard.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, loc: "firestore/scoreboard.js", message: `No firestore document for a Quiz Session on ${quiz.name} for ${serverId}`}, response: null};
  }

  const thisSession = await thisQuizStore.data();

  return {error: null, response: thisSession.scoreboard};
}
