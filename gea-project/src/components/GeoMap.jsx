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
  const tooltipRef = useRef(null);
  const [topojsonData, setTopojsonData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [crossfilterData, setCrossfilterData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        await d3.json(topojsonUrl).then(function(data) {
          setTopojsonData(data);
        });
        
        await d3.json(geojsonUrl).then(function(data) {
          const geojsonWithAttributes = data.features.map((feature) => {
            const depthCategory = feature.properties.depth_category || "unknown";
            const magnitudeCategory = feature.properties.magnitude_category || "minor";
            return {
              ...feature,
              properties: {
                ...feature.properties,
                depthCategory,
                magnitudeCategory,
              },
            };
          });
          setGeojsonData({ ...data, features: geojsonWithAttributes });
          // Initialize Crossfilter
          const ndx = crossfilter(geojsonWithAttributes);
          setCrossfilterData(ndx);
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [topojsonUrl, geojsonUrl]);

  useEffect(() => {
    if (topojsonData && geojsonData && crossfilterData) {
      const svg = d3.select(svgRef.current);
      const tooltip = d3.select(tooltipRef.current);
      const width = svg.node().parentNode.clientWidth;
      const height = svg.node().parentNode.clientHeight;

      const panPadding = 100;
      const worldGeoJson = feature(topojsonData, topojsonData.objects["world"]);

      const projection = d3
        .geoMercator()
        .fitSize([width, height], worldGeoJson)
        .translate([width / 2, height / 1.5])
        .scale(100);
      const path = d3.geoPath().projection(projection);

      svg.selectAll("*").remove();

      const g = svg.append("g");

      g.selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#cccccc")
        .attr("stroke", "#333333");

      const circles = g.selectAll("circle")
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
          return size || 3;
        })
        .attr("fill", (d) => {
          const depth = d.properties.depthCategory;
          const color = depthColorMap[depth];
          return color || "#000000";
        })
        .attr("opacity", 0.5)
        .on("mouseover", (event, d) => {
          tooltip
            .style("opacity", 1)
            .html(`
              <strong>Location:</strong> ${d.properties.place}<br>
              <strong>Magnitude (${d.properties.magType}):</strong> ${d.properties.mag}<br>
              <strong>Depth:</strong> ${d.properties.depth} km<br>
              <strong>Latitude:</strong> ${d.geometry.coordinates[1].toFixed(2)}°<br>
              <strong>Longitude:</strong> ${d.geometry.coordinates[0].toFixed(2)}°<br>             
              <strong>Nearest station:</strong> ${d.properties.dmin} km
            `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });

      const zoomBehavior = d3
        .zoom()
        .scaleExtent([0.5, 10])
        .translateExtent([
          [-panPadding, -panPadding], 
          [width + panPadding, height + panPadding]
        ])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          circles.attr("r", (d) => {
            const magnitude = d.properties.magnitudeCategory;
            const size = magnitudeSizeMap[magnitude];
            return (size || 3) / event.transform.k;
          });
        });

      svg.call(zoomBehavior);
      zoomRef.current = zoomBehavior;

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
        .duration(150)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(150)
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
      <div ref={tooltipRef} className="tooltip"></div>
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
                background: '#555',
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