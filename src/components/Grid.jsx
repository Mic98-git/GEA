import { useState, useCallback } from 'react';
import GeoMap from './GeoMap';
import TimeHeatmap from './TimeHeatmap';
import TSNEScatterPlot from './T-SNEScatterplot';
import ParallelCoordinates from './ParallelCoordinatesPlot';

const VisualizationGrid = () => {
  const topojsonUrl = '/GEA/countries.json';
  const geojsonUrl = '/GEA/eq_coordinates.geojson';
  const csvUrl = '/GEA/prep_dataset.csv';

  // State to manage the filtered earthquake IDs for each chart
  const [geoMapFilters, setGeoMapFilters] = useState([]);
  const [parallelCoordinatesFilters, setParallelCoordinatesFilters] = useState([]);
  const [timeHeatmapFilters, setTimeHeatmapFilters] = useState([]);
  const [tsneScatterPlotFilters, setTsneScatterPlotFilters] = useState([]);

  // Function to combine all filters using AND logic across different charts
  const combineFilters = () => {
    const allFilters = [
      geoMapFilters,
      parallelCoordinatesFilters,
      timeHeatmapFilters,
      tsneScatterPlotFilters
    ];

    // Perform AND across different charts
    const combinedFilteredIds = allFilters.reduce((acc, filter) => {
      if (filter.length === 0) return acc; // Ignore empty filters
      if (acc.length === 0) return filter; // Initialize with the first set of filters
      return acc.filter(id => filter.includes(id)); // AND operation across different charts
    }, []);

    return combinedFilteredIds;
  };

  // Callbacks to handle filter changes for each chart
  const handleGeoMapFilterChange = useCallback((newFilteredIds) => {
    setGeoMapFilters(newFilteredIds);
  }, []);

  const handleParallelCoordinatesFilterChange = useCallback((newFilteredIds) => {
    setParallelCoordinatesFilters(newFilteredIds);
  }, []);

  const handleTimeHeatmapFilterChange = useCallback((newFilteredIds) => {
    setTimeHeatmapFilters(newFilteredIds);
  }, []);

  const handleTSNEScatterPlotFilterChange = useCallback((newFilteredIds) => {
    setTsneScatterPlotFilters(newFilteredIds);
  }, []);

  // Get the final combined filter IDs
  const filteredEarthquakeIds = combineFilters();

  return (
    <div className="grid">
      <div key="firstcolumn" className="first-column">
        <div key="geomap" className="grid-item geomap-item">
          <GeoMap
            topojsonUrl={topojsonUrl}
            geojsonUrl={geojsonUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleGeoMapFilterChange}
          />
        </div>
        <div key="parallel" className="grid-item parallel-item">
          <ParallelCoordinates
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleParallelCoordinatesFilterChange}
          />
        </div>
      </div>
      <div key="secondcolumn" className="second-column">
        <div key="timeheatmap" className="grid-item">
          <TimeHeatmap
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleTimeHeatmapFilterChange}
          />
        </div>
        <div key="tsne" className="grid-item">
          <TSNEScatterPlot
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleTSNEScatterPlotFilterChange}
          />
        </div>
      </div>
    </div>
  );
};

export default VisualizationGrid;