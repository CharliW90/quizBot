# quizBot

A bot for Discord servers to help run a 'pub quiz' - creates categories, channels and roles for teams and quiz masters to interact.  Also fetches responses from google forms, via a web app and google apps script.

## Web App

an express app, on google Cloud Run, that provides an API that can serve, to the discord bot, the responses from Google Forms, which themselves are handled by a google Apps Script (for authorisation reasons) which also exposes an endpoint, but which only responds to the express app

## References
Channel Types are now handled via a ChannelType map:
```
{
  '0': 'GuildText',
  '1': 'DM',
  '2': 'GuildVoice',
  '3': 'GroupDM',
  '4': 'GuildCategory',
  '5': 'GuildNews',
  '10': 'GuildNewsThread',
  '11': 'GuildPublicThread',
  '12': 'GuildPrivateThread',
  '13': 'GuildStageVoice',
  '14': 'GuildDirectory',
  '15': 'GuildForum',
  '16': 'GuildMedia',
  GuildText: 0,
  DM: 1,
  GuildVoice: 2,
  GroupDM: 3,
  GuildCategory: 4,
  GuildAnnouncement: 5,
  AnnouncementThread: 10,
  PublicThread: 11,
  PrivateThread: 12,
  GuildStageVoice: 13,
  GuildDirectory: 14,
  GuildForum: 15,
  GuildMedia: 16,
  GuildNews: 5,
  GuildNewsThread: 10,
  GuildPublicThread: 11,
  GuildPrivateThread: 12
}
```