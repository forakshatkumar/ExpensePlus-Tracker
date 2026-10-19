export default function EmptyState({icon:Icon,title,description,action}) {
  return <div className="v3-empty" role="status">
    {Icon&&<div className="v3-empty-icon"><Icon size={23} strokeWidth={1.6} aria-hidden="true"/></div>}
    <h3 className="v3-empty-title">{title}</h3>
    {description&&<p className="v3-empty-description">{description}</p>}
    {action&&<div className="mt-5">{action}</div>}
  </div>;
}
