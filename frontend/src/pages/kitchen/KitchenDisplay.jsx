import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import socket, { joinKitchen } from '../../socket';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import styles from './Kitchen.module.css';

const STAGES = ['to_cook', 'preparing', 'completed'];
const STAGE_LABELS = { to_cook: 'To Cook', preparing: 'Preparing', completed: 'Completed' };
const NEXT_STAGE = { to_cook: 'preparing', preparing: 'completed' };

export default function KitchenDisplay() {
  const { session_id } = useParams();
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    clearAuth();
    navigate('/login');
    toast.success('Logged out');
  };
  const qc = useQueryClient();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [newTicketIds, setNewTicketIds] = useState(new Set());
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(id);
  }, []);

  // Initial fetch
  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-tickets', session_id],
    queryFn: () =>
      api.get('/kitchen/tickets', { params: { session_id, limit: 200 } }).then(r => r.data.data),
    onSuccess: (d) => setTickets(Array.isArray(d) ? d : (d?.data || [])),
  });

  useEffect(() => {
    if (data) setTickets(Array.isArray(data) ? data : (data?.data || []));
  }, [data]);

  // Socket.io real-time
  useEffect(() => {
    joinKitchen(session_id);

    const onNewTicket = (ticket) => {
      setTickets(prev => {
        if (prev.find(t => t.id === ticket.id)) return prev;
        return [ticket, ...prev];
      });
      // mark as new for slide-in animation, clear after 1s
      setNewTicketIds(prev => { const s = new Set(prev); s.add(ticket.id); return s; });
      setTimeout(() => setNewTicketIds(prev => { const s = new Set(prev); s.delete(ticket.id); return s; }), 1000);
      toast.success(`New order #${ticket.order_number} arrived!`);
    };

    const onTicketUpdated = (updated) => {
      setTickets(prev =>
        prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)
      );
    };

    const onItemPrepared = (updatedItem) => {
      setTickets(prev =>
        prev.map(t => ({
          ...t,
          items: t.items?.map(i => i.id === updatedItem.id ? { ...i, ...updatedItem } : i),
        }))
      );
    };

    socket.on('new_ticket', onNewTicket);
    socket.on('ticket_updated', onTicketUpdated);
    socket.on('item_prepared', onItemPrepared);

    return () => {
      socket.off('new_ticket', onNewTicket);
      socket.off('ticket_updated', onTicketUpdated);
      socket.off('item_prepared', onItemPrepared);
    };
  }, [session_id]);

  const advanceTicket = useCallback(async (ticket) => {
    const nextStatus = NEXT_STAGE[ticket.status];
    if (!nextStatus) return;
    try {
      const res = await api.patch(`/kitchen/tickets/${ticket.id}/status`, { status: nextStatus });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...res.data.data } : t));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update');
    }
  }, []);

  const toggleItem = useCallback(async (e, itemId) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/kitchen/items/${itemId}/prepare`);
      setTickets(prev =>
        prev.map(t => ({
          ...t,
          items: t.items?.map(i => i.id === itemId ? { ...i, ...res.data.data } : i),
        }))
      );
    } catch (e) {
      toast.error('Failed to toggle item');
    }
  }, []);

  const counts = STAGES.reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s).length;
    return acc;
  }, {});

  const visibleStages = filter === 'all' ? STAGES : [filter];

  // Time-ago helper
  const timeAgo = (sent_at) => {
    const diff = Math.floor((Date.now() - new Date(sent_at).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>C</div>
          <span className={styles.title}>Kitchen Display</span>
          <span className={styles.sessionBadge}>
            {session_id === 'global' ? 'Global System' : `Session #${session_id}`}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.clock}>{clock}</span>
          <button className={[styles.filterBtn, filter === 'all' ? styles.filterBtnActive : ''].join(' ')} onClick={() => setFilter('all')}>
            All <span className={styles.countBadge}>{tickets.length}</span>
          </button>
          {STAGES.map(s => (
            <button key={s} className={[styles.filterBtn, styles[`filter_${s}`], filter === s ? styles.filterBtnActive : ''].join(' ')} onClick={() => setFilter(s)}>
              {STAGE_LABELS[s]} <span className={styles.countBadge}>{counts[s]}</span>
            </button>
          ))}
          <button className={styles.backBtn} onClick={handleLogout}
            style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            Logout
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.loading}>Loading tickets...</div>
      ) : (
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)` }}>
          {visibleStages.map(stage => (
            <div key={stage} className={styles.column}>
              <div className={[styles.colHeader, styles[`colHeader_${stage}`]].join(' ')}>
                <span className={styles.colTitle}>{STAGE_LABELS[stage]}</span>
                <span className={styles.colCount}>{counts[stage]}</span>
              </div>
              <div className={[styles.ticketList, styles[`ticketList_${stage}`]].join(' ')}>
                {tickets.filter(t => t.status === stage).length === 0 ? (
                  <div className={styles.emptyCol}>No tickets</div>
                ) : (
                  tickets
                    .filter(t => t.status === stage)
                    .map(ticket => (
                      <div
                        key={ticket.id}
                        className={[styles.ticketCard, styles[`ticket_${stage}`], newTicketIds.has(ticket.id) ? styles.ticketNew : ''].join(' ')}
                        onClick={() => advanceTicket(ticket)}
                        title={stage !== 'completed' ? `Click to move → ${STAGE_LABELS[NEXT_STAGE[stage]]}` : ''}
                      >
                        <div className={styles.ticketTop}>
                          <span className={styles.ticketOrder}>#{ticket.order_number}</span>
                          {ticket.table_number && (
                            <span className={styles.ticketTable}>T{ticket.table_number}</span>
                          )}
                          <span className={styles.ticketTime}>
                            {timeAgo(ticket.sent_at)}
                          </span>
                        </div>
                        <div className={styles.ticketItems}>
                          {ticket.items?.map(item => (
                            <div
                              key={item.id}
                              className={[styles.ticketItem, item.is_prepared ? styles.ticketItemDone : ''].join(' ')}
                              onClick={(e) => toggleItem(e, item.id)}
                              title="Click to mark prepared"
                            >
                              <span className={styles.ticketItemQty}>{Math.floor(item.quantity)}×</span>
                              <span className={styles.ticketItemName}>{item.product_name}</span>
                              {item.is_prepared && <span className={styles.ticketItemCheck}>✓</span>}
                            </div>
                          ))}
                        </div>
                        {stage !== 'completed' && (
                          <div className={styles.ticketAction}>
                            → {STAGE_LABELS[NEXT_STAGE[stage]]}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
