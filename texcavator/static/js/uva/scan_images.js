/*
FL-12-Mar-2013 Created
FL-15-Nov-2013 Changed

Functions:
	function scanImages( record_id )
	function scanImagesKB( record, metadata_xml )
	function generateImageForPage( record )
	function scanImageStaBi( collection, record_id )
*/


	function scanImages( collection, record_id, zipfile )
	{
		// this KB specific
		console.log( "scanImages: collection: " + collection + ", record_id: " + record_id + ", zipfile: " + zipfile );

		var urn = record_id.split( ':' ).slice( 0, 3 ).join( ':' );
		// e.g record_id -> urn: ddd:010434315:mpeg21:a0003:ocr -> ddd:010434315:mpeg21

		// retrieve the metadata XML from KB
		dojo.xhrGet({
			url: "services/kb/resolver/?id=" + urn,
			handleAs: "json",
			load: function( json_data )
			{	
				if( json_data.status != "SUCCESS" )
				{
					console.warn( "scanImagesKB: " + json_data.msg );
					var title = "Retrieving KB metadata  failed";
					var buttons = { "OK": true };
					genDialog( title, json_data.msg, buttons );
					return json_data;
				}
				else
				{
					var record_noocr = record_id.split( ':' ).slice( 0, 4 ).join( ':' );
					// e.g record_id -> urn: ddd:010434315:mpeg21:a0003:ocr -> ddd:010434315:mpeg21:a0003
					var metadata_xml = json_data.text;
				//	dojo.publish( "/kb/record/metadata/loaded", [ record_noocr, metadata_xml ] );
					scanImagesKB( record_noocr, metadata_xml );
					return metadata_xml;
				}
			},
			error: function( err ) { console.error( err ); return err; }
		});
	} // scanImages()



	function scanImagesKB( record, metadata_xml )
	{
	//	console.log( "/kb/record/metadata/loaded: " + record );
		console.log( "scanImagesKB: " + record );
	//	console.log( metadata_xml );

		var doc = dojox.xml.parser.parse( metadata_xml );

		var items = doc.firstChild.getElementsByTagNameNS( "urn:mpeg:mpeg21:2002:02-DIDL-NS", "Item" );
		var recordItems = [];
		dojo.forEach(items, function( item ) {
			var article_id = item.getAttributeNS( "http://www.kb.nl/namespaces/ddd", "article_id" );
			if( article_id == record ) { recordItems.push(item); }
		});

		// close panes of previous articles before creating new ones
		var tabs = dijit.byId( "articleContainer" ).getChildren();
		for( var tab = 2; tab < tabs.length; tab++ )
		{
			var cp = tabs[ tab ];
			var cp_id = cp.get( "id" );
		//	console.log( cp_id );
			if( cp_id === "kb-original" || cp_id === "kb-pane" )
			{ dijit.byId( "articleContainer" ).closeChild( cp ); }
		//	{ dijit.byId( "articleContainer" ).removeChild( cp ); }
		}

		for( var item = 0; item < recordItems.length; item++ )
		{
			dijit.byId( "articleContainer" ).addChild(
				new dijit.layout.ContentPane({
					id: "kb-original",
					title: ( recordItems.length > 1 ) ? "Page " + (parseInt(item) + 1) : "Scan",
					content: generateImageForPage( recordItems[ item ] )
				})
			);
		}

		for( var item = 0; item < recordItems.length; item++ )
		{
			var identifier = recordItems[item].getAttributeNS( "http://purl.org/dc/elements/1.1/", "identifier" );
			var article_id = recordItems[item].getAttributeNS( "http://www.kb.nl/namespaces/ddd", "article_id" );

			var art_ident_list = identifier.split( ":" );			// ddd:010013335:mpeg21:p013:a0001
			var article_id_list = article_id.split( ":" );			// ddd:010013335:mpeg21:a0295
			art_ident_list[ art_ident_list.length - 1 ] = article_id_list[ article_id_list.length - 1 ];	// replace last element
			var art_ident = art_ident_list.join( ":" );				// ddd:010013335:mpeg21:p013:a0295

			var kbPane = new dijit.layout.ContentPane({
				id: "kb-pane",
				title: (recordItems.length > 1) ? "KB: Page " + (parseInt( item ) + 1) : "View at KB",
				content: ''
			});
			dijit.byId( "articleContainer" ).addChild( kbPane );

			dojo.create( "label", { id: "kb-pane-art-ident", }, kbPane.domNode );
			
			kbPane.controlButton.onClick = function( art_ident ) 
			{
			//	console.log( "kbPane.controlButton.onClick " + art_ident );
				// label read by ready function
				var kblabel = dojo.byId( "kb-pane-art-ident" );
				kblabel.innerHTML = art_ident;

				// this function no longer gets called with Dojo version >= 1.8
				return function () {
					var articleurl = 'http://kranten.kb.nl/view/article/id/' + art_ident;
					console.log( "articleurl: " + articleurl );
					var newwindow = window.open( articleurl, 'kb', '' );
					if( window.focus ) { newwindow.focus(); }
					return false;
				};
			} ( art_ident );
		}
	} // scanImagesKB()



	function generateImageForPage( record )
	{
		console.log( "generateImageForPage()" );
		// Find common bounding box
		var top, right, bottom, left;
		var min = function( a, b ) { return ( a == undefined ) ? b : Math.min( a, b ); }
		var max = function( a, b ) { return ( a == undefined ) ? b : Math.max( a, b ); }
		var i = function( s ) { return parseInt( s ); }

	//	var areas = record.getElementsByTagName("area");
		console.log( typeof( record ) );
		if( dojo.isMozilla )
		{
			console.log( "isMozilla" );
			var areaTagName = "dcx:area";
		}
		else
		{
			console.log( "is?" );
			var areaTagName = "area";
		}
		var areas = record.getElementsByTagName( areaTagName );
		
		/*
		var areas = record.getElementsByTagName("area");
		if( areas.length == 0 )
			areas = record.getElementsByTagName("dcx:area");
		*/

		dojo.forEach(areas, function(area) {
			top    = min(top,      area.getAttribute("vpos"));
			right  = max(right,  i(area.getAttribute("hpos")) + i(area.getAttribute("width")));
			bottom = max(bottom, i(area.getAttribute("vpos")) + i(area.getAttribute("height")));
			left   = min(left,     area.getAttribute("hpos"));
		});

		var scale = 0.3;
		var identifier = record.parentNode.getAttributeNS("http://purl.org/dc/elements/1.1/", "identifier");
		
		var url = "http://imageviewer.kb.nl/ImagingService/imagingService?colour=89c5e7";
		url += "&coords=" + identifier + ":alto";
		url += "&id=" + identifier + ":image";
		url += "&words=" + escape(dojo.byId("query").value);
		url += "&r=0&s=" + scale;

		if( areas.length === 0 )	// use some dummy coordinates
		{
			var x = 0;
			var y = 0;
			var w = 500;
			var h = 200;
		}
		else
		{
			var x = Math.floor(scale*left);
			var y = Math.floor(scale*top);
			var w = Math.ceil( scale*(right-left)+1);
			var h = Math.ceil( scale*(bottom-top)+1);
		}
		url += "&x=" + x + "&y=" + y;
		url += "&w=" + w + "&h=" + h;
	//	console.log( "img url: + " + url );

		return '<img src="' + url + '" />';
	} // generateImageForPage()



	function scanImageStaBi( collection, record_id, zipfile )
	{
		console.log( "scanImageStaBi(): record_id: " +  record_id + ", zipfile: " + zipfile );

		var url = "services/scan/?id=" + record_id + "&zipfile=" + zipfile;
		console.log( "url: " + url );

		var tabs = dijit.byId( "articleContainer2" ).getChildren();
		for( var tab = 0; tab < tabs.length; tab++ )
		{
			var cp = tabs[ tab ];
			var cp_id = cp.get( "id" );
			if( cp_id === "stabi-original" )
			{ dijit.byId( "articleContainer2" ).closeChild( cp ); }
		}

		dijit.byId( "articleContainer2" ).addChild(
			new dijit.layout.ContentPane({
				id : "stabi-original",
				title : "Scan",
				content : '<img src="' + url + '" />'
			})
		);

	} // scanImageStaBi()

// [eof]