import { FormEvent, useMemo, useState } from 'react'
import dogSprites from './assets/dog-sprites.jpeg'

type Tab = 'today' | 'week' | 'home' | 'history' | 'shop'
type Status = 'todo' | 'progress' | 'done'
type Task = {
  id: number
  title: string
  category: string
  day: number
  status: Status
  coins: number
}

const days = [
  { short: 'MON', date: 14 },
  { short: 'TUE', date: 15 },
  { short: 'WED', date: 16 },
  { short: 'THU', date: 17 },
  { short: 'FRI', date: 18 },
  { short: 'SAT', date: 19 },
  { short: 'SUN', date: 20 },
]

const initialTasks: Task[] = [
  { id: 1, title: 'Morning stretch', category: 'Health', day: 2, status: 'done', coins: 10 },
  { id: 2, title: 'Finish project outline', category: 'Work', day: 2, status: 'progress', coins: 25 },
  { id: 3, title: 'Pick up groceries', category: 'Errand', day: 2, status: 'todo', coins: 15 },
  { id: 4, title: 'Read for 20 minutes', category: 'Personal', day: 2, status: 'todo', coins: 10 },
  { id: 5, title: 'Team planning call', category: 'Work', day: 0, status: 'done', coins: 20 },
  { id: 6, title: 'Book dentist appointment', category: 'Health', day: 1, status: 'done', coins: 15 },
  { id: 7, title: 'Clean the kitchen', category: 'Home', day: 3, status: 'todo', coins: 15 },
  { id: 8, title: 'Send weekly recap', category: 'Work', day: 4, status: 'todo', coins: 20 },
  { id: 9, title: 'Long park walk', category: 'Health', day: 5, status: 'todo', coins: 20 },
]

const iconPaths: Record<string, React.ReactNode> = {
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-1v5l4 2" /></>,
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1 3 2.3c0 3.7-6 1.4-6 5.1C9 16 10.3 17 12 17s3-1.1 3-2.5M12 5v14" /></>,
  spark: <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  paw: <><circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="5" cy="13" r="2" /><circle cx="19" cy="13" r="2" /><path d="M8 17c0-3 1.8-5 4-5s4 2 4 5c0 2-1.8 3-4 3s-4-1-4-3Z" /></>,
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function Coin({ amount }: { amount: number }) {
  return <span className="coin"><span className="coin-dot">$</span>{amount}</span>
}

function TaskRow({ task, onChange }: { task: Task; onChange: (status: Status) => void }) {
  const nextStatus: Status = task.status === 'todo' ? 'progress' : task.status === 'progress' ? 'done' : 'todo'
  return (
    <article className={`task-row ${task.status}`}>
      <button className="status-button" onClick={() => onChange(nextStatus)} aria-label={`Change status of ${task.title}`}>
        {task.status === 'done' ? <Icon name="check" size={17} /> : task.status === 'progress' ? <span className="progress-square" /> : null}
      </button>
      <div className="task-copy">
        <h3>{task.title}</h3>
        <span className={`category ${task.category.toLowerCase()}`}>{task.category}</span>
      </div>
      {task.status === 'progress' && <span className="status-label"><Icon name="clock" size={14} /> In progress</span>}
      <Coin amount={task.coins} />
    </article>
  )
}

function DogSprite({ className = '' }: { className?: string }) {
  return <div className={`dog-sprite ${className}`} style={{ backgroundImage: `url(${dogSprites})` }} role="img" aria-label="Pixel art golden retriever" />
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [selectedDay, setSelectedDay] = useState(2)
  const [tasks, setTasks] = useState(initialTasks)
  const [showAdd, setShowAdd] = useState(false)
  const [coinBurst, setCoinBurst] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Personal')

  const dayTasks = tasks.filter((task) => task.day === selectedDay)
  const todayTasks = tasks.filter((task) => task.day === 2)
  const completed = todayTasks.filter((task) => task.status === 'done').length
  const coins = 245 + tasks.filter((task) => task.status === 'done').reduce((sum, task) => sum + task.coins, 0)

  const weekProgress = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'done').length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

  function updateTask(id: number, status: Status) {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task
      if (status === 'done' && task.status !== 'done') {
        setCoinBurst(task.coins)
        window.setTimeout(() => setCoinBurst(null), 1500)
      }
      return { ...task, status }
    }))
  }

  function addTask(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setTasks((current) => [...current, { id: Date.now(), title: name.trim(), category, day: selectedDay, status: 'todo', coins: 15 }])
    setName('')
    setShowAdd(false)
    setTab(selectedDay === 2 ? 'today' : 'week')
  }

  function goToDay(day: number) {
    setSelectedDay(day)
    setTab(day === 2 ? 'today' : 'week')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('home')}><span className="brand-mark"><Icon name="paw" size={22} /></span><span>TaskTails</span></button>
        <div className="top-actions">
          <div className="streak"><Icon name="spark" size={17} /><span><b>5</b> day streak</span></div>
          <div className="balance"><span className="coin-dot">$</span><b>{coins}</b></div>
          <button className="avatar" aria-label="Open profile">M</button>
        </div>
      </header>

      <main>
        {tab === 'home' && (
          <div className="page home-page">
            <section className="welcome">
              <div>
                <p className="eyebrow">WEDNESDAY, APRIL 16</p>
                <h1>Good morning, Maya.</h1>
                <p>Your little companion is ready for a productive day.</p>
              </div>
              <button className="primary-button" onClick={() => setShowAdd(true)}><Icon name="plus" size={19} /> Add task</button>
            </section>

            <div className="home-grid">
              <section className="game-card">
                <div className="scene-sky"><span className="pixel-cloud cloud-one" /><span className="pixel-cloud cloud-two" /></div>
                <div className="scene-hills" />
                <div className="scene-ground">
                  <div className="dog-house"><span className="roof" /><span className="house-body"><i /></span><span className="name-plaque">MILO</span></div>
                  <DogSprite />
                  <span className="flower f1" /><span className="flower f2" /><span className="flower f3" />
                  <span className="stone s1" /><span className="stone s2" />
                </div>
                <div className="scene-caption">
                  <div><span className="online-dot" /><b>Milo is feeling happy</b><p>Complete a task to earn coins for his home.</p></div>
                  <button onClick={() => setTab('shop')}><Icon name="bag" size={18} /> Visit shop</button>
                </div>
                {coinBurst && <div className="coin-burst">+{coinBurst} coins!</div>}
              </section>

              <section className="today-card">
                <div className="section-heading">
                  <div><p className="eyebrow">TODAY'S PLAN</p><h2>{completed} of {todayTasks.length} complete</h2></div>
                  <button className="text-button" onClick={() => setTab('today')}>View all <span>→</span></button>
                </div>
                <div className="progress-track"><span style={{ width: `${(completed / todayTasks.length) * 100}%` }} /></div>
                <div className="task-list">
                  {todayTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onChange={(status) => updateTask(task.id, status)} />)}
                </div>
              </section>
            </div>

            <section className="week-strip">
              <div className="week-copy"><p className="eyebrow">THIS WEEK</p><h2>Keep your rhythm going</h2><p>{weekProgress}% of this week’s tasks are complete.</p></div>
              <div className="day-dots">
                {days.map((day, index) => {
                  const count = tasks.filter((task) => task.day === index && task.status === 'done').length
                  return <button key={day.short} className={index === 2 ? 'active' : ''} onClick={() => goToDay(index)}><span>{day.short}</span><i>{count > 0 ? <Icon name="check" size={15} /> : day.date}</i></button>
                })}
              </div>
            </section>
          </div>
        )}

        {(tab === 'today' || tab === 'week') && (
          <div className="page tasks-page">
            <section className="page-title">
              <div><p className="eyebrow">{tab === 'today' ? 'TODAY' : 'WEEKLY PLANNER'}</p><h1>{tab === 'today' ? 'Wednesday’s tasks' : 'Plan your week'}</h1><p>Small steps count. Keep your day moving.</p></div>
              <button className="primary-button" onClick={() => setShowAdd(true)}><Icon name="plus" size={19} /> Add task</button>
            </section>
            <section className="calendar-row">
              {days.map((day, index) => <button key={day.short} className={selectedDay === index ? 'selected' : ''} onClick={() => setSelectedDay(index)}><span>{day.short}</span><b>{day.date}</b><i>{tasks.filter((t) => t.day === index).length}</i></button>)}
            </section>
            <div className="planner-grid">
              <section className="planner-card">
                <div className="section-heading"><div><p className="eyebrow">{days[selectedDay].short}, APRIL {days[selectedDay].date}</p><h2>{dayTasks.length} tasks planned</h2></div><Coin amount={dayTasks.reduce((sum, t) => sum + t.coins, 0)} /></div>
                <div className="task-list large">
                  {dayTasks.length ? dayTasks.map((task) => <TaskRow key={task.id} task={task} onChange={(status) => updateTask(task.id, status)} />) : <div className="empty-state"><Icon name="calendar" size={30} /><h3>A clear day</h3><p>Add something when you’re ready.</p></div>}
                </div>
              </section>
              <aside className="progress-card">
                <p className="eyebrow">WEEKLY PROGRESS</p>
                <div className="progress-ring" style={{ '--progress': `${weekProgress * 3.6}deg` } as React.CSSProperties}><div><b>{weekProgress}%</b><span>complete</span></div></div>
                <h3>You’re building momentum</h3>
                <p>Finish two more tasks to grow your streak.</p>
                <div className="reward-preview"><span className="pixel-crate">?</span><div><small>NEXT REWARD</small><b>Garden flower bed</b></div></div>
              </aside>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="page simple-page">
            <section className="page-title"><div><p className="eyebrow">YOUR LOG</p><h1>Task history</h1><p>Look back at everything you accomplished.</p></div></section>
            <section className="history-card">
              <div className="history-banner"><div><small>LAST WEEK</small><b>12 tasks completed</b></div><span><Icon name="coin" size={20} /> 185 earned</span></div>
              <h2>Completed this week</h2>
              <div className="task-list large">{tasks.filter((t) => t.status === 'done').map((task) => <TaskRow key={task.id} task={task} onChange={(status) => updateTask(task.id, status)} />)}</div>
            </section>
          </div>
        )}

        {tab === 'shop' && (
          <div className="page simple-page">
            <section className="page-title"><div><p className="eyebrow">MILO’S MARKET</p><h1>Make the yard your own</h1><p>Spend the coins you earn—not real money.</p></div><div className="shop-balance"><span className="coin-dot">$</span><b>{coins}</b> coins</div></section>
            <section className="shop-grid">
              {[['Flower bed', 'Add some color to Milo’s yard.', 120, 'flowers'], ['Red bandana', 'A classic look for a good pup.', 180, 'bandana'], ['Wooden fence', 'Make the little yard feel cozy.', 260, 'fence']].map(([title, copy, price, art]) => (
                <article className="shop-item" key={title as string}><div className={`item-art ${art}`}><span /></div><h2>{title}</h2><p>{copy}</p><button><span className="coin-dot">$</span> {price}</button></article>
              ))}
            </section>
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {([['today', 'check', 'Today'], ['week', 'calendar', 'Week'], ['home', 'home', 'Home'], ['history', 'history', 'History'], ['shop', 'bag', 'Shop']] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} className={`${tab === id ? 'active' : ''} ${id === 'home' ? 'home-button' : ''}`} onClick={() => setTab(id)}><span><Icon name={icon} size={21} /></span>{label}</button>
        ))}
      </nav>

      {showAdd && (
        <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}>
          <form className="task-modal" onSubmit={addTask} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close"><Icon name="close" /></button>
            <p className="eyebrow">NEW TASK</p><h2>What needs doing?</h2>
            <label>Task name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Water the plants" /></label>
            <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Personal</option><option>Work</option><option>Health</option><option>Errand</option><option>Home</option></select></label>
            <div className="modal-info"><Icon name="coin" size={18} /><span>Completing this task earns <b>15 coins</b></span></div>
            <button className="primary-button full" type="submit">Add to {days[selectedDay].short.toLowerCase()}</button>
          </form>
        </div>
      )}
    </div>
  )
}
