const { EmbedBuilder } = require("discord.js");
const data = require('../__data__');

const sendFormResponses = require('../functions/forms/sendFormResponses');

describe('sendFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  test.todo('returns an empty array when passed no data')
})