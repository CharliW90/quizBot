# Google Cloud Web App

The plan here is to have a Web App that creates an API that can serve, to the discord bot, the responses from Google Forms


## Express App (api)

This API handles retrieving and exposing information related to the google forms for the quiz.  The endpoints are detailed below.

## Public

No Auth required to hit these endpoints.

### GET /health

Generic health check endpoint - if the app is live this replies with a status 200 and 'pong' (i.e. the reply to 'ping')

<details>
<summary>Example Responses:</summary>
GET /api/health

```http
200 OK
Content-Type: text/html

pong
```
</details>

## Private

Auth required to hit these endpoints.  Missing authorisation returns a 401 error, incorrrect authorisation returns a 403.

<details>
<summary>Example Responses:</summary>
```http
401 Unauthorized
Content-Type: text/html;

Unauthorized
```

```http
403 Forbidden
Content-Type: text/html;

Forbidden
```
</details>

### GET /adminPortal

WIP

### GET /api/health

API Health check endpoint - responds with simple details of the bot, and its connection to the internet.

<details>
<summary>Example Responses:</summary>

```http
200 OK
Content-Type: application/json

{
	"bot": {
		"health": "200:OK",
		"agent": "axios/1.6.8",
		"auth": {},
		"containerPort": "9090"
	},
	"internet": {
		"year": 2024,
		"month": 11,
		"day": 2,
		"hour": 16,
		"minute": 24,
		"seconds": 59,
		"milliSeconds": 312,
		"dateTime": "2024-11-02T16:24:59.312568",
		"date": "11/02/2024",
		"time": "16:24",
		"timeZone": "Europe/Amsterdam",
		"dayOfWeek": "Saturday",
		"dstActive": false
	}
}
```
</details>

### GET /api/permissions

Checks whether or not the API has access permissions for our Apps Script which extracts and parses the Google forms data.  Expected to return either a 200, or 403 response; may return a 206, which indicates an error with our endpoint logic; otherwise returns error.

<details>
<summary>Example Responses:</summary>

```http
200 OK
Content-Type: application/json
{
	"code": 200,
	"message": "Adequate permissions."
}
```

```http
403 Forbidden
Content-Type: application/json
{
  appsScript: true,
  reAuth: "https://script.google.com/u/1/home/projects/<google_apps_script_id>/edit"
}
```

```http
206 Partial Content
Content-Type: application/json

{
  UNKNOWN_DATA
}
```
</details>

### GET /api/responses/all

Fetches responses for all rounds of the quiz, and returns them as an array of JSON results.

<details>
<summary>Example Responses:</summary>

```http
200 OK
Content-Type: application/json

[
	{
		"roundDetails": {
			"number": 6,
			"questions": 10,
			"totalScore": 20
		},
		"results": { ... }
  },
  {
		"roundDetails": {
			"number": 5,
			"questions": 10,
			"totalScore": 20
		},
		"results": { ... }
  },
  {
		"roundDetails": {
			"number": 4,
			"questions": 15,
			"totalScore": 30
		},
		"results": { ... }
  },
  {
		"roundDetails": {
			"number": 3,
			"questions": 10,
			"totalScore": 20
		},
		"results": { ... }
  },
  {
		"roundDetails": {
			"number": 2,
			"questions": 10,
			"totalScore": 20
		},
		"results": { ... }
  },
  {
		"roundDetails": {
			"number": 1,
			"questions": 10,
			"totalScore": 20
		},
		"results": { ... }
  },
]
```
</details>

### GET /api/responses/:roundNumber

Fetches responses for a singe round of the quiz, and returns is an array containing a single JSON result.

<details>
<summary>Example Responses:</summary>

```
200 OK
Content-Type: application/json

[
 {
  "roundDetails": {
   "number": 6,
   "questions": 10,
   "totalScore": 20
  },
  "results": {
   "TEAM_NAME": {
    "answers": [
     {
      "answer": "correct-answer",
      "score": 2,
      "correct": true
     },
     {
      "answer": "incorrect-answer",
      "score": 0,
      "correct": false
     },
     ...continues
    ],
    "score": 14
   },
   "ANOTHER_TEAM": {
    "answers": [
     {
      "answer": "incorrect-answer",
      "score": 0,
      "correct": false
     },
     {
      "answer": "allowed-answer",
      "score": 1,
      "correct": true
     },
     ...continues
    ],
    "score": 11
   },
  }
 }
]
```
</details>

### GET /api/responses/

Under development

<details>
<summary>Example Responses:</summary>

```http
501 Not Implemented
Content-Type: text/html

This endpoint is under development.
```
</details>

### GET /api/passcheck

<details>
<summary>Example Responses:</summary>


</details>

## Apps Script (clasp)

clasp is googles Apps Script CLI, which lets you edit, and deploy Apps Script projects - environment variables are provided via the .clasp.json file - the main one used here is an object of key value pairs which allows conversion between a round number and a form ID for the google form that we want to get responses from - it looks something like this:

```
"variables":{
  "forms":{
    "1":"1zHFj43kL2MNOpqrS-tUvWxY123Z456",
    "2":"14LnLKm9nOpqRSt-uVwXyZ0123456",
    "3":"fwEgHj34KLmNOp-qRsTuVwXyZ7890",
    "4":"_3FDhJKlmNOpQR-sTuVwXyZ12345",
    "5":"98gFJKlMNOPqR-sTuVwXyZabcde",
    "6":"XYzhIJnopQR-sTuVwXyZ_uVwXyZ3456"
  }
}
```

WIP: The Apps Script needs to only respond to the express app, to prevent anyone else being able to get the results

### CircleCI

WIP

### Terraform

WIP