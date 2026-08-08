import { useEffect, useState } from 'react'
import {
  fetchPackages, addPackage, updatePackage, deletePackage,
  fetchTests, addTest, updateTest, deleteTest,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function load() {
    setLoading(true)
    try {
      setItems(await fetchPackages())
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
      await addPackage({ name: name.trim(), price: Number(price) })
      setName('')
      setPrice('')
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

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" delete karein?`)) return
    try {
      await deletePackage(item.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="catalog-panel">
      <form className="catalog-add-form" onSubmit={handleAdd}>
        <input placeholder="Package name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit" className="btn btn--primary">Add</button>
      </form>
      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="catalog-list">
          {items.map((item) => (
            <div key={item.id} className={`catalog-row${item.is_active ? '' : ' catalog-row--inactive'}`}>
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
          ))}
          {items.length === 0 && <p className="admin-empty">Koi package nahi hai abhi.</p>}
        </div>
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
  const [category, setCategory] = useState('')

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
      await addTest({ name: name.trim(), price: Number(price), category: category.trim() || null })
      setName('')
      setPrice('')
      setCategory('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

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
    if (!confirm(`"${item.name}" delete karein?`)) return
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
        <input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit" className="btn btn--primary">Add</button>
      </form>
      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="catalog-list">
          {items.map((item) => (
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
          ))}
          {items.length === 0 && <p className="admin-empty">Koi test nahi hai abhi.</p>}
        </div>
      )}
    </div>
  )
}
