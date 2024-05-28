const findVoiceChannel = require('./findVoiceChannel');

module.exports = async (interaction, voiceChannel, reason) => {
  const channelExists = findVoiceChannel(interaction, voiceChannel.name);
  if(channelExists){
    const deletedVoiceChannel = await channelExists.delete(reason)
    return {error: null, channel: deletedVoiceChannel};
  } else {
    return {error: `Cannot find a channel with the name ${voiceChannel.name}`};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message