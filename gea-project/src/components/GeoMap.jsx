// src/Map.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";

const GeoMap = ({ topojsonUrl, geojsonUrl }) => {
  const svgRef = useRef(null);
  const [topojsonData, setTopojsonData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);

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
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [topojsonUrl, geojsonUrl]);

  useEffect(() => {
    if (topojsonData && geojsonData) {
      const svg = d3.select(svgRef.current);
      const width = 800;
      const height = 600;

      // Convert TopoJSON to GeoJSON
      const worldGeoJson = topojson.feature(topojsonData, topojsonData.objects["world"]);

      // Projection and path
      const projection = d3.geoMercator().fitSize([width, height], worldGeoJson);
      const path = d3.geoPath().projection(projection);

      // Clear previous SVG content
      svg.selectAll("*").remove();

      // Draw the map
      svg.append("g")
        .selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#cccccc")
        .attr("stroke", "#333333");

      // Plot points from GeoJSON
      svg.append("g")
        .selectAll("circle")
        .data(geojsonData.features)
        .enter()
        .append("circle")
        .attr("cx", d => projection((d.geometry).coordinates)[0])
        .attr("cy", d => projection((d.geometry).coordinates)[1])
        .attr("r", 5)
        .attr("fill", "red");
    }
  }, [topojsonData, geojsonData]);

  return (
    <div>
      <svg ref={svgRef} width={800} height={600}></svg>
    </div>
  );
};

export default GeoMap;
