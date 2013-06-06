function elastic_list() {

  // Colors from colorbrewer2.org

	var height = 400,
			width = 150,
			group = null,
      all = null,
      dimension = null,
      filter = d3.map(),
      mode = 0,  // 0 = filter, 1 = global, 2 = lock
      maxCells = Infinity,
      resort = false,
      selection = null,
      minCellHeight = 20,
      emptyCellHeight = 2,
      scrollbarWidth = 0,
      scrollbarElement = null,
      cellMargin = 2,
      cellWidth = function() {
        return width - cellMargin - scrollbarWidth;
      },
      backgroundColor = "white",
      initialGroupMetaData = { },
      initialGroups = [ ],
      initialCount = 0,
      initialCardinality = 0,
      uniqueDimension = null,

      groupValue = function(v) { return v; },
      groupDisplayValue = function(v) { return v; },

      // Sort ordering - g and h are groups (g.key and g.value are available)
      // By default, sort descending by value.
      compareFunction = function(g, h) {
        return h.value.count - g.value.count;
      },

      // Call this after filter selection/deselection
      callback = function() { return true; },

      // drawCell context
      cellColorScale = d3.scale.quantize().range(["#EFF3FF", "#BDD7E7", "#6BAED6", "#3182BD"]).domain([1,0]),
      cellSizeScale = null,
      emptyCellColor = "#D9D9D9",
      filterColor = "#A8DDB5",
      totalCount = 0,

      // cells.each(drawcell) - "this" is a svg "g" DOM object
      // default function can be over-ridden for fanciness
      redrawCell = function(sel) {
        var g = d3.select(sel);
        var rect = g.select("rect");
        var labelText = g.select(".label");
        var elementsText = g.select(".elements");

        rect.transition(500).delay(500).attr("height", function(d) {
              // Make sure cells have a minimum height.
              return cellHeight(cellSizeScale(d.group.value.count), d.group.value.count); })
            .attr("fill", function(d) {
              if(filter.has(d.group.key)) {
                return filterColor;
              } else {
                if(d.group.value.count === 0) {
                  return emptyCellColor;
                } else {
                  // Show the local profile by comparing the current % of the total for the group value to the
                  // initial % of total for the group value.
                  return cellColorScale(Math.abs((d.group.value.count / totalCount) - initialGroupMetaData[d.group.key].percentage));
                }
              }
            });

        g.transition(500).delay(1000).attr("transform", function(d, i) {
            return "translate(" + cellMargin + ", " + d.heightbefore + ")"; });

        labelText.text(function(d) { if(d.group.value.count !== 0) return groupDisplayValue(d.group.key); });
        elementsText
          .text(function(d) { if(d.group.value.count !== 0) return "" + d.group.value.count + " / " + initialGroupMetaData[d.group.key].value; });
      },

      // cells.each(drawcell) - "this" is a svg "g" DOM object
      // default function can be over-ridden for fanciness
      initializeCell = function(sel) {
        var g = d3.select(sel);
        var rect = g.select("rect");
        var labelText = g.select(".label");
        var elementsText = g.select(".elements");

        if(rect.empty()) {
          rect = g.append("rect")
              .attr("width", cellWidth())
              .on("click", function(d) {
                if(filter.has(d.group.key)) {
                  filter.remove(d.group.key);
                } else {
                  filter.set(d.group.key, true);
                }
                dimension.filter(function(v) {
                  return filter.has(groupValue(v)) || filter.keys().length === 0;
                });
                updateInternal();
                callback(); });
        }

        if(labelText.empty()) {
          labelText = g.append("text")
              .attr("class", "label")
              .attr("x", cellMargin)
              .attr("y", "1em")
              .attr("font-family", "Helvetica")
              .attr("font-size", "0.8em");
        }

        if(elementsText.empty()) {
          elementsText = g.append("text")
            .attr("class", "elements")
            .attr("x", cellWidth() - cellMargin)
            .attr("y", "1em")
            .attr("font-family", "Helvetica")
            .attr("font-size", "0.8em")
            .attr("text-anchor", "end");
        }
      };

  // "sel" should be an "svg" or "g" element.
  function my(sel) {
    selection = sel;
    selection.style("height", height).style("width", width).style("background-color", backgroundColor);

    group = dimension.group(groupValue);

    // Custom reducers to handle situations where there are multiple records for single "entity"
    // For example, we might have a data set of people and a person can have multiple occupations.
    // This is modeled with multiple records per person to show the mulitple occupations.

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
      group.reduce(reduceAdd, reduceRemove, reduceInitial);
      group.order(orderValue);
    }

    all = group.top(Infinity);

    // Save the initial count to calculate proportions for local profile.
    initialCount = all.reduce(function(prev, curr) { return prev + curr.value.count; }, 0);

    // Save hash of initial grouping values and percentages for local profile display.
    all.map(function(g){
      initialGroupMetaData[g.key] = { "value": g.value.count, "percentage": g.value.count / initialCount };
    });

    // Save off initial group values for global display, locking counts with deep-ish copy.
    all.map(function(g){
      initialGroups.push({ "key": g.key, "value": { "count": g.value.count } });
    });

    // Set sort order - default to frequency ordering
    initialGroups.sort(compareFunction);
    all.sort(compareFunction);

    // Save the initial cardinality for the cell height scale calculation.
    initialCardinality = all.length;

    initialize();

    return {  update: updateInternal,
              selection: selection,
              resetFilter: resetFilter,
              lockMode: lockMode,
              filter: getFilterText,
              globalMode: globalMode,
              filterMode: filterMode,
              mode: my.mode };
  }

  function initialize() {

    // Cells    
    var cells = selection.selectAll(".cell")
        .data(generate_cell_data(all),
              function(d) { return d.group.key; });

    cells.enter().append("g")
        .attr("class", "cell");

    // Use queue.js for delayed execution.
    var q = queue();
    function enqueueCellInitialize() { q.defer(initializeCell, this); }

    // Initialize the cells (this can be user-specified).
    cells.each(enqueueCellInitialize);

    q.defer(function() {
      // Scrollbars
      if(scrollbarElement !== null) {
        scrollbarElement.jScrollPane();
      }
    });

    q.defer(function() {
      updateInternal();
    });

  }

  function updateInternal() {

    if(resort) {
      all.sort(compareFunction);
    }

    if(mode != 2) {
      if(mode === 0){
        updateWithGroups(all);
      } else {
        updateWithGroups(initialGroups);
      }
    }

    function updateWithGroups(groups) {
      var cspacing = 5,
          ctopmargin = cspacing,
          cleftmargin = cspacing;

      // Update global parameters with values based on new filters.
      totalCount = groups.reduce(function(prev, curr) { return prev + curr.value.count; }, 0); // Count of all groups

      // Set up the scale we use to calculate cell height.
      cellSizeScale = d3.scale.linear()
        .range([0, height - ((initialCardinality + 1) * cellMargin)])
        .domain([0, totalCount]);

      // Cells    
      var cells = selection.selectAll(".cell")
          .data(generate_cell_data(groups),
                function(d) { return d.group.key; });

      if(resort) {
        cells.order();
      }

      // <nastiness>
      // Accumulator for totalHeight to which we'll stretch the selection
      var totalHeight = cellMargin; // Start with 0 height

      cells.each(function(){
        var cell = d3.select(this);
        var d = cell.datum();
        d.heightbefore = totalHeight; // Override to use scaled height for display
        totalHeight = totalHeight + cellHeight(cellSizeScale(d.group.value.count), d.group.value.count) + cellMargin;
        cell.datum(d); // Reset the data on the cell with the new height.
      });
      // </nastiness>

      // Use queue.js for delayed execution.
      var q = queue();
      function enqueueCellRedraw() {
        q.defer(redrawCell, this);
      }

      // Draw the cells (this can be user-specified).
      // Variables available:
      //
      //    totalCount = dimension.groupAll().value();
      cells.each(enqueueCellRedraw);

      // Stretch the height of the selection to the totalHeight.
      q.defer(function() {
        selection.style("height", totalHeight);
      });

      // Update scrollbars after all the cells finish rendering.
      q.defer(function() {
        if(scrollbarElement !== null && scrollbarElement.data('jsp') !== null) {
          scrollbarElement.data('jsp').reinitialise();
        }
      });

    }
  }

  // We generate an array of the data elements needed for cell in format
  // {  "group": a crossfilter group as represented as an element of group.all()
  //    "heightbefore": the number of elements in groups larger than this one }
  function generate_cell_data(groups) {

    var heightBefore = 0; // Accumulator for the size of the group before the current element.

    return groups.map(function(a, i) {
      heightBefore = heightBefore + a.value.value;

      return {
        "group": a,
        // This is raw size, but we'll scale to the real display height later
        "heightbefore": heightBefore - a.value.count
      };
    });
  }

  // Ensure that cells have a minimum height after being scaled however we're scaling them.
  function cellHeight(scaled, value) {
    if(scaled < minCellHeight) {
      if(value === 0) {
        return emptyCellHeight;
      } else {
        return minCellHeight;
      }
    } else {
      return scaled;
    }
  }

  function resetFilter() {
    filter = d3.map();
    dimension.filterAll();
  }

  function lockMode() {
    mode = 2;
  }

  function filterMode() {
    mode = 0;
    updateInternal();
  }

  function globalMode() {
    mode = 1;
    updateInternal();
  }

  function getFilterText() {
    return filter.keys().map(function(f) {
      return groupDisplayValue(f);
    }).join(", ");
  }

  my.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return my;
  };

  my.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    return my;
  };

  my.dimension = function(value) {
    if (!arguments.length) return dimension;
    dimension = value;
    return my;
  };

  my.callback = function(value) {
    if (!arguments.length) return callback;
    callback = value;
    return my;
  };

  my.redrawCell = function(value) {
    if (!arguments.length) return drawCell;
    drawCell = value;
    return my;
  };

  my.initializeCell = function(value) {
    if (!arguments.length) return initializeCell;
    initializeCell = value;
    return my;
  };

  my.groupValue = function(value) {
    if (!arguments.length) return groupValue;
    groupValue = value;
    return my;
  };

  my.groupDisplayValue = function(value) {
    if (!arguments.length) return groupDisplayValue;
    groupDisplayValue = value;
    return my;
  };

  my.compareFunction = function(value) {
    if (!arguments.length) return compareFunction;
    compareFunction = value;
    return my;
  };

  my.minCellHeight = function(value) {
    if (!arguments.length) return minCellHeight;
    minCellHeight = value;
    return my;
  };

  my.mode = function(value) {
    if (!arguments.length) return mode;
    mode = value;
    return my;
  };

  my.resort = function(value) {
    if (!arguments.length) return resort;
    resort = value;
    return my;
  };

  my.scrollbarWidth = function(value) {
    if (!arguments.length) return scrollbarWidth;
    scrollbarWidth = value;
    return my;
  };

  my.scrollbarElement = function(value) {
    if (!arguments.length) return scrollbarElement;
    scrollbarElement = value;
    return my;
  };

  my.uniqueDimension = function(value) {
    if (!arguments.length) return uniqueDimension;
    uniqueDimension = value;
    return my;
  };

  return my;
}