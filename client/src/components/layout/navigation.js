import { ChartNoAxesCombined, Flame, LayoutDashboard, ListFilter, Target } from 'lucide-react';
export const navigation = [
  {to:'/dashboard', label:'Overview', Icon:LayoutDashboard},
  {to:'/history',label:'Transactions',Icon:ListFilter},
  {to:'/budgets',label:'Budgets',Icon:Target},
  {to:'/analytics',label:'Insights',Icon:ChartNoAxesCombined},
  {to:'/streaks',label:'Streaks',Icon:Flame},
];
export const pageTitles = { '/dashboard':'Overview', '/history':'Transactions', '/analytics':'Insights', '/budgets':'Budgets', '/streaks':'Streaks', '/profile':'My profile', '/settings':'Settings' };
