const findCategoryChannel = require('./findCategoryChannel');

module.exports = async (guild, categoryChannel, reason) => {
  const {error, response} = findCategoryChannel(guild, categoryChannel.name);
  if(response){
    const deletedChannel = await response.delete(reason);
    return {error: null, response: deletedChannel};
  } else {
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message