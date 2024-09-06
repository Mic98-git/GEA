import { memo, useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const magnitudeCategoryColorMap = {
  minor: "#FFFF33",
  light: "green",
  moderate: "#8B4000",
  strong: "red",
  major: "purple"
};

const TSNEScatterplot = memo(({ csvUrl, filteredEarthquakeIds, onFilterChange }) => {
  const svgRef = useRef();
  const brushedIdsRef = useRef([]);
  const brushSelectionRef = useRef(null);
  const isClearingBrushRef = useRef(false);
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

    svg.attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height);

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

    const brush = d3
      .brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("brush", brushed)
      .on("end", brushEnd);

    const brushGroup = svg.append("g").attr("class", "brush").call(brush);

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);

    const circles = svg
      .append("g")
      .attr("stroke", "black")
      .selectAll("circle")
      .data(tSNEData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.tsne_x))
      .attr("cy", (d) => y(d.tsne_y))
      .attr("r", 2.25)
      .attr("fill", (d) => {
        const category = d.magnitude_category;
        const color = magnitudeCategoryColorMap[category];
        return color || "#000000";
      })
      .attr("opacity", (d) => {
        return isFilteringApplied(d) && isMagCategoryApplied(d) ? 1 : 0.05;
      });

    function getFilteredData(selection) {
      if (!selection) return [];
      const [[x0, y0], [x1, y1]] = selection;
      return tSNEData.filter((d) => {
        const xPos = x(d.tsne_x);
        const yPos = y(d.tsne_y);
        return x0 <= xPos && xPos <= x1 && y0 <= yPos && yPos <= y1;
      });
    }

    function brushed(event) {
      const selection = event.selection;
      if (selection) {
        brushSelectionRef.current = selection;
        const brushedData = getFilteredData(selection).map((d) => d.id);
        brushedIdsRef.current = brushedData;
        circles.attr("opacity", (d) => {
          return brushedIdsRef.current.includes(d.id) && isMagCategoryApplied(d) && isFilteringApplied(d) ? 1 : 0.05;
        });
      }
    }

    function brushEnd(event) {
      if (isClearingBrushRef.current) return;

      if (!event.selection) {
        isClearingBrushRef.current = true;

        brushSelectionRef.current = null;

        brushedIdsRef.current = [];

        svg.select(".brush").call(brush.move, null);

        circles.attr("opacity", 1);

        onFilterChange([]);

        isClearingBrushRef.current = false;
      } else {
        brushSelectionRef.current = event.selection;

        const updatedBrushedIds = getFilteredData(event.selection).map(d => d.id);

        const combinedFilteredIds = updatedBrushedIds.filter((id) => filteredEarthquakeIds.includes(id));

        brushedIdsRef.current = combinedFilteredIds;

        if (JSON.stringify(combinedFilteredIds) !== JSON.stringify(filteredEarthquakeIds)) {
          onFilterChange(combinedFilteredIds);
        }
      }
    }

    if (brushSelectionRef.current) {
      brushGroup.call(brush.move, brushSelectionRef.current);
    }
  }, [tSNEData, dimensions, filteredEarthquakeIds]);

  const isFilteringApplied = (d) => {
    return filteredEarthquakeIds.length === 0 || filteredEarthquakeIds.includes(d.id);
  }

  const isMagCategoryApplied = (d) => {
    return selectedCategories.length === 0 || selectedCategories.includes(d.magnitude_category);
  }

  useEffect(() => {
    const filteredIds = tSNEData.filter((d) => isMagCategoryApplied(d))
      .map((d) => d.id);

    onFilterChange(filteredIds); // Send the filtered IDs to the parent component
  }, [selectedCategories]);

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
    setSelectedCategories((prevCategories) => {
      const updatedCategories = prevCategories.includes(magnitudeCategory)
        ? prevCategories.filter((category) => category !== magnitudeCategory)
        : [...prevCategories, magnitudeCategory];

      return updatedCategories;
    });
  };

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
            <span className="legend-text"
              style={{
                opacity:
                  selectedCategories.length > 0 &&
                    !selectedCategories.includes(key)
                    ? 0.5
                    : 1,
              }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default TSNEScatterplot;