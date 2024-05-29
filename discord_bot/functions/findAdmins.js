module.exports = (interaction) => {
  if(interaction.guild.members.cache){
    const adminRoles = interaction.guild.roles.cache.filter(role => role.permissions.has("Administrator"));
    const admins = interaction.guild.members.cache.filter(member => member.permissions.has("Administrator"));
    return {error: null, response: {adminRoles, admins}}
  } else {
    return {error: {message: `Interaction did not contain guild.roles.cache`, code: 400, details: interaction}, response: null};
  }
}

// retrieves all roles with admin permissions, and all server members with admin permissions
// returns an object with two properties: the roles, and the members