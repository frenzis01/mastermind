import React from "react";
import "../../css/styles.css";

export function NoWalletDetected() {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col p-4 text-center">
          <div className="glassy-text">
            No Ethereum wallet was detected.
            Please install one of the following:
          </div>
          <div className="d-flex justify-content-center flex-wrap">
            <a
              href="https://www.coinbase.com/wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-faded no-decorations"
            >
              Coinbase Wallet
            </a>
            <span className="mx-2"></span>
            <a
              href="http://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-faded no-decorations"
            >
              MetaMask
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
