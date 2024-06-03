const { roleAssign, roleRemove } = require("../discord")

module.exports = (teamCaptain, newCaptain, captainRole) => {
  ({error, response} = roleAssign(captainRole, [newCaptain]));
  if(error){
    return {error: {code: 500, message: `Error when assigning ${captainRole} to ${newCaptain}`}, response: null};
  }
  
  ({error, response} = roleRemove(captainRole, [teamCaptain]));
  if(error){
    return {error: {code: 500, message: `Error when removing ${captainRole} from ${teamCaptain}`}, response: null};
  }
  
  return {error: null, response: `${captainRole} removed from ${teamCaptain} and added to ${newCaptain}`};
}