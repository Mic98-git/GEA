import { useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";

const TimeHeatmap = memo(
  ({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
    const svgRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [data, setData] = useState([]);
    const [selectedData, setSelectedData] = useState([]);
    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
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

    const filterData = (filteredWeeks, filteredMonths) => {
      // Start by filtering data based on filteredEarthquakeIds
      let filteredData = data;

      if (filteredEarthquakeIds.length > 0) {
        filteredData = data.filter((row) =>
          filteredEarthquakeIds.includes(row.id)
        );
      }

      // Aggregate the filtered data into a heatmap matrix
      const dataMatrix = Array.from({ length: months.length }, () =>
        Array(weeks.length).fill(0)
      );

      filteredData.forEach(({ month, week }) => {
        const monthIndex = month - 1;
        const weekIndex = week - 1;
        if (
          monthIndex >= 0 &&
          monthIndex < 12 &&
          weekIndex >= 0 &&
          weekIndex < 4
        ) {
          dataMatrix[monthIndex][weekIndex] += 1;
        }
      });

      // Now apply the week and month filters
      if (filteredWeeks.length > 0) {
        const weekIndexes = filteredWeeks.map((week) => weeks.indexOf(week));
        dataMatrix.forEach((monthData, monthIndex) => {
          monthData.forEach((_, weekIndex) => {
            if (!weekIndexes.includes(weekIndex)) {
              dataMatrix[monthIndex][weekIndex] = 0; // Set non-selected weeks to 0
            }
          });
        });
      }

      if (filteredMonths.length > 0) {
        const monthIndexes = filteredMonths.map((month) =>
          months.indexOf(month)
        );
        dataMatrix.forEach((_, monthIndex) => {
          if (!monthIndexes.includes(monthIndex)) {
            dataMatrix[monthIndex] = Array(weeks.length).fill(0); // Set non-selected months to 0
          }
        });
      }

      return dataMatrix;
    };

    useEffect(() => {
      const fetchData = async () => {
        try {
          const rawData = await d3.csv(csvUrl, (d) => ({
            id: +d.id,
            month: +d.month,
            week: +d.week,
          }));
          setData(rawData);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
      fetchData();
    }, [csvUrl]);

    useEffect(() => {
      if (data.length > 0) {
        const filteredData =
          filteredEarthquakeIds.length > 0
            ? data.filter((row) => filteredEarthquakeIds.includes(row.id))
            : data;

        const dataMatrix = Array.from({ length: months.length }, () =>
          Array(weeks.length).fill(0)
        );

        filteredData.forEach(({ month, week }) => {
          const monthIndex = month - 1;
          const weekIndex = week - 1;
          if (
            monthIndex >= 0 &&
            monthIndex < 12 &&
            weekIndex >= 0 &&
            weekIndex < 4
          ) {
            dataMatrix[monthIndex][weekIndex] += 1;
          }
        });

        setSelectedData(dataMatrix);
      }
    }, [data, filteredEarthquakeIds]);

    useEffect(() => {
      const ids = data
        .filter(
          (row) =>
            (selectedWeeks.length === 0 ||
              selectedWeeks.includes(weeks[row.week - 1])) &&
            (selectedMonths.length === 0 ||
              selectedMonths.includes(months[row.month - 1]))
        )
        .map((row) => row.id);

      // Trigger the callback to update other components
      onFilterChange(ids);
    }, [selectedWeeks, selectedMonths, data]);

    useEffect(() => {
      const svg = d3.select(svgRef.current);
      const width = svg.node().parentNode.clientWidth;
      const height = svg.node().parentNode.clientHeight;
      const margin = { top: 80, right: 50, bottom: 80, left: 100 };
      const cellSpacing = 2;
      const cellWidth =
        (width - margin.left - margin.right) / months.length - cellSpacing;
      const cellHeight =
        (height - margin.top - margin.bottom) / weeks.length - cellSpacing;
      const totalCellWidth = months.length * (cellWidth + cellSpacing);

      svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      const colorScale = d3
        .scaleSequential()
        .domain([0, d3.max(selectedData.flat())])
        .interpolator(d3.interpolateOranges);

      svg.selectAll("*").remove();
      svg.attr("width", width).attr("height", height);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      g.selectAll("rect")
        .data(selectedData.flat())
        .enter()
        .append("rect")
        .attr(
          "x",
          (_, i) => Math.floor(i / weeks.length) * (cellWidth + cellSpacing)
        )
        .attr("y", (_, i) => (i % weeks.length) * (cellHeight + cellSpacing))
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", (d) => colorScale(d))
        .attr("rx", 2)
        .attr("ry", 2)

      // Add event count text to each cell
      g.selectAll("text.cell-count")
        .data(selectedData.flat())
        .enter()
        .append("text")
        .attr("class", "cell-count")
        .attr(
          "x",
          (_, i) =>
            Math.floor(i / weeks.length) * (cellWidth + cellSpacing) +
            cellWidth / 2
        )
        .attr(
          "y",
          (_, i) =>
            (i % weeks.length) * (cellHeight + cellSpacing) + cellHeight / 2
        )
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .style("pointer-events", "none") // Ensure the text doesn’t interfere with hover events
        .text((d) => d);

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
        .style("opacity", (d) =>
          selectedWeeks.length === 0 || selectedWeeks.includes(d) ? 1 : 0.2
        )
        .on("click", (_, d) => {
          setSelectedWeeks((prevSelected) => {
            const newSelectedWeeks = prevSelected.includes(d)
              ? prevSelected.filter((week) => week !== d)
              : [...prevSelected, d];

            // Apply the filter to the data
            const newFilteredData = filterData(
              newSelectedWeeks,
              selectedMonths
            );
            setSelectedData(newFilteredData);

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
        .style("opacity", (d) =>
          selectedMonths.length === 0 || selectedMonths.includes(d) ? 1 : 0.2
        )
        .on("click", (_, d) => {
          setSelectedMonths((prevSelected) => {
            const newSelectedMonths = prevSelected.includes(d)
              ? prevSelected.filter((month) => month !== d)
              : [...prevSelected, d];

            // Apply the filter to the data
            const newFilteredData = filterData(
              selectedWeeks,
              newSelectedMonths
            );
            setSelectedData(newFilteredData);

            return newSelectedMonths;
          });
        });

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

      const legendScale = d3
        .scaleLinear()
        .domain(colorScale.domain())
        .range([0, totalCellWidth]);

      // Get unique tick values and exclude the min and max
      const tickValues = [
        ...new Set(colorScale.ticks().map((t) => Math.round(t))),
      ].filter(
        (value) =>
          value !== d3.min(selectedData.flat()) &&
          value !== d3.max(selectedData.flat())
      );

      const legendAxis = d3
        .axisBottom(legendScale)
        .tickValues(tickValues)
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
        .text(d3.max(selectedData.flat()))
        .style("-webkit-user-select", "none")
        .style("user-select", "none");
    }, [
      data,
      selectedData,
      selectedWeeks,
      selectedMonths,
      dimensions,
      filteredEarthquakeIds,
    ]);

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
  }
);

export default TimeHeatmap;