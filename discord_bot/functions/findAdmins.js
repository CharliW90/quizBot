module.exports = (interaction) => {
  const adminRoles = interaction.guild.roles.cache.filter(role => role.permissions.has("Administrator"));
  const admins = interaction.guild.members.cache.filter(member => member.permissions.has("Administrator"));
  return {adminRoles, admins}
}

// retrieves all roles with admin permissions, and all server members with admin permissions
// returns an object with two properties: the roles, and the members