import { useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import crossfilter from "crossfilter2";
import crosshairIcon from "../assets/crosshair.svg";

const depthColorMap = {
  shallow: "red",
  intermediate: "darkorange",
  deep: "blue",
};

const magnitudeSizeMap = {
  minor: 2,
  light: 3,
  moderate: 4.5,
  strong: 5.5,
  major: 6
};

const GeoMap = memo(({ topojsonUrl, geojsonUrl, filteredEarthquakeIds, onFilterChange }) => {
  const svgRef = useRef();
  const zoomRef = useRef(null);
  const tooltipRef = useRef(null);
  const initialTransformRef = useRef(null);
  const currentZoomTransformRef = useRef(d3.zoomIdentity);
  const brushedIdsRef = useRef([]);
  const brushSelectionRef = useRef(null);
  const isBrushingRef = useRef(false);
  const isClearingBrushRef = useRef(false);
  const [topojsonData, setTopojsonData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [crossfilterData, setCrossfilterData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedDepthCategories, setSelectedDepthCategories] = useState([]);
  const [selectedMagnitudeCategories, setSelectedMagnitudeCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const topoData = await d3.json(topojsonUrl);
        setTopojsonData(topoData);

        const geoData = await d3.json(geojsonUrl);
        setGeojsonData(geoData);

        const ndx = crossfilter(geoData.features);
        setCrossfilterData(ndx);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const areCategoriesApplied = (d) => {
    const depthFilter = selectedDepthCategories.length === 0 || selectedDepthCategories.includes(d.properties.depth_category);
    const magnitudeFilter = selectedMagnitudeCategories.length === 0 || selectedMagnitudeCategories.includes(d.properties.magnitude_category);

    return depthFilter && magnitudeFilter;
  }

  const filterByDepth = (depthCategory) => {
    setSelectedDepthCategories((prevCategories) => {
      const updatedCategories = prevCategories.includes(depthCategory)
        ? prevCategories.filter((category) => category !== depthCategory)
        : [...prevCategories, depthCategory];

      return updatedCategories;
    });
  };

  const filterByMagnitude = (magnitudeCategory) => {
    setSelectedMagnitudeCategories((prevCategories) => {
      const updatedCategories = prevCategories.includes(magnitudeCategory)
        ? prevCategories.filter((category) => category !== magnitudeCategory)
        : [...prevCategories, magnitudeCategory];

      return updatedCategories;
    });
  };

  useEffect(() => {
    if (!geojsonData) return; // Ensure geojsonData is loaded

    const newFilteredIds = geojsonData.features
      .filter((feature) => {
        const depthMatch = selectedDepthCategories.length === 0 || selectedDepthCategories.includes(feature.properties.depth_category);
        const magnitudeMatch = selectedMagnitudeCategories.length === 0 || selectedMagnitudeCategories.includes(feature.properties.magnitude_category);
        return depthMatch && magnitudeMatch;
      })
      .map((feature) => feature.properties.id);

    onFilterChange(newFilteredIds);
  }, [selectedDepthCategories, selectedMagnitudeCategories]);

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
        .translate([width / 2, height / 1.5]);
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

      // Brush functionality
      const brush = d3
        .brush()
        .extent([
          [-panPadding, -panPadding],
          [width + panPadding, height + panPadding],
        ])
        .on("start", () => isBrushingRef.current = true)
        .on("brush", (event) => {
          isBrushingRef.current = true;
          brushed(event)
        })
        .on("end", (event) => {
          isBrushingRef.current = false;
          brushEnd(event);
        });

      const brushGroup = g.append("g").attr("class", "brush").call(brush);

      const circles = g
        .selectAll("circle")
        .data(geojsonData.features)
        .enter()
        .append("circle")
        .attr("cx", (d) => {
          const [x, _] = projection(d.geometry.coordinates);
          return x;
        })
        .attr("cy", (d) => {
          const [_, y] = projection(d.geometry.coordinates);
          return y;
        })
        .attr("r", (d) => {
          const magnitude = d.properties.magnitude_category;
          const size = magnitudeSizeMap[magnitude];
          return size ? size / currentZoomTransformRef.current.k : 3;
        })
        .attr("fill", (d) => {
          const depth = d.properties.depth_category;
          const color = depthColorMap[depth];
          return color || "#000000";
        })
        .attr("opacity", (d) => {
          return isFilteringApplied(d) && areCategoriesApplied(d) ? 1 : 0.01;
        })
        .on("mouseover", (event, d) => {
          if (isBrushingRef.current) return;

          event.stopPropagation(); // Prevent brush from triggering
          const { pageX, pageY } = event;

          if (areCategoriesApplied(d) && isBrushingApplied(d) && isFilteringApplied(d)) {
            tooltip
              .style("opacity", 1)
              .html(`
              <strong>Location:</strong> ${d.properties.place}<br>
              <strong>Time (UTC):</strong> ${d.properties.time}<br>
              <strong>Magnitude (${d.properties.magType}):</strong> ${d.properties.mag} &plusmn; ${d.properties.magError}<br>
              <strong>Depth:</strong> ${d.properties.depth} &plusmn; ${d.properties.depthError} km<br>            
              `
              )
              .style("left", `${pageX + 10}px`)
              .style("top", `${pageY - 28}px`);
          }
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });

      function getFilteredData(selection) {
        if (!selection) return [];

        const [[x0, y0], [x1, y1]] = selection;
        return geojsonData.features.filter((d) => {
          const [x, y] = projection(d.geometry.coordinates);
          const isInBrushedArea = x0 <= x && x <= x1 && y0 <= y && y <= y1;

          return isInBrushedArea && areCategoriesApplied(d) && isFilteringApplied(d);
        });
      }

      function brushed(event) {
        const selection = event.selection;
        if (selection) {
          brushSelectionRef.current = selection;
          const brushedData = getFilteredData(selection).map((d) => d.properties.id);
          brushedIdsRef.current = brushedData;
          circles.attr("opacity", (d) => {
            return brushedIdsRef.current.includes(d.properties.id) && areCategoriesApplied(d) && isFilteringApplied(d) ? 1 : 0.05;
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

          // Apply only the category filtering when the brush is cleared
          if (selectedDepthCategories.length > 0 || selectedMagnitudeCategories.length > 0) {
            const filteredByCategory = geojsonData.features.filter(d => areCategoriesApplied(d)).map(d => d.properties.id);
            onFilterChange(filteredByCategory); // Keep filtered categories active
          } else {
            onFilterChange([]); // No categories selected, clear all
          }

          isClearingBrushRef.current = false;
        } else {
          brushSelectionRef.current = event.selection;

          const updatedBrushedIds = getFilteredData(event.selection).map(d => d.properties.id);

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

      const zoomBehavior = d3
        .zoom()
        .scaleExtent([0.7, 30])
        .translateExtent([
          [-panPadding, -panPadding],
          [width + panPadding, height + panPadding],
        ])
        .on("zoom", (event) => {
          currentZoomTransformRef.current = event.transform; // Update the current zoom transform
          g.attr("transform", event.transform);
          updateCircleSizes(event.transform);
        });

      svg.call(zoomBehavior);

      // Disable zoom and pan on scroll and drag
      svg.on("wheel.zoom", null).on("mousedown.zoom", null);

      // Store the zoom behavior reference
      zoomRef.current = zoomBehavior;
      initialTransformRef.current = d3.zoomIdentity;

      g.attr("transform", currentZoomTransformRef.current);

      svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    }
  }, [
    topojsonData,
    geojsonData,
    crossfilterData,
    dimensions,
    selectedDepthCategories,
    selectedMagnitudeCategories,
    filteredEarthquakeIds
  ]);

  const isBrushingApplied = (d) => {
    return brushedIdsRef.current.includes(d.properties.id) || brushedIdsRef.current.length === 0;
  }

  const isFilteringApplied = (d) => {
    return filteredEarthquakeIds.length === 0 || filteredEarthquakeIds.includes(d.properties.id);
  }

  const updateCircleSizes = (transform) => {
    d3.select(svgRef.current)
      .selectAll("circle")
      .attr("r", (d) => {
        const magnitude = d.properties.magnitude_category;
        const size = magnitudeSizeMap[magnitude];
        return (size || 3) / transform.k;
      });
  };

  const zoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.scaleBy, 0.5);
    }
  };

  const recenterMap = () => {
    if (zoomRef.current && initialTransformRef.current) {
      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .call(zoomRef.current.transform, initialTransformRef.current);
    }
  };

  const panMap = (dx, dy) => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.translateBy, dx, dy);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const steps = 10;
      switch (event.key) {
        case "ArrowUp":
        case "w":
          panMap(0, steps);
          break;
        case "ArrowDown":
        case "s":
          panMap(0, -steps);
          break;
        case "ArrowLeft":
        case "a":
          panMap(steps, 0);
          break;
        case "ArrowRight":
        case "d":
          panMap(-steps, 0);
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleMoveLeft = () => {
    return panMap(10, 0);
  }

  const handleMoveRight = () => {
    return panMap(-10, 0);
  }

  const handleMoveUp = () => {
    return panMap(0, 10);
  }

  const handleMoveDown = () => {
    return panMap(0, -10);
  }

  return (
    <div className="map">
      <svg ref={svgRef}></svg>
      <div className="zoom-controls">
        <button onClick={zoomIn} title="Zoom in">
          +
        </button>
        <button onClick={zoomOut} title="Zoom out">
          -
        </button>
        <button onClick={recenterMap} title="Recenter">
          <img src={crosshairIcon} className="resize-map" />
        </button>
        <button onClick={handleMoveLeft} title="Move left">
          &larr;
        </button>
        <button onClick={handleMoveRight} title="Move right">
          &rarr;
        </button>
        <button onClick={handleMoveUp} title="Move up">
          &uarr;
        </button>
        <button onClick={handleMoveDown} title="Move down">
          &darr;
        </button>
      </div>
      <div ref={tooltipRef} className="tooltip"></div>
      <div className="legend-container">
        <div className="legend">
          <span className="legend-title">Depth:</span>
          {Object.entries(depthColorMap).map(([key, color]) => (
            <button
              key={key}
              className="legend-item"
              onClick={() => filterByDepth(key)}
            >
              <span
                className="legend-square"
                style={{
                  opacity:
                    selectedDepthCategories.length > 0 &&
                      !selectedDepthCategories.includes(key)
                      ? 0.2
                      : 1,
                  background: color,
                  width: 8,
                  height: 8,
                }}
              ></span>
              <span className="legend-text"
                style={{
                  opacity:
                    selectedDepthCategories.length > 0 &&
                      !selectedDepthCategories.includes(key)
                      ? 0.5
                      : 1,
                }}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            </button>
          ))}
        </div>
        <div className="legend">
          <span className="legend-title">Magnitude:</span>
          {Object.entries(magnitudeSizeMap).map(([key, size]) => (
            <button
              key={key}
              className="legend-item"
              onClick={() => filterByMagnitude(key)}
            >
              <span
                className="legend-circle"
                style={{
                  opacity:
                    selectedMagnitudeCategories.length > 0 &&
                      !selectedMagnitudeCategories.includes(key)
                      ? 0.2
                      : 1,
                  background: "#555",
                  width: size * 2,
                  height: size * 2,
                }}
              ></span>
              <span
                className="legend-text"
                style={{
                  opacity:
                    selectedMagnitudeCategories.length > 0 &&
                      !selectedMagnitudeCategories.includes(key)
                      ? 0.5
                      : 1,
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default GeoMap;