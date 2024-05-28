module.exports = {
  data: {
    "author": {
      "icon_url": expect.any(String),
      "name": "Virtual Quizzes Response Handler",
      "url": expect.any(String)
    },
    "color": 10181046,
    "fields": expect.arrayContaining([expect.any(Object)]),
    "title": expect.stringContaining("Embeds held for retrieval"),
  }
}