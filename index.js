var
	assert       = require('assert'),
	bole         = require('bole'),
	logstring    = require('common-log-string'),
	makeReceiver = require('npm-hook-receiver'),
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

// We can post the generic bot, or attempt to post as an inferred bot user.
// If enabled, the bot user must be in the channel.
var messageOpts = {
	as_user: process.env.INFER_BOT_USER ? true : false
};

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
	console.log(hook.change);
	var user = hook.change ? hook.change.user : '';

	switch (hook.event)
	{
	case 'package:star':
		message = `★ \<https://www.npmjs.com/~${user}|${user}\> starred :package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`;
		break;

	case 'package:unstar':
		message = `✩ \<https://www.npmjs.com/~${user}|${user}\> unstarred :package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`;
		break;

	case 'package:publish':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>@${hook.change.version} published!`;
		break;

	case 'package:unpublish':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>@${hook.change.version} unpublished`;
		break;

	case 'package:dist-tag':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>@${hook.change.version} new dist-tag: \`${hook.change['dist-tag']}\``;
		break;

	case 'package:dist-tag-rm':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>@${hook.change.version} dist-tag removed: \`${hook.change['dist-tag']}\``;
		break;

	case 'package:owner':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\> owner added: \`${hook.change.user}\``;

		break;

	case 'package:owner-rm':
		message = `:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\> owner removed: \`${hook.change.user}\``;
		break;

	default:
		message = [
			`:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\>`,
			'*event*: ' + change,
			'*type*: ' + type,
		].join('\n');
	}

	web.chat.postMessage(channelID, message, messageOpts);
});

server.on('hook:error', function(message)
{
	web.chat.postMessage(channelID, '*error handling web hook:* ' + message, messageOpts);
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
	web.chat.postMessage(channelID, 'npm hooks slackbot coming on line beep boop', messageOpts);
});
