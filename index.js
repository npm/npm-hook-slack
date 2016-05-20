var
	assert       = require('assert'),
	bole         = require('bole'),
	logstring    = require('common-log-string'),
	makeReceiver = require('@npmcorp/npm-hook-receiver'),
	slack        = require('@slack/client')
	;

var logger = bole(process.env.SERVICE_NAME || 'hooks-bot');
bole.output({ level: 'info', stream: process.stdout });

var token = process.env.SLACK_API_TOKEN || '';
assert(token, 'you must supply a slack api token in process.env.SLACK_API_TOKEN');
var channelID = process.env.SLACK_CHANNEL;
assert(channelID, 'you must supply a slack channel ID in process.env.SLACK_CHANNEL');
var port = process.env.PORT || '6666';

// This is how we post to slack.
var web = new slack.WebClient(token);

// Make a webhooks receiver and have it act on interesting events.
// The receiver is a restify server!
var opts = {
	name:   process.env.SERVICE_NAME || 'hooks-bot',
	secret: process.env.SHARED_SECRET,
	mount:  process.env.MOUNT_POINT || '/incoming',
};
var server = makeReceiver(opts);

// All hook events, with special handling for some.
server.on('hook', function onIncomingHook(hook)
{
	var pkg = hook.name.replace('/', '%2F');
	var type = hook.type;
	var change = hook.event.replace(type + ':', '');

	var message;

	switch (hook.event)
	{
		case 'package:publish':
			message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>@${hook.payload['dist-tags'].latest} published!`;
			break;

		case 'package:star':
		 	// `\<https://www.npmjs.com/~${hook.sender}|${hook.sender}\>`
			message = `★ ${hook.change.username} starred :package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`;
			break;

		case 'package:star-removed':
			message = `✩ ${hook.change.username} unstarred :package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`;
			break;

		default:
			message = [
				`:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`,
				'*event*: ' + change,
				'*type*: ' + type,
			].join('\n');
	}

	web.chat.postMessage(channelID, message);
});

server.on('hook:error', function(message)
{
	web.chat.postMessage(channelID, '*error handling web hook:* ' + message);
});

// now make it ready for production

server.on('after', function logEachRequest(request, response, route, error)
{
	logger.info(logstring(request, response));
});

server.get('/ping', function handlePing(request, response, next)
{
	response.send(200, 'pong');
	next();
});

server.listen(port, function()
{
	logger.info('listening on ' + port);
	web.chat.postMessage(channelID, 'npm hooks slackbot coming on line beep boop');
});
