var
	assert       = require('assert'),
	bole         = require('bole'),
	logstring    = require('common-log-string'),
	makeReceiver = require('@npmcorp/npm-hook-receiver'),
	slack        = require('@slack/client')
	;

var logger = bole('npm-bot');
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
	name:   process.env.SERVICE_NAME || 'hooks',
	secret: process.env.SHARED_SECRET,
	mount:  process.env.MOUNT_POINT || '/incoming',
};
var server = makeReceiver(opts);

server.on('*', function(hook)
{
	var pkg = hook.name.replace('/', '%2F');
	var type = hook.type;
	var change = hook.event.replace(type + ':', '');

	var message = [
		`:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`,
		'*event*: ' + change,
		'*type*: ' + type,
		`*version*: ${hook.payload['dist-tags'].latest}`,
		`*sender*: \<https://www.npmjs.com/~${hook.sender}|${hook.sender}\>`,
	];

	web.chat.postMessage(channelID, message.join('\n'));
});

server.on('hook', function(hook)
{
	web.chat.postMessage(channelID, 'web hook received: ' + hook.event);
	next();
});

server.on('hook:error', function(message)
{
	web.chat.postMessage(channelID, '*error handling web hook:* ' + message);
	next();
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
