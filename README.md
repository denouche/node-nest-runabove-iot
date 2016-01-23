node-nest-runabove-iot
======================

This is a project that will get some informations from your Nest using the Nest Cloud API provided by Nest, and store it in the PaaS TimeSeries from RunAbove.

## References

https://developer.nest.com/documentation/cloud/about

https://www.runabove.com/iot-paas-timeseries.xml


## Run from Docker registry

### Command line

```bash
docker run --rm -it \
	-e RUNABOVE_WRITE_TOKEN_ID='xxxxxxxxxxxxxx' \
	-e RUNABOVE_WRITE_TOKEN_KEY='xxxxxxxxxxxxxxxxxxxxxx' \
	-e NEST_ACCESS_TOKEN='xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
	denouche/node-nest-runabove-iot
```

### Parameters

To get a Nest OAuth2 acces token, you can use: https://github.com/denouche/node-nest-oauth2

To get RunAbove write token id and key, enroll to PaaS TimeSeries from RunAbove, and from the manager create an application and create tokens for this application.


## What to do then ?

Since RunAbove TimeSeries are OpenTSDB compatible, you can use Grafana for example to display the graphics.

https://community.runabove.com/kb/en/iot/how-to-get-data-from-runabove-iot.html


