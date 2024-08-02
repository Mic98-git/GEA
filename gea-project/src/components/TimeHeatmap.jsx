import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const TimeHeatmap = ({ csvUrl }) => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        await d3.csv(csvUrl).then(function (d) {
          const dataMatrix = Array.from({ length: months.length }, () =>
            Array(weeks.length).fill(0)
          );
          d.forEach((row) => {
            const monthIndex = +row.month - 1;
            const weekIndex = +row.week - 1;
            if (
              monthIndex >= 0 &&
              monthIndex < 12 &&
              weekIndex >= 0 &&
              weekIndex < 4
            ) {
              dataMatrix[monthIndex][weekIndex] += 1;
            }
          });
          setData(dataMatrix);
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
    const margin = { top: 80, right: 50, bottom: 50, left: 100 };
    const cellSpacing = 2;
    const cellWidth = ((width - margin.left - margin.right) / months.length) - cellSpacing;
    const cellHeight = ((height - margin.top - margin.bottom) / weeks.length) - cellSpacing;
    const totalCellWidth = months.length * (cellWidth + cellSpacing);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const colorScale = d3
      .scaleSequential()
      .domain([0, d3.max(data.flat())])
      .interpolator(d3.interpolateOranges);

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("rect")
      .data(data.flat())
      .enter()
      .append("rect")
      .attr("x", (d, i) => (i % months.length) * (cellWidth + cellSpacing))
      .attr("y", (d, i) => Math.floor(i / months.length) * (cellHeight + cellSpacing))
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", (d) => colorScale(d));

    // Add week labels
    g.selectAll(".weekLabel")
      .data(weeks)
      .enter()
      .append("text")
      .attr("class", "weekLabel")
      .text((d) => d)
      .attr("x", -margin.left / 3)
      .attr("y", (d, i) => i * (cellHeight + cellSpacing) + cellHeight / 2)
      .attr("dy", ".32em")
      .style("text-anchor", "middle");

    // Add month labels
    g.selectAll(".monthLabel")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "monthLabel")
      .text((d) => d)
      .attr("x", (d, i) => i * (cellWidth + cellSpacing) + cellWidth / 2)
      .attr("y", -margin.top / 3)
      .attr("dy", ".32em")
      .style("text-anchor", "middle");

    // Add color legend
    const legendHeight = 10;
    const legendX = margin.left;
    const legendY = height - margin.bottom / 2;

    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "linear-gradient");

    linearGradient
      .selectAll("stop")
      .data(
        colorScale.ticks().map((t, i, n) => ({
          offset: `${(100 * i) / n.length}%`,
          color: colorScale(t),
        }))
      )
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    svg
      .append("g")
      .attr("transform", `translate(${legendX},${legendY})`)
      .append("rect")
      .attr("width", totalCellWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)");

    svg.append("text")
      .attr("x", legendX - 10 * cellSpacing)
      .attr("y", legendY + legendHeight)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text(0);

    svg.append("text")
      .attr("x", (legendX + totalCellWidth) + 10 * cellSpacing)
      .attr("y", legendY + legendHeight)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text(d3.max(data.flat()));
  }, [data]);

  return (
    <div className="time-heatmap">
      <svg ref={svgRef} />
    </div>
  );
};

export default TimeHeatmap;