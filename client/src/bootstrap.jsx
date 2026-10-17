import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

export default function Application() {
  return <BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter>;
}
