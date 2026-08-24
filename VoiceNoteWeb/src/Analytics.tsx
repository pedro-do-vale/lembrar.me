import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { CheckCircle2, Coins, PackageCheck, ScrollText, Sparkles, Target } from 'lucide-react';
import { getLevel, getLevelProgress, XP_PER_LEVEL } from './gameRules';
import type { GameProfile, RewardInventoryItem, Todo } from './types';

interface AnalyticsProps {
  todos: Todo[];
  profile: GameProfile | null;
  inventory: RewardInventoryItem[];
}

const COLORS = ['#477b55', '#a35d3d'];

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export default function Analytics({ todos, profile, inventory }: AnalyticsProps) {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.archived).length;
  const rewarded = todos.filter((todo) => todo.gameRewardState === 'awarded').length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const coinsSpent = inventory.reduce((sum, item) => sum + item.costSnapshot, 0);
  const rewardsUsed = inventory.filter((item) => item.status === 'used').length;
  const totalXp = profile?.totalXp ?? 0;

  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { date: dateKey(date.getTime()), criadas: 0, concluidas: 0 };
  });
  todos.forEach((todo) => {
    const createdDay = activity.find((day) => day.date === dateKey(todo.timestamp));
    if (createdDay) createdDay.criadas += 1;
    if (todo.rewardedAt) {
      const completedDay = activity.find((day) => day.date === dateKey(todo.rewardedAt!));
      if (completedDay) completedDay.concluidas += 1;
    }
  });

  const pieData = [{ name: 'Concluídas', value: completed }, { name: 'Pendentes', value: total - completed }];

  return (
    <div className="analytics-container">
      <section className="paper-panel journal-heading">
        <span className="eyebrow">Registro da jornada</span>
        <h2>Diário do Aventureiro</h2>
        <p>Uma visão honesta do que foi feito e das pausas que você conquistou.</p>
      </section>

      <div className="metrics-grid">
        <article className="metric-card"><ScrollText size={24} /><div><span>Missões</span><strong>{total}</strong></div></article>
        <article className="metric-card"><CheckCircle2 size={24} /><div><span>Premiadas</span><strong>{rewarded}</strong></div></article>
        <article className="metric-card"><Target size={24} /><div><span>Conclusão</span><strong>{completionRate}%</strong></div></article>
        <article className="metric-card"><Sparkles size={24} /><div><span>Nível</span><strong>{getLevel(totalXp)}</strong></div></article>
        <article className="metric-card"><Coins size={24} /><div><span>Moedas gastas</span><strong>{coinsSpent}</strong></div></article>
        <article className="metric-card"><PackageCheck size={24} /><div><span>Recompensas usadas</span><strong>{rewardsUsed}</strong></div></article>
      </div>

      <section className="paper-panel level-journal">
        <div><span className="eyebrow">Próximo nível</span><strong>{getLevelProgress(totalXp)}/{XP_PER_LEVEL} XP</strong></div>
        <div className="xp-track large"><span style={{ width: `${getLevelProgress(totalXp)}%` }} /></div>
      </section>

      <div className="charts-grid">
        <section className="chart-card paper-panel"><h3>Estado das missões</h3>{total === 0 ? <div className="empty-chart">Ainda não há missões.</div> : <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} cx="50%" cy="46%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none">{pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" iconType="circle" /></PieChart></ResponsiveContainer>}</section>
        <section className="chart-card paper-panel"><h3>Atividade nos últimos 7 dias</h3><ResponsiveContainer width="100%" height={260}><BarChart data={activity} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#aa8d69" vertical={false} /><XAxis dataKey="date" stroke="#69513b" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#69513b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} /><RechartsTooltip /><Legend verticalAlign="bottom" iconType="circle" /><Bar dataKey="criadas" name="Criadas" fill="#a35d3d" radius={[4, 4, 0, 0]} /><Bar dataKey="concluidas" name="Premiadas" fill="#477b55" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></section>
      </div>
    </div>
  );
}
