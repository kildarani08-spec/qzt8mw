function SummaryCard(props) {
  return (
    <div className="card">
      <p className="card-label">{props.label}</p>
      <p className="card-value">{props.value}</p>
      <p className="card-note">{props.note}</p>
    </div>
  );
}

export default SummaryCard;