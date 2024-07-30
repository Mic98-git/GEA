import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const magnitudeCategoryColorMap = {
  minor: "#FFFF33",
  light: "green",
  moderate: "#8B4000",
  strong: "red",
  major: "purple"
};

const TSNEScatterplot = ({ csvUrl }) => {
  const svgRef = useRef();
  const [tSNEData, setTSNEData] = useState([]);

  useEffect(() => {
    d3.csv(csvUrl).then(function(data) {
      data.forEach(function(d) {
        d.tsne_x = +d.tsne_x;
        d.tsne_y = +d.tsne_y;
      });
      setTSNEData(data);
    });
  }, [csvUrl]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 700;
    const height = 470;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(tSNEData, (d) => d.tsne_x)).nice()
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(tSNEData, (d) => d.tsne_y)).nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = (g) =>
      g.attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)).selectAll("path, line, text") // Select paths, lines, and text
        .style("stroke", "white") // Set axis line color to white

    const yAxis = (g) =>
      g.attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y))
        .selectAll("path, line, text") // Select paths, lines, and text
        .style("stroke", "white") // Set axis line color to white

    svg.selectAll("*").remove(); // clear previous SVG content

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);

    svg
      .append("g")
      .attr("stroke", "black")
      .selectAll("circle")
      .data(tSNEData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.tsne_x))
      .attr("cy", (d) => y(d.tsne_y))
      .attr("r", 3)
      .attr("fill", (d) => {
        const category = d.magnitude_category;
        const color = magnitudeCategoryColorMap[category];
        return color || "#000000";
      });
  }, [tSNEData]);

  return (
    <div className="scatterplot">
      <svg ref={svgRef}></svg>
      <div className="legend">
      {Object.entries(magnitudeCategoryColorMap).map(([key, color]) => (
        <div key={key} className="legend-item">
          <span
            className="legend-circle"
            style={{
              background: color,
              width: 8,
              height: 8,
            }}
          ></span>
          <span className="legend-text">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
        </div>
      ))}
      </div>
    </div>
  );
};

export default TSNEScatterplot;