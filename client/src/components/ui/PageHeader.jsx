/** Consistent page hierarchy with a single page heading and a restrained action slot. */
export default function PageHeader({eyebrow,title,description,action}) {
  return <header className="v3-page-header">
    <div className="min-w-0">
      {eyebrow&&<p className="v3-overline">{eyebrow}</p>}
      <h1 className="v3-page-title">{title}</h1>
      {description&&<p className="v3-page-description">{description}</p>}
    </div>
    {action&&<div className="v3-page-action">{action}</div>}
  </header>;
}
