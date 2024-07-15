export const colors = [
   "#FFB347", // Persimmon
   "#FF6961", // Light Red
   "#77DD77", // Pastel Green
   "#AEC6CF", // Pastel Blue
   "#F49AC2", // Pastel Purple
   "#D4AF65", // Gold (Metallic)
   "#836953", // Coffee
   "#779ECB", // Dark Pastel Blue
   "#966FD6", // Light Purple
   "#169e74", // Dark Pastel Green
 ];

export const feedbackColors = {
   cc: "#000000", // Black
   nc: "#FFFFFF", // White
   xx: "#808080", // Gray
}

export const colorToInt = (color) => {
   return colors.indexOf(color);
}

export const intToColor = (int) => {
   return colors[int];
}

export const disputeColor = "#00886f"