var request = require('request'),
	Nest = require('nest-cloud-api'),
	CronJob = require('cron').CronJob,
	_ = require('lodash');

var RUNABOVE_WRITE_TOKEN_ID = process.env.RUNABOVE_WRITE_TOKEN_ID,
	RUNABOVE_WRITE_TOKEN_KEY = process.env.RUNABOVE_WRITE_TOKEN_KEY,
	NEST_ACCESS_TOKEN = process.env.NEST_ACCESS_TOKEN;

var myNest = new Nest(NEST_ACCESS_TOKEN),
	series = [],
	pushSeries = false;

function init() {
	new CronJob('*/10 * * * * *', function() {
		console.log('------------------------')
		myNest.request({ uri: '/devices/thermostats' })
			.then(function(data) {
				_.forEach(data, function(thermostat) {
					addPointIfNew({
						metric: 'nest-current_' + thermostat.name.replace(/[^\w]/g, '-'),
						timestamp: Math.floor(Date.parse(thermostat.last_connection) / 1000),
						value: thermostat.ambient_temperature_c
					});
					
					addPointIfNew({
						metric: 'nest-target_' + thermostat.name.replace(/[^\w]/g, '-'),
						timestamp: Math.floor(Date.parse(thermostat.last_connection) / 1000),
						value: thermostat.target_temperature_c
					});

					var status;
					switch(thermostat.hvac_state) {
						case 'off':
							status = 0;
							break;
						case 'heating':
							status = 1;
							break;
						case 'cooling':
							status = -1;
							break;
					}
					if(status !== undefined) {
						addPointIfNew({
							metric: 'nest-state_' + thermostat.name.replace(/[^\w]/g, '-'),
							timestamp: Math.floor(Date.parse(thermostat.last_connection) / 1000),
							value: status
						});
					}
				});

				if(pushSeries) {
					pushSeries = false;
					var toSend = _.cloneDeep(series),
						lastOfEachMetric = [];
					_.forEach(toSend, function(point) {
						var foundPoint = _.find(lastOfEachMetric, {metric: point.metric});
						if(!foundPoint || foundPoint.timestamp < point.timestamp) {
							_.remove(lastOfEachMetric, {metric: point.metric});
							lastOfEachMetric.push(point);
						}
					});
					
					series = lastOfEachMetric;
					console.log('PUT_array', toSend)
					pushToRunAbove(toSend)
						.catch(function(error) {
							console.error('ERROR WHILE PUT TO RUNABOVE');
							// Error, we just repush all to put it next time
							_.forEach(toSend, function(e) {
								addPointIfNew(e);
							});
						});
				}
			});
	}, null, true);

	new CronJob('0 */6 * * * *', function() {
		pushSeries = true;
	}, null, true);
}

function addPointIfNew(point) {
	if(!_.some(series, { metric: point.metric, timestamp: point.timestamp })) {
		series.push(point);
		console.log('push_point', point.timestamp, new Date(point.timestamp * 1000).toISOString(), point.value)
	}
	else {
		console.log('point', point.timestamp, new Date(point.timestamp * 1000).toISOString(), 'already present', point.value)
	}
}

function pushToRunAbove(toSend) {
	return request({
		uri: "https://opentsdb.iot.runabove.io/api/put",
		auth: {
			user: RUNABOVE_WRITE_TOKEN_ID,
			pass: RUNABOVE_WRITE_TOKEN_KEY,
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


if(RUNABOVE_WRITE_TOKEN_ID && 
	RUNABOVE_WRITE_TOKEN_KEY &&
	NEST_ACCESS_TOKEN) {
	init();
} 
else {
	console.error('Error, missing environment variables.');
	console.error('RUNABOVE_WRITE_TOKEN_ID, RUNABOVE_WRITE_TOKEN_KEY and NEST_ACCESS_TOKEN should be defined.');
}
