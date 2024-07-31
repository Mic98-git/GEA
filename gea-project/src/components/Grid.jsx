import GeoMap from './GeoMap';
import TimeHeatmap from './TimeHeatmap';
import TSNEScatterPlot from './T-SNEScatterplot';
import ParallelCoordinates from './ParallelCoordinatesPlot';

const VisualizationGrid = () => {
    const topojsonUrl = '/countries.json';
    const geojsonUrl = '/eq_coordinates.geojson';
    const csvUrl = '/prep_dataset.csv';

    return (
        <div className="grid">
            <div key="firstcolumn" className="first-column">
                <div key="geomap" className="grid-item"><GeoMap topojsonUrl={topojsonUrl} geojsonUrl={geojsonUrl} /></div>
                <div key="parallel" className="grid-item"><ParallelCoordinates csvUrl={csvUrl}/></div>
            </div>
            <div key="secondcolumn" className="second-column">
                <div key="timeheatmap" className="grid-item"><TimeHeatmap /></div>
                <div key="tsne" className="grid-item"><TSNEScatterPlot csvUrl={csvUrl}/></div>
            </div>
        </div>
    );
};

export default VisualizationGrid;