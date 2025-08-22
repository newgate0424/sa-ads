// app/(main)/adser/page.tsx
'use client';

import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DateRange } from 'react-day-picker';
import { DateRangePickerWithPresets } from '@/components/date-range-picker-with-presets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adserTeamGroups, cpmThresholds, costPerDepositThresholds, depositsMonthlyTargets, calculateDailyTarget, calculateMonthlyTarget, coverTargets } from '@/lib/adser-config';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Label } from 'recharts';
import useSWR from 'swr';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.locale('th');

// ✅ Real-time Fetcher
const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
});

// ✅ Compact Status indicator component
const RealTimeStatus = memo(({ lastUpdate }: { lastUpdate: Date | null }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (lastUpdate) {
        setTimeAgo(dayjs(lastUpdate).fromNow());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
      <Wifi className="h-3 w-3 text-green-500" />
      <span className="text-green-600">อัพเดท: {timeAgo}</span>
    </div>
  );
});

// --- Interfaces and Helper Functions ---
const formatNumber = (value: number | string, options: Intl.NumberFormatOptions = {}): string => {
    const num = Number(value);
    if (isNaN(num)) { return '0'; }
    return num.toLocaleString('en-US', options);
};

interface DailyDataPoint { date: string; value: number; }

interface TeamMetric {
    team_name: string;
    total_inquiries: number;
    planned_inquiries: number;
    actual_spend: number;
    planned_daily_spend: number;
    net_inquiries: number;
    wasted_inquiries: number;
    deposits_count: number;
    cpm_cost_per_inquiry: number;
    cost_per_deposit: number;
    new_player_value_thb: number;
    one_dollar_per_cover: number;
    cpm_cost_per_inquiry_daily: DailyDataPoint[];
    cost_per_deposit_daily: DailyDataPoint[];
    deposits_count_daily: DailyDataPoint[];
    one_dollar_per_cover_daily: DailyDataPoint[];
    silent_inquiries: number;
    repeat_inquiries: number;
    existing_user_inquiries: number;
    spam_inquiries: number;
    blocked_inquiries: number;
    under_18_inquiries: number;
    over_50_inquiries: number;
    foreigner_inquiries: number;
    actual_spend_daily: DailyDataPoint[];
    total_inquiries_daily: DailyDataPoint[];
    new_player_value_thb_daily: DailyDataPoint[];
}

interface TransformedChartData { date: string; [key: string]: any; }
const teamColors: { [key: string]: string } = { 'Boogey': '#3b82f6', 'Bubble': '#16a34a', 'Lucifer': '#db2777', 'Risa': '#f78c00ff', 'Shazam': '#5f6669ff', 'Vivien': '#dc266cff', 'Sim': '#f59e0b', 'Joanne': '#0181a1ff', 'Cookie': '#3b82f6', 'Piea': '#16a34a', 'บาล้าน': '#db2777', 'หวยม้า': '#f78c00ff', 'Thomas': '#5f6669ff', 'IU': '#dc266cff', 'Nolan': '#f59e0b', 'Minho': '#0181a1ff', 'Bailu': '#3b82f6', };
const groupYAxisMax: { [key: string]: { cpm: number; costPerDeposit: number; cover: number; } } = { 
    'สาวอ้อย': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 
    'อลิน': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 
    'อัญญา C': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 
    'อัญญา D': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 
    'Spezbar': { cpm: 4.5, costPerDeposit: 80, cover: 10 }, 
    'Barlance': { cpm: 4.5, costPerDeposit: 80, cover: 10 }, 
    'Football Area': { cpm: 6.5, costPerDeposit: 120, cover: 8 }, 
    'Football Area(Haru)': { cpm: 6.5, costPerDeposit: 120, cover: 8 }, 
};
const filterFrameClass = "inline-flex items-center gap-1 rounded-md border border-input bg-muted/50 h-9 px-2 shadow-sm";

// --- Sub-components ---
const ExchangeRateSmall = memo(({ rate, isLoading, isFallback }: { rate: number | null, isLoading: boolean, isFallback: boolean }) => {
    if (isLoading) { return <div className="bg-muted/50 rounded px-2 py-1"><div className="text-xs text-muted-foreground">฿--</div></div>; }
    return (<div className={cn("rounded px-2 py-1 text-xs font-medium", isFallback ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700")}>{isFallback && "⚠️ "}฿{rate ? formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</div>);
});
const ProgressCell = memo(({ value, total, isCurrency = false }: { value: number; total: number; isCurrency?: boolean }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    let progressBarColor: string;
    if (isCurrency) { if (percentage > 150) progressBarColor = 'bg-red-500/80'; else if (percentage > 100) progressBarColor = 'bg-yellow-400/80'; else progressBarColor = 'bg-green-500/80'; }
    else { if (percentage >= 100) progressBarColor = 'bg-green-500/80'; else if (percentage >= 80) progressBarColor = 'bg-yellow-400/80'; else progressBarColor = 'bg-red-500/80'; }
    const displayValue = isCurrency ? `${formatNumber(value, { maximumFractionDigits: 0 })}` : formatNumber(value);
    const displayTotal = isCurrency ? `${formatNumber(total, { maximumFractionDigits: 0 })}` : formatNumber(total);
    return (<div className="flex flex-col w-36"><div className="flex justify-between items-baseline text-sm"><span className="font-semibold number-transition">{displayValue} / {displayTotal}</span><span className="font-semibold text-primary number-transition">{percentage.toFixed(1)}%</span></div><div className="relative h-2 w-full overflow-hidden rounded-full bg-muted mt-1"><div className={cn('h-full progress-bar-smooth', progressBarColor)} style={{ width: `${Math.min(percentage, 100)}%` }}></div></div></div>);
});
const StackedProgressCell = memo(({ net, wasted, total }: { net: number; wasted: number; total: number }) => {
    const netPercentage = total > 0 ? (net / total) * 100 : 0;
    const wastedPercentage = total > 0 ? (wasted / total) * 100 : 0;
    return (<div className="flex flex-col w-36"><div className="flex justify-between items-baseline text-sm"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"></div><span className="font-semibold">{formatNumber(net)}</span></div><div className="flex items-center gap-1.5"><span className="font-semibold text-orange-500">{formatNumber(wasted)}</span><div className="w-2 h-2 rounded-full bg-orange-500"></div></div></div><div className="flex w-full h-2 rounded-full overflow-hidden bg-muted mt-1"><div style={{ width: `${netPercentage}%` }} className="bg-sky-500"></div><div style={{ width: `${wastedPercentage}%` }} className="bg-orange-500"></div></div><div className="flex justify-between items-baseline text-sm mt-0.5"><span className="font-semibold text-primary">{netPercentage.toFixed(1)}%</span><span className="font-semibold text-muted-foreground">{wastedPercentage.toFixed(1)}%</span></div></div>);
});
const FinancialMetric = memo(({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) => (<span className="font-semibold text-sm">{prefix}{formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}</span>));
const BreakdownCell = memo(({ value, total }: { value: number, total: number }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (<div className="text-center"><div className="font-semibold text-sm leading-center">{formatNumber(value)}</div><div className="text-xs text-muted-foreground leading-center">({percentage.toFixed(1)}%)</div></div>);
});
const GroupedChart = ({ title, data, yAxisLabel, loading, teamsToShow, chartType, dateForTarget, yAxisDomainMax, groupName, graphView }: { title: string; data: TransformedChartData[]; yAxisLabel: string; loading: boolean; teamsToShow: string[]; chartType: 'cpm' | 'costPerDeposit' | 'deposits' | 'cover'; dateForTarget?: Date; yAxisDomainMax?: number; groupName?: string; graphView: 'daily' | 'monthly'; }) => {
    const formatYAxis = (tickItem: number) => `${yAxisLabel}${tickItem.toFixed(1)}`;
    const tickFormatter = (date: string) => { if (graphView === 'monthly') { return dayjs(date).format('MMM'); } return dayjs(date).format('DD'); };
    const targets = useMemo(() => {
        const targetMap = new Map<string, number>();
        if (chartType === 'cover' && groupName && coverTargets[groupName]) {
            const groupTarget = coverTargets[groupName];
            teamsToShow.forEach(teamName => targetMap.set(teamName, groupTarget));
        } else {
            teamsToShow.forEach(teamName => {
                if (chartType === 'cpm') {
                    targetMap.set(teamName, cpmThresholds[teamName] || 0);
                } else if (chartType === 'costPerDeposit') {
                    targetMap.set(teamName, costPerDepositThresholds[teamName] || 0);
                } else if (chartType === 'deposits' && dateForTarget) {
                    const monthlyTarget = depositsMonthlyTargets[teamName] || 0;
                    const teamSize = teamsToShow.length; // ✅ นับจำนวนคนในทีม
                    
                    if (graphView === 'monthly') {
                        targetMap.set(teamName, calculateMonthlyTarget(monthlyTarget, teamSize));
                    } else {
                        targetMap.set(teamName, calculateDailyTarget(monthlyTarget, dayjs(dateForTarget).format('YYYY-MM-DD'), teamSize));
                    }
                }
            });
        }
        return targetMap;
    }, [chartType, dateForTarget, teamsToShow, groupName, graphView]);
    if (loading) { return <Skeleton className="w-full h-[250px]" />; }
    return (<Card><CardHeader className="py-4"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 30, left: -10, bottom: 20 }}><XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} /><YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} domain={[0, yAxisDomainMax || 'auto']} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} formatter={(value: number, name: string) => [`${yAxisLabel}${formatNumber(value, { maximumFractionDigits: 2 })}`, name]} labelFormatter={(label) => dayjs(label).format('D MMMM YYYY')} /><Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />{teamsToShow.map(teamName => (<Line key={teamName} type="monotone" dataKey={teamName} stroke={teamColors[teamName] || '#8884d8'} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />))}{chartType === 'cover' && groupName && coverTargets[groupName] && (<ReferenceLine y={coverTargets[groupName]} stroke="#ef4444" strokeDasharray="6 6" strokeWidth={1}><Label value={`${coverTargets[groupName]}`} position="right" fill="#ef4444" fontSize={11} fontWeight="normal" /></ReferenceLine>)}{chartType !== 'cover' && Array.from(targets.entries()).map(([teamName, targetValue]) => { if (targetValue > 0) { return (<ReferenceLine key={`${teamName}-target`} y={targetValue} stroke={teamColors[teamName] || '#8884d8'} strokeDasharray="4 4" strokeWidth={1}><Label value={formatNumber(targetValue, { maximumFractionDigits: 2 })} position="right" fill={teamColors[teamName] || '#8884d8'} fontSize={10} /></ReferenceLine>); } return null; })}</LineChart></ResponsiveContainer></CardContent></Card>);
};

export default function AdserPage() {
    const [isClient, setIsClient] = useState(false);
    const [chartData, setChartData] = useState<{ cpm: TransformedChartData[], costPerDeposit: TransformedChartData[], deposits: TransformedChartData[], cover: TransformedChartData[] }>({ cpm: [], costPerDeposit: [], deposits: [], cover: [] });
    const [tableDateRange, setTableDateRange] = useState<DateRange | undefined>(undefined);
    const [graphView, setGraphView] = useState<'daily' | 'monthly'>('daily');
    const [graphYear, setGraphYear] = useState(dayjs().year());
    const [graphMonth, setGraphMonth] = useState(dayjs().month());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    // ✅ เพิ่ม Real-time state (ตลอดเวลา)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    
    useEffect(() => {
        setIsClient(true);
        const savedView = localStorage.getItem('graphView');
        if (savedView === 'daily' || savedView === 'monthly') { setGraphView(savedView); }
        const defaultThisMonth = { from: dayjs().startOf('month').toDate(), to: dayjs().endOf('day').toDate() };
        const savedDate = localStorage.getItem('dateRangeFilterAdserTable');
        if (savedDate) {
            try {
                const parsed = JSON.parse(savedDate);
                if (parsed.from && parsed.to) { setTableDateRange({ from: dayjs(parsed.from).toDate(), to: dayjs(parsed.to).toDate() }); }
                else { setTableDateRange(defaultThisMonth); }
            } catch (e) { setTableDateRange(defaultThisMonth); }
        } else { setTableDateRange(defaultThisMonth); }
    }, []);

    const toggleGroup = (groupName: string) => { setExpandedGroups(prev => { const newSet = new Set(prev); if (newSet.has(groupName)) { newSet.delete(groupName); } else { newSet.add(groupName); } return newSet; }); };
    
    useEffect(() => { if (isClient) localStorage.setItem('graphView', graphView); }, [graphView, isClient]);
    useEffect(() => { if (isClient && tableDateRange) { localStorage.setItem('dateRangeFilterAdserTable', JSON.stringify(tableDateRange)); } }, [tableDateRange, isClient]);

    // ✅ Exchange Rate with Real-time (ตลอดเวลา) - Fixed mutate function
    const { data: exchangeRateData, isLoading: isRateLoading, mutate: mutateExchangeRate } = useSWR(
        '/api/exchange-rate', 
        fetcher, 
        { 
            refreshInterval: 60000, // อัพเดททุก 1 นาที
            onSuccess: () => setLastUpdate(new Date()),
        }
    );
    const exchangeRate = exchangeRateData?.rate ?? 36.5;
    const isRateFallback = exchangeRateData?.isFallback ?? true;
    
    const graphDateRange = useMemo(() => { if (graphView === 'daily') { const date = dayjs().year(graphYear).month(graphMonth); return { from: date.startOf('month').toDate(), to: date.endOf('month').toDate() }; } else { const date = dayjs().year(graphYear); return { from: date.startOf('year').toDate(), to: date.endOf('year').toDate() }; } }, [graphView, graphYear, graphMonth]);
    const tableApiUrl = useMemo(() => { if (!tableDateRange?.from || !tableDateRange?.to || !exchangeRate) return null; return `/api/adser?startDate=${dayjs(tableDateRange.from).format('YYYY-MM-DD')}&endDate=${dayjs(tableDateRange.to).format('YYYY-MM-DD')}&exchangeRate=${exchangeRate}`; }, [tableDateRange, exchangeRate]);
    const graphApiUrl = useMemo(() => { if (!graphDateRange?.from || !graphDateRange?.to || !exchangeRate) return null; return `/api/adser?startDate=${dayjs(graphDateRange.from).format('YYYY-MM-DD')}&endDate=${dayjs(graphDateRange.to).format('YYYY-MM-DD')}&exchangeRate=${exchangeRate}`; }, [graphDateRange, exchangeRate]);
    
    // ✅ Real-time data fetching - ปรับ SWR config เพื่อไม่ให้กระพริบ
    const { data: tableData, error: tableError, isLoading: loadingTable, mutate: mutateTableData } = useSWR<TeamMetric[]>(
        tableApiUrl, 
        fetcher, 
        { 
            refreshInterval: 15000, // อัพเดททุก 15 วินาที
            onSuccess: () => setLastUpdate(new Date()),
            // ✅ เพิ่ม config เพื่อไม่ให้กระพริบ
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 10000, // ป้องกันการ fetch ซ้ำใน 10 วินาที
        }
    );

    const { data: graphRawData, error: graphError, isLoading: loadingGraph, mutate: mutateGraphData } = useSWR<TeamMetric[]>(
        graphApiUrl, 
        fetcher, 
        { 
            refreshInterval: 20000, // อัพเดททุก 20 วินาที
            onSuccess: () => setLastUpdate(new Date()),
            // ✅ เพิ่ม config เพื่อไม่ให้กระพริบ
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 15000, // ป้องกันการ fetch ซ้ำใน 15 วินาที
        }
    );

    // ✅ Manual refresh function - Now properly defined after the SWR hooks
    const handleManualRefresh = useCallback(async () => {
        if (tableApiUrl) await mutateTableData();
        if (graphApiUrl) await mutateGraphData();
        await mutateExchangeRate();
        setLastUpdate(new Date());
    }, [tableApiUrl, graphApiUrl, mutateTableData, mutateGraphData, mutateExchangeRate]);
    
    useEffect(() => {
        if (!graphRawData || graphRawData.length === 0) {
            setChartData({ cpm: [], costPerDeposit: [], deposits: [], cover: [] });
            return;
        }

        const aggregateMonthly = (dailyData: DailyDataPoint[], aggregationType: 'sum' | 'last') => {
            const monthlyMap = new Map<string, { total: number, lastValue: number }>();
            const sortedDailyData = [...dailyData].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
            sortedDailyData.forEach(day => {
                const monthKey = dayjs(day.date).format('YYYY-MM-01');
                if (!monthlyMap.has(monthKey)) {
                    monthlyMap.set(monthKey, { total: 0, lastValue: 0 });
                }
                const month = monthlyMap.get(monthKey)!;
                month.total += day.value;
                month.lastValue = day.value;
            });
            return Array.from(monthlyMap.entries()).map(([date, values]) => {
                let value = 0;
                switch (aggregationType) {
                    case 'sum': value = values.total; break;
                    case 'last': value = values.lastValue; break;
                }
                return { date, value };
            });
        };

        const transformData = (dataKey: keyof TeamMetric, monthlyAgg: 'sum' | 'last') => {
            const dateMap = new Map<string, TransformedChartData>();
            graphRawData.forEach(team => {
                let processedData = team[dataKey] as DailyDataPoint[] || [];
                if (graphView === 'monthly' && Array.isArray(processedData)) {
                    processedData = aggregateMonthly(processedData, monthlyAgg);
                }
                if (Array.isArray(processedData)) {
                    processedData.forEach(day => {
                        if (!dateMap.has(day.date)) {
                            dateMap.set(day.date, { date: day.date });
                        }
                        dateMap.get(day.date)![team.team_name] = day.value;
                    });
                }
            });
            const sortedData = Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return sortedData.filter(d => !dayjs(d.date).isAfter(dayjs(), 'day'));
        };

        const calculateMonthlyRatio = (numeratorKey: keyof TeamMetric, denominatorKey: keyof TeamMetric) => {
            const dateMap = new Map<string, TransformedChartData>();
            graphRawData.forEach(team => {
                const numeratorDaily = team[numeratorKey] as DailyDataPoint[] || [];
                const denominatorDaily = team[denominatorKey] as DailyDataPoint[] || [];
                const monthlyTotals = new Map<string, { numerator: number, denominator: number }>();

                numeratorDaily.forEach(day => {
                    const monthKey = dayjs(day.date).format('YYYY-MM-01');
                    if (!monthlyTotals.has(monthKey)) { monthlyTotals.set(monthKey, { numerator: 0, denominator: 0 }); }
                    monthlyTotals.get(monthKey)!.numerator += day.value;
                });
                
                denominatorDaily.forEach(day => {
                    const monthKey = dayjs(day.date).format('YYYY-MM-01');
                    if (!monthlyTotals.has(monthKey)) { monthlyTotals.set(monthKey, { numerator: 0, denominator: 0 }); }
                    monthlyTotals.get(monthKey)!.denominator += day.value;
                });

                monthlyTotals.forEach((totals, monthKey) => {
                    if (!dateMap.has(monthKey)) { dateMap.set(monthKey, { date: monthKey }); }
                    const value = totals.denominator > 0 ? totals.numerator / totals.denominator : 0;
                    dateMap.get(monthKey)![team.team_name] = value;
                });
            });
            const sortedData = Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return sortedData.filter(d => !dayjs(d.date).isAfter(dayjs(), 'day'));
        };

        if (graphView === 'monthly') {
            setChartData({
                cpm: calculateMonthlyRatio('actual_spend_daily', 'total_inquiries_daily'),
                costPerDeposit: calculateMonthlyRatio('actual_spend_daily', 'deposits_count_daily'),
                deposits: transformData('deposits_count_daily', 'sum'),
                cover: transformData('one_dollar_per_cover_daily', 'last'),
            });
        } else {
            setChartData({
                cpm: transformData('cpm_cost_per_inquiry_daily', 'sum'),
                costPerDeposit: transformData('cost_per_deposit_daily', 'sum'),
                deposits: transformData('deposits_count_daily', 'sum'),
                cover: transformData('one_dollar_per_cover_daily', 'last'),
            });
        }
    }, [graphRawData, graphView]);

    const error = tableError || graphError;
    if (error) return <p className="p-6 text-red-500">Error: {error.message}</p>;
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: dayjs().month(i).locale('th').format('MMMM'), value: i }));
    const yearOptions = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">ภาพรวม Adser</h1>
                    <RealTimeStatus lastUpdate={lastUpdate} />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1 text-center sm:text-left">ข้อมูลตาราง</p>
                        {isClient ? (<DateRangePickerWithPresets initialDateRange={tableDateRange} onDateRangeChange={setTableDateRange} />) : (<Skeleton className="h-9 w-[260px]" />)}
                    </div>
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-xs text-muted-foreground mb-1">ข้อมูลกราฟ</p>
                        {isClient ? (
                            <div className={filterFrameClass}>
                                {graphView === 'daily' && (<Select value={String(graphMonth)} onValueChange={(v) => setGraphMonth(Number(v))}><SelectTrigger className="h-9 border-0 shadow-none focus:ring-0 w-[120px]"><SelectValue placeholder="เลือกเดือน" /></SelectTrigger><SelectContent>{monthOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select>)}
                                <Select value={String(graphYear)} onValueChange={(v) => setGraphYear(Number(v))}><SelectTrigger className="h-9 border-0 shadow-none focus:ring-0 w-[90px]"><SelectValue placeholder="เลือกปี" /></SelectTrigger><SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                                <div className="h-6 w-px bg-border" />
                                <ToggleGroup type="single" value={graphView} onValueChange={(value) => { if (value) setGraphView(value as 'daily' | 'monthly'); }} aria-label="Graph View"><ToggleGroupItem value="daily" aria-label="Daily view" className="h-9 px-2.5 text-xs">รายวัน</ToggleGroupItem><ToggleGroupItem value="monthly" aria-label="Monthly view" className="h-9 px-2.5 text-xs">รายเดือน</ToggleGroupItem></ToggleGroup>
                            </div>
                        ) : (<Skeleton className="h-9 w-[300px]" />)}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(adserTeamGroups).map(([groupName, teamNames]) => {
                    const teamsInGroup = tableData ? tableData.filter(team => teamNames.includes(team.team_name)) : [];
                    if (loadingTable && !tableData && !isClient) { return <Skeleton key={groupName} className="h-96 w-full" />; }
                    if (!teamsInGroup || teamsInGroup.length === 0) {
                        if (loadingTable) return <Skeleton key={groupName} className="h-96 w-full" />;
                        return (<Card key={groupName} className="p-4 md:p-6 relative">{groupName === 'สาวอ้อย' && (<div className="absolute top-4 right-4"><ExchangeRateSmall rate={exchangeRate} isLoading={isRateLoading} isFallback={isRateFallback} /></div>)}<h2 className="text-2xl font-bold mb-4">{groupName}</h2><p className="text-muted-foreground">ไม่มีข้อมูลสำหรับกลุ่มนี้ในช่วงวันที่ที่เลือก</p></Card>);
                    }
                    const groupMaxValues = groupYAxisMax[groupName as keyof typeof groupYAxisMax];
                    return (
                        <Card key={groupName} className="p-4 md:p-6 relative">
                            {groupName === 'สาวอ้อย' && (<div className="absolute top-4 right-4"><ExchangeRateSmall rate={exchangeRate} isLoading={isRateLoading} isFallback={isRateFallback} /></div>)}
                            <h2 className="text-2xl font-bold mb-4">{groupName}</h2>
                            <Collapsible open={expandedGroups.has(groupName)} onOpenChange={() => toggleGroup(groupName)}>
                                <div className="space-y-6">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[160px]">ทีม</TableHead>
                                                    <TableHead>ยอดทัก / แผน</TableHead>
                                                    <TableHead>ใช้จ่าย / แผน</TableHead>
                                                    <TableHead>ยอดทักสุทธิ / เสีย</TableHead>
                                                    <TableHead className="text-right">CPM</TableHead>
                                                    <TableHead className="text-right">ยอดเติม</TableHead>
                                                    <TableHead className="text-right">ทุน/เติม</TableHead>
                                                    <TableHead className="text-right">ยอดเล่นใหม่</TableHead>
                                                    <TableHead className="text-right">1$ / Cover</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">ทักเงียบ</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">ทักซ้ำ</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">มียูส</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">ก่อกวน</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">บล็อก</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">ต่ำกว่า18</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">อายุเกิน50</TableHead>
                                                    <TableHead className="text-center min-w-[70px]">ต่างชาติ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {teamsInGroup.sort((a, b) => { const teamOrder = teamNames; const indexA = teamOrder.indexOf(a.team_name); const indexB = teamOrder.indexOf(b.team_name); return indexA - indexB; })
                                                    .map((team) => (
                                                        <CollapsibleTrigger asChild key={team.team_name}>
                                                            <TableRow className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted/50 table-row-transition">
                                                                <TableCell>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 status-indicator', Number(team.actual_spend ?? 0) <= Number(team.planned_daily_spend ?? 0) ? 'bg-green-500' : 'bg-red-500')} />
                                                                            <span className="font-semibold">{team.team_name}</span>
                                                                        </div>
                                                                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground transition-transform" style={{ transform: expandedGroups.has(groupName) ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell><div className="text-sm"><ProgressCell value={team.total_inquiries ?? 0} total={team.planned_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><ProgressCell value={team.actual_spend ?? 0} total={team.planned_daily_spend ?? 0} isCurrency /></div></TableCell>
                                                                <TableCell><div className="text-sm"><StackedProgressCell net={team.net_inquiries ?? 0} wasted={team.wasted_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell className="text-right"><div className="text-sm"><FinancialMetric value={team.cpm_cost_per_inquiry ?? 0} prefix="$" /></div></TableCell>
                                                                <TableCell className="text-right font-semibold"><div className="text-sm number-transition">{formatNumber(team.deposits_count ?? 0)}</div></TableCell>
                                                                <TableCell className="text-right"><div className="text-sm"><FinancialMetric value={team.cost_per_deposit ?? 0} prefix="$" /></div></TableCell>
                                                                <TableCell className="text-right"><div className="text-sm"><FinancialMetric value={team.new_player_value_thb ?? 0} prefix="฿" /></div></TableCell>
                                                                <TableCell className="text-right"><div className="text-sm"><FinancialMetric value={team.one_dollar_per_cover ?? 0} prefix="$" /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.silent_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.repeat_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.existing_user_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.spam_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.blocked_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.under_18_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.over_50_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                                <TableCell><div className="text-sm"><BreakdownCell value={team.foreigner_inquiries ?? 0} total={team.total_inquiries ?? 0} /></div></TableCell>
                                                            </TableRow>
                                                        </CollapsibleTrigger>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <CollapsibleContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 chart-container">
                                            <GroupedChart title="ต้นทุนทัก (CPM)" data={chartData.cpm} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="cpm" yAxisDomainMax={groupMaxValues?.cpm} graphView={graphView} />
                                            <GroupedChart title="ต้นทุนต่อเติม" data={chartData.costPerDeposit} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="costPerDeposit" yAxisDomainMax={groupMaxValues?.costPerDeposit} graphView={graphView} />
                                            <GroupedChart title="เป้ายอดเติม" data={chartData.deposits} yAxisLabel="" loading={loadingGraph} teamsToShow={teamNames} chartType="deposits" dateForTarget={graphDateRange?.from} graphView={graphView} />
                                            <GroupedChart title="1$ / Cover" data={chartData.cover} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="cover" groupName={groupName} yAxisDomainMax={groupMaxValues?.cover} graphView={graphView} />
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}