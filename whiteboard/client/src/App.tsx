import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './components/Landing';
import { Room } from './components/Room';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
