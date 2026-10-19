export default function MetricTile({label,value,caption,icon:Icon,tone='neutral'}) {
  return <div className={`v3-metric v3-tone-${tone}`}>
    <div className="v3-metric-label"><span>{label}</span>{Icon&&<Icon size={18} strokeWidth={1.7} aria-hidden="true"/>}</div>
    <p className="v3-metric-value" title={typeof value==='string'?value:undefined}>{value}</p>
    {caption&&<p className="v3-metric-caption">{caption}</p>}
  </div>;
}
