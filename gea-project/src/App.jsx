import './index.css'
import VisualizationGrid from './components/Grid';
import Header from './components/Header';

export default function App() {
  return (
    <div className="App">
      <Header />
      <div className='content'>
        <VisualizationGrid />
      </div>
    </div>
  );
}