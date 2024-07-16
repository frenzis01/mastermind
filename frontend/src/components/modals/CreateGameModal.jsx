import { useState } from 'react';
import { Modal, Button, Form} from 'react-bootstrap';

import "../../css/styles.css";

// eslint-disable-next-line react/prop-types
export function CreateGameModal({ closeModal, createGame }) {
  const [stake, setStake] = useState('');
  const [isChallenge, setIsChallenge] = useState(false);
  const [challengeAddress, setChallengeAddress] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    createGame(stake, isChallenge ? challengeAddress : null);
  };

  return (
    <Modal show onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Create Game</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formStake" className='form-stake'>
            <Form.Label>Stake</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step={0.01}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formIsChallenge">
            <Form.Check
              type="checkbox"
              label="Challenge a specific player"
              checked={isChallenge}
              onChange={() => setIsChallenge(!isChallenge)}
            />
          </Form.Group>
          {isChallenge && (
            <Form.Group controlId="formChallengeAddress" className='form-stake'>
              <Form.Label>Challenge Address</Form.Label>
              <Form.Control
                type="text"
                value={challengeAddress}
                onChange={(e) => setChallengeAddress(e.target.value)}
              />
            </Form.Group>
          )}
          <center>
          <Button className="btn-faded create-game-button-padding-top" type="submit" >
            Create Game
          </Button>
          </center>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CreateGameModal;