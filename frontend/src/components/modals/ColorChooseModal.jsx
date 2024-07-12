// ColorChooseModal.js
import { useState } from "react";
import "../../css/styles.css"
import {colors, colorToInt} from "../../assets/colors";

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export function ColorChooseModal({ submitCode, onToggleModal }) {
  const [isModalOpen, setModalOpen] = useState(true);
  const [selectedColors, setSelectedColors] = useState(
    Array(6).fill().map(getRandomColor)
  );
  const [activeCircle, setActiveCircle] = useState(0);

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
        <div className="modal-backdrop" onClick={onToggleModal}>
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
              onClick={() => {onToggleModal(); submitCode(selectedColors)}}
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
