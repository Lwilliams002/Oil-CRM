import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HashRouter } from "react-router-dom";

import { ChakraProvider} from "@chakra-ui/react";

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </HashRouter>
);
