import { formatUkTime, formatUkDateTime } from "../format";
import { useState, useEffect } from "react";
import { getDay } from "../api";
import SummaryCard from "./SummaryCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";



function DayView() {
  const [date, setDate] = useState("2026-01-06");
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(function () {
    async function loadDay() {
      setLoading(true);
      setError("");
      try {
        const data = await getDay(date);
        setDayData(data);
      } catch (err) {
        setError("Could not load data. Please try again.");
        setDayData(null);
      }
      setLoading(false);
    }
    loadDay();
  }, [date]);

  function handleDateChange(event) {
    setDate(event.target.value);
  }

  let body;
  if (loading) {
    body = <p>Loading...</p>;
  } else if (error !== "") {
    body = <p className="error-text">{error}</p>;
  } else if (dayData === null) {
    body = null;
  } else {
    // Table rows
    const tableRows = [];
    for (let i = 0; i < dayData.rows.length; i++) {
      const row = dayData.rows[i];
      let errorClass;
      if (row.error > 0) {
        errorClass = "error-high";
      } else {
        errorClass = "error-low";
      }
      tableRows.push(
        <tr key={row.startTime}>
          <td>{formatUkTime(row.startTime)}</td>
          <td>{row.forecast}</td>
          <td>{row.actual}</td>
          <td className={errorClass}>{row.error}</td>
        </tr>
      );
    }

    // Chart data (STEP 2)
    const chartData = [];
    for (let i = 0; i < dayData.rows.length; i++) {
      const row = dayData.rows[i];
      chartData.push({
        time: formatUkTime(row.startTime),
        forecast: row.forecast,
        actual: row.actual
      });
    }

    let publishText = "Not available";
    if (dayData.forecastPublishTime !== null) {
      publishText = formatUkDateTime(dayData.forecastPublishTime);
    }

    body = (
      <div>
        <div className="cards">
          <SummaryCard label="Forecast used" value={publishText} note="Latest before 10:00 UK, day before" />
          <SummaryCard label="Average error" value={dayData.averageError + " MW"} note="Typical miss per hour" />
          <SummaryCard label="Hours compared" value={dayData.rows.length} note="Forecast vs actual" />
        </div>

        {/* Chart (STEP 3) */}
        <div className="chart-box">
         <h3>Forecast vs actual wind generation (MW)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
             <YAxis width={70} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Time (UK)</th>
              <th>Forecast (MW)</th>
              <th>Actual (MW)</th>
              <th>Error (MW)</th>
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    );
  }

  return (
    <section>
      <div className="controls">
        <label htmlFor="delivery-date">Delivery date</label>
        <input
          id="delivery-date"
          type="date"
          value={date}
          min="2026-01-02"
          max="2026-02-01"
          onChange={handleDateChange}
        />
      </div>
      {body}
    </section>
  );
}

export default DayView;