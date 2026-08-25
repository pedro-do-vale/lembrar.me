import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Trash2, Edit3, Clock, Bell, CheckCircle, Circle, Save, X, Plus, GripVertical } from 'lucide-react';
import { SCRATCH_DURATION_MS } from './audioManager';
import type { BoardList, Todo } from './types';

interface KanbanProps {
  todos: Todo[];
  lists: BoardList[];
  onToggleComplete: (id: string, currentCompleted: boolean | undefined) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, text: string, reminderAt: number | null) => void;
  onMoveTodo: (todoId: string, newListId: string) => void;
  onCreateTodo: (listId: string, text: string, reminderAt: number | null) => Promise<void>;
  onCreateList: (title: string) => void;
  onDeleteList: (id: string) => void;
}

export default function KanbanBoard({
  todos,
  lists,
  onToggleComplete,
  onDeleteTodo,
  onUpdateTodo,
  onMoveTodo,
  onCreateTodo,
  onCreateList,
  onDeleteList
}: KanbanProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editReminder, setEditReminder] = useState<number | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [addingTodoToList, setAddingTodoToList] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoReminder, setNewTodoReminder] = useState<number | null>(null);
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [strikingIds, setStrikingIds] = useState<Set<string>>(() => new Set());

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditReminder(todo.reminderAt || null);
  };

  const saveEdit = (id: string) => {
    onUpdateTodo(id, editText, editReminder);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitNewList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onCreateList(newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  const openTodoForm = (listId: string) => {
    setAddingTodoToList(listId);
    setNewTodoText('');
    setNewTodoReminder(null);
  };

  const submitNewTodo = async (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    const text = newTodoText.trim();
    if (!text || creatingTodo) return;

    setCreatingTodo(true);
    try {
      await onCreateTodo(listId, text, newTodoReminder);
      setAddingTodoToList(null);
      setNewTodoText('');
      setNewTodoReminder(null);
    } finally {
      setCreatingTodo(false);
    }
  };

  const toggleTodo = (todo: Todo) => {
    if (!todo.archived) {
      setStrikingIds((current) => new Set(current).add(todo.id));
      window.setTimeout(() => {
        setStrikingIds((current) => {
          const next = new Set(current);
          next.delete(todo.id);
          return next;
        });
      }, SCRATCH_DURATION_MS);
    }
    onToggleComplete(todo.id, todo.archived);
  };

  const formatReminder = (ts: number) => {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const isOverdue = (ts: number | null | undefined, archived: boolean | undefined) => {
    if (!ts || archived) return false;
    return ts < Date.now();
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId) return; // Same column drop

    onMoveTodo(draggableId, destination.droppableId);
  };

  // Sort lists by order
  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {sortedLists.map((list) => {
          // Find todos for this list (or fallback to Inbox if list is the first one and todo has no list)
          const listTodos = todos.filter(t => {
            if (t.listId === list.id) return true;
            // Fallback logic: if it has no listId, it belongs to the first list
            if (!t.listId && sortedLists.length > 0 && sortedLists[0].id === list.id) return true;
            return false;
          }).sort((a, b) => b.timestamp - a.timestamp); // Keep newest at top inside the list

          return (
            <div key={list.id} className="kanban-column">
              <div className="kanban-column-header">
                <h3>{list.title} <span className="kanban-count">{listTodos.length}</span></h3>
                <button className="btn-icon text-danger" onClick={() => {
                  if(window.confirm(`Apagar a lista "${list.title}"?`)) onDeleteList(list.id);
                }}>
                  <Trash2 size={16} />
                </button>
              </div>

              {addingTodoToList === list.id ? (
                <form className="add-todo-form" onSubmit={(event) => void submitNewTodo(event, list.id)}>
                  <input
                    type="text"
                    className="edit-input"
                    value={newTodoText}
                    onChange={(event) => setNewTodoText(event.target.value)}
                    placeholder="Nome da missão"
                    aria-label="Nome da nova missão"
                    autoFocus
                    required
                  />
                  <label className="new-todo-reminder">
                    <Bell size={15} />
                    <input
                      type="datetime-local"
                      className="edit-input"
                      value={newTodoReminder ? new Date(newTodoReminder - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(event) => setNewTodoReminder(event.target.value ? new Date(event.target.value).getTime() : null)}
                      aria-label="Lembrete da nova missão"
                    />
                  </label>
                  <div className="new-todo-actions">
                    <button type="button" className="text-button" onClick={() => setAddingTodoToList(null)}><X size={15} /> Cancelar</button>
                    <button type="submit" className="rpg-button primary" disabled={creatingTodo || !newTodoText.trim()}><Save size={15} /> {creatingTodo ? 'Salvando…' : 'Criar missão'}</button>
                  </div>
                </form>
              ) : (
                <button className="add-todo-button" onClick={() => openTodoForm(list.id)}><Plus size={17} /> Nova missão</button>
              )}

              <Droppable droppableId={list.id}>
                {(provided, snapshot) => (
                  <div
                    className={`kanban-droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {listTodos.map((todo, index) => (
                      <Draggable key={todo.id} draggableId={todo.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`todo-item kanban-card ${todo.archived ? 'completed' : ''} ${strikingIds.has(todo.id) ? 'striking' : ''} ${snapshot.isDragging ? 'is-dragging' : ''}`}
                            style={{ ...provided.draggableProps.style, '--strike-duration': `${SCRATCH_DURATION_MS}ms` } as React.CSSProperties}
                          >
                            <div className="kanban-card-drag-handle" {...provided.dragHandleProps}>
                              <GripVertical size={16} className="text-muted" />
                            </div>

                            <button
                              className="todo-checkbox"
                              onClick={() => toggleTodo(todo)}
                            >
                              {todo.archived ? <CheckCircle size={22} className="text-success" /> : <Circle size={22} className="text-muted" />}
                            </button>

                            <div className="todo-content">
                              {editingId === todo.id ? (
                                <div className="edit-container" style={{flexDirection: 'column', background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '8px', width: '100%' }}>
                                  <input
                                    className="edit-input"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="Nome da missão"
                                    autoFocus
                                    style={{ width: '100%' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                                    <Bell size={16} className="text-muted" />
                                    <input
                                      type="datetime-local"
                                      className="edit-input"
                                      style={{ flex: 1, fontSize: '0.85rem' }}
                                      value={editReminder ? new Date(editReminder - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                      onChange={(e) => setEditReminder(e.target.value ? new Date(e.target.value).getTime() : null)}
                                    />
                                  </div>
                                  <div className="edit-actions" style={{width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
                                    <button onClick={cancelEdit} className="btn-icon text-muted"><X size={16} /></button>
                                    <button onClick={() => saveEdit(todo.id)} className="btn-icon text-success"><Save size={16} /></button>
                                  </div>
                                </div>
                              ) : (
                                <div className="todo-text">{todo.text}</div>
                              )}

                              {!editingId && (
                                <div className="todo-date" style={{ display: 'flex', gap: '0.8rem' }}>
                                  <span><Clock size={12} /> {todo.date.split(' ')[0]}</span>
                                  {todo.reminderAt && (
                                    <span className={isOverdue(todo.reminderAt, todo.archived) ? 'text-danger' : 'text-accent'}>
                                      <Bell size={12} /> {formatReminder(todo.reminderAt)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="todo-actions kanban-card-actions">
                              {editingId !== todo.id && (
                                <button className="btn-icon text-muted" onClick={() => startEditing(todo)} title="Editar & Lembrete">
                                  <Edit3 size={16} />
                                </button>
                              )}
                              <button className="btn-icon text-danger" onClick={() => onDeleteTodo(todo.id)} title="Excluir">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        <div className="kanban-column add-list-column">
          {isAddingList ? (
            <form onSubmit={submitNewList} className="add-list-form">
              <input 
                type="text" 
                autoFocus 
              placeholder="Nome da região..."
                className="edit-input"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
              />
              <div className="edit-actions" style={{marginTop: '0.5rem'}}>
                  <button type="button" onClick={() => setIsAddingList(false)} className="btn-icon text-muted"><X size={16} /></button>
                  <button type="submit" className="btn-icon text-success"><Save size={16} /></button>
              </div>
            </form>
          ) : (
            <button className="add-list-btn" onClick={() => setIsAddingList(true)}>
              <Plus size={20} /> Nova região
            </button>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}
