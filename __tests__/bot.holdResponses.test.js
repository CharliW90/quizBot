const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const data = require('../__data__');

const holdFormResponses = require('../functions/forms/holdFormResponses');

describe('fetchFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  test.todo('returns an empty array when passed no data')
})