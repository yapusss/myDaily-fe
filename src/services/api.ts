import axios from "axios";
import * as SecureStore from "expo-secure-store";

// We default to localhost. If running on Android Emulator, change to http://10.0.2.2:3000
// If running on a physical mobile device, replace with your local computer's IP (e.g. http://192.168.1.100:3000)
export const API_BASE_URL = "http://10.238.81.172:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Inject authentication token dynamically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("mydaily_jwt");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to retrieve JWT token from SecureStore:", e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
