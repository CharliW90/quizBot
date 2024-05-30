module.exports = (role, users) => {
  try{
    users.forEach((user) => {
      user.roles.add(role)
    })
    return {error: null, response: role};
  } catch(error){
    return {error, response: null};
  }
}