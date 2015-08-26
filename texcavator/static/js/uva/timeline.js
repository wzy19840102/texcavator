dojo.require("dijit.Tooltip");
dojo.require("dijit.popup");

/*
var showTimeline = function( lexiconId, lexiconTitle )
function loadGraphData( lexiconId )
function findValue(start, end, data, startIndex)
function getDataForInterval( lexiconId, intervalIndex, callback )
function getData( lexiconId, field, interval, callback )
function getEndOfInterval( date, interval )
function createGraph() {
	function filterFunction( d )
	function redraw() {
		function nrOfBins( data )
		function burstUpdateFunction( burst )
	}
}
function burstSearch( lexicon_query, date_range, max_records )
function burstClicked( data, index, element )
function burstCloud( params )
function closePopup() {}
*/

var intervals = ["year", "month", "day"];

var zoomLimit = 8 * 24 * 3600000; // Eight days
var zoomLimit = 10 * 60000; // Ten minutes //24*3600000; // One days

var detectBursts = true;


var showTimeline = function(item, collection) {
	lexiconId = item.pk;
	lexiconTitle = item.title;
	query_string = item.query;
	console.log("showTimeline() lexiconId: " + lexiconId + ", lexiconTitle: " + lexiconTitle + ", collection: " + collection);

	setQueryMetadata(item);

	storeLexiconID(lexiconId); // query.js
	storeLexiconTitle(lexiconTitle); // query.js
	storeLexiconQuery(query_string); // query.js
	storeCollectionUsed(collection); // query.js

	var sparksDD = dijit.byId('sparksDropDownButton');
	if (sparksDD !== undefined) {
		sparksDD.closeDropDown();
	}

	// select the tab containing the timeline
	var tc = dijit.byId("articleContainer");
	tc.selectChild(dijit.byId("timeline"));

	loadGraphData(lexiconId);
};


function loadGraphData(lexiconId) {
	burstData = {};
	burstIntervalIndex = 0;
	burstAnimation = false;

	getDataForInterval(lexiconId, 0, function() {
		createGraph();

		var intervalIndex = 0;

		var continueFunction = function() {
			if (++intervalIndex < intervals.length) {
				getDataForInterval(lexiconId, intervalIndex, continueFunction);
			}
		};

		continueFunction();
	});
}


function findValue(start, end, data, startIndex) {
	if (data[0].start > end) return [0, 0];
	if (data[data.length - 1].end < start) return [0, data.length];
	for (indx = startIndex; indx < data.length; indx++) {
		if (data[indx].end < start) continue;
		return [data[indx].value, indx];
	}
	return [0, data.length];
}


function getDataForInterval(lexiconId, intervalIndex, callback) {
	var interval = intervals[intervalIndex];

	getData(lexiconId, interval, function(data) {
		// Detect bursts (mean + 2 * stddev)
		var mean = d3.mean(data, function(d) {
			return d.value;
		});
		var stddev = Math.sqrt(d3.mean(data, function(d) {
			return Math.pow(d.value - mean, 2);
		}));

		var burstLimit = mean + 2 * stddev;

		if (detectBursts) $.each(data, function(index, entry) {
			entry.burst = entry.value > burstLimit;
		});

		// Set the data, range and statistics
		burstData[intervalIndex] = {
			data: data,
			range: [0, d3.max(data, function(d) {
				return d.value;
			})],

			// Compute the extent of the data set for dates
			dateRange: [d3.min(data, function(d) {
					return d.start;
				}),
				d3.max(data, function(d) {
					return d.end;
				})
			],
			mean: mean,
			stddev: stddev
		};
		console.log("Loaded " + data.length + " data points for burst with interval " + interval + ".");

		// Set data for animation
		if (intervalIndex > 0) {
			var originalData = burstData[intervalIndex - 1].data;

			burstData[intervalIndex].animationData = [];
			var startIndex = 0;
			for (index = 0; index < burstData[intervalIndex].data.length; index++) {
				var result = findValue(burstData[intervalIndex].data[index].start,
					burstData[intervalIndex].data[index].end, originalData, startIndex);
				// Copy original data
				var newDatum = {};
				$.extend(newDatum, burstData[intervalIndex].data[index]);
				newDatum.value = result[0];
				burstData[intervalIndex].animationData.push(newDatum);
				startIndex = result[1];
			}
		}

		// Retrieve the data for the next interval
		callback(burstData[interval]);
	});
}


function getData(lexiconId, interval, callback) {
	var timeline_url = "query/timeline/" + lexiconId + "/" + interval;

	var config = getConfig();
	var collection = retrieveCollectionUsed();
	timeline_url = timeline_url + "?collection=" + collection;

	if (config.timeline.normalize) {
		timeline_url += "&normalize=1";
	} else {
		timeline_url += "&normalize=0";
	}

	console.log("timeline_url: " + timeline_url);

	$.ajax({
		url: timeline_url,
		type: 'GET',
		dataType: 'json',
		processData: false,
		success: function(rawData) {
			// Prepare data
			var data = [];

			$.each(rawData, function(key, value) {
				data.push({
					start: new Date(key),
					end: getEndOfInterval(new Date(key), interval),
					value: value[0],
					index: value[2],
					count: value[4], // doc count shown in tooltip
					docs: value[5] // doc ids
				});
			});

			data = data.sort(function(a, b) {
				return a.start - b.start;
			});
			callback(data);

		},
		error: function(xhr, message, error) {
			console.error("Error while loading timeline data:", message);
			throw (error);
		}
	});
}


function getEndOfInterval(date, interval) {
	if (interval == "year") {
		var d = new Date(date.getTime());
		d.setFullYear(date.getFullYear() + 1);
		return d;
	}

	if (interval == "month") {
		return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate(),
			date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
	}

	if (interval == "week") {
		return new Date(date.getTime() + 7 * 24 * 3600000 - 1);
	}

	if (interval == "day") {
		return new Date(date.getTime() + 24 * 3600000 - 1);
	}

	if (interval == "hour") {
		return new Date(date.getTime() + 3600000 - 1);
	}

	if (interval == "10m") {
		return new Date(date.getTime() + 10 * 60000 - 1);
	}

	if (interval == "5m") {
		return new Date(date.getTime() + 5 * 60000 - 1);
	}

	if (interval == "minute") {
		return new Date(date.getTime() + 60000 - 1);
	}
}


function createGraph() {
	var config = getConfig();

	// Create a place for the chart
	var collection = retrieveCollectionUsed();
	var dest = dojo.byId("chartDiv");
	if (dest === null) {
		$('#timeline').append('<div id="chartDiv" style="width: 100%; height: 280px; float: center;"></div>');
	} else {
		dest.innerHTML = ""; // Clear existing destination
	}

	var w = $("#chartDiv").width() - 70,
		h = $("#chartDiv").height(),
		x = d3.time.scale().range([50, w - 20]),
		y = d3.scale.linear().range([h - 20, 0]);
	console.log("createGraph() w=" + w + ", h=" + h); // debug: sometimes the graph is compressed to a small width

	// Update the scale domains.
	x.domain(burstData[burstIntervalIndex].dateRange);
	y.domain(burstData[burstIntervalIndex].range);

	// An SVG element
	var svg = d3.select("#chartDiv").append("svg:svg")
		.attr("width", w)
		.attr("height", h)
		.attr("pointer-events", "all")
		.append("svg:g")
		.call(d3.behavior.zoom().on("zoom", redraw));

	var body = svg.append("svg:g");

	function filterFunction(d) {
		if (d.end.getTime() < x.domain()[0])
			return false;
		if ((d.start.getTime() - (d.end.getTime() - d.start.getTime())) > x.domain()[1])
			return false;
		return true;
	}

	function redraw() {
		console.log("redraw()");

		if (burstAnimation) {
			return;
		} // Should only update X scale. Separate that from y scale? Can we do even that for area?

		// Use behavior instead of transform: 
		// https://github.com/mbostock/d3/blob/master/examples/zoom-pan/zoom-pan.html
		var previousXdomain = x.domain();
		if (d3.event) {
			d3.event.transform(x);
		}

		// Limit zooming in range
		var dateRange = burstData[burstIntervalIndex].dateRange;
		if (x.domain()[0] < dateRange[0]) {
			x.domain([dateRange[0], x.domain()[1]]);
		}
		if (x.domain()[1] > dateRange[1]) {
			x.domain([x.domain()[0], dateRange[1]]);
		}

		// Limit zooming to zoomLimit
		if ((x.domain()[1].getTime() - x.domain()[0].getTime()) < zoomLimit) {
			x.domain(previousXdomain);
		}

		// Prevent zooming out of Date range
		if (isNaN(x.domain()[0].getTime()) || isNaN(x.domain()[1].getTime())) {
			x.domain(previousXdomain);
		}

		// Close popup on zooming or panning
		if ((previousXdomain[0].getTime() != x.domain()[0].getTime() ||
				previousXdomain[1].getTime() != x.domain()[1].getTime())) {
			closePopup();
		}

		var ticksX = x.ticks(10);
		if (ticksX.length > 16) {
			ticksX = x.ticks(d3.time.years, 5);
		}
		if (ticksX.length > 16) {
			ticksX = x.ticks(d3.time.years, 10);
		}
		if (ticksX.length > 16) {
			ticksX = x.ticks(d3.time.years, 20);
		}

		var fx = x.tickFormat(10),
			fy = y.tickFormat(10),
			tx = function(d) {
				return "translate(" + x(d) + ",0)";
			},
			ty = function(d) {
				return "translate(0," + y(d) + ")";
			};

		// Regenerate x-ticks
		var gx = svg.selectAll("g.x")
			.data(ticksX, fx)
			.attr("transform", tx);

		var gxe = gx.enter().insert("svg:g", "a")
			.attr("class", "x")
			.attr("transform", tx);

		gxe.append("svg:line")
			.attr("stroke", "#555")
			.attr("y1", h - 20)
			.attr("y2", h - 15);

		gxe.append("svg:text")
			.attr("y", h - 12)
			.attr("dy", "1em")
			.attr("text-anchor", "middle")
			.text(fx);

		gx.exit().remove();

		// Regenerate y-ticks
		var gy = svg.selectAll("g.y")
			.data(y.ticks(10), String)
			.attr("transform", ty);

		gy.select("text")
			.text(fy);

		var gye = gy.enter().insert("svg:g", "rect")
			.attr("class", "y")
			.attr("transform", ty);

		gye.append("svg:line")
			.attr("stroke", "#555")
			.attr("x1", 45)
			.attr("x2", 50);

		gye.append("svg:text")
			.attr("x", 40)
			.attr("dy", ".35em")
			.attr("text-anchor", "end")
			.text(fy);

		gy.exit().remove();

		var newData;
		filteredData = burstData[burstIntervalIndex].data.filter(filterFunction);


		function nrOfBins(data) {
			var bins = data.length;
			if (bins > 1) {
				var binSize = data[0].end - data[0].start;
				if (binSize > 0) {
					bins = (data[data.length - 1].end - data[0].start) / binSize;
				}
				// else return the data.length
			}
			return bins;
		}

		if (nrOfBins(filteredData) < 10 && burstIntervalIndex < (intervals.length - 1) &&
			burstData[burstIntervalIndex + 1] !== undefined) {
			// Zoom in
			burstIntervalIndex += 1;
			console.log("Zooming in to interval " + intervals[burstIntervalIndex]);
			newData = burstData[burstIntervalIndex].data.filter(filterFunction);
			filteredData = burstData[burstIntervalIndex].animationData.filter(filterFunction);
		} else if (nrOfBins(filteredData) > 20 && burstIntervalIndex > 0 &&
			burstData[burstIntervalIndex - 1] !== undefined) {
			// Zoom out
			var zoomOutData = burstData[burstIntervalIndex - 1].data.filter(filterFunction);
			if (nrOfBins(zoomOutData) > 10) {
				burstIntervalIndex -= 1;
				console.log("Zooming out to interval " + intervals[burstIntervalIndex]);
				newData = burstData[burstIntervalIndex + 1].animationData.filter(filterFunction);
				filteredData = burstData[burstIntervalIndex + 1].data.filter(filterFunction);
			}
		}

		// Select all bursts
		var bursts = body.selectAll("rect.bursts")
			.data(filteredData);

		// Create new burst when needed
		// 'd' is the data, 'i' is the bar index: 0, 1, ..., 'this' is a svg rect class
		bursts.enter().append("svg:rect")
			.attr("class", "bursts")
			.attr("y", h - 20)
			.on("mouseover", function(d, i) {
				d3.select(this).transition().duration(300).style("opacity", 0.5);
			})
			.on("mouseout", function(d, i) {
				d3.select(this).transition().duration(300).style("opacity", 1.0);
			})
			.on("mouseup", function(d, i) {
				burstClicked(d, i, this);
			})
			.transition()
			.duration(1000)
			.attr("y", function(d) {
				return y(d.value);
			})
			.attr("height", function(d) {
				return h - 20 - y(d.value);
			});

		// Delete unneeded bursts and path
		bursts.exit().remove(); //call(exitTransition(burstUpdateFunction, 2500));

		function burstUpdateFunction(burst) {
			burst
				.attr("x", function(d) {
					return x(d.start);
				})
				.attr("width", function(d) {
					return Math.max(4, x(d.end) - x(d.start) + 1);
				})
				.style("opacity", 1)
				.style("fill", function(d) {
					if (config.timeline.burst_detect) {
						return (d.burst) ? "red" : "steelblue";
					} else {
						return "steelblue";
					}
				});
		}

		// Place bursts at right spot
		bursts.call(burstUpdateFunction);

		// Update tooltip document count
		body.selectAll("title").remove();
		bursts.append("svg:title")
			.text(function(d, i) {
				return d.value + " document" + ((d.value == 1) ? "" : "s");
			});

		// Update period
		svg.selectAll("text.period")
			.data([0])
			.enter().append("svg:text")
			.attr("class", "period")
			.attr("fill", "#555")
			.attr("x", 50)
			.attr("y", 22)
			.attr("dy", "1em")
			.attr("text-anchor", "left");

		var title = "Period: " + toDateString(beginDate) + " - " + toDateString(endDate); 
		if (beginDate2) {
			title += " & " + toDateString(beginDate2) + " - " + toDateString(endDate2);
		}
		title += ", Query title: " + retrieveLexiconTitle(); 

		svg.selectAll("text.period").text(title);

		// If we have newData, set up animation
		if (newData !== undefined) {
			burstAnimation = true;

			y.domain(burstData[burstIntervalIndex].range);

			body.selectAll("rect.bursts")
				.data(newData)
				.transition()
				.duration(2500)
				.call(burstUpdateFunction);
		}
	}
	redraw();


	// Raise the bars
	y.range([h - 20, 0]);

	if (dijit.byId('sparksDialog') === undefined) {
		var dialog = new dijit.TooltipDialog({
			id: 'sparksDialog',
			style: 'width: ' + dojo.position('chartDiv').w + 'px'
		});
	}

	var button = dijit.byId('sparksDropDownButton');
	if (button === undefined) {
		button = new dijit.form.DropDownButton({
			id: 'sparksDropDownButton',
			label: "Tooltip",
			dropDown: dialog,
			dropDownPosition: ["below"],
			style: 'position: absolute; left: 0; top: 280px; visibility: hidden;'
		});
	}

	dojo.place(button.domNode, 'chartDiv');
} // createGraph() 


function burstSearch(lexicon_query, date_range, max_records) {
	console.log("burstSearch()");

	accordionSelectChild("searchPane");

	var params = getSearchParameters(); // get user-changeable parameters from config
	params.query = lexicon_query; // insert the query string
	params.dateRange = date_range; // replace dateRange from the date widgets with the timeline bar dateRange
	params.maximumRecords = max_records;

	var url = "services/search/";
	dojo.xhrGet({
		url: url,
		content: params, // key:value pairs
		handleAs: "json", // HTML data returned from the server
		load: function(data) {
			console.log(data);
			dojo.byId("search-result").innerHTML = data.html; // put html text in panel
		},
		error: function(err) {
			console.error(err); // display the error
		}
	});
} // burstSearch()


function burstClicked(data, index, element) {
	console.log("burstClicked(): " + data.docs.length + " records");

	var i = index;
	var e = element;
	var d = data;

	var lexicon_id = retrieveLexiconID();
	var lexicon_title = retrieveLexiconTitle();
	var lexicon_query = retrieveLexiconQuery();
	console.log("id: " + lexicon_id + ", title: " + lexicon_title + ", query: " + lexicon_query);

	dijit.byId("query").set("value", lexicon_query); // show query in TextBox

	// show burst articles in accordion
	var start_date = toDateString(d.start); // toDateString() : toolbar.js
	var stop_date = toDateString(d.end); // toDateString() : toolbar.js
	var date_range = start_date + "," + stop_date;

	// retrieve all timeline bar records, not just the KB default 20
	// the timeline bar sometimes has a few less than found by search: the lexicon_daystatistic 
	// table may not exactly match the documents present in the db: just ask for the double count
	var max_records = 2 * data.docs.length;
	console.log("max_records: " + max_records);

	burstSearch(lexicon_query, date_range, max_records);

	dijit.byId('sparksDropDownButton').openDropDown();

	var template = '<b>{burst}{start} - {end}: {count} documents.</b><br /><br /><div id="cloud"></div>';
	var content = {
		burst: (d.burst) ? "Burst " : "",
		start: d.start.toString().substr(4, 11),
		end: d.end.toString().substr(4, 11),
		count: d.count
	};

	dijit.byId("sparksDialog").set("content", dojo.replace(template, content));

	// Load burst cloud here
	dojo.place(new dijit.ProgressBar({
		indeterminate: true
	}).domNode, dojo.byId("cloud"), "only");

	var collection = retrieveCollectionUsed();
	console.log("burst from: " + collection);
	var params = {
		collections: collection, // 	can be more than 1
		ids: d.docs.join(',') // cloud not by tag name, but by comma separated ids string
	};

	burstCloud(params);
} // burstClicked()


function burstCloud(params) {
	console.log("burstCloud()");
	params = getCloudParameters(params); // add user-changeable parameters from config

	dojo.xhrGet({
		url: "services/cloud",
		content: params,
		failOk: false, // true: No dojo console error message
		handleAs: "json",
	}).then(function(resp) {
		console.log("requesting task id for burstcloud");
		console.log(resp);

		if (resp.status != "ok") {
			console.error(resp.msg);
			closePopup();
			var title = "Cloud request failed";
			var buttons = {
				"OK": true
			};
			genDialog(title, resp.msg, buttons);
			return;
		} else if (resp.result) {
			// this will be the case for single documents
			placeCloudInTarget("burst", resp, 'cloud');
			return;
		} else {
			console.log("Retrieved task_id: " + resp.task);
			return resp.task;
		}
	}, function(err) {
		console.error(err);
	}).then(function(task_id) {
		if (task_id) {
			console.log("Start polling!");
			console.log("task_id: " + task_id);
			check_status(task_id);
		} else {
			console.log('No task_id returned');
		}
	});
} // burstCloud()


function closePopup() {
	var sparksDD = dijit.byId('sparksDropDownButton');
	if (sparksDD !== undefined) {
		sparksDD.closeDropDown();
	}
} // closePopup()