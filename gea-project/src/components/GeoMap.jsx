import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";

const depthColorMap = {
  shallow: "red",
  intermediate: "orange",
  deep: "blue",
};

const magnitudeSizeMap = {
  minor: 1,
  light: 3,
  moderate: 4.5,
  strong: 5.5,
  major: 6,
  great: 7,
};

const GeoMap = ({ topojsonUrl, geojsonUrl }) => {
  const svgRef = useRef();
  const [topojsonData, setTopojsonData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const topojsonResponse = await fetch(topojsonUrl);
        const topojsonData = await topojsonResponse.json();
        setTopojsonData(topojsonData);

        const geojsonResponse = await fetch(geojsonUrl);
        const geojsonData = await geojsonResponse.json();
        setGeojsonData(geojsonData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [topojsonUrl, geojsonUrl]);

  useEffect(() => {
    if (topojsonData && geojsonData) {
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      // Convert TopoJSON to GeoJSON
      const worldGeoJson = feature(topojsonData, topojsonData.objects["world"]);

      // Projection and path
      const projection = d3
        .geoMercator()
        .fitSize([width - 20, height - 20], worldGeoJson)
        .translate([width / 2, height / 1.5])
        .scale(65);
      const path = d3.geoPath().projection(projection);

      // Clear previous SVG content
      svg.selectAll("*").remove();

      // Set the viewBox to ensure the map fits and is centered
      svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // Define zoom behavior
      const zoom = d3.zoom().on("zoom", (event) => {
        setTransform(event.transform);
      });

      // Apply zoom behavior to the SVG
      svg.call(zoom);

      // Draw the map
      const g = svg.append("g").attr("transform", transform.toString());

      g.selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#cccccc")
        .attr("stroke", "#333333");

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

      // Plot points from GeoJSON
      g.selectAll("circle")
        .data(geojsonWithAttributes)
        .enter()
        .append("circle")
        .attr("cx", (d) => projection(d.geometry.coordinates)[0])
        .attr("cy", (d) => projection(d.geometry.coordinates)[1])
        .attr("r", (d) => magnitudeSizeMap[d.properties.magnitudeCategory] || 3)
        .attr("fill", (d) => depthColorMap[d.properties.depthCategory] || "#000000")
        .attr("opacity", 0.7);
    }
  }, [topojsonData, geojsonData, dimensions, transform]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="map">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default GeoMap;
