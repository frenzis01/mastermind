import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
//import Game from './Game';

function Dapp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

{/* <Route path="/game/:id" element={<Game />} /> */}

export default Dapp;