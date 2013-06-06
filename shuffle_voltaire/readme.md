An Elastic List-based Dashboard for Humanities Data
===================================================

Use
---

dashboard.js defines a dasboard() function that generates a dashboard with 4 components based on an arbitrary data set:

1. Elastic lists navigation and filtering interface
2. Timeline-based display and filtering interface
3. Grid display of selected elements
4. Control bar displaying the current filters and sort-controls for the grid display

voltaire_correspondents.html provides an example of the type of dashboard that can be generated.

Create the base dashboard object like this:

	var dash = dashboard();

### Data

dashboard().data() takes an array of objects. Object keys define the columns/dimensions available in the dashboard.

	var dataArray = [
		{ personID: 123, BirthCountry: "England", Gender: "Male", BirthYear: 1640 },
		{ personID: 456, BirthCountry: "France", Gender: "Female" },
		{ personID: 789, BirthCountry: "Italy", Gender: "Male", BirthYear: 1710 }
	];

	dash.data(dataArray);

Dimensions must be naturally ordered!

### Configuration

The dashboard is linked to the data through configuration in the form of objects or arrays of objects. Configuration methods are:

	dash.expandedListConfig([{
		attribute: "BirthCountry",
		description: "Birth Country",
		configuration: [{
			func: "width",
			args: [200]
		}]
	}, {
		attribute: "Gender",
		description: "Gender"
	}]);

This array defines the dimensions that will be displayed as initially visible lists. The objects in the array can have the following structure:

* attribute: The key in the data that will be mapped to this list. Required.
* description: The text description that should be displayed for this dimension. Required.
* configuration: An array of objects that define functions and their arguments to be passed to the elastic list object defined in elastic_lists.js. Allowed constructions are:
	* { func: "width", args: [200] } - Defines the width of the list in pixels (default 150px)
	* { func: "resort", args: [true] } - Forces re-sorting after filtering (default "false")
	* { func: "compareFunction", args: [ function(g, h) { return g.key - h.key; } ] } - Overrides the natural ordering of the dimension with a user-defined function. Has the same format as the standard JavaScript Array [.sort()](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/sort) method.
	* { func: "groupValue", args: [ function(year) { return Math.floor(year/10)*10; } ] } - By default, groups are created for each value of the dimension. This function can be used to override the value used for grouping. Useful for forming user-defined groupings of dimension values. This example groups years into decades. May be used in conjunction with the "groupDisplayValue" configuration.
	* { func: "groupDisplayValue", args: [function(roundedYear) { return "" + roundedYear + " - " + (+roundedYear + 10); }] } - Override the standard display of group values. Useful in conjunction with "groupValue" configuration so that we can display a string that accurately represents the full range of values covered by the group.

Generally, look at example.js to see a working configuration example.

------

	dash.collapsedListConfig([{
		attribute: "BirthYear",
		description: "Birth Year",
		configuration: [{
			func: "compareFunction",
			args: [ function(g, h) { return g.key - h.key; } ]
		}, {
			func: "groupValue",
			args: [ function(year) { return Math.floor(year/10)*10; } ]
		}, {
			func: "groupDisplayValue",
			args: [function(roundedYear) {
				return "" + roundedYear + " - " + (+roundedYear + 10); }]
		}]
	}]

This configuration defines the list of collapsed lists. Only the descriptions of these dimensions are displayed in the left gutter, but they can be expanded if the user wishes. Objects in this array have exactly the same structure as those in the "expandedListConfig" array.

-------

	dash.gridConfig({
		attributeKey: "personID",
		numberToDisplay: Infinity,
		titleFunc: function(d) {
			return d.Name;
		},
		imageURLFunc: function(d) {
			return d.ImageLink;
		},
		subtitleFunc: function(d) {
			return "" + d.BirthYear + " - " + d.DeathYear;
		},
		textFunc: function(d) {
			return d.Nationality;
		},
		linkFunc: function(d) {
			return d.WikiLink;
		},
		sortOptions: [
			{ title: "Name", attribute: "FullNameReversed" },
			{ title: "Birth Year", attribute: "BirthYear" }
		]
	})

(Example above assumes dimensions exist that are not defined in previous examples.)

The 'gridConfig' method defines the configuration of the grid display. The object should have the following attributes:

* attributeKey: The dimension to base the grid display on.
* numberToDisplay: The number of cells to display in the grid. Can be an integer or "Infinity" to display all cells.
* titleFunc: A function that takes one row of data and returns the title of the cell for that row.
* imageURLFunc: A function that takes one row of data and returns the image of the cell for that row.
* subtitleFunc: A function that takes one row of data and returns the subtitle of the cell for that row.
* textFunc: A function that takes one row of data and returns the text of the cell for that row.
* linkFunc: A function that takes one row of data and returns the link that should be opened when the cell is clicked.
* sortOptions: An array defining the dimensions that the grid can be sorted on. This drives the sort option buttons in the toolbar above the grid. Objects have structure
		{ title: "Birth Year", attribute: "BirthYear" }

-------

	dash.timelineConfig([
		{
			attributeKey: "BirthYear",
			title: "Birth Year",
			height: 100,
			width: 400,
			groupBy: 10 // Decades
		}, {
			attributeKey: "DeathYear",
			title: "Death Year",
			height: 100,
			width: 400,
			groupBy: 10 // Decades
		}
	]);

'timelineConfig' sets the configuration of the timeline displays. This is an array of objects - 1 object per timeline. Objects have attributes:

* attributeKey: The key in the data to map to this dimension.
* title: The title/description of this dimension.
* height: The height of the timeline chart (does not include the margin around the chart)
* width: The width of the timeline chart (does not include the margin around the chart)
* groupBy: The number of adjacent values to group together when grouping the dimension

The dimension used here *must* be ordinal. This is best used for timeline displays of years, grouped into decades or centuries when necessary. The dimension can have missing values (missing years or decades) and the timeline display will fill them in as blank/0 values.

### Rendering

	dash(d3.select("#dashboard"));

Render the dashboard within the element defined by the selector.

Colophon
--------
* [D3.js](http://d3js.org)
* [Crossfilter](http://square.github.io/crossfilter/)
* [JQuery](http://jquery.com/)
* [JQueryUI](http://jqueryui.com/)
* [Queue.js](https://github.com/mbostock/queue)
* [JScrollPane](http://jscrollpane.kelvinluck.com/)