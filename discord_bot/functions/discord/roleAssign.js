module.exports = async (role, members) => {
  try{
    for(let i = 0; i < members.length; i++){
      await members[i].roles.add(role)
    }
    return {error: null, response: role};
  } catch(error){
    return {error, response: null};
  }
}