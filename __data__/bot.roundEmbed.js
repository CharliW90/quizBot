module.exports = (roundNum, teamname) => {
  return { data: {
    "author": {
      "icon_url": expect.any(String),
      "name": `Virtual Quizzes - Round Number ${roundNum}`,
      "url": expect.any(String)
    },
    "color": expect.any(Number),
    "fields": expect.any(Array),
    "image": {"url": expect.any(String)},
    "thumbnail": {"url": expect.any(String)},
    "title": expect.stringContaining(teamname),
  }}
}