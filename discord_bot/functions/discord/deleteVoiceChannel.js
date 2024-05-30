const findVoiceChannel = require('./findVoiceChannel');

module.exports = async (guild, voiceChannel, reason) => {
  const {error, response} = findVoiceChannel(guild, voiceChannel.name);
  if(response){
    const deletedVoiceChannel = await response.delete(reason);
    return {error: null, response: deletedVoiceChannel};
  } else {
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message