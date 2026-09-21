export type TabKey = 'recipes' | 'calendar' | 'market' | 'leftovers' | 'calories'

type SubheaderProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

function Subheader({ activeTab, onChange }: SubheaderProps) {
  return (
    <div className="py-20 border-b-3">
      <ul className="container flex items-center gap-10 [&_li]:px-20 [&_li]:py-10  [&_li]:font-title [&_li]:text-16 [&_li]:font-bold [&_li]:uppercase ">
        <li
          className={activeTab === 'calendar' ? 'main-btn bg-main-blue text-white' : 'main-btn'}
          onClick={() => onChange('calendar')}
        >
          Calendar
        </li>
        <li
          className={activeTab === 'recipes' ? 'main-btn bg-main-blue text-white' : 'main-btn'}
          onClick={() => onChange('recipes')}
        >
          Recipes
        </li>
        <li
          className={activeTab === 'market' ? 'main-btn bg-main-blue text-white' : 'main-btn'}
          onClick={() => onChange('market')}
        >
          Market
        </li>
        <li
          className={activeTab === 'leftovers' ? 'main-btn bg-main-blue text-white' : 'main-btn'}
          onClick={() => onChange('leftovers')}
        >
          Leftovers
        </li>
        <li
          className={activeTab === 'calories' ? 'main-btn bg-main-blue text-white' : 'main-btn'}
          onClick={() => onChange('calories')}
        >
          Calories
        </li>
      </ul>
    </div>
  )
}

export default Subheader
