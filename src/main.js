var request = require('request'),
	Nest = require('nest-cloud-api'),
	CronJob = require('cron').CronJob,
	_ = require('lodash');

var RUNABOVE_TOKEN_ID = process.env.RUNABOVE_TOKEN_ID,
	RUNABOVE_TOKEN_KEY = process.env.RUNABOVE_TOKEN_KEY,
	NEST_ACCESS_TOKEN = process.env.NEST_ACCESS_TOKEN;

var myNest = new Nest(NEST_ACCESS_TOKEN),
	series = [],
	pushSeries = false;

function init() {
	new CronJob('0 * * * * *', function() {
		console.log('------------------------')
		myNest.request({ uri: '/devices/thermostats' })
			.then(function(data) {
				_.forEach(data, function(thermostat) {
					addPointIfNew({
						metric: 'nest-current_' + thermostat.name.replace(/\s/g, '-'),
						timestamp: Math.floor(Date.parse(thermostat.last_connection) / 1000),
						value: thermostat.ambient_temperature_c
					});
					
					addPointIfNew({
						metric: 'nest-target_' + thermostat.name.replace(/\s/g, '-'),
						timestamp: Math.floor(Date.parse(thermostat.last_connection) / 1000),
						value: thermostat.target_temperature_c
					});
				});

				console.log('pushSeries', pushSeries)
				if(pushSeries) {
					pushSeries = false;
					var toSend = _.cloneDeep(series);
					series = [];
					console.log('should push ', toSend)
					pushToRunAbove(toSend);
				}
			});
	}, null, true);

	new CronJob('0 */5 * * * *', function() {
		pushSeries = true;
	}, null, true);
}

function addPointIfNew(point) {
	if(!_.some(series, { metric: point.metric, timestamp: point.timestamp })) {
		series.push(point);
		console.log('push point', point.timestamp, point.value)
		console.log('push point', new Date(point.timestamp * 1000).toISOString(), point.value)
	}
	else {
		console.log('point ', point.timestamp, 'already present', point.value)
		console.log('point ', new Date(point.timestamp * 1000).toISOString(), 'already present', point.value)
	}
}

function pushToRunAbove(toSend) {
	request({
		uri: "https://opentsdb.iot.runabove.io/api/put",
		auth: {
			user: RUNABOVE_TOKEN_ID,
			pass: RUNABOVE_TOKEN_KEY,
			sendImmediately: true
		},
		method: 'POST',
		json: toSend
	}, function (error, response, body) {
		if (error || response.statusCode >= 400) {
			console.error(error);
			console.error((response ? response.statusCode : null));
			console.error(body);
		} else {
			console.log(response.statusCode, body);
			console.info('Committed to RunAbove');
		}
	});
}


if(RUNABOVE_TOKEN_ID && 
	RUNABOVE_TOKEN_KEY &&
	NEST_ACCESS_TOKEN) {
	init();
}
else {
	console.error('Error, missing environment variables.');
	console.error('RUNABOVE_TOKEN_ID, RUNABOVE_TOKEN_KEY and NEST_ACCESS_TOKEN should be defined.');
}
