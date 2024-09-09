const { firestore, quizDate } = require("../../database");

exports.recordTeam = async (serverId, data) => {
  if(!serverId || !data){
    return {error: {code: 400, loc: "firestore/quiz/recordTeam", message: `Missing parameters - expected serverId and data`}, response: null};
  }
  const {teamName, captain, members, settledColour, channels, roles} = data;
  if(!teamName || !captain || !members || !settledColour || !channels || !roles){
    return {error: {code: 400, loc: "firestore/quiz/recordTeam", message: `Missing data - expected teamName, captain, members, settledColour, channels and roles`}, response: null};
  }

  data.rounds = [];
  data.score = 0;
    
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({date: quiz.name, scoreboard: {}, ended: false});
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz.code} has ended - no further updates allowed`}, response: null};
    }
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
  if(!serverId || !teamName){
    return {error: {code: 400, loc: "firestore/quiz/getTeam", message: `Missing parameters - expected serverId and team`}, response: null};
  }

  const quiz = quizDate();
  
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    return {error: {code: 404, message: `No firestore document for ${teamName}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const team = thisTeamRecord.data();

  return {error: null, response: team}
}

exports.deleteTeam = async (serverId, teamName, session = null) => {
  if(!serverId || !teamName){
    return {error: {code: 400, loc: "firestore/quiz/deleteTeam", message: `Missing parameters - expected serverId and teamName`}, response: null};
  }

  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const check = await thisQuizStore.data();
  if(check.ended){
    return {error: {code: 403, message: `The quiz for ${quiz.code} has ended - no further updates allowed`}, response: null};
  }

  const thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    return {error: {code: 404, message: `No firestore document for ${teamName}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const deletion = await thisTeam.delete();

  return {error: null, response: deletion}
}

exports.updateTeam = async (serverId, data) => {
  if(!serverId || !data){
    return {error: {code: 400, loc: "firestore/quiz/recordTeam", message: `Missing parameters - expected serverId and data`}, response: null};
  }
  const {teamName, captain, members, settledColour, channels, roles} = data;
  if(!teamName || !captain || !members || !settledColour || !channels || !roles){
    return {error: {code: 400, loc: "firestore/quiz/recordTeam", message: `Missing data - expected teamName, captain, members, settledColour, channels and roles`}, response: null};
  }

  data.rounds = [];
  data.score = 0;
    
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);
  const thisTeam = thisQuiz.collection('Teams').doc(teamName.toLowerCase());

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({date: quiz.name, scoreboard: {}, ended: false});
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz.code} has ended - no further updates allowed`}, response: null};
    }
  }

  let thisTeamRecord = await thisTeam.get();
  if(!thisTeamRecord.exists) {
    return {error: {code: 404, message: `No firestore document for ${teamName}, ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const write = await thisTeam.update({...JSON.parse(JSON.stringify(data))});

  return {error: null, response: write};
}

exports.indexQuizzes = async (serverId) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/quiz/indexQuizzes", message: `Missing parameters - expected serverId`}, response: null};
  }
  const thisGuild = firestore.collection('Servers').doc(serverId);
  
  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisDocs = await thisGuild.collection('Quizzes').get();

  const quizzes = [];
  thisDocs.forEach(doc => {
    const data = doc.data();
    quizzes.push({date: {code: doc.id, name: data.date}, ended: data.ended})
  })

  return {error: null, response: quizzes}
}

exports.indexTeams = async (serverId, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/quiz/indexTeams", message: `Missing parameters - expected serverId`}, response: null};
  }

  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);
  
  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists){
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const thisDocs = await thisQuiz.collection('Teams').get();

  const teams = [];
  thisDocs.forEach(doc => {
    teams.push(doc.id)
  })

  return {error: null, response: teams}
}

exports.endQuiz = async (serverId, session = null) => {
  if(!serverId){
    return {error: {code: 400, loc: "firestore/quiz/endQuiz", message: `Missing parameters - expected serverId`}, response: null};
  }
    
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists){
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId}`}, response: null};
  }

  const quizSession = await thisQuizStore.data();

  if(quizSession.ended){
    return {error: {code: 400, message: `Cannot end Quiz Session ${session ?? quiz.code} for ${serverId} as it is already ended`}, response: null};
  }

  if(!quizSession.scoreboard){
    return {error: {code: 500, message: `Quiz Session ${session ?? quiz.code} for ${serverId} does not have a scoreboard field.`}, response: null};
  }

  if(!quizSession.scoreboard.current){
    return {error: {code: 400, message: `Cannot end Quiz Session ${session ?? quiz.code} for ${serverId} as it has not generated a scoreboard.`}, response: null};
  }

  const write = await thisQuiz.update({ended: true})

  return {error: null, response: {write, date: quizSession.date}};
}