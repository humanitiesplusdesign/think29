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

	var	attrsToExplode = ["Knowledge Networks", "Professional Networks", "Religious Networks", "Social Networks"];
	var tempArr = [];
	var tempRow = {};
	var card = 1;

	d3.tsv.parse(tsvData, function(d) {
		if(d["Date of birth"]) {
			d["Birth Year"] = d["Date of birth"].substring(0,4);
		}
		if(d["Date of death"]) {
			d["Death Year"] = d["Date of death"].substring(0,4);
		}
		d["Full Name"] = d["First Name"] + " " + d["Last Name"];
		d["Full Name Reversed"] = d["Last Name"] + d["First Name"];
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

			d["VIAF URL"] = "http://viaf.org/viaf/" + d["VIAF ID"];

			if(d["Wikipedia Image Link"] === undefined || d["Wikipedia Image Link"] === "") {
				if(d["Gender"] == "Male") {
					d["Wikipedia Image Link"] = "img/man.jpg";
				} else {
					d["Wikipedia Image Link"] = "img/woman.jpg";
				}
			}

			d["Religious Detail"] = d["Religious Networks"].split("_")[1] + "";
			d["Religious Networks"] = d["Religious Networks"].split("_")[0] + "";
			d["Knowledge Detail"] = d["Knowledge Networks"].split("_")[1] + "";
			d["Knowledge Networks"] = d["Knowledge Networks"].split("_")[0] + "";
			d["Professional Detail"] = d["Professional Networks"].split("_")[1] + "";
			d["Professional Networks"] = d["Professional Networks"].split("_")[0] + "";
			d["Social Detail"] = d["Social Networks"].split("_")[1] + "";
			d["Social Networks"] = d["Social Networks"].split("_")[0] + "";

			return d;
		});

	////////////////////////////////////////////////////////////////////
	//
	// Set up the dashboard.
	//
	////////////////////////////////////////////////////////////////////	

		var dash = dashboard().data(listData);
		dash.uniqueDimension("VIAF ID");
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
															attribute: "Gender",
															description: "Gender",
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
															attribute: "Birth Province or Region or State",
															description: "Birth Area"
														}, {
															attribute: "Death Province or Region or State",
															description: "Death Area"
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
															attribute: "Knowledge Networks",
															description: "Knowledge",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Professional Networks",
															description: "Professional"
														}, {
															attribute: "Religious Networks",
															description: "Religious"
														}, {
															attribute: "Social Networks",
															description: "Social"
														}, {
															attribute: "Knowledge Detail",
															description: "Knowledge Detail",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Social Detail",
															description: "Social Detail"
														}, {
															attribute: "Professional Detail",
															description: "Professional Detail"
														}, {
															attribute: "Religious Detail",
															description: "Religious Detail"
														}, {
															attribute: "Title",
															description: "Title"
														}]);
		dash.gridConfig({
			attributeKey: "VIAF ID",
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
				return d["VIAF URL"];
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