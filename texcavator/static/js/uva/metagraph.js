
// create metadata graphics
function metadataGraphics( query )
{
	console.log( "metadataGraphics()" );

	var params = getSearchParameters();
	params["query"] = query;

    dojo.xhrGet( {
        url: "services/metadata/",
        handleAs: "json",
        content: params,
    }).then(function( response ) {
        // Retrieve the data
        data_articletype = response['articletype']['buckets'];
        data_distribution = response['distribution']['buckets'];
        data_newspapers = [{ "key": "Newspapers", "values": response['newspapers']['buckets'] }];

        // Creates article_type pie chart
        nv.addGraph(function() {
            var chart = nv.models.pieChart()
                .x(function(d) { return d.key })
                .y(function(d) { return d.doc_count })
                .valueFormat(d3.format(",d"))
                .showLabels(true);

            d3.select("#chart_articletype svg")
                .datum(data_articletype)
                .transition().duration(1200)
                .call(chart);

            return chart;
        });

        // Creates distribution pie chart
        nv.addGraph(function() {
            var chart = nv.models.pieChart()
                .x(function(d) { return d.key })
                .y(function(d) { return d.doc_count })
                .valueFormat(d3.format(",d"))
                .showLabels(true);

            d3.select("#chart_distribution svg")
                .datum(data_distribution)
                .transition().duration(1200)
                .call(chart);

            return chart;
        });

        // Create newspapers bar chart
        nv.addGraph(function() {
            var chart = nv.models.multiBarHorizontalChart()
                .x(function(d) { return d.key })
                .y(function(d) { return d.doc_count })
                .margin({top: 30, right: 20, bottom: 50, left: 175})
                .valueFormat(d3.format(",d"))
                .showValues(true)
                .tooltips(true);

            chart.yAxis
                .tickFormat(d3.format(",d"));

            d3.select("#chart_newspapers svg")
                .datum(data_newspapers)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
	}, function( err ) { console.error( err ); }
	);
}

// [eof]
