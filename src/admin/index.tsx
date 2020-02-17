import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createMuiTheme, CssBaseline } from "@material-ui/core";
import { ThemeProvider } from "@material-ui/styles";
import { pink, red, blue } from "@material-ui/core/colors";
import { App } from "./App";
import { store } from "./Store";
import "./index.css";

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: pink,
    error: red,
    contrastThreshold: 3
  },
  typography: {
    fontFamily: ["Lato", "sans-serif"].join(",")
  }
});

export default ReactDOM.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </Provider>,
  document.getElementById("root")
);
