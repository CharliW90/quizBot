exports.mockTextChannel = (name, id) => {
  return {
    name,
    id,
    send: jest.fn()
  }
}

exports.mockManyChannels = (count) => {
  const channels = [];
  for(let i = 0; i < count; i++){
    const name = Math.random().toString(36).substring(2, 20);
    const id = (Math.random() * 10000).toString().replace('.','-');
    const channel = this.mockTextChannel(name, String(id));
    channels.push([name, channel]);
  }
  return channels;
}