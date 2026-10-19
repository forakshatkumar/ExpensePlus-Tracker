import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import {ThemeProvider} from "./context/ThemeContext";
import {PWAProvider} from "./components/pwa/PWAProvider";

export default function Application() {
  return <ThemeProvider><BrowserRouter><AuthProvider><PWAProvider><App/></PWAProvider></AuthProvider></BrowserRouter></ThemeProvider>;
}
