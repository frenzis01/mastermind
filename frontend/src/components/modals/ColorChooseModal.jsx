// ColorChooseModal.js
import React, { useState } from "react";
import "../../css/styles.css"

const colors = [
  "#FFB347", // Persimmon
  "#FF6961", // Light Red
  "#77DD77", // Pastel Green
  "#AEC6CF", // Pastel Blue
  "#F49AC2", // Pastel Purple
  "#D4AF65", // Gold (Metallic)
  "#836953", // Coffee
  "#779ECB", // Dark Pastel Blue
  "#966FD6", // Light Purple
  "#03C03C", // Dark Pastel Green
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export function ColorChooseModal({ submitCode }) {
  const [isModalOpen, setModalOpen] = useState(true);
  const [selectedColors, setSelectedColors] = useState(
    Array(6).fill().map(getRandomColor)
  );
  const [activeCircle, setActiveCircle] = useState(0);

  const closeModal = () => {
     setModalOpen(false);}

  const handleColorChange = (color) => {
    const newColors = [...selectedColors];
    newColors[activeCircle] = color;
    setSelectedColors(newColors);

    // Move to the next circle unless all circles have been selected
    if (activeCircle < 5) {
      setActiveCircle(activeCircle + 1);
    }
  };

  return (
    <>
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="color-row">
              {selectedColors.map((color, index) => (
                <div
                  key={index}
                  className={`large-color-circle ${index === activeCircle ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveCircle(index)}
                />
              ))}
            </div>
            <div className="color-grid">
              {colors.map((color, index) => (
                <div
                  key={index}
                  className="small-color-circle"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
            <button
              className="submit-button"
              onClick={() => {closeModal(); submitCode(selectedColors)}}
            >
              Submit Code
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ColorChooseModal;
