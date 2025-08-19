// components/cpm-trend-chart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';

interface DailyCpmData {
    date: string;
    value: number;
}

interface CpmTrendChartProps {
    data: DailyCpmData[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function CpmTrendChart({ data }: CpmTrendChartProps) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">No data to display</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis
                    dataKey="date"
                    tickFormatter={(date) => dayjs(date).format('D MMM')}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={(value) => formatCurrency(Number(value))}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        fontSize: '12px',
                        borderRadius: '0.5rem',
                    }}
                    labelFormatter={(label) => dayjs(label).format('MMMM D, YYYY')}
                    formatter={(value: number) => [formatCurrency(value), 'CPM']}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    name="CPM"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}