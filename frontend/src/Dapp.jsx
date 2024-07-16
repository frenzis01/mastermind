import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Game from './Game';

import WithSnackbar from './components/snackBar/WithSnackBar'

function Dapp(props) {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home addCustomSnack={props.addCustomSnack}/>} />
        <Route path="/game/:id" element={<Game addCustomSnack={props.addCustomSnack}/>} />
      </Routes>
    </Router>
  );
}

export default WithSnackbar(Dapp);