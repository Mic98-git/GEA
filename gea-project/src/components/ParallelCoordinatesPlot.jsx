import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const ParallelCoordinates = ({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
  const dimensions = ["magSource", "magType", "type", "dmin_category"];
  const svgRef = useRef();
  const [dim, setDim] = useState({ width: 800, height: 600 });
  const [data, setData] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState({});
  const activeBrushes = {};

  // Custom y-axis labels mapping
  const yAxisLabels = {
    magSource: "Magnitude Source",
    magType: "Magnitude Type",
    type: "Event Type",
    dmin_category: "Epicenter Nearest station",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await d3.csv(csvUrl).then(function (data) {
          const mappings = {};
          data.forEach((d) => {
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
          setData(data);
          setCategoryMappings(mappings);
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [csvUrl]);

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
      const updatedPaths = pathGroup.selectAll("path").data(dataToDisplay);

      updatedPaths
        .attr("d", path)
        .style("stroke", "steelblue")
        .style("opacity", 1);

      updatedPaths
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", 1.5)
        .style("opacity", 1);

      updatedPaths.exit().remove();
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
        // Hide previous tooltip and check for an active brush on this axis
        tooltip.style("opacity", 0);
        if (activeBrushes[dimension]) {
          tooltip
            .style("opacity", 1)
            .html(`Click to clear filter on ${yAxisLabels[dimension]}`)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        }
        else {
          tooltip
            .style("opacity", 1)
            .html(`Brush to filter by ${yAxisLabels[dimension]}`)
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        }
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, dimension) {
        if (activeBrushes[dimension]) {
          clearBrush(dimension);
          tooltip.style("opacity", 0);  // Hide tooltip after clearing
        }
      });

    // Add axis labels and delete buttons
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
      .style("user-select", "none");

    axis.selectAll("path, line").style("stroke", "white");

    // Add brushing
    const brush = d3
      .brushY()
      .extent([
        [-15, margin.top],
        [15, height - margin.bottom],
      ])
      .on("brush", brushed)
      .on("end", brushEnd);

    axis
      .append("g")
      .attr("class", "brush")
      .each(function (d) {
        d3.select(this).call(brush);
      });

    function getFilteredData() {
      return data.filter((d) => {
        return Object.keys(activeBrushes).every((dim) => {
          const [y0, y1] = activeBrushes[dim];
          const value = +d[dim];
          return y1 <= value && value <= y0;
        });
      });
    }

    function brushed(event, dimension) {
      const selection = event.selection;
      if (selection) {
        activeBrushes[dimension] = selection.map(y[dimension].invert);
      } else {
        delete activeBrushes[dimension];
      }

      const bData = getFilteredData();
      updatePaths(bData);
    }

    function brushEnd() {
      if (!Object.keys(activeBrushes).length) {
        updatePaths(data);
        applyFiltersToOthersCharts(data);
      } else {
        const filteredData = getFilteredData();
      }
    }

    function clearBrush(dimension) {
      // Remove the specific dimension from activeBrushes
      delete activeBrushes[dimension];
    
      // Clear the visual brush on the specific dimension
      axisGroup
        .select(`.axis:nth-child(${dimensions.indexOf(dimension) + 1}) .brush`)
        .call(brush.move, null);
    
      // Re-apply brushes for remaining dimensions
      axis.each(function(d) {
        if (activeBrushes[d]) {
          d3.select(this).call(brush.move, activeBrushes[d].map(y[d]));
        }
      });
    
      const bData = getFilteredData();
      updatePaths(bData);
    
      // Apply filters to other charts (if applicable)
      applyFiltersToOthersCharts(bData);
    }    

    // Send the filtered IDs to the parent component
    const applyFiltersToOthersCharts = (filteredData) => {
      const filteredIds = filteredData.map(d => d["id"]);
      onFilterChange(filteredIds);
    };

    // Apply the filtered IDs from the parent component
    const filteredData = data.filter((d) =>
      filteredEarthquakeIds.length === 0 || filteredEarthquakeIds.includes(d["id"])
    );
    updatePaths(filteredData);
  }, [data, categoryMappings, dim, filteredEarthquakeIds]);

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
};

export default ParallelCoordinates;