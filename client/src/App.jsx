import { useState } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom';
import Lobby from './pages/Lobby';
import RoomPage from './pages/RoomPage';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen w-screen bg-black text-gray-200 font-mono overflow-x-hidden">
      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </div>
  );
}

export default App
