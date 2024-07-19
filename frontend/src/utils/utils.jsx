export const jsonStringToUint8Array = (jsonString) => {
   if (!jsonString || jsonString === "undefined") {
     return undefined;
   }
   
   // Parse the JSON string to an object
   const obj = JSON.parse(jsonString);
 
   // Create an array of length 32 filled with zeros
   const array = new Array(32).fill(0);
 
   // Populate the array with values from the object
   for (const [key, value] of Object.entries(obj)) {
     const index = parseInt(key, 10);
     if (index >= 0 && index < 32) {
       const intValue = parseInt(value, 10);
       // Ensure the value is an 8-bit integer
       if (intValue >= 0 && intValue <= 255) {
         array[index] = intValue;
       } else {
         throw new Error(`Value at key ${key} is not an 8-bit integer: ${value}`);
       }
     } else {
       throw new Error(`Index out of bounds: ${index}`);
     }
   }
 
   // Convert the array to Uint8Array
   return new Uint8Array(array);
 };


export async function wrapContractInteraction (component,contractInvokation,args,successCallback) {
  component._dismissTransactionError();
  let req = undefined;

  try{
    req = await contractInvokation(...args);
    component.setState({ reqBeingSent: req.hash });
    const receipt = await req.wait();
    // The receipt, contains a status flag, which is 0 to indicate an error.
    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    successCallback();

  } catch (error) {
    // We check the error code to see if this error was produced because the
    // user rejected a tx. If that's the case, we do nothing.
    if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
      return;
    }

    // Other errors are logged and stored in the Dapp's state. This is used to
    // show them to the user, and for debugging.

    component.addSnack("error", error.reason);
    console.error(error);
    component.setState({ transactionError: error });
  } finally {
    // If we leave the try/catch, we aren't sending a request anymore, so we clear
    // this part of the state.
    component.setState({ reqBeingSent: undefined });
  }
}

export function bindWrapContractInteraction(component) {
  return function(asyncFunc, args, successCallback) {
    return wrapContractInteraction(component, asyncFunc, args, successCallback);
  };
}

export const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
