import { useMemo, useState } from 'react';

const INITIAL_CLIENT_FORM = {
  name: '',
  type: 'Mayorista',
  rut: '',
  phone: '',
  email: '',
  address: '',
  observations: '',
  debt: '',
};

const INITIAL_SPACE_FORM = {
  name: '',
  manager: '',
  status: 'Disponible',
  notes: '',
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function ERPView({ clients, setClients, spaces, setSpaces, orders }) {
  const [tab, setTab] = useState('dashboard');
  const [clientForm, setClientForm] = useState(INITIAL_CLIENT_FORM);
  const [spaceForm, setSpaceForm] = useState(INITIAL_SPACE_FORM);
  const [feedback, setFeedback] = useState(null);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status !== 'Terminado'), [orders]);
  const clientsWithDebt = useMemo(() => clients.filter((client) => client.debt > 0), [clients]);
  const totalDebt = useMemo(() => clientsWithDebt.reduce((sum, client) => sum + client.debt, 0), [clientsWithDebt]);
  const availableSpaces = useMemo(() => spaces.filter((space) => space.status === 'Disponible').length, [spaces]);

  const handleClientChange = (key) => (event) => {
    setClientForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleSpaceChange = (key) => (event) => {
    setSpaceForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleAddClient = (event) => {
    event.preventDefault();

    const name = clientForm.name.trim();
    const debt = Number(clientForm.debt) || 0;

    if (!name) {
      setFeedback({ type: 'error', text: 'Debes ingresar el nombre del cliente.' });
      return;
    }

    if (debt < 0) {
      setFeedback({ type: 'error', text: 'La deuda no puede ser negativa.' });
      return;
    }

    const newClient = {
      id: `cli-${Date.now()}`,
      name,
      type: clientForm.type,
      rut: clientForm.rut.trim(),
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim(),
      address: clientForm.address.trim(),
      observations: clientForm.observations.trim(),
      debt,
    };

    setClients((current) => [newClient, ...current]);
    setClientForm(INITIAL_CLIENT_FORM);
    setFeedback({ type: 'success', text: 'Cliente agregado correctamente.' });
  };

  const handleAddSpace = (event) => {
    event.preventDefault();

    const name = spaceForm.name.trim();

    if (!name) {
      setFeedback({ type: 'error', text: 'Debes ingresar el nombre del espacio.' });
      return;
    }

    const newSpace = {
      id: `esp-${Date.now()}`,
      name,
      manager: spaceForm.manager.trim(),
      status: spaceForm.status,
      notes: spaceForm.notes.trim(),
    };

    setSpaces((current) => [newSpace, ...current]);
    setSpaceForm(INITIAL_SPACE_FORM);
    setFeedback({ type: 'success', text: 'Espacio registrado correctamente.' });
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">ERP</p>
        <h2>Gestión comercial integral</h2>
        <p className="muted">Administra clientes, deudas, espacios operativos y revisa métricas del negocio.</p>
      </div>

      {feedback ? <div className={`notice notice-${feedback.type}`}>{feedback.text}</div> : null}

      <div className="erp-tabs">
        <button type="button" className={tab === 'dashboard' ? 'nav-button is-active' : 'nav-button'} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button type="button" className={tab === 'clientes' ? 'nav-button is-active' : 'nav-button'} onClick={() => setTab('clientes')}>
          Clientes
        </button>
        <button type="button" className={tab === 'espacios' ? 'nav-button is-active' : 'nav-button'} onClick={() => setTab('espacios')}>
          Espacios
        </button>
      </div>

      {tab === 'dashboard' ? (
        <div className="erp-grid">
          <article className="panel erp-stat">
            <p className="field-label">Clientes registrados</p>
            <strong>{clients.length}</strong>
          </article>
          <article className="panel erp-stat">
            <p className="field-label">Clientes con deuda</p>
            <strong>{clientsWithDebt.length}</strong>
          </article>
          <article className="panel erp-stat">
            <p className="field-label">Deuda total</p>
            <strong>{formatCurrency(totalDebt)}</strong>
          </article>
          <article className="panel erp-stat">
            <p className="field-label">Pedidos pendientes</p>
            <strong>{pendingOrders.length}</strong>
          </article>
          <article className="panel erp-stat">
            <p className="field-label">Espacios disponibles</p>
            <strong>{availableSpaces}</strong>
          </article>
          <article className="panel erp-stat">
            <p className="field-label">Espacios ocupados</p>
            <strong>{spaces.length - availableSpaces}</strong>
          </article>
        </div>
      ) : null}

      {tab === 'clientes' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddClient}>
            <div className="panel-title">
              <h3>Alta de cliente</h3>
              <p className="muted">Incluye tipo de cliente, datos clave y observaciones internas.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre</span>
                <input value={clientForm.name} onChange={handleClientChange('name')} />
              </label>
              <label className="field">
                <span>Tipo de cliente</span>
                <select value={clientForm.type} onChange={handleClientChange('type')}>
                  <option value="Mayorista">Mayorista</option>
                  <option value="Minorista">Minorista</option>
                  <option value="Distribuidor">Distribuidor</option>
                </select>
              </label>
              <label className="field">
                <span>RUT</span>
                <input value={clientForm.rut} onChange={handleClientChange('rut')} />
              </label>
              <label className="field">
                <span>Teléfono</span>
                <input value={clientForm.phone} onChange={handleClientChange('phone')} />
              </label>
              <label className="field field-wide">
                <span>Email</span>
                <input value={clientForm.email} onChange={handleClientChange('email')} />
              </label>
              <label className="field field-wide">
                <span>Dirección</span>
                <input value={clientForm.address} onChange={handleClientChange('address')} />
              </label>
              <label className="field">
                <span>Deuda actual (CLP)</span>
                <input type="number" min="0" step="1" value={clientForm.debt} onChange={handleClientChange('debt')} />
              </label>
              <label className="field field-wide">
                <span>Observaciones</span>
                <textarea rows="3" value={clientForm.observations} onChange={handleClientChange('observations')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar cliente
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Clientes y cuentas</h3>
              <p className="muted">Resumen de datos comerciales y deuda por cliente.</p>
            </div>

            {clients.length === 0 ? (
              <div className="empty-state empty-state-inline">
                <p>No hay clientes registrados todavía.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Contacto</th>
                      <th>Deuda</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <strong>{client.name}</strong>
                          <div className="muted">{client.rut || '-'}</div>
                        </td>
                        <td>{client.type}</td>
                        <td>{client.phone || client.email || '-'}</td>
                        <td>{formatCurrency(client.debt)}</td>
                        <td>{client.observations || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'espacios' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddSpace}>
            <div className="panel-title">
              <h3>Registro de espacios</h3>
              <p className="muted">Controla zonas de trabajo, bodega o sala de atención.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre del espacio</span>
                <input value={spaceForm.name} onChange={handleSpaceChange('name')} />
              </label>
              <label className="field">
                <span>Responsable</span>
                <input value={spaceForm.manager} onChange={handleSpaceChange('manager')} />
              </label>
              <label className="field">
                <span>Estado</span>
                <select value={spaceForm.status} onChange={handleSpaceChange('status')}>
                  <option value="Disponible">Disponible</option>
                  <option value="Ocupado">Ocupado</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </label>
              <label className="field field-wide">
                <span>Notas</span>
                <textarea rows="3" value={spaceForm.notes} onChange={handleSpaceChange('notes')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar espacio
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Espacios registrados</h3>
              <p className="muted">Vista operativa del estado actual de cada espacio.</p>
            </div>

            {spaces.length === 0 ? (
              <div className="empty-state empty-state-inline">
                <p>No hay espacios registrados todavía.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Espacio</th>
                      <th>Responsable</th>
                      <th>Estado</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spaces.map((space) => (
                      <tr key={space.id}>
                        <td>{space.name}</td>
                        <td>{space.manager || '-'}</td>
                        <td>{space.status}</td>
                        <td>{space.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ERPView;
