module.exports = (guild, roleName) => {
  if(guild.roles.cache){
    const foundRole = guild.roles.cache.find(role => role.name === roleName);
    return foundRole ? {error: null, response: foundRole} : {error: {code: 404, message: `Role "${roleName}" not found on server`}, response: null};
  } else {
    return {error: {message: `Guild object did not contain .roles.cache`, code: 400, details: interaction}, response: null};
  }
}

// looks for a role with a given name, and returns an {error, response} object