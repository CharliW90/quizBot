const { roleAssign, roleRemove } = require("../discord")

module.exports = async (teamCaptain, newCaptain, captainRole) => {
  return roleAssign(captainRole, [newCaptain])
  .then(({error, response}) => {
    if(error){ throw {code: 500, message: `Error when assigning ${captainRole} to ${newCaptain}`}}
    
    return roleRemove(captainRole, [teamCaptain])
  })
  .then(({error, response}) => {
    if(error){throw {code: 500, message: `Error when removing ${captainRole} from ${teamCaptain}`}};
    
    return {error: null, response: `${captainRole} removed from ${teamCaptain} and added to ${newCaptain}`};
  })
  .catch((error) => {
    return {error, response: null}
  })
}