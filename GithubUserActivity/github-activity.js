#!/usr/bin/env node

const https = require('https');

// 1. Get the username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Error: Please provide a GitHub username.');
  console.log('Usage: github-activity <username>');
  process.exit(1);
}

// 2. Define the API endpoint and options
const options = {
  hostname: 'api.github.com',
  path: `/users/${username}/events`,
  method: 'GET',
  headers: {
    'User-Agent': 'node.js-cli-app' // GitHub API requires a User-Agent header
  }
};

// 3. Make the HTTPS request
const req = https.get(options, (res) => {
  let data = '';

  // Handle specific HTTP status codes
  if (res.statusCode === 404) {
    console.error(`Error: User "${username}" not found.`);
    process.exit(1);
  } else if (res.statusCode === 403) {
    console.error('Error: API rate limit exceeded. Please try again later.');
    process.exit(1);
  } else if (res.statusCode !== 200) {
    console.error(`Error: Failed to fetch data (Status Code: ${res.statusCode})`);
    process.exit(1);
  }

  // Receive data in chunks
  res.on('data', (chunk) => {
    data += chunk;
  });

  // 4. Process and display the data
  res.on('end', () => {
    try {
      const events = JSON.parse(data);
      
      // Ensure the response is an array
      if (!Array.isArray(events)) {
        console.error('Error: Received unexpected data format from GitHub.');
        return;
      }

      if (events.length === 0) {
        console.log(`No recent activity found for ${username}.`);
        return;
      }

      console.log(`Recent Activity for ${username}:`);
      
      // Slice to show only the last 10 events
      events.slice(0, 10).forEach(event => {
        let action = '';
        const repoName = event.repo?.name || 'unknown repository';

        switch (event.type) {
          case 'PushEvent':
            const commitCount = event.payload.commits?.length || 0;
            action = `Pushed ${commitCount} commit(s) to ${repoName}`;
            break;
          case 'IssuesEvent':
            const issueAction = event.payload.action;
            action = `${issueAction.charAt(0).toUpperCase() + issueAction.slice(1)} an issue in ${repoName}`;
            break;
          case 'WatchEvent':
            action = `Starred ${repoName}`;
            break;
          case 'CreateEvent':
            const refType = event.payload.ref_type || 'resource';
            action = `Created ${refType} in ${repoName}`;
            break;
          case 'MemberEvent':
            action = `Added ${event.payload.member?.login} as a collaborator to ${repoName}`;
            break;
          case 'PublicEvent':
            action = `Made ${repoName} public`;
            break;
          default:
            // Format generic event names (e.g., PullRequestEvent -> PullRequest)
            action = `${event.type.replace('Event', '')} in ${repoName}`;
            break;
        }
        console.log(`- ${action}`);
      });
    } catch (e) {
      console.error('Error: Failed to process activity data.');
      console.error('Technical Detail:', e.message);
    }
  });
});

req.on('error', (err) => {
  console.error(`Network Error: ${err.message}`);
});