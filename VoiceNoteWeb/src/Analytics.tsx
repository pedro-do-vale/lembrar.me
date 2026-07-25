import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Activity, Target, CheckCircle2, ListTodo } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  date: string;
  timestamp: number;
  archived?: boolean;
}

interface AnalyticsProps {
  todos: Todo[];
}

const COLORS = ['#10b981', '#3b82f6']; // Green for completed, Blue for pending

export default function Analytics({ todos }: AnalyticsProps) {
  // Key Metrics
  const total = todos.length;
  const completed = todos.filter(t => t.archived).length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Pie Chart Data
  const pieData = [
    { name: 'Concluídas', value: completed },
    { name: 'Pendentes', value: pending },
  ];

  // Bar Chart Data (Last 7 Days activity)
  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();
    
    // Create structure for last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      data.push({ date: dateStr, criadas: 0, concluidas: 0 });
    }

    // Populate data
    todos.forEach(todo => {
      // Create a Date object from the timestamp
      const todoDate = new Date(todo.timestamp);
      // Format as DD/MM
      const dateStr = `${todoDate.getDate().toString().padStart(2, '0')}/${(todoDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const dayData = data.find(item => item.date === dateStr);
      if (dayData) {
        dayData.criadas += 1;
        if (todo.archived) {
          dayData.concluidas += 1; // It counts as 'concluida' if its currently completed
        }
      }
    });

    return data;
  };

  const barData = getLast7DaysData();

  return (
    <div className="analytics-container">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <ListTodo size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total de Tarefas</span>
            <span className="metric-value">{total}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Concluídas</span>
            <span className="metric-value">{completed}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
            <Activity size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Pendentes</span>
            <span className="metric-value">{pending}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa' }}>
            <Target size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Eficiência</span>
            <span className="metric-value">{completionRate}%</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Progresso Geral</h3>
          {total === 0 ? (
            <div className="empty-chart">Sem dados suficientes</div>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="chart-card">
          <h3>Produtividade (7 Dias)</h3>
          {total === 0 ? (
             <div className="empty-chart">Sem dados suficientes</div>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                    cursor={{fill: '#334155', opacity: 0.4}}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Bar dataKey="criadas" name="Geradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidas" name="Feitas Histórico" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
