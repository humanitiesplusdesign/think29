var tsvData = null;

$(function() {

	$( "#file-selection-container" ).position({
		my: "center center",
		at: "center center",
		of: "#file-selection"
	});

	$( "input[type=submit]" )
		.button()
		.click(function( event ) {
			event.preventDefault();

			if($("#tsvFile").get(0).files[0] !== null) {
				var file = $("#tsvFile").get(0).files[0];
				var reader = new FileReader();

				reader.onloadend = function(e) {
					tsvData = this.result;

					$("#file-selection").hide();
					run();
				};

				$( "input[type=submit]" ).button("disable");
				reader.readAsText(file);
			} else {
				alert("Please select a file.");
			}
	});
});


function run() {

	////////////////////////////////////////////////////////////////////
	//
	// Load data
	//
	////////////////////////////////////////////////////////////////////	

	// Helper function for munging the Networks_eepeople data.
	// Cribbed from: 
	// http://stackoverflow.com/questions/15298912/javascript-generating-combinations-from-n-arrays-with-m-elements
	function cartesian(arg) {
    var r = [], max = arg.length-1;
    function helper(arr, i) {
        for (var j=0, l=arg[i].length; j<l; j++) {
            var a = arr.slice(0); // clone arr
            a.push(arg[i][j]);
            if (i==max) {
                r.push(a);
            } else
                helper(a, i+1);
        }
    }
    helper([], 0);
    return r;
	}

	var people = [];

	// We need to convert this data set so that there is one row for every combination of
	// values in the various "Network" attribute columns.

	var	attrsToExplode = ["Knowledge Network", "Professional Network", "Religious Network", "Social Network"];
	var tempArr = [];
	var tempRow = {};
	var card = 1;

	d3.tsv.parse(tsvData, function(d) {
		d["Birth Year"] = +d["Birth Year"];
		d["Death Year"] = +d["Death Year"];
		return d;
	}).map(function(r) {  // Start by splitting the comma-delimited values into arrays
		attrsToExplode.forEach(function(k) {
			tempArr = r[k].split(", ");
			r[k] = tempArr;
		});

		return r;
	}).forEach(function(r) {  // Then we have to add several rows to "peopleToNetworks" for each person.

		// Start by getting the cardinality (number of rows we need to create) by multiplying the 
		// length of all the arrays in the attributes we need to explode.
		card = attrsToExplode.reduce(function(p, c) {
			return p * r[c].length;
		}, 1);

		if(card == 1) { // If it's 1, then we only need one row.

			// Convert back to strings
			attrsToExplode.forEach(function(k) {
				tempArr = r[k];
				r[k] = tempArr.shift();
			});

			people.push(r);
		} else {        // It's multiple rows, so things get a little interesting.

			// Get the arrays of values of which we're going to take the cartesian product.
			tempArr = attrsToExplode.map(function(k) {
				return r[k];
			});

			// tempArr is now the cartesian product.
			tempArr = cartesian(tempArr);

			// Cycle through the cartesian product array and create new rows, then append them to
			// peopleToNetworks.

			tempArr.forEach(function(a) {
				tempRow = $().extend({}, r);

				attrsToExplode.forEach(function(k, i) {
					tempRow[k] = a[i];
				});

				people.push(tempRow);
			});
		}
	});

	renderDashboard();

	function renderDashboard() {

		var listData = people.map(function(d) {

			if(d["Wikipedia URL"] === undefined || d["Wikipedia URL"] === "") {
				d["Wikipedia URL"] = "http://www.wikipedia.org";
			}

			if(d["Wikipedia Image Link"] === undefined || d["Wikipedia Image Link"] === "") {
				if(d["GenderGroup"] == "Male") {
					d["Wikipedia Image Link"] = "img/man.jpg";
				} else {
					d["Wikipedia Image Link"] = "img/woman.jpg";
				}
			}

			// Handle links to images that don't include "http://"
			if(d["Wikipedia Image Link"].substring(0,6) !== "http://" &&
					d["Wikipedia Image Link"].substring(0,4) !== "img/") {
				d["Wikipedia Image Link"] = "http://" + d["Wikipedia Image Link"];
			}

			d["Religious Detail"] = d["Religious Network"].split("_")[1] + "";
			d["Religious Network"] = d["Religious Network"].split("_")[0] + "";
			d["Knowledge Detail"] = d["Knowledge Network"].split("_")[1] + "";
			d["Knowledge Network"] = d["Knowledge Network"].split("_")[0] + "";

			return d;
		});

	////////////////////////////////////////////////////////////////////
	//
	// Set up the dashboard.
	//
	////////////////////////////////////////////////////////////////////	

		var dash = dashboard().data(listData);
		dash.uniqueDimension("People ID");
		dash.expandedListConfig([{
															attribute: "Birth Country",
															description: "Birth Country",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Death Country",
															description: "Death Country",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "GenderGroup",
															description: "Gender/Group",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Nationality",
															description: "Nationality"
														}]);
		dash.collapsedListConfig([{
															attribute: "Birth City",
															description: "Birth City"
														}, {
															attribute: "Death City",
															description: "Death City"
														}, {
															attribute: "Full Name",
															description: "Name",
															configuration: [{
																func: "width",
																args: [200]
															}, {
																func: "resort",
																args: [true]
															}]
														}, {
															attribute: "Knowledge Network",
															description: "Knowledge",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Professional Network",
															description: "Professional"
														}, {
															attribute: "Religious Network",
															description: "Religious"
														}, {
															attribute: "Social Network",
															description: "Social"
														}, {
															attribute: "Knowledge Detail",
															description: "Knowledge Detail",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Religious Detail",
															description: "Religious Detail"
														}, {
															attribute: "Source",
															description: "Source"
														}, {
															attribute: "Ego Network",
															description: "Ego Network",
															configuration: [{
																func: "width",
																args: [250]
															}]
														}]);
		dash.gridConfig({
			attributeKey: "People ID",
			numberToDisplay: Infinity,
			titleFunc: function(d) {
				var fn = "No name";
				var sorted = "";
				if(d["Full Name"] !== "") fn = d["Full Name"];
				if(d["Full Name Reversed"] === "") sorted = " (unsorted)";
				return fn + sorted;
			},
			imageURLFunc: function(d) {
				return d["Wikipedia Image Link"];
			},
			subtitleFunc: function(d) {
				var by = "?";
				var dy = "?";
				if(d["Birth Year"] !== 0) by = d["Birth Year"];
				if(d["Death Year"] !== 0) dy = d["Death Year"];
				return "" + by + " - " + dy;
			},
			textFunc: function(d) {
				return d.Nationality;
			},
			linkFunc: function(d) {
				return d["Wikipedia URL"];
			},
			sortOptions: [
				{ title: "Name", attribute: "Full Name Reversed" },
				{ title: "Birth Year", attribute: "Birth Year" }
			]
		});
		dash.timelineConfig([
			{
				attributeKey: "Birth Year",
				title: "Birth Year",
				height: 100,
				width: 1000,
				groupBy: 1 // Use 10 for Decades
			}, {
				attributeKey: "Death Year",
				title: "Death Year",
				height: 100,
				width: 1000,
				groupBy: 1 // Use 10 for Decades
			}
		]);
		dash(d3.select("#dashboard"));

	}
}