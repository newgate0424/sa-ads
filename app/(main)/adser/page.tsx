// app/(main)/adser/page.tsx
'use client';

import { useEffect, useState, memo, useMemo, useRef } from 'react';
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
import { ChevronsUpDown, Wifi, ChevronRight, ChevronLeft, TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.locale('th');

// --- Interfaces & Types ---
interface DailyDataPoint { date: string; value: number; }
interface TeamMetric { team_name: string; total_inquiries: number; planned_inquiries: number; actual_spend: number; planned_daily_spend: number; net_inquiries: number; wasted_inquiries: number; deposits_count: number; cpm_cost_per_inquiry: number; cost_per_deposit: number; new_player_value_thb: number; one_dollar_per_cover: number; cpm_cost_per_inquiry_daily: DailyDataPoint[]; cost_per_deposit_daily: DailyDataPoint[]; deposits_count_daily: DailyDataPoint[]; one_dollar_per_cover_daily: DailyDataPoint[]; silent_inquiries: number; repeat_inquiries: number; existing_user_inquiries: number; spam_inquiries: number; blocked_inquiries: number; under_18_inquiries: number; over_50_inquiries: number; foreigner_inquiries: number; actual_spend_daily: DailyDataPoint[]; total_inquiries_daily: DailyDataPoint[]; new_player_value_thb_daily: DailyDataPoint[]; }
interface TransformedChartData { date: string; [key: string]: any; }
type ColorRule = {
    moreThan: { enabled: boolean; threshold: number; color: string; };
    lessThan: { enabled: boolean; threshold: number; color: string; };
};
type ColorSettings = Record<string, ColorRule>;

// --- Constants & Configs ---
const teamColors: { [key: string]: string } = { 'Boogey': '#3b82f6', 'Bubble': '#16a34a', 'Lucifer': '#db2777', 'Risa': '#f78c00ff', 'Shazam': '#5f6669ff', 'Vivien': '#dc266cff', 'Sim': '#f59e0b', 'Joanne': '#0181a1ff', 'Cookie': '#3b82f6', 'Piea': '#16a34a', 'บาล้าน': '#db2777', 'หวยม้า': '#f78c00ff', 'Thomas': '#5f6669ff', 'IU': '#dc266cff', 'Nolan': '#f59e0b', 'Minho': '#0181a1ff', 'Bailu': '#3b82f6', };
const groupYAxisMax: { [key: string]: { cpm: number; costPerDeposit: number; cover: number; } } = { 'สาวอ้อย': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 'อลิน': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 'อัญญา C': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 'อัญญา D': { cpm: 2.5, costPerDeposit: 35, cover: 15 }, 'Spezbar': { cpm: 4.5, costPerDeposit: 80, cover: 10 }, 'Barlance': { cpm: 4.5, costPerDeposit: 80, cover: 10 }, 'Football Area': { cpm: 6.5, costPerDeposit: 120, cover: 8 }, 'Football Area(Haru)': { cpm: 6.5, costPerDeposit: 120, cover: 8 }, };
const filterFrameClass = "inline-flex items-center gap-1 rounded-md border border-input bg-muted/50 h-9 px-2 shadow-sm";
const breakdownFields = {
    wasted_inquiries: 'ยอดเสีย', silent_inquiries: 'เงียบ', repeat_inquiries: 'ซ้ำ',
    existing_user_inquiries: 'มียูส', spam_inquiries: 'ก่อกวน', blocked_inquiries: 'บล็อก',
    under_18_inquiries: '<18', over_50_inquiries: '>50', foreigner_inquiries: 'ต่างชาติ'
};
const initialColorSettings: ColorSettings = {
    wasted_inquiries: { moreThan: { enabled: true, threshold: 20, color: '#ef4444' }, lessThan: { enabled: true, threshold: 10, color: '#22c55e' } },
    ...Object.fromEntries(Object.keys(breakdownFields).slice(1).map(key => [key, { moreThan: { enabled: false, threshold: 0, color: '#ef4444' }, lessThan: { enabled: false, threshold: 0, color: '#22c55e' } }]))
};

// --- Helper Functions ---
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch')));
const formatNumber = (value: number | string, options: Intl.NumberFormatOptions = {}): string => { const num = Number(value); return isNaN(num) ? '0' : num.toLocaleString('en-US', options); };

// --- UI Components ---
const RealTimeStatus = memo(({ lastUpdate }: { lastUpdate: Date | null }) => { const [timeAgo, setTimeAgo] = useState(''); useEffect(() => { const update = () => lastUpdate && setTimeAgo(dayjs(lastUpdate).fromNow()); update(); const interval = setInterval(update, 1000); return () => clearInterval(interval); }, [lastUpdate]); return <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-600">อัพเดท: {timeAgo}</span></div>; });
const ExchangeRateSmall = memo(({ rate, isLoading, isFallback }: { rate: number | null, isLoading: boolean, isFallback: boolean }) => { if (isLoading) return <Skeleton className="h-6 w-16" />; return <div className={cn("rounded px-2 py-1 text-xs font-medium", isFallback ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700")}>{isFallback && "⚠️ "}฿{rate ? formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</div>; });
const ProgressCell = memo(({ value, total, isCurrency = false }: { value: number; total: number; isCurrency?: boolean }) => { const percentage = total > 0 ? (value / total) * 100 : 0; const progressBarColor = isCurrency ? (percentage > 150 ? 'bg-red-500/80' : percentage > 100 ? 'bg-yellow-400/80' : 'bg-green-500/80') : (percentage >= 100 ? 'bg-green-500/80' : percentage >= 80 ? 'bg-yellow-400/80' : 'bg-red-500/80'); return ( <div className="flex flex-col w-36"> <div className="flex justify-between items-baseline text-sm"> <span className="font-medium">{isCurrency ? '$' : ''}{formatNumber(value, { maximumFractionDigits: 0 })}</span> <span className="text-xs text-muted-foreground">/ {formatNumber(total)}</span> </div> <div className="flex items-center gap-2 mt-1"> <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted"> <div className={cn('h-full', progressBarColor)} style={{ width: `${Math.min(percentage, 100)}%` }}></div> </div> <span className="text-sm font-medium text-primary w-12 text-right">{percentage.toFixed(1)}%</span> </div> </div> ); });
const FinancialMetric = memo(({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) => <div className="text-sm font-medium">{prefix}{formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}</div>);
const BreakdownCell = memo(({ value, total, rule }: { value: number, total: number, rule?: ColorRule }) => { const percentage = total > 0 ? (value / total) * 100 : 0; let colorStyle = {}; if (rule) { if (rule.moreThan.enabled && percentage > rule.moreThan.threshold) { colorStyle = { color: rule.moreThan.color }; } else if (rule.lessThan.enabled && percentage < rule.lessThan.threshold) { colorStyle = { color: rule.lessThan.color }; } } return ( <div className="text-center w-[80px] flex-shrink-0"> <div className="text-sm font-medium leading-tight" style={colorStyle}>{formatNumber(value)}</div> <div className="text-xs text-muted-foreground leading-tight">({percentage.toFixed(1)}%)</div> </div> ); });
const GroupedChart = memo(({ title, data, yAxisLabel, loading, teamsToShow, chartType, dateForTarget, yAxisDomainMax, groupName, graphView }: { title: string; data: TransformedChartData[]; yAxisLabel: string; loading: boolean; teamsToShow: string[]; chartType: 'cpm' | 'costPerDeposit' | 'deposits' | 'cover'; dateForTarget?: Date; yAxisDomainMax?: number; groupName?: string; graphView: 'daily' | 'monthly'; }) => { const previousDataRef = useRef<TransformedChartData[]>([]); const displayData = useMemo(() => { if (loading && previousDataRef.current.length > 0) return previousDataRef.current; if (!loading && data.length > 0) previousDataRef.current = data; return data; }, [data, loading]); const formatYAxis = (tickItem: number) => `${yAxisLabel}${tickItem.toFixed(1)}`; const tickFormatter = (date: string) => graphView === 'monthly' ? dayjs(date).format('MMM') : dayjs(date).format('DD'); const targets = useMemo(() => { const targetMap = new Map<string, number>(); teamsToShow.forEach(teamName => { if (chartType === 'cpm') targetMap.set(teamName, cpmThresholds[teamName] || 0); else if (chartType === 'costPerDeposit') targetMap.set(teamName, costPerDepositThresholds[teamName] || 0); else if (chartType === 'deposits' && dateForTarget) { const monthlyTarget = depositsMonthlyTargets[teamName] || 0; const teamSize = teamsToShow.length; targetMap.set(teamName, graphView === 'monthly' ? calculateMonthlyTarget(monthlyTarget, teamSize) : calculateDailyTarget(monthlyTarget, dayjs(dateForTarget).format('YYYY-MM-DD'), teamSize)); } else if (chartType === 'cover' && groupName && coverTargets[groupName]) { targetMap.set(teamName, coverTargets[groupName]); } }); return targetMap; }, [chartType, dateForTarget, teamsToShow, groupName, graphView]); if (loading && displayData.length === 0) return <Skeleton className="w-full h-[250px]" />; return <Card><CardHeader className="py-4"><CardTitle className="text-base flex items-center justify-between">{title}{loading && displayData.length > 0 && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}</CardTitle></CardHeader><CardContent className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={displayData} margin={{ top: 5, right: 30, left: -10, bottom: 20 }} key={`${title}-${graphView}`}><XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} /><YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} domain={[0, yAxisDomainMax || 'auto']} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} formatter={(value: number, name: string) => [`${yAxisLabel}${formatNumber(value, { maximumFractionDigits: 2 })}`, name]} labelFormatter={(label) => dayjs(label).format('D MMMM YY')} /><Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />{teamsToShow.map(teamName => <Line key={teamName} type="monotone" dataKey={teamName} stroke={teamColors[teamName] || '#8884d8'} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />)}{chartType === 'cover' && groupName && coverTargets[groupName] && <ReferenceLine y={coverTargets[groupName]} stroke="#ef4444" strokeDasharray="6 6" strokeWidth={1}><Label value={`${coverTargets[groupName]}`} position="right" fill="#ef4444" fontSize={11} fontWeight="normal" /></ReferenceLine>}{chartType !== 'cover' && Array.from(targets.entries()).map(([teamName, targetValue]) => targetValue > 0 ? <ReferenceLine key={`${teamName}-target`} y={targetValue} stroke={teamColors[teamName] || '#8884d8'} strokeDasharray="4 4" strokeWidth={1}><Label value={formatNumber(targetValue, { maximumFractionDigits: 2 })} position="right" fill={teamColors[teamName] || '#8884d8'} fontSize={10} /></ReferenceLine> : null)}</LineChart></ResponsiveContainer></CardContent></Card>; });
const ColorSettingsSheet = memo(({ settings, setSettings }: { settings: ColorSettings, setSettings: (settings: ColorSettings) => void }) => { const handleThresholdChange = (field: string, type: 'moreThan' | 'lessThan', value: string) => { const newSettings = { ...settings }; newSettings[field][type].threshold = Number(value); newSettings[field][type].enabled = true; setSettings(newSettings); }; const handleColorChange = (field: string, type: 'moreThan' | 'lessThan', value: string) => { const newSettings = { ...settings }; newSettings[field][type].color = value; newSettings[field][type].enabled = true; setSettings(newSettings); }; return ( <Sheet> <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"> <Settings className="h-4 w-4" /> </SheetTrigger> <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto"> <SheetHeader> <SheetTitle>ตั้งค่าสีตามเงื่อนไข</SheetTitle> </SheetHeader> <div className="space-y-6 py-4"> {Object.entries(breakdownFields).map(([key, name]) => ( <div key={key} className="p-4 border rounded-lg"> <h4 className="text-lg font-medium mb-4">{name}</h4> <div className="grid grid-cols-2 gap-4"> <div className="space-y-2"> <FormLabel>ถ้ามากกว่า (%) เป็นสี</FormLabel> <div className="flex gap-2"> <Input type="number" value={settings[key]?.moreThan.threshold || 0} onChange={e => handleThresholdChange(key, 'moreThan', e.target.value)} className="w-20" /> <Input type="color" value={settings[key]?.moreThan.color || '#ef4444'} onChange={e => handleColorChange(key, 'moreThan', e.target.value)} className="w-12 h-10 p-1" /> </div> </div> <div className="space-y-2"> <FormLabel>ถ้าน้อยกว่า (%) เป็นสี</FormLabel> <div className="flex gap-2"> <Input type="number" value={settings[key]?.lessThan.threshold || 0} onChange={e => handleThresholdChange(key, 'lessThan', e.target.value)} className="w-20" /> <Input type="color" value={settings[key]?.lessThan.color || '#22c55e'} onChange={e => handleColorChange(key, 'lessThan', e.target.value)} className="w-12 h-10 p-1" /> </div> </div> </div> </div> ))} </div> </SheetContent> </Sheet> ); });

// --- Main Page Component ---
export default function AdserPage() {
    const [isClient, setIsClient] = useState(false); const [tableDateRange, setTableDateRange] = useState<DateRange | undefined>(undefined); const [showBreakdown, setShowBreakdown] = useState(false); const [colorSettings, setColorSettings] = useState<ColorSettings>(initialColorSettings);
    const [chartData, setChartData] = useState<{ cpm: TransformedChartData[], costPerDeposit: TransformedChartData[], deposits: TransformedChartData[], cover: TransformedChartData[] }>({ cpm: [], costPerDeposit: [], deposits: [], cover: [] }); const [graphView, setGraphView] = useState<'daily' | 'monthly'>('daily'); const [graphYear, setGraphYear] = useState(dayjs().year()); const [graphMonth, setGraphMonth] = useState(dayjs().month()); const [lastUpdate, setLastUpdate] = useState<Date | null>(null); const [connectionError, setConnectionError] = useState<string | null>(null); const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    useEffect(() => { if (isClient) { try { const savedSettings = localStorage.getItem('adserColorSettings'); if (savedSettings) { setColorSettings(JSON.parse(savedSettings)); } } catch (error) { console.error("Failed to parse color settings from localStorage", error); } } }, [isClient]);
    const handleSetColorSettings = (newSettings: ColorSettings) => { setColorSettings(newSettings); if (isClient) { localStorage.setItem('adserColorSettings', JSON.stringify(newSettings)); } };
    useEffect(() => { setIsClient(true); const savedView = localStorage.getItem('graphView'); if (savedView === 'daily' || savedView === 'monthly') setGraphView(savedView); const defaultThisMonth = { from: dayjs().startOf('month').toDate(), to: dayjs().endOf('day').toDate() }; const savedDate = localStorage.getItem('dateRangeFilterAdserTable'); if (savedDate) { try { const parsed = JSON.parse(savedDate); setTableDateRange(parsed.from && parsed.to ? { from: dayjs(parsed.from).toDate(), to: dayjs(parsed.to).toDate() } : defaultThisMonth); } catch (e) { setTableDateRange(defaultThisMonth); } } else { setTableDateRange(defaultThisMonth); } }, []);
    const toggleGroup = (groupName: string) => setExpandedGroups(prev => { const newSet = new Set(prev); newSet.has(groupName) ? newSet.delete(groupName) : newSet.add(groupName); return newSet; });
    const { data: exchangeRateData, isLoading: isRateLoading } = useSWR('/api/exchange-rate', fetcher, { refreshInterval: 300000, onSuccess: () => { setLastUpdate(new Date()); setConnectionError(null); }, onError: () => setConnectionError('Failed to fetch rate'), revalidateOnFocus: false });
    const exchangeRate = exchangeRateData?.rate ?? 36.5; const isRateFallback = exchangeRateData?.isFallback ?? true;
    const graphDateRange = useMemo(() => { const date = dayjs().year(graphYear).month(graphMonth); return graphView === 'daily' ? { from: date.startOf('month').toDate(), to: date.endOf('month').toDate() } : { from: dayjs().year(graphYear).startOf('year').toDate(), to: dayjs().year(graphYear).endOf('year').toDate() }; }, [graphView, graphYear, graphMonth]);
    const apiUrl = (range: DateRange | undefined) => range?.from && range?.to && exchangeRate ? `/api/adser?startDate=${dayjs(range.from).format('YYYY-MM-DD')}&endDate=${dayjs(range.to).format('YYYY-MM-DD')}&exchangeRate=${exchangeRate}` : null;
    const { data: tableData, error: tableError, isLoading: loadingTable } = useSWR<TeamMetric[]>(apiUrl(tableDateRange), fetcher, { refreshInterval: 60000, onSuccess: () => { setLastUpdate(new Date()); setConnectionError(null); }, onError: () => setConnectionError('Failed to fetch table data'), revalidateOnFocus: false });
    const { data: graphRawData, error: graphError, isLoading: loadingGraph } = useSWR<TeamMetric[]>(apiUrl(graphDateRange), fetcher, { refreshInterval: 120000, onSuccess: () => { setLastUpdate(new Date()); setConnectionError(null); }, onError: () => setConnectionError('Failed to fetch graph data'), revalidateOnFocus: false });
    useEffect(() => { if (!graphRawData || graphRawData.length === 0) return; const aggregateMonthly = (dailyData: DailyDataPoint[], aggType: 'sum' | 'last') => { const monthly = new Map<string, { total: number, last: number }>(); [...dailyData].sort((a, b) => dayjs(a.date).diff(dayjs(b.date))).forEach(d => { const key = dayjs(d.date).format('YYYY-MM-01'); if (!monthly.has(key)) monthly.set(key, { total: 0, last: 0 }); const month = monthly.get(key)!; month.total += d.value; month.last = d.value; }); return Array.from(monthly.entries()).map(([date, values]) => ({ date, value: aggType === 'sum' ? values.total : values.last })); }; const transformData = (dataKey: keyof TeamMetric, agg: 'sum' | 'last') => { const map = new Map<string, TransformedChartData>(); graphRawData.forEach(team => { let data = team[dataKey] as DailyDataPoint[] || []; if (graphView === 'monthly') data = aggregateMonthly(data, agg); data.forEach(d => { if (!map.has(d.date)) map.set(d.date, { date: d.date }); map.get(d.date)![team.team_name] = d.value; }); }); return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).filter(d => !dayjs(d.date).isAfter(dayjs(), 'day')); }; const monthlyRatio = (numKey: keyof TeamMetric, denKey: keyof TeamMetric) => { const map = new Map<string, TransformedChartData>(); graphRawData.forEach(team => { const monthly = new Map<string, { num: number, den: number }>(); (team[numKey] as DailyDataPoint[] || []).forEach(d => { const key = dayjs(d.date).format('YYYY-MM-01'); if (!monthly.has(key)) monthly.set(key, { num: 0, den: 0 }); monthly.get(key)!.num += d.value; }); (team[denKey] as DailyDataPoint[] || []).forEach(d => { const key = dayjs(d.date).format('YYYY-MM-01'); if (!monthly.has(key)) monthly.set(key, { num: 0, den: 0 }); monthly.get(key)!.den += d.value; }); monthly.forEach((totals, key) => { if (!map.has(key)) map.set(key, { date: key }); map.get(key)![team.team_name] = totals.den > 0 ? totals.num / totals.den : 0; }); }); return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).filter(d => !dayjs(d.date).isAfter(dayjs(), 'day')); }; setChartData(graphView === 'monthly' ? { cpm: monthlyRatio('actual_spend_daily', 'total_inquiries_daily'), costPerDeposit: monthlyRatio('actual_spend_daily', 'deposits_count_daily'), deposits: transformData('deposits_count_daily', 'sum'), cover: transformData('one_dollar_per_cover_daily', 'last'), } : { cpm: transformData('cpm_cost_per_inquiry_daily', 'sum'), costPerDeposit: transformData('cost_per_deposit_daily', 'sum'), deposits: transformData('deposits_count_daily', 'sum'), cover: transformData('one_dollar_per_cover_daily', 'last'), }); }, [graphRawData, graphView]);
    
    const error = tableError || graphError;
    if (error) return <div className="p-6 text-center text-red-500">Error: {error instanceof Error ? error.message : 'Unknown error'}</div>;

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: dayjs().month(i).locale('th').format('MMMM'), value: i }));
    const yearOptions = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4"><h1 className="text-2xl font-bold tracking-tight">ภาพรวม Adser</h1><RealTimeStatus lastUpdate={lastUpdate} />{connectionError && <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">{connectionError}</div>}</div>
                <div className="flex flex-col sm:flex-row gap-2"><div><p className="text-xs text-muted-foreground mb-1 text-center sm:text-left">ข้อมูลตาราง</p>{isClient ? <DateRangePickerWithPresets initialDateRange={tableDateRange} onDateRangeChange={setTableDateRange} /> : <Skeleton className="h-9 w-[260px]" />}</div><div className="flex flex-col items-center sm:items-start"><p className="text-xs text-muted-foreground mb-1">ข้อมูลกราฟ</p>{isClient ? <div className={filterFrameClass}>{graphView === 'daily' && <Select value={String(graphMonth)} onValueChange={v => setGraphMonth(Number(v))}><SelectTrigger className="h-9 border-0 shadow-none focus:ring-0 w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select>}<Select value={String(graphYear)} onValueChange={v => setGraphYear(Number(v))}><SelectTrigger className="h-9 border-0 shadow-none focus:ring-0 w-[90px]"><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><div className="h-6 w-px bg-border" /><ToggleGroup type="single" value={graphView} onValueChange={v => { if (v) setGraphView(v as 'daily' | 'monthly'); }}><ToggleGroupItem value="daily" className="h-9 px-2.5 text-xs">รายวัน</ToggleGroupItem><ToggleGroupItem value="monthly" className="h-9 px-2.5 text-xs">รายเดือน</ToggleGroupItem></ToggleGroup></div> : <Skeleton className="h-9 w-[300px]" />}</div></div>
            </div>
            <div className="space-y-8">
                {Object.entries(adserTeamGroups).map(([groupName, teamNames]) => {
                    const teamsInGroup = tableData ? tableData.filter(team => teamNames.includes(team.team_name)) : [];
                    if (loadingTable && !isClient) return <Skeleton key={groupName} className="h-96 w-full" />;
                    if (!teamsInGroup.length) return <Card key={groupName} className="p-6"><h2 className="text-2xl font-bold mb-4">{groupName}</h2><p className="text-muted-foreground">ไม่มีข้อมูลสำหรับกลุ่มนี้</p></Card>;
                    
                    return (
                        <Card key={groupName} className="p-0">
                            <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                                <CardTitle className="text-xl font-bold">{groupName}</CardTitle>
                                <div className="flex items-center gap-2">
                                    {groupName === 'สาวอ้อย' && <ExchangeRateSmall rate={exchangeRate} isLoading={isRateLoading} isFallback={isRateFallback} />}
                                    <ColorSettingsSheet settings={colorSettings} setSettings={handleSetColorSettings} />
                                    <Button variant="outline" size="sm" onClick={() => setShowBreakdown(!showBreakdown)} className="h-8">
                                        {showBreakdown ? <ChevronLeft className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                                        {showBreakdown ? 'ซ่อน' : 'ละเอียด'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="overflow-x-auto">
                                    <Table className="text-sm">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-center w-[150px]">ทีม</TableHead><TableHead className="text-center">ยอดทัก/แผน</TableHead><TableHead className="text-center">ใช้จ่าย/แผน</TableHead>
                                                <TableHead className="text-center">ยอดทักสุทธิ</TableHead><TableHead className="text-center">ยอดเสีย</TableHead>
                                                <TableHead className="text-center">CPM</TableHead><TableHead className="text-center">ยอดเติม</TableHead><TableHead className="text-center">ทุน/เติม</TableHead>
                                                <TableHead className="text-right">ยอดเล่นใหม่</TableHead><TableHead className="text-right pr-4">1$/Cover</TableHead>
                                                {showBreakdown && <><TableHead className="text-center w-[80px]">เงียบ</TableHead><TableHead className="text-center w-[80px]">ซ้ำ</TableHead><TableHead className="text-center w-[80px]">มียูส</TableHead><TableHead className="text-center w-[80px]">ก่อกวน</TableHead><TableHead className="text-center w-[80px]">บล็อก</TableHead><TableHead className="text-center w-[80px]">&lt;18</TableHead><TableHead className="text-center w-[80px]">&gt;50</TableHead><TableHead className="text-center w-[80px] pr-4">ต.ชาติ</TableHead></>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {teamsInGroup.sort((a, b) => teamNames.indexOf(a.team_name) - teamNames.indexOf(b.team_name)).map(team => (
                                                <TableRow key={team.team_name}>
                                                    <TableCell className="font-medium pl-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', team.actual_spend <= team.planned_daily_spend ? 'bg-green-500' : 'bg-red-500')} />
                                                            {team.team_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center"><div className="flex justify-center"><ProgressCell value={team.total_inquiries} total={team.planned_inquiries} /></div></TableCell>
                                                    <TableCell className="text-center"><div className="flex justify-center"><ProgressCell value={team.actual_spend} total={team.planned_daily_spend} isCurrency /></div></TableCell>
                                                    <TableCell className="text-center"><BreakdownCell value={team.net_inquiries} total={team.total_inquiries} /></TableCell>
                                                    <TableCell className="text-center"><BreakdownCell value={team.wasted_inquiries} total={team.total_inquiries} rule={colorSettings.wasted_inquiries} /></TableCell>
                                                    <TableCell className="text-center"><FinancialMetric value={team.cpm_cost_per_inquiry} prefix="$" /></TableCell>
                                                    <TableCell className="text-center text-sm font-medium">{formatNumber(team.deposits_count)}</TableCell>
                                                    <TableCell className="text-center"><FinancialMetric value={team.cost_per_deposit} prefix="$" /></TableCell>
                                                    <TableCell className="text-right"><FinancialMetric value={team.new_player_value_thb} prefix="฿" /></TableCell>
                                                    <TableCell className="text-right pr-4"><FinancialMetric value={team.one_dollar_per_cover} prefix="$" /></TableCell>
                                                    {showBreakdown && <>
                                                        <TableCell className="text-center"><BreakdownCell value={team.silent_inquiries} total={team.total_inquiries} rule={colorSettings.silent_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.repeat_inquiries} total={team.total_inquiries} rule={colorSettings.repeat_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.existing_user_inquiries} total={team.total_inquiries} rule={colorSettings.existing_user_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.spam_inquiries} total={team.total_inquiries} rule={colorSettings.spam_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.blocked_inquiries} total={team.total_inquiries} rule={colorSettings.blocked_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.under_18_inquiries} total={team.total_inquiries} rule={colorSettings.under_18_inquiries} /></TableCell>
                                                        <TableCell className="text-center"><BreakdownCell value={team.over_50_inquiries} total={team.total_inquiries} rule={colorSettings.over_50_inquiries} /></TableCell>
                                                        <TableCell className="text-center pr-4"><BreakdownCell value={team.foreigner_inquiries} total={team.total_inquiries} rule={colorSettings.foreigner_inquiries} /></TableCell>
                                                    </>}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                
                                <Collapsible open={expandedGroups.has(groupName)} onOpenChange={() => toggleGroup(groupName)}>
                                    <CollapsibleContent className="px-4 pb-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"><GroupedChart title="ต้นทุนทัก (CPM)" data={chartData.cpm} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="cpm" yAxisDomainMax={groupYAxisMax[groupName]?.cpm} graphView={graphView} /><GroupedChart title="ต้นทุนต่อเติม" data={chartData.costPerDeposit} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="costPerDeposit" yAxisDomainMax={groupYAxisMax[groupName]?.costPerDeposit} graphView={graphView} /><GroupedChart title="เป้ายอดเติม" data={chartData.deposits} yAxisLabel="" loading={loadingGraph} teamsToShow={teamNames} chartType="deposits" dateForTarget={graphDateRange?.from} graphView={graphView} /><GroupedChart title="1$ / Cover" data={chartData.cover} yAxisLabel="$" loading={loadingGraph} teamsToShow={teamNames} chartType="cover" groupName={groupName} yAxisDomainMax={groupYAxisMax[groupName]?.cover} graphView={graphView} /></div>
                                    </CollapsibleContent>
                                    
                                    {/* ปุ่มแสดง/ซ่อนกราฟ - อยู่ในส่วนล่างของ Collapsible */}
                                    <div className="flex justify-center border-t bg-muted/30 p-3">
                                        <CollapsibleTrigger 
                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-xs text-muted-foreground w-full max-w-xs"
                                        >
                                            <TrendingUp className="h-4 w-4 mr-1" />
                                            {expandedGroups.has(groupName) ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
                                        </CollapsibleTrigger>
                                    </div>
                                </Collapsible>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}