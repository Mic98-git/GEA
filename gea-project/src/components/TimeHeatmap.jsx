import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const TimeHeatmap = ({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [data, setData] = useState([]);
  const [selectedData, setSelectedData] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const d = await d3.csv(csvUrl);
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
    const margin = { top: 80, right: 50, bottom: 80, left: 100 };
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

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const updateCellColors = () => {
      g.selectAll("rect")
        .attr("stroke", (d, i) => {
          const colIndex = i % months.length;
          const rowIndex = Math.floor(i / months.length);
          const isInSelectedWeek = selectedWeeks.includes(weeks[rowIndex]);
          const isInSelectedMonth = selectedMonths.includes(months[colIndex]);
          const isSelectedCell = selectedData.some((cell) => cell.index === i);

          return isInSelectedWeek || isInSelectedMonth || isSelectedCell
            ? "black"
            : "none";
        })
        .attr("stroke-width", (d, i) => {
          const colIndex = i % months.length;
          const rowIndex = Math.floor(i / months.length);
          const isInSelectedWeek = selectedWeeks.includes(weeks[rowIndex]);
          const isInSelectedMonth = selectedMonths.includes(months[colIndex]);
          const isSelectedCell = selectedData.some((cell) => cell.index === i);

          return isInSelectedWeek || isInSelectedMonth || isSelectedCell
            ? 1.5
            : 0;
        })
    };

    g.selectAll("rect")
      .data(data.flat())
      .enter()
      .append("rect")
      .attr("x", (d, i) => (i % months.length) * (cellWidth + cellSpacing))
      .attr("y", (d, i) => Math.floor(i / months.length) * (cellHeight + cellSpacing))
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", (d) => colorScale(d))
      .on("mouseover", function (event, d) {
        tooltip.style("opacity", 1);
        tooltip
          .html(`<strong>Events:</strong> ${d}`)
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      })
      .on("click", function () {
        const rect = d3.select(this);
        const index = g.selectAll("rect").nodes().indexOf(rect.node());

        const month = months[index % months.length];
        const week = weeks[Math.floor(index / months.length)];
        const cellData = { index, month, week };

        setSelectedData((prevSelected) => {
          const alreadySelected = prevSelected.some(
            (cell) => cell.index === index
          );
          if (alreadySelected) {
            return prevSelected.filter((cell) => cell.index !== index);
          } else {
            return [...prevSelected, cellData];
          }
        });
      });

    updateCellColors();

    // Add week labels (rows)
    g.selectAll(".weekLabel")
      .data(weeks)
      .enter()
      .append("text")
      .attr("class", "weekLabel")
      .text((d) => d)
      .attr("x", -margin.left / 3)
      .attr("y", (d, i) => i * (cellHeight + cellSpacing) + cellHeight / 2)
      .attr("dy", ".32em")
      .style("text-anchor", "middle")
      .style("-webkit-user-select", "none")
      .style("user-select", "none")
      .style("cursor", "pointer")
      .style("opacity", d => selectedWeeks.length === 0 || selectedWeeks.includes(d) ? 1 : 0.2)
      .on("click", (event, d) => {
        const weekIndex = weeks.indexOf(d);

        setSelectedWeeks((prevSelected) => {
          const newSelectedWeeks = prevSelected.includes(d)
            ? prevSelected.filter((week) => week !== d)
            : [...prevSelected, d];

          const newSelectedData = data.flatMap((_, rowIndex) => {
            const cellIndex = weekIndex * months.length + rowIndex;

            const isInSelectedMonth = selectedMonths.includes(months[rowIndex]);

            // Add to selectedData only if it is in the selected week and either it was not
            // previously selected or it is still in the selected months.
            if (
              newSelectedWeeks.includes(d) ||
              isInSelectedMonth
            ) {
              return { index: cellIndex, month: months[rowIndex], week: d };
            }

            return [];
          });

          setSelectedData(newSelectedData);
          return newSelectedWeeks;
        });
      });

    // Add month labels (columns)
    g.selectAll(".monthLabel")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "monthLabel")
      .text((d) => d)
      .attr("x", (d, i) => i * (cellWidth + cellSpacing) + cellWidth / 2)
      .attr("y", -margin.top / 3)
      .attr("dy", ".32em")
      .style("text-anchor", "middle")
      .style("-webkit-user-select", "none")
      .style("user-select", "none")
      .style("cursor", "pointer")
      .style("opacity", d => selectedMonths.length === 0 || selectedMonths.includes(d) ? 1 : 0.2)
      .on("click", (event, d) => {
        const monthIndex = months.indexOf(d);

        setSelectedMonths((prevSelected) => {
          const newSelectedMonths = prevSelected.includes(d)
            ? prevSelected.filter((month) => month !== d)
            : [...prevSelected, d];

          const newSelectedData = data.flatMap((_, weekIndex) => {
            const cellIndex = weekIndex * months.length + monthIndex;

            const isInSelectedWeek = selectedWeeks.includes(weeks[weekIndex]);

            // Add to selectedData only if it is in the selected month and either it was not
            // previously selected or it is still in the selected weeks.
            if (
              newSelectedMonths.includes(d) ||
              isInSelectedWeek
            ) {
              return { index: cellIndex, month: d, week: weeks[weekIndex] };
            }

            return [];
          });

          setSelectedData(newSelectedData);
          return newSelectedMonths;
        });
      });

    // Add color legend (same as before)
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

    const legendScale = d3
      .scaleLinear()
      .domain(colorScale.domain())
      .range([0, totalCellWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .tickValues(colorScale.ticks().filter((t) => t !== 0))
      .tickFormat(d3.format(".0f"))
      .tickSize(legendHeight / 2);

    const axisGroup = svg
      .append("g")
      .attr("transform", `translate(${legendX},${legendY + legendHeight})`)
      .call(legendAxis);

    axisGroup.select(".domain").remove();

    axisGroup
      .selectAll("line")
      .style("stroke", "white")
      .style("stroke-width", "1px")
      .attr("y2", 4);

    axisGroup
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "white")
      .style("-webkit-user-select", "none")
      .style("user-select", "none");

    svg
      .append("text")
      .attr("x", legendX - 10 * cellSpacing)
      .attr("y", legendY + legendHeight)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text(0)
      .style("-webkit-user-select", "none")
      .style("user-select", "none");

    svg
      .append("text")
      .attr("x", legendX + totalCellWidth + 12 * cellSpacing)
      .attr("y", legendY + legendHeight)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text(d3.max(data.flat()))
      .style("-webkit-user-select", "none")
      .style("user-select", "none");
  }, [data, selectedData, selectedWeeks, selectedMonths, dimensions, filteredEarthquakeIds]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="time-heatmap">
      <svg ref={svgRef} />
    </div>
  );
};

export default TimeHeatmap;