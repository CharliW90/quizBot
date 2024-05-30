module.exports = (interaction, roleName) => {
  if(interaction.guild.roles.cache){
    const foundRole = interaction.guild.roles.cache.find(role => role.name === roleName);
    return foundRole ? {error: null, response: foundRole} : {error: {code: 404, message: "Role not found"}, response: null};
  } else {
    return {error: {message: `Interaction did not contain guild.roles.cache`, code: 400, details: interaction}, response: null};
  }
}

// looks for a role with a given name, and returns an {error, response} object