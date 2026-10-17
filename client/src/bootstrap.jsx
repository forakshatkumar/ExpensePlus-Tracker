import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import {PWAProvider} from "./components/pwa/PWAProvider";

export default function Application() {
  return <BrowserRouter><AuthProvider><PWAProvider><App/></PWAProvider></AuthProvider></BrowserRouter>;
}
