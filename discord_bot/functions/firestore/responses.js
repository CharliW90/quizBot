const { firestore, quizDate } = require("../../database");

exports.addResponseToFirestore = async (serverId, roundNum, quizRoundObject) => {
  if(!serverId || !roundNum || isNaN(roundNum) || !quizRoundObject){
    return {error: {code: 400, loc: "firestore/responses/addResponseToFirestore", message: `Missing parameters - expected serverId, roundNum (number) and quizRoundObject`}, response: null}
  }
  
  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);
  const thisRound = thisQuiz.collection('Rounds').doc(round);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({date: quiz.name, ended: false});
  }

  let thisRoundScores = await thisRound.get();
  if(!thisRoundScores.exists) {
    await thisRound.set({});
    thisRoundScores = await thisRound.get();
  }
  
  const existingScores = await thisRoundScores.data();
  const {history, current} = existingScores;
  if(history){
    history.unshift(current);
    const write = await thisRound.set({current: JSON.parse(JSON.stringify(quizRoundObject)), history});
    return {error: null, response: write}
  } else if(current){
    const write = await thisRound.set({current: JSON.parse(JSON.stringify(quizRoundObject)), history: [current]});
    return {error: null, response: write}
  } else {
    const write = await thisRound.set({current: JSON.parse(JSON.stringify(quizRoundObject))});
    return {error: null, response: write}
  }
}

exports.getResponseFromFirestore = async (serverId, roundNum, session = null) => {
  if(!serverId || !roundNum || isNaN(roundNum)){
    return {error: {code: 400, loc: "firestore/responses/addResponseToFirestore", message: `Missing parameters - expected serverId and roundNum (number)`}, response: null}
  }

  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);
  const thisRound = thisQuiz.collection('Rounds').doc(round);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const thisRoundScores = await thisRound.get();
  if(!thisRoundScores.exists) {
    return {error: {code: 404, message: `No firestore document for ${round}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const scoresData = await thisRoundScores.data();
  if(!scoresData.current){
    return {error: {code: 404, message: `Document does not contain data for ${round}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  return {error: null, response: scoresData}
}

exports.checkHistory = async (serverId, roundNum, session = null) => {
  if(!serverId || !roundNum || isNaN(roundNum)){
    return {error: {code: 400, loc: "firestore/responses/checkHistory", message: `Missing parameters - expected serverId and roundNum (number)`}, response: null}
  }

  const {error, response} = await this.getFromFirestore(serverId, roundNum, session);

  if(error){
    return {error, response: null}
  }

  const {current, history} = response;
  if(!history){
    return {error: {code: 404, message: `Document does not contain history for ${round}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const count = history.length();
  const latest = history.shift();
  return {error: null, response: {count, latest, history, deleted: current}}
}

exports.revertHistory = async (serverId, roundNum, session = null) => {
  if(!serverId || !roundNum || isNaN(roundNum)){
    return {error: {code: 400, loc: "firestore/responses/revertHistory", message: `Missing parameters - expected serverId, and roundNum (number)`}, response: null}
  }

  const {error, response} = await this.checkHistory(serverId, roundNum, session);

  if(error){
    return {error, response: null}
  }

  await thisRound.set({current: response.latest, history: response.history});
  return {error: null, response: {loc: "firestore/responses.js", message: `Reverted to version ${response.count}`, data: response.latest}}
}

exports.indexRounds = async (serverId, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/responses/indexRounds", message: `Missing parameters - expected serverId`}, response: null}
  }

  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);
  const thisDocs = await thisQuiz.collection('Rounds').get();

  const rounds = [];
  thisDocs.forEach(doc => {
    rounds.push(doc.id)
  })

  return {error: null, response: rounds}
}