// app/(main)/analytics/page.tsx
'use client';

import { useEffect, useState, memo, useMemo } from 'react';
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
import { adserTeamGroups } from '@/lib/adser-config';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Label } from 'recharts';
import useSWR from 'swr';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, TrendingUp, DollarSign, Target, Activity } from 'lucide-react';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.locale('th');

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
});

// Status indicator
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
      <span className="text-green-600">Live: {timeAgo}</span>
    </div>
  );
});

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
    silent_inquiries: number;
    repeat_inquiries: number;
    existing_user_inquiries: number;
    spam_inquiries: number;
    blocked_inquiries: number;
    under_18_inquiries: number;
    over_50_inquiries: number;
    foreigner_inquiries: number;
    cpm_cost_per_inquiry_daily: DailyDataPoint[];
    cost_per_deposit_daily: DailyDataPoint[];
    deposits_count_daily: DailyDataPoint[];
    one_dollar_per_cover_daily: DailyDataPoint[];
    actual_spend_daily: DailyDataPoint[];
    total_inquiries_daily: DailyDataPoint[];
    new_player_value_thb_daily: DailyDataPoint[];
}

interface TransformedChartData { date: string; [key: string]: any; }

const teamColors: { [key: string]: string } = { 
    'Boogey': '#3b82f6', 'Bubble': '#16a34a', 'Lucifer': '#db2777', 'Risa': '#f78c00ff', 
    'Shazam': '#5f6669ff', 'Vivien': '#dc266cff', 'Sim': '#f59e0b', 'Joanne': '#0181a1ff', 
    'Cookie': '#3b82f6', 'Piea': '#16a34a', 'บาล้าน': '#db2777', 'หวยม้า': '#f78c00ff', 
    'Thomas': '#5f6669ff', 'IU': '#dc266cff', 'Nolan': '#f59e0b', 'Minho': '#0181a1ff', 
    'Bailu': '#3b82f6'
};

// ✅ Exchange Rate Component
const ExchangeRateSmall = memo(({ rate, isLoading, isFallback }: { rate: number | null, isLoading: boolean, isFallback: boolean }) => {
    if (isLoading) return <div className="bg-muted/50 rounded px-2 py-1"><div className="text-xs text-muted-foreground">฿--</div></div>;
    return (<div className={cn("rounded px-2 py-1 text-xs font-medium", isFallback ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700")}>{isFallback && "⚠️ "}฿{rate ? formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</div>);
});

// ✅ Compact Progress Component
const CompactProgress = memo(({ value, total, label, icon: Icon, isGood }: { value: number; total: number; label: string; icon: any; isGood?: boolean }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const status = isGood ? (percentage >= 100 ? 'good' : percentage >= 80 ? 'warning' : 'danger') : (percentage <= 100 ? 'good' : percentage <= 150 ? 'warning' : 'danger');
    
    const statusColors = {
        good: 'bg-green-500/20 text-green-700 border-green-300',
        warning: 'bg-yellow-500/20 text-yellow-700 border-yellow-300', 
        danger: 'bg-red-500/20 text-red-700 border-red-300'
    };

    const barColors = {
        good: 'bg-green-500',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500'
    };

    return (
        <div className={cn("p-3 rounded-lg border", statusColors[status])}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs font-bold">{percentage.toFixed(1)}%</span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>{formatNumber(value)}</span>
                    <span>{formatNumber(total)}</span>
                </div>
                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-300", barColors[status])} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
            </div>
        </div>
    );
});

// ✅ BreakdownCell Component for detailed breakdown
const BreakdownCell = memo(({ value, total }: { value: number, total: number }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="text-center">
      <div className="font-semibold text-sm leading-center">{formatNumber(value)}</div>
      <div className="text-xs text-muted-foreground leading-center">({percentage.toFixed(1)}%)</div>
    </div>
  );
});

// ✅ Metric Card Component
const MetricCard = memo(({ title, value, subtitle, icon: Icon, trend }: { title: string; value: string; subtitle?: string; icon: any; trend?: 'up' | 'down' | 'neutral' }) => {
    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-gray-600'
    };

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-xl font-bold">{value}</p>
                    {subtitle && <p className={cn("text-sm", trend ? trendColors[trend] : 'text-muted-foreground')}>{subtitle}</p>}
                </div>
                <Icon className="h-7 w-7 text-primary" />
            </div>
        </Card>
    );
});

// ✅ ปรับปรุง Compact Chart ให้รองรับ graphView
const CompactChart = memo(({ title, data, yAxisLabel, teamsToShow, chartType, graphView }: {
    title: string;
    data: TransformedChartData[];
    yAxisLabel: string;
    teamsToShow: string[];
    chartType: 'cpm' | 'costPerDeposit' | 'deposits' | 'cover';
    graphView: 'daily' | 'monthly';
}) => {
    const formatYAxis = (tickItem: number) => `${yAxisLabel}${tickItem.toFixed(1)}`;
    const tickFormatter = (date: string) => {
        if (graphView === 'monthly') {
            return dayjs(date).format('MMM');
        }
        return dayjs(date).format('DD');
    };

    return (
        <Card className="h-[240px]">
            <CardHeader className="py-3 pb-2">
                <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[180px] w-full p-3">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                        <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '11px' }}
                            formatter={(value: number, name: string) => [`${yAxisLabel}${formatNumber(value, { maximumFractionDigits: 2 })}`, name]}
                            labelFormatter={(label) => dayjs(label).format('D MMMM YYYY')}
                        />
                        {teamsToShow.slice(0, 3).map(teamName => (
                            <Line key={teamName} type="monotone" dataKey={teamName} stroke={teamColors[teamName] || '#8884d8'} strokeWidth={2} dot={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
});

export default function AnalyticsPage() {
    const [isClient, setIsClient] = useState(false);
    const [chartData, setChartData] = useState<{ cpm: TransformedChartData[], costPerDeposit: TransformedChartData[], deposits: TransformedChartData[], cover: TransformedChartData[] }>({ cpm: [], costPerDeposit: [], deposits: [], cover: [] });
    const [tableDateRange, setTableDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedGroup, setSelectedGroup] = useState<string>('สาวอ้อย');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    
    // ✅ เพิ่ม state สำหรับ graph view และ date selection
    const [graphView, setGraphView] = useState<'daily' | 'monthly'>('daily');
    const [graphYear, setGraphYear] = useState<number>(dayjs().year());
    const [graphMonth, setGraphMonth] = useState<number>(dayjs().month());
    
    useEffect(() => {
        setIsClient(true);
        const defaultThisMonth = { from: dayjs().startOf('month').toDate(), to: dayjs().endOf('month').toDate() };
        const savedDate = localStorage.getItem('dateRangeFilterAnalytics');
        if (savedDate) {
            try {
                const parsed = JSON.parse(savedDate);
                if (parsed.from && parsed.to) { setTableDateRange({ from: dayjs(parsed.from).toDate(), to: dayjs(parsed.to).toDate() }); }
                else { setTableDateRange(defaultThisMonth); }
            } catch (e) { setTableDateRange(defaultThisMonth); }
        } else { setTableDateRange(defaultThisMonth); }

        // ✅ เพิ่มการโหลด graphView จาก localStorage
        const savedView = localStorage.getItem('analyticsGraphView');
        if (savedView === 'daily' || savedView === 'monthly') {
            setGraphView(savedView);
        }
        
        setGraphYear(dayjs().year());
        setGraphMonth(dayjs().month());
    }, []);
    
    useEffect(() => {
        if (isClient && tableDateRange) {
            localStorage.setItem('dateRangeFilterAnalytics', JSON.stringify(tableDateRange));
        }
    }, [tableDateRange, isClient]);

    // ✅ เพิ่มการบันทึก graphView ลง localStorage
    useEffect(() => {
        if (isClient) {
            localStorage.setItem('analyticsGraphView', graphView);
        }
    }, [graphView, isClient]);

    // Exchange Rate
    const { data: exchangeRateData, isLoading: isRateLoading } = useSWR(
        '/api/exchange-rate', 
        fetcher, 
        { 
            refreshInterval: 60000,
            onSuccess: () => setLastUpdate(new Date()),
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 30000,
        }
    );
    
    const exchangeRate = exchangeRateData?.rate ?? 36.5;
    const isRateFallback = exchangeRateData?.isFallback ?? true;

    // ✅ เพิ่ม graphDateRange สำหรับกราฟ
    const graphDateRange = useMemo(() => {
        if (graphView === 'daily') {
            const date = dayjs().year(graphYear).month(graphMonth);
            return { from: date.startOf('month').toDate(), to: date.endOf('month').toDate() };
        } else {
            const date = dayjs().year(graphYear);
            return { from: date.startOf('year').toDate(), to: date.endOf('year').toDate() };
        }
    }, [graphView, graphYear, graphMonth]);

    const tableApiUrl = useMemo(() => {
        if (!tableDateRange?.from || !tableDateRange?.to || !exchangeRate) return null;
        return `/api/adser?startDate=${dayjs(tableDateRange.from).format('YYYY-MM-DD')}&endDate=${dayjs(tableDateRange.to).format('YYYY-MM-DD')}&exchangeRate=${exchangeRate}`;
    }, [tableDateRange, exchangeRate]);

    // ✅ เพิ่ม graphApiUrl สำหรับข้อมูลกราฟ
    const graphApiUrl = useMemo(() => {
        if (!graphDateRange?.from || !graphDateRange?.to || !exchangeRate) return null;
        return `/api/adser?startDate=${dayjs(graphDateRange.from).format('YYYY-MM-DD')}&endDate=${dayjs(graphDateRange.to).format('YYYY-MM-DD')}&exchangeRate=${exchangeRate}`;
    }, [graphDateRange, exchangeRate]);

    // Data fetching - แยกเป็น table และ graph
    const { data: rawData, error: tableError, isLoading: loadingTable } = useSWR<TeamMetric[]>(
        tableApiUrl, 
        fetcher, 
        { 
            refreshInterval: 15000,
            onSuccess: () => setLastUpdate(new Date()),
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 10000,
        }
    );

    // ✅ เพิ่ม data fetching สำหรับกราฟ
    const { data: graphRawData, error: graphError, isLoading: loadingGraph } = useSWR<TeamMetric[]>(
        graphApiUrl, 
        fetcher, 
        { 
            refreshInterval: 20000,
            onSuccess: () => setLastUpdate(new Date()),
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 15000,
        }
    );

    // ✅ Transform chart data - ปรับปรุงให้รองรับ daily/monthly
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
                    if (!monthlyTotals.has(monthKey)) {
                        monthlyTotals.set(monthKey, { numerator: 0, denominator: 0 });
                    }
                    monthlyTotals.get(monthKey)!.numerator += day.value;
                });
                
                denominatorDaily.forEach(day => {
                    const monthKey = dayjs(day.date).format('YYYY-MM-01');
                    if (!monthlyTotals.has(monthKey)) {
                        monthlyTotals.set(monthKey, { numerator: 0, denominator: 0 });
                    }
                    monthlyTotals.get(monthKey)!.denominator += day.value;
                });

                monthlyTotals.forEach((totals, monthKey) => {
                    if (!dateMap.has(monthKey)) {
                        dateMap.set(monthKey, { date: monthKey });
                    }
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

    // ✅ เพิ่ม options สำหรับ month/year selection
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: dayjs().month(i).locale('th').format('MMMM'), value: i }));
    const yearOptions = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

    // Filter data by selected group
    const selectedTeams = adserTeamGroups[selectedGroup as keyof typeof adserTeamGroups] || [];
    const teamData = rawData ? rawData.filter(team => selectedTeams.includes(team.team_name)) : [];
    
    // Calculate summary metrics
    const totalInquiries = teamData.reduce((sum, team) => sum + (team.total_inquiries || 0), 0);
    const totalPlannedInquiries = teamData.reduce((sum, team) => sum + (team.planned_inquiries || 0), 0);
    const totalSpend = teamData.reduce((sum, team) => sum + (team.actual_spend || 0), 0);
    const totalPlannedSpend = teamData.reduce((sum, team) => sum + (team.planned_daily_spend || 0), 0);
    const totalDeposits = teamData.reduce((sum, team) => sum + (team.deposits_count || 0), 0);
    const avgCPM = teamData.length > 0 ? teamData.reduce((sum, team) => sum + (team.cpm_cost_per_inquiry || 0), 0) / teamData.length : 0;

    return (
        <div className="space-y-4 p-3 max-h-screen overflow-y-auto">
            {/* === SECTION 1: HEADER === */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <RealTimeStatus lastUpdate={lastUpdate} />
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">ข้อมูลตาราง</p>
                        {isClient ? (
                            <DateRangePickerWithPresets 
                                initialDateRange={tableDateRange} 
                                onDateRangeChange={setTableDateRange} 
                            />
                        ) : (
                            <Skeleton className="h-8 w-[200px]" />
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <p className="text-xs text-muted-foreground mb-1">ข้อมูลกราฟ</p>
                        {!isClient ? (
                            <Skeleton className="h-8 w-[250px]" />
                        ) : (
                            <div className="inline-flex items-center gap-1 rounded-md border border-input bg-muted/50 h-8 px-2 shadow-sm">
                                {graphView === 'daily' && (
                                    <Select value={String(graphMonth)} onValueChange={(v) => setGraphMonth(Number(v))}>
                                        <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0 w-[100px] text-xs">
                                            <SelectValue placeholder="เลือกเดือน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}

                                <Select value={String(graphYear)} onValueChange={(v) => setGraphYear(Number(v))}>
                                    <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0 w-[70px] text-xs">
                                        <SelectValue placeholder="ปี" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <div className="h-4 w-px bg-border" />

                                <ToggleGroup
                                    type="single"
                                    value={graphView}
                                    onValueChange={(value) => { if (value) setGraphView(value as 'daily' | 'monthly'); }}
                                    aria-label="Graph View"
                                >
                                    <ToggleGroupItem value="daily" aria-label="Daily view" className="h-8 px-2 text-xs">
                                        รายวัน
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="monthly" aria-label="Monthly view" className="h-8 px-2 text-xs">
                                        รายเดือน
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground mb-1">เลือกทีม</p>
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(adserTeamGroups).map(groupName => (
                                    <SelectItem key={groupName} value={groupName}>{groupName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-end">
                        <ExchangeRateSmall rate={exchangeRate} isLoading={isRateLoading} isFallback={isRateFallback} />
                    </div>
                </div>
            </div>

            {/* === SECTION 2: SUMMARY CARDS === */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="ยอดทักรวม" 
                    value={formatNumber(totalInquiries)} 
                    subtitle={`เป้า: ${formatNumber(totalPlannedInquiries)}`}
                    icon={Activity}
                    trend={totalInquiries >= totalPlannedInquiries ? 'up' : 'down'}
                />
                <MetricCard 
                    title="งบที่ใช้" 
                    value={`${formatNumber(totalSpend, { maximumFractionDigits: 0 })}`}
                    subtitle={`เป้า: ${formatNumber(totalPlannedSpend, { maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                    trend={totalSpend <= totalPlannedSpend ? 'up' : 'down'}
                />
                <MetricCard 
                    title="ยอดเติมรวม" 
                    value={formatNumber(totalDeposits)} 
                    icon={Target}
                />
                <MetricCard 
                    title="CPM เฉลี่ย" 
                    value={`${formatNumber(avgCPM, { maximumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                />
            </div>

            {/* === SECTION 3: TEAM PERFORMANCE === */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">ประสิทธิภาพรายทีม - {selectedGroup}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingTable ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-28 w-full" />
                            ))}
                        </div>
                    ) : teamData.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">ไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {teamData.map((team) => (
                                <Card key={team.team_name} className="p-4 border-l-4 border-l-blue-500">
                                    <h3 className="font-bold text-base mb-3">{team.team_name}</h3>
                                    <div className="space-y-3">
                                        <CompactProgress 
                                            value={team.total_inquiries || 0}
                                            total={team.planned_inquiries || 0}
                                            label="ยอดทัก"
                                            icon={Activity}
                                            isGood={true}
                                        />
                                        <CompactProgress 
                                            value={team.actual_spend || 0}
                                            total={team.planned_daily_spend || 0}
                                            label="งบใช้"
                                            icon={DollarSign}
                                            isGood={false}
                                        />
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">เติม</p>
                                                <p className="font-bold text-green-600">{formatNumber(team.deposits_count || 0)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">CPM</p>
                                                <p className="font-bold text-blue-600">${formatNumber(team.cpm_cost_per_inquiry || 0, { maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* === SECTION 4: DETAILED TABLE === */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">ตารางข้อมูลละเอียด</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingTable ? (
                        <Skeleton className="h-48 w-full" />
                    ) : teamData.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="text-sm">
                                        <TableHead className="w-20">ทีม</TableHead>
                                        <TableHead className="text-right w-20">ยอดทัก</TableHead>
                                        <TableHead className="text-right w-20">เป้าทัก</TableHead>
                                        <TableHead className="text-center w-20">สุทธิ</TableHead>
                                        <TableHead className="text-center w-20">เสีย</TableHead>
                                        <TableHead className="text-right w-20">งบใช้</TableHead>
                                        <TableHead className="text-right w-20">เป้างบ</TableHead>
                                        <TableHead className="text-right w-16">เติม</TableHead>
                                        <TableHead className="text-right w-20">CPM</TableHead>
                                        <TableHead className="text-right w-24">ต้นทุน/เติม</TableHead>
                                        <TableHead className="text-right w-20">Cover</TableHead>
                                        <TableHead className="text-right w-24">ยอดเล่นใหม่</TableHead>
                                        <TableHead className="text-center w-16">ทักเงียบ</TableHead>
                                        <TableHead className="text-center w-16">ทักซ้ำ</TableHead>
                                        <TableHead className="text-center w-16">มียูส</TableHead>
                                        <TableHead className="text-center w-16">ก่อกวน</TableHead>
                                        <TableHead className="text-center w-16">บล็อก</TableHead>
                                        <TableHead className="text-center w-16">ต่ำกว่า18</TableHead>
                                        <TableHead className="text-center w-16">อายุเกิน50</TableHead>
                                        <TableHead className="text-center w-16">ต่างชาติ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teamData.map((team) => (
                                        <TableRow key={team.team_name} className="text-sm">
                                            <TableCell className="font-medium">{team.team_name}</TableCell>
                                            <TableCell className="text-right">{formatNumber(team.total_inquiries || 0)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(team.planned_inquiries || 0)}</TableCell>
                                            <TableCell><BreakdownCell value={team.net_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.wasted_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell className="text-right">${formatNumber(team.actual_spend || 0, { maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell className="text-right">${formatNumber(team.planned_daily_spend || 0, { maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell className="text-right">{formatNumber(team.deposits_count || 0)}</TableCell>
                                            <TableCell className="text-right">${formatNumber(team.cpm_cost_per_inquiry || 0, { maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-right">${formatNumber(team.cost_per_deposit || 0, { maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-right">${formatNumber(team.one_dollar_per_cover || 0, { maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-right">฿{formatNumber(team.new_player_value_thb || 0, { maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell><BreakdownCell value={team.silent_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.repeat_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.existing_user_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.spam_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.blocked_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.under_18_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.over_50_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                            <TableCell><BreakdownCell value={team.foreigner_inquiries ?? 0} total={team.total_inquiries ?? 0} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* === SECTION 5: CHARTS (BOTTOM) === */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">กราฟแสดงแนวโน้ม - {selectedGroup}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        <CompactChart 
                            title={`CPM (${graphView === 'daily' ? 'รายวัน' : 'รายเดือน'})`} 
                            data={chartData.cpm} 
                            yAxisLabel="$" 
                            teamsToShow={selectedTeams} 
                            chartType="cpm" 
                            graphView={graphView}
                        />
                        <CompactChart 
                            title={`ต้นทุน/เติม (${graphView === 'daily' ? 'รายวัน' : 'รายเดือน'})`} 
                            data={chartData.costPerDeposit} 
                            yAxisLabel="$" 
                            teamsToShow={selectedTeams} 
                            chartType="costPerDeposit" 
                            graphView={graphView}
                        />
                        <CompactChart 
                            title={`ยอดเติม (${graphView === 'daily' ? 'รายวัน' : 'รายเดือน'})`} 
                            data={chartData.deposits} 
                            yAxisLabel="" 
                            teamsToShow={selectedTeams} 
                            chartType="deposits" 
                            graphView={graphView}
                        />
                        <CompactChart 
                            title={`Cover (${graphView === 'daily' ? 'รายวัน' : 'รายเดือน'})`} 
                            data={chartData.cover} 
                            yAxisLabel="$" 
                            teamsToShow={selectedTeams} 
                            chartType="cover" 
                            graphView={graphView}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}