
import 'antd/dist/reset.css';
import { MathJaxContext } from 'better-react-mathjax';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/chtml'] },
  options: { enableExplorer: false },
  menuOptions: { settings: { explorer: false } },
  chtml: { scale: 1 },
  startup: {
    typeset: true,
    ready: () => {
      const { MathJax } = window;
      if (MathJax?.startup?.defaultReady) {
        MathJax.startup.defaultReady();
      }

      const doc = MathJax?.startup?.document;
      const menuProxy = doc?.menu?.proxy;
      if (menuProxy?.settings) {
        menuProxy.settings.explorer = false;
        doc.menu.save();
      }

      if (doc?.explorer) {
        doc.explorer.stop?.();
        doc.explorer.events?.clear?.();
        doc.explorer = null;
      }

      if (doc?.options) {
        doc.options.enableExplorer = false;
      }
    }
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MathJaxContext config={mathJaxConfig}>
      <App />
    </MathJaxContext>
  </React.StrictMode>
);
