import React from "react";

import "../../css/styles.css"

export function Loading() {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="spinner-border" role="status">
          <span className="sr-only"></span>
        </div>
      </div>
    </div>
  );
}
