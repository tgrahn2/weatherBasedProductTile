'use strict';

const HttpClient = require('dw/net/HTTPClient');
var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var debugMessage = "";



/**
 * Render logic for the assets.producttile.
 */
module.exports.render = function(context) {
    var model = new HashMap();
    var content = context.content;

    var arrayResults = getWeather(request, content.controlTemp);

    var results = arrayResults[0];
    var city = arrayResults[1];
    var state = arrayResults[2];

    var product = null;

    if('cold' === results) {
        product = content.productCold;
    }
    else if ('hot' === results){
        product = content.productHot;
    }

    if (product) {
        var images = product.getImages('hi-res'); // make the product image type configurable by the component?
        var productImage = images.iterator().next();
        if (productImage) {
            model.image = {
                src: productImage.getAbsURL(),
                alt: productImage.getAlt()
            };
        }
    }

    model.product = product;
    model.debug=content.isDebug;
    model.debugMessage = debugMessage;
    model.city = city;
    model.state = state;

    return new Template('experience/components/assets/nto_tile_productWeather').render(model).text;
};






/**
 * Calls external weather service to get forecast data - extract temperature from this.
 * @param {Request} request
 * @returns {int} Control temp
 */
function getWeather(req, controlTemp) {

    var http = new HttpClient();
    var lat = req.geolocation.latitude;
    var long = req.geolocation.longitude;

    //NOAA Weather Rest Endpoint URL #1 - get GRID info
    var url = 'https://api.weather.gov/points/'+lat+','+long;

    http.open('GET', url);
    http.setTimeout(5000);
    http.send();

    if (http.statusCode == 200)
    {
        var preData = JSON.parse(http.text);
        var state = preData.properties.relativeLocation.properties.state;
        var city = preData.properties.relativeLocation.properties.city;
        var gridId = preData.properties.gridId;
        var gridX = preData.properties.gridX;
        var gridY = preData.properties.gridY;

        //NOAA Weather Rest Endpoint URL #2 - get forecast for this GRID
        var url2 = 'https://api.weather.gov/gridpoints/' + gridId + '/' + gridX + ',' + gridY + '/forecast';
        var http2 = new HttpClient();
        http2.open('GET', url2);
        http2.setTimeout(5000);
        http2.send();

        var data = JSON.parse(http2.text);


        var currentTemp = data.properties.periods[0].temperature;

        debugMessage = "It is " + currentTemp + " degrees";

        if(currentTemp > controlTemp){
            return ["hot", city, state];
        } else {
            return ["cold", city, state];
        }

    }
    else
    {
        // error handling
        return "An error occurred with status code "+http.statusCode;
    }
}