var
	assert    = require('assert'),
	bole      = require('bole'),
	logstring = require('common-log-string'),
	restify   = require('restify'),
	slack     = require('@slack/client')
	;

var logger = bole('npm-bot');
bole.output({ level: 'info', stream: process.stdout });

var token = process.env.SLACK_API_TOKEN || '';
assert(token, 'you must supply a slack api token in process.env.SLACK_API_TOKEN');
var channelID = process.env.SLACK_CHANNEL;
assert(channelID, 'you must supply a slack channel ID in process.env.SLACK_CHANNEL');
var port = process.env.PORT || '6666';
var SLACK_EVENTS = slack.CLIENT_EVENTS.RTM;

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
logger.info('listening on ' + port);

function handleMessage(request, response, next)
{
	// This is the package.
	var pkg = request.body.payload;
	var message = [
		'*event:* ' + request.body.event,
		'*name:* ' + request.body.name,
		'*type:* ' + request.body.type,
		'*version:* ' + request.body.version,
		'*sender:* ' + request.body.sender.username,
	];

	rtm.sendMessage(message.join('\n'), channelID, function(err, ignored)
	{
		if (err) logger.error(err);
	});

	response.send(200, 'got hook');
	next();
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

var rtm = new slack.RtmClient(token, {logLevel: 'info'});
rtm.start();
rtm.on(SLACK_EVENTS.AUTHENTICATED, function slackClientAuthed(teamdata)
{
	logger.info(`Logged in as ${teamdata.self.name} of team ${teamdata.team.name}`);
});

rtm.on(SLACK_EVENTS.RTM_CONNECTION_OPENED, function slackClientOpened()
{
	rtm.sendMessage('npm hooks slackbot coming on line beep boop', channelID);
	server.listen(port);
});
