# quizBot

At its core this is a Discord bot, built on discord.js, for helping to manage a Discord server running a 'pub quiz' - the bot handles registering teams, providing private channels for team communications, fetching their quiz scores, and informing them of their results.  Achieving this involves a few things:

- discord_bot: the discord.js bot that handles slash-commands on a Discord server, and a Firestore noSQL database that stores the relevant data for past and present quizzes
- cloud_app: an express.js custom API (app) that handles fetching team's responses, and a Google Apps Script (clasp) that makes the Google Forms responses available to the app
- site: (WIP) a webpage overview of the bot, based primarily on the information stored in Firestore, to aid Admins in managing the quiz

## the 'Pub Quiz'

This discord bot project arose from my work with a [charity fundraising quiz](https://www.virtual-quizzes.com/), which is streamed on twitch.  The quiz is on the first Friday of every month, at 7:00PM UK time. Everyone is welcome to play along by watching our broadcast on Twitch.tv

## the Discord Bot

The [bot](/discord_bot/readme.md) is essentially a collection of ['slash-commands'](/discord_bot/commands/readme.md) and associated [functions](/discord_bot/functions/readme.md) for interacting with the Discord API to manage the Discord server (aka 'guild' in Discord terminology) via [interactions](/discord_bot/events/readme.md).  This is a node.js app that uses discord.js for handling interactions with discord, and firebase for interacting with firestore.  The Discord Bot app is running on a Google Cloud Platform (GCP) project - a Dockerfile packages the app, and this is hosted in the project's Artifact Registry, which is in turn deployed on Google Compute Engine.  An E2.micro Virtual Machine hosts a container, running this Dockerfile image, and has the startup script `docker run -d <registry>/<project>/quizbot/discordbot`

## the Cloud App  [deprecated (WIP)]

> NOTE: as of v4.0.0 (WIP) the cloud app has been deprecated in favour of directly accessing the google forms via googleapis within the Discord Bot itself - there is no longer a need to maintain an API for fetching / parsing of the forms responses, as the bot does this itself.

A [custom API](/cloud_app/readme.md) allowing the Discord Bot to access responses submitted via Google Forms.  Comes in two parts: a Google Apps Script (/clasp) which handles authorising access to Google Forms, and then fetches, parses, and returns a JSON response of the submitted forms, and; an express.js API (/app) that uses the MVC model to fetch, query, format and return the JSON responses from the Google Apps Script - includes [custom security](/cloud_app/app/utility/hotPass.js) (single-use, time-sensitive passwords) to ensure that only the Discord Bot can access the Google Forms responses.  The express API app is running on a Google Cloud Platform (GCP) project - a Dockerfile packages the app, and this is hosted in the project's Artifact Registry, which is in turn deployed on Google Cloud Run.

# Running Locally

The Discord Bot can be run locally, either directly in Node or via the Dockerfile.  Both of these require install using npm, and require a config.json file in the discord_bot directory that contains a number of important variables.  See the [example config](./discord_bot/example_config.json).

The app can be run locally either in Node (via npm) or via the Dockerfile. See the [readme](./discord_bot/readme.md) for full details.