import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Search,
  Activity,
  Calendar,
} from 'lucide-react';
import { AnalyticsEvent } from '../types';
import { formatGreekDate } from '../utils/fileParser';
import { resetAnalyticsData } from '../utils/storage';

interface UsageAnalyticsProps {
  analyticsEvents: AnalyticsEvent[];
  onRefreshAnalytics: () => void;
}

export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({
  analyticsEvents,
  onRefreshAnalytics,
}) => {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter events by selected time range (days)
  const filteredEvents = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return analyticsEvents.filter((ev) => ev.date >= cutoffStr);
  }, [analyticsEvents, timeRange]);

  // Aggregate daily data for Recharts AreaChart
  const dailyChartData = useMemo(() => {
    const dayMap = new Map<
      string,
      { date: string; displayDate: string; answered: number; unanswered: number; total: number }
    >();

    // Prepare every day in the timeRange (even if 0 questions)
    const now = new Date();
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'short',
      });
      dayMap.set(dateStr, {
        date: dateStr,
        displayDate,
        answered: 0,
        unanswered: 0,
        total: 0,
      });
    }

    filteredEvents.forEach((ev) => {
      const entry = dayMap.get(ev.date);
      if (entry) {
        entry.total += 1;
        if (ev.isAnswerable) {
          entry.answered += 1;
        } else {
          entry.unanswered += 1;
        }
      }
    });

    return Array.from(dayMap.values());
  }, [filteredEvents, timeRange]);

  // Aggregate hourly data for Recharts BarChart (08:00 - 22:00)
  const hourlyChartData = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 to 22
    const hourMap = new Map<number, number>();
    hours.forEach((h) => hourMap.set(h, 0));

    filteredEvents.forEach((ev) => {
      if (hourMap.has(ev.hour)) {
        hourMap.set(ev.hour, (hourMap.get(ev.hour) || 0) + 1);
      }
    });

    return hours.map((h) => ({
      hourLabel: `${h.toString().padStart(2, '0')}:00`,
      questions: hourMap.get(h) || 0,
    }));
  }, [filteredEvents]);

  // KPI Metrics calculation
  const totalQuestions = filteredEvents.length;
  const totalAnswered = filteredEvents.filter((e) => e.isAnswerable).length;
  const totalUnanswered = totalQuestions - totalAnswered;
  const answerRate =
    totalQuestions > 0 ? ((totalAnswered / totalQuestions) * 100).toFixed(1) : '0.0';
  const dailyAverage = (totalQuestions / timeRange).toFixed(1);

  // Search filter for recent question feed
  const searchedEvents = useMemo(() => {
    if (!searchQuery.trim()) return filteredEvents.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter((e) => e.question.toLowerCase().includes(q)).slice(0, 50);
  }, [filteredEvents, searchQuery]);

  const handleResetData = () => {
    if (window.confirm('Επαναφορά και ανανέωση των ενδεικτικών στατιστικών δεδομένων χρήσης;')) {
      resetAnalyticsData();
      onRefreshAnalytics();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>Ανάλυση Χρήσης & Δραστηριότητας Ερωτήσεων</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Παρακολούθηση όγκου ερωτήσεων, ποσοστού τεκμηρίωσης και ωρών αιχμής.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range segmented buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setTimeRange(7)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                timeRange === 7
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              7 Ημέρες
            </button>
            <button
              onClick={() => setTimeRange(14)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                timeRange === 14
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              14 Ημέρες
            </button>
            <button
              onClick={() => setTimeRange(30)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                timeRange === 30
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              30 Ημέρες
            </button>
          </div>

          <button
            onClick={handleResetData}
            title="Ανανέωση δεδομένων"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ανανέωση</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Συνολικές Ερωτήσεις</span>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {totalQuestions}
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            Τελευταίες {timeRange} ημέρες
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Καλύφθηκαν από Έγγραφα</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {answerRate}%
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            {totalAnswered} επιτυχείς απαντήσεις
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Μέσος Όρος / Ημέρα</span>
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
            {dailyAverage}
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            Ερωτήματα ανά 24ωρο
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Εκτός Περιεχομένου</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {totalUnanswered}
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            Απαιτούν προσθήκη εγγράφων
          </span>
        </div>
      </div>

      {/* Main Trend Chart: Questions Per Day (Recharts AreaChart) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ημερήσια Χρήση Συστήματος (Ερωτήσεις ανά Ημέρα)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Κατανομή ερωτημάτων που απαντήθηκαν από τα έγγραφα έναντι αυτών που δεν βρέθηκαν.
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008361" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00b090" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorUnanswered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fea419" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fea419" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />

              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const ans = payload.find((p) => p.dataKey === 'answered')?.value || 0;
                    const unans = payload.find((p) => p.dataKey === 'unanswered')?.value || 0;
                    const tot = Number(ans) + Number(unans);
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-xs text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block mb-1.5">
                          {label}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4 text-[#008361] dark:text-[#24d99a]">
                            <span>Απαντήθηκαν από έγγραφα:</span>
                            <strong className="tabular-nums">{ans}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#fea419] dark:text-[#ffd28c]">
                            <span>Εκτός περιεχομένου:</span>
                            <strong className="tabular-nums">{unans}</strong>
                          </div>
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex items-center justify-between gap-4 font-bold text-slate-800 dark:text-slate-200">
                            <span>Σύνολο ερωτήσεων:</span>
                            <strong className="tabular-nums">{tot}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => {
                  if (value === 'answered') return 'Απαντήθηκαν από Έγγραφα';
                  if (value === 'unanswered') return 'Εκτός Περιεχομένου';
                  return value;
                }}
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
              />

              <Area
                type="monotone"
                dataKey="answered"
                name="answered"
                stroke="#008361"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAnswered)"
              />

              <Area
                type="monotone"
                dataKey="unanswered"
                name="unanswered"
                stroke="#fea419"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUnanswered)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Chart: Activity by Hour (Recharts BarChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Ώρες Αιχμής Εξυπηρέτησης Πελατών (08:00 – 22:00)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Συχνότητα υποβολής ερωτημάτων ανά ώρα της ημέρας.
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis
                  dataKey="hourLabel"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md dark:border-slate-800 dark:bg-slate-900 text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            Ώρα: {label}
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold tabular-nums">
                            {payload[0].value} ερωτήσεις
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="questions"
                  name="Ερωτήσεις"
                  fill="#122544"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Summary Insights */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Συμπεράσματα Βάσης Γνώσης
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                  Υψηλή Αξιοπιστία
                </span>
                Το {answerRate}% των ερωτήσεων απαντήθηκε άμεσα από τα έγγραφα χωρίς καμία υπόθεση ή εξωτερική εκτίμηση.
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                  Ευκαιρίες Εμπλουτισμού
                </span>
                {totalUnanswered > 0
                  ? `${totalUnanswered} ερωτήσεις αφορούσαν θέματα που δεν αναφέρονταν στα αρχεία. Εξετάστε την προσθήκη νέων σχετικών εγγράφων.`
                  : 'Όλα τα ερωτήματα των πελατών καλύφθηκαν πλήρως από τα τρέχοντα έγγραφα.'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Συνολικά καταγεγραμμένα γεγονότα</span>
            <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
              {analyticsEvents.length}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Questions Activity Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Πρόσφατα Ερωτήματα Πελατών ({searchedEvents.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ιστορικό ερωτήσεων με ένδειξη αν εντοπίστηκε απάντηση στα αρχεία.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση σε ερωτήματα..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Ερώτημα Πελάτη</th>
                <th className="px-4 py-2.5">Ημερομηνία & Ώρα</th>
                <th className="px-4 py-2.5 text-right">Αποτέλεσμα</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {searchedEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Δεν βρέθηκαν ερωτήματα.
                  </td>
                </tr>
              ) : (
                searchedEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white max-w-md truncate">
                      {ev.question}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {formatGreekDate(ev.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {ev.isAnswerable ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Απαντήθηκε</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>Εκτός Αρχείων</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
