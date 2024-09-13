import { useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";

const ParallelCoordinates = memo(({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
  const dimensions = ["net", "magType", "type", "dmin_category"];
  const svgRef = useRef();
  const brushSelectionRef = useRef(null);
  const brushedIdsRef = useRef([]);
  const activeBrushesRef = useRef({});
  const isBrushingRef = useRef(false);
  const [dim, setDim] = useState({ width: 800, height: 600 });
  const [data, setData] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState({});

  // Custom y-axis labels mapping
  const yAxisLabels = {
    net: "Reporting Network",
    magType: "Magnitude Scale",
    type: "Event Type",
    dmin_category: "Epicenter Nearest Station"
  };

  const categoryDescriptions = {
    uw: "Pacific Northwest Seismic Network (PNSN), operated by the University of Washington.",
    uu: "University of Utah Seismograph Stations (UUSS), monitoring the Intermountain West region.",
    us: "United States Geological Survey (USGS), monitoring seismic activity in the U.S. and globally.",
    tx: "Texas Seismological Network, monitoring seismic activity primarily in Texas.",
    pr: "Puerto Rico Seismic Network, focused on seismic activity around Puerto Rico and the Caribbean.",
    nm: "New Madrid Seismic Zone Network, monitoring the central U.S.",
    nc: "Northern California Seismic System (NCSS), operated by the USGS and University of California, Berkeley.",
    ci: "California Institute of Technology, part of the Southern California Seismic Network.",
  };

  const magTypeDescriptions = {
    mww: "Moment Magnitude (Mww) - Calculated from the seismic moment, generally for large earthquakes.",
    mwr: "Regional Moment Magnitude (Mwr) - A variant of moment magnitude for regional events.",
    mwc: "Centroid Moment Magnitude (Mwc) - A specific type of moment magnitude calculation using centroid.",
    mwb: "Broadband Moment Magnitude (Mwb) - Derived from broadband seismic data.",
    ml: "Local Magnitude (Ml) - Also known as the Richter scale, used for small to medium earthquakes.",
    md: "Duration Magnitude (Md) - Calculated from the duration of seismic waves, often for smaller events.",
    mb_lg: "Lg Magnitude (Mb_Lg) - Uses Lg surface waves for magnitude calculation, common in North America.",
    mb: "Body Wave Magnitude (Mb) - Based on P-waves, typically used for deeper earthquakes.",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await d3.csv(csvUrl).then(function (csvData) {
          const mappings = {};
          csvData.forEach((d) => {
            d.id = +d.id;
            Object.keys(d).forEach((key) => {
              if (dimensions.includes(key)) {
                const [category, numericValue] = d[key].split(":");
                d[key] = parseFloat(numericValue);

                // Create or update the category mapping
                if (!mappings[key]) mappings[key] = {};
                mappings[key][parseFloat(numericValue)] = category;
              }
            });
          });
          setData(csvData);
          setCategoryMappings(mappings);
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svg.node().parentNode.clientWidth;
    const height = svg.node().parentNode.clientHeight;
    const margin = { top: 50, right: 30, bottom: 20, left: 30 };

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const x = d3
      .scalePoint()
      .range([margin.left, width - margin.right])
      .padding(0.5)
      .domain(dimensions);

    const y = {};
    dimensions.forEach((column) => {
      y[column] = d3
        .scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain(d3.extent(data, (d) => +d[column]))
        .nice();
    });

    const line = d3.line();
    const path = (d) => line(dimensions.map((p) => [x(p), y[p](d[p])]));

    // Remove previous content
    svg.selectAll("*").remove();

    // Draw paths in a separate group
    const pathGroup = svg.append("g").attr("class", "paths");

    function updatePaths(dataToDisplay) {
      const subsetPathCounts = new Map();
      const getPathString = (d) => dimensions.map((p) => d[p]).join(",");
    
      // Create a map to keep track of the path strings in the filtered data
      dataToDisplay.forEach((d) => {
        const pathString = getPathString(d);
        subsetPathCounts.set(pathString, (subsetPathCounts.get(pathString) || 0) + 1);
      });
    
      const allPaths = pathGroup.selectAll("path").data(data, (d) => d.id);
    
      const maxStrokeWidth = 7;
      const minStrokeWidth = 1;
    
      allPaths.enter().append("path")
        .merge(allPaths)
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", (d) => {
          const pathString = getPathString(d);
          if (subsetPathCounts.has(pathString)) {
            const count = subsetPathCounts.get(pathString) || 1;
            return minStrokeWidth + ((count - 1) / dataToDisplay.length) * (maxStrokeWidth - minStrokeWidth);
          } else {
            return 0.1;
          }
        })
        .style("opacity", (d) => {
          const pathString = getPathString(d);
          return subsetPathCounts.has(pathString) ? 1 : 0.05;
        })
        // Add mouseover and mouseout events for active paths in dataToDisplay
        .on("mouseover", function(event, d) {
          const pathString = getPathString(d);
          const count = subsetPathCounts.get(pathString) || 0;
          if (count > 0) {  // Only show tooltip for active paths
            tooltip
              .style("opacity", 1)
              .html(`<strong>Number of events:</strong> ${count}`)
              .style("left", `${event.pageX + 5}px`)
              .style("top", `${event.pageY - 28}px`);
          }
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function() {
          tooltip.style("opacity", 0);
        });
    }    

    // Draw axes
    const axisGroup = svg.append("g").attr("class", "axes");

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const axis = axisGroup
      .selectAll("g.axis")
      .data(dimensions)
      .enter()
      .append("g")
      .attr("class", "axis")
      .attr("transform", (d) => `translate(${x(d)})`)
      .each(function (d) {
        d3.select(this).call(
          d3
            .axisLeft(y[d])
            .tickFormat((value) =>
              categoryMappings[d] ? categoryMappings[d][value] : value
            )
        );
      })
      .on("mouseover", function (event, dimension) {
        if (activeBrushesRef.current[dimension] && !isBrushingRef.current) {
          tooltip
            .style("opacity", 1)
            .html(`Click to clear filter on ${yAxisLabels[dimension]}`)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        } else {
          tooltip.style("opacity", 0);
        }
        /*else {
          tooltip
            .style("opacity", 1)
            .html(`Brush to filter by ${yAxisLabels[dimension]}`)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        }*/
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", function (_, dimension) {
        tooltip.style("opacity", 0);
        if (activeBrushesRef.current[dimension]) {
          clearBrush(dimension);
        }
      });

    // Add axis labels
    axis
      .append("text")
      .style("text-anchor", "middle")
      .attr("y", margin.top - 25)
      .text((d) => yAxisLabels[d])
      .style("fill", "white")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("-webkit-user-select", "none")
      .style("user-select", "none");

    axis
      .selectAll(".tick text")
      .style("fill", "white")
      .style("font-size", "11px")
      .style("-webkit-user-select", "none")
      .style("user-select", "none")
      .on("mouseover", function (event, value) {
        const dimension = d3.select(this.parentNode.parentNode).datum();
        const cat = categoryMappings[dimension][value];
        let description = "";
        if (dimension === "net") {
          description = categoryDescriptions[cat] || "Unknown network";
        } else if (dimension === "magType") {
          description = magTypeDescriptions[cat] || "Unknown magnitude scale";
        } else {
          const category = categoryMappings[dimension] ? cat : value;
          description = `${category}`;
        }
        tooltip
          .style("opacity", 1)
          .html(description)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    axis.selectAll("path, line").style("stroke", "white");

    const brush = d3.brushY()
      .extent([
        [-10, margin.top],
        [10, height - margin.bottom],
      ])
      .on("start brush", (event, dimension) => {
        isBrushingRef.current = true;
        brushed(event, dimension)
      })
      .on("end", (event) => {
        isBrushingRef.current = false;
        brushEnd(event)
      });

    axis
      .append("g")
      .attr("class", "brush")
      .each(function (d) {
        d3.select(this).call(brush);
      });

    function getFilteredData() {
      return data.filter((d) => {
        return Object.keys(activeBrushesRef.current).every((dim) => {
          const [y0, y1] = activeBrushesRef.current[dim];
          const value = +d[dim];
          return y1 <= value && value <= y0;
        });
      });
    }

    function brushed(event, dimension) {
      const selection = event.selection;
      if (selection) {
        activeBrushesRef.current[dimension] = selection.map(y[dimension].invert);
      } else {
        delete activeBrushesRef.current[dimension];
      }

      const brushedData = getFilteredData();
      updatePaths(brushedData);
      brushedIdsRef.current = brushedData.map((d) => d.id);
    }

    function brushEnd(event) {
      isBrushingRef.current = false;
      tooltip.style("opacity", 0);

      if (Object.keys(activeBrushesRef.current).length === 0) {
        // If no brushes are active, show all paths
        updatePaths(data);
        applyFiltersToOthersCharts([]);
        brushedIdsRef.current = [];
        brushSelectionRef.current = null;
      } else {
        brushSelectionRef.current = event.selection;

        const newFilteredIds = getFilteredData().map((d) => d.id);

        const combinedFilteredIds = newFilteredIds.filter((id) => filteredEarthquakeIds.includes(id));

        brushedIdsRef.current = combinedFilteredIds;

        if (JSON.stringify(combinedFilteredIds) !== JSON.stringify(filteredEarthquakeIds)) {
          applyFiltersToOthersCharts(combinedFilteredIds);
        }
      }
    }

    if (brushSelectionRef.current) {
      axis.each(function (dim) {
        if (activeBrushesRef.current[dim]) {
          d3.select(this)
            .select(".brush")
            .call(brush.move, activeBrushesRef.current[dim].map(y[dim]));
        }
      });
    }

    function clearBrush(dimension) {
      if (!activeBrushesRef.current[dimension]) {
        return;  // No active brush on this dimension, nothing to clear.
      }

      delete activeBrushesRef.current[dimension];

      axisGroup
        .select(`.axis:nth-child(${dimensions.indexOf(dimension) + 1}) .brush`)
        .call(brush.move, null);

      // Update remaining brushes in the SVG
      axis.each(function (d) {
        if (activeBrushesRef.current[d]) {
          d3.select(this)
            .select(".brush")
            .call(brush.move, activeBrushesRef.current[d].map(y[d]));
        }
      });

      // Filter the data based on remaining active brushes
      const remainingBrushedData = getFilteredData();
      brushedIdsRef.current = remainingBrushedData.map((d) => d.id);

      // Update the paths to reflect the remaining brushes
      updatePaths(remainingBrushedData);

      // Send updated filtered IDs to the parent component
      applyFiltersToOthersCharts(brushedIdsRef.current);
    }

    // Apply the filtered IDs from the parent component
    const filteredData = data.filter((d) =>
      filteredEarthquakeIds.length === 0 || filteredEarthquakeIds.includes(d["id"])
    );
    updatePaths(filteredData);
  }, [data, categoryMappings, dim, filteredEarthquakeIds]);

  // Send the filtered IDs to the parent component
  function applyFiltersToOthersCharts(filteredIds) {
    onFilterChange(filteredIds);
  };

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        setDim({ width, height });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="parallel-coordinates">
      <svg ref={svgRef} />
    </div>
  );
});

export default ParallelCoordinates;