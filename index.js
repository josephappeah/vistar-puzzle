/*===================================================================================
	author	: joseph appeah
	date  	: 10/02/2017
	desc  	: simple server to return state when given longitude and latitude
===================================================================================*/


// pull dependencies
var express     	= require('express')
var lineReader  	= require('linereader');
var service     	= express();
var locationMap 	= new Object();

// pull configs
var config	    	= require('./config/config.js');


/*===================================================================================
                                utils        
===================================================================================*/
// read lines from state data file
function parseStateData() {

	//init line reader
	lr = new lineReader('./utils/' + config.statefile);

	lr.on('error', function (err) {
	  console.log(err);
	  lr.close();
	});

	// read an store each line
	lr.on('line', function (lineno, line) {
		storeStateData(line)
	});
}


// store state data to global json
function storeStateData(line) {
	var jsnLine = JSON.parse(line)
	var state 	= jsnLine.state;

	// store for latitudes and longitudes
	var xcoords = []
	var ycoords = []

	for (item in jsnLine .border) {
		xcoords.push(jsnLine.border[item][1])
		ycoords.push(jsnLine.border[item][0])
	}

	// obtain max and min to get general state borders.
	var maxX = xcoords.reduce(function(a, b) {return Math.max(a, b);})
	var minX = xcoords.reduce(function(a, b) {return Math.min(a, b);})
	var maxY = ycoords.reduce(function(a, b) {return Math.max(a, b);})
	var minY = ycoords.reduce(function(a, b) {return Math.min(a, b);})

	locationMap[state] = JSON.stringify(
			{
				'maxX' 	: maxX, 
				'maxY' 	: maxY, 
				'minX'	: minX,
				'minY' 	: minY, 
				'X' 	: xcoords, 
				'Y'		: ycoords,
				'coords': jsnLine.border
			}
		)

	//console.log(locationMap[state])

}


// Initial check. 
// checks if the long and lat provided lie with a square area created by min and max coords
function checkStateInitial(state, longitude, latitude) {
	data = JSON.parse(locationMap[state])

	if (parseFloat(longitude) <= parseFloat(data.maxY) && 
		parseFloat(longitude) >= parseFloat(data.minY) &&
		parseFloat(latitude)  <= parseFloat(data.maxX) && 
		parseFloat(latitude)  >= parseFloat(data.minX) 
	) {
		return true;
	} else {
		return false;
	}
}

// Simplified algorithm to check if a point xy will intersect line created by points x1y1, x2y2
function checkIntersection(x,y,x1,x2,y1,y2){
    return ((y1 > y) != (y2 > y)) && (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1);
}


// Secondary check.
// Implements simplified version of jordans curve algorithm.
// Take the point and check the number of times it intersects with each side.
// If even then inside else outside.
function checkStateSecondary(latitude, longitude, points) {
    var xcoord = latitude; 
    var ycoord = longitude;

    var inside = false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {

        var x1 	= points[i][0]; 
        var y1 	= points[i][1];
        var x2 	= points[j][0];
        var y2 	= points[j][1];
        

        if (checkIntersection(xcoord,ycoord,x1,x2,y1,y2)){
        	inside = !inside;
        } 
    }
    
    return inside;
}

/*===================================================================================
                                endpoint    
===================================================================================*/
service.get('/', (req,res) => {

	// obtain latitude and longitude from user
	var latitude  = req.query.latitude;
	var longitude = req.query.longitude;
	var initialState;
	var secondaryState;

	// search location store for match
	for (state in locationMap) {
		if (checkStateInitial(state, latitude, longitude)){
			initialState = state;
		}

		if (checkStateSecondary( longitude, latitude, JSON.parse(locationMap[state]).coords)){
			secondaryState = state;
		}
		
	}

	// ensure both tests produce same answer else use secondary test
	if (initialState == secondaryState) {
		res.send(initialState)
	} else {
		res.send(secondaryState)
	}

});


/*===================================================================================
                                launch    
===================================================================================*/
//parse state file
console.log("parsing location data from file ./utils/" + config.statefile);
parseStateData();

// start server 
console.log("starting server on port : " + config.port);
service.listen(config.port);
console.log("listening on port : " + config.port);
