import React, { useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';


export function NonClosableModal ({ show, title, text, buttonText, onClick, triggerText }) {
  useEffect(() => {
    if (triggerText) {
      // no-op
    }
  }, [triggerText]);
  return (
    <Modal
      show={show}
      onHide={() => {}}
      backdrop="static"
      keyboard={false}
      margin="auto" /* Center horizontally */
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' ,margin:"auto"}}
    >
      <Modal.Header style={{ marginTop: '3em' }}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {text}
      </Modal.Body>
      {buttonText && (
        <Modal.Footer style={{ marginBottom: '3em' }}>
          <Button  className="btn-faded create-game-button-padding-top" variant="primary" onClick={onClick}>
            {buttonText}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default NonClosableModal;
