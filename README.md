# npm-hook-slack

An example slack integration that listens to registry hook events on an [npm-hook-receiver](https://github.com/npm/npm-hook-receiver) and posts about them in a Slack channel.

To run the integration, set the required environment variables then run the index file:

```
node index.js
```

All configuration is done with environment variables. These are the vars used:

| variable | meaning | required? | default |
| --- | --- | --- | --- |
| SLACK_API_TOKEN | the API token you generated in Slack | y | - |
| SLACK_CHANNEL | the ID of the Slack channel to post to (not its name!) | y | - |
| SHARED_SECRET | the shared secret set up for the hooks you'll be receiving | y | - |
| PORT | the port number to listen on | n | 6666 |
| MOUNT_POINT | the path to mount the hook on | n | `/incoming` |
| SERVICE_NAME | used in logging | n | `hooks-bot` |

## License

ISC
