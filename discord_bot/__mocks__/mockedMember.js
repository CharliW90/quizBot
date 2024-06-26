const { GuildMember, User, Role } = require('discord.js');

// Generate fake snowflake IDs
const generateId = () => SnowflakeUtil.generate();

// Mock User
const mockUser = new User(null, {
  id: generateId(),
  username: 'MockedUser',
  discriminator: 1234,
});

// Mock Roles (add more as needed)
const mockRole1 = new Role(null, {
  id: generateId(),
  name: 'Team Captain',
});
const mockRole2 = new Role(null, {
  id: generateId(),
  name: 'Team: best-quiz-team',
});

// Mock GuildMember with Jest mocks for methods
const mockMember = new GuildMember(null, {
  id: generateId(),
  user: mockUser,
  roles: new Collection([mockRole1]),
  displayName: `${mockUser.username}#${mockUser.discriminator}`,
  joinedAt: new Date(),
  premiumSince: null,
}, null);

// Mock methods with Jest functions
mockMember.avatarURL = jest.fn(() => 'https://example.com/avatar.png');
mockMember.ban = jest.fn(() => Promise.resolve());
mockMember.createDM = jest.fn(() => Promise.resolve({ send: jest.fn() }));
mockMember.deleteDM = jest.fn(() => Promise.resolve());
mockMember.disableCommunicationUntil = jest.fn((until) => Promise.resolve());
mockMember.displayAvatarURL = jest.fn((options) => 'https://example.com/avatar.png');
mockMember.edit = jest.fn((data) => Promise.resolve(mockMember));
mockMember.equals = jest.fn((otherMember) => otherMember === mockMember);
mockMember.fetch = jest.fn(() => Promise.resolve(mockMember));
mockMember.hasPermission = jest.fn((permission, options) => Promise.resolve(true));
mockMember.isCommunicationDisabled = jest.fn(() => Promise.resolve(false));
mockMember.kick = jest.fn(() => Promise.resolve());
mockMember.permissionsIn = jest.fn((channel) => Promise.resolve(new Permissions({ bitfield: 0n })));
mockMember.send = jest.fn(() => Promise.resolve({ content: 'Mocked message' }));
mockMember.setNickname = jest.fn((nickname) => Promise.resolve(nickname));
mockMember.setFlags = jest.fn((flags) => Promise.resolve(mockMember));
mockMember.timeout = jest.fn((duration, reason) => Promise.resolve());
mockMember.toJSON = jest.fn(() => ({ id: mockMember.id, username: mockMember.user.username }));
mockMember.toString = jest.fn(() => mockMember.user.username);
mockMember.valueOf = jest.fn(() => mockMember.id);

module.exports = {mockMember}