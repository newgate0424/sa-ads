'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CpmTrendChartProps {
  data: { date: string; cpm: number }[];
  title: string;
}

export function CpmTrendChart({ data, title }: CpmTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="date" tickFormatter={(date) => dayjs(date).format('DD/MM')} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="cpm" stroke="#8884d8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}