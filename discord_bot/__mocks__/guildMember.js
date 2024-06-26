const { mockGuild } = require("./guild");
const { mockUser } = require("./guildUser");

exports.mockMember = (id) => {
  return {
    guild: mockGuild(id),
    joinedTimestamp: 1570874696139,
    premiumSinceTimestamp: null,
    nickname: null,
    pending: false,
    communicationDisabledUntilTimestamp: null,
    user: mockUser(),
    avatar: null,
    flags: { bitfield: 0 }
  }
}