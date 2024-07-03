const { firestore, quizDate } = require("../../database");

exports.addScoreboardToFirestore = async (serverId, scoreboardObject) => {
  if(!serverId || !scoreboardObject){
    return {error: {code: 400, loc: "firestore/scoreboard/addScoreboardToFirestore", message: `Missing parameters - expected serverId and scoreboard object`}, response: null}
  }

  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz.code} for ${serverId}`}, response: null};
  }

  const thisSession = await thisQuizStore.data();
  if(thisSession.ended){
    return {error: {code: 403, message: `The quiz for ${quiz.code} has ended - no further updates allowed`}, response: null};
  }

  const {scoreboard} = thisSession;
  const {history, current} = scoreboard;
  if(history){
    history.unshift(current);
    const write = await thisQuiz.update('scoreboard', {current: JSON.parse(JSON.stringify(scoreboardObject)), history});
    return {error: null, response: write}
  } else if(current){
    const write = await thisQuiz.update('scoreboard', {current: JSON.parse(JSON.stringify(scoreboardObject)), history: [current]});
    return {error: null, response: write}
  } else {
    const write = await thisQuiz.update('scoreboard', {current: JSON.parse(JSON.stringify(scoreboardObject))});
    return {error: null, response: write}
  }
}

exports.getScoreboardFromFirestore = async (serverId, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/scoreboard/getScoreboardFromFirestore", message: `Missing parameters - expected serverId`}, response: null}
  }

  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const thisSession = await thisQuizStore.data();

  const {scoreboard} = thisSession;
  if(!scoreboard){
    return {error: {code: 400, message: `No scoreboard reference for the Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  return {error: null, response: scoreboard.current};
}
