const {ChannelType } = require('discord.js');
const findTextChannel = require('./findTextChannel');

module.exports = async (interaction, textChannel) => {
  const {error, response} = findTextChannel(interaction, textChannel.name);
  try{
    if(response){
      return {error: {message: `Text Channel already exists with name ${textChannel.name}`, code: 400}, response: null};
    } else {
      textChannel.type = ChannelType.GuildText
      const newTextChannel = await interaction.guild.channels.create(textChannel);
      return {error: null, response: newTextChannel};
    }
  } catch(error){
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject