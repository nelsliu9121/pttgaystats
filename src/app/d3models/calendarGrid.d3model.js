nv.models.calendarGrid = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var interactiveLayer = nv.interactiveGuideline(),
        tip = d3.tip();

    var margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
    },
        width = null,
        height = null,
        container = null,
        useInteractiveGuideline = false,
        showLegend = true,
        dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd', 'elementClick'),
        color = nv.utils.defaultColor(),
        noData = null,
        duration = 500,
        ordinalCount = 10,
        headerFormatter = function (d, i) {
            return timeFormatter(d);
        },
        tipFormatter = function (d, i) {
            return d;
        },
        timeFormatter = d3.time.format("%Y-%-m-%-d"),
        padding = 2,
        clusterPadding = 2,
        gridSize = null;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();

        selection.each(function (data) {
            container = d3.select(this);
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            gridSize = Math.ceil((availableWidth - (clusterPadding * 11)) / 74);

            container
                .attr("width", availableWidth)
                .attr("height", availableHeight);

            chart.update = function () {
                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }
            container.selectAll('*').remove();

            // set up wrappers
            var wrap = container.selectAll('g.nv-wrap.nv-calendarGrid').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-calendarGrid').append("g");
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-interactive');
            gEnter.append('g').attr('class', 'nv-legends');
            gEnter.append('g').attr('class', 'nv-tip');
            var gridEnter = gEnter.append("g").attr("class", "nv-context");

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // set up interactive layer
            if (useInteractiveGuideline) {
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight)
                    .margin({
                        left: margin.left,
                        top: margin.top
                    })
                    .svgContainer(container);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            // tooltip
            tip.attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(tipFormatter);
            wrap.select(".nv-tip").call(tip);

            // nest
            var nest = d3.nest()
                .key(function (k) {
                    return k.date;
                })
                .rollup(function (leaves) {
                    return leaves.map(function (d) {
                        return d.value;
                    }).reduce(function (prev, curr) {
                        return prev + curr;
                    });
                })
                .sortKeys(d3.ascending)
                .entries(data.values);

            var nestValues = nest.map(function (d) {
                return d.values;
            });
            var leftBound = nestValues.sort(d3.ascending)[0];
            var rightBound = nestValues.sort(d3.descending)[0];

            var ordinal = d3.scale.quantize()
                .domain([leftBound, rightBound])
                .range(d3.range(ordinalCount));

            // legend
            if (showLegend) {
                var legends = wrap.select(".nv-legends")
                    .selectAll(".nv-legend")
                    .data(d3.range(ordinalCount))
                    .enter()
                    .append('rect')
                    .attr("class", function (d, i) {
                        return "nv-legend ordinal-" + i;
                    })
                    .attr("width", gridSize)
                    .attr("height", gridSize)
                    .attr("x", function (d, i) {
                        return (gridSize + padding) * i;
                    });

                legends.transition()
                    .duration(duration)
                    .attr("width", gridSize)
                    .attr("height", gridSize)
                    .attr("x", function (d, i) {
                        return (gridSize + padding) * i;
                    });

                var legendTexts = wrap.select(".nv-legends")
                    .selectAll(".nv-legendText")
                    .data([leftBound, rightBound])
                    .enter()
                    .append("text")
                    .style("text-anchor", "middle")
                    .attr("class", "nv-legendText")
                    .text(function (d) {
                        return d;
                    })
                    .style("font-size", (gridSize * 0.8) + "px")
                    .attr("dx", function (d, i) {
                        return (gridSize + padding) * ((i * (ordinalCount - 1)) + 0.5);
                    })
                    .attr("dy", gridSize * 2);

                legendTexts.transition()
                    .duration(duration)
                    .style("font-size", (gridSize * 0.8) + "px")
                    .attr("dx", function (d, i) {
                        return (gridSize + padding) * ((i * (ordinalCount - 1)) + 0.5);
                    })
                    .attr("dy", gridSize * 2);
            }
            wrap.select(".nv-legends").attr("transform", "translate(0, " + ((gridSize + padding) * 7 + 30) + ")");

            // start drawing
            var cluster = gridEnter.selectAll(".nv-cluster")
                .data(function (d) {
                    return d3.time.months(new Date(d.year, 0, 1), new Date(d.year + 1, 0, 1));
                })
                .enter()
                .append("g")
                .attr("class", "nv-cluster")
                .attr("transform", function (d, i) {
                    var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    var firstWeekOfYear = d3.time.weekOfYear(firstDayOfMonth);
                    return "translate(" + ((firstWeekOfYear + i) * (gridSize + padding) + i * clusterPadding) + ", 0)";
                });

            cluster.transition()
                .duration(duration)
                .attr("transform", function (d, i) {
                    var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    var firstWeekOfYear = d3.time.weekOfYear(firstDayOfMonth);
                    return "translate(" + ((firstWeekOfYear + i) * (gridSize + padding) + i * clusterPadding) + ", 0)";
                });

            var clusterHeader = cluster.append("text")
                .style("fill", "rgba(0,0,0,0.4)")
                .style("text-anchor", "middle")
                .style("font-size", (gridSize * 0.8) + "px")
                .attr("dx", function (d, i) {
                    var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    var firstWeekOfYear = d3.time.weekOfYear(firstDayOfMonth);
                    var lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    var lastWeekOfYear = d3.time.weekOfYear(lastDayOfMonth);
                    return (gridSize + padding) * (lastWeekOfYear - firstWeekOfYear + 1) * 0.5;
                })
                .text(headerFormatter);

            clusterHeader.transition()
                .duration(duration)
                .style("font-size", (gridSize * 0.8) + "px")
                .attr("dx", function (d, i) {
                    var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    var firstWeekOfYear = d3.time.weekOfYear(firstDayOfMonth);
                    var lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    var lastWeekOfYear = d3.time.weekOfYear(lastDayOfMonth);
                    return (gridSize + padding) * (lastWeekOfYear - firstWeekOfYear + 1) * 0.5;
                });

            cluster.append("line")
                .style("stroke", "rgba(0,0,0,0.4)")
                .style("stroke-width", "1px")
                .attr("x1", 0)
                .attr("y1", 8)
                .attr("x2", function (d, i) {
                    var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    var firstWeekOfYear = d3.time.weekOfYear(firstDayOfMonth);
                    var lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    var lastWeekOfYear = d3.time.weekOfYear(lastDayOfMonth);
                    return (gridSize + padding) * (lastWeekOfYear - firstWeekOfYear + 1);
                })
                .attr("y2", 8);

            cluster.append('g')
                .attr("class", "nv-cellGrid")
                .attr("transform", "translate(0, 15)");

            var cellGrid = cluster.select(".nv-cellGrid")
                .selectAll(".nv-cell")
                .data(function (d) {
                    return d3.time.days(new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 1));
                })
                .enter()
                .append("rect")
                .attr("class", function (d) {
                    var dateString = timeFormatter(d);
                    var nestLeaf = nest.find(function (d) {
                        return d.key == dateString;
                    }) || {
                            values: 0
                        };
                    var ordinalString = ordinal(nestLeaf.values);
                    return "nv-cell ordinal-" + ordinalString;
                })
                .style("stroke-width", "2px")
                .style("stroke", function (d) {
                    var today = timeFormatter(new Date());
                    var theDay = timeFormatter(d);
                    return (today == theDay) ? "#f90" : "transparent";
                })
                .attr("width", gridSize)
                .attr("height", gridSize)
                .attr("x", function (d) {
                    var firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
                    return (Math.ceil((d.getDate() + firstDay) / 7) - 1) * (gridSize + padding);
                })
                .attr("y", function (d) {
                    return d.getDay() * (gridSize + padding);
                })
                .attr("id", function (d) {
                    return timeFormatter(d);
                })
                .on("mouseover", onMouseOver)
                .on("mouseout", onMouseOut);

            cellGrid.transition()
                .duration(duration)
                .attr("width", gridSize)
                .attr("height", gridSize)
                .attr("x", function (d) {
                    var firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
                    return (Math.ceil((d.getDate() + firstDay) / 7) - 1) * (gridSize + padding);
                })
                .attr("y", function (d) {
                    return d.getDay() * (gridSize + padding);
                });

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            function onMouseOver(e) {
                tip.show(e);
                var el = d3.select(this);
                el.classed("active", true);
            }

            function onMouseOut(e) {
                tip.hide(e);
                var el = d3.select(this);
                el.classed("active", false);
            }
        });

        renderWatch.renderEnd('calendarGrid immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.interactiveLayer = interactiveLayer;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: {
            get: function () {
                return width;
            },
            set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            },
            set: function (_) {
                height = _;
            }
        },
        duration: {
            get: function () {
                return duration;
            },
            set: function (_) {
                duration = _;
            }
        },
        gridSize: {
            get: function () {
                return gridSize;
            },
            set: function (_) {
                gridSize = _;
            }
        },
        padding: {
            get: function () {
                return padding;
            },
            set: function (_) {
                padding = _;
            }
        },
        clusterPadding: {
            get: function () {
                return clusterPadding;
            },
            set: function (_) {
                clusterPadding = _;
            }
        },
        ordinalCount: {
            get: function () {
                return ordinalCount;
            },
            set: function (_) {
                ordinalCount = _;
            }
        },
        useInteractiveGuideline: {
            get: function () {
                return useInteractiveGuideline;
            },
            set: function (_) {
                useInteractiveGuideline = _;
            }
        },
        tipFormatter: {
            get: function () {
                return tipFormatter;
            },
            set: function (_) {
                tipFormatter = _;
            }
        },
        headerFormatter: {
            get: function () {
                return headerFormatter;
            },
            set: function (_) {
                headerFormatter = _;
            }
        },
        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            },
            set: function (_) {
                margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
                margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
                margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
                margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
            }
        },
        color: {
            get: function () {
                return color;
            },
            set: function (_) {
                color = nv.utils.getColor(_);
            }
        }
    });

    nv.utils.initOptions(chart);
    return chart;
};
