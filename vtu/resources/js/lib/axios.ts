import axios from "axios";
import { getItem } from "./storage";

const instance = axios.create({
  baseURL: "/",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  withCredentials: true, // important for Laravel Sanctum CSRF
});

// attach token if present
instance.interceptors.request.use((config) => {
  const token = getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
