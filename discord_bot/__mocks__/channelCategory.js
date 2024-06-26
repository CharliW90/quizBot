const { ChannelType } = require("discord.js");

exports.mockCategory = () => {
  const childrenCache = new Map()
  childrenCache.filter = (fn) => {
    const output = new Map();
    const input = Array.from(childrenCache.values())
    const filtered = input.filter(fn);
    const id = filtered.map(el => el.id);
    id.forEach((id) => {
      const channel = childrenCache.get(id)
      output.set(id, channel);
    })
    return output;
  }
  const categoryChannel = {
    name: 'QUIZ TEAMS',
    id: 12345654321,
    type: ChannelType.GuildCategory,
    send: jest.fn(),
    children: {
      cache: childrenCache
    }
  }

  return categoryChannel;
}