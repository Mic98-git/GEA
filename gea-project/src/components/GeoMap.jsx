import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import crossfilter from "crossfilter2";

const depthColorMap = {
  shallow: "red",
  intermediate: "orange",
  deep: "blue",
};

const magnitudeSizeMap = {
  minor: 2,
  light: 3,
  moderate: 4.5,
  strong: 5.5,
  major: 6
};

const GeoMap = ({ topojsonUrl, geojsonUrl }) => {
  const svgRef = useRef();
  const zoomRef = useRef(null);
  const [topojsonData, setTopojsonData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [crossfilterData, setCrossfilterData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const topojsonData = await d3.json(topojsonUrl);
        setTopojsonData(topojsonData);

        const geojsonData = await d3.json(geojsonUrl);

        // Process GeoJSON features
        const geojsonWithAttributes = geojsonData.features.map((feature) => {
          const depthCategory = feature.properties.depth_category || "unknown";
          const magnitudeCategory =
            feature.properties.magnitude_category || "minor";
          return {
            ...feature,
            properties: {
              ...feature.properties,
              depthCategory,
              magnitudeCategory,
            },
          };
        });

        setGeojsonData({ ...geojsonData, features: geojsonWithAttributes });

        // Initialize Crossfilter
        const ndx = crossfilter(geojsonWithAttributes);
        setCrossfilterData(ndx);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [topojsonUrl, geojsonUrl]);

  useEffect(() => {
    if (topojsonData && geojsonData && crossfilterData) {
      const svg = d3.select(svgRef.current);
      const width = svg.node().parentNode.clientWidth;
      const height = svg.node().parentNode.clientHeight;

      // Convert TopoJSON to GeoJSON
      const worldGeoJson = feature(topojsonData, topojsonData.objects["world"]);

      // Projection and path
      const projection = d3
        .geoMercator()
        .fitSize([width, height], worldGeoJson)
        .translate([width / 2, height / 1.5])
        .scale(100);
      const path = d3.geoPath().projection(projection);

      // Clear previous SVG content
      svg.selectAll("*").remove();

      // Define zoom behavior
      const zoomBehavior = d3
        .zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", (event) => {
          svg.selectAll("g").attr("transform", event.transform.toString());
        });

      svg.call(zoomBehavior);
      zoomRef.current = zoomBehavior; // Store the zoom behavior in the ref

      // Draw the map
      const g = svg.append("g");

      g.selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#cccccc")
        .attr("stroke", "#333333");

      // Plot points
      g.selectAll("circle")
        .data(geojsonData.features)
        .enter()
        .append("circle")
        .attr("cx", (d) => {
          const [x, y] = projection(d.geometry.coordinates);
          return x;
        })
        .attr("cy", (d) => {
          const [x, y] = projection(d.geometry.coordinates);
          return y;
        })
        .attr("r", (d) => {
          const magnitude = d.properties.magnitudeCategory;
          const size = magnitudeSizeMap[magnitude];
          return size || 3; // Default size if not found
        })
        .attr("fill", (d) => {
          const depth = d.properties.depthCategory;
          const color = depthColorMap[depth];
          return color || "#000000"; // Default color if not found
        })
        .attr("opacity", 0.5);

      svg.attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    }
  }, [topojsonData, geojsonData, crossfilterData, dimensions]);

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

  const zoomIn = () => {
    if (zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 0.5);
    }
  };

  return (
    <div className="map">
      <svg ref={svgRef}></svg>
      <div className="zoom-controls">
        <button onClick={zoomIn}>+</button>
        <button onClick={zoomOut}>-</button>
      </div>
      <div className="legend">
      {Object.entries(depthColorMap).map(([key, color]) => (
        <div key={key} className="legend-item">
          <span
            className="legend-square"
            style={{
              background: color,
              width: 8,
              height: 8,
            }}
          ></span>
          <span className="legend-text">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
        </div>
      ))}
      {Object.entries(magnitudeSizeMap).map(([key, size]) => (
        <div key={key} className="legend-item">
          <span
            className="legend-circle"
            style={{
              background: '#555', // color for magnitude legend items
              width: size * 2,
              height: size * 2,
            }}
          ></span>
          <span className="legend-text">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
        </div>
      ))}
    </div>
    </div>
  );
};

export default GeoMap;