const { RoleSelectMenuInteraction } = require("discord.js");

const teamsMembers = new Map();
const membersTeams = new Map();

exports.registerTeamMembers = (teamName, members) => {
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
    membersTeams.set(member.user.id, teamName)
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
    return {error: {message: "something went wrong deleting team and members from the maps", code: 500}, response: null}
  }

  return {error: null, response: `Deleted ${teamName} registration, and members association for ${deletedMembers.join('\n')}`}
}

exports.removeTeamMember = (teamMember) => {
  if(!teamMember){
    const error = {"code": 400, "message": `Team member was ${teamMember}`};
    return {error, response: null};
  }

  if(!membersTeams.has(teamMember.user.id)){
    const error = {"code": 404, "message": `${teamMember.user.globalName} not found`};
    return {error, response: null};
  }

  const team = membersTeams.get(teamMember.user.id);
  const members = [...teamsMembers.get(team)];
  if(!members.some(member => member.id === teamMember.user.id)){
    const error = {"code": 404, "message": `${teamMember.user.globalName} not found in team ${team}\n${members.join('\n')}`};
    return {error, response: null};
  }
  
  const filtered = members.filter(member => member.id !== teamMember.user.id);

  membersTeams.delete(teamMember.user.id);
  teamsMembers.set(team, filtered);

  if(membersTeams.has(teamMember.user.id) || teamsMembers.get(team).some(element => element.id === teamMember.user.id)){
    return {error: {message: "something went wrong deleting team and members from the maps", code: 500}, response: null}
  }

  return {error: null, response: `Removed ${teamMember.user.globalName} from ${team} registration, and removed association.`}
}

exports.resetTeamMembers = () => {
  const resets = [...teamsMembers.keys(), ...membersTeams.keys()];
  teamsMembers.clear();
  membersTeams.clear();
  if(teamsMembers.size + membersTeams.size === 0){
    return resets;
  }
  return []
}