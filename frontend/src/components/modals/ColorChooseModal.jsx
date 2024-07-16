// ColorChooseModal.jsx
import React, { useState, useEffect } from "react";
import "../../css/styles.css";
import "../../css/boards.css";
import { colors, colorToInt, intToColor } from "../../assets/colors";
import { jsonStringToUint8Array } from "../../utils/utils";

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export function ColorChooseModal({ submitCode, onToggleModal, initColors, showTextInput, initText }) {
  const [isModalOpen, setModalOpen] = useState(true);
  const [selectedColors, setSelectedColors] = useState(
    Array(6).fill().map((_, index) => {
      if (initColors) return intToColor(initColors[index]);
      else return getRandomColor();
    })
  );
  const [activeCircle, setActiveCircle] = useState(0);
  const [textInput, setTextInput] = useState(JSON.stringify(initText) || "");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    setTextInput(JSON.stringify(initText) || "");
  }, [initText]);

  const handleColorChange = (color) => {
    const newColors = [...selectedColors];
    newColors[activeCircle] = color;
    setSelectedColors(newColors);

    // Move to the next circle unless all circles have been selected
    if (activeCircle < 5) {
      setActiveCircle(activeCircle + 1);
    }
  };

  const handleSubmit = () => {
    if (showTextInput && !textInput.trim()) {
      setErrorText("Text input cannot be empty.");
      return;
    }

    if (!showTextInput) {
      submitCode(selectedColors);
    }
    else {
      const dataToSubmit = {
        colors: selectedColors,
        textInput: jsonStringToUint8Array(textInput),
      };
      submitCode(dataToSubmit);
    }
    onToggleModal();
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
                  className={`large-color-circle ${index === activeCircle ? "active" : ""}`}
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
            {showTextInput && (
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Enter seed here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="input-field"
                />
                {errorText && <p className="error">{errorText}</p>}
              </div>
            )}
            <button className="submit-button" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ColorChooseModal;
