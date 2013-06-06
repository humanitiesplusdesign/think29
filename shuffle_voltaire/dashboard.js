////////////////////////////////////////////////////////////////////
//
// The elastic lists dashboard as encapsulated chart
//
////////////////////////////////////////////////////////////////////

function dashboard() {

	var data = null,
		expandedListConfig = [],
		collapsedListConfig = [],
		gridConfig = null,
		timelineConfig = null,
		timelineFilters = [],
		listMap = d3.map(),
		allKeys = function() {
			return expandedListConfig.concat(collapsedListConfig);
		},
		sortIndex = 0,
		timelineDimensions = [],
		brushes = [],
		uniqueDimension = null,
		filterColor = "#A8DDB5";

	function my(sel) {

		var xfilter = crossfilter(data);

		// Callback used to update all lists on filter action.
		var updateAll = function(action) {
			listMap.values().map(function(l) {
				// Only update non-collapsed nodes (jScrollPane manipulates the DOM so we have to go 2
				// more "parentNode"s up than we would have to without it).
				if(l.actions.selection.node() !== null) {
					if(!$(l.actions.selection.node().parentNode.parentNode.parentNode).hasClass("collapsed"))
						l.actions.update(action);
					}
				}
			);

			updateFilter();
			updateGrid();
			updateTimelines();
		};

		// Build HTML container for the dashboard.

		// Set up the toolbar
		var toolBar = sel.append("div")
			.attr("id", "toolbar");

		toolBar.append("button")
			.attr("id", "reset-button").text("Start Over");

		// Set up the filter display area.
		var filterDisplay = toolBar.append("span")
			.attr("id", "filter-display").text("Filters: ");

		var clists = sel.append("div").attr("id", "collapsed-lists");

		clists.append("div").attr("class", "list-title").text("Collapsed Lists");

		clistsScroll = clists.append("div").attr("id", "collapsed-scroll");
		clistsScroll.append("ul").attr("id", "sortable-collapsed")
			.selectAll("li").data(collapsedListConfig)
			.enter().append("li")
				.attr("class", "list-container")
				.each(buildCollapsedList);

		sel.append("ul").attr("id", "sortable-expanded")
			.selectAll("li").data(expandedListConfig)
			.enter().append("li")
				.attr("class", "list-container")
				.each(buildExpandedList);

		var timelineArea = sel.append("ul").attr("id", "timeline-area");

		// Set up the grid display area
		var gridArea = sel.append("div").attr("id", "grid-area");

		var timelineGroups = [];

		// Set up the actual timeline display.
		if(timelineConfig !== null) {
			timelineDimensions = timelineConfig.map(function(t) {
				return xfilter.dimension(function(d) { return d[t.attributeKey]; });
			});

			timelineFilters = timelineConfig.map(function() { return null; });

			timelineGroups = timelineConfig.map(function(t, i) {
				var g = timelineDimensions[i].group(function(d) { return Math.floor(d/t.groupBy)*t.groupBy; });

				// Don't double-count by using add/reduce based on unique dimension

				var internalCount;
				function reduceAdd(p, v) {
					if(p.unique.has(v[uniqueDimension])) {
					  internalCount = p.unique.get(v[uniqueDimension]);
					  p.unique.set(v[uniqueDimension], internalCount + 1);
					} else {
					  p.unique.set(v[uniqueDimension], 1);
					  ++p.count;
					}
					return p;
				}

				function reduceRemove(p, v) {
				  if(p.unique.has(v[uniqueDimension])) {
				    internalCount = p.unique.get(v[uniqueDimension]);
				    if(internalCount == 1) {
				      p.unique.remove(v[uniqueDimension]);
				      --p.count;
				    } else {
				      p.unique.set(v[uniqueDimension], internalCount - 1);
				    }
				  }
				  return p;
				}

				function reduceInitial() {
				  return {unique: d3.map(), count: 0};
				}

				function orderValue(p) {
      		return p.count;
    		}

				if(uniqueDimension !== null) {
				  g.reduce(reduceAdd, reduceRemove, reduceInitial);
				  g.order(orderValue);
				}

				return g;
			});

			var timelines = timelineArea.selectAll("li")
												.data(timelineGroups)
													.enter().append("li")
														.attr("style", function(d, i) {
															if(i > 0) {
																return "display: none";
															}
														})
														.attr("id", function(d, i) {
															return "timeline" + i;
														});

			timelines.append("div")
				.attr("class", "list-title")
				.text(function(d, i) {
					return timelineConfig[i].title;
				});

			timelines.each(initializeTimeline);
			timelines.each(updateTimeline);

		}

		// Set up the timeline selection buttons
		var timelineSelection = [];
		if(timelineGroups.length > 0) {
			timelineSelection = toolBar.append("span")
				.attr("id", "timeline-selection").text("Timeline:")
				.append("span").attr("id", "timeline-options");

			timelineSelection.selectAll("input").data(timelineGroups)
				.enter().append("input")
					.attr("type", "radio")
					.attr("id", function(d, i) {
						return "timelineselection" + i;
					})
					.attr("name", "timelineselection")
					.on("click", function(d, i) {
						timelineGroups.forEach(function(t, j) {
							var timelineId = "#timeline" + j;
							var tl = d3.select(timelineId);
							if(i==j) {
								tl.attr("style", "display: block");
							} else {
								tl.attr("style", "display: none");
							}
						});
					})
					.call(function(selection) {
						d3.select(selection[0][0]).attr("checked", "");
					});

			timelineSelection.selectAll("label").data(timelineGroups)
				.enter().append("label")
				.attr("for", function(d, i) {
					return "timelineselection" + i;
				}).text(function(d, i) { return timelineConfig[i].title; });

			// Make the timeline selection into a jQueryUI buttonset.
			$( "#timeline-selection" ).buttonset();
		}

		// Grid display sort selection options.
		var sortOptions = toolBar.append("span")
			.attr("id", "sort-selection").text("Sort grid by:")
			.append("span").attr("id", "sort-options");

		sortOptions.selectAll("input").data(gridConfig.sortOptions)
				.enter().append("input")
					.attr("type", "radio")
					.attr("id", function(d, i) {
						return "sortoption" + i;
					})
					.attr("name", "sortoption")
					.on("click", function(d, i) {
						sortIndex = i;
						updateGrid();
					})
					.call(function(selection) {
						d3.select(selection[0][0]).attr("checked", "");
					});

		sortOptions.selectAll("label").data(gridConfig.sortOptions)
			.enter().append("label")
			.attr("for", function(d, i) {
				return "sortoption" + i;
			}).text(function(d) { return d.title; });

		// Make the sort options into a jQueryUI buttonset.
		$( "#sort-options" ).buttonset();

		function updateFilter() {
			var filters = [];

			// Elastic list filters
			listMap.values().forEach(function(l) {
				if(l.actions.filter() !== "") {
					filters.push(l.actions.filter());
				}
			});

			timelineFilters.forEach(function(f) {
				if(f !== null) {
					filters.push(f);
				}
			});

			var filterText = "Filters: " + filters.join(", ");

			d3.select("#filter-display").text(filterText);
		}

		function initializeTimeline(d, i) {

			var t = d3.select(this),
					topNonZeroValues = null;

			// Handle the situation of a list with only null keys.
			if(t.datum().top(2).length > 1) {
				topNonZeroValues = t.datum().top(2).filter(function(d) { return d.key !== 0; });
			} else {
				topNonZeroValues = t.datum().top(1);
			}

			var margin = 20,
					groups = t.datum().all().filter(function(g) { return g.key !== 0; }),
					timelineGroups = buildTimelineGroups(groups, timelineConfig[i].groupBy),
					lowestTime = groups.reduce(function(a, b) { if(a > b.key) { return b.key; } else { return a; } }, 9999),
					highestTime = groups.reduce(function(a, b) {
													if(a < b.key) { return b.key; } else { return a; }
												}, 0) + timelineConfig[i].groupBy,
					x = d3.scale.linear().range([0, (timelineConfig[i].width - (2*margin))])
						.domain([lowestTime, highestTime]),
					y = d3.scale.linear().range([0, timelineConfig[i].height])
						.domain([0, topNonZeroValues[0].value.count]),
					ticks = timelineGroups.map(function(g) { return g.key; }),
					axis = d3.svg.axis().orient("bottom")
									.scale(x)
									.ticks(20)
									.tickFormat(d3.format("d")),
					brush = d3.svg.brush().x(x),
					height = timelineConfig[i].height + (2 * margin),
					width = timelineConfig[i].width,
					barWidth = Math.floor((timelineConfig[i].width - (2*margin)) / timelineGroups.length);

			var g = t.append("svg")
					.attr("height", height)
					.attr("width", width)
				.append("g")
					.attr("transform", "translate(" + margin + ", 0)");

			var rects = g.selectAll("rect")
				.data(timelineGroups);

			rects.enter().append("rect");

			rects.attr("class", "bar")
				.attr("width", function() { return barWidth - 0.25; })
				.attr("fill", "#3182BD");

			g.append("g")
				.attr("class", "axis")
				.attr("transform", "translate(0," + (height - margin + 1) + ")")
				.call(axis);

			brush.on("brushend", function() {
				var filterBottom = Math.floor(brush.extent()[0]/timelineConfig[i].groupBy)*timelineConfig[i].groupBy,
						filterTop = Math.ceil(brush.extent()[1]/timelineConfig[i].groupBy)*timelineConfig[i].groupBy;

      	if (brush.empty()) {
        	timelineDimensions[i].filterAll();
        	timelineFilters[i] = null;
      	} else {
      		timelineDimensions[i].filterRange([filterBottom, filterTop]);
					timelineFilters[i] = "" + filterBottom + " - " + filterTop;
      	}

				updateAll();
			});

			brushes.push(brush);

			var gBrush = g.append("g").attr("class", "brush")
										.attr("transform", "translate(0," + margin + ")")
										.call(brush);

			gBrush.selectAll("rect").attr("height", timelineConfig[i].height);
			gBrush.select(".extent").attr("fill", filterColor)
				.attr("fill-opacity", ".500");

		}

		function updateTimeline(d, i) {

			var t = d3.select(this),
					topNonZeroValues = null;

			// Handle the situation of a list with only null keys.
			if(t.datum().top(2).length > 1) {
				topNonZeroValues = t.datum().top(2).filter(function(d) { return d.key !== 0; });
			} else {
				topNonZeroValues = t.datum().top(1);
			}

			var margin = 20,
					groups = t.datum().all().filter(function(g) { return g.key !== 0; }),
					timelineGroups = buildTimelineGroups(groups, timelineConfig[i].groupBy),
					lowestTime = groups.reduce(function(a, b) { if(a > b.key) { return b.key; } else { return a; } }, 9999),
					highestTime = groups.reduce(function(a, b) {
													if(a < b.key) { return b.key; } else { return a; }
												}, 0) + timelineConfig[i].groupBy,
					x = d3.scale.linear().range([0, (timelineConfig[i].width - (2*margin))])
						.domain([lowestTime, highestTime]),
					y = d3.scale.linear().range([0, timelineConfig[i].height])
						.domain([0, topNonZeroValues[0].value.count]),
					height = timelineConfig[i].height + (2 * margin);

			var rects = t.select("svg").select("g").selectAll("rect")
				.data(timelineGroups);

			rects.transition().attr("height", function(d) { return y(d.value.count); })
				.attr("transform", function(d, i) {
					return "translate(" + x(d.key) + ", " + (height - y(d.value.count) - margin) + ")";
				});

		}

		// Fill in missing groupings
		function buildTimelineGroups(groups, groupBy) {
			var lowestTime = groups.reduce(function(a, b) { if(a > b.key) { return b.key; } else { return a; } }, 9999),
					highestTime = groups.reduce(function(a, b) {
													if(a < b.key) { return b.key; } else { return a; }
												}, 0) + groupBy,
					divisions = [highestTime];
					groupPosition = 0;

			while(divisions[0] > lowestTime) {
				divisions.unshift(divisions[0] - groupBy);
			}

			return divisions.map(function(d) {
				if(groups.length > groupPosition && groups[groupPosition].key == d) {
					groupPosition++;
					return { key: d, value: groups[groupPosition-1].value };
				} else {
					return { key: d, value: { count: 0 } };
				}
			});
		}

		function updateTimelines() {
			d3.select("#timeline-area").selectAll("li").each(updateTimeline);
		}

		// Set up the actual grid if we have configuration specified.
		if(gridConfig !== null) {

			// The grid dimension.
			var gridDimension = xfilter.dimension(function(d) { return d[gridConfig.attributeKey]; });

			// Groups
			var gridGroups = gridDimension.group();

			// The grid lookup.
			var gridLookup = d3.map();

			gridDimension.top(Infinity).forEach(function(d) {
				gridLookup.set(d[gridConfig.attributeKey], {
					title: gridConfig.titleFunc(d),
					imageURL: gridConfig.imageURLFunc(d),
					subtitle: gridConfig.subtitleFunc(d),
					text: gridConfig.textFunc(d),
					link: gridConfig.linkFunc(d),
					sortBy: gridConfig.sortOptions.map(function(s) { return d[s.attribute]; })
				});
			});

			gridArea.append("ul").attr("id", "grid-display");

			updateGrid();
		}

		// Function to update the grid in the future.
		function updateGrid() {
			if(gridConfig !== null) {
				var gridDisplay = d3.select("#grid-display");

				gridBoxes = gridDisplay.selectAll("li")
					.data(gridGroups.top(gridConfig.numberToDisplay).filter(function(d){
						return d.value !== 0;
					}), function(d) { return d.key; });

				gridBoxes.enter()
					.append("a")
						.attr("href", function(d) { return gridLookup.get(d.key).link; })
						.attr("class", "grid-link")
					.append("li")
						.attr("class", "grid-box").each(buildGridBox);

				gridBoxes.exit().remove();

				gridBoxes.sort(function(a, b) {
						if(gridLookup.get(a.key).sortBy[sortIndex] > gridLookup.get(b.key).sortBy[sortIndex]) {
							return 1;
						} else {
							return -1;
						}
					});
			}
		}

		function buildGridBox() {

			var gridBox = d3.select(this);

			gridBox.append("img").attr("src", function(d) {
				return gridLookup.get(d.key).imageURL;
			}).attr("class", "grid-image");

			gridBox.append("div").text(function(d){
				return gridLookup.get(d.key).title;
			}).attr("class", "grid-title");

			gridBox.append("div").text(function(d){
				return gridLookup.get(d.key).subtitle;
			}).attr("class", "grid-subtitle");

			gridBox.append("div").text(function(d){
				return gridLookup.get(d.key).text;
			}).attr("class", "grid-text");
		}

		// Build CrossFilter dimensions and D3 elastic_list charts.
		allKeys().map(function(k) {

			// Build CrossFilter dimension
			var dim = xfilter.dimension(function(d) { return d[k.attribute]; });

			// Build elastic_lists.js chart
			var chart = elastic_list().dimension(dim).callback(updateAll);

			// Set dashboard-wide unique dimension, which may be over-ridden by the configuration.
			chart.uniqueDimension(uniqueDimension);

			// Apply configuration to elastic_list.js chart
			if(k.configuration !== undefined) {
				k.configuration.map(function(c) {
					chart[c.func].apply(chart, c.args);
				});
			}

			// DOM id where we are going to put the chart.
			var domID = "#" + k.attribute.replace(' ','') + "chart";

			// Set up scrollbar configuration on the list.
			chart.scrollbarWidth(16);
			chart.scrollbarElement($( domID ).parent());

			// Stuff we'll need later to access the chart and update it.
			var o = {
				dimension: dim,
				chart: chart,
				actions: chart(d3.select(domID))  // This renders the chart.
			};

			listMap.set(k.attribute.replace(' ',''), o);

		});

		////////////////////////////////////////////////////////////////////
		//
		//	Scrolling for collapsed lists
		//
		////////////////////////////////////////////////////////////////////

		$("#collapsed-scroll").jScrollPane();

		////////////////////////////////////////////////////////////////////
		//
		//	Collapse/Expand buttons
		//
		////////////////////////////////////////////////////////////////////

		$(".collapse-button")
			.button()
			.on("click", function() {
				var button = $(this);
				var buttonLabel = button.children().first();
				var listContainer = $(this.parentNode);
				var list = listContainer.children(".list").first();
				var svg = list.children("svg").first();
				var modeButtons = listContainer.children(".mode-buttons").first();

				var moveToCollapsed = function() {
					listContainer.detach();
					list.addClass("collapsed");
					modeButtons.addClass("collapsed");
					buttonLabel.text("Expand");
					listContainer.appendTo($("#sortable-collapsed"));
					$("#collapsed-scroll").data('jsp').reinitialise();
				};

				if(buttonLabel.text() == "Collapse") {
					list.addClass("invisible", 500, moveToCollapsed);
					modeButtons.addClass("invisible", 500);
				} else {
					listContainer.detach(); // Remove the chart from the collapsed list
					listContainer.appendTo($("#sortable-expanded"));
					buttonLabel.text("Collapse");
					list.removeClass("collapsed");
					modeButtons.removeClass("collapsed");
					updateAll();            // Update all the charts (would be better to just update this one)
					list.removeClass("invisible", 500);
					modeButtons.removeClass("invisible", 500);
					$("#collapsed-scroll").data('jsp').reinitialise();
				}
			});

		////////////////////////////////////////////////////////////////////
		//
		//	Activate "Start Over" button.
		//
		////////////////////////////////////////////////////////////////////

		function resetFilters() {
			listMap.values().map(function(l) {
				l.actions.resetFilter();
			});

			brushes.forEach(function(b) {
				b.clear();
			});

			d3.selectAll(".extent").attr("width", 0);
			timelineDimensions.forEach(function(d) { d.filter(null); });
			timelineFilters = timelineFilters.map(function(f) { return null; });
		}

		$( "#reset-button" )
      .button()
      .click(function( event ) {
        resetFilters();
        updateAll();
    });

    ////////////////////////////////////////////////////////////////////
		//
		//	Make lists sortable
		//
		////////////////////////////////////////////////////////////////////

		$(function() {
			$( "#sortable-expanded" ).sortable().disableSelection();
			$( "#sortable-collapsed" ).sortable().disableSelection();
		});

	}

	function buildCollapsedList(x, i) {
		var li = d3.select(this);

		li.append("button")
			.attr("class", "collapse-button")
			.text("Expand");

		li.append("span").attr("class", "list-title").text(function(d) {
			return d.description;
		});

		li.append("div").attr("class", "list collapsed invisible")
			.append("svg").attr("id", function(d) {
				return d.attribute.replace(' ','') + "chart";
			});
	}

	function buildExpandedList(x, i) {
		var li = d3.select(this);

		li.append("button")
			.attr("class", "collapse-button")
			.text("Collapse");

		li.append("span").attr("class", "list-title").text(function(d) {
			return d.description;
		});

		li.append("div").attr("class", "list")
			.append("svg").attr("id", function(d) {
				return d.attribute.replace(' ','') + "chart";
			});
	}

  my.expandedListConfig = function(value) {
    if (!arguments.length) return expandedListConfig;
    expandedListConfig = value;
    return my;
  };

  my.collapsedListConfig = function(value) {
    if (!arguments.length) return collapsedListConfig;
    collapsedListConfig = value;
    return my;
  };

  my.gridConfig = function(value) {
    if (!arguments.length) return gridConfig;
    gridConfig = value;
    return my;
  };

  my.timelineConfig = function(value) {
    if (!arguments.length) return timelineConfig;
    timelineConfig = value;
    return my;
  };

  my.data = function(value) {
    if (!arguments.length) return data;
    data = value;
    return my;
  };

  my.uniqueDimension = function(value) {
    if (!arguments.length) return uniqueDimension;
    uniqueDimension = value;
    return my;
  };

  return my;
}