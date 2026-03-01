export const getPlaceNameFromCoords = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LocationAlertApp/1.0', // Required
        },
      }
    );
    
    const data = await response.json();
    return data.display_name || `Lat ${latitude.toFixed(3)}, Lng ${longitude.toFixed(3)}`;
  } catch (error) {
    return `Lat ${latitude.toFixed(3)}, Lng ${longitude.toFixed(3)}`;
  }
};