const projects = [
  { name: "Urban Canopy Recovery", place: "Pune, Maharashtra", status: "Active", assets: 128, progress: 72, color: "sage" },
  { name: "Riverbank Restoration", place: "Nashik, Maharashtra", status: "Active", assets: 86, progress: 48, color: "blue" },
  { name: "Community Water Access", place: "Satara, Maharashtra", status: "Review", assets: 54, progress: 91, color: "gold" },
];

function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="ImpactLens home">
          <span className="brand-mark">i</span><span>impact<span className="brand-light">lens</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch"><span className="workspace-avatar">GF</span><span><b>Green Futures</b><small>Organization</small></span><span className="chevron">⌄</span></button>
        <div className="nav-label">OVERVIEW</div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span className="nav-icon">◫</span>Overview</a>
          <a className="nav-item" href="#projects"><span className="nav-icon">▦</span>Projects<span className="nav-count">3</span></a>
          <a className="nav-item" href="#evidence"><span className="nav-icon">▧</span>Evidence library</a>
          <a className="nav-item" href="#insights"><span className="nav-icon">✳</span>Insights</a>
          <a className="nav-item" href="#reports"><span className="nav-icon">▤</span>Reports</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">?</span><b>Need a hand?</b><p>Explore the field guide to get started.</p><a href="mailto:support@impactlens.ai">Open field guide <span>↗</span></a></div><button className="profile"><span className="profile-avatar">CP</span><span><b>Chirag Pandey</b><small>Project manager</small></span><span className="chevron">···</span></button></div>
      </aside>

      <main className="main" id="home">
        <header className="topbar"><div className="breadcrumb">Green Futures <span>/</span> Overview</div><div className="top-actions"><button className="icon-button" aria-label="Search">⌕</button><button className="icon-button notification" aria-label="Notifications">♧<i /></button><span className="top-avatar">CP</span></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> MONDAY, SEPTEMBER 28, 2026</div><h1>Good morning, Chirag <span className="wave">✳</span></h1><p className="subtitle">Here’s what’s happening across your impact projects.</p></div><button className="primary-button" onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}><span>＋</span> New project</button></div>

          <section className="metric-grid" aria-label="Workspace summary">
            <article className="metric-card"><div className="metric-top"><span>Active projects</span><span className="metric-icon green">▦</span></div><div className="metric-value">03 <span className="metric-change">↗ 1 this month</span></div><div className="metric-foot">Across 3 regions</div></article>
            <article className="metric-card"><div className="metric-top"><span>Evidence collected</span><span className="metric-icon blue">▧</span></div><div className="metric-value">268 <span className="metric-unit">assets</span></div><div className="metric-foot"><span className="tiny-bars"><i/><i/><i/><i/><i/><i/><i/></span> +34 this week</div></article>
            <article className="metric-card"><div className="metric-top"><span>AI analyses</span><span className="metric-icon violet">✳</span></div><div className="metric-value">214 <span className="metric-unit">completed</span></div><div className="metric-foot">80% of collected evidence</div></article>
            <article className="metric-card"><div className="metric-top"><span>Coverage gaps</span><span className="metric-icon amber">⌁</span></div><div className="metric-value">07 <span className="metric-change warn">Needs attention</span></div><div className="metric-foot">Across 2 projects</div></article>
          </section>

          <section className="projects-section" id="projects"><div className="section-heading"><div><div className="section-kicker">YOUR WORK</div><h2>Projects <span className="count-pill">3</span></h2></div><a className="text-link" href="#projects">View all projects <span>→</span></a></div>
            <div className="project-table"><div className="table-head"><span>PROJECT</span><span>STATUS</span><span>EVIDENCE</span><span>DOCUMENTATION</span><span /></div>{projects.map((project) => <article className="project-row" key={project.name}><div className="project-cell"><span className={`project-symbol ${project.color}`}>{project.name.charAt(0)}</span><span><b>{project.name}</b><small>⌖ &nbsp;{project.place}</small></span></div><div><span className={`status ${project.status === "Active" ? "status-active" : "status-review"}`}><i />{project.status}</span></div><div className="evidence-count"><b>{project.assets}</b><span> assets</span></div><div className="progress-cell"><div className="progress-info"><span>{project.progress}%</span><small>documented</small></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div></div><button className="row-menu" aria-label={`More options for ${project.name}`}>···</button></article>)}</div>
            <div className="table-footer"><span>Showing <b>3</b> of <b>3</b> projects</span><a href="#projects">Browse project workspace <span>→</span></a></div>
          </section>

          <section className="bottom-grid"><article className="activity-card"><div className="section-heading compact"><div><div className="section-kicker">LATEST UPDATES</div><h2>Recent activity</h2></div><button className="subtle-button">This week⌄</button></div><div className="activity-list"><div className="activity-item"><span className="activity-icon upload">↑</span><span><b>34 new photos</b> added to <strong>Urban Canopy Recovery</strong><small>Today, 10:42 AM · Uploaded by Aditi Rao</small></span></div><div className="activity-item"><span className="activity-icon insight">✳</span><span><b>Analysis complete</b> for <strong>Riverbank Restoration</strong><small>Today, 9:18 AM · 12 assets analyzed</small></span></div><div className="activity-item"><span className="activity-icon report">▤</span><span><b>Quarterly report generated</b><small>Yesterday, 4:36 PM · Community Water Access</small></span></div></div></article>
            <article className="coverage-card"><div className="section-kicker">EVIDENCE HEALTH</div><h2>Documentation coverage</h2><p>How well your projects are capturing impact.</p><div className="coverage-row"><span className="coverage-ring"><span>78<small>%</small></span></span><div className="coverage-details"><b>Looking good</b><span>Overall evidence coverage</span><div className="coverage-legend"><i /> Documented <i className="legend-gap" /> Gaps</div></div></div><a className="text-link" href="#insights">Review coverage gaps <span>→</span></a></article></section>
          <footer>ImpactLens <span>·</span> Turning field evidence into lasting impact <span className="footer-right">Need help? <a href="mailto:support@impactlens.ai">Talk to our team ↗</a></span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
