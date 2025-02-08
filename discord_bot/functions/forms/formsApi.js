/* v4
  the easiest way to move the bot away from using the external API, and onto handling it internally,
  will be to create a new process here that outputs a response in the same structure as the external
  API currently does - we can then replace any calls to the external API with a call to these functions.

  This is mostly possible because a lot of the custom API's endpoints are no longer relevant once we bring
  the code into the bot itself - we won't need /health endpoints, nor will we need to check that the API
  is authorised to access google forms, since this is the problem that v4 solves - instead, we simply
  need to fetch the relevant google forms responses - either singularly or all of them together.

  Long-term we will be able to also do things like monitor the responses, to provide numbers on how many
  responses have been submitted, or to check that forms are open / closed (and, indeed, to open/close them
  on command!).  Step one, however, should be to simply emulate the /api/responses/ endpoint.
*/

// authorise with googleapis using serviceAccount credentials

// create a Google Forms API client, using the above auth

// fetch a single form's responses, and format the response to match the external API's output

/* that output is an array containing a round, which looks like this:
[{
  "roundDetails":{
    "number":3,"questions":10,"totalScore":20
  },
  "results":{
    "our quiz team name":{
      "answers":[
        {
          "answer":"HIDDEN LOVE","score":1,"correct":true
        },
        {
          "answer":"CRAZY IN LOVE","score":2,"correct":true
        },
        {
          "answer":"HEAD OVER HEELS","score":2,"correct":true
        },
        {
          "answer":"FOREVER AND EVER","score":2,"correct":true
        },
        {
          "answer":"DOWN ON ONE KNEE","score":2,"correct":true
        },
        {
          "answer":"LOVING YOU","score":0,"correct":false
        },
        {
          "answer":"DOOR TO MY HEART","score":1,"correct":true
        },
        {
          "answer":"LOVE BIRD","score":2,"correct":true
        },
        {
          "answer":"SUGAR","score":2,"correct":true
        },
        {
          "answer":"MIXED FEELINGS","score":2,"correct":true
        }
      ],
      "score":16
    },
    ...more teams objects as above
  }
}]
*/

// OR

// fetch all forms' responses, and format the response to match the external API's output

// that output is an array containing multiple rounds, that look the same as above
