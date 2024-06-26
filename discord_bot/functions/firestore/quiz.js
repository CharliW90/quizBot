const { firestore, quizDate } = require("../../database");

exports.recordTeam = async (serverId, data, session = null) => {
  if(!serverId || !data){
    return {error: {code: 400, loc: "firestore/quiz.js", message: `Missing parameters - expected serverId and data`}, response: null};
  }
  const {teamName, captain, members, settledColour, channels, roles} = data;
  if(!teamName || !captain || !members || !settledColour || !channels || !roles){
    return {error: {code: 400, loc: "firestore/quiz.js", message: `Missing data - expected teamName, captain, members, settledColour, channels and roles`}, response: null};
  }

  data.rounds = [];
  data.score = 0;
    
  const quiz = session ?? quizDate();
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({});
  }

  let thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    await thisTeam.set({});
    thisTeamRecord = await thisTeam.get();
  }

  const write = await thisTeam.set(JSON.parse(JSON.stringify(data)));

  return {error: null, response: write};
}

exports.getTeam = async (serverId, teamName, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/quiz.js", message: `Missing parameters - expected serverId`}, response: null};
  }

  const quiz = session ?? quizDate();
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${teamName}, ${quiz} for ${serverId}`}, response: null};
  }

  const team = thisTeamRecord.data();

  return {error: null, response: team}
}

exports.deleteTeam = async (serverId, teamName, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/quiz.js", message: `Missing parameters - expected serverId`}, response: null};
  }

  const quiz = session ?? quizDate();
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${teamName}, ${quiz} for ${serverId}`}, response: null};
  }

  const deletion = await thisTeam.delete();

  return {error: null, response: deletion}
}

exports.indexQuizzes = async (serverId) => {
  const thisGuild = firestore.collection('Servers').doc(serverId);
  
  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisDocs = await thisGuild.collection('Quizzes').get();

  const quizzes = [];
  thisDocs.forEach(doc => {
    quizzes.push(doc.id)
  })

  return {error: null, response: quizzes}
}

exports.indexTeams = async (serverId, session = null) => {
  const quiz = session ?? quizDate();
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  
  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists){
    return {error: {code: 404, loc: "firestore/quiz.js", message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const thisDocs = await thisQuiz.collection('Teams').get();

  const teams = [];
  thisDocs.forEach(doc => {
    teams.push(doc.id)
  })

  return {error: null, response: teams}
}

