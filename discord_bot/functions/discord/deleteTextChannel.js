const findTextChannel = require('./findTextChannel');

module.exports = async (guild, textChannel, reason) => {
  const {error, response} = findTextChannel(guild, textChannel.name);
  if(response){
    const deletedTextChannel = await response.delete(reason);
    return {error: null, response: deletedTextChannel};
  } else {
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message