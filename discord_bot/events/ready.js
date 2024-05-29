const { Events } = require('discord.js');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
    const {error, response} = prepQuizEnvironment(client)
    if(error){
      console.error(error);
    }
    if(response.length > 0){
      response.forEach((actionTaken) => {
        console.log(actionTaken);
      });
    }
	},
};