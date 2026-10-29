import AccuracyView from "./components/AccuracyView";
import DayView from "./components/DayView";
import { useState } from "react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("day");

  function getTabClass(tabName) {
    if (activeTab === tabName) {
      return "tab active";
    } else {
      return "tab";
    }
  }

  let content;
  if (activeTab === "day") {
   content = <DayView />;
  } else {
    content = <AccuracyView />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>UK Wind Forecast Monitor</h1>
        <p className="subtitle">January 2026 · All times in UK time</p>
      </header>

      <nav className="tabs">
        <button className={getTabClass("day")} onClick={function () { setActiveTab("day"); }}>
          Daily Forecast
        </button>
        <button className={getTabClass("accuracy")} onClick={function () { setActiveTab("accuracy"); }}>
          Forecast Accuracy
        </button>
      </nav>

      <main>{content}</main>
    </div>
  );
}

export default App;