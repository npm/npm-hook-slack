
// config via env vars

// make a slack rtm client
// start it listening

var
	bole      = require('bole'),
	logstring = require('common-log-string'),
	restify   = require('restify'),
	slack = require('@slack/client')
	;

var logger = bole('npm-bot');
bole.output({ level: 'info', stream: process.stdout });

var token = process.env.SLACK_API_TOKEN || '';
var rtm = new slack.RtmClient(token, {logLevel: 'info'});
rtm.start();
var channels;

var SLACK_EVENTS = slack.CLIENT_EVENTS.RTM;

rtm.on(SLACK_EVENTS.AUTHENTICATED, function slackClientAuthed(teamdata)
{
	logger.info(Object.keys(teamdata));
	/*
	teamdata.channels.forEach(function eachChannel(channel)
	{
		logger.info(channel.id, channel.name);
	});
	*/

	logger.info(`Logged in as ${teamdata.self.name} of team ${teamdata.team.name}, but not yet connected to a channel`);
	//rtm.
});


// you need to wait for the client to fully connect before you can send messages
rtm.on(SLACK_EVENTS.RTM_CONNECTION_OPENED, function slackClientOpened()
{
	rtm.sendMessage('this is a test message', 'C026HPPTR', function messageSent()
	{
		// optionally, you can supply a callback to execute once the message has been sent
	});
});

// restify section

var restifyOpts = { name: process.env.SERVICE_NAME };
var server = restify.createServer(restifyOpts);

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(logEachRequest);
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));

server.get('/ping', handlePing);
server.post('/incoming', handleMessage);
server.listen(process.env.PORT);
logger.info('listening on ' + process.env.PORT);

function handleMessage(request, response, next)
{
	logger.info(response.body);

	rtm.sendMessage('we got a webhook call', 'C026HPPTR', function(err, response)
	{
		if (err) logger.error(err);
		logger.info(response);
	});

	response.send(200, 'got hook');
	next();
};

function handlePing(request, response, next)
{
    response.send(200, 'pong');
    next();
};

function logEachRequest(request, response, route, error)
{
	logger.info(logstring(request, response));
};
