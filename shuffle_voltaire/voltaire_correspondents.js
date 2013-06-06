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

	var people = null,
			peopleToNetworks = null,
			peopleComplete = false,
			peopleToNetworksComplete = false,
			peopleToWiki = null,
			peopleToWikiComplete = false,
			voltaireCorrespondents = d3.map(),
			voltaireCorrespondentsComplete = false;

	// Cross-origin request works locally in Safari but not Chrome
	d3.tsv("./data/People.tsv", function(d) { return d; }, function(error, rows) {
		people = rows.reduce( function(prev, curr ) {
			prev.set(curr.PeopleID, curr);
			return prev;
		}, d3.map());
		peopleComplete = true;
		checkComplete();
	});

	d3.tsv("./data/lettersFromVoltaire.tsv", function(d) { return d; }, function(error, rows) {
		var toVoltaire = rows.forEach(function(r) {
			voltaireCorrespondents.set(r["To Voltaire"], true);
		});

		d3.tsv("./data/lettersFromVoltaire.tsv", function(d) { return d; }, function(error, rows) {
			var fromVoltaire = rows.forEach(function(r) {
				voltaireCorrespondents.set(r["From Voltaire to"], true);
			});

			voltaireCorrespondentsComplete = true;
			checkComplete();
		});

		checkComplete();
	});

	d3.tsv("./data/EEpeopleWithVIAFandWikipedia.tsv", function(d) { return d; }, function(error, rows) {
		peopleToWiki = rows.reduce( function( prev, curr) {
			prev.set(curr.PeopleID, curr);
			return prev;
		}, d3.map());
		peopleToWikiComplete = true;
		checkComplete();
	});

	d3.tsv("./data/Networks_eepeople.tsv", function(d) { return d; }, function(error, rows) {
		peopleToNetworks = [];

		// We need to convert this data set so that there is one row for every combination of
		// values in the various "Network" attribute columns.

		var	attrsToExplode = ["KnowledgeNetwork", "ProfessionalNetwork", "ReligiousNetwork", "SocialNetwork"];
		var tempArr = [];
		var tempRow = {};
		var card = 1;

		rows.map(function(r) {  // Start by splitting the comma-delimited values into arrays
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

				peopleToNetworks.push(r);
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

					peopleToNetworks.push(tempRow);
				});
			}
		});

		peopleToNetworksComplete = true;
		checkComplete();
	});

	function checkComplete() {
		if(peopleComplete &&
				peopleToNetworksComplete &&
				peopleToWikiComplete &&
				voltaireCorrespondentsComplete) {
			renderDashboard();
		}
	}

	function renderDashboard() {
		var person = null;
		var undefPerson = {
			BirthCountry: null,
			BirthYear: null,
			Birthplace: null,
			DeathCountry: null,
			DeathYear: null,
			Deathplace: null,
			Nationality: null,
			FullName: null
		};

		var undefWiki = {
			WikipediaURL: "http://www.wikipedia.org/",
			FullNameReversed: "__No Record",
			WikipediaImageURL: "img/man.jpg"
		};

		var listData = peopleToNetworks.map(function(d) {
			person = people.get(d.PeopleID);
			wiki = peopleToWiki.get(d.PeopleID);

			if(person === undefined) {
				person = undefPerson;
			}

			if(wiki === undefined) {
				wiki = $().extend({}, undefWiki);

				// If the person is a woman, override the default man.jpg image
				if(person.Gender == "Female") {
					wiki.WikipediaImageURL = "img/woman.jpg";
				}
			}

			if(wiki.WikipediaURL === undefined || wiki.WikipediaURL === "") {
				wiki.WikipediaURL = "http://www.wikipedia.org";
			}

			if(wiki.WikipediaImageURL === undefined || wiki.WikipediaImageURL === "") {
				if(person.Gender == "Male") {
					wiki.WikipediaImageURL = "img/man.jpg";
				} else {
					wiki.WikipediaImageURL = "img/woman.jpg";
				}
			}

			// We need to cast strings to strings or we get in trouble with CrossFilter.
			return {
				personID: d.PeopleID,
				BirthCountry: person.BirthCountry + "",
				BirthYear: person.BirthYear,
				BirthPlace: person.BirthPlace + "",
				DeathCountry: person.DeathCountry + "",
				DeathYear: person.DeathYear,
				DeathPlace: person.DeathPlace + "",
				Gender: d.Gender + "",
				Nationality: person.Nationality + "",
				Name: person.FullName + "",
				Knowledge: d.KnowledgeNetwork.split("_")[0] + "",
				KnowledgeDetail: d.KnowledgeNetwork.split("_")[1] + "",
				Professional: d.ProfessionalNetwork.split("_")[0] + "",
				ProfessionalDetail: d.ProfessionalNetwork.split("_")[1] + "",
				Religious: d.ReligiousNetwork.split("_")[0] + "",
				ReligiousDetail: d.ReligiousNetwork.split("_")[1] + "",
				Social: d.SocialNetwork.split("_")[0] + "",
				SocialDetail: d.SocialNetwork.split("_")[1] + "",
				WikiLink: wiki.WikipediaURL + "",
				ImageLink: wiki.WikipediaImageURL + "",
				FullNameReversed: wiki.FullNameReversed + ""
			};
		}).filter(function(r) {
			return voltaireCorrespondents.has(r.personID);
		});

		var dash = dashboard().data(listData);
		dash.uniqueDimension("personID");
		dash.expandedListConfig([{
															attribute: "BirthCountry",
															description: "Birth Country",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "DeathCountry",
															description: "Death Country",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Gender",
															description: "Gender"
														}, {
															attribute: "Nationality",
															description: "Nationality"
														}]);
		dash.collapsedListConfig([{
															attribute: "BirthPlace",
															description: "Birth Place"
														}, {
															attribute: "DeathPlace",
															description: "Death Place"
														}, {
															attribute: "Name",
															description: "Name",
															configuration: [{
																func: "width",
																args: [200]
															}, {
																func: "resort",
																args: [true]
															}]
														}, {
															attribute: "Knowledge",
															description: "Knowledge",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
															attribute: "Professional",
															description: "Professional"
														}, {
															attribute: "Religious",
															description: "Religious"
														}, {
															attribute: "Social",
															description: "Social"
														}, {
															attribute: "KnowledgeDetail",
															description: "Knowledge Detail",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}, {
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
														}, {
															attribute: "DeathYear",
															description: "Death Year",
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
														}, {
															attribute: "ReligiousDetail",
															description: "Religious Detail",
															configuration: [{
																func: "width",
																args: [200]
															}]
														}]);
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
		});
		dash.timelineConfig([
			{
				attributeKey: "BirthYear",
				title: "Birth Year",
				height: 100,
				width: 1000,
				groupBy: 1
			}, {
				attributeKey: "DeathYear",
				title: "Death Year",
				height: 100,
				width: 1000,
				groupBy: 1
			}
		]);
		dash(d3.select("#dashboard"));

	}
}