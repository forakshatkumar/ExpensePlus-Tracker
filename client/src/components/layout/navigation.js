import { ChartNoAxesCombined, Flame, LayoutDashboard, ListFilter, Target } from 'lucide-react';
export const navigation = [
  {to:'/dashboard', label:'Dashboard', Icon:LayoutDashboard},
  {to:'/history',label:'History',Icon:ListFilter},
  {to:'/analytics',label:'Analytics',Icon:ChartNoAxesCombined},
  {to:'/budgets',label:'Budgets',Icon:Target},
  {to:'/streaks',label:'Streaks',Icon:Flame},
];
export const pageTitles = { '/dashboard':'Dashboard', '/history':'History', '/analytics':'Analytics', '/budgets':'Budgets', '/streaks':'Streaks', '/profile':'My profile', '/settings':'Settings' };
