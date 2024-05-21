# Bot functions

functions are named as close to their expected action as possible - most Discord actions taken by the bot are going to be 'Find', 'Create' or 'Delete' and are going to apply to 'Channels', 'Roles' or 'Members'

## forms

These functions handle the response retrieved from google forms, via the Apps Script.
All forms functions return an Array of [error, response] (error-first)

fetchFormResponses calls the apps script endpoint, and passes the response to:
parseFormResponses which picks apart the response and creates Discord Embeds, and then passes these embeds to either:
holdFormResponses in an Object in memory
or
sendFormResponses to the relevant Discord channels

if the full chain results in no errors, fetchFormResponses ultimately returns a Discord embed as its response value, which contains a summary of the action taken.

## maps

These functions handle mapping various values in order to improve the bot's ability to find related things (such as teams, people, or results)
All maps functions return an Array of [error, response] (error-first)

teamChannels maintains a directory (by creating, finding, or deleting entries) of teams and their respective text channels, to assist in sending results to each team; this includes being able to record aliases so that the bot can 'learn' from earlier corrections (e.g. failing to find 'a-teamname' can be rectified by telling it that this is the same team as 'a-team-name' - this relationship is then stored as an alias, and future searches for 'a-teamname' will result in a lookup for 'a-team-name')