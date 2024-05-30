const {ChannelType } = require('discord.js');
const findVoiceChannel = require('./findVoiceChannel');

module.exports = async (guild, voiceChannel) => {
  const {error, response} = findVoiceChannel(guild, voiceChannel.name);
  try{
    if(response){
      return {error: {message: `Voice Channel already exists with name ${textChannel.name}`, code: 400}, response: null};
    } else {
      voiceChannel.type = ChannelType.GuildVoice;
      const newVoiceChannel = await guild.channels.create(voiceChannel);
      return {error: null, response: newVoiceChannel};
    }
  } catch(error){
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns the newly created channelObject or an error