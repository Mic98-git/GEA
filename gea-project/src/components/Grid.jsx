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
    setFilteredEarthquakeIds((prevFilteredIds) => {
      // If there are no previous filters, just return the new ones
      if (prevFilteredIds.length === 0) {
        return newFilteredIds;
      }
  
      // Find the intersection of previous and new filtered IDs
      const combinedFilteredIds = prevFilteredIds.filter(id => newFilteredIds.includes(id));
  
      return combinedFilteredIds;
    });
  }, []);

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