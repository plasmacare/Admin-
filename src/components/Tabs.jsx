export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="admin-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`admin-tabs__btn${active === tab.key ? ' admin-tabs__btn--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
