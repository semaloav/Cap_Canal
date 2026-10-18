import React from "react";
import {createRoot} from "react-dom/client";
import CanalApp from "../app/canal-app";
import "../app/globals.css";
import "../app/workflow.css";
import "../app/barriers.css";

createRoot(document.getElementById("root")!).render(<CanalApp guest standalone/>);
