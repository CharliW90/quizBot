module.exports = {
  "teams": ["teamName", "another", "a_third"],
  "embeds": [
    {
      "author": {
        "icon_url": expect.any(String),
        "name": expect.any(String),
        "url": expect.any(String)
      },
      "color": expect.any(Number),
      "fields": expect.any(Array),
      "image": {"url": expect.any(String)},
      "thumbnail": {"url": expect.any(String)},
      "title": "teamName",
    },
    {
      "author": {
        "icon_url": expect.any(String),
        "name": expect.any(String),
        "url": expect.any(String)
      },
      "color": expect.any(Number),
      "fields": expect.any(Array),
      "image": {"url": expect.any(String)},
      "thumbnail": {"url": expect.any(String)},
      "title": "another",
    },
    {
      "author": {
        "icon_url": expect.any(String),
        "name": expect.any(String),
        "url": expect.any(String)
      },
      "color": expect.any(Number),
      "fields": expect.any(Array),
      "image": {"url": expect.any(String)},
      "thumbnail": {"url": expect.any(String)},
      "title": "a_third",
    }
  ]
}