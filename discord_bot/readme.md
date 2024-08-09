# the Discord Bot

The [bot](/discord_bot/readme.md) is essentially a collection of ['slash-commands'](/discord_bot/commands/readme.md) and associated [functions](/discord_bot/functions/readme.md) for interacting with the Discord API to manage the Discord server (aka 'guild' in Discord terminology) via [interactions](/discord_bot/events/readme.md).  This is a node.js app that uses discord.js for handling interactions with discord, and firebase for interacting with firestore.  The Discord Bot app is running on a Google Cloud Platform (GCP) project - a [Dockerfile](./Dockerfile) packages the app, and this is hosted in the project's Artifact Registry, which is in turn deployed on Google Compute Engine.  An E2.micro Virtual Machine hosts a container, running this Dockerfile image, and has the startup script `docker run -d <registry>/<project>/quizbot/discordbot`

## deployment

`npm run deploy` triggers our deploy script in our package.json file, which in turn executes both: `node deploy-commands.js` and `node index.js`.

## database (firestore)

## commands

## events

## functions

## logging

## tests