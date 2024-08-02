module.exports = (role, members) => {
  try{
    members.forEach((member) => {
      member.roles.remove(role)
    })
    return {error: null, response: {role, "count": members.length}};
  } catch(error){
    return {error, response: null};
  }
}