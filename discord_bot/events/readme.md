# Events

Events are triggers that the Discord API handles.  We can latch onto different events to cause our bot to do something by 'registering' an event listener with Discord.  Events.InteractionCreate is our bot listening for any event that is considered an interaction - this is users interacting with our bot, whether that be slash-commands, buttons, select menus or anything else that Discord considers a bot interaction; Events.ClientReady is our bot latching onto the 'ready' status that discord.js sets once our bot has finished registering itself with Discord via the API - our event handler only triggers once, when the deployment is complete, since 'ready' is a constant that persists so long as Discord is happy that our bot is registered.

## interactionCreate

This is the core 'behind the scenes' of how the Discord bot works - it triggers every time a user interacts with our bot through one of the methods of interaction that Discord has in place.  For us, the first thing we do is check to see if the interaction is one that we handle - in our case, that's if it isChatInputCommand() or isAutocomplete() - if it's neither of these things, we return out of the function.

- isChatInputCommand() is true when a user submits one of our registered slash-commands in a chat - when the user types a slash, Discord responds with suggestions of the commands available from any of the bots on that server, including ours - if the user selects one of ours, this triggers an event that isChatInputCommand() for our bot.

- isAutocomplete() is true when a user is typing into one of our slash-command option fields that has .setAutocomplete(true) - this flag tells discord that there is an associated autocomplete() function that should be run, in order to provide a list of suggested values for the user to choose from.

If the event is one of these, then we check that the command is one we have registered (it ought to be, else Discord wouldn't have offered it to the user). We then carry out the relevant execute() or autocomplete() function for that command - if executing a command, we first run prepQuizEnvironment() for this server (always good to check that the basics are in place before we try to carry out any commands for the user!).

## ready

This is the status of our own bot, from the perspective of discord.js.  When we deploy our bot, it registers all of its commands, and permissions, and OAuth scopes etc. and Discord checks that everything makes sense and is correctly defined.  Once Discord is happy, it sets the status to Ready, and discord.js sets this Event constant.  We have our event listener set to only trigger once, otherwise it would constantly be firing.