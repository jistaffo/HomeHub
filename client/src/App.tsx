import { HashRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HouseEditor from "./pages/HouseEditor";
import RoomDesign from "./pages/RoomDesign";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/house/:houseId" element={<HouseEditor />} />
        <Route path="/house/:houseId/room/:roomId" element={<RoomDesign />} />
      </Routes>
    </HashRouter>
  );
}
