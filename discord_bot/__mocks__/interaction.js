const { mockGuild } = require("./guild")
const { mockMember } = require("./guildMember")
const { mockUser } = require("./guildUser")

exports.mockInteraction = (id) => {
  return {
    type: 2,
    id: '12345678900987654321',
    applicationId: '12345678901234567890',
    channelId: '12345678901234567890',
    guildId: id ?? '12345678901234567890',
    user: mockUser(),
    member: mockMember(id),
    guild: mockGuild(id),
    version: 1,
    appPermissions: { bitfield: '12345678901234567890' },
    memberPermissions: { bitfield: '12345678901234567890' },
    locale: 'en-GB',
    guildLocale: 'en-US',
    entitlements: new Map(),
    commandId: '123456789',
    commandName: 'mock-command',
    commandType: 1,
    commandGuildId: this.guildId,
    deferred: false,
    replied: false,
    ephemeral: null,
    webhook: { id: '123456789' },
    options: {
      _group: null,
      _subcommand: null,
      _hoistedOptions: [],
      getString: (input) => {
        if(input === 'date'){
          return String("1990-01-12")
        }
      }
    }
  }
}
