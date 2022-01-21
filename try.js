var axios = require("axios");
const redis = require('redis');
const { response } = require("express");
const Queue = require("bull");
var username = "arpit.r.sharma@mavq.com";
var password = "BfsNl9YuXlsfUabFJhID3AF2";

const token = `${username}:${password}`;
const encodedToken = Buffer.from(token).toString("base64");

var account = [];
var issue = [];
const accountIdQueue = new Queue("accountId");
const allWorklogQueue = new Queue("worklogs");

async function requestToJira(hmURL) {
  var session_url = hmURL;
// console.log(session_url);
  var config = {
    method: "get",
    url: session_url,
    headers: { Authorization: "Basic " + encodedToken },
  };

  await axios(config)
    .then(function (response) {
      //  console.log(response.data);
      response.data.forEach((element) => {
        if (element.emailAddress !== undefined) {
          //   console.log(element.accountId);
          account.push(element.accountId);

        }
      });
    })
    .catch(function (error) {
      console.log(error);
    });
    return account;
}

async function getUserByBatchsize(startIndex, batchSize) {
  const data = await requestToJira(
    `https://mavq-sandbox-884.atlassian.net/rest/api/3/users/search?maxResults=${batchSize}&startAt=${startIndex}`
  );
  //console.log({data});
  return data;

  //   console.log(data);
  //   for (var i in data) {
  //     user.push(data[i].emailAddress);
  //   }

  //   console.log(user);
}

async function getAccountId() {
  for (var i = 0; i < 50; i = i + 5) {
      let data = await getUserByBatchsize(i, 5);
      // console.log(data);
    data.forEach((x) => {
        // console.log({x});
      accountIdQueue.add({x});

    });
  }
  //   console.log(account);
  //   sendRequestToJiraAccount();
}

async function sendRequestToJiraAccount(accountId) {
  var config = {
    method: "get",
    url: `https://mavq-sandbox-884.atlassian.net/rest/api/3/search?jql=assignee=${accountId}`,
    headers: { Authorization: "Basic " + encodedToken },
  };
  console.log(config.url)
  await axios(config)
    .then(function (response) {
      response.data["accountId"] = accountId;
      // console.log(response.data);
      response.data.issues.forEach((el) => {
        if (el.id !== undefined) {
          issue.push(el.id);
        }
      });
      // console.log(issue);
    })
    .catch(function (error) {
      console.log(error);
    });

  // if (issue.length > 0) {
  //   sendIssueRequest();
  // }
  //   account.forEach((element) => {
  //     var config = {
  //       method: "get",
  //       url:
  //         `https://mavq-sandbox-884.atlassian.net/rest/api/3/search?jql=assignee=${element}`,
  //       headers: { Authorization: "Basic " + encodedToken },
  //     };

  //     axios(config)
  //       .then(function (response) {
  //         response.data["accountId"] = element;
  //         // console.log(response.data);
  //         response.data.issues.forEach((el) => {
  //           if (el.id !== undefined) {
  //             issue.push(el.id);
  //           }
  //         });
  //         // console.log(issue);
  //       })
  //       .catch(function (error) {
  //         console.log(error);
  //       });
  // sendIssueRequest();
  //   });
}

async function sendIssueRequest() {
  //   console.log(issue);
  for (var i = 0; i < issue.length; i++) {
    var config = {
      method: "get",
      url: `https://mavq-sandbox-884.atlassian.net/rest/api/3/issue/${issue[i]}/worklog`,
      headers: { Authorization: "Basic " + encodedToken },
    };
    // console.log(config.url)

    await axios(config)
      .then(function (response) {
        response.data["issueId"] = issue[i];
        console.log(response.data.worklogs);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
  //   issue.forEach((element) => {

  //   });
}

accountIdQueue.process(async function (job, done) {
  
//   console.log(job.data);
  await sendRequestToJiraAccount(job.data.x);
  await sendIssueRequest(job.data);
  
  done();
});

getAccountId();