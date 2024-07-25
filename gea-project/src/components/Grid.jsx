import GeoMap from './GeoMap';
import TimeHeatmap from './TimeHeatmap';
import TSNEScatterPlot from './T-SNEScatterplot';
import ParallelCoordinates from './ParallelCoordinatesPlot';

const VisualizationGrid = () => {
    return (
        <div className="grid">
            <div key="geomap" className="grid-item"><GeoMap /></div>
            <div key="timeheatmap" className="grid-item"><TimeHeatmap /></div>
            <div key="tsne" className="grid-item"><TSNEScatterPlot /></div>
            <div key="parallel" className="grid-item"><ParallelCoordinates /></div>
        </div>
    );
};

export default VisualizationGrid;