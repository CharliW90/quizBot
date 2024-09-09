module.exports = async (role, members) => {
  try{
    for(let i = 0; i < members.length; i++){
      await members[i].roles.remove(role)
    }
    return {error: null, response: {role, "count": members.length}};
  } catch(error){
    return {error, response: null};
  }
}