export default function SectionTitle({title,subtitle,action}) {
  return <div className="v3-section-head"><div className="min-w-0"><h2 className="v3-section-title">{title}</h2>{subtitle&&<p className="v3-section-subtitle">{subtitle}</p>}</div>{action&&<div className="v3-section-action">{action}</div>}</div>;
}
