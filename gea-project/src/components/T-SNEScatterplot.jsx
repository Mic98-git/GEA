import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const magnitudeCategoryColorMap = {
  minor: "#FFFF33",
  light: "green",
  moderate: "#8B4000",
  strong: "red",
  major: "purple"
};

const TSNEScatterplot = ({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tSNEData, setTSNEData] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await d3.csv(csvUrl).then(function (data) {
          data.forEach(function (d) {
            d.id = +d.id;
            d.tsne_x = +d.tsne_x;
            d.tsne_y = +d.tsne_y;
          });
          setTSNEData(data);
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
        .call(d3.axisBottom(x))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#999").attr("stroke-width", 1))
        .call((g) => g.selectAll(".domain").attr("stroke", "#999").attr("stroke-width", 1))
        .call((g) => g.selectAll("text").attr("fill", "#fff").style("font-size", "10px"));

    const yAxis = (g) =>
      g.attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#999").attr("stroke-width", 1))
        .call((g) => g.selectAll(".domain").attr("stroke", "#999").attr("stroke-width", 1))
        .call((g) => g.selectAll("text").attr("fill", "#fff").style("font-size", "10px"));

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
      })
      .attr("opacity", (d) => {
        return (filteredEarthquakeIds.length === 0 || filteredEarthquakeIds.includes(d["id"])) ? 1 : 0.05;
      });
  }, [tSNEData, dimensions, filteredEarthquakeIds]);

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

  const filterByMagnitude = (magnitudeCategory) => {
    const svg = d3.select(svgRef.current);
    if (selectedCategories.includes(magnitudeCategory)) {
      // Deselect category
      const updatedCategories = selectedCategories.filter(category => category !== magnitudeCategory);
      setSelectedCategories(updatedCategories);
      if (updatedCategories.length === 0) {
        svg.selectAll("circle").attr("opacity", 1);
      } else {
        svg.selectAll("circle").attr("opacity", (d) =>
          updatedCategories.includes(d.magnitude_category) ? 1 : 0.05
        );
      }
    } else {
      // Select category
      const updatedCategories = [...selectedCategories, magnitudeCategory];
      setSelectedCategories(updatedCategories);
      svg.selectAll("circle").attr("opacity", (d) =>
        updatedCategories.includes(d.magnitude_category) ? 1 : 0.05
      );
    }
  };
  
  /*const applyCategoriesToOthersCharts = (magnitudeCategories) => {
    const filteredIds = tSNEData.filter((d) =>
    (magnitudeCategories.length === 0 ||
      magnitudeCategories.includes(d.magnitude_category))
    )
      .map((d) => d.id);

    onFilterChange(filteredIds); // Send the filtered IDs to the parent component
  };*/

  return (
    <div className="scatterplot">
      <svg ref={svgRef}></svg>
      <div className="legend-container legend">
        <span className="legend-title">Magnitude:</span>
        {Object.entries(magnitudeCategoryColorMap).map(([key, color]) => (
          <button key={key} className="legend-item" onClick={() => filterByMagnitude(key)}>
            <span
              className="legend-circle"
              style={{
                opacity: selectedCategories.length > 0 && !selectedCategories.includes(key) ? 0.2 : 1,
                background: color,
                width: 8,
                height: 8,
              }}
            ></span>
            <span className="legend-text">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TSNEScatterplot;