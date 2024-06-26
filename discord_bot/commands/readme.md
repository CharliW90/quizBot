# Commands

Discord bots run on 'slash-commands' which have to be registered with Discord via the Discord API before they can be called in a Discord server.  These commands have to be built using the slash command builder, which outlines how they appear and function in a Discord server.

.setName() sets the name of the command, which is what users will need to type after a slash (/) in order to call the command

.setDescription() allows a more verbose description to be set, of what the command does - this will appear to the user in the preview window of the command they are selecting

.setDMPermission() is a boolean field, that sets whether or not a command can be called via a DM message to the bot

.setDefaultMemberPermissions() sets the required permission(s) a user must have in order to be allowed to call the command - if a user does not have the specified permissions, they cannot see the command as an option

.add<Something>Option() then allows us to add further options for the user to interact with the command, whether this is a String (to provide, for example, a desired team name) or a User (to tag, for example, a team member)

The commands (or rather, their names) ought to be rather self-explanatory as to what they are doing.

## async autocomplete(interaction)

This function is called whenever a user interacts with a 'slash-command' option that has '.setAutocomplete(true)' - this autocomplete() function must return an array of options, which will be presented to the user to choose from, and which can be used to help prevent incorrect command usage.

Autocomplete is always a suggestion, and does not restrict the user to only those options - when a user needs to be restricted, we use .addChoices(...), however this has the major limitation that the choices must be defined at the time that the command is registered via the API, and therefore cannot be live, reactive or context-dependent - this is where Autocomplete is much more useful, since it is a repeatedly-triggered function that can update a list of options (suggestions) in realtime.

Various commands here use this in order to provide, for example, a list of possible users on the server, or a list of previous team names a user has used

## async execute(interaction)

This is the function that is ultimately called once the user triggers the command.  If the user has selected/completed options these must be handled by the code in order to carry out the correct function.  For security / peace of mind most of these commands initially trigger a 'holding response' which sets out what it is the Bot intends to do, and asks the user to confirm that this is what they wanted (via response buttons) - a cancel option allows the Bot to gracefully ignore the command, wherease other buttons trigger the relevant action(s).  The initial responses are marked as 'ephemeral', which is Discord's way of saying that only the user who called the command can see that response - the ultimate response tends not to be 'ephemeral', so that all users can see the action taken.

Most of these commands trigger one 'back-end' function in the /functions directory - the names often correlate quite clearly, but below is a table of the relationships:

| Command | Option/Parameter | Function | notes |
| ------- | ---------------- | -------- | ----- |
| delete-team | team name | quiz/teamDelete |  |
| fetch-responses | round number | forms/fetchFormResponses | goes through two layers of interaction |
| leave | n/a | discord/roleRemove | allows a team member to leave the team they are in |
| quiz-reset | n/a | quiz/quizReset | clears server of all current teams etc. |
| register-team | team name, captain, member(s), colour | quiz/registerTeam | the backbone of this bot |
| results\* | round number | multiple | actually quite complicated to follow - needs cleaner abstracting away |
| team | add-member / remove-member / promote-to-captain | quiz/teamMemberAdd, teamMemberRemove, teamMemberPromote respectively | allows amendments to be made to a team's members |


\*results command - the key to this command is actually the 'followUp()' function in forms/holdFormResponses.  When the followUp() function is first seen, it is when we've fetched the responses (fetch-responses command, forms/fetchFormResponses function) from Google Forms - at this stage the responses have been parsed into embed messages and are held in temporary storage; here followUp() asks the user if they want to store these responses or not.  However, when followUp() is called from the results command, the third parameter (stored?) is set to true - in this situation the follow up message instead asks the user if they want to send the responses (since they are already stored).  This two-tier approach to handling responses is to ensure that responses have been stored more permanently (firestore) before the bot attempts to send them to each channel.  *In future it may be decided that the first use of followUp() can provide the option to send, but would first store those responses before doing so.*  It is also worth noting that the results command makes use of autocomplete to list the quiz rounds stored in firestore, which is extremely helpful for guiding users behaviour.
