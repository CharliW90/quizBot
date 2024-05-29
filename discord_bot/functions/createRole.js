const findRole = require("./findRole")

module.exports = async (interaction, role) => {
  const {error, response} = findRole(interaction, role.name);
  try{
    if(response){
      return {error: {message: `Role already exists with name ${role.name}`, code: 400}, response: null};
    } else if(role.name === "Team Captain") {
      const newRole = await interaction.guild.roles.create(role);
      return {error: null, response: newRole};
    } else {
      if(role.name) {
        const {error, response} = findRole(interaction, "Team Captain");
        if(error){
          return {error, response: null}
        }
        const teamCaptain = response;
        role.position = teamCaptain.position;
        const newRole = await interaction.guild.roles.create(role);
        return {error: null, response: newRole};
      } else {
        return {error: "Role needs at least a name", response: null};
      }
    }
  } catch(error){
    return {error, response: null};
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
