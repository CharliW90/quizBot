# Bot commands

# Bot events

# Bot functions

functions are named as close to their expected action as possible - most Discord actions taken by the bot are going to be 'Find', 'Create' or 'Delete' and are going to apply to 'Channels', 'Roles' or 'Members'

## /discord

These functions are not particularly complex, but are some of the most commonly needed discord.js queries for our bot - by abstracting away their few lines of code into these files, we save many lines of code elsewhere.  Also, these queries are made using chained custom methods, which are not particularly easy to read or understand, and are quite messy looking - this abstracted away code now has useful names, that tells us what it's doing, making the more complicated code much easier to read through.

Since they are intended to perform one function and one function only, and that function is made clear by the name of the file, these functions are all exported as default (or, anonymous) functions.  This is a conscious design choice.  To then make them easier and cleaner to reference, they are all collated in the index.js file, and exported as named functions.
They can then be referenced using `const { nameOfFunctionA, nameOfFunctionB } = require('../pathTo/folderCalled/discord')`

As a rule, all of these functions return an Object response of {error, response} where one is always null.

## /firestore

**These functions interact with the Google Firebase Firestore noSQL database.**  They can broadly be categorised into handling various elements of what we are trying to store:

- maps:  these are functions for 'mapping' things to one another; for example, mapping a team to all its members or mapping a team name to a known alias

- quiz:  these are functions for tracking quiz sessions - just the essentials: the date of a quiz, and the teams registered

- responses: these are functions for storing teams' responses (when fetched from Google Forms) and allow for updating existing rounds, and rolling back any updates - this allows teams scores to be re-marked if a team flags up that there is a mistake in the scoring, or if the quiz master decides to allow points for a given answer that was not expected

- scoreboard: these are functions for storing/retrieving a quiz sessions final scoreboard

- scores: (WIP) these are functions for storing/retrieving a team's scores for past and present quizzes

- users: these are functions for storing/retrieving a user's scores and previous team names - allows a user to check how well they've done historically, and also helps the to register a team by providing their previous team names to re-use

**As a rule, all of these functions return an Object response of {error, response} where one is always null.**  When the error message is caused by improper calling of the function (i.e. parameters undefined, incorrect type or missing properties) the error message includes the location (loc) of the error to assist in debugging.

***To make these easier and cleaner to reference, they are all collated in the index.js file, and exported again.***
They can then be referenced using `const { nameOfFunctionA, nameOfFunctionB } = require('../pathTo/folderCalled/firestore')`

**Functions that read data (not write/delete) take an additional optional parameter of 'session'** which allows us to query past quizzes. This parameter defaults to 'null', but if present replaces the 'quizDate()' value when querying firestore.
**Functions that write or delete data cannot do so to past quizzes**, and additionally check that the quiz session has not 'ended' by checking the boolean 'ended' flag that is set when creating a quiz session.

**The following firestore functions create new top-level (i.e. server and/or quiz-date) collections and documents:**
*(all others return error messages if a given server/quiz date does not exist yet)*

- [maps/setTeamsMembers()](./firestore/maps.js)
  - may set up *new server* and *new quiz*: This function is one of the first ones called when a new quiz has started, as it is used for recording members who are assigned to a team.
- [quiz/recordTeam()](./firestore/quiz.js)
  - may set up *new server* and *new quiz*: This function is one of the first ones called when a new quiz has started, as it is used for registering teams wanting to play.
- [responses/addResponseToFirestore()](./firestore/responses.js)
  - may set up *new server* and *new quiz*: This function ought not to be called if a quiz isn't already set up, however we must allow for situations where none of the quiz teams have registered on Discord but we still wish to pull, parse and store all of the Google Forms responses from non-discord teams.
- [users/addTeamMemberToFirestore()](./firestore/users.js)
  - may set up *new user*: unlike the others, this function is looking after individual users, regardless of which server they are on - the top-level is the user ID, inside of which we store data about the servers they are on, and the quizzes they have taken part in

## /forms

These functions handle the interaction with the Apps Script, via our custom API (see: [cloud_app](../../cloud_app/readme.md)) ultimately retrieving the responses submitted by teams in Google Forms

checkPermissions:
- check() calls the apps script endpoint to check that it can respond (if it's permissions have expired, we get an error)

fetchFormResponses:
- fetch() calls the apps script endpoint, collects an Array of responses
- summarise() takes an Array of responses, and summarises what they are (i.e. Quiz Round n, Responses for x Teams, Teams: 'list-of-teams')

parseFormResponses:
- parse() picks apart a response and creates Discord Embed Messages for each team that responded, in preparation for these being sent to their text channel

holdFormResponses:
- hold() stores the Embed Messages in working memory
- followUp() asks the user what to do with these stored messages - primary response is to store them in Firestore

sendFormResponses:
- sendResponses() for each stored Embed Message, tries to locate the correct text channel to send the message to, working from the team name stored in the Embed Message, and the known team names and aliases

As a rule, all of these functions return an Object response of {error, response} where one is always null.

## /quiz

Like those in the /discord functions, these are highly repeatable tasks that our bot may carry out and which often require performing multiple functions from the /discord collection - again, by abstracting away their few lines of code into these files, we save many lines of code elsewhere, and provide functions named such that they give away what they are doing.

clearTeamCaptains(): removes the 'Team Captain' role from all users who have it - this is part of the tidy up at the end of the quiz

prepQuizEnvironment(): this is a quick sense-check that everything is in place on the Discord server being used - if things are missing (such as a Team Captain role, or a Quiz Teams category for channels) these are implemented; can be called to run across all guilds that the bot is present on, or on a specific guild

quizReset(): resets the Discord server ready for a new quiz - involves removing channels, team roles, and clearing any current Firestore collection for a 'today' quiz (so this can be used to reset if something goes horribly wrong when registering teams)

registerTeam(): handles the various tasks required to register a team, including creating a named role, applying that role to users, applying the team captain role to one user, creating private text channel and private voice channel, recording the details in Firestore, and then providing a success message (or failure message, if something went wrong) - additionally it keeps track of actions successfully completed, and if later an error is encountered it attempts to undo all of the successfully done things, to tidy up after itself

scoreboardGenerator(): handles pulling teams and scores from firestore, and generating a scoreboard of all the teams scores, from highest to lowest

teamDelete(): carries out many of the registerTeam tasks, in reverse, thus deleting a team

teamMemberAdd(): adds user(s) to an existing team
teamMemberPromote() swaps the team captain to a different team member
teamMemberRemove(): removes user(s) from an existing team

As a rule, all of these functions return an Object response of {error, response} where one is always null.