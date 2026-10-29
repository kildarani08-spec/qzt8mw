import { useState, useEffect } from "react";
import { getAccuracy } from "../api";
import { formatUkDateTime } from "../format";
import SummaryCard from "./SummaryCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function AccuracyView() {
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function () {
    async function loadAccuracy() {
      try {
        const data = await getAccuracy();
        setAccuracy(data);
      } catch (err) {
        setError("Could not load accuracy data. Please try again.");
      }
      setLoading(false);
    }
    loadAccuracy();
  }, []);

  if (loading) {
    return <p>Calculating accuracy for all of January... (first load can take up to a minute)</p>;
  }

  if (error !== "") {
    return <p className="error-text">{error}</p>;
  }

  let biasNote;
  let insightText;
  if (accuracy.bias > 0) {
    biasNote = "Forecast usually too high";
    insightText = "In January the forecast over-predicted wind by about " + accuracy.bias + " MW on average.";
  } else {
    biasNote = "Forecast usually too low";
    insightText = "In January the forecast under-predicted wind by about " + Math.abs(accuracy.bias) + " MW on average.";
  }

  const chartData = [];
  for (let i = 0; i < accuracy.byHour.length; i++) {
    const item = accuracy.byHour[i];
    chartData.push({
      hour: item.hour + ":00",
      averageError: item.averageError
    });
  }

  const worst = accuracy.worstError;

  return (
    <section>
      <p className="period">{accuracy.period} · {accuracy.hoursCompared} hours compared</p>

      <div className="cards">
        <SummaryCard label="Average error (MAE)" value={accuracy.mae + " MW"} note="Typical miss per hour" />
        <SummaryCard label="Bias" value={accuracy.bias + " MW"} note={biasNote} />
        <SummaryCard label="P90 error" value={accuracy.p90 + " MW"} note="90% of hours miss by less than this" />
        <SummaryCard label="Worst error" value={worst.error + " MW"} note={formatUkDateTime(worst.startTime)} />
      </div>

      <div className="insight">
        <strong>What this means: </strong>
        {insightText} To be covered 90% of the time, plan for about {accuracy.p90} MW less wind than forecast.
      </div>

      <div className="chart-box">
        <h3>Average error by hour of day (MW)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis width={60} />
            <Tooltip />
            <Bar dataKey="averageError" name="Average error" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default AccuracyView;