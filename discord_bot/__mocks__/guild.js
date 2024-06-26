const { mockCategory } = require("./channelCategory");

exports.mockGuild = (id) => {
  const categoryChannel = mockCategory();
  const guild = {
    id: id ?? '12345678900987654321',
    name: 'name_of_guild',
    icon: null,
    features: [],
    commands: [],
    members: [],
    channels: {[categoryChannel.id]: categoryChannel},
    bans: [],
    roles: [],
    presences: {},
    voiceStates: [],
    stageInstances: [],
    invites: [],
    scheduledEvents: [],
    autoModerationRules: [],
    available: true,
    shardId: 0,
    splash: null,
    banner: null,
    description: null,
    verificationLevel: 1,
    vanityURLCode: null,
    nsfwLevel: 0,
    premiumSubscriptionCount: 0,
    discoverySplash: null,
    memberCount: 0,
    large: false,
    premiumProgressBarEnabled: false,
    applicationId: null,
    afkTimeout: 300,
    afkChannelId: null,
    systemChannelId: '123456654321',
    premiumTier: 0,
    widgetEnabled: null,
    widgetChannelId: null,
    explicitContentFilter: 0,
    mfaLevel: 0,
    joinedTimestamp: 1705391150823,
    defaultMessageNotifications: 0,
    systemChannelFlags: [],
    maximumMembers: 500000,
    maximumPresences: null,
    maxVideoChannelUsers: 25,
    maxStageVideoChannelUsers: 50,
    approximateMemberCount: null,
    approximatePresenceCount: null,
    vanityURLUses: null,
    rulesChannelId: null,
    publicUpdatesChannelId: null,
    preferredLocale: 'en-US',
    safetyAlertsChannelId: null,
    ownerId: '1234567890',
    emojis: [],
    stickers: [],
  };
  guild.channels.fetch = (id) => {
    if(guild.channels[id]){
      return Promise.resolve(guild.channels[id])
    } else {
      return Promise.reject({code: 404})
    }
  };
  guild.channels.cache = () => {return Object.values(guild.channels)};
  guild.channels.cache.find = (fn) => {return Object.values(guild.channels).find(fn)};
  guild.channels.set = (channel) => {
    guild.channels[channel.id] = channel;
    categoryChannel.children.cache.set(channel.id, channel)
    return
  };
  return guild;
}