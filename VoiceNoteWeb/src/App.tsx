import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, addDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { Mic, PieChart as PieIcon, LayoutTemplate } from 'lucide-react';
import Analytics from './Analytics';
import KanbanBoard from './KanbanBoard';

interface Todo {
  id: string;
  text: string;
  date: string;
  timestamp: number;
  archived?: boolean;
  reminderAt?: number | null;
  listId?: string | null;
}

interface BoardList {
  id: string;
  title: string;
  order: number;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);
  const [currentView, setCurrentView] = useState<'board' | 'analytics'>('board');

  useEffect(() => {
    try {
      const q = query(collection(db, 'notes'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
        const fetchedTodos: Todo[] = [];
        querySnapshot.forEach((document: any) => {
          fetchedTodos.push({ id: document.id, ...document.data() } as Todo);
        });
        setTodos(fetchedTodos);
        setLoadingTasks(false);
      }, (error: any) => {
        console.error("Firebase error tasks:", error);
        setLoadingTasks(false);
      });
      return () => unsubscribe();
    } catch(e) {
      console.warn("Firebase not properly configured yet.", e);
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'board_lists'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
        const fetchedLists: BoardList[] = [];
        querySnapshot.forEach((document: any) => {
          fetchedLists.push({ id: document.id, ...document.data() } as BoardList);
        });
        
        // Auto-create Inbox if no lists exist
        if (fetchedLists.length === 0 && !loadingLists) {
          addDoc(collection(db, 'board_lists'), {
             title: 'Caixa de Entrada',
             order: 0
          });
        }

        setLists(fetchedLists);
        setLoadingLists(false);
      }, (error: any) => {
        console.error("Firebase error lists:", error);
        setLoadingLists(false);
      });
      return () => unsubscribe();
    } catch(e) {
      setLoadingLists(false);
    }
  }, [loadingLists]);

  // Motor de Automação NLP (Smartwatch)
  useEffect(() => {
    if (!loadingTasks && !loadingLists && lists.length > 0) {
      todos.forEach(async (todo: any) => {
        if (todo.targetList && !todo.listId) {
          const targetName = todo.targetList.trim();
          let targetColumn = lists.find(l => l.title.toLowerCase() === targetName.toLowerCase());
          
          if (targetColumn) {
            await updateDoc(doc(db, 'notes', todo.id), {
              listId: targetColumn.id,
              targetList: deleteField()
            });
          } else {
            // Cria a lista dinamicamente se ela não existir
            const nextOrder = Math.max(...lists.map(l => l.order)) + 1;
            const res = await addDoc(collection(db, 'board_lists'), {
              title: targetName,
              order: nextOrder
            });
            await updateDoc(doc(db, 'notes', todo.id), {
              listId: res.id,
              targetList: deleteField()
            });
          }
        }
      });
    }
  }, [todos, lists, loadingTasks, loadingLists]);

  const handleDeleteTodo = async (id: string) => {
    if (window.confirm("Apagar esta tarefa permanentemente?")) {
      await deleteDoc(doc(db, 'notes', id));
    }
  };

  const toggleComplete = async (id: string, currentCompleted: boolean | undefined) => {
    await updateDoc(doc(db, 'notes', id), {
      archived: !currentCompleted
    });
  };

  const updateTodo = async (id: string, text: string, reminderAt: number | null) => {
    await updateDoc(doc(db, 'notes', id), {
      text,
      reminderAt
    });
  };

  const moveTodo = async (todoId: string, newListId: string) => {
    await updateDoc(doc(db, 'notes', todoId), {
      listId: newListId
    });
  };

  const createList = async (title: string) => {
    const nextOrder = lists.length > 0 ? Math.max(...lists.map(l => l.order)) + 1 : 0;
    await addDoc(collection(db, 'board_lists'), {
      title,
      order: nextOrder
    });
  };

  const deleteList = async (id: string) => {
    await deleteDoc(doc(db, 'board_lists', id));
  };


  return (
    <div className="container-kanban">
      <header className="kanban-header">
        <div>
          <h1>Lembrar.me</h1>
          <p className="subtitle">Gestor Kanban Multi-Telas</p>
        </div>
        
        <div className="tabs tabs-kanban">
          <button 
            className={`tab-btn tab-btn-icon ${currentView === 'board' ? 'active' : ''}`}
            onClick={() => setCurrentView('board')}
          >
            <LayoutTemplate size={16} style={{ marginRight: '6px' }} />
            Meu Quadro
          </button>
          
          <button 
            className={`tab-btn tab-btn-icon ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            <PieIcon size={16} style={{ marginRight: '6px' }} />
            Analytics
          </button>
        </div>
      </header>

      <main className="kanban-main">
        {loadingTasks || loadingLists ? (
          <div className="loader">Montando Tabela Trello na nuvem...</div>
        ) : currentView === 'analytics' ? (
          <div style={{maxWidth: '800px', margin: '0 auto', width: '100%'}}>
             <Analytics todos={todos} />
          </div>
        ) : todos.length === 0 && lists.length === 0 ? (
          <div className="empty-state">
            <Mic size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>O Quadro está vazio</h3>
            <p>
              Grave algo no smartwatch ou crie sua primeira lista para começar!
            </p>
          </div>
        ) : (
          <KanbanBoard 
            todos={todos} 
            lists={lists} 
            onToggleComplete={toggleComplete}
            onDeleteTodo={handleDeleteTodo}
            onUpdateTodo={updateTodo}
            onMoveTodo={moveTodo}
            onCreateList={createList}
            onDeleteList={deleteList}
          />
        )}
      </main>
    </div>
  );
}

export default App;
