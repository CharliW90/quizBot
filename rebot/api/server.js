const express = require('express');
const { verifyKeyMiddleware } = require('discord-interactions');
const { client } = require('./discord.js');
const { publicKey } = require('../config.json');

const logging = require('./logger.js');
const logger = logging.logger("server");

const app = express();
const PORT = process.env.PORT || 8080;

app.post('/interactions', verifyKeyMiddleware(publicKey), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === 2) {
    const command = client.commands.get(interaction.data.name);

    if (!command) {
      logger.error(`No command matching ${interaction.data.name} was found.`);
      return res.status(404).send('Command not found');
    }

    try {
      await interaction.deferReply();

      await command.execute(interaction);
    } catch (error) {
      logger.error(error);

      if (interaction.deferred) {
        await interaction.editReply({ content: 'There was an error while executing this command.' });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command.' });
      }
    }
  }

  return res.status(400).send('Unsupported interaction type');
});

app.listen(PORT, () => {
  logger.info(`Server is listening on port ${PORT}`);
});
