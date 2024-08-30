import { useState, useCallback } from 'react';
import GeoMap from './GeoMap';
import TimeHeatmap from './TimeHeatmap';
import TSNEScatterPlot from './T-SNEScatterplot';
import ParallelCoordinates from './ParallelCoordinatesPlot';

const VisualizationGrid = () => {
  const topojsonUrl = '/countries.json';
  const geojsonUrl = '/eq_coordinates.geojson';
  const csvUrl = '/prep_dataset.csv';

  // State to manage the filtered earthquake IDs
  const [filteredEarthquakeIds, setFilteredEarthquakeIds] = useState([]);

  // Callback to update the filtered earthquake IDs
  const handleFilterChange = useCallback((newFilteredIds) => {
    // If no items have been filtered yet, start with the new filter set
    if (filteredEarthquakeIds.length === 0) {
      setFilteredEarthquakeIds(newFilteredIds);
    } else {
      // Further filter the already filtered IDs with the new filter
      const updatedFilteredIds = filteredEarthquakeIds.filter(id => newFilteredIds.includes(id));
      setFilteredEarthquakeIds(updatedFilteredIds);
    }
  }, [filteredEarthquakeIds]);

  return (
    <div className="grid">
      <div key="firstcolumn" className="first-column">
        <div key="geomap" className="grid-item geomap-item">
          <GeoMap
            topojsonUrl={topojsonUrl}
            geojsonUrl={geojsonUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleFilterChange}
          />
        </div>
        <div key="parallel" className="grid-item parallel-item">
          <ParallelCoordinates
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>
      <div key="secondcolumn" className="second-column">
        <div key="timeheatmap" className="grid-item">
          <TimeHeatmap
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleFilterChange}
          />
        </div>
        <div key="tsne" className="grid-item">
          <TSNEScatterPlot
            csvUrl={csvUrl}
            filteredEarthquakeIds={filteredEarthquakeIds}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  );
};

export default VisualizationGrid;