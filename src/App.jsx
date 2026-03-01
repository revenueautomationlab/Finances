
import React, { useState, useEffect, useMemo } from 'react'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const currency = (n) => {
  const num = Number(n) || 0
  return 'BHD ' + num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const API = '/api/data'

const initialState = { projects: [], bankSpending: [], charitySpending: [] }

async function fetchState() {
  try {
    const res = await fetch(API)
    const data = await res.json()
    return { ...initialState, ...data }
  } catch { return initialState }
}

async function saveState(data) {
  try {
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  } catch (e) { console.error('Failed to save:', e) }
}

// --- SVG Icons ---
const Icons = {
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  projects: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  bank: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  charity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  revenue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  expense: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  profit: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  partner: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  empty: <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
}

export default function App() {
  const [state, setState] = useState(initialState)
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchState().then(data => { setState(data); setLoaded(true) }) }, [])
  useEffect(() => { if (loaded) saveState(state) }, [state, loaded])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const { projects, bankSpending, charitySpending } = state
  const updateProjects = (fn) => setState(s => ({ ...s, projects: fn(s.projects) }))

  const projectStats = useMemo(() => {
    return projects.map(p => {
      const totalPaid = (p.payments || []).reduce((a, x) => a + x.amount, 0)
      const unpaid = p.totalValue - totalPaid
      const totalExpenses = (p.expenses || []).reduce((a, x) => a + x.amount, 0)
      const profit = totalPaid - totalExpenses
      const share = profit > 0 ? profit * 0.25 : 0
      return { ...p, totalPaid, unpaid, totalExpenses, profit, bankShare: share, partner1Share: share, partner2Share: share, charityShare: share }
    })
  }, [projects])

  const globalBank = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.bankShare, 0)
    const spent = bankSpending.reduce((a, x) => a + x.amount, 0)
    return { income, spent, balance: income - spent }
  }, [projectStats, bankSpending])

  const globalCharity = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.charityShare, 0)
    const spent = charitySpending.reduce((a, x) => a + x.amount, 0)
    return { income, spent, balance: income - spent }
  }, [projectStats, charitySpending])

  const globalProfit = projectStats.reduce((a, p) => a + p.profit, 0)
  const globalPartner1 = projectStats.reduce((a, p) => a + p.partner1Share, 0)
  const globalPartner2 = projectStats.reduce((a, p) => a + p.partner2Share, 0)
  const globalRevenue = projectStats.reduce((a, p) => a + p.totalPaid, 0)
  const globalExpenses = projectStats.reduce((a, p) => a + p.totalExpenses, 0)
  const selectedProject = projectStats.find(p => p.id === selectedProjectId) || null

  // --- CRUD ---
  const addProject = (name, totalValue) => {
    updateProjects(ps => [...ps, { id: uid(), name, totalValue: Number(totalValue), payments: [], expenses: [], createdAt: new Date().toISOString() }])
    showToast('Project created')
  }
  const editProject = (id, name, totalValue) => {
    updateProjects(ps => ps.map(p => p.id === id ? { ...p, name, totalValue: Number(totalValue) } : p))
    showToast('Project updated')
  }
  const deleteProject = (id) => {
    if (!confirm('Delete this project and all its data?')) return
    updateProjects(ps => ps.filter(p => p.id !== id))
    if (selectedProjectId === id) { setSelectedProjectId(null); setView('dashboard') }
    showToast('Project deleted', 'error')
  }
  const addPayment = (projectId, amount, date, note) => {
    updateProjects(ps => ps.map(p => p.id === projectId ? { ...p, payments: [...(p.payments || []), { id: uid(), amount: Number(amount), date, note }] } : p))
    showToast('Payment recorded')
  }
  const deletePayment = (projectId, paymentId) => {
    updateProjects(ps => ps.map(p => p.id === projectId ? { ...p, payments: p.payments.filter(x => x.id !== paymentId) } : p))
    showToast('Payment removed', 'error')
  }
  const addExpense = (projectId, amount, date, description) => {
    updateProjects(ps => ps.map(p => p.id === projectId ? { ...p, expenses: [...(p.expenses || []), { id: uid(), amount: Number(amount), date, description }] } : p))
    showToast('Expense recorded')
  }
  const deleteExpense = (projectId, expenseId) => {
    updateProjects(ps => ps.map(p => p.id === projectId ? { ...p, expenses: p.expenses.filter(x => x.id !== expenseId) } : p))
    showToast('Expense removed', 'error')
  }
  const addBankSpending = (amount, date, description) => {
    setState(s => ({ ...s, bankSpending: [...s.bankSpending, { id: uid(), amount: Number(amount), date, description }] }))
    showToast('Bank spending recorded')
  }
  const deleteBankSpending = (id) => {
    setState(s => ({ ...s, bankSpending: s.bankSpending.filter(x => x.id !== id) }))
    showToast('Spending removed', 'error')
  }
  const addCharitySpending = (amount, date, description) => {
    setState(s => ({ ...s, charitySpending: [...s.charitySpending, { id: uid(), amount: Number(amount), date, description }] }))
    showToast('Charity spending recorded')
  }
  const deleteCharitySpending = (id) => {
    setState(s => ({ ...s, charitySpending: s.charitySpending.filter(x => x.id !== id) }))
    showToast('Spending removed', 'error')
  }
  const openProject = (id) => { setSelectedProjectId(id); setView('project') }

  // --- Modal Form ---
  function ModalForm({ title, fields, onSubmit, onClose }) {
    const [values, setValues] = useState(() => {
      const v = {}
      fields.forEach(f => { v[f.name] = f.default || '' })
      return v
    })
    const set = (name, val) => setValues(v => ({ ...v, [name]: val }))
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(values); onClose() }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="btn-icon" onClick={onClose}>{Icons.close}</button>
          </div>
          <form onSubmit={handleSubmit}>
            {fields.map(f => (
              <div key={f.name} className="form-group">
                <label>{f.label}</label>
                <input type={f.type || 'text'} value={values[f.name]} onChange={e => set(f.name, e.target.value)} placeholder={f.placeholder} required={f.required} step={f.type === 'number' ? '0.01' : undefined} />
              </div>
            ))}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{title.startsWith('Edit') ? 'Update' : title.startsWith('Spend') ? 'Record' : 'Add'}</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- Sidebar ---
  function Sidebar() {
    const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
      { key: 'projects', label: 'Projects', icon: Icons.projects, count: projects.length },
      { key: 'bank', label: 'Bank Savings', icon: Icons.bank },
      { key: 'charity', label: 'Charity', icon: Icons.charity },
    ]
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">R</div>
          <div>
            <h2>RAL Finance</h2>
            <span className="brand-sub">Project Tracker</span>
          </div>
        </div>
        <nav>
          <div className="nav-label">Menu</div>
          {navItems.map(n => (
            <button key={n.key} className={`nav-item ${view === n.key || (n.key === 'projects' && view === 'project') ? 'active' : ''}`} onClick={() => setView(n.key)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-text">{n.label}</span>
              {n.count > 0 && <span className="nav-badge">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-stat">
            <div className="sidebar-stat-icon bank-icon">{Icons.bank}</div>
            <div className="sidebar-stat-info">
              <span>Bank</span>
              <strong className={globalBank.balance >= 0 ? 'text-income' : 'text-expense'}>{currency(globalBank.balance)}</strong>
            </div>
          </div>
          <div className="sidebar-stat">
            <div className="sidebar-stat-icon charity-icon">{Icons.charity}</div>
            <div className="sidebar-stat-info">
              <span>Charity</span>
              <strong className={globalCharity.balance >= 0 ? 'text-income' : 'text-expense'}>{currency(globalCharity.balance)}</strong>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  // --- Dashboard ---
  function DashboardView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Overview of all project finances</p>
          </div>
        </div>

        <div className="stats-grid cols-4">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue">{Icons.revenue}</div>
            <div className="stat-content">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{currency(globalRevenue)}</div>
              <div className="stat-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-expense">{Icons.expense}</div>
            <div className="stat-content">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value text-expense">{currency(globalExpenses)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-income">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Net Profit</div>
              <div className="stat-value text-income">{currency(globalProfit)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-bank">{Icons.bank}</div>
            <div className="stat-content">
              <div className="stat-label">Bank Balance</div>
              <div className="stat-value text-bank">{currency(globalBank.balance)}</div>
            </div>
          </div>
        </div>

        {/* Profit Distribution */}
        {globalProfit > 0 && (
          <div className="card">
            <h2 className="section-title">Profit Distribution</h2>
            <p className="section-sub">Automatically split 25% each across all projects</p>
            <div className="distribution-grid">
              <div className="dist-item">
                <div className="dist-bar bg-bank" style={{ width: '100%' }}></div>
                <div className="dist-info">
                  <span className="dist-label">Bank Savings</span>
                  <span className="dist-value">{currency(globalBank.income)}</span>
                </div>
              </div>
              <div className="dist-item">
                <div className="dist-bar bg-partner1" style={{ width: '100%' }}></div>
                <div className="dist-info">
                  <span className="dist-label">Partner 1</span>
                  <span className="dist-value">{currency(globalPartner1)}</span>
                </div>
              </div>
              <div className="dist-item">
                <div className="dist-bar bg-partner2" style={{ width: '100%' }}></div>
                <div className="dist-info">
                  <span className="dist-label">Partner 2</span>
                  <span className="dist-value">{currency(globalPartner2)}</span>
                </div>
              </div>
              <div className="dist-item">
                <div className="dist-bar bg-charity" style={{ width: '100%' }}></div>
                <div className="dist-info">
                  <span className="dist-label">Charity</span>
                  <span className="dist-value">{currency(globalCharity.income)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Projects Overview</h2>
              <p className="section-sub">All projects at a glance</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setView('projects')}>{Icons.eye} <span>View All</span></button>
          </div>
          {projectStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.empty}</div>
              <h3>No projects yet</h3>
              <p>Create your first project to start tracking finances.</p>
              <button className="btn btn-primary" onClick={() => { setView('projects'); setModal({
                title: 'New Project',
                fields: [
                  { name: 'name', label: 'Project Name', placeholder: 'e.g. Website Redesign', required: true },
                  { name: 'totalValue', label: 'Total Project Value (BHD)', type: 'number', placeholder: '0.00', required: true }
                ],
                onSubmit: (v) => addProject(v.name, v.totalValue)
              }) }}>{Icons.plus} <span>New Project</span></button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Value</th>
                    <th>Paid</th>
                    <th>Unpaid</th>
                    <th>Expenses</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projectStats.slice().reverse().map(p => (
                    <tr key={p.id} className="clickable-row" onClick={() => openProject(p.id)}>
                      <td><span className="cell-project">{p.name}</span></td>
                      <td>{currency(p.totalValue)}</td>
                      <td className="text-income">{currency(p.totalPaid)}</td>
                      <td className="text-expense">{currency(p.unpaid)}</td>
                      <td>{currency(p.totalExpenses)}</td>
                      <td className={p.profit >= 0 ? 'text-income font-semibold' : 'text-expense font-semibold'}>{currency(p.profit)}</td>
                      <td>
                        <span className={`badge ${p.unpaid <= 0 ? 'badge-income' : p.totalPaid > 0 ? 'badge-warning' : 'badge-muted'}`}>
                          {p.unpaid <= 0 ? 'Paid' : p.totalPaid > 0 ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td><button className="btn btn-ghost btn-sm">{Icons.eye}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Projects List ---
  function ProjectsView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({
            title: 'New Project',
            fields: [
              { name: 'name', label: 'Project Name', placeholder: 'e.g. Website Redesign', required: true },
              { name: 'totalValue', label: 'Total Project Value (BHD)', type: 'number', placeholder: '0.00', required: true }
            ],
            onSubmit: (v) => addProject(v.name, v.totalValue)
          })}>{Icons.plus} <span>New Project</span></button>
        </div>

        {projectStats.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">{Icons.empty}</div>
            <h3>No projects yet</h3>
            <p>Click "New Project" above to create your first one.</p>
          </div>
        ) : (
          <div className="project-grid">
            {projectStats.slice().reverse().map(p => {
              const paidPct = p.totalValue > 0 ? Math.min(100, (p.totalPaid / p.totalValue) * 100) : 0
              return (
                <div key={p.id} className="project-card" onClick={() => openProject(p.id)}>
                  <div className="project-card-top">
                    <div className="project-card-title">
                      <h3>{p.name}</h3>
                      <span className={`badge ${p.unpaid <= 0 ? 'badge-income' : p.totalPaid > 0 ? 'badge-warning' : 'badge-muted'}`}>
                        {p.unpaid <= 0 ? 'Fully Paid' : p.totalPaid > 0 ? 'Partial' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="project-card-value">{currency(p.totalValue)}</div>
                  </div>

                  <div className="project-card-progress">
                    <div className="progress-header">
                      <span>Payment Progress</span>
                      <span>{Math.round(paidPct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${paidPct}%` }}></div>
                    </div>
                  </div>

                  <div className="project-card-stats">
                    <div className="pcs-item">
                      <span className="pcs-label">Paid</span>
                      <span className="pcs-value text-income">{currency(p.totalPaid)}</span>
                    </div>
                    <div className="pcs-item">
                      <span className="pcs-label">Unpaid</span>
                      <span className="pcs-value text-expense">{currency(p.unpaid)}</span>
                    </div>
                    <div className="pcs-item">
                      <span className="pcs-label">Expenses</span>
                      <span className="pcs-value">{currency(p.totalExpenses)}</span>
                    </div>
                    <div className="pcs-item">
                      <span className="pcs-label">Profit</span>
                      <span className={`pcs-value font-semibold ${p.profit >= 0 ? 'text-income' : 'text-expense'}`}>{currency(p.profit)}</span>
                    </div>
                  </div>

                  <div className="project-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openProject(p.id) }}>{Icons.eye} <span>View</span></button>
                    <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}>{Icons.trash}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // --- Project Detail ---
  function ProjectDetailView() {
    if (!selectedProject) return <div className="empty-state"><p>Project not found.</p></div>
    const p = selectedProject
    const paidPct = p.totalValue > 0 ? Math.min(100, (p.totalPaid / p.totalValue) * 100) : 0

    return (
      <div className="fade-in">
        <button className="btn btn-ghost btn-back" onClick={() => setView('projects')}>{Icons.back} <span>Back to Projects</span></button>

        <div className="page-header">
          <div>
            <h1 className="page-title">{p.name}</h1>
            <p className="page-sub">Project value: {currency(p.totalValue)}</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost" onClick={() => setModal({
              title: 'Edit Project',
              fields: [
                { name: 'name', label: 'Project Name', default: p.name, required: true },
                { name: 'totalValue', label: 'Total Value (BHD)', type: 'number', default: String(p.totalValue), required: true }
              ],
              onSubmit: (v) => editProject(p.id, v.name, v.totalValue)
            })}>{Icons.edit} <span>Edit</span></button>
            <button className="btn btn-danger-ghost" onClick={() => deleteProject(p.id)}>{Icons.trash} <span>Delete</span></button>
          </div>
        </div>

        <div className="stats-grid cols-4">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue">{Icons.revenue}</div>
            <div className="stat-content">
              <div className="stat-label">Total Value</div>
              <div className="stat-value">{currency(p.totalValue)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-income">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Paid</div>
              <div className="stat-value text-income">{currency(p.totalPaid)}</div>
              <div className="progress-bar mini"><div className="progress-fill" style={{ width: `${paidPct}%` }}></div></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-expense">{Icons.expense}</div>
            <div className="stat-content">
              <div className="stat-label">Unpaid</div>
              <div className="stat-value text-expense">{currency(p.unpaid)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-profit">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Net Profit</div>
              <div className="stat-value" style={{color: p.profit >= 0 ? 'var(--income)' : 'var(--expense)'}}>{currency(p.profit)}</div>
            </div>
          </div>
        </div>

        {/* Profit Split */}
        {p.profit > 0 && (
          <div className="card">
            <h2 className="section-title">Profit Split</h2>
            <p className="section-sub">25% allocation per category</p>
            <div className="split-grid">
              <div className="split-item split-bank">
                <div className="split-icon">{Icons.bank}</div>
                <div className="split-label">Bank Savings</div>
                <div className="split-value">{currency(p.bankShare)}</div>
              </div>
              <div className="split-item split-partner1">
                <div className="split-icon">{Icons.partner}</div>
                <div className="split-label">Partner 1</div>
                <div className="split-value">{currency(p.partner1Share)}</div>
              </div>
              <div className="split-item split-partner2">
                <div className="split-icon">{Icons.partner}</div>
                <div className="split-label">Partner 2</div>
                <div className="split-value">{currency(p.partner2Share)}</div>
              </div>
              <div className="split-item split-charity">
                <div className="split-icon">{Icons.charity}</div>
                <div className="split-label">Charity</div>
                <div className="split-value">{currency(p.charityShare)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Payments</h2>
              <p className="section-sub">{(p.payments || []).length} payment{(p.payments || []).length !== 1 ? 's' : ''} recorded</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({
              title: 'Add Payment',
              fields: [
                { name: 'amount', label: 'Amount (BHD)', type: 'number', placeholder: '0.00', required: true },
                { name: 'date', label: 'Date', type: 'date', default: new Date().toISOString().split('T')[0], required: true },
                { name: 'note', label: 'Note', placeholder: 'Payment note (optional)' }
              ],
              onSubmit: (v) => addPayment(p.id, v.amount, v.date, v.note)
            })}>{Icons.plus} <span>Add Payment</span></button>
          </div>
          {(p.payments || []).length === 0 ? (
            <p className="text-muted-block">No payments recorded yet. Add your first payment above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Note</th><th></th></tr></thead>
                <tbody>
                  {[...(p.payments || [])].reverse().map(pay => (
                    <tr key={pay.id}>
                      <td>{formatDate(pay.date)}</td>
                      <td><span className="amount-pill income">{currency(pay.amount)}</span></td>
                      <td>{pay.note || <span className="text-muted">-</span>}</td>
                      <td><button className="btn btn-danger-ghost btn-xs" onClick={() => deletePayment(p.id, pay.id)}>{Icons.trash}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Expenses</h2>
              <p className="section-sub">{(p.expenses || []).length} expense{(p.expenses || []).length !== 1 ? 's' : ''} recorded</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({
              title: 'Add Expense',
              fields: [
                { name: 'amount', label: 'Amount (BHD)', type: 'number', placeholder: '0.00', required: true },
                { name: 'date', label: 'Date', type: 'date', default: new Date().toISOString().split('T')[0], required: true },
                { name: 'description', label: 'Description', placeholder: 'What was this expense for?', required: true }
              ],
              onSubmit: (v) => addExpense(p.id, v.amount, v.date, v.description)
            })}>{Icons.plus} <span>Add Expense</span></button>
          </div>
          {(p.expenses || []).length === 0 ? (
            <p className="text-muted-block">No expenses recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {[...(p.expenses || [])].reverse().map(exp => (
                    <tr key={exp.id}>
                      <td>{formatDate(exp.date)}</td>
                      <td><span className="amount-pill expense">{currency(exp.amount)}</span></td>
                      <td>{exp.description}</td>
                      <td><button className="btn btn-danger-ghost btn-xs" onClick={() => deleteExpense(p.id, exp.id)}>{Icons.trash}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Bank View ---
  function BankView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Bank Savings</h1>
            <p className="page-sub">25% of all project profits go to bank savings</p>
          </div>
        </div>

        <div className="stats-grid cols-3">
          <div className="stat-card highlight-card bg-income-soft">
            <div className="stat-content">
              <div className="stat-label">Total Accumulated</div>
              <div className="stat-value text-income">{currency(globalBank.income)}</div>
              <div className="stat-sub">From project profits</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-expense-soft">
            <div className="stat-content">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-expense">{currency(globalBank.spent)}</div>
              <div className="stat-sub">{bankSpending.length} transaction{bankSpending.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-bank-soft">
            <div className="stat-content">
              <div className="stat-label">Current Balance</div>
              <div className="stat-value text-bank">{currency(globalBank.balance)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Spending History</h2>
              <p className="section-sub">Independent of project expenses</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({
              title: 'Spend from Bank',
              fields: [
                { name: 'amount', label: 'Amount (BHD)', type: 'number', placeholder: '0.00', required: true },
                { name: 'date', label: 'Date', type: 'date', default: new Date().toISOString().split('T')[0], required: true },
                { name: 'description', label: 'Description', placeholder: 'What was this for?', required: true }
              ],
              onSubmit: (v) => addBankSpending(v.amount, v.date, v.description)
            })}>{Icons.plus} <span>Record Spending</span></button>
          </div>
          {bankSpending.length === 0 ? (
            <p className="text-muted-block">No spending recorded from bank savings yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {[...bankSpending].reverse().map(s => (
                    <tr key={s.id}>
                      <td>{formatDate(s.date)}</td>
                      <td><span className="amount-pill expense">{currency(s.amount)}</span></td>
                      <td>{s.description}</td>
                      <td><button className="btn btn-danger-ghost btn-xs" onClick={() => deleteBankSpending(s.id)}>{Icons.trash}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Contributions by Project</h2>
          <p className="section-sub">How much each project contributed to bank savings</p>
          {projectStats.filter(p => p.bankShare > 0).length === 0 ? (
            <p className="text-muted-block">No contributions yet. Profits from projects will appear here.</p>
          ) : (
            <div className="contributions-list">
              {projectStats.filter(p => p.bankShare > 0).map(p => (
                <div key={p.id} className="contribution-row" onClick={() => openProject(p.id)}>
                  <span className="contribution-name">{p.name}</span>
                  <span className="contribution-amount text-income">{currency(p.bankShare)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Charity View ---
  function CharityView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Charity</h1>
            <p className="page-sub">25% of all project profits go to charity</p>
          </div>
        </div>

        <div className="stats-grid cols-3">
          <div className="stat-card highlight-card bg-income-soft">
            <div className="stat-content">
              <div className="stat-label">Total Accumulated</div>
              <div className="stat-value text-income">{currency(globalCharity.income)}</div>
              <div className="stat-sub">From project profits</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-expense-soft">
            <div className="stat-content">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-expense">{currency(globalCharity.spent)}</div>
              <div className="stat-sub">{charitySpending.length} transaction{charitySpending.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-charity-soft">
            <div className="stat-content">
              <div className="stat-label">Current Balance</div>
              <div className="stat-value text-charity">{currency(globalCharity.balance)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Spending History</h2>
              <p className="section-sub">Independent of project expenses</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({
              title: 'Spend from Charity',
              fields: [
                { name: 'amount', label: 'Amount (BHD)', type: 'number', placeholder: '0.00', required: true },
                { name: 'date', label: 'Date', type: 'date', default: new Date().toISOString().split('T')[0], required: true },
                { name: 'description', label: 'Description', placeholder: 'What was this for?', required: true }
              ],
              onSubmit: (v) => addCharitySpending(v.amount, v.date, v.description)
            })}>{Icons.plus} <span>Record Spending</span></button>
          </div>
          {charitySpending.length === 0 ? (
            <p className="text-muted-block">No spending recorded from charity funds yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {[...charitySpending].reverse().map(s => (
                    <tr key={s.id}>
                      <td>{formatDate(s.date)}</td>
                      <td><span className="amount-pill expense">{currency(s.amount)}</span></td>
                      <td>{s.description}</td>
                      <td><button className="btn btn-danger-ghost btn-xs" onClick={() => deleteCharitySpending(s.id)}>{Icons.trash}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Contributions by Project</h2>
          <p className="section-sub">How much each project contributed to charity</p>
          {projectStats.filter(p => p.charityShare > 0).length === 0 ? (
            <p className="text-muted-block">No contributions yet. Profits from projects will appear here.</p>
          ) : (
            <div className="contributions-list">
              {projectStats.filter(p => p.charityShare > 0).map(p => (
                <div key={p.id} className="contribution-row" onClick={() => openProject(p.id)}>
                  <span className="contribution-name">{p.name}</span>
                  <span className="contribution-amount text-income">{currency(p.charityShare)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Render ---
  if (!loaded) return (
    <div className="loading-screen">
      <div className="loading-brand">
        <div className="brand-logo lg">R</div>
        <h2>RAL Finance</h2>
      </div>
      <div className="loading-bar"><div className="loading-bar-fill"></div></div>
    </div>
  )

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {view === 'dashboard' && <DashboardView />}
        {view === 'projects' && <ProjectsView />}
        {view === 'project' && <ProjectDetailView />}
        {view === 'bank' && <BankView />}
        {view === 'charity' && <CharityView />}
      </main>
      {modal && <ModalForm {...modal} onClose={() => setModal(null)} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
