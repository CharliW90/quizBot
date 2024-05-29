const { RoleSelectMenuInteraction } = require("discord.js");

const teamsMembers = new Map();
const membersTeams = new Map();

exports.registerTeamMembers = (teamName, members) => {
  console.log("registering in map");
  if(!teamName || !members || members.length < 1){
    const error = {"code": 400, "message": `Team Name was ${teamName}, Members were ${members}`};
    return {error, response: null};
  }
  if(teamsMembers.has(teamName)){
    const error = {"code": 400, "message": `${teamName} already has members`};
    return {error, response: null};
  }
  const memberErrors = []
  members.forEach((member) => {
    if(membersTeams.has(member.user.id)){
      memberErrors.push(`${member.user.globalName} already belongs to Team ${membersTeams.get(member.user.id)}`);
    }
  })
  if(memberErrors.length > 0){
    const error = {"code": 400, "message": memberErrors.join('\n')};
    return {error, response: null};
  }

  teamsMembers.set(teamName, members.map((member) => {return {name: member.user.globalName, id: member.user.id}}))
  
  members.forEach((member) => {
    membersTeams.set(member.user.id, {user: member.user.globalName, team: teamName})
  })
  return {error: null, response: `${teamName}<=>${members}`}
}

exports.checkMembers = (members) => {
  const results = []
  members.forEach((member) => {
    if(membersTeams.has(member.id)){
      results.push(membersTeams.get(member.id))
    }
  })
  
  if(results.length > 0){
    return {error: null, response: results};
  } else {
    const memberNames = members.map((member) => member.user.globalName)
    return {error: {message: `No teams found for ${memberNames.join(', ')}`, code: 404}, response: null}
  }
}

exports.deleteTeamMembers = (teamName) => {
  if(!teamName){
    const error = {"code": 400, "message": `Team Name was ${teamName}`};
    return {error, response: null};
  }

  if(!teamsMembers.has(teamName)){
    const error = {"code": 404, "message": `${teamName} not found`};
    return {error, response: null};
  }

  const members = teamsMembers.get(teamName);
  const deletedMembers = []

  members.forEach((member) => {
    try{
      membersTeams.delete(member.id);
      deletedMembers.push(member.name);
    } catch(e) {
      console.error(e);
    }
  });

  teamsMembers.delete(teamName)

  if(teamsMembers.has(teamName) || Object.keys(membersTeams).some(member => members.includes(member))){
    console.log(teamsMembers.has(teamName), "teamsMembers.has(teamName)")
    console.log(Object.keys(membersTeams).some(member => members.includes(member)), "(membersTeams).some(member => members.includes(member))");
    return {error: {message: "something went wrong deleting team and members from the maps", code: 500}, response: null}
  }

  return {error: null, response: `Deleted ${teamName} registration, and members association for ${deletedMembers.join('\n')}`}
}