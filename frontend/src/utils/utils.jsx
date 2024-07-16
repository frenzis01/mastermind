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
 