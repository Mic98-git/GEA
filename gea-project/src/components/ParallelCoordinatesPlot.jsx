import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const ParallelCoordinates = ({ csvUrl }) => {
  const dimensions = ["magType", "type", "locationSource", "magSource", "depth_category"];
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState({});

  useEffect(() => {
    d3.csv(csvUrl).then(data => {
      const mappings = {};
      data.forEach(d => {
        Object.keys(d).forEach(key => {
          if (dimensions.includes(key)) {
            const [category, numericValue] = d[key].split(':');
              d[key] = parseFloat(numericValue);

              // Create or update the category mapping
              if (!mappings[key]) mappings[key] = {};
              mappings[key][parseFloat(numericValue)] = category;
          }
        });
      });
      setData(data);
      setCategoryMappings(mappings);
      console.log(data.length);
    }).catch(error => {
      console.error("Error loading or parsing CSV data:", error);
    });
  }, [csvUrl]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svg.node().parentNode.clientWidth;
    const height = svg.node().parentNode.clientHeight;
    const margin = { top: 30, right: 30, bottom: 10, left: 30 };

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

    const x = d3.scalePoint()
      .range([margin.left, width - margin.right])
      .padding(1)
      .domain(dimensions);

    const y = {};
    dimensions.forEach(column => {
      y[column] = d3.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain(d3.extent(data, d => d[column])).nice();
    });

    const line = d3.line();
    const path = d => line(dimensions.map(p => [x(p), y[p](d[p])]));

    svg.selectAll("*").remove(); // Clear previous SVG content

    svg.append("g")
      .selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", "none")
      .style("stroke", "steelblue");

      const axis = svg.selectAll("g.axis")
      .data(dimensions)
      .enter().append("g")
      .attr("class", "axis")
      .attr("transform", d => `translate(${x(d)})`)
      .each(function(d) { 
        d3.select(this).call(d3.axisLeft(y[d])
          .tickFormat(value => categoryMappings[d] ? categoryMappings[d][value] : value));
      });

      axis.append("text")
      .style("text-anchor", "middle")
      .attr("y", margin.top - 15)
      .text(d => d)
      .style("fill", "white");
    }, [data]);

  return (
    <div className="parallel-coordinates">
      <svg ref={svgRef} />
    </div>
  );
};

export default ParallelCoordinates;