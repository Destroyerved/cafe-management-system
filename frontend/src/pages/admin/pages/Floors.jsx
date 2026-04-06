import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

export default function Floors() {
  const qc = useQueryClient();
  const [showFloor, setShowFloor] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [floorForm, setFloorForm] = useState({ name: '', pos_config_id: '' });
  const [tableForm, setTableForm] = useState({ floor_id: '', table_number: '', seats: 4 });

  const { data: floors } = useQuery({ queryKey: ['floors'], queryFn: () => api.get('/floors').then(r => r.data.data) });
  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: () => api.get('/tables').then(r => r.data.data) });
  const { data: configs } = useQuery({ queryKey: ['pos-configs'], queryFn: () => api.get('/pos-configs').then(r => r.data.data) });

  const createFloor = useMutation({
    mutationFn: (d) => api.post('/floors', d),
    onSuccess: () => { qc.invalidateQueries(['floors']); toast.success('Floor created'); setShowFloor(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createTable = useMutation({
    mutationFn: (d) => api.post('/tables', d),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table created'); setShowTable(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleTable = useMutation({
    mutationFn: (id) => api.patch(`/tables/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table updated'); },
  });

  const generateToken = useMutation({
    mutationFn: ({ id, session_id }) => api.post(`/tables/${id}/generate-token`, { session_id }),
    onSuccess: (res) => { toast.success('QR token generated: ' + res.data.data.token.slice(0, 8) + '...'); },
  });

  const downloadQrPdf = async () => {
    if (!tables?.length) { toast.error('No tables found'); return; }
    const base = window.location.origin;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const cols = 2, rows = 3, perPage = cols * rows;
    const cellW = 90, cellH = 86, marginX = 10, marginY = 10;

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!table.qr_token) continue;
      const floor = floors?.find(f => f.id === table.floor_id);
      const pos = i % perPage;
      if (pos === 0 && i > 0) doc.addPage();
      const col = pos % cols, row = Math.floor(pos / cols);
      const x = marginX + col * cellW, y = marginY + row * cellH;

      // QR image
      const url = `${base}/s/${table.qr_token}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', x + 10, y + 10, 60, 60);

      // Labels
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Table ${table.table_number}`, x + 45, y + 76, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(floor?.name || '', x + 45, y + 82, { align: 'center' });
      doc.setTextColor(0);

      // Border
      doc.setDrawColor(0); doc.setLineWidth(0.5);
      doc.rect(x, y, cellW - 10, cellH - 4);
    }

    doc.save('table-qr-codes.pdf');
    toast.success(`Downloaded ${tables.length} QR codes!`);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Floors & Tables</div>
          <div className={styles.pageSub}>{floors?.length ?? 0} floors, {tables?.length ?? 0} tables</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={downloadQrPdf}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📥 Download QR PDF
          </button>
          <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={() => setShowTable(true)}>+ New Table</button>
          <button className={styles.actionBtn} onClick={() => setShowFloor(true)}>+ New Floor</button>
        </div>
      </div>

      {floors?.map(floor => (
        <div key={floor.id} className={styles.box} style={{ marginBottom: 20 }}>
          <div className={styles.boxHeader}>
            <span className={styles.boxTitle}>{floor.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              {tables?.filter(t => t.floor_id === floor.id).length} tables
            </span>
          </div>
          <div className={styles.boxBody}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              {tables?.filter(t => t.floor_id === floor.id).map(table => (
                <div key={table.id} style={{
                  border: `4px solid var(--border-medium)`,
                  boxShadow: table.active ? '4px 4px 0 0 #facc15' : '4px 4px 0 0 var(--border-medium)',
                  padding: '14px 10px',
                  textAlign: 'center',
                  background: table.active ? 'var(--surface)' : 'var(--surface-alt)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                  onClick={() => setSelectedFloor(selectedFloor === table.id ? null : table.id)}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>T{table.table_number}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 4 }}>{table.seats} seats</div>
                  <span className={[styles.badge, table.active ? styles.badgePaid : styles.badgeDraft].join(' ')} style={{ marginTop: 8, fontSize: 8 }}>
                    {table.active ? 'Active' : 'Off'}
                  </span>
                  {selectedFloor === table.id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className={[styles.actionBtn, styles.actionBtnSm].join(' ')} style={{ fontSize: 8, padding: '4px 6px' }} onClick={(e) => { e.stopPropagation(); toggleTable.mutate(table.id); }}>
                        Toggle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* NEW FLOOR MODAL */}
      {showFloor && (
        <div className={styles.modalOverlay} onClick={() => setShowFloor(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>New Floor</span>
              <button className={styles.modalClose} onClick={() => setShowFloor(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField} style={{ marginBottom: 16 }}>
                <label className={styles.formLabel}>Floor Name</label>
                <input className={styles.formInput} placeholder="e.g. Rooftop" value={floorForm.name} onChange={e => setFloorForm({ ...floorForm, name: e.target.value })} />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>POS Terminal</label>
                <select className={styles.formInput} value={floorForm.pos_config_id} onChange={e => setFloorForm({ ...floorForm, pos_config_id: e.target.value })}>
                  <option value="">Select terminal</option>
                  {configs?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={() => setShowFloor(false)}>Cancel</button>
              <button className={styles.actionBtn} onClick={() => createFloor.mutate(floorForm)}>Create Floor</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TABLE MODAL */}
      {showTable && (
        <div className={styles.modalOverlay} onClick={() => setShowTable(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>New Table</span>
              <button className={styles.modalClose} onClick={() => setShowTable(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Floor</label>
                  <select className={styles.formInput} value={tableForm.floor_id} onChange={e => setTableForm({ ...tableForm, floor_id: e.target.value })}>
                    <option value="">Select floor</option>
                    {floors?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Table Number</label>
                  <input className={styles.formInput} placeholder="e.g. G6" value={tableForm.table_number} onChange={e => setTableForm({ ...tableForm, table_number: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Seats</label>
                  <input className={styles.formInput} type="number" value={tableForm.seats} onChange={e => setTableForm({ ...tableForm, seats: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={() => setShowTable(false)}>Cancel</button>
              <button className={styles.actionBtn} onClick={() => createTable.mutate(tableForm)}>Create Table</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}