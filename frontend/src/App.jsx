import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const money = (n) =>
  Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const emptyForm = { name: '', sku: '', category: '', unit_price: '', current_stock: '', min_stock: '' };

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductModal({ onClose, onDone }) {
  const [f, setF] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/products', {
        ...f,
        unit_price: Number(f.unit_price || 0),
        current_stock: Number(f.current_stock || 0),
        min_stock: Number(f.min_stock || 0),
      });
      onDone(`${f.name} added to inventory`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="New product" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Product name<input value={f.name} onChange={set('name')} placeholder="e.g. Laptop" required autoFocus /></label>
        <div className="two">
          <label>SKU<input value={f.sku} onChange={set('sku')} placeholder="LAP-001" required /></label>
          <label>Category<input value={f.category} onChange={set('category')} placeholder="Electronics" /></label>
        </div>
        <div className="three">
          <label>Unit price (₹)<input type="number" min="0" value={f.unit_price} onChange={set('unit_price')} /></label>
          <label>Opening stock<input type="number" min="0" value={f.current_stock} onChange={set('current_stock')} /></label>
          <label>Minimum level<input type="number" min="0" value={f.min_stock} onChange={set('min_stock')} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockModal({ product, initialMode, onClose, onDone }) {
  const [mode, setMode] = useState(initialMode);
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const n = Number(qty) || 0;
  const after = mode === 'in' ? product.current_stock + n : product.current_stock - n;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/stock/${mode}`, { product_id: product.id, quantity: Number(qty) });
      onDone(mode === 'in' ? `Added ${qty} to ${product.name}` : `Issued ${qty} from ${product.name}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={product.name} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="seg">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setError(''); }}>Receive stock</button>
          <button type="button" className={mode === 'out' ? 'on' : ''} onClick={() => { setMode('out'); setError(''); }}>Issue stock</button>
        </div>
        <label>Quantity
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus />
        </label>
        <div className="preview">
          <span>On hand <b>{product.current_stock}</b></span>
          <span className="arrow">→</span>
          <span>After <b className={after < 0 ? 'neg' : ''}>{n ? after : '—'}</b></span>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !n}>{busy ? 'Saving…' : mode === 'in' ? 'Add stock' : 'Issue stock'}</button>
        </div>
      </form>
    </Modal>
  );
}

function HistoryModal({ product, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/stock/${product.id}/transactions`).then(setRows).catch(() => setRows([]));
  }, [product.id]);

  return (
    <Modal title={`${product.name} · history`} onClose={onClose} wide>
      {rows === null ? (
        <p className="muted pad">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted pad">No stock movements yet.</p>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Txn</th><th>Type</th><th className="num">Qty</th><th className="num">Before</th><th className="num">After</th><th>Date</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.txn_id}>
                  <td className="mono">{t.txn_id}</td>
                  <td><span className={`tag ${t.type === 'STOCK_IN' ? 'in' : 'out'}`}>{t.type === 'STOCK_IN' ? 'Stock in' : 'Stock out'}</span></td>
                  <td className="num">{t.quantity}</td>
                  <td className="num">{t.previous_stock}</td>
                  <td className="num"><b>{t.new_stock}</b></td>
                  <td className="muted">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      setProducts(await api.get('/products'));
      setLoadErr('');
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const done = (text) => { setModal(null); setToast(text); load(); };

  const stats = useMemo(() => ({
    items: products.length,
    units: products.reduce((s, p) => s + p.current_stock, 0),
    value: products.reduce((s, p) => s + p.current_stock * Number(p.unit_price), 0),
    low: products.filter((p) => p.low_stock).length,
  }), [products]);

  const shown = products.filter((p) =>
    `${p.name} ${p.sku} ${p.category || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand"><span className="mark" />Stockroom</div>
          <button className="btn primary" onClick={() => setModal({ type: 'new' })}>+ New product</button>
        </div>
      </header>

      <main className="page">
        <section className="stats">
          <div className="stat"><span>Products</span><b>{stats.items}</b></div>
          <div className="stat"><span>Units on hand</span><b>{stats.units.toLocaleString('en-IN')}</b></div>
          <div className="stat"><span>Inventory value</span><b>{money(stats.value)}</b></div>
          <div className={`stat ${stats.low ? 'alert' : ''}`}><span>Low stock</span><b>{stats.low}</b></div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h1>Inventory</h1>
            <input className="search" placeholder="Search name, SKU or category" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {loadErr && <p className="error pad">Could not reach the server: {loadErr}</p>}

          <div className="scroll">
            <table>
              <thead>
                <tr><th>Product</th><th>Category</th><th className="num">Price</th><th>Stock</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const pct = Math.min(100, (p.current_stock / Math.max(p.min_stock * 3, 1)) * 100);
                  return (
                    <tr key={p.id}>
                      <td><div className="pname">{p.name}</div><div className="sku">{p.sku}</div></td>
                      <td className="muted">{p.category || '—'}</td>
                      <td className="num">{money(p.unit_price)}</td>
                      <td>
                        <div className="level">
                          <b>{p.current_stock}</b>
                          <div className="bar"><i className={p.low_stock ? 'low' : ''} style={{ width: `${pct}%` }} /></div>
                          <small>min {p.min_stock}</small>
                        </div>
                      </td>
                      <td>{p.low_stock ? <span className="tag low">Low stock</span> : <span className="tag ok">In stock</span>}</td>
                      <td className="row-actions">
                        <button className="btn sm" onClick={() => setModal({ type: 'stock', product: p, mode: 'in' })}>Receive</button>
                        <button className="btn sm" onClick={() => setModal({ type: 'stock', product: p, mode: 'out' })}>Issue</button>
                        <button className="btn sm ghost" onClick={() => setModal({ type: 'history', product: p })}>History</button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !shown.length && (
                  <tr><td colSpan="6" className="muted empty">{products.length ? 'Nothing matches your search.' : 'No products yet. Add your first one.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modal?.type === 'new' && <ProductModal onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'stock' && <StockModal product={modal.product} initialMode={modal.mode} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'history' && <HistoryModal product={modal.product} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}