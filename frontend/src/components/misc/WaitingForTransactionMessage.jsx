import React from "react";
import "../../css/styles.css";

export function WaitingForTransactionMessage({ txHash }) {
  return (
    <div className="glassy-text">
      Waiting for transaction <strong>{txHash}</strong> to be mined
    </div>
  );
}
