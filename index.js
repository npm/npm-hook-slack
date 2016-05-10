var
	assert       = require('assert'),
	bole         = require('bole'),
	logstring    = require('common-log-string'),
	makeReceiver = require('@npmcorp/npm-hook-receiver'),
	restify      = require('restify'),
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

// make a webhooks receiver and have it act
var handler = makeReceiver({ secret: process.env.SHARED_SECRET });
handler.on('package:change', function(hook)
{
	var pkg = hook.name.replace('/', '%2F');
	var message = [
		`:package: \<https://www.npmjs.com/package/${pkg}|${hook.name}\> was just published!`,
		'*event*: ' + hook.event,
		'*type*: ' + hook.type,
		`*version*: ${hook.payload['dist-tags'].latest}`,
		`*sender*: \<https://www.npmjs.com/~${hook.sender}|${hook.sender}\>`,
	];

	web.chat.postMessage(channelID, message.join('\n'));
});

// restify section

var restifyOpts = { name: process.env.SERVICE_NAME };
var server = restify.createServer(restifyOpts);

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));
server.on('after', logEachRequest);

server.get('/ping', handlePing);
server.post('/incoming', handleMessage);

function handleMessage(request, response, next)
{
	handler.once('okay', function(hook)
	{
		response.send(200, 'got hook');
		next();
	});

	handler.once('error', function(message)
	{
		web.chat.postMessage(channelID, '*error handling web hook:* ' + message);
		response.send(400, message);
		next();
	});

	handler(request);
}

function handlePing(request, response, next)
{
	response.send(200, 'pong');
	next();
}

function logEachRequest(request, response, route, error)
{
	logger.info(logstring(request, response));
}

server.listen(port, function()
{
	logger.info('listening on ' + port);
	web.chat.postMessage(channelID, 'npm hooks slackbot coming on line beep boop');
});
