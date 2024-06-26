const { mockTextChannel } = require("./channelText")

exports.mockTeam = ({teamName, captain, members, settledColour, channels, roles}) => {
  return {
    teamName: teamName ?? 'mock-team',
    captain: captain ?? 'captainName',
    members: members ?? [{id: '123456', name: 'member'}],
    settledColour: settledColour ?? 'Purple',
    channels: channels ?? [mockTextChannel(this.teamName, '123456789')],
    roles: roles ?? [{id: '123456', name: 'role'}]
  }
}