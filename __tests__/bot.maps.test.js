const { teamFromChannel, registerTeam, channelFromTeam } = require("../functions/maps/teamChannels")

describe('teamChannels.js', () => {
  test('team from channel returns a team name, which is a discord role', () => {
    registerTeam("abc", "123");
    const team = teamFromChannel('123');
    expect(team).toEqual("abc");
  })
  test('team from channel returns a team name, which is a discord role', () => {
    registerTeam("def", "456");
    const channel = channelFromTeam('def');
    expect(channel).toEqual("456");
  })
})