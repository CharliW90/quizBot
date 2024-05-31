module.exports = async (role, members) => {
  try{
    members.forEach((member) => {
      member.roles.remove(role)
    })
    return {error: null, response: role};
  } catch(error){
    return {error, response: null};
  }
}