import React from "react";
import "../../css/styles.css"

export function TransactionErrorMessage({ message, dismiss }) {
  return (
    <div className="glassy-text">
      Error sending transaction: {message.substring(0, 100)}
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={dismiss}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
