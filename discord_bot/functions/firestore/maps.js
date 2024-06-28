const { firestore, quizDate } = require("../../database");

exports.setTeamsAliases = async (serverId, team, alias) => {
  if(!serverId || !team || !alias){
    const error = {code: 400, loc: "firestore/maps.js", message: `serverId was ${serverId}, team was ${team}, alias was ${alias}`};
    return {error, response: null};
  }
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsAliases = thisQuiz.collection('Maps').doc('Teams Aliases');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({ended: false});
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz} has ended - no further updates allowed`}, response: null}
    }
  }

  let teamsAliasesRecord = await teamsAliases.get();
  if(!teamsAliasesRecord.exists) {
    await teamsAliases.set({});
    teamsAliasesRecord = await teamsAliases.get();
  }

  await teamsAliases.update(alias, team);
  return {error: null, response: `${alias}<?>${team}`};
}

exports.getTeamsAliases = async (serverId, session = null) => {
  const quiz = session ?? quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsAliases = thisQuiz.collection('Maps').doc('Teams Aliases');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const teamsAliasesRecord = await teamsAliases.get();
  if(!teamsAliasesRecord.exists) {
    return {error: {code: 404, message: `No team-aliases map recorded yet for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const response = await teamsAliasesRecord.data();
  return {error: null, response};
}

exports.deleteTeamsAliases = async (serverId, registration) => {
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsAliases = thisQuiz.collection('Maps').doc('Teams Aliases');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz} has ended - no further updates allowed`}, response: null}
    }
  }

  const teamsAliasesRecord = await teamsAliases.get();
  if(!teamsAliasesRecord.exists) {
    return {error: {code: 404, message: `No team-aliases map recorded yet for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const data = await teamsAliasesRecord.data();

  await registration.forEach(key => delete data[key]);

  await teamsAliases.set(data);

  return {error: null, response: registration.join(', ')};
}

exports.lookupAlias = async (serverId, alias, session = null) => {
  const {error, response} = await this.getTeamsAliases(serverId, session);
  
  if(error){
    return {error, response: null}
  };

  const team = response[alias];

  if(team){
    return {error: null, response: team}
  } else {
    return {error: {message: "not an alias", code: 404}, response: null}
  }
}

exports.setTeamsMembers = async (serverId, team, members) => {
  if(!serverId || !team || !members){
    const error = {code: 400, loc: "firestore/maps.js", message: `serverId was ${serverId}, team was ${team}, members was ${members}`};
    return {error, response: null};
  }
  if(members.constructor.name !== 'Array' || members.length < 1){
    const error = {code: 400, loc: "firestore/maps.js", message: `members ${typeof(members)} was ${members} - expected array with at least one member`};
    return {error, response: null};
  }
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsMembers = thisQuiz.collection('Maps').doc('Teams Members');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    await thisGuild.set({});
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    await thisQuiz.set({ended: false});
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz} has ended - no further updates allowed`}, response: null}
    }
  }

  let teamsMembersRecord = await teamsMembers.get();
  if(!teamsMembersRecord.exists) {
    await teamsMembers.set({});
    teamsMembersRecord = await teamsMembers.get();
  }
  const data = [];
  members.forEach(member => data.push(member.user.id, team));
  await teamsMembers.update(...data);
  return {error: null, response: `${team}<=>${members}`};
}

exports.getTeamsMembers = async (serverId, session = null) => {
  const quiz = session ?? quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsMembers = thisQuiz.collection('Maps').doc('Teams Members');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const teamsMembersRecord = await teamsMembers.get();
  if(!teamsMembersRecord.exists) {
    return {error: {code: 404, message: `No teams-members map recorded yet for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const response = await teamsMembersRecord.data();
  return {error: null, response};
}

exports.deleteTeamsMembers = async (serverId, registration) => {
  const quiz = quizDate();

  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const teamsMembers = thisQuiz.collection('Maps').doc('Teams Members');

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz} has ended - no further updates allowed`}, response: null}
    }
  }

  const teamsMembersRecord = await teamsMembers.get();
  if(!teamsMembersRecord.exists) {
    return {error: {code: 404, message: `No teams-members map recorded yet for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const data = await teamsMembersRecord.data();

  await registration.forEach(key => delete data[key]);

  await teamsMembers.set(data);

  return {error: null, response: registration.join(', ')};
}

exports.checkMembers = async (serverId, members) => {
  const {error, response} = await this.getTeamsMembers(serverId);
  if(error){
    return {error, response: null}
  }

  const results = await members.map((member) => {return {user: member, team: response[member.user.id]}});

  if(results.length > 0){
    return {error: null, response: results};
  } else {
    const memberNames = members.map((member) => member.user.globalName)
    return {error: {message: `No teams found for ${members.map(member => member.user.name).join(', ')}`, code: 404}, response: null}
  }

}

exports.reset = async (serverId, blame) => {
  if(!serverId){
    const error = {code: 400, loc: "firestore/maps.js", message: `serverId was ${serverId}`};
    return {error, response: null};
  };

  const quiz = quizDate();
  const thisGuild = firestore.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);
  const thisTeams = thisQuiz.collection('Teams')
  const thisAliases = thisQuiz.collection('Maps').doc('Teams Aliases');
  const thisMembers = thisQuiz.collection('Maps').doc('Teams Members');
  
  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId}`}, response: null};
  };
    
  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  } else {
    const check = await thisQuizStore.data();
    if(check.ended){
      return {error: {code: 403, message: `The quiz for ${quiz} has ended - reset is not allowed`}, response: null}
    }
  }
      
  console.warn(`${quiz}: Firestore reset called on Server: ${serverId} by ${blame}`)
  
  const deletions = {mappings: [], teams: []}
  
  const teams = await thisTeams.get();
  const teamDocs = []
  teams.forEach(doc => teamDocs.push(doc.id))
  for(const doc of teamDocs){
    const deletion = await thisTeams.doc(doc).delete();
    deletions.teams.push(deletion)
  }
  
  const storedAliases = await thisAliases.get();
  if(storedAliases.exists){
    const store = await storedAliases.data();
    await thisAliases.delete();
    const deleted = Object.keys(store)
    deletions.mappings.push(...deleted)
  }

  const storedMembers = await thisMembers.get();
  if(storedMembers.exists){
    const store = await storedMembers.data();
    await thisMembers.delete();
    const deleted = Object.keys(store)
    deletions.mappings.push(...deleted)
  }
  return {error: null, response: deletions};
}