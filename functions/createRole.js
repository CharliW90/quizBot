const findRole = require("./findRole")

module.exports = async (interaction, role) => {
  const roleExists = findRole(interaction, role.name);
  if(roleExists){
    return {error: "Role already exists", role: roleExists};
  }
  if(role.name) {
    const newRole = await interaction.guild.roles.create(role);
    return {error: null, role: newRole}
  } else {
    return {error: "Role needs at least a name"}
  }
}

// Creates a role, according to the provided specification in the role variable
// the role variable should be an object with any of the valid properties from https://discordjs.dev/docs/packages/discord.js/14.14.1/RoleCreateOptions:Interface
/* something like this:
  const role = {
    name: "test-role",
    color: "Aqua",
    hoist: true,
    position: 12,
    mentionable: true,
  }
*/
