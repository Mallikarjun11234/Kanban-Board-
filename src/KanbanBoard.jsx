// KanbanBoard.jsx
import React, { useState, useCallback, useMemo } from 'react';
import './KanbanBoard.css';

// ============ CONSTANTS ============
const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: '#6b7280' },
  { id: 'todo', title: 'To Do', color: '#3b82f6' },
  { id: 'in-progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'review', title: 'Review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', color: '#10b981' },
];

const PRIORITIES = {
  low: { label: 'Low', color: '#10b981' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high: { label: 'High', color: '#ef4444' },
};

const INITIAL_TASKS = [
  { id: 't1', title: 'Design new landing page', description: 'Create wireframes and mockups', columnId: 'backlog', priority: 'medium', assignee: 'Alice', tags: ['design'], createdAt: Date.now() - 86400000 * 3 },
  { id: 't2', title: 'Fix login bug', description: 'Users cannot login on Safari', columnId: 'todo', priority: 'high', assignee: 'Bob', tags: ['bug', 'auth'], createdAt: Date.now() - 86400000 * 2 },
  { id: 't3', title: 'Write API docs', description: 'Document REST endpoints', columnId: 'in-progress', priority: 'low', assignee: 'Carol', tags: ['docs'], createdAt: Date.now() - 86400000 },
  { id: 't4', title: 'Code review PR #42', description: 'Review payment integration', columnId: 'review', priority: 'high', assignee: 'Dave', tags: ['review'], createdAt: Date.now() - 3600000 },
  { id: 't5', title: 'Setup CI pipeline', description: 'Configure GitHub Actions', columnId: 'done', priority: 'medium', assignee: 'Eve', tags: ['devops'], createdAt: Date.now() - 86400000 * 5 },
  { id: 't6', title: 'Update dependencies', description: 'Bump all npm packages', columnId: 'todo', priority: 'low', assignee: 'Frank', tags: ['maintenance'], createdAt: Date.now() - 86400000 * 4 },
];

// ============ UTILITIES ============
const generateId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatDate = (ts) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem('kanban-tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
};

const saveToStorage = (tasks) => {
  try {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
};

// ============ ICONS (inline SVG) ============
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    edit: <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ============ TASK CARD ============
const TaskCard = ({ task, onDragStart, onEdit, onDelete, isDragging }) => {
  const priority = PRIORITIES[task.priority] || PRIORITIES.low;
  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
    >
      <div className="task-header">
        <span className="priority-dot" style={{ background: priority.color }} title={priority.label} />
        <div className="task-actions">
          <button className="icon-btn" onClick={() => onEdit(task)} title="Edit">
            <Icon name="edit" size={14} />
          </button>
          <button className="icon-btn danger" onClick={() => onDelete(task.id)} title="Delete">
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <h4 className="task-title">{task.title}</h4>
      {task.description && <p className="task-desc">{task.description}</p>}
      {task.tags?.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
      <div className="task-footer">
        {task.assignee && (
          <span className="assignee">
            <Icon name="user" size={12} />
            {task.assignee}
          </span>
        )}
        <span className="task-date">{formatDate(task.createdAt)}</span>
      </div>
    </div>
  );
};

// ============ COLUMN ============
const Column = ({ column, tasks, onDragStart, onDrop, onDragOver, onAddTask, onEdit, onDelete, draggingTaskId }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
    onDragOver(e, column.id);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e) => {
    setIsOver(false);
    onDrop(e, column.id);
  };

  return (
    <div
      className={`column ${isOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title">
          <span className="column-color" style={{ background: column.color }} />
          <h3>{column.title}</h3>
          <span className="task-count">{tasks.length}</span>
        </div>
        <button className="icon-btn" onClick={() => onAddTask(column.id)} title="Add task">
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onEdit={onEdit}
            onDelete={onDelete}
            isDragging={draggingTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && <div className="empty-state">No tasks yet</div>}
      </div>
    </div>
  );
};

// ============ MODAL ============
const TaskModal = ({ task, columns, onSave, onClose }) => {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    columnId: task?.columnId || columns[0].id,
    priority: task?.priority || 'medium',
    assignee: task?.assignee || '',
    tags: task?.tags?.join(', ') || '',
  });

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...task,
      ...form,
      title: form.title.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: task?.createdAt || Date.now(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label>
            Title *
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Task title"
              autoFocus
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </label>
          <div className="form-row">
            <label>
              Column
              <select value={form.columnId} onChange={(e) => handleChange('columnId', e.target.value)}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
                {Object.entries(PRIORITIES).map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Assignee
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => handleChange('assignee', e.target.value)}
                placeholder="Name"
              />
            </label>
            <label>
              Tags
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="comma, separated"
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">{task ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export default function KanbanBoard() {
  const [tasks, setTasks] = useState(loadFromStorage);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // Persist tasks
  React.useEffect(() => {
    saveToStorage(tasks);
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assignee?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  const tasksByColumn = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    filteredTasks.forEach((t) => {
      if (map[t.columnId]) map[t.columnId].push(t);
    });
    return map;
  }, [filteredTasks]);

  // ============ DRAG & DROP HANDLERS ============
  const handleDragStart = useCallback((e, task) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  }, []);

  const handleDrop = useCallback((e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId } : t))
    );
    setDraggingTaskId(null);
    setDraggedOverColumn(null);
  }, [draggingTaskId]);

  // ============ CRUD HANDLERS ============
  const handleAddTask = useCallback((columnId) => {
    setEditingTask({ columnId });
    setShowModal(true);
  }, []);

  const handleEditTask = useCallback((task) => {
    setEditingTask(task);
    setShowModal(true);
  }, []);

  const handleDeleteTask = useCallback((taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleSaveTask = useCallback((taskData) => {
    setTasks((prev) => {
      if (taskData.id) {
        return prev.map((t) => (t.id === taskData.id ? taskData : t));
      }
      return [...prev, { ...taskData, id: generateId() }];
    });
    setShowModal(false);
    setEditingTask(null);
  }, []);

  // ============ STATS ============
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.columnId === 'done').length;
    const inProgress = tasks.filter((t) => t.columnId === 'in-progress').length;
    return { total, done, inProgress, progress: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  return (
    <div className="kanban-app">
      <header className="kanban-header">
        <div className="header-left">
          <h1>Kanban Board</h1>
          <div className="stats">
            <span><strong>{stats.total}</strong> tasks</span>
            <span><strong>{stats.inProgress}</strong> in progress</span>
            <span><strong>{stats.progress}%</strong> complete</span>
          </div>
        </div>
        <div className="header-right">
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All priorities</option>
            {Object.entries(PRIORITIES).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
          <button
            className="btn primary"
            onClick={() => {
              setEditingTask(null);
              setShowModal(true);
            }}
          >
            <Icon name="plus" size={16} />
            New Task
          </button>
        </div>
      </header>

      <div className="kanban-board">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onAddTask={handleAddTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            draggingTaskId={draggingTaskId}
          />
        ))}
      </div>

      {showModal && (
        <TaskModal
          task={editingTask?.id ? editingTask : null}
          columns={COLUMNS}
          onSave={handleSaveTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}