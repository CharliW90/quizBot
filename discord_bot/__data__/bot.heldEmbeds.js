module.exports = {
  "teams": ["teamname", "another", "a_third"],
  "embeds": [
    {data: {
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
    }},
    {data: {
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
    }},
    {data: {
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
    }}
  ]
}