import React from 'react'
import ReactDOM from 'react-dom/client'
import Dapp from './Dapp.jsx'
import './index.css'

// We import bootstrap here, but you can remove if you want
//import "bootstrap/dist/css/bootstrap.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Dapp />
  </React.StrictMode>,
)
