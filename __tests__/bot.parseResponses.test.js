const { EmbedBuilder } = require('discord.js');
const data = require('../__data__');
const {holdSpy} = require('../__mocks__/spies'); // note: spies must be called before declaring the function they will be called by

const parseFormResponses = require('../functions/forms/parseFormResponses');

describe('parseFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  test('returns an empty array when passed no data', async () => {
    const input = 'x';
  })
})