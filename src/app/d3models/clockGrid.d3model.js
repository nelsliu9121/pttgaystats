nv.models.clockGrid = function () {
    'use strict';

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var tip = d3.tip();

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
        showLabels = true,
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
        timeFormatter = d3.time.format("%H:%M"),
        padding = 2,
        clusterPadding = 2,
        radius = null,
        gridStep = 20,
        gridSize = 10,
        donutSize = 20;

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

            radius = Math.min(availableWidth, availableHeight) / 2 * 0.80;

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
            var wrap = container.selectAll('g.nv-wrap.nv-clockGrid').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-clockGrid').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-legends');
            gEnter.append('g').attr('class', 'nv-tip');
            var gridEnter = gEnter.append("g").attr("class", "nv-context");

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            gridEnter.attr("transform", "translate(" + (radius + donutSize * 2) + "," + (radius + donutSize) + ")");

            // nest
            var nest = d3.nest()
                .key(function (k) {
                    return k.time;
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

            wrap.select(".nv-legends").attr("transform", "translate(0, " + availableHeight + ")");

            // tooltip
            tip.attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d) {
                    var nestLeaf = nest.find(function (n) {
                        return timeFormatter(roundToTime(timeFormatter.parse(n.key))) == timeFormatter(d);
                    }) || {
                            key: timeFormatter(d),
                            values: 0
                        };
                    return tipFormatter(nestLeaf);
                });
            wrap.select(".nv-tip").call(tip);

            // start drawing
            var cluster = gridEnter.selectAll(".nv-cluster")
                .data(function (d) {
                    var thisDate = new Date(d.date),
                        thatDate = new Date(new Date(d.date).setDate(thisDate.getDate() + 1));
                    return d3.time.hours(thisDate, thatDate);
                })
                .enter()
                .append("g")
                .attr("class", "nv-cluster");

            var cellGrid = cluster.selectAll(".nv-cell")
                .data(function (d) {
                    var nextHour = new Date(new Date(d).setHours(d.getHours() + 1));
                    return d3.time.minutes(d, nextHour, gridStep);
                })
                .enter()
                .append("path")
                .attr("class", function (d) {
                    var nestLeaf = nest.find(function (n) {
                        return timeFormatter(roundToTime(timeFormatter.parse(n.key))) == timeFormatter(d);
                    }) || {
                            values: 0
                        };
                    return "nv-cell ordinal-" + ordinal(nestLeaf.values);
                })
                .style("stroke-width", "2px")
                .attr("d", d3.svg.arc()
                    .innerRadius(function (d, i) {
                        return donutSize + (i / ringCount()) * radius;
                    })
                    .outerRadius(function (d, i) {
                        return donutSize + ((i + 1) / ringCount()) * radius - padding;
                    })
                    .cornerRadius(5)
                    .startAngle(function (d) {
                        return (d.getHours() * 2 * Math.PI) / 24;
                    })
                    .endAngle(function (d) {
                        return ((d.getHours() + 1) * 2 * Math.PI) / 24;
                    })
                )
                .on("mouseover", onMouseOver)
                .on("mouseout", onMouseOut);

            if (showLabels) {
                var clusterLabelPath = cluster.append("defs")
                    .append("path")
                    .attr("id", function (d) {
                        return "label-" + d.getHours();
                    })
                    .attr("class", "nv-clusterLabelPath")
                    .attr("d", d3.svg.arc()
                        .innerRadius(radius + donutSize + padding)
                        .outerRadius(radius + donutSize + padding)
                        .startAngle(function (d) {
                            return (d.getHours() * 2 * Math.PI) / 24;
                        })
                        .endAngle(function (d) {
                            return ((d.getHours() + 1) * 2 * Math.PI) / 24;
                        })
                    );

                var clusterLabel = cluster.append("text")
                    .attr("text-anchor", "middle")
                    .attr("class", "nv-clusterLabel")
                    .append("textPath")
                    .attr("xlink:href", function (d) {
                        return "#label-" + d.getHours();
                    })
                    .attr("method", "align")
                    .attr("startOffset", "25%")
                    .text(function (d) {
                        return d.getHours();
                    });
            }

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

        renderWatch.renderEnd('clockGrid immediate');
        return chart;
    }
    //============================================================
    // Private Functions
    //------------------------------------------------------------
    var ringCount = function () {
        return Math.ceil(60 / gridStep);
    };
    var roundToTime = function (d) {
        var thisTime = new Date(d).setMinutes(0, 0, 0),
            thatTime = new Date(d).setHours(d.getHours() + 1, 0, 0, 0);
        var scale = d3.scale.quantize()
            .domain([thisTime, thatTime])
            .range(d3.time.minutes(thisTime, thatTime, gridStep));
        return scale(d);
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
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
        gridStep: {
            get: function () {
                return gridStep;
            },
            set: function (_) {
                gridStep = _;
            }
        },
        donutSize: {
            get: function () {
                return donutSize;
            },
            set: function (_) {
                donutSize = _;
            }
        },
        radius: {
            get: function () {
                return radius;
            },
            set: function (_) {
                radius = _;
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
