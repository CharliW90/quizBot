module.exports = (interaction, roleName) => {
  const foundRole = interaction.guild.roles.cache.find(role => role.name === roleName);
  return foundRole ? foundRole : null
}

// looks for a role with a given name, and returns either the role or null