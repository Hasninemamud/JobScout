const ROLES = [
  "Software Engineer", "Product Manager", "Data Analyst", "UX Designer", "Marketing Manager",
  "DevOps Engineer", "Sales Representative", "Customer Success", "Project Manager", "Content Writer",
];

/** Infinite scrolling ticker of role names. The list is doubled so the loop is seamless. */
export function MarqueeBand() {
  const items = [...ROLES, ...ROLES];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((role, i) => (
          <span className="marquee-item" key={i}>
            {role}
            <span className="marquee-star">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
