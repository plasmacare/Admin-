import { useEffect, useMemo, useState } from 'react'
import {
  fetchPackages, addPackage, updatePackage, deletePackage,
  fetchTests, addTest, updateTest, deleteTest,
  PACKAGE_TYPES, computePackagePricing, generatePackage,
  submitPackageForApproval, approvePackage, rejectPackage,
} from '../lib/catalogData'

export default function CatalogTab() {
  const [section, setSection] = useState('packages')
  return (
    <div className="catalog">
      <div className="catalog__switch">
        <button
          type="button"
          className={section === 'packages' ? 'is-active' : ''}
          onClick={() => setSection('packages')}
        >
          Packages
        </button>
        <button
          type="button"
          className={section === 'tests' ? 'is-active' : ''}
          onClick={() => setSection('tests')}
        >
          Individual Tests
        </button>
      </div>
      {section === 'packages' ? <PackagesPanel /> : <TestsPanel />}
    </div>
  )
}

function PackagesPanel() {
  const [items, setItems] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [pkgs, testList] = await Promise.all([fetchPackages(), fetchTests()])
      setItems(pkgs)
      setTests(testList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !price) return
    try {
      await addPackage({ name: name.trim(), price: Number(price), description: description.trim() })
      setName('')
      setPrice('')
      setDescription('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleField(item, field, value) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, [field]: value } : it)))
    try {
      await updatePackage(item.id, { [field]: value })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  async function handleToggleTest(item, testId) {
    const current = item.included_tests || []
    const next = current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId]
    await handleField(item, 'included_tests', next)
  }

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" delete this?`)) return
    try {
      await deletePackage(item.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleApprove(item) {
    try {
      await approvePackage(item.id, 'admin')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReject(item) {
    try {
      await rejectPackage(item.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmitForApproval(item) {
    try {
      await submitPackageForApproval(item.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const [search, setSearch] = useState('')
  const filteredItems = items.filter((it) => it.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="catalog-panel">
      <PackageGenerator tests={tests} onGenerated={load} setError={setError} />

      <h3 className="catalog-panel__subheading">All packages</h3>
      <input
        className="catalog-search"
        placeholder="Search packages…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <form className="catalog-add-form catalog-add-form--package" onSubmit={handleAdd}>
        <input placeholder="Package name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="btn btn--primary">Add</button>
      </form>
      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="catalog-list">
          {filteredItems.map((item) => (
            <div key={item.id} className={`catalog-card${item.is_active ? '' : ' catalog-row--inactive'}`}>
              <div className="catalog-row">
                <span className={`catalog-status catalog-status--${item.status}`}>
                  {item.status === 'approved' ? 'Live on site' : item.status === 'pending_approval' ? 'Pending approval' : 'Draft'}
                </span>
                {item.package_type && item.package_type !== 'custom' && (
                  <span className="catalog-type-badge">{item.package_type}</span>
                )}
                <input
                  className="catalog-row__name"
                  defaultValue={item.name}
                  onBlur={(e) => e.target.value !== item.name && handleField(item, 'name', e.target.value)}
                />
                <input
                  className="catalog-row__price"
                  type="number"
                  defaultValue={item.price}
                  onBlur={(e) => Number(e.target.value) !== item.price && handleField(item, 'price', Number(e.target.value))}
                />
                <label className="catalog-row__active">
                  <input
                    type="checkbox"
                    checked={item.is_active}
                    onChange={(e) => handleField(item, 'is_active', e.target.checked)}
                  />
                  Active
                </label>
                <button type="button" className="catalog-row__delete" onClick={() => handleDelete(item)}>
                  Delete
                </button>
              </div>
              {item.status !== 'approved' && (
                <div className="catalog-approval-row">
                  {item.status === 'draft' && (
                    <button type="button" className="btn btn--secondary" onClick={() => handleSubmitForApproval(item)}>
                      Submit for approval
                    </button>
                  )}
                  {item.status === 'pending_approval' && (
                    <>
                      <button type="button" className="btn btn--primary" onClick={() => handleApprove(item)}>
                        Approve &amp; publish to customer site
                      </button>
                      <button type="button" className="btn btn--secondary" onClick={() => handleReject(item)}>
                        Send back to draft
                      </button>
                    </>
                  )}
                  <span className="catalog-approval-hint">Not visible to customers until approved.</span>
                </div>
              )}
              <input
                className="catalog-card__description"
                defaultValue={item.description || ''}
                placeholder="Description"
                onBlur={(e) => e.target.value !== item.description && handleField(item, 'description', e.target.value)}
              />
              <button
                type="button"
                className="catalog-card__expand"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                Included tests ({(item.included_tests || []).length}) {expandedId === item.id ? '▲' : '▼'}
              </button>
              {expandedId === item.id && (
                <div className="catalog-card__tests">
                  {tests.map((t) => (
                    <label key={t.id} className="catalog-card__test-item">
                      <input
                        type="checkbox"
                        checked={(item.included_tests || []).includes(t.id)}
                        onChange={() => handleToggleTest(item, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                  {tests.length === 0 && <p className="admin-empty">Add individual tests first.</p>}
                </div>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && <p className="admin-empty">No packages found.</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Lets an admin pick a package type + a set of tests + a target margin
 * %, see the auto-computed price from each test's cost_price, and
 * generate the package. Generated packages are saved as
 * 'pending_approval' — they only reach the customer site once a
 * separate approval step (below) is done.
 */
function PackageGenerator({ tests, onGenerated, setError }) {
  const [open, setOpen] = useState(false)
  const [packageType, setPackageType] = useState('weekday')
  const [genName, setGenName] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState([])
  const [margin, setMargin] = useState(20)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedTests = useMemo(
    () => tests.filter((t) => selectedTestIds.includes(t.id)),
    [tests, selectedTestIds]
  )
  const pricing = useMemo(
    () => computePackagePricing(selectedTests, margin),
    [selectedTests, margin]
  )

  function toggleTest(id) {
    setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!genName.trim() || selectedTestIds.length === 0) return
    setSaving(true)
    try {
      await generatePackage({
        name: genName.trim(),
        packageType,
        testIds: selectedTestIds,
        tests,
        marginPercent: margin,
        description: description.trim(),
        submitForApproval: true,
      })
      setGenName('')
      setSelectedTestIds([])
      setDescription('')
      setOpen(false)
      onGenerated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="package-generator">
      <button type="button" className="btn btn--primary" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close package generator' : '+ Generate package from margin'}
      </button>
      {open && (
        <form className="package-generator__form" onSubmit={handleGenerate}>
          <div className="package-generator__row">
            <select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
              {PACKAGE_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <input placeholder="Package name" value={genName} onChange={(e) => setGenName(e.target.value)} />
            <input
              type="number"
              min="0"
              max="95"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              title="Target margin %"
            />
            <span className="package-generator__margin-label">% margin</span>
          </div>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="package-generator__hint">Select the tests to include:</p>
          <div className="package-generator__tests">
            {tests.map((t) => (
              <label key={t.id} className="catalog-card__test-item">
                <input type="checkbox" checked={selectedTestIds.includes(t.id)} onChange={() => toggleTest(t.id)} />
                {t.name} {t.cost_price == null && <em className="package-generator__no-cost">(no cost set)</em>}
              </label>
            ))}
            {tests.length === 0 && <p className="admin-empty">Add individual tests first, with cost price.</p>}
          </div>
          {selectedTestIds.length > 0 && (
            <div className="package-generator__pricing">
              <span>Total cost: ₹{pricing.totalCost}</span>
              <span>Suggested sell price: ₹{pricing.suggestedPrice}</span>
              {pricing.missingCost && (
                <span className="package-generator__warning">
                  Some selected tests have no cost price — margin is approximate.
                </span>
              )}
            </div>
          )}
          <button type="submit" className="btn btn--primary" disabled={saving || !genName.trim() || selectedTestIds.length === 0}>
            {saving ? 'Generating…' : 'Generate & send for approval'}
          </button>
        </form>
      )}
    </div>
  )
}

function TestsPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      setItems(await fetchTests())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !price) return
    try {
      await addTest({
        name: name.trim(),
        price: Number(price),
        category: category.trim() || null,
        cost_price: costPrice ? Number(costPrice) : null,
      })
      setName('')
      setPrice('')
      setCostPrice('')
      setCategory('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    (it.category || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleField(item, field, value) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, [field]: value } : it)))
    try {
      await updateTest(item.id, { [field]: value })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" delete this?`)) return
    try {
      await deleteTest(item.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="catalog-panel">
      <form className="catalog-add-form catalog-add-form--test" onSubmit={handleAdd}>
        <input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input placeholder="Sell price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input placeholder="Cost price (for margin)" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        <button type="submit" className="btn btn--primary">Add</button>
      </form>
      <input
        className="catalog-search"
        placeholder="Search tests…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="catalog-list">
          {filteredItems.map((item) => (
            <div key={item.id} className={`catalog-row${item.is_active ? '' : ' catalog-row--inactive'}`}>
              <input
                className="catalog-row__name"
                defaultValue={item.name}
                onBlur={(e) => e.target.value !== item.name && handleField(item, 'name', e.target.value)}
              />
              <input
                className="catalog-row__category"
                defaultValue={item.category || ''}
                placeholder="Category"
                onBlur={(e) => e.target.value !== item.category && handleField(item, 'category', e.target.value)}
              />
              <input
                className="catalog-row__price"
                type="number"
                defaultValue={item.price}
                title="Sell price"
                onBlur={(e) => Number(e.target.value) !== item.price && handleField(item, 'price', Number(e.target.value))}
              />
              <input
                className="catalog-row__price"
                type="number"
                defaultValue={item.cost_price ?? ''}
                placeholder="Cost price"
                title="Cost price"
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null
                  if (v !== item.cost_price) handleField(item, 'cost_price', v)
                }}
              />
              <label className="catalog-row__active">
                <input
                  type="checkbox"
                  checked={item.is_active}
                  onChange={(e) => handleField(item, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <button type="button" className="catalog-row__delete" onClick={() => handleDelete(item)}>
                Delete
              </button>
            </div>
          ))}
          {filteredItems.length === 0 && <p className="admin-empty">No tests found.</p>}
        </div>
      )}
    </div>
  )
}
